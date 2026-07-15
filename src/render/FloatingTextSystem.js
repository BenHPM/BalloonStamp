// src/render/FloatingTextSystem.js

// 浮字配置：各事件的文字、颜色、Y 偏移速度
export const FLOATING_TEXTS = {
  stomp:       { text: '+1',       color: '#fff',       size: 18, vy: -80  },
  stompScore:  { text: '+200',     color: '#FFD700',    size: 16, vy: -60  },
  elimination: { text: 'ELIMINATED', color: '#FF4444',  size: 22, vy: -100 },
  zoneDmg:     { text: '-1',       color: '#FF6666',    size: 16, vy: -50  },
  balloonGain: { text: '+',        color: '#88FF88',    size: 14, vy: -40  },
}

export class FloatingTextSystem {
  constructor() {
    this.texts = []
    this.maxTexts = 20
  }

  emit(x, y, key) {
    const cfg = FLOATING_TEXTS[key]
    if (!cfg) return
    if (this.texts.length >= this.maxTexts) this.texts.shift()
    this.texts.push({
      x, y,
      text: cfg.text,
      color: cfg.color,
      size: cfg.size,
      vy: cfg.vy,
      life: 1.0, // 1 秒
    })
  }

  update(dt) {
    this.texts = this.texts.filter(t => {
      t.y += t.vy * dt
      t.vy *= 0.95 // 减速
      t.life -= dt
      return t.life > 0
    })
  }

  render(ctx) {
    this.texts.forEach(t => {
      const alpha = Math.max(0, t.life)
      const scale = 1 + (1 - alpha) * 0.3 // 渐大
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.font = `bold ${t.size * scale}px sans-serif`
      ctx.textAlign = 'center'
      ctx.fillStyle = t.color
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'
      ctx.lineWidth = 3
      ctx.strokeText(t.text, t.x, t.y)
      ctx.fillText(t.text, t.x, t.y)
      ctx.restore()
    })
  }
}
