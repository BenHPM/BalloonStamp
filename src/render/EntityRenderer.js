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
    if (flip) ctx.scale(-1, 1)
    ctx.scale(scale, scale)

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

    // 眼睛
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(3, -11, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#000'
    ctx.beginPath()
    ctx.arc(4, -11, 1.5, 0, Math.PI * 2)
    ctx.fill()

    // === 动画细节 ===
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
    } else if (animName === 'fall') {
      // 坠落：手臂上举求救
      ctx.fillStyle = bodyColor
      ctx.fillRect(-15, -8, 6, 4)
      ctx.fillRect(9, -8, 6, 4)
      // 惊恐表情
      ctx.fillStyle = '#000'
      ctx.beginPath()
      ctx.arc(3, -9, 2, 0, Math.PI * 2)
      ctx.fill()
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

  // 绘制气球簇
  _drawBalloons(ctx, count, color, animName, animFrame, progress = 1) {
    for (let i = 0; i < count; i++) {
      const bx = this._balloonX(i, count)
      const by = this._balloonY(i, count, animFrame)
      const r = 9 * progress // 气球半径

      ctx.save()
      ctx.globalAlpha = progress

      // 气球主体
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(bx, by, r, 0, Math.PI * 2)
      ctx.fill()

      // 描边
      ctx.strokeStyle = 'rgba(0,0,0,0.15)'
      ctx.lineWidth = 1
      ctx.stroke()

      // 高光
      ctx.fillStyle = VISUALS.balloonHighlight
      ctx.beginPath()
      ctx.arc(bx - r * 0.3, by - r * 0.3, r * 0.35, 0, Math.PI * 2)
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
  }
}
