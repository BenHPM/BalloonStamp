// src/managers/MatchManager.js
export class MatchManager {
  constructor() {
    this.aliveEntities = [] // 所有存活实体（含玩家）
    this.eliminated = []
    this.matchTime = 0
    this.phase = 'waiting' // waiting | playing | ended
    this.winner = null
  }

  setEntities(entities) {
    this.aliveEntities = entities.slice()
    this.eliminated = []
    this.matchTime = 0
    this.phase = 'playing'
    this.winner = null
  }

  addAlive(entity) {
    if (!this.aliveEntities.includes(entity)) {
      this.aliveEntities.push(entity)
    }
  }

  eliminate(entity) {
    entity.eliminate()
    this.aliveEntities = this.aliveEntities.filter(e => e !== entity)
    this.eliminated.push(entity)
    // 不再自动结束 — 由 PlayState 的玩家生命系统控制
  }

  update(dt) {
    if (this.phase !== 'playing') return
    this.matchTime += dt
  }

  getAliveCount() { return this.aliveEntities.length }
  getRank(entity) {
    // 淘汰越晚排名越高
    const elimIndex = this.eliminated.indexOf(entity)
    if (elimIndex >= 0) return this.eliminated.length - elimIndex + 1
    if (this.aliveEntities.includes(entity)) return 1
    return this.eliminated.length + 1
  }
}
