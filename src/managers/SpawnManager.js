// src/managers/SpawnManager.js
import { AI_DISTRIBUTION, TOTAL_ENTITIES } from '../config/entities.js'
import { WORLD } from '../config/world.js'
import { EntityState } from '../entities/EntityState.js'
import { Enemy } from '../entities/Enemy.js'

export class SpawnManager {
  constructor() {
    this.respawnQueue = []
    this.elapsed = 0
    this._platforms = [] // 由 PlayState 设置
  }

  setPlatforms(platforms) {
    this._platforms = platforms
  }

  generateInitialEnemies() {
    const enemies = []
    const count = TOTAL_ENTITIES - 1
    for (let i = 0; i < count; i++) {
      const typeKey = this._pickType()
      const pos = this._pickEdgePosition(i, count)
      const enemy = new Enemy(typeKey, pos.x, pos.y)
      enemy.id = `ai_${i}`
      enemy._platforms = this._platforms
      enemies.push(enemy)
    }
    return enemies
  }

  _pickType() {
    const r = Math.random()
    let acc = 0
    for (const { type, ratio } of AI_DISTRIBUTION) {
      acc += ratio
      if (r < acc) return type
    }
    return AI_DISTRIBUTION[0].type
  }

  _pickEdgePosition(index, total) {
    const angle = (index / total) * Math.PI * 2
    const cx = WORLD.width / 2
    const cy = WORLD.height / 2
    const r = Math.min(WORLD.width, WORLD.height) * 0.4
    return {
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
    }
  }

  update(dt, matchManager) {
    this.elapsed += dt
    // 前30秒内被淘汰的 AI 可复活一次（设计规格书 §4.4）
    if (this.elapsed > 30) return
    if (this.respawnQueue.length === 0) return

    // 每 0.5 秒复活一个（避免同时涌入）
    if (Math.floor(this.elapsed * 2) <= Math.floor((this.elapsed - dt) * 2)) return

    const entry = this.respawnQueue.shift()
    if (!entry || !entry.enemy) return
    const enemy = entry.enemy
    enemy.alive = true
    enemy.balloons = 1
    enemy.state = EntityState.FLYING
    const edgePos = this._pickEdgePosition(Math.random(), 1)
    enemy.x = edgePos.x
    enemy.y = 100
    enemy.vx = 0; enemy.vy = 0
    enemy.landSquashTimer = 0
    enemy.shockwaveTimer = 0
    enemy._platforms = this._platforms
    matchManager.addAlive(enemy)
  }

  queueRespawn(enemy) {
    if (this.elapsed < 30) {
      this.respawnQueue.push({ enemy })
    }
  }

  getQueueLength() {
    return this.respawnQueue.length
  }
}
