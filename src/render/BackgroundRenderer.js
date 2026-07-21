// src/render/BackgroundRenderer.js
import { WORLD } from '../config/world.js'
import { VISUALS } from '../config/visuals.js'
import { AirCurrentParticles } from './AirCurrentRenderer.js'

export class BackgroundRenderer {
  constructor() {
    this._cloudCache = new Map()
    this._cacheClouds()
    this.clouds = []
    for (let i = 0; i < VISUALS.cloudCount; i++) {
      this.clouds.push({
        x: Math.random() * WORLD.width,
        y: Math.random() * (WORLD.waterY - 100),
        size: 30 + Math.random() * 40,
        speed: 5 + Math.random() * 10,
        alpha: 0.3 + Math.random() * 0.4,
        variant: Math.floor(Math.random() * 3),
      })
    }
    // 预渲染远山层
    this._mountains = this._buildMountains()
    this.time = 0
  }

  _buildMountains() {
    // 远山层（2层视差）
    const layers = []
    for (let layer = 0; layer < 2; layer++) {
      const c = document.createElement('canvas')
      c.width = WORLD.width + 200
      c.height = 300
      const ctx = c.getContext('2d')
      const baseY = 200 - layer * 40
      const color = layer === 0 ? 'rgba(140,170,200,0.25)' : 'rgba(100,140,175,0.35)'
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.moveTo(0, 300)
      const peaks = 8 + layer * 3
      const segW = (WORLD.width + 200) / peaks
      for (let i = 0; i <= peaks; i++) {
        const px = i * segW
        const py = baseY - Math.abs(Math.sin(i * 1.3 + layer) * 60) - Math.random() * 20
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.lineTo(WORLD.width + 200, 300)
      ctx.closePath()
      ctx.fill()
      layers.push({ canvas: c, parallax: 0.1 + layer * 0.15 })
    }
    return layers
  }

  _cacheClouds() {
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

  _drawCloudShape(ctx, cx, cy, size, variant) {
    ctx.fillStyle = '#fff'
    ctx.beginPath()
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
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h)
    skyGrad.addColorStop(0, VISUALS.skyTop)
    skyGrad.addColorStop(0.6, VISUALS.skyMid)
    skyGrad.addColorStop(1, VISUALS.skyBottom)
    ctx.fillStyle = skyGrad
    ctx.fillRect(0, 0, w, h)

    // 太阳
    const sunX = w * 0.82
    const sunY = h * 0.12
    const sunGrad = ctx.createRadialGradient(sunX, sunY, 5, sunX, sunY, 50)
    sunGrad.addColorStop(0, 'rgba(255,255,240,0.9)')
    sunGrad.addColorStop(0.3, 'rgba(255,255,220,0.4)')
    sunGrad.addColorStop(1, 'rgba(255,255,200,0)')
    ctx.fillStyle = sunGrad
    ctx.beginPath()
    ctx.arc(sunX, sunY, 50, 0, Math.PI * 2)
    ctx.fill()
    // 太阳核心
    ctx.fillStyle = 'rgba(255,255,250,0.95)'
    ctx.beginPath()
    ctx.arc(sunX, sunY, 12, 0, Math.PI * 2)
    ctx.fill()

    // 世界变换
    ctx.save()
    ctx.translate(-camera.x, -camera.y)

    // 远山视差
    this._mountains.forEach(m => {
      const offsetX = -camera.x * m.parallax
      ctx.drawImage(m.canvas, offsetX, WORLD.waterY - 280)
    })

    // 远景云
    this.clouds.forEach(c => {
      ctx.globalAlpha = c.alpha
      const cached = this._cloudCache.get(c.variant)
      if (cached) {
        const s = c.size / 35
        const drawSize = cached.size * s
        ctx.drawImage(cached.canvas, c.x - drawSize / 2, c.y - drawSize / 2, drawSize, drawSize)
      }
    })
    ctx.globalAlpha = 1

    // 水域（渐变）
    const waterGrad = ctx.createLinearGradient(0, WORLD.waterY, 0, WORLD.height)
    waterGrad.addColorStop(0, 'rgba(50,140,200,0.65)')
    waterGrad.addColorStop(0.3, 'rgba(35,110,170,0.75)')
    waterGrad.addColorStop(1, 'rgba(15,60,120,0.85)')
    ctx.fillStyle = waterGrad
    ctx.fillRect(0, WORLD.waterY, WORLD.width, WORLD.height - WORLD.waterY)

    // 水面波纹
    ctx.strokeStyle = 'rgba(120,200,255,0.4)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    for (let x = 0; x <= WORLD.width; x += 8) {
      const y = WORLD.waterY + Math.sin(x * 0.02 + this.time * 2.5) * 3
      if (x === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()

    // 次级波纹
    ctx.strokeStyle = 'rgba(150,210,255,0.2)'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = 0; x <= WORLD.width; x += 12) {
      const y = WORLD.waterY + 8 + Math.sin(x * 0.015 + this.time * 1.8 + 1) * 2.5
      if (x === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()

    // 边界
    ctx.strokeStyle = VISUALS.boundaryColor
    ctx.lineWidth = 4
    ctx.strokeRect(0, 0, WORLD.width, WORLD.height)

    ctx.restore()
  }
}
