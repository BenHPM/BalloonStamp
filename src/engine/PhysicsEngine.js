// src/engine/PhysicsEngine.js
import { PHYS } from '../config/physics.js'
import { WORLD } from '../config/world.js'

export class PhysicsEngine {
  constructor() {
    this.platforms = []
  }

  setPlatforms(platforms) {
    this.platforms = platforms
  }

  update(entity, input, dt) {
    const balloons = Math.max(0, Math.min(5, entity.balloons))

    // 重力
    const gravity = PHYS.gravity[balloons] || PHYS.gravity[0]
    entity.vy += gravity * dt

    // 终速
    if (entity.vy > PHYS.terminalVelocityDown) entity.vy = PHYS.terminalVelocityDown
    if (entity.vy < -PHYS.terminalVelocityUp) entity.vy = -PHYS.terminalVelocityUp

    // 水平移动（加速度模型 + 分支摩擦）
    const isStunned = entity.stunTimer > 0
    if (!isStunned && Math.abs(input.moveX) > 0.05) {
      const accel = PHYS.moveAccel * input.moveX
      entity.vx += accel * dt
      // 有输入时不施加摩擦——加速度自然控制速度
    } else if (!isStunned) {
      // 无输入：摩擦衰减
      if (entity.onGround) {
        // 地面：强摩擦快速停止
        entity.vx *= PHYS.groundFriction
      } else {
        // 空中：轻摩擦产生飘滑感
        entity.vx *= PHYS.coastFriction
      }
    }
    // 被击晕时保持当前水平速度但不衰减（保留惯性）
    // 限速
    const maxSpeed = PHYS.maxMoveSpeed * (1 + Math.max(0, balloons - PHYS.initialBalloons) * PHYS.speedPerBalloon) * (entity.speed || 1)
    entity.vx = Math.max(-maxSpeed, Math.min(maxSpeed, entity.vx))

    // 拍打：轻点一下拍一次，长按住 cooldown 结束后持续拍打
    entity.flapCooldown = Math.max(0, (entity.flapCooldown || 0) - dt)
    if (!isStunned && input.flap && balloons > 0 && entity.flapCooldown <= 0) {
      entity.vy = PHYS.flapImpulse[balloons] || PHYS.flapImpulse[2]
      entity.flapCooldown = PHYS.flapCooldown
      entity.isFlapping = true
      entity.flapTimer = 0.15 // 拍打动画时长
      entity.shockwaveTimer = 0.25 // 拍打冲击波
    }
    if (entity.flapTimer > 0) {
      entity.flapTimer -= dt
      if (entity.flapTimer <= 0) entity.isFlapping = false
    }

    // 位置（子步积分，避免高速下落穿透薄平台）
    const dx = entity.vx * dt
    const dy = entity.vy * dt
    const stepLimit = Math.max(8, entity.height * 0.5)
    const steps = Math.max(1, Math.ceil(Math.abs(dy) / stepLimit))
    const sdx = dx / steps
    const sdy = dy / steps
    entity.x += sdx
    entity.onGround = false
    for (let s = 0; s < steps; s++) {
      entity.y += sdy
      if (entity.vy >= 0 && this._resolvePlatformCollision(entity, sdy)) {
        // 已着陆，停止后续子步的下落
        break
      }
    }

    // 世界边界（气流墙反弹）
    if (entity.x < 0) { entity.x = 0; entity.vx = Math.abs(entity.vx) * WORLD.boundaryBounce }
    if (entity.x + entity.width > WORLD.width) { entity.x = WORLD.width - entity.width; entity.vx = -Math.abs(entity.vx) * WORLD.boundaryBounce }
    if (entity.y < 0) { entity.y = 0; entity.vy = Math.abs(entity.vy) * WORLD.boundaryBounce }

    // 反馈计时器衰减
    if (entity.landSquashTimer > 0) entity.landSquashTimer = Math.max(0, entity.landSquashTimer - dt)
    if (entity.invincibleTimer > 0) entity.invincibleTimer = Math.max(0, entity.invincibleTimer - dt)
    if (entity.shockwaveTimer > 0) entity.shockwaveTimer = Math.max(0, entity.shockwaveTimer - dt)
    if (entity.stunTimer > 0) entity.stunTimer = Math.max(0, entity.stunTimer - dt)
  }

  // 解析单步下落与平台碰撞（子步积分调用）；返回 true 表示已着陆
  // 使用相对 sdy 推回上帧底部（避免依赖固定 dt），适配任意子步步长
  _resolvePlatformCollision(entity, sdy) {
    if (entity.vy < 0) return false
    const prevBottom = entity.y + entity.height - sdy
    const newBottom = entity.y + entity.height
    for (const plat of this.platforms) {
      if (entity.x + entity.width > plat.x && entity.x < plat.x + plat.w) {
        if (prevBottom <= plat.y + PHYS.platformTolerance && newBottom >= plat.y) {
          entity.y = plat.y - entity.height
          entity.vy = 0
          entity.onGround = true
          entity.onPlatform = plat
          if (!entity.landSquashTimer) entity.landSquashTimer = 0.12
          return true
        }
      }
    }
    return false
  }

  // 踩踏弹跳
  applyStompBounce(entity) {
    const balloons = Math.max(0, Math.min(5, entity.balloons))
    const impulse = PHYS.flapImpulse[balloons] || PHYS.flapImpulse[2]
    entity.vy = impulse * PHYS.stompBounceFactor
    entity.landSquashTimer = 0.12 // 踩踏弹跳压扁
  }

  // 侧面弹开
  applyBounce(entity, dir) {
    entity.vx = dir * PHYS.bounceForce
  }

  // 水域检测
  isSubmerged(entity) {
    return entity.y + entity.height >= WORLD.waterLethalDepth
  }
  isTouchingWater(entity) {
    return entity.y + entity.height >= WORLD.waterY
  }
}
