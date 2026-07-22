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

    // 小白云（Kenney Cloud.png 精灵优先，回退到程序化圆）
    LIGHTNING_CLOUDS.forEach(lc => {
      if (this.cloudSprite) {
        const size = lc.radius * 2
        ctx.globalAlpha = 0.85
        ctx.drawImage(this.cloudSprite, lc.x - lc.radius, lc.y - lc.radius, size, size)
        ctx.globalAlpha = 1
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.8)'
        ctx.beginPath()
        ctx.arc(lc.x, lc.y, lc.radius, 0, Math.PI * 2)
        ctx.fill()
      }
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

    // 鲸鱼
    if (data.whale && data.whale.state === 'warning') {
      // 预警漩涡
      const wx = data.whale.x
      const wy = WORLD.waterY
      const wt = this.time
      const progress = data.whale.timer / 1.5
      const baseRadius = 25 + (1 - progress) * 15
      ctx.strokeStyle = `rgba(100,160,220,${0.3 + (1 - progress) * 0.3})`
      ctx.lineWidth = 2.5
      ctx.beginPath(); ctx.arc(wx, wy, baseRadius, 0, Math.PI * 2); ctx.stroke()
      const innerR = baseRadius * 0.6
      ctx.strokeStyle = `rgba(150,200,240,${0.2 + (1 - progress) * 0.2})`
      ctx.lineWidth = 1.5
      ctx.beginPath()
      for (let a = 0; a < Math.PI * 4; a += 0.2) {
        const spiralR = innerR * (1 - a / (Math.PI * 4))
        const sx = wx + Math.cos(a + wt * 3) * spiralR
        const sy = wy + Math.sin(a + wt * 3) * spiralR * 0.4
        if (a === 0) {
          ctx.moveTo(sx, sy)
        } else {
          ctx.lineTo(sx, sy)
        }
      }
      ctx.stroke()
      for (let i = 0; i < 6; i++) {
        const bx = wx + Math.sin(wt * 2 + i * 1.3) * (15 + i * 4)
        const by = wy - 5 - (i * 8 + wt * 20) % 40
        ctx.fillStyle = `rgba(180,220,255,${0.3 + Math.sin(wt * 3 + i) * 0.2})`
        ctx.beginPath(); ctx.arc(bx, by, 2 + Math.sin(wt * 4 + i) * 1, 0, Math.PI * 2); ctx.fill()
      }
    } else if (data.whale && data.whale.state !== 'hidden') {
      const wh = data.whale
      ctx.globalAlpha = 0.6
      ctx.fillStyle = '#3D7EA0'
      ctx.beginPath()
      ctx.ellipse(wh.x, wh.y, 38, 18, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(240,248,255,0.3)'
      ctx.beginPath()
      ctx.ellipse(wh.x, wh.y + 6, 24, 9, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
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
