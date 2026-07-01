// 计分系统 — 连击、得分、HUD

import { PHYS } from '../config/physics.js'

export class ScoreSystem {
  constructor() {
    this.score = 0
    this.comboCount = 0
    this.comboTimer = 0
    this.floatingTexts = [] // { text, x, y, timer, color }
  }

  addScore(value, x, y, combo = 0) {
    this.score = Math.max(0, this.score + value)
    const text = combo > 1 ? `+${value} x${combo}` : `+${value}`
    this.floatingTexts.push({
      text,
      x,
      y,
      timer: 60,
      color: combo > 1 ? '#ff0' : '#fff',
    })
  }

  penalty(value, x, y, text) {
    this.score = Math.max(0, this.score - value)
    this.floatingTexts.push({
      text: text || `-${value}`,
      x,
      y,
      timer: 60,
      color: '#f44',
    })
  }

  update() {
    // 更新浮动文字
    this.floatingTexts = this.floatingTexts.filter(t => {
      t.timer--
      t.y -= 0.5
      return t.timer > 0
    })
  }

  getFloatingTexts() {
    return this.floatingTexts
  }
}
