/**
 * 服务器配置文件
 */

// 允许的跨域来源（使用正则表达式，提升可维护性与安全性）
const ALLOWED_ORIGIN_REGEXPS = [
  /^https?:\/\/localhost(?::\d+)?$/i, // 允许所有 localhost 端口（http/https）
  /^https?:\/\/([a-z0-9-]+\.)*mogl\.top(?::\d+)?$/i, // 允许 mogl.top 及其所有子域名（http/https，支持端口）
]

// Koa CORS 的 origin 校验函数：仅当来源匹配白名单时返回该来源；否则不设置 CORS 头
const corsOriginValidator = (ctx) => {
  const origin = ctx.get('Origin') || ''
  if (!origin) return undefined
  if (ALLOWED_ORIGIN_REGEXPS.some((re) => re.test(origin))) {
    return origin
  }
  return undefined
}

module.exports = {
  // 服务器端口
  port: process.env.PORT || 3000,

  // CORS 配置（Koa 使用校验函数以支持正则匹配）
  cors: {
    origin: corsOriginValidator,
    credentials: true,
  },

  // Socket.IO 配置（支持正则数组）
  socketIO: {
    cors: {
      origin: ALLOWED_ORIGIN_REGEXPS,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // 连接超时时间（毫秒）
    pingTimeout: 60000,
    // 心跳间隔（毫秒）
    pingInterval: 25000,
  },

  // 导出白名单，便于其他模块复用
  allowedOrigins: ALLOWED_ORIGIN_REGEXPS,
}

