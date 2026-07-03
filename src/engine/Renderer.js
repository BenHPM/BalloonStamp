// src/engine/Renderer.js
// 临时渲染器 — 画天空 + 中心矩形验证相机
import { WORLD } from '../config/world.js'

export class DebugRenderer {
  render(ctx, camera, dt, entities = []) {
    const w = camera.viewWidth
    const h = camera.viewHeight

    // 天空渐变
    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, '#87CEEB')
    grad.addColorStop(1, '#E0F6FF')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)

    // 世界变换
    ctx.save()
    ctx.translate(-camera.x, -camera.y)

    // 世界边界
    ctx.strokeStyle = 'rgba(150,200,255,0.5)'
    ctx.lineWidth = 4
    ctx.strokeRect(0, 0, WORLD.width, WORLD.height)

    // 水域
    ctx.fillStyle = 'rgba(64,164,223,0.4)'
    ctx.fillRect(0, WORLD.waterY, WORLD.width, WORLD.height - WORLD.waterY)

    // 实体（临时方块）
    entities.forEach(e => {
      ctx.fillStyle = e.color || '#f00'
      ctx.fillRect(e.x, e.y, e.width || 20, e.height || 20)
    })

    ctx.restore()
  }
}
