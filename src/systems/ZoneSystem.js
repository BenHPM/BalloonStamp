// src/systems/ZoneSystem.js
import { WORLD } from '../config/world.js'

export class ZoneSystem {
  constructor() {
    this.zoneRadius = Math.max(WORLD.width, WORLD.height) / 2
    this.zoneCenterX = WORLD.width / 2
    this.zoneCenterY = WORLD.height / 2
    this.elapsed = 0
    this.shrinkTimer = 0
  }

  update(dt, aliveCount) {
    this.elapsed += dt
    this.shrinkTimer += dt

    if (this.elapsed >= WORLD.zoneShrinkStart && this.shrinkTimer >= WORLD.zoneShrinkInterval) {
      this.shrinkTimer = 0
      this.zoneRadius = Math.max(WORLD.zoneMinRadius, this.zoneRadius * WORLD.zoneShrinkRate)
    }
  }

  // 检查实体是否在圈外
  isOutsideZone(entity) {
    const cx = entity.x + entity.width / 2
    const cy = entity.y + entity.height / 2
    const dist = Math.hypot(cx - this.zoneCenterX, cy - this.zoneCenterY)
    return dist > this.zoneRadius
  }

  // 对圈外实体施加推力
  applyZoneForce(entity, dt) {
    if (!this.isOutsideZone(entity)) return
    const cx = entity.x + entity.width / 2
    const cy = entity.y + entity.height / 2
    const dx = this.zoneCenterX - cx
    const dy = this.zoneCenterY - cy
    const dist = Math.hypot(dx, dy) || 1
    entity.vx += (dx / dist) * WORLD.zonePushForce * dt
    entity.vy += (dy / dist) * WORLD.zonePushForce * dt
  }
}
