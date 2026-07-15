// src/entities/BalloonEntity.js
import { PHYS } from '../config/physics.js'
import { EntityState } from './EntityState.js'

export class BalloonEntity {
  constructor(initialBalloons = PHYS.initialBalloons) {
    this.vx = 0; this.vy = 0
    this.balloons = initialBalloons
    this.maxBalloons = PHYS.maxBalloons
    this.flapCooldown = 0
    this.isFlapping = false; this.flapTimer = 0
    this.onGround = false; this.onPlatform = null
    this.facingRight = true
    this.state = EntityState.FLYING
    this.stillTimer = 0
    this.inflateTimer = 0
    this.alive = true
    this.animFrame = 0; this.animTimer = 0
    this.landSquashTimer = 0
    this.invincibleTimer = 0
    this.shockwaveTimer = 0
    this.stunTimer = 0 // 侧面碰撞硬直（0 = 正常）
  }

  get scale() {
    const extra = Math.max(0, this.balloons - PHYS.initialBalloons)
    const base = this.baseScale || 1
    return base * (1 + extra * PHYS.sizePerBalloon)
  }

  get effectiveWidth() { return this.width * this.scale }
  get effectiveHeight() { return this.height * this.scale }

  gainBalloon() {
    if (this.balloons < this.maxBalloons) {
      this.balloons++
      if (this.maxBalloonsAchieved !== undefined && this.balloons > this.maxBalloonsAchieved) {
        this.maxBalloonsAchieved = this.balloons
      }
      this._updateState()
    }
  }

  loseBalloon() {
    if (this.balloons > 0) {
      this.balloons--
      this._updateState()
    }
  }

  eliminate() {
    this.state = EntityState.ELIMINATED
    this.alive = false
  }

  _updateState() {
    if (this.state === EntityState.ELIMINATED) return
    if (this.balloons === 0 && !this.onGround) {
      this.state = EntityState.FALLING
    } else if (this.balloons === 0 && this.onGround) {
      this.state = EntityState.GROUNDED
    } else if (this.balloons > 0 && this.state !== EntityState.INFLATING) {
      this.state = EntityState.FLYING
    }
  }

  tick(dt, input) {
    this.animTimer += dt
    if (this.animTimer > PHYS.animFrameDuration) { this.animTimer = 0; this.animFrame++ }

    if (input.moveX !== 0) this.facingRight = input.moveX > 0

    if (this.state === EntityState.ELIMINATED) return

    // 充气处理
    if (this.state === EntityState.INFLATING) {
      if (this.balloons === 0) {
        this.state = EntityState.GROUNDED
        this.inflateTimer = 0
        this.stillTimer = 0
        return
      }
      this.inflateTimer -= dt
      if (this.inflateTimer <= 0) {
        this.balloons = PHYS.inflateRecoverTo
        this.state = EntityState.FLYING
        this.stillTimer = 0
      }
      return
    }

    // 0 气球着陆 → FALLING 转 GROUNDED
    if (this.balloons === 0 && this.onGround && this.state === EntityState.FALLING) {
      this.state = EntityState.GROUNDED
      this.stillTimer = 0
    }
    // 0 气球离地 → GROUNDED 转 FALLING
    if (this.balloons === 0 && !this.onGround && this.state === EntityState.GROUNDED) {
      this.state = EntityState.FALLING
    }

    // 0气球落地 → 检测静止
    if (this.state === EntityState.GROUNDED) {
      const isStill = Math.abs(input.moveX) < 0.1 && Math.abs(this.vx) < 20
      if (isStill) {
        this.stillTimer += dt
        if (this.stillTimer >= PHYS.inflateStillTime) {
          this.state = EntityState.INFLATING
          this.inflateTimer = PHYS.inflateDuration
        }
      } else {
        this.stillTimer = 0
      }
    }

    // 恢复状态
    if (this.balloons > 0 && this.state === EntityState.FALLING) {
      this.state = EntityState.FLYING
    }
    if (this.balloons > 0 && this.state === EntityState.GROUNDED) {
      this.state = EntityState.FLYING
    }
  }

  getAnimName() {
    switch (this.state) {
      case EntityState.INFLATING: return 'inflate'
      case EntityState.ELIMINATED: return 'fall'
      case EntityState.FALLING: return 'fall'
      case EntityState.GROUNDED:
        return Math.abs(this.vx) > 20 ? 'walk' : 'idle'
      default:
        if (this.isFlapping) return 'flap'
        if (this.onGround) return Math.abs(this.vx) > 20 ? 'walk' : 'idle'
        return 'idle'
    }
  }
}
