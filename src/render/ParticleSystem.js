// src/render/ParticleSystem.js
import { VISUALS } from '../config/visuals.js'

export class ParticleSystem {
  constructor() {
    this.particles = []
    this.maxParticles = VISUALS.maxParticles
  }

  burst(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) this.particles.shift()
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 300,
        vy: (Math.random() - 0.5) * 300 - 100,
        life: 0.3 + Math.random() * 0.3,
        maxLife: 0.5,
        color,
        size: 3 + Math.random() * 3,
      })
    }
  }

  update(dt) {
    this.particles = this.particles.filter(p => {
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vy += 600 * dt
      p.life -= dt
      return p.life > 0
    })
  }

  render(ctx) {
    this.particles.forEach(p => {
      ctx.globalAlpha = Math.min(1, p.life / 0.2)
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    })
    ctx.globalAlpha = 1
  }
}
