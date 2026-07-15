// src/render/EntityRenderer.js
import { VISUALS } from '../config/visuals.js'

export class EntityRenderer {
  constructor() {
    // 不再使用 SpriteCache 画角色，改为实时绘制
    // 气球数量动态变化，预渲染精灵无法表达
  }

  prerenderEntity(color, balloonColor) {
    // 保留接口兼容，不再需要预渲染
  }

  renderEntity(ctx, entity) {
    const scale = entity.scale || 1
    const flip = entity.facingRight === false
    const w = (entity.width || 28) * scale
    const h = (entity.height || 36) * scale
    const cx = entity.x + (entity.width || 28) / 2
    const cy = entity.y + (entity.height || 36) / 2
    const bodyColor = entity.color || '#4DA6FF'
    const balloonColor = entity.balloonColor || entity.color || '#4DA6FF'
    const balloons = entity.balloons || 0
    const animName = entity.getAnimName ? entity.getAnimName() : 'idle'
    const animFrame = entity.animFrame || 0

    ctx.save()
    ctx.translate(cx, cy)

    // Squash-and-stretch（落地压扁 + 速度拉伸）
    let squashX = 1, squashY = 1
    if (entity.landSquashTimer > 0) {
      const t = entity.landSquashTimer / 0.12 // 0.12s 压扁动画
      squashX = 1 + 0.3 * t
      squashY = 1 - 0.3 * t
    } else {
      // 速度驱动拉伸（下落时拉伸，上升时压缩）
      const speedFactor = Math.abs(entity.vy) * 0.00025
      squashX = 1 + Math.min(speedFactor, 0.15)
      squashY = 1 - Math.min(speedFactor, 0.15)
    }

    const sx = (flip ? -1 : 1) * squashX * scale
    const sy = squashY * scale
    ctx.scale(sx, sy)

    // 冲击波
    if (entity.shockwaveTimer > 0) {
      const swProgress = 1 - entity.shockwaveTimer / 0.25
      const swRadius = swProgress * 40
      const swAlpha = (1 - swProgress) * 0.5
      ctx.globalAlpha = swAlpha
      ctx.strokeStyle = entity.balloonColor || '#4DA6FF'
      ctx.lineWidth = 3 * (1 - swProgress)
      ctx.beginPath()
      ctx.arc(0, 0, swRadius, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    // === 气球（先画，在角色上方） ===
    if (balloons > 0 && animName !== 'electrocute') {
      this._drawBalloons(ctx, balloons, balloonColor, animName, animFrame)
    }
    // 充气动画：气球逐渐出现
    if (animName === 'inflate') {
      const progress = 1 - (entity.inflateTimer || 0) / 1.5
      this._drawBalloons(ctx, 1, balloonColor, animName, animFrame, progress)
    }

    // === 气球线 ===
    if (balloons > 0 && animName !== 'electrocute') {
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'
      ctx.lineWidth = 1
      for (let i = 0; i < balloons; i++) {
        const bx = this._balloonX(i, balloons)
        const by = this._balloonY(i, balloons, animFrame)
        ctx.beginPath()
        ctx.moveTo(bx, by + 10) // 气球底部
        ctx.lineTo(0, -14)      // 头顶
        ctx.stroke()
      }
    }

    // === 身体 ===
    ctx.fillStyle = bodyColor
    ctx.strokeStyle = VISUALS.bodyOutline
    ctx.lineWidth = 1.5

    // 身体（圆角矩形）
    ctx.beginPath()
    ctx.roundRect(-10, -4, 20, 24, 6)
    ctx.fill()
    ctx.stroke()

    // 头（圆）
    ctx.beginPath()
    ctx.arc(0, -10, 8, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    // 眼睛 + 嘴巴（按状态变化）
    this._drawFace(ctx, bodyColor, animName, entity)

    // === 动画细节（手脚） ===

    if (animName === 'flap') {
      // 手臂上扬
      ctx.fillStyle = bodyColor
      ctx.fillRect(-15, -2, 6, 4)
      ctx.fillRect(9, -2, 6, 4)
    } else if (animName === 'walk') {
      // 腿部交替
      ctx.fillStyle = bodyColor
      const offset = animFrame % 2 === 0 ? 2 : -2
      ctx.fillRect(-6, 20, 4, 6)
      ctx.fillRect(2, 20, 4, 6 + offset)
    } else if (animName === 'electrocute') {
      // 电弧效果
      ctx.strokeStyle = '#FFFF00'
      ctx.lineWidth = 2
      for (let j = 0; j < 4; j++) {
        ctx.beginPath()
        ctx.moveTo(-12 + Math.random() * 24, -16 + Math.random() * 40)
        ctx.lineTo(-12 + Math.random() * 24, -16 + Math.random() * 40)
        ctx.stroke()
      }
    } else {
      // 默认：小手小脚
      ctx.fillStyle = bodyColor
      ctx.fillRect(-14, 2, 5, 4)
      ctx.fillRect(9, 2, 5, 4)
      ctx.fillRect(-6, 20, 4, 5)
      ctx.fillRect(2, 20, 4, 5)
    }

    ctx.restore()
  }

  // ─── 表情系统 ───────────────────────────────────────────

  _drawFace(ctx, bodyColor, animName, entity) {
    const state = entity.state
    const isInvincible = entity.invincibleTimer > 0 && Math.floor(entity.invincibleTimer * 15) % 2 === 0

    if (isInvincible) return // 无敌闪烁：省略五官

    if (animName === 'electrocute') {
      this._drawXEyes(ctx)
      this._drawMouth(ctx, 'o')
      return
    }

    if (state === 'inflating' || animName === 'inflate') {
      this._drawHappyEyes(ctx)
      this._drawMouth(ctx, 'o')
      return
    }

    if (state === 'grounded') {
      this._drawTiredEyes(ctx)
      this._drawMouth(ctx, 'yawn')
      return
    }

    if (animName === 'fall') {
      this._drawWideEyes(ctx)
      this._drawMouth(ctx, 'o')
      return
    }

    // 默认
    this._drawNormalEyes(ctx)
    this._drawMouth(ctx, animName === 'flap' ? 'open' : 'smile')
  }

  _drawNormalEyes(ctx) {
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(3, -11, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#000'
    ctx.beginPath()
    ctx.arc(4, -11, 1.5, 0, Math.PI * 2)
    ctx.fill()
  }

  _drawHappyEyes(ctx) {
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(4, -11, 2, Math.PI, 0)
    ctx.stroke()
  }

  _drawTiredEyes(ctx) {
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(3, -11, 2.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#000'
    ctx.fillRect(1.5, -12, 3, 1.5)
  }

  _drawWideEyes(ctx) {
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(3, -11, 3.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#000'
    ctx.beginPath()
    ctx.arc(4, -11, 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(5, -12, 0.7, 0, Math.PI * 2)
    ctx.fill()
  }

  _drawXEyes(ctx) {
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(1, -13); ctx.lineTo(5, -9)
    ctx.moveTo(5, -13); ctx.lineTo(1, -9)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(7, -13); ctx.lineTo(11, -9)
    ctx.moveTo(11, -13); ctx.lineTo(7, -9)
    ctx.stroke()
  }

  _drawMouth(ctx, type) {
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    if (type === 'smile') {
      ctx.arc(6, -6, 2.5, 0.2, Math.PI - 0.2)
    } else if (type === 'open') {
      ctx.arc(6, -6, 2, 0, Math.PI)
      ctx.fillStyle = '#000'
      ctx.fill()
    } else if (type === 'o') {
      ctx.arc(6, -6, 1.5, 0, Math.PI * 2)
      ctx.fillStyle = '#000'
      ctx.fill()
    } else if (type === 'yawn') {
      ctx.ellipse(6, -5, 2, 3, 0, 0, Math.PI)
    }
    ctx.stroke()
  }

  // 计算第 i 个气球的 X 偏移
  _balloonX(i, total) {
    if (total === 1) return 0
    if (total === 2) return i === 0 ? -7 : 7
    if (total === 3) return [-10, 0, 10][i]
    if (total === 4) return [-12, -4, 4, 12][i]
    // 5个
    return [-14, -7, 0, 7, 14][i]
  }

  // 计算第 i 个气球的 Y 偏移（带浮动动画）
  _balloonY(i, total, animFrame) {
    const baseY = -26
    const float = Math.sin((animFrame + i * 1.2) * 0.3) * 2
    if (total <= 2) return baseY + float
    // 多气球时中间的稍高
    const rowOffset = (total >= 4 && (i === 0 || i === total - 1)) ? 3 : 0
    return baseY + rowOffset + float
  }

  // 绘制气球簇（径向渐变 + 高光 + 阴影）
  _drawBalloons(ctx, count, color, animName, animFrame, progress = 1) {
    for (let i = 0; i < count; i++) {
      const bx = this._balloonX(i, count)
      const by = this._balloonY(i, count, animFrame)
      const r = 9 * progress

      ctx.save()
      ctx.globalAlpha = progress

      // 气球投影（微暗椭圆在底部）
      ctx.fillStyle = 'rgba(0,0,0,0.08)'
      ctx.beginPath()
      ctx.ellipse(bx, by + r + 2, r * 0.7, r * 0.2, 0, 0, Math.PI * 2)
      ctx.fill()

      // 气球主体 — 径向渐变（左上光源）
      const grad = ctx.createRadialGradient(
        bx - r * 0.3, by - r * 0.3, r * 0.1,
        bx, by, r
      )
      grad.addColorStop(0, this._lightenColor(color, 40))
      grad.addColorStop(0.5, color)
      grad.addColorStop(1, this._darkenColor(color, 40))
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(bx, by, r, 0, Math.PI * 2)
      ctx.fill()

      // 描边
      ctx.strokeStyle = 'rgba(0,0,0,0.12)'
      ctx.lineWidth = 1
      ctx.stroke()

      // 高光弧（顶部新月）
      ctx.fillStyle = 'rgba(255,255,255,0.55)'
      ctx.beginPath()
      ctx.ellipse(bx - r * 0.25, by - r * 0.3, r * 0.35, r * 0.2, -0.3, 0, Math.PI * 2)
      ctx.fill()

      // 镜面高光点
      ctx.fillStyle = 'rgba(255,255,255,0.8)'
      ctx.beginPath()
      ctx.arc(bx - r * 0.3, by - r * 0.35, r * 0.1, 0, Math.PI * 2)
      ctx.fill()

      // 气球底部小三角（扎口）
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.moveTo(bx - 2, by + r)
      ctx.lineTo(bx + 2, by + r)
      ctx.lineTo(bx, by + r + 3)
      ctx.fill()

      ctx.restore()
    }
  }

  // 颜色辅助：变亮
  _lightenColor(hex, amount) {
    const num = parseInt(hex.slice(1), 16)
    const r = Math.min(255, (num >> 16) + amount)
    const g = Math.min(255, ((num >> 8) & 0xff) + amount)
    const b = Math.min(255, (num & 0xff) + amount)
    return `rgb(${r},${g},${b})`
  }

  // 颜色辅助：变暗
  _darkenColor(hex, amount) {
    const num = parseInt(hex.slice(1), 16)
    const r = Math.max(0, (num >> 16) - amount)
    const g = Math.max(0, ((num >> 8) & 0xff) - amount)
    const b = Math.max(0, (num & 0xff) - amount)
    return `rgb(${r},${g},${b})`
  }

  renderPlatform(ctx, plat) {
    // 云岛平台 — 更大的云朵造型
    const cx = plat.x + plat.w / 2
    const cy = plat.y + plat.h / 2

    // 阴影
    ctx.fillStyle = 'rgba(100,120,150,0.15)'
    ctx.beginPath()
    ctx.ellipse(cx, cy + plat.h / 2 + 4, plat.w / 2 + 4, 6, 0, 0, Math.PI * 2)
    ctx.fill()

    // 云朵主体
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    // 用多个圆组合成云朵
    ctx.arc(cx, cy, plat.h * 0.8, 0, Math.PI * 2)
    ctx.arc(cx - plat.w * 0.3, cy + 2, plat.h * 0.6, 0, Math.PI * 2)
    ctx.arc(cx + plat.w * 0.3, cy + 2, plat.h * 0.6, 0, Math.PI * 2)
    ctx.arc(cx - plat.w * 0.15, cy - 3, plat.h * 0.5, 0, Math.PI * 2)
    ctx.arc(cx + plat.w * 0.15, cy - 3, plat.h * 0.5, 0, Math.PI * 2)
    ctx.fill()

    // 顶部高光
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.beginPath()
    ctx.ellipse(cx, cy - 4, plat.w * 0.25, plat.h * 0.3, 0, 0, Math.PI * 2)
    ctx.fill()

    // 草地层（底部绿边）
    ctx.fillStyle = '#7EC850'
    ctx.beginPath()
    ctx.ellipse(cx, plat.y + plat.h / 2, plat.w / 2 + 2, 5, 0, Math.PI, 0)
    ctx.fill()
    // 草地高光
    ctx.fillStyle = '#A4D65E'
    ctx.beginPath()
    ctx.ellipse(cx, plat.y + plat.h / 2 - 1, plat.w / 2, 3, 0, Math.PI, 0)
    ctx.fill()
  }
}
