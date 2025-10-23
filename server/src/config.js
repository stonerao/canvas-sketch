/**
 * 服务器配置文件
 */

module.exports = {
  // 服务器端口
  port: process.env.PORT || 3000,

  // CORS 配置
  cors: {
    origin: process.env.CORS_ORIGIN || ['http://localhost:5173', 'http://localhost:5174'], // Vite 端口
    credentials: true,
  },

  // Socket.IO 配置
  socketIO: {
    cors: {
      origin: process.env.CORS_ORIGIN || ['http://localhost:5173', 'http://localhost:5174'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // 连接超时时间（毫秒）
    pingTimeout: 60000,
    // 心跳间隔（毫秒）
    pingInterval: 25000,
  },
}

