// src/entities/Environmental.js
import { WORLD } from '../config/world.js'

// 闪电弹球
export class Lightning {
  constructor(x, y, dirX, dirY) {
    this.x = x; this.y = y
    this.vx = dirX * 150; this.vy = dirY * 150
    this.width = 12; this.height = 12
    this.life = 5.0 // 秒
    this.alive = true
  }

  update(dt, platforms, clouds) {
    this.x += this.vx * dt
    this.y += this.vy * dt
    this.life -= dt
    if (this.life <= 0) { this.alive = false; return }

    // 反弹平台
    for (const p of platforms) {
      if (this.x > p.x && this.x < p.x + p.w && this.y > p.y && this.y < p.y + p.h) {
        // 简单反弹：反转速度
        this.vy = -this.vy
        this.y += this.vy * dt
        break
      }
    }

    // 碰白云本体消散
    if (clouds) {
      for (const c of clouds) {
        const dx = this.x - c.x
        const dy = this.y - c.y
        if (Math.hypot(dx, dy) < c.radius) {
          this.alive = false
          return
        }
      }
    }

    // 碰水面消散
    if (this.y >= WORLD.waterY) this.alive = false
    // 出界消散
    if (this.x < 0 || this.x > WORLD.width) this.alive = false
  }
}

// 小白云
export class Cloud {
  constructor(x, y, radius) {
    this.x = x; this.y = y; this.radius = radius
    this.width = radius * 2; this.height = radius * 2
    this.dischargeTimer = 3 + Math.random() * 4 // 秒
    this.alive = true
  }

  update(dt) {
    this.dischargeTimer -= dt
    if (this.dischargeTimer <= 0) {
      this.dischargeTimer = 5 + Math.random() * 5
      return true // 发出闪电
    }
    return false
  }

  discharge() {
    const angle = Math.random() * Math.PI * 2
    return new Lightning(this.x, this.y, Math.cos(angle), Math.sin(angle))
  }
}

// 鲸鱼
export class Whale {
  constructor() {
    this.x = Math.random() * WORLD.width
    this.y = WORLD.waterY
    this.state = 'hidden' // hidden | warning | jumping | returning
    this.timer = 10 + Math.random() * 15
    this.width = 80; this.height = 60
    this.alive = true
  }

  update(dt, entities) {
    this.timer -= dt
    if (this.state === 'hidden') {
      if (this.timer <= 0) {
        // 寻找贴水目标
        const target = entities.find(e => e.alive && e.y > WORLD.waterY - 200)
        if (target) {
          this.x = target.x
          this.state = 'warning'
          this.timer = 1.5 // 预警时长
        } else {
          this.timer = 5
        }
      }
    } else if (this.state === 'warning') {
      if (this.timer <= 0) {
        this.state = 'jumping'
        this.timer = 0.8
        this.jumpStartY = WORLD.waterY
        this.jumpPeakY = WORLD.waterY - 150
      }
    } else if (this.state === 'jumping') {
      const progress = 1 - this.timer / 0.8
      this.y = this.jumpStartY + (this.jumpPeakY - this.jumpStartY) * Math.sin(progress * Math.PI)
      if (this.timer <= 0) {
        this.state = 'returning'
        this.timer = 0.5
        this.y = WORLD.waterY
      }
    } else if (this.state === 'returning') {
      if (this.timer <= 0) {
        this.state = 'hidden'
        this.timer = 15 + Math.random() * 15
      }
    }
    return this.state
  }

  checkEat(entity) {
    if (this.state !== 'jumping') return false
    const dx = Math.abs(entity.x + entity.width / 2 - this.x)
    const dy = Math.abs(entity.y + entity.height / 2 - this.y)
    return dx < 50 && dy < 50
  }
}

// 气流区
export class AirCurrent {
  constructor(config) {
    Object.assign(this, config)
  }

  applyForce(entity, dt) {
    if (entity.x + entity.width > this.x && entity.x < this.x + this.w &&
        entity.y + entity.height > this.y && entity.y < this.y + this.h) {
      entity.vx += this.dirX * this.strength * dt
      entity.vy += this.dirY * this.strength * dt
    }
  }
}
