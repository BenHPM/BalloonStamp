// 气球视觉实体 — 绘制在角色头顶

export class Balloon {
  constructor(offsetX, color) {
    this.offsetX = offsetX
    this.color = color
    this.radius = 5
    this.inflateProgress = 1 // 0~1 充气动画
  }

  update() {
    if (this.inflateProgress < 1) {
      this.inflateProgress = Math.min(1, this.inflateProgress + 0.033) // ~30帧
    }
  }

  draw(ctx, entityX, entityY) {
    const scale = this.inflateProgress
    const r = this.radius * scale
    if (r < 1) return

    const x = entityX + this.offsetX
    const y = entityY - r - 2

    // 气球线
    ctx.strokeStyle = '#888'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x, entityY - 2)
    ctx.lineTo(x, y + r)
    ctx.stroke()

    // 气球体
    ctx.fillStyle = this.color
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()

    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.beginPath()
    ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.3, 0, Math.PI * 2)
    ctx.fill()
  }
}
