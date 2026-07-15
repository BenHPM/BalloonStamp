// src/engine/Renderer.js
import { BackgroundRenderer } from '../render/BackgroundRenderer.js'
import { EntityRenderer } from '../render/EntityRenderer.js'
import { ParticleSystem } from '../render/ParticleSystem.js'
import { HUDRenderer } from '../render/HUDRenderer.js'
import { FloatingTextSystem } from '../render/FloatingTextSystem.js'
import { AirCurrentParticles } from '../render/AirCurrentRenderer.js'
import { WORLD } from '../config/world.js'
import { PLATFORMS, LIGHTNING_CLOUDS, AIR_CURRENTS } from '../config/entities.js'

export class Renderer {
  constructor() {
    this.bg = new BackgroundRenderer()
    this.entityRenderer = new EntityRenderer()
    this.particles = new ParticleSystem()
    this.hud = new HUDRenderer()
    this.floatingTexts = new FloatingTextSystem()
    this.airParticles = new AirCurrentParticles()
    this.time = 0
    this.shakeIntensity = 0
    this.shakeDecay = 8
  }

  update(dt) {
    this.time += dt
    this.bg.update(dt)
    this.particles.update(dt)
    this.floatingTexts.update(dt)
    // 气流粒子
    this.airParticles.update(dt)
    AIR_CURRENTS.forEach(ac => this.airParticles.emitInZone(ac, 2))
    // 震动衰减
    if (this.shakeIntensity > 0.1) {
      this.shakeIntensity *= Math.exp(-this.shakeDecay * dt)
    } else {
      this.shakeIntensity = 0
    }
  }

  // 触发屏幕震动（intensity: 像素偏移量，建议 3-12）
  shake(intensity) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity)
  }

  // 发射浮字
  emitText(x, y, key) {
    this.floatingTexts.emit(x, y, key)
  }

  render(ctx, camera, data) {
    const w = camera.viewWidth
    const h = camera.viewHeight

    // 屏幕震动偏移
    let shakeX = 0, shakeY = 0
    if (this.shakeIntensity > 0.1) {
      shakeX = (Math.random() - 0.5) * this.shakeIntensity * 2
      shakeY = (Math.random() - 0.5) * this.shakeIntensity * 2
    }

    // 背景（不受震动影响——震动只影响世界层）
    this.bg.render(ctx, camera)

    // 世界变换 + 震动
    ctx.save()
    ctx.translate(-camera.x + shakeX, -camera.y + shakeY)

    // 平台
    PLATFORMS.forEach(p => this.entityRenderer.renderPlatform(ctx, p))

    // 气流区（流动粒子 + 边框）
    this.airParticles.render(ctx, AIR_CURRENTS)

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
        this._renderWhaleWarning(ctx, wh)
      } else {
        ctx.fillStyle = '#4488AA'
        ctx.beginPath()
        ctx.ellipse(wh.x, wh.y, 40, 25, 0, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // 缩圈边界（虚线 + 低透明度）
    if (data.zoneRadius) {
      ctx.strokeStyle = 'rgba(150,200,255,0.35)'
      ctx.lineWidth = 4
      ctx.setLineDash([15, 10])
      ctx.beginPath()
      ctx.arc(data.zoneCenterX, data.zoneCenterY, data.zoneRadius, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
    }

    // 实体
    if (data.enemies) data.enemies.forEach(e => { if (e.alive) this.entityRenderer.renderEntity(ctx, e) })
    if (data.player && data.player.alive) this.entityRenderer.renderEntity(ctx, data.player)

    // 粒子
    this.particles.render(ctx)

    // 浮字（世界坐标）
    this.floatingTexts.render(ctx)

    ctx.restore()

    // HUD（屏幕空间，不受震动影响）
    this.hud.render(ctx, camera, data)
  }

  // 鲸鱼预警：漩涡 + 气泡动画
  _renderWhaleWarning(ctx, whale) {
    const x = whale.x
    const y = WORLD.waterY
    const t = this.time
    const progress = whale.timer / 1.5 // 1.5s 预警总时长

    // 漩涡圆环（扩大 + 淡出）
    const baseRadius = 25 + (1 - progress) * 15
    ctx.strokeStyle = `rgba(100,160,220,${0.3 + (1 - progress) * 0.3})`
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.arc(x, y, baseRadius, 0, Math.PI * 2)
    ctx.stroke()

    // 内圈漩涡
    const innerR = baseRadius * 0.6
    ctx.strokeStyle = `rgba(150,200,240,${0.2 + (1 - progress) * 0.2})`
    ctx.lineWidth = 1.5
    ctx.beginPath()
    for (let a = 0; a < Math.PI * 4; a += 0.2) {
      const spiralR = innerR * (1 - a / (Math.PI * 4))
      const sx = x + Math.cos(a + t * 3) * spiralR
      const sy = y + Math.sin(a + t * 3) * spiralR * 0.4
      if (a === 0) ctx.moveTo(sx, sy)
      else ctx.lineTo(sx, sy)
    }
    ctx.stroke()

    // 气泡粒子
    for (let i = 0; i < 6; i++) {
      const bx = x + Math.sin(t * 2 + i * 1.3) * (15 + i * 4)
      const by = y - 5 - (i * 8 + t * 20) % 40
      const ba = 0.3 + Math.sin(t * 3 + i) * 0.2
      ctx.fillStyle = `rgba(180,220,255,${ba})`
      ctx.beginPath()
      ctx.arc(bx, by, 2 + Math.sin(t * 4 + i) * 1, 0, Math.PI * 2)
      ctx.fill()
    }

    // 水面波纹
    ctx.strokeStyle = `rgba(100,180,220,${0.4 + (1 - progress) * 0.3})`
    ctx.lineWidth = 1.5
    ctx.beginPath()
    for (let dx = -30; dx <= 30; dx += 4) {
      const waveY = y + Math.sin(dx * 0.3 + t * 6) * 3
      if (dx === -30) ctx.moveTo(x + dx, waveY)
      else ctx.lineTo(x + dx, waveY)
    }
    ctx.stroke()
  }
}
