// src/render/AirCurrentRenderer.js

// 每个气流区的流动粒子
export class AirCurrentParticles {
  constructor() {
    this.particles = [] // { x, y, vx, vy, life, maxLife, size }
    this.maxPerZone = 30
  }

  // 在气流区内部生成粒子
  emitInZone(ac, count = 2) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxPerZone * 8) return
      this.particles.push({
        x: ac.x + Math.random() * ac.w,
        y: ac.y + Math.random() * ac.h,
        vx: ac.dirX * ac.strength * (0.8 + Math.random() * 0.4),
        vy: ac.dirY * ac.strength * (0.8 + Math.random() * 0.4),
        life: 0.4 + Math.random() * 0.4,
        maxLife: 0.8,
        size: 1.5 + Math.random() * 2,
      })
    }
  }

  update(dt) {
    this.particles = this.particles.filter(p => {
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.life -= dt
      return p.life > 0
    })
  }

  render(ctx, airCurrents) {
    ctx.save()
    airCurrents.forEach(ac => {
      // 气流区边框（半透明 + 方向箭头线）
      ctx.strokeStyle = 'rgba(180,210,255,0.2)'
      ctx.lineWidth = 1.5
      ctx.setLineDash([4, 8])
      ctx.strokeRect(ac.x, ac.y, ac.w, ac.h)
      ctx.setLineDash([])

      // 方向箭头
      const cx = ac.x + ac.w / 2
      const cy = ac.y + ac.h / 2
      const arrowLen = 20
      const ax = ac.dirX * arrowLen
      const ay = ac.dirY * arrowLen
      ctx.strokeStyle = 'rgba(180,210,255,0.35)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(cx - ax, cy - ay)
      ctx.lineTo(cx + ax, cy + ay)
      ctx.stroke()
      // 箭头头部
      const headLen = 6
      const angle = Math.atan2(ay, ax)
      ctx.beginPath()
      ctx.moveTo(cx + ax, cy + ay)
      ctx.lineTo(cx + ax - headLen * Math.cos(angle - 0.4), cy + ay - headLen * Math.sin(angle - 0.4))
      ctx.moveTo(cx + ax, cy + ay)
      ctx.lineTo(cx + ax - headLen * Math.cos(angle + 0.4), cy + ay - headLen * Math.sin(angle + 0.4))
      ctx.stroke()
    })

    // 流动粒子
    this.particles.forEach(p => {
      const alpha = Math.min(1, p.life / 0.3) * 0.6
      ctx.globalAlpha = alpha
      ctx.fillStyle = 'rgba(200,230,255,0.8)'
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    })
    ctx.globalAlpha = 1
    ctx.restore()
  }
}
