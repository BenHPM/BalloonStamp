// src/engine/Renderer.js
import { BackgroundRenderer } from '../render/BackgroundRenderer.js'
import { EntityRenderer } from '../render/EntityRenderer.js'
import { ParticleSystem } from '../render/ParticleSystem.js'
import { HUDRenderer } from '../render/HUDRenderer.js'
import { FloatingTextSystem } from '../render/FloatingTextSystem.js'
import { AirCurrentParticles } from '../render/AirCurrentRenderer.js'
import { WORLD } from '../config/world.js'
import { AIR_CURRENTS, LIGHTNING_CLOUDS, PLATFORMS } from '../config/entities.js'
import { ASSETS } from './AssetLoader.js'

export class Renderer {
  constructor(assetLoader) {
    this.bg = new BackgroundRenderer(assetLoader)
    this.entityRenderer = new EntityRenderer()
    this.particles = new ParticleSystem()
    this.hud = new HUDRenderer()
    this.floatingTexts = new FloatingTextSystem()
    this.airParticles = new AirCurrentParticles()
    this.assetLoader = assetLoader
    this.animalSprites = {}       // { panda: Image, sloth: Image, ... }
    this.cloudSprite = null
    this.shakeIntensity = 0
    this.shakeDecay = 8
    this.time = 0
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

  /** 预加载所有外部精灵资源 */
  async loadAssets() {
    await this.bg.loadSky()
    // 加载动物精灵图（玩家 + 4种AI各一个）
    const animalKeys = ['animalPanda', 'animalSloth', 'animalChick', 'animalGorilla', 'animalRhino']
    const results = await Promise.allSettled(
      animalKeys.map(k => this.assetLoader.load(ASSETS[k]))
    )
    const spriteMap = {}
    animalKeys.forEach((k, i) => {
      if (results[i].status === 'fulfilled') spriteMap[k.replace('animal', '').toLowerCase()] = results[i].value
    })
    this.animalSprites = spriteMap
    this.entityRenderer.setAnimalSprites(spriteMap)
    // 闪电云精灵
    try {
      this.cloudSprite = await this.assetLoader.load(ASSETS.cloudSprite)
    } catch { this.cloudSprite = null }
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

    // 小白云（程序化蓬松云，非 Kenney 粒子图）
    LIGHTNING_CLOUDS.forEach(lc => {
      const sz = lc.radius * 1.6
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      ctx.beginPath()
      ctx.arc(lc.x, lc.y, sz * 0.5, 0, Math.PI * 2)
      ctx.arc(lc.x - sz * 0.35, lc.y + sz * 0.1, sz * 0.38, 0, Math.PI * 2)
      ctx.arc(lc.x + sz * 0.35, lc.y + sz * 0.1, sz * 0.38, 0, Math.PI * 2)
      ctx.arc(lc.x - sz * 0.15, lc.y - sz * 0.2, sz * 0.32, 0, Math.PI * 2)
      ctx.arc(lc.x + sz * 0.15, lc.y - sz * 0.2, sz * 0.32, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(200,210,230,0.4)'
      ctx.lineWidth = 1
      ctx.stroke()
    })

    // 闪电（Kenney light_01 光球 + spark_01 火花）
    if (data.lightnings) {
      const lightImg = this.assetLoader.get(ASSETS.particleLight01)
      const sparkImg = this.assetLoader.get(ASSETS.particleSpark01)
      data.lightnings.forEach(l => {
        // 外层光晕
        if (lightImg) {
          const size = 28
          ctx.globalAlpha = 0.6
          ctx.drawImage(lightImg, l.x - size / 2, l.y - size / 2, size, size)
          ctx.globalAlpha = 1
        }
        // 核心亮球
        if (sparkImg) {
          const size = 12
          ctx.globalAlpha = 0.9
          ctx.drawImage(sparkImg, l.x - size / 2, l.y - size / 2, size, size)
          ctx.globalAlpha = 1
        }
        // 尾部锯齿线（保留程序化）
        const endX = l.x + (l.cloudX - l.x) * 0.3
        const endY = l.y + l.vy * 0.06
        ctx.globalAlpha = 0.7
        ctx.strokeStyle = '#FFFFAA'
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(l.x, l.y)
        const segs = 4
        for (let s = 1; s <= segs; s++) {
          const t = s / segs
          ctx.lineTo(
            l.x + (endX - l.x) * t + (Math.random() - 0.5) * 6,
            l.y + (endY - l.y) * t + (Math.random() - 0.5) * 4
          )
        }
        ctx.stroke()
        ctx.globalAlpha = 1
      })
    }

    // 鲨鱼（出水警告 → 攻击）
    if (data.whale && data.whale.state === 'warning') {
      const sx = data.whale.x
      const sy = data.whale.y
      const st = this.time
      const progress = data.whale.timer / 1.5
      const baseRadius = 25 + (1 - progress) * 15
      // 漩涡
      ctx.strokeStyle = `rgba(100,160,220,${0.3 + (1 - progress) * 0.3})`
      ctx.lineWidth = 2.5
      ctx.beginPath(); ctx.arc(sx, sy, baseRadius, 0, Math.PI * 2); ctx.stroke()
      ctx.strokeStyle = `rgba(150,200,240,${0.2 + (1 - progress) * 0.2})`
      ctx.lineWidth = 1.5
      ctx.beginPath()
      for (let a = 0; a < Math.PI * 4; a += 0.2) {
        const spiralR = baseRadius * 0.6 * (1 - a / (Math.PI * 4))
        const px = sx + Math.cos(a + st * 3) * spiralR
        const py = sy + Math.sin(a + st * 3) * spiralR * 0.4
        if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
      }
      ctx.stroke()
    } else if (data.shark && data.shark.state !== 'hidden') {
      const sh = data.shark
      // 鲨鱼身体（灰蓝 + 白色腹部）
      ctx.save()
      ctx.translate(sh.x, sh.y)
      const flip = sh.vx < 0 ? 1 : -1
      ctx.scale(flip, 1)
      // 身体
      ctx.fillStyle = '#5B7B8A'
      ctx.beginPath()
      ctx.ellipse(0, 0, 38, 16, 0, 0, Math.PI * 2)
      ctx.fill()
      // 腹部
      ctx.fillStyle = 'rgba(240,248,255,0.6)'
      ctx.beginPath()
      ctx.ellipse(0, 4, 30, 9, 0, 0, Math.PI * 2)
      ctx.fill()
      // 背鳍
      ctx.fillStyle = '#4A6875'
      ctx.beginPath()
      ctx.moveTo(-5, -14)
      ctx.lineTo(-10, -26)
      ctx.lineTo(5, -14)
      ctx.fill()
      // 尾鳍
      ctx.beginPath()
      ctx.moveTo(-32, -2)
      ctx.lineTo(-44, -12)
      ctx.lineTo(-44, 8)
      ctx.fill()
      // 眼睛
      ctx.fillStyle = '#fff'
      ctx.beginPath(); ctx.arc(18, -4, 4, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#000'
      ctx.beginPath(); ctx.arc(19, -4, 2, 0, Math.PI * 2); ctx.fill()
      // 鳃裂
      ctx.strokeStyle = '#3D5A66'
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(10, -10); ctx.lineTo(8, -6); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(10, -6); ctx.lineTo(8, -2); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(10, -2); ctx.lineTo(8, 2); ctx.stroke()
      ctx.restore()
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

  // 鲸鱼分段身体渲染
  _renderWhaleBody(ctx, whale, t) {
    // 已由内联渲染替代，保留为空方法供外部可能调用
  }
}
