// src/render/EntityRenderer.js
import { VISUALS } from '../config/visuals.js'

export class EntityRenderer {
  constructor() {
    this._balloonTime = 0
    this._grassCache = new Map()
    this._buildGrassCache()
  }

  update(dt) {
    this._balloonTime += dt
  }

  _buildGrassCache() {
    for (const w of [100, 120, 140, 160, 200]) {
      const h = 16
      const off = document.createElement('canvas')
      off.width = w + 8
      off.height = h + 4
      const c = off.getContext('2d')
      const cx = (w + 8) / 2

      // 泥土层
      c.fillStyle = '#C4956A'
      c.beginPath()
      c.ellipse(cx, h / 2 + 2, w / 2 + 2, 5, 0, Math.PI, 0)
      c.fill()
      // 深土
      c.fillStyle = '#A07850'
      c.beginPath()
      c.ellipse(cx, h / 2 + 3, w / 2, 3, 0, Math.PI, 0)
      c.fill()

      // 伪随机草叶
      const seed = w * 137
      for (let i = 0; i < Math.floor(w / 5); i++) {
        const gx = 4 + (i * 5 + ((seed * (i + 1)) % 3)) % (w - 4)
        const gh = 4 + ((seed + i * 7) % 6)
        const lean = ((seed + i) % 3 - 1) * 0.3
        c.strokeStyle = ['#7EC850', '#8FD060', '#6AB840', '#A4D65E'][(seed + i) % 4]
        c.lineWidth = 1.5
        c.lineCap = 'round'
        c.beginPath()
        c.moveTo(gx, h / 2)
        c.quadraticCurveTo(gx + lean * gh, h / 2 - gh * 0.6, gx + lean * gh * 1.5, h / 2 - gh)
        c.stroke()
      }
      // 亮色草尖
      for (let i = 0; i < Math.floor(w / 10); i++) {
        const gx = 4 + (i * 10 + ((seed * 3 + i * 13) % 5)) % (w - 4)
        c.strokeStyle = 'rgba(180,230,100,0.6)'
        c.lineWidth = 1
        c.beginPath()
        c.moveTo(gx, h / 2)
        c.lineTo(gx + 1, h / 2 - 5)
        c.stroke()
      }
      this._grassCache.set(w, off)
    }
  }

  // ─── 角色渲染 ────────────────────────────────────────

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

    // 地面阴影（离地越高越透明）
    if (!entity.onGround) {
      const shadowOff = (entity.y + entity.height) - cy + 2
      const shadowAlpha = Math.max(0, 0.2 - shadowOff * 0.0003)
      if (shadowAlpha > 0) {
        ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`
        ctx.beginPath()
        ctx.ellipse(0, shadowOff, w * 0.4, 2.5, 0, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Squash-and-stretch
    let squashX = 1, squashY = 1
    if (entity.landSquashTimer > 0) {
      const t = entity.landSquashTimer / 0.12
      squashX = 1 + 0.25 * t
      squashY = 1 - 0.25 * t
    } else if (Math.abs(entity.vy) > 60) {
      const f = Math.min(Math.abs(entity.vy) * 0.00018, 0.1)
      squashX = entity.vy > 0 ? 1 - f * 0.5 : 1 + f * 0.3
      squashY = entity.vy > 0 ? 1 + f : 1 - f * 0.3
    }

    const sx = (flip ? -1 : 1) * squashX * scale
    const sy = squashY * scale
    ctx.scale(sx, sy)

    // 冲击波（多层发光）
    if (entity.shockwaveTimer > 0) {
      const p = 1 - entity.shockwaveTimer / 0.25
      for (let g = 2; g >= 0; g--) {
        ctx.globalAlpha = (1 - p) * 0.4 * (1 - g * 0.25)
        ctx.strokeStyle = balloonColor
        ctx.lineWidth = (3 + g * 2) * (1 - p)
        ctx.beginPath()
        ctx.arc(0, 0, p * 35 + g * 4, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }

    // 气球线（贝塞尔飘动，在身体后面）
    if (balloons > 0 && animName !== 'electrocute') {
      ctx.strokeStyle = 'rgba(0,0,0,0.22)'
      ctx.lineWidth = 1
      for (let i = 0; i < balloons; i++) {
        const bx = this._balloonX(i, balloons)
        const by = this._balloonY(i, balloons, animFrame)
        const sway = Math.sin(this._balloonTime * 3 + i * 1.5) * 3
        ctx.beginPath()
        ctx.moveTo(0, -14)
        ctx.quadraticCurveTo(sway * 0.5, by + 8, bx, by + 10)
        ctx.stroke()
      }
    }

    // 身体（渐变 + 阴影）
    ctx.fillStyle = 'rgba(0,0,0,0.06)'
    ctx.beginPath()
    ctx.roundRect(-10.5, -3.5, 20, 24, 6)
    ctx.fill()

    const bodyGrad = ctx.createLinearGradient(0, -4, 0, 20)
    bodyGrad.addColorStop(0, this._lightenColor(bodyColor, 18))
    bodyGrad.addColorStop(0.6, bodyColor)
    bodyGrad.addColorStop(1, this._darkenColor(bodyColor, 28))
    ctx.fillStyle = bodyGrad
    ctx.beginPath()
    ctx.roundRect(-10, -4, 20, 24, 6)
    ctx.fill()
    ctx.strokeStyle = VISUALS.bodyOutline
    ctx.lineWidth = 1.5
    ctx.stroke()

    // 头部（径向渐变 + 阴影）
    ctx.fillStyle = 'rgba(0,0,0,0.05)'
    ctx.beginPath()
    ctx.arc(1, -9, 8.5, 0, Math.PI * 2)
    ctx.fill()

    const headGrad = ctx.createRadialGradient(-2, -12, 1, 0, -9, 8)
    headGrad.addColorStop(0, this._lightenColor(bodyColor, 22))
    headGrad.addColorStop(1, bodyColor)
    ctx.fillStyle = headGrad
    ctx.beginPath()
    ctx.arc(0, -9, 8, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = VISUALS.bodyOutline
    ctx.lineWidth = 1.5
    ctx.stroke()

    // 四肢
    this._drawLimbs(ctx, bodyColor, animName, animFrame, flip)

    // 脸部
    this._drawFace(ctx, bodyColor, animName, entity)

    // 气球（最上层）
    if (balloons > 0 && animName !== 'electrocute') {
      this._drawBalloons(ctx, balloons, balloonColor, animFrame)
    }
    if (animName === 'inflate') {
      const progress = 1 - (entity.inflateTimer || 0) / 1.5
      this._drawBalloons(ctx, 1, balloonColor, animFrame, progress)
    }

    ctx.restore()
  }

  _drawLimbs(ctx, bodyColor, animName, frame, flip) {
    ctx.fillStyle = bodyColor

    if (animName === 'flap') {
      // 拍打：手臂旋转上挥
      const armAngle = Math.sin(frame * 0.9) * 0.6
      for (const side of [-1, 1]) {
        ctx.save()
        ctx.translate(side * 10, -2)
        ctx.rotate(side * (0.4 + armAngle) * (flip ? -1 : 1))
        ctx.fillRect(-2, 0, 4, 13)
        // 手掌小圆
        ctx.fillStyle = this._darkenColor(bodyColor, 20)
        ctx.beginPath()
        ctx.arc(0, 13, 2.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = bodyColor
        ctx.restore()
      }
    } else if (animName === 'walk') {
      const o = frame % 2 === 0 ? 3 : -3
      ctx.fillRect(-14, 2, 5, 4)
      ctx.fillRect(9, 2, 5, 4)
      ctx.fillRect(-6 + o, 20, 4, 6)
      ctx.fillRect(2 - o, 20, 4, 6)
    } else if (animName === 'electrocute') {
      const j = () => (Math.random() - 0.5) * 4
      ctx.fillRect(-14 + j(), 2 + j(), 5, 4)
      ctx.fillRect(9 + j(), 2 + j(), 5, 4)
      ctx.fillRect(-6 + j(), 20 + j(), 4, 5)
      ctx.fillRect(2 + j(), 20 + j(), 4, 5)
    } else {
      ctx.fillRect(-14, 2, 5, 4)
      ctx.fillRect(9, 2, 5, 4)
      ctx.fillRect(-6, 20, 4, 5)
      ctx.fillRect(2, 20, 4, 5)
    }

    // 小圆鞋（非走路时）
    if (animName !== 'walk') {
      ctx.fillStyle = this._darkenColor(bodyColor, 45)
      ctx.beginPath()
      ctx.ellipse(-4, 25.5, 3.5, 1.5, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(4, 25.5, 3.5, 1.5, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // ─── 表情 ────────────────────────────────────────────

  _drawFace(ctx, bodyColor, animName, entity) {
    if (entity.invincibleTimer > 0 && Math.floor(entity.invincibleTimer * 15) % 2 === 0) return
    const state = entity.state

    if (animName === 'electrocute') { this._drawXEyes(ctx); this._drawMouth(ctx, 'o'); return }
    if (state === 'inflating' || animName === 'inflate') { this._drawHappyEyes(ctx); this._drawMouth(ctx, 'o'); return }
    if (state === 'grounded') { this._drawTiredEyes(ctx); this._drawMouth(ctx, 'yawn'); return }
    if (animName === 'fall') { this._drawWideEyes(ctx); this._drawMouth(ctx, 'o'); return }

    this._drawNormalEyes(ctx)
    this._drawMouth(ctx, animName === 'flap' ? 'open' : 'smile')
  }

  _drawNormalEyes(ctx) {
    ctx.fillStyle = '#fff'
    ctx.beginPath(); ctx.arc(3, -11, 3, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#000'
    ctx.beginPath(); ctx.arc(4.5, -11, 1.5, 0, Math.PI * 2); ctx.fill()
    // 高光
    ctx.fillStyle = '#fff'
    ctx.beginPath(); ctx.arc(5, -11.8, 0.6, 0, Math.PI * 2); ctx.fill()
  }

  _drawHappyEyes(ctx) {
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.arc(3.5, -11, 2.5, Math.PI, 0); ctx.stroke()
  }

  _drawTiredEyes(ctx) {
    ctx.fillStyle = '#fff'
    ctx.beginPath(); ctx.arc(3, -11, 2.5, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#000'
    ctx.fillRect(1, -12, 4, 1.8)
  }

  _drawWideEyes(ctx) {
    ctx.fillStyle = '#fff'
    ctx.beginPath(); ctx.arc(3, -11, 3.5, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#000'
    ctx.beginPath(); ctx.arc(4.5, -11, 2, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.beginPath(); ctx.arc(5.5, -12, 0.7, 0, Math.PI * 2); ctx.fill()
  }

  _drawXEyes(ctx) {
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(1, -13); ctx.lineTo(5, -9); ctx.moveTo(5, -13); ctx.lineTo(1, -9); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(7, -13); ctx.lineTo(11, -9); ctx.moveTo(11, -13); ctx.lineTo(7, -9); ctx.stroke()
  }

  _drawMouth(ctx, type) {
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1.2
    ctx.beginPath()
    if (type === 'smile') {
      ctx.arc(6, -6, 2.5, 0.2, Math.PI - 0.2)
    } else if (type === 'open') {
      ctx.arc(6, -6, 2, 0, Math.PI)
      ctx.fillStyle = '#300'; ctx.fill()
    } else if (type === 'o') {
      ctx.arc(6, -6, 1.5, 0, Math.PI * 2)
      ctx.fillStyle = '#300'; ctx.fill()
    } else if (type === 'yawn') {
      ctx.ellipse(6, -5, 2, 3, 0, 0, Math.PI)
    }
    ctx.stroke()
  }

  // ─── 气球布局 ────────────────────────────────────────

  _balloonX(i, total) {
    if (total === 1) return 0
    if (total === 2) return i === 0 ? -7 : 7
    if (total === 3) return [-10, 0, 10][i]
    if (total === 4) return [-12, -4, 4, 12][i]
    return [-14, -7, 0, 7, 14][i]
  }

  _balloonY(i, total, animFrame) {
    const base = -26
    const float = Math.sin((animFrame + i * 1.2) * 0.3) * 2
    const row = (total >= 4 && (i === 0 || i === total - 1)) ? 3 : 0
    return base + row + float
  }

  _drawBalloons(ctx, count, color, animFrame, progress = 1) {
    for (let i = 0; i < count; i++) {
      const bx = this._balloonX(i, count)
      const by = this._balloonY(i, count, animFrame)
      const r = 9 * progress
      if (r < 1) continue

      ctx.save()
      ctx.globalAlpha = progress

      // 投影
      ctx.fillStyle = 'rgba(0,0,0,0.07)'
      ctx.beginPath()
      ctx.ellipse(bx, by + r + 2, r * 0.7, r * 0.18, 0, 0, Math.PI * 2)
      ctx.fill()

      // 主体 — 径向渐变
      const grad = ctx.createRadialGradient(bx - r * 0.3, by - r * 0.3, r * 0.05, bx, by, r)
      grad.addColorStop(0, this._lightenColor(color, 45))
      grad.addColorStop(0.4, color)
      grad.addColorStop(1, this._darkenColor(color, 40))
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(bx, by, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.1)'
      ctx.lineWidth = 0.8
      ctx.stroke()

      // 新月高光
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.beginPath()
      ctx.ellipse(bx - r * 0.25, by - r * 0.3, r * 0.32, r * 0.18, -0.3, 0, Math.PI * 2)
      ctx.fill()

      // 镜面点
      ctx.fillStyle = 'rgba(255,255,255,0.75)'
      ctx.beginPath()
      ctx.arc(bx - r * 0.3, by - r * 0.35, r * 0.09, 0, Math.PI * 2)
      ctx.fill()

      // 扎口
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.moveTo(bx - 2, by + r)
      ctx.lineTo(bx + 2, by + r)
      ctx.lineTo(bx, by + r + 3)
      ctx.fill()

      ctx.restore()
    }
  }

  // ─── 颜色工具 ────────────────────────────────────────

  _lightenColor(hex, amount) {
    const n = parseInt(hex.slice(1), 16)
    return `rgb(${Math.min(255, (n >> 16) + amount)},${Math.min(255, ((n >> 8) & 0xff) + amount)},${Math.min(255, (n & 0xff) + amount)})`
  }

  _darkenColor(hex, amount) {
    const n = parseInt(hex.slice(1), 16)
    return `rgb(${Math.max(0, (n >> 16) - amount)},${Math.max(0, ((n >> 8) & 0xff) - amount)},${Math.max(0, (n & 0xff) - amount)})`
  }

  // ─── 平台渲染 ────────────────────────────────────────

  renderPlatform(ctx, plat) {
    const cx = plat.x + plat.w / 2
    const cy = plat.y + plat.h / 2

    // 平台投影
    ctx.fillStyle = 'rgba(80,100,130,0.16)'
    ctx.beginPath()
    ctx.ellipse(cx, cy + plat.h / 2 + 5, plat.w / 2 + 6, 7, 0, 0, Math.PI * 2)
    ctx.fill()

    // 云朵主体
    ctx.fillStyle = '#FAFCFF'
    ctx.beginPath()
    ctx.arc(cx, cy, plat.h * 0.75, 0, Math.PI * 2)
    ctx.arc(cx - plat.w * 0.28, cy + 2, plat.h * 0.55, 0, Math.PI * 2)
    ctx.arc(cx + plat.w * 0.28, cy + 2, plat.h * 0.55, 0, Math.PI * 2)
    ctx.arc(cx - plat.w * 0.14, cy - 3, plat.h * 0.45, 0, Math.PI * 2)
    ctx.arc(cx + plat.w * 0.14, cy - 3, plat.h * 0.45, 0, Math.PI * 2)
    ctx.fill()

    // 顶部柔光
    const tg = ctx.createRadialGradient(cx, cy - 4, 1, cx, cy - 2, plat.w * 0.3)
    tg.addColorStop(0, 'rgba(255,255,255,0.45)')
    tg.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = tg
    ctx.beginPath()
    ctx.ellipse(cx, cy - 4, plat.w * 0.3, plat.h * 0.35, 0, 0, Math.PI * 2)
    ctx.fill()

    // 草叶贴图（缓存）
    const grass = this._grassCache.get(plat.w) || this._grassCache.get(140)
    if (grass) {
      ctx.drawImage(grass, cx - grass.width / 2, cy - 1)
    }
  }
}
