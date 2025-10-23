/**
 * WebSocket 服务器逻辑
 * 处理多人实时协作绘画的消息广播
 */

const { Server } = require('socket.io')

// 事件类型定义
const EVENTS = {
  // 绘画相关事件
  DRAW_STROKE: 'draw:stroke',       // 绘画笔画
  DRAW_CLEAR: 'draw:clear',         // 清空画布

  // 用户相关事件
  USER_JOIN: 'user:join',           // 用户加入
  USER_LEAVE: 'user:leave',         // 用户离开
  USER_COUNT: 'user:count',         // 在线用户数量

  // 同步相关事件
  SYNC_REQUEST: 'sync:request',     // 请求同步画布状态
  SYNC_STATE: 'sync:state',         // 同步画布状态

  // 连接相关事件
  CONNECTION: 'connection',         // 连接
  DISCONNECT: 'disconnect',         // 断开连接
}

/**
 * 初始化 WebSocket 服务器
 * @param {http.Server} httpServer - HTTP 服务器实例
 * @param {Object} config - Socket.IO 配置
 * @returns {Server} Socket.IO 服务器实例
 */
function initWebSocket(httpServer, config) {
  // 创建 Socket.IO 服务器
  const io = new Server(httpServer, config)

  // 存储在线用户信息
  const users = new Map()

  // 存储当前画布状态（所有笔画）
  let canvasState = {
    strokes: [],
    lastModified: null,
  }

  console.log('✅ WebSocket 服务器初始化成功')

  // 监听客户端连接
  io.on(EVENTS.CONNECTION, (socket) => {
    const userId = socket.id
    const userInfo = {
      id: userId,
      connectedAt: new Date().toISOString(),
    }

    // 添加用户到在线列表
    users.set(userId, userInfo)

    console.log(`👤 用户连接: ${userId} (当前在线: ${users.size})`)

    // 向新用户发送当前画布状态
    socket.emit(EVENTS.SYNC_STATE, canvasState)

    // 广播用户加入事件（不包括自己）
    socket.broadcast.emit(EVENTS.USER_JOIN, {
      userId,
      userCount: users.size,
    })

    // 向所有客户端发送当前在线人数
    io.emit(EVENTS.USER_COUNT, users.size)

    // 监听绘画笔画事件
    socket.on(EVENTS.DRAW_STROKE, (strokeData) => {
      try {
        // 验证笔画数据
        if (!strokeData || !strokeData.points || !Array.isArray(strokeData.points)) {
          console.error('❌ 无效的笔画数据:', strokeData)
          return
        }

        // 保存笔画到画布状态
        canvasState.strokes.push(strokeData)
        canvasState.lastModified = new Date().toISOString()

        console.log(`🎨 收到绘画数据 from ${userId}, 点数: ${strokeData.points.length}`)

        // 广播给所有其他客户端（不包括发送者）
        socket.broadcast.emit(EVENTS.DRAW_STROKE, strokeData)
      } catch (error) {
        console.error('❌ 处理绘画数据时出错:', error)
      }
    })

    // 监听清空画布事件
    socket.on(EVENTS.DRAW_CLEAR, () => {
      try {
        console.log(`🗑️  用户 ${userId} 清空画布`)

        // 清空画布状态
        canvasState.strokes = []
        canvasState.lastModified = new Date().toISOString()

        // 广播给所有客户端（包括发送者，确保同步）
        io.emit(EVENTS.DRAW_CLEAR)
      } catch (error) {
        console.error('❌ 处理清空画布时出错:', error)
      }
    })

    // 监听同步请求（用于断线重连）
    socket.on(EVENTS.SYNC_REQUEST, () => {
      try {
        console.log(`🔄 用户 ${userId} 请求同步画布状态`)
        socket.emit(EVENTS.SYNC_STATE, canvasState)
      } catch (error) {
        console.error('❌ 处理同步请求时出错:', error)
      }
    })

    // 监听断开连接事件
    socket.on(EVENTS.DISCONNECT, (reason) => {
      // 从在线列表移除用户
      users.delete(userId)

      console.log(`👋 用户断开: ${userId} (原因: ${reason}, 剩余在线: ${users.size})`)

      // 广播用户离开事件
      socket.broadcast.emit(EVENTS.USER_LEAVE, {
        userId,
        userCount: users.size,
      })

      // 向所有客户端发送当前在线人数
      io.emit(EVENTS.USER_COUNT, users.size)
    })

    // 错误处理
    socket.on('error', (error) => {
      console.error(`❌ Socket 错误 (${userId}):`, error)
    })
  })

  // 返回 Socket.IO 实例，以便外部使用
  return io
}

module.exports = {
  initWebSocket,
  EVENTS,
}

