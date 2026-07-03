// src/managers/SpawnManager.js
import { AI_DISTRIBUTION, TOTAL_ENTITIES } from '../config/entities.js'
import { WORLD } from '../config/world.js'
import { Enemy } from '../entities/Enemy.js'

export class SpawnManager {
  constructor() {
    this.respawnQueue = [] // 前30秒可复活一次的 AI
    this.elapsed = 0
  }

  generateInitialEnemies() {
    const enemies = []
    const count = TOTAL_ENTITIES - 1 // 减去玩家
    for (let i = 0; i < count; i++) {
      const typeKey = this._pickType()
      const pos = this._pickEdgePosition(i, count)
      const enemy = new Enemy(typeKey, pos.x, pos.y)
      enemy.id = `ai_${i}`
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
    // 从地图边缘不同位置入场
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
    // 前30秒内被淘汰的 AI 可复活一次
    if (this.elapsed < 30 && this.respawnQueue.length > 0) {
      const enemy = this.respawnQueue.shift()
      enemy.alive = true
      enemy.balloons = 1
      enemy.state = 'flying'
      enemy.x = this._pickEdgePosition(Math.random(), 1).x
      enemy.y = 100
      matchManager.addAlive(enemy)
      return enemy
    }
    return null
  }

  queueRespawn(enemy) {
    if (this.elapsed < 30) {
      this.respawnQueue.push(enemy)
    }
  }
}
