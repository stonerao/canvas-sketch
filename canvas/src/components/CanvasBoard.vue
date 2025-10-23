<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { drawLine as drawLineUtil, redrawFromStroke as redrawFromStrokeUtil, redrawCanvas as redrawCanvasUtil } from '../utils/canvasDrawing.js'
import {
  connectWebSocket,
  disconnectWebSocket,
  sendStroke,
  sendClear,
  onRemoteStroke,
  onRemoteClear,
  onSyncState,
  onUserCount,
  getConnectionStatus
} from '../utils/websocket.js'

// Canvas 引用
const canvasRef = ref(null)
let ctx = null

// 绘画状态
const isDrawing = ref(false)
const lastX = ref(0)
const lastY = ref(0)

// 工具和画笔设置
const currentTool = ref('brush') // brush, eraser
const brushColor = ref('#000000')
const brushSize = ref(5)
const brushStyle = ref('solid') // solid, dashed, circle
const eraserSize = ref('medium') // small, medium, large

// 全屏状态
const isFullscreen = ref(false)

// 手机模式状态
const isPhoneMode = ref(false)

// 颜色选择器状态
const showColorPicker = ref(false)
const presetColors = [
  '#D4B996', '#C17A54', '#6D4C41', '#AED581',
  '#689F38', '#2E7D32', '#BBDEFB', '#1976D2',
  '#78909C', '#81D4FA', '#0288D1', '#F48FB1',
  '#FFCC80', '#CE93D8', '#E0E0E0', '#FFA726'
]

// 背景图片状态
const backgroundImage = ref(null)
const showBackgroundPicker = ref(false)

// 预设背景图片列表
const presetBackgrounds = [
  '滑梯上的小猫.png',
  '机器人猫.png',
  '简单着色 BB-8.png',
  'xiaoji.png',
  '可爱的宝宝三角龙.png',
  '可爱的狐狸给孩子们.png',
  '可爱的恐龙.png',
  '可爱的胖刺猬.png',
  '可爱的 puppy 填色页适合孩子们.png',
  '可爱的小兔子.png',
  '可爱的婴儿海龟孵化.png',
  '可爱的猪仔.png',
  '可爱海龟在沙滩上.png',
  '萌萌袋鼠.png',
  '小海豹.png',
  '字母R和机器人.png',
  'D代表Daisy.png'
]

// 绘画数据记录
const drawingHistory = ref([]) // 存储所有绘画记录
const currentStroke = ref(null) // 当前正在绘制的笔画
const canvasMetadata = ref({
  width: 0,
  height: 0,
  createdAt: null,
  lastModified: null
})

// WebSocket 连接状态
const isWebSocketConnected = ref(false)
const onlineUserCount = ref(0)

// 获取 Canvas 上下文
const initCanvas = () => {
  const canvas = canvasRef.value
  if (!canvas) return

  // 设置 Canvas 大小
  canvas.width = canvas.offsetWidth
  canvas.height = canvas.offsetHeight

  // 更新画布元数据
  canvasMetadata.value.width = canvas.width
  canvasMetadata.value.height = canvas.height
  if (!canvasMetadata.value.createdAt) {
    canvasMetadata.value.createdAt = new Date().toISOString()
  }

  ctx = canvas.getContext('2d')
  // 设置白色背景
  ctx.fillStyle = '#f9fafb'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
}

// 获取鼠标位置
const getMousePos = (e) => {
  const canvas = canvasRef.value
  const rect = canvas.getBoundingClientRect()
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  }
}

// 获取触摸位置
const getTouchPos = (e) => {
  const canvas = canvasRef.value
  const rect = canvas.getBoundingClientRect()
  const touch = e.touches[0]
  return {
    x: touch.clientX - rect.left,
    y: touch.clientY - rect.top
  }
}

// 获取橡皮擦大小（像素值）
const getEraserSizeValue = () => {
  const sizes = { small: 10, medium: 20, large: 40 }
  return sizes[eraserSize.value] || 20
}

// 绘制线条（使用工具函数）
const drawLine = (fromX, fromY, toX, toY) => {
  drawLineUtil(
    ctx,
    fromX,
    fromY,
    toX,
    toY,
    currentTool.value,
    brushColor.value,
    brushSize.value,
    brushStyle.value,
    getEraserSizeValue
  )
}

// 鼠标按下
const handleMouseDown = (e) => {
  isDrawing.value = true
  const pos = getMousePos(e)
  lastX.value = pos.x
  lastY.value = pos.y

  // 开始新的笔画记录
  currentStroke.value = {
    points: [{ x: pos.x, y: pos.y }],
    tool: currentTool.value,
    color: currentTool.value === 'eraser' ? '#ffffff' : brushColor.value,
    size: currentTool.value === 'eraser' ? getEraserSizeValue() : brushSize.value,
    style: currentTool.value === 'eraser' ? 'eraser' : brushStyle.value,
    timestamp: Date.now()
  }
}

// 鼠标移动
const handleMouseMove = (e) => {
  if (!isDrawing.value) return

  const pos = getMousePos(e)
  drawLine(lastX.value, lastY.value, pos.x, pos.y)

  // 记录路径点
  if (currentStroke.value) {
    currentStroke.value.points.push({ x: pos.x, y: pos.y })
  }

  lastX.value = pos.x
  lastY.value = pos.y
}

// 鼠标抬起
const handleMouseUp = () => {
  if (isDrawing.value && currentStroke.value) {
    // 保存当前笔画到历史记录
    const stroke = { ...currentStroke.value }
    drawingHistory.value.push(stroke)
    canvasMetadata.value.lastModified = new Date().toISOString()

    // 发送笔画数据到服务器（多人协作）
    if (isWebSocketConnected.value) {
      sendStroke(stroke)
    }

    currentStroke.value = null
  }
  isDrawing.value = false
}

// 触摸开始
const handleTouchStart = (e) => {
  e.preventDefault() // 阻止默认的页面滚动行为
  if (e.touches.length !== 1) return // 只支持单指触摸

  isDrawing.value = true
  const pos = getTouchPos(e)
  lastX.value = pos.x
  lastY.value = pos.y

  // 开始新的笔画记录
  currentStroke.value = {
    points: [{ x: pos.x, y: pos.y }],
    tool: currentTool.value,
    color: currentTool.value === 'eraser' ? '#ffffff' : brushColor.value,
    size: currentTool.value === 'eraser' ? getEraserSizeValue() : brushSize.value,
    style: currentTool.value === 'eraser' ? 'eraser' : brushStyle.value,
    timestamp: Date.now()
  }
}

// 触摸移动
const handleTouchMove = (e) => {
  e.preventDefault() // 阻止默认的页面滚动行为
  if (!isDrawing.value || e.touches.length !== 1) return

  const pos = getTouchPos(e)
  drawLine(lastX.value, lastY.value, pos.x, pos.y)

  // 记录路径点
  if (currentStroke.value) {
    currentStroke.value.points.push({ x: pos.x, y: pos.y })
  }

  lastX.value = pos.x
  lastY.value = pos.y
}

// 触摸结束
const handleTouchEnd = (e) => {
  e.preventDefault() // 阻止默认行为
  if (isDrawing.value && currentStroke.value) {
    // 保存当前笔画到历史记录
    const stroke = { ...currentStroke.value }
    drawingHistory.value.push(stroke)
    canvasMetadata.value.lastModified = new Date().toISOString()

    // 发送笔画数据到服务器（多人协作）
    if (isWebSocketConnected.value) {
      sendStroke(stroke)
    }

    currentStroke.value = null
  }
  isDrawing.value = false
}

// 全屏切换
const toggleFullscreen = async () => {
  try {
    if (!document.fullscreenElement) {
      // 进入全屏
      const elem = document.documentElement
      if (elem.requestFullscreen) {
        await elem.requestFullscreen()
      } else if (elem.webkitRequestFullscreen) {
        await elem.webkitRequestFullscreen()
      } else if (elem.mozRequestFullScreen) {
        await elem.mozRequestFullScreen()
      } else if (elem.msRequestFullscreen) {
        await elem.msRequestFullscreen()
      }
    } else {
      // 退出全屏
      if (document.exitFullscreen) {
        await document.exitFullscreen()
      } else if (document.webkitExitFullscreen) {
        await document.webkitExitFullscreen()
      } else if (document.mozCancelFullScreen) {
        await document.mozCancelFullScreen()
      } else if (document.msExitFullscreen) {
        await document.msExitFullscreen()
      }
    }
  } catch (error) {
    console.error('全屏切换失败:', error)
  }
}

// 监听全屏状态变化
const handleFullscreenChange = () => {
  isFullscreen.value = !!document.fullscreenElement

  // 如果退出全屏且处于手机模式，也退出手机模式
  if (!isFullscreen.value && isPhoneMode.value) {
    isPhoneMode.value = false
  }

  // 全屏状态改变时，重新调整 Canvas 尺寸
  setTimeout(() => {
    const canvas = canvasRef.value
    if (!canvas) return

    const oldWidth = canvas.width
    const oldHeight = canvas.height

    // 保存当前绘画内容
    const imageData = ctx.getImageData(0, 0, oldWidth, oldHeight)

    // 调整 Canvas 尺寸
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    // 恢复白色背景
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // 恢复绘画内容
    ctx.putImageData(imageData, 0, 0)

    // 更新元数据
    canvasMetadata.value.width = canvas.width
    canvasMetadata.value.height = canvas.height
  }, 100)
}

// 手机模式切换
const togglePhoneMode = async () => {
  if (!isPhoneMode.value) {
    // 进入手机模式
    isPhoneMode.value = true
    // 自动进入全屏
    await toggleFullscreen()
  } else {
    // 退出手机模式
    isPhoneMode.value = false
    // 关闭颜色选择器
    showColorPicker.value = false
    // 退出全屏
    if (document.fullscreenElement) {
      await toggleFullscreen()
    }
  }
}

// 颜色选择相关函数
const toggleColorPicker = () => {
  showColorPicker.value = !showColorPicker.value
}

const selectColor = (color) => {
  brushColor.value = color
  showColorPicker.value = false
}

const closeColorPicker = () => {
  showColorPicker.value = false
}

// 背景图片选择相关函数
const openBackgroundPicker = () => {
  showBackgroundPicker.value = true
}

const closeBackgroundPicker = () => {
  showBackgroundPicker.value = false
}

const selectBackground = (imageName) => {
  const img = new Image()
  img.onload = () => {
    backgroundImage.value = img
    redrawCanvas()
    closeBackgroundPicker()
  }
  img.onerror = () => {
    console.error('Failed to load background image:', imageName)
    alert('加载背景图片失败，请重试')
  }
  img.src = `/background/${imageName}`
}

// 重绘画布（包含背景图片和所有笔画）（使用工具函数）
const redrawCanvas = () => {
  if (!ctx) return
  const canvas = canvasRef.value

  // 先绘制白色背景
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // 使用工具函数重绘画布
  redrawCanvasUtil(ctx, canvas, backgroundImage.value, drawingHistory.value)
}

// 清空画布
const clearCanvas = () => {
  if (!ctx) return

  // 清空绘画历史
  drawingHistory.value = []
  canvasMetadata.value.lastModified = new Date().toISOString()

  // 重绘画布（保留背景图片）
  redrawCanvas()

  // 发送清空事件到服务器（多人协作）
  if (isWebSocketConnected.value) {
    sendClear()
  }
}

// 下载画布图片（只下载绘画内容，不包含背景图片）
const downloadCanvas = () => {
  const canvas = canvasRef.value

  // 创建临时 Canvas
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = canvas.width
  tempCanvas.height = canvas.height
  const tempCtx = tempCanvas.getContext('2d')

  // 绘制白色背景
  tempCtx.fillStyle = '#ffffff'
  tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height)

  // 只重绘用户绘制的笔画，不绘制背景图片
  drawingHistory.value.forEach(stroke => {
    redrawFromStrokeUtil(tempCtx, stroke)
  })

  // 使用临时 Canvas 生成下载链接
  const link = document.createElement('a')
  link.href = tempCanvas.toDataURL('image/png')
  link.download = 'canvas-drawing.png'
  link.click()
}

// 保存绘画数据为 JSON
const saveDrawingData = () => {
  const data = {
    version: '1.0',
    metadata: {
      ...canvasMetadata.value,
      exportedAt: new Date().toISOString()
    },
    strokes: drawingHistory.value
  }

  const jsonStr = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `canvas-drawing-${Date.now()}.json`
  link.click()

  URL.revokeObjectURL(url)
}

// 从笔画数据重新绘制（使用工具函数）
const redrawFromStroke = (stroke) => {
  redrawFromStrokeUtil(ctx, stroke)
}

// 加载绘画数据
const loadDrawingData = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'

  input.onchange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result)

        // 验证数据格式
        if (!data.strokes || !Array.isArray(data.strokes)) {
          alert('无效的绘画数据格式')
          return
        }

        // 清空当前画布
        clearCanvas()

        // 如果有元数据，更新画布尺寸
        if (data.metadata) {
          if (data.metadata.width && data.metadata.height) {
            const canvas = canvasRef.value
            canvas.width = data.metadata.width
            canvas.height = data.metadata.height
            canvasMetadata.value.width = data.metadata.width
            canvasMetadata.value.height = data.metadata.height

            // 重新绘制白色背景
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(0, 0, canvas.width, canvas.height)
          }
        }

        // 重新绘制所有笔画
        data.strokes.forEach(stroke => {
          redrawFromStroke(stroke)
        })

        // 更新历史记录
        drawingHistory.value = data.strokes
        canvasMetadata.value.lastModified = new Date().toISOString()

        alert('绘画数据加载成功！')
      } catch (error) {
        console.error('加载绘画数据失败:', error)
        alert('加载绘画数据失败，请检查文件格式')
      }
    }

    reader.readAsText(file)
  }

  input.click()
}

// 生命周期
onMounted(async () => {
  initCanvas()
  window.addEventListener('mouseup', handleMouseUp)

  // 监听全屏状态变化
  document.addEventListener('fullscreenchange', handleFullscreenChange)
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
  document.addEventListener('mozfullscreenchange', handleFullscreenChange)
  document.addEventListener('MSFullscreenChange', handleFullscreenChange)

  // 初始化 WebSocket 连接（多人协作功能）
  try {
    await connectWebSocket()
    isWebSocketConnected.value = true
    console.log('✅ WebSocket 连接成功，多人协作功能已启用')

    // 监听远程绘画笔画
    onRemoteStroke((strokeData) => {
      // 添加到绘画历史
      drawingHistory.value.push(strokeData)
      // 重绘笔画
      redrawFromStroke(strokeData)
    })

    // 监听远程清空画布
    onRemoteClear(() => {
      // 清空绘画历史
      drawingHistory.value = []
      canvasMetadata.value.lastModified = new Date().toISOString()
      // 重绘画布（保留背景图片）
      redrawCanvas()
    })

    // 监听画布状态同步（用于新用户加入或重连）
    onSyncState((canvasState) => {
      if (canvasState.strokes && canvasState.strokes.length > 0) {
        console.log('🔄 同步画布状态，笔画数:', canvasState.strokes.length)
        // 清空当前画布
        drawingHistory.value = []
        redrawCanvas()
        // 重绘所有笔画
        canvasState.strokes.forEach(stroke => {
          drawingHistory.value.push(stroke)
          redrawFromStroke(stroke)
        })
      }
    })

    // 监听在线用户数量
    onUserCount((count) => {
      onlineUserCount.value = count
    })

  } catch (error) {
    console.error('❌ WebSocket 连接失败:', error)
    isWebSocketConnected.value = false
    console.warn('⚠️  多人协作功能不可用，将以单机模式运行')
  }
})

onUnmounted(() => {
  window.removeEventListener('mouseup', handleMouseUp)

  // 移除全屏事件监听
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
  document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
  document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
  document.removeEventListener('MSFullscreenChange', handleFullscreenChange)

  // 断开 WebSocket 连接
  if (isWebSocketConnected.value) {
    disconnectWebSocket()
    isWebSocketConnected.value = false
  }
})
</script>

<template>
  <div class="canvas-board-container">
    <!-- 控制面板（非手机模式下显示） -->
    <div v-if="!isPhoneMode" class="control-panel">
      <!-- 工具选择 -->
      <div class="control-group tool-selector">
        <label>工具：</label>
        <div class="tool-buttons">
          <button
            @click="currentTool = 'brush'"
            :class="['tool-btn', { active: currentTool === 'brush' }]"
            title="画笔工具"
          >
            <i class="iconfont icon-huabi"></i>
          </button>
          <button
            @click="currentTool = 'eraser'"
            :class="['tool-btn', { active: currentTool === 'eraser' }]"
            title="橡皮擦工具"
          >
            <i class="iconfont icon-qingchu"></i>
          </button>
        </div>
      </div>

      <!-- 画笔设置（仅在画笔模式下显示） -->
      <div v-if="currentTool === 'brush'" class="brush-settings">
        <div class="control-group">
          <label>颜色选择：</label>
          <input
            v-model="brushColor"
            type="color"
            class="color-picker"
            title="选择画笔颜色"
          />
          <span class="color-value">{{ brushColor }}</span>
        </div>

        <div class="control-group">
          <label>笔刷大小：</label>
          <input
            v-model.number="brushSize"
            type="range"
            min="1"
            max="50"
            class="size-slider"
            title="调整笔刷大小"
          />
          <span class="size-value">{{ brushSize }}px</span>
        </div>

        <div class="control-group">
          <label>笔触类型：</label>
          <select v-model="brushStyle" class="style-select" title="选择笔触样式">
            <option value="solid">实线</option>
            <option value="dashed">虚线</option>
            <option value="circle">圆形</option>
          </select>
        </div>
      </div>

      <!-- 橡皮擦设置（仅在橡皮擦模式下显示） -->
      <div v-if="currentTool === 'eraser'" class="eraser-settings">
        <div class="control-group">
          <label>橡皮擦大小：</label>
          <div class="eraser-size-buttons">
            <button
              @click="eraserSize = 'small'"
              :class="['size-btn', { active: eraserSize === 'small' }]"
              title="小橡皮擦 (10px)"
            >
              小
            </button>
            <button
              @click="eraserSize = 'medium'"
              :class="['size-btn', { active: eraserSize === 'medium' }]"
              title="中橡皮擦 (20px)"
            >
              中
            </button>
            <button
              @click="eraserSize = 'large'"
              :class="['size-btn', { active: eraserSize === 'large' }]"
              title="大橡皮擦 (40px)"
            >
              大
            </button>
          </div>
          <span class="size-value">{{ getEraserSizeValue() }}px</span>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="control-group buttons">
        <button @click="clearCanvas" class="btn btn-clear" title="清空画布">
          <i class="iconfont icon-shuazi"></i>
        </button>
        <button @click="downloadCanvas" class="btn btn-download" title="下载图片">
          <i class="iconfont icon-xiazai3"></i>
        </button>
        <button @click="openBackgroundPicker" class="btn btn-background" title="选择背景图片">
          <i class="iconfont icon-zidingyibeijingkuai"></i>
        </button>
        <button @click="saveDrawingData" class="btn btn-save" title="保存绘画数据">
          <i class="iconfont icon-baocun"></i>
        </button>
        <button @click="loadDrawingData" class="btn btn-load" title="加载绘画数据">
          <i class="iconfont icon-jiazai"></i>
        </button>
        <button @click="toggleFullscreen" class="btn btn-fullscreen" :title="isFullscreen ? '退出全屏 (ESC)' : '进入全屏'">
          <i class="iconfont icon-quanping"></i>
        </button>
        <button @click="togglePhoneMode" class="btn btn-phone-mode" title="进入手机模式">
          <i class="iconfont icon-shouji"></i>
        </button>
      </div>

      <!-- 多人协作状态指示器 -->
      <div class="control-group collaboration-status">
        <div :class="['status-indicator', { connected: isWebSocketConnected }]">
          <span class="status-dot"></span>
          <span class="status-text">
            {{ isWebSocketConnected ? '多人协作已启用' : '单机模式' }}
          </span>
          <span v-if="isWebSocketConnected && onlineUserCount > 0" class="user-count">
            👥 {{ onlineUserCount }} 人在线
          </span>
        </div>
      </div>
    </div>

    <!-- 手机模式下的浮动按钮 -->
    <div v-if="isPhoneMode" class="phone-mode-controls">
      <!-- 返回按钮 - 左上角 -->
      <button @click="togglePhoneMode" class="floating-btn back-btn" title="退出手机模式">
        <i class="iconfont icon-fanhui1"></i>
      </button>
      <!-- 清空画布按钮 - 右上角 -->
      <button @click="clearCanvas" class="floating-btn clear-btn" title="清空画布">
        <i class="iconfont icon-shuazi"></i>
      </button>
      <!-- 工具切换按钮 - 左下角 -->
      <button
        @click="currentTool = currentTool === 'brush' ? 'eraser' : 'brush'"
        class="floating-btn tool-toggle-btn"
        :title="currentTool === 'brush' ? '切换到橡皮擦' : '切换到画笔'"
      >
        <i :class="['iconfont', currentTool === 'brush' ? 'icon-qingchu' : 'icon-huabi']"></i>
      </button>
      <!-- 颜色选择按钮 - 右下角 -->
      <button @click="toggleColorPicker" class="floating-btn color-btn" title="选择颜色">
        <i class="iconfont icon-huabi2"></i>
      </button>
    </div>

    <!-- 颜色选择器弹窗 -->
    <div v-if="isPhoneMode && showColorPicker" class="color-picker-modal">
      <!-- 遮罩层 -->
      <div class="modal-overlay" @click="closeColorPicker"></div>
      <!-- 弹窗内容 -->
      <div class="modal-content">
        <div class="modal-header">
          <h3>选择颜色</h3>
          <button @click="closeColorPicker" class="close-btn" title="关闭">×</button>
        </div>
        <div class="modal-body">
          <!-- 预设颜色网格 -->
          <div class="preset-colors">
            <div
              v-for="color in presetColors"
              :key="color"
              :style="{ backgroundColor: color }"
              :class="['color-item', { active: brushColor === color }]"
              @click="selectColor(color)"
              :title="color"
            >
              <span v-if="brushColor === color" class="check-mark">✓</span>
            </div>
          </div>
          <!-- 自定义颜色选择器 -->
          <div class="custom-color">
            <label>自定义颜色：</label>
            <input
              v-model="brushColor"
              type="color"
              class="custom-color-input"
              @change="closeColorPicker"
              title="选择自定义颜色"
            />
            <span class="color-value">{{ brushColor }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 背景图片选择器弹窗 -->
    <div v-if="showBackgroundPicker" class="background-picker-modal">
      <!-- 遮罩层 -->
      <div class="modal-overlay" @click="closeBackgroundPicker"></div>
      <!-- 弹窗内容 -->
      <div class="modal-content background-modal-content">
        <div class="modal-header">
          <h3>选择背景图片</h3>
          <button @click="closeBackgroundPicker" class="close-btn" title="关闭">×</button>
        </div>
        <div class="modal-body">
          <!-- 预设背景图片网格 -->
          <div class="preset-backgrounds">
            <div
              v-for="imageName in presetBackgrounds"
              :key="imageName"
              class="background-item"
              @click="selectBackground(imageName)"
              :title="imageName"
            >
              <img :src="`/background/${imageName}`" :alt="imageName" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Canvas 画布 -->
    <canvas
      ref="canvasRef"
      class="canvas"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @mouseleave="handleMouseUp"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
      @touchcancel="handleTouchEnd"
    ></canvas>
  </div>
</template>

<style src="./CanvasBoard.css" scoped></style>

