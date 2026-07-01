// 敌人实体 + AI

import { PHYS, ENEMY_CONFIGS } from '../config/physics.js'
import { Balloon } from './Balloon.js'

export class Enemy {
  constructor(configIndex) {
    const cfg = ENEMY_CONFIGS[configIndex]
    this.configIndex = configIndex
    this.name = cfg.name
    this.color = cfg.color
    this.aiLevel = cfg.aiLevel
    this.speed = cfg.speed
    this.chaseRate = cfg.chaseRate
    this.flapInterval = cfg.flapInterval
    this.scale = cfg.scale || 1

    this.width = Math.round(16 * this.scale)
    this.height = Math.round(20 * this.scale)

    this.x = cfg.spawnX
    this.y = cfg.spawnY
    this.vx = 0
    this.vy = 0
    this.balloons = cfg.balloonCount
    this.flapCooldown = 0
    this.isFlapping = false
    this.flapTimer = 0
    this.onGround = false
    this.onMainGround = false
    this.alive = true
    this.invincible = 0

    // AI 状态
    this.aiTimer = 0
    this.flapTimer_ai = 0
    this.moveDir = 0
    this.targetX = 0
    this.targetY = 0

    // 重生
    this.respawnTimer = 0
    this.inflateTimer = 0
    this.isInflating = false

    // 动画
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
    const spacing = 8 * this.scale
    const startX = this.width / 2 - (count - 1) * spacing / 2
    for (let i = 0; i < count; i++) {
      this.balloonVisuals.push(new Balloon(startX + i * spacing, this.color))
    }
  }

  gainBalloon() {
    if (this.balloons < 3) {
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

  die() {
    this.alive = false
    this.respawnTimer = PHYS.enemyRespawnTime
  }

  respawn() {
    const cfg = ENEMY_CONFIGS[this.configIndex]
    this.x = cfg.spawnX
    this.y = cfg.spawnY
    this.vx = 0
    this.vy = 0
    this.alive = true
    this.invincible = PHYS.enemyInvincible
    this.balloons = 0
    this.isInflating = true
    this.inflateTimer = PHYS.enemyInflateDelay + PHYS.enemyInflateDuration
    this._rebuildBalloons()
  }

  // AI 决策
  updateAI(player, platforms) {
    if (!this.alive || this.isInflating) return { left: false, right: false, flapJustPressed: false }

    this.aiTimer++
    const dist = Math.hypot(player.x - this.x, player.y - this.y)
    const shouldChase = Math.random() < this.chaseRate

    let moveDir = 0
    let shouldFlap = false

    if (shouldChase && player.alive) {
      // 追击模式
      if (player.x > this.x + 10) moveDir = 1
      else if (player.x < this.x - 10) moveDir = -1

      // 尝试从上方接近
      if (player.y < this.y - 20) {
        this.flapTimer_ai--
        if (this.flapTimer_ai <= 0) {
          shouldFlap = true
          const [min, max] = this.flapInterval
          this.flapTimer_ai = min + Math.random() * (max - min)
        }
      }
    } else {
      // 随机飘浮
      if (this.aiTimer % 60 === 0) {
        moveDir = Math.random() < 0.5 ? -1 : 1
      }
      if (this.aiTimer % 40 === 0 && Math.random() < 0.3) {
        shouldFlap = true
      }
    }

    // 地面卡住检测
    if (this.onGround && Math.abs(this.vx) < 0.3 && this.balloons > 0) {
      shouldFlap = true
    }

    this.moveDir = moveDir
    this.facingRight = moveDir > 0 || (moveDir === 0 && this.facingRight)

    return {
      left: moveDir < 0,
      right: moveDir > 0,
      flapJustPressed: shouldFlap,
    }
  }

  update() {
    // 无敌倒计时
    if (this.invincible > 0) this.invincible--

    // 重生倒计时
    if (!this.alive) {
      if (this.respawnTimer > 0) {
        this.respawnTimer--
        if (this.respawnTimer <= 0) this.respawn()
      }
      return
    }

    // 充气动画
    if (this.isInflating) {
      this.inflateTimer--
      if (this.inflateTimer <= 0) {
        this.isInflating = false
        this.balloons = ENEMY_CONFIGS[this.configIndex].balloonCount
        this._rebuildBalloons()
      } else if (this.inflateTimer <= PHYS.enemyInflateDuration) {
        // 充气中，气球逐渐出现
        const progress = 1 - (this.inflateTimer / PHYS.enemyInflateDuration)
        if (this.balloons < ENEMY_CONFIGS[this.configIndex].balloonCount && progress > 0.5) {
          this.balloons = 1
          this._rebuildBalloons()
        }
      }
      return
    }

    // 行走动画
    if (this.onGround && (this.vx > 0.5 || this.vx < -0.5)) {
      this.walkTimer++
      if (this.walkTimer > 6) {
        this.walkTimer = 0
        this.walkFrame = (this.walkFrame + 1) % 3
      }
    } else {
      this.walkFrame = 0
    }

    // 气球视觉更新
    this.balloonVisuals.forEach(b => b.update())
  }

  draw(ctx) {
    if (!this.alive) return

    // 无敌闪烁
    if (this.invincible > 0 && Math.floor(this.invincible / 4) % 2 === 0) {
      ctx.globalAlpha = 0.4
    }

    // 充气动画 — 角色缩放
    let drawScale = 1
    if (this.isInflating && this.inflateTimer <= PHYS.enemyInflateDuration) {
      drawScale = 0.8 + 0.2 * Math.sin(this.inflateTimer * 0.3)
    }

    ctx.save()
    const cx = this.x + this.width / 2
    const cy = this.y + this.height / 2
    ctx.translate(cx, cy)
    ctx.scale(drawScale, drawScale)
    ctx.translate(-cx, -cy)

    // 气球
    this.balloonVisuals.forEach(b => b.draw(ctx, this.x, this.y))

    // 身体
    ctx.fillStyle = this.color
    ctx.fillRect(this.x + 2, this.y + 6, this.width - 4, this.height - 8)

    // 头
    ctx.beginPath()
    ctx.arc(cx, this.y + 6, this.width / 2 - 2, Math.PI, 0)
    ctx.fill()

    // 眼睛
    const eyeDir = this.facingRight ? 2 : -2
    ctx.fillStyle = '#000'
    ctx.fillRect(cx + eyeDir * this.scale - 1, this.y + 4, 2, 2)

    // 手臂
    if (this.isFlapping) {
      ctx.fillStyle = this.color
      ctx.fillRect(this.x - 3, this.y + 6, 4, 3)
      ctx.fillRect(this.x + this.width - 1, this.y + 6, 4, 3)
    }

    // 腿
    const legOffsets = [[0, 0], [-1, 1], [0, 0], [1, -1]]
    const legFrame = legOffsets[this.walkFrame]
    ctx.fillRect(this.x + 3 + legFrame[0], this.y + this.height - 4, 3, 4)
    ctx.fillRect(this.x + this.width - 6 + legFrame[1], this.y + this.height - 4, 3, 4)

    ctx.restore()
    ctx.globalAlpha = 1
  }
}
