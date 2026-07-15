// src/render/BackgroundRenderer.js
import { WORLD } from '../config/world.js'
import { VISUALS } from '../config/visuals.js'
import { AirCurrentParticles } from './AirCurrentRenderer.js'

export class BackgroundRenderer {
  constructor() {
    this._cloudCache = new Map()
    this._cacheClouds()
    // 实例化云层数据
    this.clouds = []
    for (let i = 0; i < VISUALS.cloudCount; i++) {
      this.clouds.push({
        x: Math.random() * WORLD.width,
        y: Math.random() * (WORLD.waterY - 100),
        size: 30 + Math.random() * 40,
        speed: 5 + Math.random() * 10,
        alpha: 0.3 + Math.random() * 0.4,
        // 从缓存分配一个变体
        variant: Math.floor(Math.random() * 3),
      })
    }
    this.time = 0
  }

  _cacheClouds() {
    // 为 3 种尺寸变体各预渲染一个云朵精灵
    for (let v = 0; v < 3; v++) {
      const baseSize = 35 + v * 10
      const padding = baseSize * 0.8
      const canvasSize = Math.ceil(baseSize + padding * 2)
      const off = document.createElement('canvas')
      off.width = canvasSize
      off.height = canvasSize
      const ctx = off.getContext('2d')
      const cx = canvasSize / 2
      const cy = canvasSize / 2
      this._drawCloudShape(ctx, cx, cy, baseSize, v)
      this._cloudCache.set(v, { canvas: off, size: canvasSize })
    }
  }

  // 云朵造型（3 种变体）
  _drawCloudShape(ctx, cx, cy, size, variant) {
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    // 变体 0：标准蓬松
    // 变体 1：更圆润（大圆叠加）
    // 变体 2：扁长形
    if (variant === 0) {
      ctx.arc(cx, cy, size * 0.5, 0, Math.PI * 2)
      ctx.arc(cx + size * 0.4, cy - size * 0.1, size * 0.4, 0, Math.PI * 2)
      ctx.arc(cx + size * 0.7, cy, size * 0.45, 0, Math.PI * 2)
      ctx.arc(cx + size * 0.3, cy + size * 0.15, size * 0.35, 0, Math.PI * 2)
    } else if (variant === 1) {
      ctx.arc(cx, cy, size * 0.55, 0, Math.PI * 2)
      ctx.arc(cx + size * 0.35, cy - size * 0.15, size * 0.45, 0, Math.PI * 2)
      ctx.arc(cx - size * 0.3, cy + size * 0.05, size * 0.4, 0, Math.PI * 2)
    } else {
      ctx.arc(cx, cy, size * 0.4, 0, Math.PI * 2)
      ctx.arc(cx + size * 0.25, cy - size * 0.05, size * 0.35, 0, Math.PI * 2)
      ctx.arc(cx + size * 0.5, cy + size * 0.05, size * 0.3, 0, Math.PI * 2)
      ctx.arc(cx + size * 0.1, cy + size * 0.1, size * 0.3, 0, Math.PI * 2)
    }
    ctx.fill()
  }

  update(dt) {
    this.time += dt
    this.clouds.forEach(c => {
      c.x -= c.speed * dt
      if (c.x < -100) c.x = WORLD.width + 100
    })
  }

  render(ctx, camera) {
    const w = camera.viewWidth
    const h = camera.viewHeight

    // 天空渐变
    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, VISUALS.skyTop)
    grad.addColorStop(1, VISUALS.skyBottom)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)

    // 世界变换
    ctx.save()
    ctx.translate(-camera.x, -camera.y)

    // 远景云层（使用缓存精灵）
    this.clouds.forEach(c => {
      ctx.globalAlpha = c.alpha
      const cached = this._cloudCache.get(c.variant)
      if (cached) {
        const s = c.size / 35 // 归一化到基础尺寸
        const drawSize = cached.size * s
        ctx.drawImage(
          cached.canvas,
          c.x - drawSize / 2,
          c.y - drawSize / 2,
          drawSize, drawSize
        )
      }
    })
    ctx.globalAlpha = 1

    // 水域
    ctx.fillStyle = VISUALS.waterColor
    ctx.fillRect(0, WORLD.waterY, WORLD.width, WORLD.height - WORLD.waterY)
    // 水面波纹
    ctx.strokeStyle = VISUALS.waterSurface
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let x = 0; x <= WORLD.width; x += 10) {
      const y = WORLD.waterY + Math.sin(x * 0.02 + this.time * 2) * 3
      if (x === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()

    // 边界
    ctx.strokeStyle = VISUALS.boundaryColor
    ctx.lineWidth = 6
    ctx.strokeRect(0, 0, WORLD.width, WORLD.height)

    ctx.restore()
  }
}
