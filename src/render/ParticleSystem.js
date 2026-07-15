// src/render/ParticleSystem.js
import { VISUALS } from '../config/visuals.js'

// 粒子分层：背景层（大气效果）和前景层（战斗特效）
export const PARTICLE_LAYER = {
  BG: 'bg',     // 大气效果（水域溅水、气流尾迹）
  FG: 'fg',     // 战斗特效（踩踏、踢杀、闪电）
}

export class ParticleSystem {
  constructor() {
    this.layers = {
      [PARTICLE_LAYER.BG]: [],
      [PARTICLE_LAYER.FG]: [],
    }
    this.maxPerLayer = VISUALS.maxParticles / 2
  }

  burst(x, y, color, count = 8, layer = PARTICLE_LAYER.FG) {
    const pool = this.layers[layer]
    const max = this.maxPerLayer
    for (let i = 0; i < count; i++) {
      // 池满时回收最早的（而非 shift，避免数组移动开销）
      if (pool.length >= max) {
        // 替换最旧的粒子
        const oldest = pool.reduce((a, b) => a.life < b.life ? a : b)
        const idx = pool.indexOf(oldest)
        if (idx >= 0) pool[idx] = this._createParticle(x, y, color)
      } else {
        pool.push(this._createParticle(x, y, color))
      }
    }
  }

  _createParticle(x, y, color) {
    return {
      x, y,
      vx: (Math.random() - 0.5) * 300,
      vy: (Math.random() - 0.5) * 300 - 100,
      life: 0.3 + Math.random() * 0.3,
      maxLife: 0.6,
      color,
      size: 3 + Math.random() * 3,
    }
  }

  update(dt) {
    for (const layer of Object.values(this.layers)) {
      for (let i = layer.length - 1; i >= 0; i--) {
        const p = layer[i]
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.vy += 600 * dt
        p.life -= dt
        if (p.life <= 0) {
          // 快速移除：与末尾交换 + pop（O(1) 删除）
          layer[i] = layer[layer.length - 1]
          layer.pop()
        }
      }
    }
  }

  render(ctx) {
    // 先渲染背景层（低透明度），再渲染前景层
    this._renderLayer(ctx, this.layers[PARTICLE_LAYER.BG])
    this._renderLayer(ctx, this.layers[PARTICLE_LAYER.FG])
  }

  _renderLayer(ctx, particles) {
    for (const p of particles) {
      const alpha = Math.min(1, p.life / 0.2)
      ctx.globalAlpha = alpha
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * (0.5 + p.life / p.maxLife * 0.5), 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }
}
