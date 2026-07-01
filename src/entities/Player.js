// 玩家实体

import { PHYS, PLAYER_CONFIG } from '../config/physics.js'
import { Balloon } from './Balloon.js'

export class Player {
  constructor() {
    this._isPlayer = true
    this.x = PLAYER_CONFIG.spawnX
    this.y = PLAYER_CONFIG.spawnY
    this.width = PLAYER_CONFIG.width
    this.height = PLAYER_CONFIG.height
    this.vx = 0
    this.vy = 0
    this.balloons = PLAYER_CONFIG.initialBalloons
    this.maxBalloons = PHYS.maxBalloons
    this.flapCooldown = 0
    this.isFlapping = false
    this.flapTimer = 0
    this.onGround = false
    this.onMainGround = false
    this.alive = true
    this.lives = PHYS.playerLives
    this.invincible = 0
    this.rechargeTimer = 0
    this.respawnTimer = 0 // 复活倒计时（帧）
    this.walkFrame = 0
    this.walkTimer = 0
    this.facingRight = true

    // 气球视觉
    this.balloonVisuals = []
    this._rebuildBalloons()
  }

  _rebuildBalloons() {
    this.balloonVisuals = []
    const count = this.balloons
    const spacing = 8
    const startX = this.width / 2 - (count - 1) * spacing / 2
    for (let i = 0; i < count; i++) {
      this.balloonVisuals.push(new Balloon(startX + i * spacing, PLAYER_CONFIG.balloonColor))
    }
  }

  gainBalloon() {
    if (this.balloons < this.maxBalloons) {
      this.balloons++
      this._rebuildBalloons()
    }
  }

  loseBalloon() {
    if (this.balloons > 0) {
      this.balloons--
      this._rebuildBalloons()
    }
  }

  // 站主地面充气
  recharge() {
    if (this.onMainGround && this.balloons < 2) {
      this.rechargeTimer++
      if (this.rechargeTimer >= PHYS.rechargeRate) {
        this.rechargeTimer = 0
        this.gainBalloon()
      }
    } else {
      this.rechargeTimer = 0
    }
  }

  // 死亡
  die() {
    this.alive = false
    this.lives--
    this.respawnTimer = 180 // 3 秒倒计时
  }

  // 复活
  respawn() {
    this.x = PLAYER_CONFIG.spawnX
    this.y = PLAYER_CONFIG.spawnY
    this.vx = 0
    this.vy = 0
    this.balloons = PLAYER_CONFIG.initialBalloons
    this.alive = true
    this.invincible = PHYS.respawnInvincible
    this.flapCooldown = 0
    this._rebuildBalloons()
  }

  update() {
    // 无敌倒计时
    if (this.invincible > 0) this.invincible--

    // 充气
    this.recharge()

    // 行走动画
    if (this.onGround && (this.vx > 0.5 || this.vx < -0.5)) {
      this.walkTimer++
      if (this.walkTimer > 6) {
        this.walkTimer = 0
        this.walkFrame = (this.walkFrame + 1) % 3
      }
      this.facingRight = this.vx > 0
    } else {
      this.walkFrame = 0
    }

    // 气球视觉更新
    this.balloonVisuals.forEach(b => b.update())
  }

  draw(ctx) {
    // 无敌闪烁
    if (this.invincible > 0 && Math.floor(this.invincible / 4) % 2 === 0) {
      // 闪烁时半透明
      ctx.globalAlpha = 0.4
    }

    // 气球
    this.balloonVisuals.forEach(b => b.draw(ctx, this.x, this.y))

    // 身体
    const cx = this.x + this.width / 2
    const cy = this.y + this.height / 2

    // 身体方块
    ctx.fillStyle = PLAYER_CONFIG.color
    ctx.fillRect(this.x + 2, this.y + 6, this.width - 4, this.height - 8)

    // 头（半圆）
    ctx.fillStyle = PLAYER_CONFIG.color
    ctx.beginPath()
    ctx.arc(cx, this.y + 6, this.width / 2 - 2, Math.PI, 0)
    ctx.fill()

    // 眼睛
    const eyeDir = this.facingRight ? 2 : -2
    ctx.fillStyle = '#000'
    ctx.fillRect(cx + eyeDir - 1, this.y + 4, 2, 2)

    // 手臂（拍打动画）
    if (this.isFlapping) {
      ctx.fillStyle = PLAYER_CONFIG.color
      // 左手
      ctx.fillRect(this.x - 3, this.y + 6, 4, 3)
      // 右手
      ctx.fillRect(this.x + this.width - 1, this.y + 6, 4, 3)
    }

    // 腿（行走动画）
    const legOffsets = [[0, 0], [-1, 1], [0, 0], [1, -1]]
    const legFrame = legOffsets[this.walkFrame]
    ctx.fillStyle = PLAYER_CONFIG.color
    ctx.fillRect(this.x + 3 + legFrame[0], this.y + this.height - 4, 3, 4)
    ctx.fillRect(this.x + this.width - 6 + legFrame[1], this.y + this.height - 4, 3, 4)

    // 无敌护盾
    if (this.invincible > 0) {
      ctx.strokeStyle = '#fd0'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(cx, cy, this.width / 2 + 4, 0, Math.PI * 2)
      ctx.stroke()
    }

    ctx.globalAlpha = 1
  }
}
