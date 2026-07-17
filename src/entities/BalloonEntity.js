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
    this.finalRank = 0 // 淘汰时锁定的最终排名（0 = 未定 / 仍存活）
    this.justLostAllBalloons = false // 帧内标记：本帧刚被 stomp 到 0 气球，免疫 kick
  }

  // 由 MatchManager 在淘汰 / 复活时调用，锁定或清除最终排名
  setFinalRank(rank) {
    this.finalRank = rank
  }

  // 帧末由 PlayState 调用，清除本帧的临时标记
  clearFrameFlags() {
    this.justLostAllBalloons = false
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
      // 本帧被 stomp 到 0 气球的实体，免疫 kick（避免同帧 stomp→kick 连击）
      if (this.balloons === 0) this.justLostAllBalloons = true
      this._updateState()
    }
  }

  eliminate() {
    this.state = EntityState.ELIMINATED
    this.alive = false
  }

  _updateState() {
    // 终态 / 中间态保位：ELIMINATED 与 INFLATING 都不被本函数覆盖。
    // INFLATING 必须保位：0 气球实体满足 balloons===0 && onGround，若无保位会在每帧被改写回 GROUNDED，
    // 导致 inflateTimer 永远无法跑完、实体永远卡在 0 气球无法自动恢复的 deadlock。
    if (this.state === EntityState.ELIMINATED || this.state === EntityState.INFLATING) return
    if (this.balloons === 0 && !this.onGround) {
      this.state = EntityState.FALLING
    } else if (this.balloons === 0 && this.onGround) {
      this.state = EntityState.GROUNDED
    } else if (this.balloons > 0) {
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
