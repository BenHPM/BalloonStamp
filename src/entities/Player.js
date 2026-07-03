// src/entities/Player.js
import { PHYS } from '../config/physics.js'
import { PLAYER_CONFIG } from '../config/entities.js'

// 玩家状态枚举
export const PlayerState = {
  FLYING: 'flying',       // 正常飞行
  FALLING: 'falling',     // 0气球自由坠落（可左右操控但无法拍打）
  GROUNDED: 'grounded',   // 0气球落地（地面脆弱态）
  INFLATING: 'inflating', // 充气中
  ELIMINATED: 'eliminated',// 已淘汰
}

export class Player {
  constructor() {
    this.isPlayer = true
    Object.assign(this, PLAYER_CONFIG)
    this.vx = 0; this.vy = 0
    this.balloons = PHYS.initialBalloons
    this.maxBalloons = PHYS.maxBalloons
    this.flapCooldown = 0
    this.isFlapping = false; this.flapTimer = 0
    this.onGround = false; this.onPlatform = null
    this.facingRight = true
    this.state = PlayerState.FLYING
    this.stillTimer = 0 // 静止计时
    this.inflateTimer = 0
    this.alive = true
    this.eliminations = 0 // 淘汰数
    this.maxBalloonsAchieved = this.balloons
    this.animFrame = 0; this.animTimer = 0
  }

  get scale() {
    const extra = Math.max(0, this.balloons - PHYS.initialBalloons)
    return 1 + extra * PHYS.sizePerBalloon
  }

  get effectiveWidth() { return this.width * this.scale }
  get effectiveHeight() { return this.height * this.scale }

  gainBalloon() {
    if (this.balloons < this.maxBalloons) {
      this.balloons++
      if (this.balloons > this.maxBalloonsAchieved) this.maxBalloonsAchieved = this.balloons
      this._updateState()
    }
  }

  loseBalloon() {
    if (this.balloons > 0) {
      this.balloons--
      this._updateState()
    }
  }

  _updateState() {
    if (this.state === PlayerState.ELIMINATED) return
    if (this.balloons === 0 && !this.onGround) {
      this.state = PlayerState.FALLING
    } else if (this.balloons === 0 && this.onGround) {
      this.state = PlayerState.GROUNDED
    } else if (this.balloons > 0 && this.state !== PlayerState.INFLATING) {
      this.state = PlayerState.FLYING
    }
  }

  eliminate() {
    this.state = PlayerState.ELIMINATED
    this.alive = false
  }

  // 由 PhysicsEngine 固定步调用后调用
  tick(dt, input) {
    // 动画
    this.animTimer += dt
    if (this.animTimer > 0.1) { this.animTimer = 0; this.animFrame++ }

    if (this.facingRight !== (input.moveX > 0) && Math.abs(input.moveX) > 0.1) {
      this.facingRight = input.moveX > 0
    }

    if (this.state === PlayerState.ELIMINATED) return

    // 充气处理（必须在提前返回之前执行，否则 inflateTimer 永远不递减）
    if (this.state === PlayerState.INFLATING) {
      this.inflateTimer -= dt
      if (this.inflateTimer <= 0) {
        this.balloons = PHYS.inflateRecoverTo
        this.state = PlayerState.FLYING
        this.stillTimer = 0
      }
      return // 充气期间跳过其他逻辑
    }

    // 0 气球着陆 → FALLING 转 GROUNDED
    if (this.balloons === 0 && this.onGround && this.state === PlayerState.FALLING) {
      this.state = PlayerState.GROUNDED
    }
    // 0 气球离地 → GROUNDED 转 FALLING
    if (this.balloons === 0 && !this.onGround && this.state === PlayerState.GROUNDED) {
      this.state = PlayerState.FALLING
    }

    // 0气球落地 → 检测静止
    if (this.state === PlayerState.GROUNDED) {
      const isStill = Math.abs(input.moveX) < 0.1 && Math.abs(this.vx) < 20
      if (isStill) {
        this.stillTimer += dt
        if (this.stillTimer >= PHYS.inflateStillTime) {
          this.state = PlayerState.INFLATING
          this.inflateTimer = PHYS.inflateDuration
        }
      } else {
        this.stillTimer = 0
      }
    }

    // 恢复状态
    if (this.balloons > 0 && this.state === PlayerState.FALLING) {
      this.state = PlayerState.FLYING
    }
    if (this.balloons > 0 && this.state === PlayerState.GROUNDED) {
      this.state = PlayerState.FLYING
    }
  }

  // 获取渲染用的动画状态名
  getAnimName() {
    switch (this.state) {
      case PlayerState.INFLATING: return 'inflate'
      case PlayerState.ELIMINATED: return 'fall'
      case PlayerState.FALLING: return 'fall'
      case PlayerState.GROUNDED:
        return Math.abs(this.vx) > 20 ? 'walk' : 'idle'
      default:
        if (this.isFlapping) return 'flap'
        if (this.onGround) return Math.abs(this.vx) > 20 ? 'walk' : 'idle'
        return 'idle'
    }
  }
}
