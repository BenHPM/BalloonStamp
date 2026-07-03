// src/render/BackgroundRenderer.js
import { WORLD } from '../config/world.js'
import { VISUALS } from '../config/visuals.js'

export class BackgroundRenderer {
  constructor() {
    // 预生成云朵装饰
    this.clouds = []
    for (let i = 0; i < VISUALS.cloudCount; i++) {
      this.clouds.push({
        x: Math.random() * WORLD.width,
        y: Math.random() * (WORLD.waterY - 100),
        size: 30 + Math.random() * 40,
        speed: 5 + Math.random() * 10,
        alpha: 0.3 + Math.random() * 0.4,
      })
    }
    this.time = 0
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

    // 远景云层（视差 0.3）
    this.clouds.forEach(c => {
      ctx.globalAlpha = c.alpha
      this._drawCloud(ctx, c.x, c.y, c.size)
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

  _drawCloud(ctx, x, y, size) {
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(x, y, size * 0.5, 0, Math.PI * 2)
    ctx.arc(x + size * 0.4, y - size * 0.1, size * 0.4, 0, Math.PI * 2)
    ctx.arc(x + size * 0.7, y, size * 0.45, 0, Math.PI * 2)
    ctx.arc(x + size * 0.3, y + size * 0.15, size * 0.35, 0, Math.PI * 2)
    ctx.fill()
  }
}
