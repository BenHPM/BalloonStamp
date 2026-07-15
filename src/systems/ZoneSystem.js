// src/systems/ZoneSystem.js
import { WORLD } from '../config/world.js'

export class ZoneSystem {
  constructor() {
    this.zoneRadius = Math.max(WORLD.width, WORLD.height) / 2
    this.zoneCenterX = WORLD.width / 2
    this.zoneCenterY = WORLD.height / 2
    this.elapsed = 0
    this.shrinkTimer = 0
    this._entityZoneTimers = new Map() // entity → seconds outside zone
  }

  resetEntityTimer(entity) {
    this._entityZoneTimers.set(entity, 0)
  }

  removeEntity(entity) {
    this._entityZoneTimers.delete(entity)
  }

  update(dt, aliveCount) {
    this.elapsed += dt
    this.shrinkTimer += dt

    if (this.elapsed >= WORLD.zoneShrinkStart && this.shrinkTimer >= WORLD.zoneShrinkInterval) {
      this.shrinkTimer = 0
      this.zoneRadius = Math.max(WORLD.zoneMinRadius, this.zoneRadius * WORLD.zoneShrinkRate)
    }
  }

  isOutsideZone(entity) {
    const cx = entity.x + entity.width / 2
    const cy = entity.y + entity.height / 2
    const dist = Math.hypot(cx - this.zoneCenterX, cy - this.zoneCenterY)
    return dist > this.zoneRadius
  }

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

  // 获取实体在圈外的时间（秒）
  getOutsideTime(entity) {
    return this._entityZoneTimers.get(entity) || 0
  }

  // 每帧调用，更新圈外时间并返回本帧应造成的伤害
  tickEntity(entity, dt) {
    const outside = this.isOutsideZone(entity)
    if (outside) {
      const prev = this._entityZoneTimers.get(entity) || 0
      const current = prev + dt
      this._entityZoneTimers.set(entity, current)
      // 计算伤害等级
      let dps = 0
      const { zoneDamage, zoneDamageIntervals } = WORLD
      for (let i = zoneDamageIntervals.length - 1; i >= 0; i--) {
        if (current >= zoneDamageIntervals[i]) {
          dps = zoneDamage[i + 1]
          break
        }
      }
      return { outside, outsideTime: current, damage: dps * dt, dps }
    } else {
      this._entityZoneTimers.set(entity, 0)
      return { outside: false, outsideTime: 0, damage: 0, dps: 0 }
    }
  }
}
