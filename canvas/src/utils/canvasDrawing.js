/**
 * Canvas 绘画工具函数模块
 * 包含绘制线条、重绘笔画、重绘整个画布等核心绘画逻辑
 */

/**
 * 绘制线条（从一个点到另一个点）
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D 上下文
 * @param {number} fromX - 起点 X 坐标
 * @param {number} fromY - 起点 Y 坐标
 * @param {number} toX - 终点 X 坐标
 * @param {number} toY - 终点 Y 坐标
 * @param {string} tool - 工具类型 ('brush' 或 'eraser')
 * @param {string} color - 画笔颜色
 * @param {number} size - 画笔大小
 * @param {string} style - 笔触样式 ('solid', 'dashed', 'circle')
 * @param {Function} getEraserSizeValue - 获取橡皮擦大小的函数
 */
export function drawLine(ctx, fromX, fromY, toX, toY, tool, color, size, style, getEraserSizeValue) {
  if (!ctx) return

  // 保存当前状态
  ctx.save()

  // 橡皮擦模式
  if (tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out'
    ctx.lineWidth = getEraserSizeValue()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.setLineDash([])

    ctx.beginPath()
    ctx.moveTo(fromX, fromY)
    ctx.lineTo(toX, toY)
    ctx.stroke()

    ctx.restore()
    return
  }

  // 画笔模式
  ctx.globalCompositeOperation = 'source-over'
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = size
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  // 根据笔触类型绘制
  if (style === 'dashed') {
    ctx.setLineDash([5, 5])
  } else if (style === 'circle') {
    // 圆形笔触：绘制多个圆点
    const distance = Math.sqrt((toX - fromX) ** 2 + (toY - fromY) ** 2)
    const steps = Math.ceil(distance)
    for (let i = 0; i <= steps; i++) {
      const t = steps === 0 ? 0 : i / steps
      const x = fromX + (toX - fromX) * t
      const y = fromY + (toY - fromY) * t
      ctx.beginPath()
      ctx.arc(x, y, size / 2, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
    return
  } else {
    ctx.setLineDash([])
  }

  ctx.beginPath()
  ctx.moveTo(fromX, fromY)
  ctx.lineTo(toX, toY)
  ctx.stroke()

  ctx.restore()
}

/**
 * 从笔画数据重新绘制
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D 上下文
 * @param {Object} stroke - 笔画数据对象
 * @param {Array} stroke.points - 路径点数组 [{x, y}, ...]
 * @param {string} stroke.color - 颜色
 * @param {number} stroke.size - 大小
 * @param {string} stroke.style - 笔触样式
 * @param {string} stroke.tool - 工具类型
 * @param {number} [stroke.opacity] - 透明度（向后兼容）
 */
export function redrawFromStroke(ctx, stroke) {
  if (!ctx || !stroke.points || stroke.points.length === 0) return

  // 保存当前状态
  ctx.save()

  // 橡皮擦模式
  if (stroke.tool === 'eraser' || stroke.style === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out'
    ctx.lineWidth = stroke.size
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.setLineDash([])

    ctx.beginPath()
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
    }
    ctx.stroke()

    ctx.restore()
    return
  }

  // 画笔模式
  ctx.globalCompositeOperation = 'source-over'
  ctx.strokeStyle = stroke.color
  ctx.fillStyle = stroke.color
  ctx.lineWidth = stroke.size
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  // 向后兼容：支持旧文件中的 opacity 字段（铅笔/钢笔笔触）
  if (stroke.opacity !== undefined) {
    ctx.globalAlpha = stroke.opacity
  }

  // 根据笔触类型绘制
  if (stroke.style === 'dashed') {
    ctx.setLineDash([5, 5])
    ctx.lineDashOffset = 0  // 重置虚线偏移，确保虚线连贯
  } else {
    ctx.setLineDash([])
    ctx.lineDashOffset = 0
  }

  if (stroke.style === 'circle') {
    // 圆形笔触
    for (let i = 0; i < stroke.points.length; i++) {
      const point = stroke.points[i]
      ctx.beginPath()
      ctx.arc(point.x, point.y, stroke.size / 2, 0, Math.PI * 2)
      ctx.fill()
    }
  } else {
    // 其他笔触（实线、虚线，以及向后兼容的铅笔、钢笔）
    ctx.beginPath()
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
    }
    ctx.stroke()
  }

  // 重置 globalAlpha，确保不影响后续绘制
  ctx.globalAlpha = 1.0
  ctx.restore()
}

/**
 * 重新绘制整个画布（包括背景图片和所有笔画）
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D 上下文
 * @param {HTMLCanvasElement} canvas - Canvas 元素
 * @param {HTMLImageElement|null} backgroundImage - 背景图片对象
 * @param {Array} drawingHistory - 绘画历史记录数组
 */
export function redrawCanvas(ctx, canvas, backgroundImage, drawingHistory) {
  if (!ctx || !canvas) return

  // 清空画布
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // 绘制背景图片（如果存在）- 使用 contain 方式完整显示图片
  if (backgroundImage) {
    const canvasAspect = canvas.width / canvas.height
    const imageAspect = backgroundImage.width / backgroundImage.height

    let drawWidth, drawHeight, offsetX, offsetY

    if (imageAspect > canvasAspect) {
      // 图片更宽，以画布宽度为准
      drawWidth = canvas.width
      drawHeight = canvas.width / imageAspect
      offsetX = 0
      offsetY = (canvas.height - drawHeight) / 2
    } else {
      // 图片更高，以画布高度为准
      drawHeight = canvas.height
      drawWidth = canvas.height * imageAspect
      offsetX = (canvas.width - drawWidth) / 2
      offsetY = 0
    }

    ctx.drawImage(backgroundImage, offsetX, offsetY, drawWidth, drawHeight)
  }

  // 重新绘制所有笔画
  drawingHistory.forEach(stroke => {
    redrawFromStroke(ctx, stroke)
  })
}

