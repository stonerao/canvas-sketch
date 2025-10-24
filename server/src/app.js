/**
 * Koa 应用入口文件
 * 多人实时协作绘画后端服务器
 */

const Koa = require('koa')
const cors = require('@koa/cors')
const http = require('http')
const path = require('path')
const serve = require('koa-static')
const config = require('./config')
const { initWebSocket } = require('./websocket')

// 创建 Koa 应用实例
const app = new Koa()

// 静态文件服务（在其他路由之前注册）
const staticDir = path.resolve(__dirname, '..', 'public')
app.use(serve(staticDir))

// 配置 CORS 跨域
app.use(cors(config.cors))

// 基础路由 - 健康检查
app.use(async (ctx) => {
  if (ctx.path === '/' || ctx.path === '/health') {
    ctx.body = {
      status: 'ok',
      message: '多人协作画板服务器运行中',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    }
  } else {
    ctx.status = 404
    ctx.body = {
      status: 'error',
      message: '路径不存在',
    }
  }
})

// 错误处理
app.on('error', (err, ctx) => {
  console.error('❌ 服务器错误:', err)
})

// 创建 HTTP 服务器
const httpServer = http.createServer(app.callback())

// 初始化 WebSocket 服务器
const io = initWebSocket(httpServer, config.socketIO)

// 启动服务器
const PORT = config.port
httpServer.listen(PORT, () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🚀 多人协作画板服务器启动成功！')
  console.log(`📡 HTTP 服务: http://localhost:${PORT}`)
  console.log(`🔌 WebSocket 服务: ws://localhost:${PORT}`)
  console.log(`🌐 CORS 允许来源: ${config.cors.origin}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
})

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('📴 收到 SIGTERM 信号，正在关闭服务器...')
  httpServer.close(() => {
    console.log('✅ 服务器已关闭')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('\n📴 收到 SIGINT 信号，正在关闭服务器...')
  httpServer.close(() => {
    console.log('✅ 服务器已关闭')
    process.exit(0)
  })
})

module.exports = app

