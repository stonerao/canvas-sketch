/**
 * WebSocket 客户端工具模块
 * 封装 Socket.IO 客户端连接和消息处理
 */

import { io } from 'socket.io-client'

// 事件类型定义（与后端保持一致）
export const EVENTS = {
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
  CONNECT: 'connect',               // 连接成功
  DISCONNECT: 'disconnect',         // 断开连接
  CONNECT_ERROR: 'connect_error',   // 连接错误
  RECONNECT: 'reconnect',           // 重新连接
}

// Socket.IO 客户端实例
let socket = null

// 连接状态
let isConnected = false
console.log(import.meta.env.VITE_WS_URL)
// 服务器地址配置
const SERVER_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3000'

/**
 * 连接到 WebSocket 服务器
 * @returns {Promise<void>}
 */
export function connectWebSocket() {
  return new Promise((resolve, reject) => {
    try {
      // 如果已经连接，直接返回
      if (socket && isConnected) {
        console.log('✅ WebSocket 已连接')
        resolve()
        return
      }

      console.log(`🔌 正在连接 WebSocket 服务器: ${SERVER_URL}`)

      // 创建 Socket.IO 客户端连接
      socket = io(SERVER_URL, {
        transports: ['websocket', 'polling'], // 优先使用 WebSocket，降级到轮询
        reconnection: true,                   // 启用自动重连
        reconnectionDelay: 1000,              // 重连延迟 1 秒
        reconnectionDelayMax: 5000,           // 最大重连延迟 5 秒
        reconnectionAttempts: Infinity,       // 无限次重连尝试
      })

      // 监听连接成功事件
      socket.on(EVENTS.CONNECT, () => {
        isConnected = true
        console.log('✅ WebSocket 连接成功, Socket ID:', socket.id)
        resolve()
      })

      // 监听连接错误事件
      socket.on(EVENTS.CONNECT_ERROR, (error) => {
        console.error('❌ WebSocket 连接错误:', error.message)
        isConnected = false
        reject(error)
      })

      // 监听断开连接事件
      socket.on(EVENTS.DISCONNECT, (reason) => {
        isConnected = false
        console.warn('⚠️  WebSocket 断开连接, 原因:', reason)
      })

      // 监听重新连接事件
      socket.on(EVENTS.RECONNECT, (attemptNumber) => {
        isConnected = true
        console.log(`🔄 WebSocket 重新连接成功 (尝试次数: ${attemptNumber})`)
      })

    } catch (error) {
      console.error('❌ 创建 WebSocket 连接失败:', error)
      reject(error)
    }
  })
}

/**
 * 断开 WebSocket 连接
 */
export function disconnectWebSocket() {
  if (socket) {
    console.log('📴 断开 WebSocket 连接')
    socket.disconnect()
    socket = null
    isConnected = false
  }
}

/**
 * 发送绘画笔画数据
 * @param {Object} strokeData - 笔画数据
 */
export function sendStroke(strokeData) {
  if (!socket || !isConnected) {
    console.warn('⚠️  WebSocket 未连接，无法发送笔画数据')
    return
  }

  socket.emit(EVENTS.DRAW_STROKE, strokeData)
  console.log('📤 发送笔画数据, 点数:', strokeData.points?.length || 0)
}

/**
 * 发送清空画布事件
 */
export function sendClear() {
  if (!socket || !isConnected) {
    console.warn('⚠️  WebSocket 未连接，无法发送清空事件')
    return
  }

  socket.emit(EVENTS.DRAW_CLEAR)
  console.log('📤 发送清空画布事件')
}

/**
 * 请求同步画布状态（用于断线重连）
 */
export function requestSync() {
  if (!socket || !isConnected) {
    console.warn('⚠️  WebSocket 未连接，无法请求同步')
    return
  }

  socket.emit(EVENTS.SYNC_REQUEST)
  console.log('📤 请求同步画布状态')
}

/**
 * 监听远程绘画笔画事件
 * @param {Function} callback - 回调函数，接收笔画数据
 */
export function onRemoteStroke(callback) {
  if (!socket) {
    console.warn('⚠️  WebSocket 未初始化')
    return
  }

  socket.on(EVENTS.DRAW_STROKE, (strokeData) => {
    console.log('📥 收到远程笔画数据, 点数:', strokeData.points?.length || 0)
    callback(strokeData)
  })
}

/**
 * 监听远程清空画布事件
 * @param {Function} callback - 回调函数
 */
export function onRemoteClear(callback) {
  if (!socket) {
    console.warn('⚠️  WebSocket 未初始化')
    return
  }

  socket.on(EVENTS.DRAW_CLEAR, () => {
    console.log('📥 收到远程清空画布事件')
    callback()
  })
}

/**
 * 监听画布状态同步事件
 * @param {Function} callback - 回调函数，接收画布状态数据
 */
export function onSyncState(callback) {
  if (!socket) {
    console.warn('⚠️  WebSocket 未初始化')
    return
  }

  socket.on(EVENTS.SYNC_STATE, (canvasState) => {
    console.log('📥 收到画布状态同步, 笔画数:', canvasState.strokes?.length || 0)
    callback(canvasState)
  })
}

/**
 * 监听用户加入事件
 * @param {Function} callback - 回调函数，接收用户信息
 */
export function onUserJoin(callback) {
  if (!socket) {
    console.warn('⚠️  WebSocket 未初始化')
    return
  }

  socket.on(EVENTS.USER_JOIN, (data) => {
    console.log('👤 用户加入:', data.userId, '当前在线:', data.userCount)
    callback(data)
  })
}

/**
 * 监听用户离开事件
 * @param {Function} callback - 回调函数，接收用户信息
 */
export function onUserLeave(callback) {
  if (!socket) {
    console.warn('⚠️  WebSocket 未初始化')
    return
  }

  socket.on(EVENTS.USER_LEAVE, (data) => {
    console.log('👋 用户离开:', data.userId, '当前在线:', data.userCount)
    callback(data)
  })
}

/**
 * 监听在线用户数量变化
 * @param {Function} callback - 回调函数，接收在线用户数量
 */
export function onUserCount(callback) {
  if (!socket) {
    console.warn('⚠️  WebSocket 未初始化')
    return
  }

  socket.on(EVENTS.USER_COUNT, (count) => {
    console.log('👥 在线用户数:', count)
    callback(count)
  })
}

/**
 * 获取连接状态
 * @returns {boolean}
 */
export function getConnectionStatus() {
  return isConnected
}

/**
 * 获取 Socket ID
 * @returns {string|null}
 */
export function getSocketId() {
  return socket?.id || null
}

