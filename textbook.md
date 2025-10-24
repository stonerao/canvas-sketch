# 从零实现多人实时协作画板：完整开发教程（Vue 3 + Vite + Node.js + Koa2 + Socket.IO）

本教程面向初学者，带你从零搭建一个“多人实时协作画板”项目。我们将按步骤完成前后端开发、实时通信、UI 与测试部署，配套完整代码示例与命令。

## 1. 项目介绍与最终效果

目标：多个用户同时在浏览器中打开应用，在同一块画布上实时绘制、清空、同步，支持颜色、画笔/橡皮擦、粗细、线型、保存下载、背景图片、响应式布局与全屏。

最终效果：
- 前端：扁平化浅色 UI，操作直观；Canvas 绘制顺滑；支持桌面与移动端。
- 后端：基于 Socket.IO 的实时同步；维护在线人数与画布状态；新用户快速同步。

## 2. 技术栈选型与原因

- Vue 3（Composition API）：组件化、响应式强，学习曲线友好。
- Vite：极速开发服务器与构建，前端开发体验优秀。
- Node.js + Koa2：轻量 Web 框架，易于与 Socket.IO 集成。
- Socket.IO：在复杂网络环境下比原生 WebSocket 更稳健，事件模型简单。
- Canvas API：浏览器原生 2D 绘制能力，性能好、依赖少。

## 3. 开发环境准备

- Node.js 14+（建议 18+）
- npm 或 yarn（以下以 npm 为例）
- 任意现代浏览器（Chrome/Firefox/Safari/Edge）

## 4. 项目初始化

在任意目录创建项目文件夹：
```bash
mkdir canvasSketch && cd canvasSketch
```

### 4.1 初始化后端（server）
```bash
mkdir server && cd server
npm init -y
npm install koa @koa/cors socket.io
```

创建 server/src 目录与核心文件：
```bash
mkdir src
```

server/src/config.js：
```javascript
// server/src/config.js
module.exports = {
  port: 3000,
  corsOrigins: [
    'http://localhost:5173',
    'http://localhost:5174'
  ],
  socketOptions: {
    cors: { origin: ['http://localhost:5173', 'http://localhost:5174'] },
    pingTimeout: 20000,
    pingInterval: 25000
  }
}
```

server/src/websocket.js：
```javascript
// server/src/websocket.js
const { Server } = require('socket.io')

const EVENTS = {
  DRAW_STROKE: 'draw:stroke',
  DRAW_CLEAR: 'draw:clear',
  USER_COUNT: 'user:count',
  SYNC_REQUEST: 'sync:request',
  SYNC_STATE: 'sync:state'
}

function initWebSocket(httpServer, options) {
  const io = new Server(httpServer, options)

  const canvasState = { strokes: [], lastModified: null }
  let onlineCount = 0

  io.on('connection', socket => {
    onlineCount += 1
    io.emit(EVENTS.USER_COUNT, { count: onlineCount })

    socket.on(EVENTS.SYNC_REQUEST, () => {
      socket.emit(EVENTS.SYNC_STATE, canvasState)
    })

    socket.on(EVENTS.DRAW_STROKE, stroke => {
      try {
        if (!stroke || !Array.isArray(stroke.points)) return
        canvasState.strokes.push(stroke)
        canvasState.lastModified = new Date().toISOString()
        socket.broadcast.emit(EVENTS.DRAW_STROKE, stroke)
      } catch (e) {
        console.error('draw:stroke error', e)
      }
    })

    socket.on(EVENTS.DRAW_CLEAR, () => {
      try {
        canvasState.strokes = []
        canvasState.lastModified = new Date().toISOString()
        io.emit(EVENTS.DRAW_CLEAR)
      } catch (e) {
        console.error('draw:clear error', e)
      }
    })

    socket.on('disconnect', () => {
      onlineCount = Math.max(0, onlineCount - 1)
      io.emit(EVENTS.USER_COUNT, { count: onlineCount })
    })
  })

  return io
}

module.exports = { initWebSocket, EVENTS }
```

server/src/app.js：
```javascript
// server/src/app.js
const Koa = require('koa')
const cors = require('@koa/cors')
const http = require('http')
const { initWebSocket } = require('./websocket')
const config = require('./config')

const app = new Koa()
app.use(cors({ origin: config.corsOrigins }))

const server = http.createServer(app.callback())
initWebSocket(server, config.socketOptions)

server.listen(config.port, () => {
  console.log(`Server listening on http://localhost:${config.port}`)
})
```

在 server/package.json 添加启动脚本：
```json
{
  "scripts": {
    "start": "node src/app.js"
  }
}
```

启动后端：
```bash
npm start
```

### 4.2 初始化前端（canvas）
回到根目录并创建前端：
```bash
cd ..
mkdir canvas && cd canvas
npm create vite@latest . -- --template vue
npm install
npm install socket.io-client
```

## 5. 前端开发（Vue 3 + Canvas）

src/main.js：
```javascript
// canvas/src/main.js
import { createApp } from 'vue'
import App from './App.vue'
import './assets/iconfont.css'

createApp(App).mount('#app')
```

src/App.vue：
```vue
<!-- canvas/src/App.vue -->
<template>
  <CanvasBoard />
</template>
<script setup>
import CanvasBoard from './components/CanvasBoard.vue'
</script>
```

src/utils/websocket.js：
```javascript
// canvas/src/utils/websocket.js
import { io } from 'socket.io-client'

export const EVENTS = {
  DRAW_STROKE: 'draw:stroke',
  DRAW_CLEAR: 'draw:clear',
  USER_COUNT: 'user:count',
  SYNC_REQUEST: 'sync:request',
  SYNC_STATE: 'sync:state'
}

const socket = io('http://localhost:3000', { autoConnect: true })
let isConnected = false

socket.on('connect', () => { isConnected = true })
socket.on('disconnect', () => { isConnected = false })

export const onUserCount = cb => socket.on(EVENTS.USER_COUNT, cb)
export const onRemoteStroke = cb => socket.on(EVENTS.DRAW_STROKE, cb)
export const onRemoteClear = cb => socket.on(EVENTS.DRAW_CLEAR, cb)
export const onSyncState = cb => socket.on(EVENTS.SYNC_STATE, cb)

export function requestSync() { socket.emit(EVENTS.SYNC_REQUEST) }
export function sendStroke(stroke) { if (isConnected) socket.emit(EVENTS.DRAW_STROKE, stroke) }
export function sendClear() { if (isConnected) socket.emit(EVENTS.DRAW_CLEAR) }
export function connected() { return isConnected }
```

src/components/CanvasBoard.vue（最小可用实现，含鼠标与触摸事件）：
```vue
<!-- canvas/src/components/CanvasBoard.vue -->
<template>
  <div class="board">
    <div class="toolbar">
      <button @click="tool='brush'" :class="{active: tool==='brush'}">画笔</button>
      <button @click="tool='eraser'" :class="{active: tool==='eraser'}">橡皮擦</button>
      <label>颜色 <input type="color" v-model="color" /></label>
      <label>粗细 <input type="range" min="1" max="40" v-model.number="size" /></label>
      <label>线型
        <select v-model="style">
          <option value="solid">实线</option>
          <option value="dashed">虚线</option>
          <option value="dotted">点线</option>
        </select>
      </label>
      <button @click="clearCanvas">清空</button>
      <span class="status">在线: {{ onlineCount }}</span>
    </div>
    <canvas ref="cvs" class="canvas"></canvas>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { onRemoteStroke, onRemoteClear, onUserCount, onSyncState, requestSync, sendStroke, sendClear } from '../utils/websocket'

const cvs = ref(null)
let ctx
const tool = ref('brush')
const color = ref('#333333')
const size = ref(6)
const style = ref('solid')
const onlineCount = ref(0)
const drawing = ref(false)
let lastPoint = null

const drawingHistory = ref([])

function setCanvasSize() {
  const el = cvs.value
  const dpr = window.devicePixelRatio || 1
  const rect = el.getBoundingClientRect()
  el.width = rect.width * dpr
  el.height = rect.height * dpr
  el.style.width = rect.width + 'px'
  el.style.height = rect.height + 'px'
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  redraw()
}

function getPos(e) {
  const rect = cvs.value.getBoundingClientRect()
  if (e.touches && e.touches[0]) {
    return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
  }
  return { x: e.clientX - rect.left, y: e.clientY - rect.top }
}

function applyStyle(s) {
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  if (s.style === 'dashed') ctx.setLineDash([12, 8])
  else if (s.style === 'dotted') ctx.setLineDash([2, 10])
  else ctx.setLineDash([])
}

function drawStrokeLocal(s) {
  ctx.save()
  applyStyle(s)
  ctx.lineWidth = s.size
  ctx.strokeStyle = s.tool === 'eraser' ? '#FFFFFF' : s.color
  ctx.globalCompositeOperation = s.tool === 'eraser' ? 'destination-out' : 'source-over'
  ctx.beginPath()
  const pts = s.points
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]
    if (i === 0) ctx.moveTo(p.x, p.y)
    else ctx.lineTo(p.x, p.y)
  }
  ctx.stroke()
  ctx.restore()
}

function redraw() {
  ctx.clearRect(0, 0, cvs.value.width, cvs.value.height)
  for (const s of drawingHistory.value) drawStrokeLocal(s)
}

function start(e) {
  drawing.value = true
  lastPoint = getPos(e)
  const s = { tool: tool.value, color: color.value, size: size.value, style: style.value, points: [lastPoint], ts: Date.now() }
  drawingHistory.value.push(s)
}

function move(e) {
  if (!drawing.value) return
  const p = getPos(e)
  const s = drawingHistory.value[drawingHistory.value.length - 1]
  s.points.push(p)
  drawStrokeLocal({ ...s, points: [lastPoint, p] })
  lastPoint = p
}

function end() {
  if (!drawing.value) return
  drawing.value = false
  const s = drawingHistory.value[drawingHistory.value.length - 1]
  sendStroke(s)
}

function clearCanvas() {
  drawingHistory.value = []
  redraw()
  sendClear()
}

onMounted(() => {
  ctx = cvs.value.getContext('2d')
  const resize = () => setCanvasSize()
  window.addEventListener('resize', resize)
  setTimeout(resize)

  cvs.value.addEventListener('mousedown', start)
  cvs.value.addEventListener('mousemove', move)
  window.addEventListener('mouseup', end)

  cvs.value.addEventListener('touchstart', e => { e.preventDefault(); start(e) }, { passive: false })
  cvs.value.addEventListener('touchmove', e => { e.preventDefault(); move(e) }, { passive: false })
  window.addEventListener('touchend', end)

  onUserCount(({ count }) => onlineCount.value = count)
  onRemoteStroke(s => { drawingHistory.value.push(s); drawStrokeLocal(s) })
  onRemoteClear(() => { drawingHistory.value = []; redraw() })
  onSyncState((state) => { drawingHistory.value = state.strokes || []; redraw() })
  requestSync()

  // 工具栏响应式更新无需额外逻辑
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', setCanvasSize)
  window.removeEventListener('mouseup', end)
  window.removeEventListener('touchend', end)
})
</script>

<style scoped>
.board { display: flex; flex-direction: column; height: 100vh; background: #F5F5F5; }
.toolbar { display: flex; gap: 12px; padding: 10px 16px; background: #FFFFFF; border-bottom: 1px solid #E0E0E0; flex-wrap: wrap; }
.toolbar button { padding: 6px 12px; border: 1px solid #BDBDBD; background: #F5F5F5; border-radius: 8px; cursor: pointer; }
.toolbar button.active { background: #90CAF9; color: #fff; border-color: #64B5F6; }
.toolbar label { color: #333; font-size: 14px; display: flex; align-items: center; gap: 6px; }
.canvas { flex: 1; background: #fff; touch-action: none; }
.status { margin-left: auto; color: #666; }
</style>
```

说明：为了教学清晰，这里将橡皮擦通过 destination-out 实现；真实项目也可改为白色画笔方式。

## 6. WebSocket 实时通信实现

事件与负载：
- draw:stroke { points: [{x,y}], tool, color, size, style, ts }
- draw:clear 无负载
- user:count { count }
- sync:request 无负载
- sync:state { strokes: [], lastModified }

设计思路：
- 新用户连接后请求同步；服务端返回当前画布状态；之后仅增量广播新的笔画与清空事件。
- 画布状态只保存在内存，适合演示与小型协作场景。
 