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
    this.entityRenderer.update(dt)
    this.particles.update(dt)
    this.floatingTexts.update(dt)
    this.airParticles.update(dt)
    AIR_CURRENTS.forEach(ac => this.airParticles.emitInZone(ac, 2))
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

    // 闪电（锯齿折线 + 多层发光 + 头部光球）
    if (data.lightnings) {
      data.lightnings.forEach(l => {
        const bx = l.x
        const by = l.y
        const endX = bx + (l.cloudX - bx) * 0.3
        const endY = by + l.vy * 0.06

        // 外层发光（宽+透明）
        ctx.globalAlpha = 0.15
        ctx.strokeStyle = '#8888FF'
        ctx.lineWidth = 8
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.beginPath()
        ctx.moveTo(bx, by)
        const segs = 5
        for (let s = 1; s <= segs; s++) {
          const t = s / segs
          const sx = bx + (endX - bx) * t + (Math.random() - 0.5) * 14
          const sy = by + (endY - by) * t + (Math.random() - 0.5) * 10
          ctx.lineTo(sx, sy)
        }
        ctx.stroke()

        // 中层
        ctx.globalAlpha = 0.5
        ctx.strokeStyle = '#FFFF88'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(bx, by)
        for (let s = 1; s <= segs; s++) {
          const t = s / segs
          const sx = bx + (endX - bx) * t + (Math.random() - 0.5) * 8
          const sy = by + (endY - by) * t + (Math.random() - 0.5) * 6
          ctx.lineTo(sx, sy)
        }
        ctx.stroke()

        // 核心白线
        ctx.globalAlpha = 0.9
        ctx.strokeStyle = '#FFFFFF'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(bx, by)
        for (let s = 1; s <= segs; s++) {
          const t = s / segs
          const sx = bx + (endX - bx) * t + (Math.random() - 0.5) * 3
          const sy = by + (endY - by) * t + (Math.random() - 0.5) * 2
          ctx.lineTo(sx, sy)
        }
        ctx.stroke()

        // 头部光球
        ctx.globalAlpha = 0.7
        ctx.fillStyle = '#FFFFAA'
        ctx.beginPath()
        ctx.arc(bx, by, 5, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
      })
    }

    // 鲸鱼（分段身体 + 腹部白纹 + 尾鳍 + 水花）
    if (data.whale && data.whale.state !== 'hidden') {
      const wh = data.whale
      const t = this.time

      if (wh.state === 'warning') {
        this._renderWhaleWarning(ctx, wh)
      } else if (wh.state === 'jumping' || wh.state === 'charging') {
        // 弹射轨迹拖尾气泡
        const trailCount = 5
        for (let i = 0; i < trailCount; i++) {
          const tp = i / trailCount
          const tx = (wh.x || 0) - (wh.launchVx || 0) * tp
          const ty = WORLD.waterY - (wh.launchVy || -400) * tp + 600 * tp * tp
          const ta = (1 - tp) * 0.4
          ctx.fillStyle = `rgba(180,220,255,${ta})`
          ctx.beginPath()
          ctx.arc(tx, ty, 3 + tp * 3, 0, Math.PI * 2)
          ctx.fill()
        }
        // 鲸鱼本体
        this._renderWhaleBody(ctx, wh, t)
        // 出水水花
        if (wh.state === 'jumping') {
          for (let i = 0; i < 6; i++) {
            const angle = Math.PI + (i / 5) * Math.PI
            const dist = 10 + Math.random() * 15
            const sx = wh.x + Math.cos(angle) * dist
            const sy = WORLD.waterY + Math.sin(angle) * dist * 0.4
            ctx.fillStyle = 'rgba(200,230,255,0.5)'
            ctx.beginPath()
            ctx.arc(sx, sy, 1.5 + Math.random() * 2, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      } else {
        // returning / 入水
        this._renderWhaleBody(ctx, wh, t)
        // 入水溅水
        if (wh.state === 'returning') {
          ctx.fillStyle = 'rgba(200,230,255,0.4)'
          ctx.beginPath()
          ctx.ellipse(wh.x, WORLD.waterY, 25, 6, 0, 0, Math.PI * 2)
          ctx.fill()
        }
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

  // 鲸鱼分段身体渲染
  _renderWhaleBody(ctx, whale, t) {
    const x = whale.x
    const y = whale.y
    const facingRight = whale.targetX > whale.x

    ctx.save()
    ctx.translate(x, y)
    if (!facingRight) ctx.scale(-1, 1)

    // 身体主体 — 深蓝渐变
    const bodyGrad = ctx.createLinearGradient(0, -20, 0, 20)
    bodyGrad.addColorStop(0, '#5BA0C8')
    bodyGrad.addColorStop(0.5, '#3D7EA0')
    bodyGrad.addColorStop(1, '#2A5F7A')
    ctx.fillStyle = bodyGrad
    ctx.beginPath()
    ctx.ellipse(0, 0, 38, 18, 0, 0, Math.PI * 2)
    ctx.fill()

    // 腹部白纹
    ctx.fillStyle = 'rgba(240,248,255,0.45)'
    ctx.beginPath()
    ctx.ellipse(0, 6, 24, 9, 0, 0, Math.PI * 2)
    ctx.fill()

    // 尾鳍（摆动）
    const tailWag = Math.sin(t * 8) * 0.3
    ctx.fillStyle = '#2A5F7A'
    ctx.beginPath()
    ctx.moveTo(-35, 0)
    ctx.quadraticCurveTo(-48, -12 + tailWag * 10, -55, -8 + tailWag * 12)
    ctx.quadraticCurveTo(-50, 0, -55, 8 - tailWag * 12)
    ctx.quadraticCurveTo(-48, 12 - tailWag * 10, -35, 0)
    ctx.fill()

    // 背鳍
    ctx.fillStyle = '#3D7EA0'
    ctx.beginPath()
    ctx.moveTo(5, -16)
    ctx.quadraticCurveTo(10, -26, 20, -16)
    ctx.fill()

    // 胸鳍
    const finFlap = Math.sin(t * 4) * 0.2
    ctx.fillStyle = 'rgba(50,100,140,0.7)'
    ctx.beginPath()
    ctx.ellipse(15, 8, 14, 5, 0.3 + finFlap, 0, Math.PI * 2)
    ctx.fill()

    // 眼睛
    ctx.fillStyle = '#fff'
    ctx.beginPath(); ctx.arc(22, -5, 4, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#111'
    ctx.beginPath(); ctx.arc(23.5, -5, 2, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.beginPath(); ctx.arc(24, -5.8, 0.8, 0, Math.PI * 2); ctx.fill()

    // 嘴巴（微笑弧线）
    ctx.strokeStyle = 'rgba(20,50,70,0.5)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(28, -2, 3, 0.3, Math.PI - 0.3)
    ctx.stroke()

    ctx.restore()
  }
}
