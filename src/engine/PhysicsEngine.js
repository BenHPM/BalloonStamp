// 物理引擎 — 重力、拍打、移动、平台碰撞

import { PHYS } from '../config/physics.js'

export class PhysicsEngine {
  constructor() {
    this.platforms = []
  }

  setPlatforms(platforms) {
    this.platforms = platforms
  }

  // 获取基于气球数的物理参数索引
  _balloonIndex(balloonCount) {
    if (balloonCount <= 0) return 0
    if (balloonCount === 1) return 1
    return 2
  }

  // 更新实体物理
  update(entity, input) {
    const bi = this._balloonIndex(entity.balloons)
    const gravity = PHYS.gravity[bi]
    const flapImpulse = PHYS.flapImpulse[bi]

    // 重力
    entity.vy += gravity

    // 终速限制
    if (entity.vy > PHYS.terminalVelocityDown) entity.vy = PHYS.terminalVelocityDown
    if (entity.vy < -PHYS.terminalVelocityUp) entity.vy = -PHYS.terminalVelocityUp

    // 水平移动
    if (input.left) entity.vx = -PHYS.moveSpeed
    else if (input.right) entity.vx = PHYS.moveSpeed
    else entity.vx *= PHYS.horizontalFriction

    // 拍打
    if (input.flapJustPressed && entity.flapCooldown <= 0) {
      entity.vy = flapImpulse
      entity.flapCooldown = PHYS.flapCooldown
      entity.isFlapping = true
      entity.flapTimer = 8 // 拍打动画帧数
      return true // 返回 true 表示拍了
    }

    // 冷却递减
    if (entity.flapCooldown > 0) entity.flapCooldown--

    // 拍打动画计时
    if (entity.flapTimer > 0) entity.flapTimer--
    else entity.isFlapping = false

    // 应用速度
    entity.x += entity.vx
    entity.y += entity.vy

    // 平台碰撞
    this._resolvePlatforms(entity)

    // 边界
    this._resolveBounds(entity)

    return false
  }

  _resolvePlatforms(entity) {
    entity.onGround = false
    entity.onMainGround = false

    for (const plat of this.platforms) {
      // 只检测从上方落下的碰撞
      if (entity.vy < 0) continue // 向上运动不检测

      const prevBottom = entity.y + entity.height - entity.vy
      const currBottom = entity.y + entity.height

      if (currBottom >= plat.y && prevBottom <= plat.y + 2 &&
          entity.x + entity.width > plat.x + 4 &&
          entity.x < plat.x + plat.w - 4) {
        entity.y = plat.y - entity.height
        entity.vy = 0
        entity.onGround = true
        if (plat.isGround) entity.onMainGround = true
      }
    }
  }

  _resolveBounds(entity) {
    // 左右硬墙
    if (entity.x < 0) { entity.x = 0; entity.vx = 0 }
    if (entity.x + entity.width > PHYS.GAME_WIDTH) {
      entity.x = PHYS.GAME_WIDTH - entity.width
      entity.vx = 0
    }

    // 上边界
    if (entity.y < 0) { entity.y = 0; entity.vy = 0 }
  }

  // 踩踏弹跳
  applyStompBounce(entity) {
    const bi = this._balloonIndex(entity.balloons)
    entity.vy = PHYS.flapImpulse[bi] * PHYS.stompBounceFactor
  }

  // 检查是否落水
  isInWater(entity) {
    return entity.y + entity.height > PHYS.waterY
  }
}
