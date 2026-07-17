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

  // 淘汰实体：aliveEntities 移除 + eliminated 追加，并在淘汰瞬间锁定最终排名。
  // 排名语义：淘汰者按淘汰顺序逆序排名（越晚淘汰名次数值越小、越好），
  // 淘汰时刻仍存活的其它实体数 + 1 即为该淘汰者的名次。
  eliminate(entity) {
    entity.eliminate()
    this.aliveEntities = this.aliveEntities.filter(e => e !== entity)
    if (!this.eliminated.includes(entity)) this.eliminated.push(entity)
    // 锁定最终排名：淘汰时刻，其余仍存活的实体数 + 1。
    // 玩家可能多次淘汰/复活，每次淘汰都重新锁定（最后一次为最终成绩）。
    // 使用 typeof 防御兼容缺少 setter 的 legacy/测试实体。
    if (typeof entity.setFinalRank === 'function') {
      entity.setFinalRank(this.aliveEntities.length + 1)
    }
    // 不再自动结束 — 由 PlayState 的玩家生命系统控制
  }

  // 复活实体：从 eliminated 移除并重新加入 aliveEntities。
  // 统一入口，避免 SpawnManager / PlayState 各自维护 eliminated 而导致排名错乱。
  // 同时清除之前锁定的复活者排名（复活者尚未定论）。
  respawnEntity(entity) {
    this.eliminated = this.eliminated.filter(e => e !== entity)
    if (typeof entity.setFinalRank === 'function') entity.setFinalRank(0)
    this.addAlive(entity)
  }

  update(dt) {
    if (this.phase !== 'playing') return
    this.matchTime += dt
  }

  getAliveCount() { return this.aliveEntities.length }

  // 查询实体最终排名：返回淘汰时锁定的 finalRank（锁定越晚数值越小 = 越好）。
  // 未锁定（仍存活 / 复活未定）返回 1。单一语义，避免与 legacy index 路径冲突。
  getRank(entity) {
    return entity.finalRank > 0 ? entity.finalRank : 1
  }
}
