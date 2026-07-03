// src/entities/Enemy.js
import { PHYS } from '../config/physics.js'
import { AI_TYPES, AI_DECISION_INTERVAL } from '../config/entities.js'
import { PlayerState } from './Player.js' // 复用状态枚举

export class Enemy {
  constructor(typeKey, spawnX, spawnY) {
    const cfg = AI_TYPES[typeKey]
    this.typeKey = typeKey
    this.name = cfg.name
    this.color = cfg.color
    this.balloonColor = cfg.color
    this.speed = cfg.speed
    this.chaseRate = cfg.chaseRate
    this.flapInterval = cfg.flapInterval
    this.baseScale = cfg.scale
    this.width = 28 * cfg.scale
    this.height = 36 * cfg.scale
    this.x = spawnX; this.y = spawnY
    this.vx = 0; this.vy = 0
    this.balloons = cfg.balloonCount
    this.maxBalloons = PHYS.maxBalloons
    this.flapCooldown = 0; this.isFlapping = false; this.flapTimer = 0
    this.onGround = false; this.onPlatform = null
    this.facingRight = true
    this.state = PlayerState.FLYING
    this.stillTimer = 0; this.inflateTimer = 0
    this.alive = true
    this.aiTimer = 0
    this.flapAiTimer = 0
    this.moveDir = 0
    this.animFrame = 0; this.animTimer = 0
    this._decisionInterval = AI_DECISION_INTERVAL[0] + Math.random() * (AI_DECISION_INTERVAL[1] - AI_DECISION_INTERVAL[0])
  }

  get scale() {
    const extra = Math.max(0, this.balloons - PHYS.initialBalloons)
    return this.baseScale * (1 + extra * PHYS.sizePerBalloon)
  }

  get effectiveWidth() { return this.width * this.scale / this.baseScale }
  get effectiveHeight() { return this.height * this.scale / this.baseScale }
  gainBalloon() { if (this.balloons < this.maxBalloons) { this.balloons++; this._updateState() } }
  loseBalloon() { if (this.balloons > 0) { this.balloons--; this._updateState() } }
  eliminate() { this.state = PlayerState.ELIMINATED; this.alive = false }
  _updateState() {
    if (this.state === PlayerState.ELIMINATED) return
    if (this.balloons === 0 && !this.onGround) this.state = PlayerState.FALLING
    else if (this.balloons === 0 && this.onGround) this.state = PlayerState.GROUNDED
    else if (this.balloons > 0 && this.state !== PlayerState.INFLATING) this.state = PlayerState.FLYING
  }

  // AI 决策
  decideAI(player, dt) {
    if (!this.alive || this.state === PlayerState.INFLATING || this.state === PlayerState.ELIMINATED) {
      return { moveX: 0, flapJustPressed: false }
    }

    this.aiTimer += dt
    if (this.aiTimer < this._decisionInterval) {
      // 沿用上次决策
      return { moveX: this.moveDir, flapJustPressed: false }
    }
    this.aiTimer = 0

    const dist = Math.hypot(player.x - this.x, player.y - this.y)
    const shouldChase = Math.random() < this.chaseRate

    if (shouldChase && player.alive) {
      this.moveDir = player.x > this.x + 10 ? 1 : (player.x < this.x - 10 ? -1 : 0)
      // 玩家在上方时尝试拍打
      this.flapAiTimer -= dt
      if (player.y < this.y - 30 && this.flapAiTimer <= 0 && this.balloons > 0) {
        this.flapAiTimer = this.flapInterval[0] + Math.random() * (this.flapInterval[1] - this.flapInterval[0])
        return { moveX: this.moveDir, flapJustPressed: true }
      }
    } else {
      // 随机飘浮
      if (Math.random() < 0.3) this.moveDir = Math.random() < 0.5 ? -1 : 1
      if (Math.random() < 0.2 && this.balloons > 0) {
        return { moveX: this.moveDir, flapJustPressed: true }
      }
    }

    // 地面卡住时强制拍打
    if (this.onGround && Math.abs(this.vx) < 10 && this.balloons > 0) {
      return { moveX: this.moveDir, flapJustPressed: true }
    }

    return { moveX: this.moveDir, flapJustPressed: false }
  }

  tick(dt, input) {
    this.animTimer += dt
    if (this.animTimer > 0.1) { this.animTimer = 0; this.animFrame++ }
    if (input.moveX !== 0) this.facingRight = input.moveX > 0

    if (this.state === PlayerState.ELIMINATED) return

    // 充气处理（必须在提前返回之前执行）
    if (this.state === PlayerState.INFLATING) {
      this.inflateTimer -= dt
      if (this.inflateTimer <= 0) {
        this.balloons = PHYS.inflateRecoverTo
        this.state = PlayerState.FLYING
        this.stillTimer = 0
      }
      return
    }

    // 0 气球着陆/离地状态转换
    if (this.balloons === 0 && this.onGround && this.state === PlayerState.FALLING) {
      this.state = PlayerState.GROUNDED
    }
    if (this.balloons === 0 && !this.onGround && this.state === PlayerState.GROUNDED) {
      this.state = PlayerState.FALLING
    }

    if (this.state === PlayerState.GROUNDED) {
      const isStill = Math.abs(input.moveX) < 0.1 && Math.abs(this.vx) < 20
      if (isStill) {
        this.stillTimer += dt
        if (this.stillTimer >= PHYS.inflateStillTime) {
          this.state = PlayerState.INFLATING
          this.inflateTimer = PHYS.inflateDuration
        }
      } else { this.stillTimer = 0 }
    }

    if (this.balloons > 0 && (this.state === PlayerState.FALLING || this.state === PlayerState.GROUNDED)) {
      this.state = PlayerState.FLYING
    }
  }

  getAnimName() {
    switch (this.state) {
      case PlayerState.INFLATING: return 'inflate'
      case PlayerState.ELIMINATED: return 'fall'
      case PlayerState.FALLING: return 'fall'
      case PlayerState.GROUNDED: return Math.abs(this.vx) > 20 ? 'walk' : 'idle'
      default:
        if (this.isFlapping) return 'flap'
        if (this.onGround) return Math.abs(this.vx) > 20 ? 'walk' : 'idle'
        return 'idle'
    }
  }
}
