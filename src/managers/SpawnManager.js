// src/managers/SpawnManager.js
import { AI_DISTRIBUTION, TOTAL_ENTITIES } from '../config/entities.js'
import { WORLD } from '../config/world.js'
import { Enemy } from '../entities/Enemy.js'

export class SpawnManager {
  constructor() {
    this.respawnQueue = []
    this.elapsed = 0
    this._platforms = [] // 由 PlayState 设置
    this._zoneSystem = null // 由 PlayState 设置，用于在安全区内选择复活点
    this._allowBerserker = false // 是否解锁暴躁型；false 时生成分布不含 berserker
    this._maxAliveAI = TOTAL_ENTITIES - 1 // 场上 AI 最大存活数（按阶段难度目标）
    this._enemyIdSeq = 0 // 用于为维护补员生成唯一 id
  }

  setPlatforms(platforms) {
    this._platforms = platforms
  }

  setZoneSystem(zoneSystem) {
    this._zoneSystem = zoneSystem
  }

  // 由 PlayState 每帧传入当前阶段的难度快照
  setDifficulty({ allowBerserker = false, maxAliveAI = TOTAL_ENTITIES - 1 } = {}) {
    this._allowBerserker = !!allowBerserker
    this._maxAliveAI = Math.max(0, maxAliveAI | 0)
  }

  generateInitialEnemies() {
    const enemies = []
    // 初始活跃 AI 数由当前难度阶段的 aiCount (maxAliveAI) 决定
    const count = Math.max(1, Math.min(this._maxAliveAI, TOTAL_ENTITIES - 1))
    for (let i = 0; i < count; i++) {
      const typeKey = this._pickType()
      const pos = this._pickEdgePosition(i, count)
      const enemy = new Enemy(typeKey, pos.x, pos.y)
      enemy.id = `ai_${i}`
      enemy._platforms = this._platforms
      enemies.push(enemy)
    }
    this._enemyIdSeq = count
    return enemies
  }

  // 根据是否解锁 berserker 过滤 AI 分布并归一化比例
  _pickType() {
    const dist = this._allowBerserker
      ? AI_DISTRIBUTION
      : AI_DISTRIBUTION.filter(t => t.type !== 'berserker')
    const total = dist.reduce((s, t) => s + t.ratio, 0) || 1
    const r = Math.random() * total
    let acc = 0
    for (const { type, ratio } of dist) {
      acc += ratio
      if (r < acc) return type
    }
    return dist[0].type
  }

  _pickEdgePosition(index, total) {
    // 将 AI 分散到各平台上方，避免集中在中心圆环与玩家重叠
    // 优先使用平台位置，平台不够时退回到圆环分布
    if (this._platforms.length > 0) {
      // 按索引轮流选平台，加上随机偏移避免完全重叠
      const platIndex = index % this._platforms.length
      const plat = this._platforms[platIndex]
      const offsetX = (Math.random() - 0.5) * plat.w * 0.6
      return {
        x: plat.x + plat.w / 2 + offsetX,
        y: plat.y - 40 - Math.random() * 30, // 平台上方 40-70 像素
      }
    }
    // 退回：圆环分布
    const angle = (index / total) * Math.PI * 2
    const cx = WORLD.width / 2
    const cy = WORLD.height / 2
    const r = Math.min(WORLD.width, WORLD.height) * 0.4
    return {
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
    }
  }

  // 为复活的 AI 寻找安全区内的最近平台落点；无合适平台则退回到 zone 中心
  _findSafeEnemyRespawn(enemy) {
    const zs = this._zoneSystem
    if (!zs) {
      return { x: WORLD.width / 2, y: WORLD.height / 2 }
    }
    const cx = zs.zoneCenterX
    const cy = zs.zoneCenterY
    const safeR = zs.zoneRadius * 0.6
    let best = null
    let bestDist = Infinity
    for (const plat of this._platforms) {
      const px = plat.x + plat.w / 2
      const py = plat.y
      if (Math.hypot(px - cx, py - cy) > safeR) continue
      const d = Math.hypot(px - enemy.x, py - enemy.y)
      if (d < bestDist) { bestDist = d; best = { x: px - enemy.width / 2, y: py - enemy.height } }
    }
    if (best) return best
    return { x: cx - enemy.width / 2, y: cy - enemy.height - 50 }
  }

  // 为维护补员在安全区内选一个随机平台附近落点
  _findSafeMaintainPosition() {
    const zs = this._zoneSystem
    const cx = zs?.zoneCenterX ?? WORLD.width / 2
    const cy = zs?.zoneCenterY ?? WORLD.height / 2
    const safeR = (zs?.zoneRadius ?? Math.min(WORLD.width, WORLD.height) / 2) * 0.6
    const candidates = []
    for (const plat of this._platforms) {
      const px = plat.x + plat.w / 2
      const py = plat.y
      if (Math.hypot(px - cx, py - cy) <= safeR) candidates.push({ x: px, y: py - 30 })
    }
    if (candidates.length > 0) {
      return candidates[Math.floor(Math.random() * candidates.length)]
    }
    return { x: cx, y: cy - 80 }
  }

  // aliveEnemiesProvider: () => Enemy[]，返回当前场上存活的 AI 列表
  update(dt, matchManager, aliveEnemiesProvider) {
    this.elapsed += dt

    // ─── 1. 前 30 秒内的淘汰复活队列（原有机制） ───────────────────
    if (this.elapsed <= 30 && this.respawnQueue.length > 0) {
      // 每 0.5 秒复活一个（避免同时涌入）
      if (Math.floor(this.elapsed * 2) > Math.floor((this.elapsed - dt) * 2)) {
        const entry = this.respawnQueue.shift()
        if (entry?.enemy) {
          const enemy = entry.enemy
          enemy.alive = true
          enemy.balloons = 1
          enemy.state = 'flying'
          const pos = this._findSafeEnemyRespawn(enemy)
          enemy.x = pos.x
          enemy.y = pos.y
          enemy.vx = 0; enemy.vy = 0
          enemy.landSquashTimer = 0
          enemy.shockwaveTimer = 0
          enemy._platforms = this._platforms
          matchManager.respawnEntity(enemy)
        }
      }
    }

    // ─── 2. 阶段目标的维护补员（maxAliveAI） ───────────────────────
    //     当场上存活 AI 数低于阶段目标时，定期从安全区补一个新 AI
    if (aliveEnemiesProvider && this.elapsed <= 30) {
      const alive = aliveEnemiesProvider().filter(e => e.alive)
      if (alive.length < this._maxAliveAI && this._maintainTimer <= 0) {
        this._spawnMaintainEnemy(matchManager)
        this._maintainTimer = 2.0 // 每 2 秒最多补 1 个
      }
    }
    if (this._maintainTimer > 0) this._maintainTimer -= dt
  }

  _spawnMaintainEnemy(matchManager) {
    const typeKey = this._pickType()
    const pos = this._findSafeMaintainPosition()
    const enemy = new Enemy(typeKey, pos.x, pos.y)
    enemy.id = `ai_m_${this._enemyIdSeq++}`
    enemy._platforms = this._platforms
    enemy.alive = true
    enemy.balloons = 1
    enemy.state = 'flying'
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
