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

    // 水平移动（加速度模型）
    if (Math.abs(input.moveX) > 0.05) {
      const accel = PHYS.moveAccel * input.moveX
      entity.vx += accel * dt
    }
    // 摩擦
    entity.vx *= PHYS.horizontalFriction
    // 限速
    const maxSpeed = PHYS.maxMoveSpeed * (1 + Math.max(0, balloons - PHYS.initialBalloons) * PHYS.speedPerBalloon)
    entity.vx = Math.max(-maxSpeed, Math.min(maxSpeed, entity.vx))

    // 拍打
    entity.flapCooldown = Math.max(0, (entity.flapCooldown || 0) - dt)
    if (input.flapJustPressed && balloons > 0 && entity.flapCooldown <= 0) {
      entity.vy = PHYS.flapImpulse[balloons] || PHYS.flapImpulse[2]
      entity.flapCooldown = PHYS.flapCooldown
      entity.isFlapping = true
      entity.flapTimer = 0.15 // 拍打动画时长
    }
    if (entity.flapTimer > 0) {
      entity.flapTimer -= dt
      if (entity.flapTimer <= 0) entity.isFlapping = false
    }

    // 位置
    entity.x += entity.vx * dt
    entity.y += entity.vy * dt

    // 平台碰撞（仅下落时）
    entity.onGround = false
    if (entity.vy >= 0) {
      const prevBottom = entity.y + entity.height - entity.vy * dt
      const newBottom = entity.y + entity.height
      for (const plat of this.platforms) {
        if (entity.x + entity.width > plat.x && entity.x < plat.x + plat.w &&
            prevBottom <= plat.y + 2 && newBottom >= plat.y) {
          entity.y = plat.y - entity.height
          entity.vy = 0
          entity.onGround = true
          entity.onPlatform = plat
          break
        }
      }
    }

    // 世界边界（气流墙反弹）
    if (entity.x < 0) { entity.x = 0; entity.vx = Math.abs(entity.vx) * WORLD.boundaryBounce }
    if (entity.x + entity.width > WORLD.width) { entity.x = WORLD.width - entity.width; entity.vx = -Math.abs(entity.vx) * WORLD.boundaryBounce }
    if (entity.y < 0) { entity.y = 0; entity.vy = Math.abs(entity.vy) * WORLD.boundaryBounce }
  }

  // 踩踏弹跳
  applyStompBounce(entity) {
    const balloons = Math.max(0, Math.min(5, entity.balloons))
    const impulse = PHYS.flapImpulse[balloons] || PHYS.flapImpulse[2]
    entity.vy = impulse * PHYS.stompBounceFactor
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
