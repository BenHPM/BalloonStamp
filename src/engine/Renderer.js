// src/engine/Renderer.js
import { BackgroundRenderer } from '../render/BackgroundRenderer.js'
import { EntityRenderer } from '../render/EntityRenderer.js'
import { ParticleSystem } from '../render/ParticleSystem.js'
import { HUDRenderer } from '../render/HUDRenderer.js'
import { WORLD } from '../config/world.js'
import { PLATFORMS, LIGHTNING_CLOUDS, AIR_CURRENTS } from '../config/entities.js'

export class Renderer {
  constructor() {
    this.bg = new BackgroundRenderer()
    this.entityRenderer = new EntityRenderer()
    this.particles = new ParticleSystem()
    this.hud = new HUDRenderer()
    this.time = 0
  }

  update(dt) {
    this.time += dt
    this.bg.update(dt)
    this.particles.update(dt)
  }

  render(ctx, camera, data) {
    const w = camera.viewWidth
    const h = camera.viewHeight

    // 背景
    this.bg.render(ctx, camera)

    // 世界变换
    ctx.save()
    ctx.translate(-camera.x, -camera.y)

    // 平台
    PLATFORMS.forEach(p => this.entityRenderer.renderPlatform(ctx, p))

    // 气流区
    AIR_CURRENTS.forEach(ac => {
      ctx.strokeStyle = 'rgba(200,220,255,0.4)'
      ctx.lineWidth = 2
      ctx.strokeRect(ac.x, ac.y, ac.w, ac.h)
    })

    // 小白云
    LIGHTNING_CLOUDS.forEach(lc => {
      ctx.fillStyle = 'rgba(255,255,255,0.8)'
      ctx.beginPath()
      ctx.arc(lc.x, lc.y, lc.radius, 0, Math.PI * 2)
      ctx.fill()
    })

    // 闪电
    if (data.lightnings) {
      data.lightnings.forEach(l => {
        ctx.strokeStyle = '#FFFF00'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(l.x, l.y)
        ctx.lineTo(l.x + l.vx * 0.05, l.y + l.vy * 0.05)
        ctx.stroke()
        ctx.fillStyle = '#FFFF00'
        ctx.beginPath()
        ctx.arc(l.x, l.y, 4, 0, Math.PI * 2)
        ctx.fill()
      })
    }

    // 鲸鱼
    if (data.whale && data.whale.state !== 'hidden') {
      const wh = data.whale
      if (wh.state === 'warning') {
        ctx.fillStyle = 'rgba(100,150,200,0.5)'
        ctx.beginPath()
        ctx.arc(wh.x, WORLD.waterY, 30, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.fillStyle = '#4488AA'
        ctx.beginPath()
        ctx.ellipse(wh.x, wh.y, 40, 25, 0, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // 缩圈边界
    if (data.zoneRadius) {
      ctx.strokeStyle = 'rgba(150,200,255,0.6)'
      ctx.lineWidth = 8
      ctx.beginPath()
      ctx.arc(data.zoneCenterX, data.zoneCenterY, data.zoneRadius, 0, Math.PI * 2)
      ctx.stroke()
    }

    // 实体
    if (data.enemies) data.enemies.forEach(e => { if (e.alive) this.entityRenderer.renderEntity(ctx, e) })
    if (data.player && data.player.alive) this.entityRenderer.renderEntity(ctx, data.player)

    // 粒子
    this.particles.render(ctx)

    ctx.restore()

    // HUD（屏幕空间）
    this.hud.render(ctx, camera, data)
  }
}
