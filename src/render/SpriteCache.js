// src/render/SpriteCache.js
import { VISUALS } from '../config/visuals.js'

export class SpriteCache {
  constructor() {
    this.cache = new Map()
  }

  // 为指定颜色 + 动画类型预渲染精灵表
  prerender(color, balloonColor) {
    const key = `${color}_${balloonColor}`
    if (this.cache.has(key)) return

    const frames = VISUALS.frames
    const allFrames = {}

    // 每种动画类型预渲染
    for (const [animName, count] of Object.entries(frames)) {
      allFrames[animName] = []
      for (let i = 0; i < count; i++) {
        allFrames[animName].push(this._drawCharacterFrame(color, balloonColor, animName, i))
      }
    }

    this.cache.set(key, allFrames)
  }

  _drawCharacterFrame(bodyColor, balloonColor, animName, frameIndex) {
    const w = 32, h = 48
    const off = document.createElement('canvas')
    off.width = w; off.height = h
    const ctx = off.getContext('2d')

    // 身体（圆角矩形）
    ctx.fillStyle = bodyColor
    ctx.beginPath()
    ctx.roundRect(6, 16, 20, 24, 6)
    ctx.fill()
    // 描边
    ctx.strokeStyle = VISUALS.bodyOutline
    ctx.lineWidth = 1.5
    ctx.stroke()

    // 头（圆）
    ctx.fillStyle = bodyColor
    ctx.beginPath()
    ctx.arc(16, 12, 8, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    // 眼睛
    ctx.fillStyle = '#000'
    ctx.beginPath()
    ctx.arc(19, 11, 1.5, 0, Math.PI * 2)
    ctx.fill()

    // 气球（如果有）
    if (animName !== 'fall' && animName !== 'electrocute' && animName !== 'inflate') {
      const balloonY = 2 + Math.sin(frameIndex * 0.5) * 1
      ctx.fillStyle = balloonColor
      ctx.beginPath()
      ctx.arc(16, balloonY, 5, 0, Math.PI * 2)
      ctx.fill()
      // 高光
      ctx.fillStyle = VISUALS.balloonHighlight
      ctx.beginPath()
      ctx.arc(14, balloonY - 1, 1.5, 0, Math.PI * 2)
      ctx.fill()
      // 气球线
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(16, balloonY + 5)
      ctx.lineTo(16, 8)
      ctx.stroke()
    }

    // 动画特定细节
    if (animName === 'flap') {
      // 手臂上扬
      ctx.fillStyle = bodyColor
      ctx.fillRect(2, 18, 5, 4)
      ctx.fillRect(25, 18, 5, 4)
    } else if (animName === 'walk') {
      // 腿部交替
      ctx.fillStyle = bodyColor
      const offset = frameIndex % 2 === 0 ? 1 : -1
      ctx.fillRect(9, 40, 4, 6)
      ctx.fillRect(19, 40, 4, 6 + offset)
    } else if (animName === 'inflate') {
      // 充气：气球逐渐出现
      const progress = (frameIndex + 1) / VISUALS.frames.inflate
      ctx.globalAlpha = progress
      ctx.fillStyle = balloonColor
      ctx.beginPath()
      ctx.arc(16, 4, 3 * progress, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    } else if (animName === 'electrocute') {
      // 电弧效果
      ctx.strokeStyle = '#FFFF00'
      ctx.lineWidth = 1
      for (let j = 0; j < 3; j++) {
        ctx.beginPath()
        ctx.moveTo(Math.random() * w, Math.random() * h)
        ctx.lineTo(Math.random() * w, Math.random() * h)
        ctx.stroke()
      }
    } else if (animName === 'fall') {
      // 坠落：手臂上举
      ctx.fillStyle = bodyColor
      ctx.fillRect(2, 14, 5, 4)
      ctx.fillRect(25, 14, 5, 4)
    }

    return off
  }

  get(color, balloonColor, animName, frameIndex) {
    const key = `${color}_${balloonColor}`
    const sprites = this.cache.get(key)
    if (!sprites || !sprites[animName]) return null
    const frames = sprites[animName]
    return frames[frameIndex % frames.length]
  }
}
