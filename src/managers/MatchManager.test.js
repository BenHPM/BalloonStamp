// src/managers/MatchManager.test.js
import { describe, it, expect } from 'vitest'
import { MatchManager } from './MatchManager.js'

// 轻量 mock 实体：具备 MatchManager 所需的最小接口（含 finalRank 字段）
const makeEntity = (id) => ({
  id, alive: true, finalRank: 0,
  eliminate() { this.alive = false },
  setFinalRank(r) { this.finalRank = r },
})

describe('MatchManager', () => {
  it('setEntities resets state and marks phase=playing', () => {
    const mm = new MatchManager()
    mm.eliminated.push(makeEntity('x'))
    mm.setEntities([makeEntity('a'), makeEntity('b')])
    expect(mm.aliveEntities.length).toBe(2)
    expect(mm.eliminated.length).toBe(0)
    expect(mm.matchTime).toBe(0)
    expect(mm.phase).toBe('playing')
  })

  it('eliminate moves entity alive→eliminated, idempotent on double eliminate', () => {
    const mm = new MatchManager()
    const a = makeEntity('a')
    const b = makeEntity('b')
    mm.setEntities([a, b])
    mm.eliminate(a)
    expect(a.alive).toBe(false)
    expect(mm.aliveEntities.includes(a)).toBe(false)
    expect(mm.eliminated).toEqual([a])
    // 重复 eliminate 不会导致 eliminated 重复 push（造成 getRank 错乱）
    mm.eliminate(a)
    expect(mm.eliminated).toEqual([a])
  })

  it('eliminate locks finalRank = surviving-alive-count + 1 at elimination moment', () => {
    const mm = new MatchManager()
    const a = makeEntity('a')
    const b = makeEntity('b')
    const c = makeEntity('c')
    mm.setEntities([a, b, c])
    mm.eliminate(a) // 淘汰 a 时 aliveEntities 剩 [b, c] → rank 3
    expect(a.finalRank).toBe(3)
    mm.eliminate(b) // 淘汰 b 时 aliveEntities 剩 [c] → rank 2
    expect(b.finalRank).toBe(2)
  })

  it('getRank reflects locked finalRank; alive returns 1 when no rank locked', () => {
    const mm = new MatchManager()
    const a = makeEntity('a')
    const b = makeEntity('b')
    const c = makeEntity('c')
    mm.setEntities([a, b, c])
    mm.eliminate(a) // finalRank 3
    mm.eliminate(b) // finalRank 2
    expect(mm.getRank(a)).toBe(3)
    expect(mm.getRank(b)).toBe(2)
    expect(mm.getRank(c)).toBe(1) // 仍存活，且 finalRank=0 → 视为第 1
  })

  it('respawnEntity removes from eliminated, re-adds to alive, clears finalRank', () => {
    const mm = new MatchManager()
    const a = makeEntity('a')
    const b = makeEntity('b')
    mm.setEntities([a, b])
    mm.eliminate(a)
    expect(a.finalRank).toBe(2)
    expect(mm.aliveEntities).toEqual([b])
    expect(mm.eliminated).toEqual([a])
    // 复活：翻转 alive 后调 respawnEntity
    a.alive = true
    mm.respawnEntity(a)
    expect(mm.eliminated.includes(a)).toBe(false)
    expect(mm.aliveEntities.includes(a)).toBe(true)
    expect(a.finalRank).toBe(0)
    // 复活后可再次淘汰，且不会重复 push
    mm.eliminate(a)
    expect(mm.eliminated.filter(e => e === a).length).toBe(1)
  })

  it('matchTime only accumulates during playing phase', () => {
    const mm = new MatchManager()
    mm.setEntities([makeEntity('a')])
    mm.update(0.5)
    mm.update(0.5)
    expect(mm.matchTime).toBe(1)
    mm.phase = 'ended'
    mm.update(0.5)
    expect(mm.matchTime).toBe(1)
  })

  it('getAliveCount returns aliveEntities length', () => {
    const mm = new MatchManager()
    const a = makeEntity('a')
    const b = makeEntity('b')
    mm.setEntities([a, b])
    expect(mm.getAliveCount()).toBe(2)
    mm.eliminate(a)
    expect(mm.getAliveCount()).toBe(1)
  })
})
