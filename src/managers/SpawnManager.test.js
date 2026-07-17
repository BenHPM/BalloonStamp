// src/managers/SpawnManager.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import { SpawnManager } from './SpawnManager.js'
import { MatchManager } from './MatchManager.js'

const makeEnemy = (id, alive = true) => ({
  id, alive, balloons: 1, state: 'flying',
  x: 100, y: 100, width: 20, height: 30,
  eliminate() { this.alive = false },
})

describe('SpawnManager', () => {
  let sm
  let mm

  beforeEach(() => {
    sm = new SpawnManager()
    sm.setPlatforms([{ x: 1000, y: 600, w: 120, h: 24 }])
    sm.setZoneSystem({ zoneCenterX: 1200, zoneCenterY: 900, zoneRadius: 800 })
    mm = new MatchManager()
  })

  it('generateInitialEnemies creates maxAliveAI count when difficulty set', () => {
    sm.setDifficulty({ allowBerserker: false, maxAliveAI: 4 })
    const e = sm.generateInitialEnemies()
    expect(e.length).toBe(4)
  })

  it('generateInitialEnemies clamps to TOTAL_ENTITIES-1 as upper bound', () => {
    sm.setDifficulty({ allowBerserker: false, maxAliveAI: 999 })
    const e = sm.generateInitialEnemies()
    expect(e.length).toBeLessThanOrEqual(19)
  })

  it('queueRespawn only enqueues if elapsed < 30', () => {
    const e = makeEnemy('e1')
    sm.elapsed = 25
    sm.queueRespawn(e)
    expect(sm.getQueueLength()).toBe(1)
    sm.elapsed = 30
    sm.queueRespawn(e)
    expect(sm.getQueueLength()).toBe(1) // 不再入队
  })

  it('setDifficulty updates berserker/maxAlive flags', () => {
    sm.setDifficulty({ allowBerserker: true, maxAliveAI: 6 })
    // 多次生成，应出现 berserker（概率性，放大样本）
    let dist
    const counts = {}
    for (let i = 0; i < 400; i++) {
      const e = sm.generateInitialEnemies()
      e.forEach(en => { counts[en.typeKey] = (counts[en.typeKey] || 0) + 1 })
    }
    expect(counts.berserker).toBeGreaterThan(0)
  })

  it('_pickType excludes berserker when allowBerserker=false', () => {
    sm.setDifficulty({ allowBerserker: false, maxAliveAI: 10 })
    // 分布已过滤：多次生成都不应出现 berserker
    for (let i = 0; i < 200; i++) {
      const e = sm.generateInitialEnemies()
      e.forEach(en => expect(en.typeKey).not.toBe('berserker'))
    }
  })

  it('maintain spawns new enemy when alive count below maxAliveAI and interval elapsed', () => {
    sm.setDifficulty({ allowBerserker: false, maxAliveAI: 5 })
    const alive = [makeEnemy('a'), makeEnemy('b')] // 2 < 5，应补员
    mm.aliveEntities = alive
    sm.elapsed = 10
    sm._maintainTimer = 0 // 允许立即补
    sm.update(0.1, mm, () => alive)
    const justSpawned = alive.filter(e => e.id.startsWith('ai_m_'))
    expect(justSpawned.length).toBe(1)
  })

  it('maintain does NOT spawn when alive count >= maxAliveAI', () => {
    sm.setDifficulty({ allowBerserker: false, maxAliveAI: 2 })
    const alive = [makeEnemy('a'), makeEnemy('b')] // 2 == 2，不补
    mm.aliveEntities = alive
    sm.elapsed = 10
    sm._maintainTimer = 0
    sm.update(0.1, mm, () => alive)
    const justSpawned = alive.filter(e => e.id.startsWith('ai_m_'))
    expect(justSpawned.length).toBe(0)
  })

  it('maintain respects 2s interval (no burst spawn)', () => {
    sm.setDifficulty({ allowBerserker: false, maxAliveAI: 10 })
    const alive = [makeEnemy('a')]
    mm.aliveEntities = alive
    sm.elapsed = 10
    sm._maintainTimer = 0
    // 连续 3 帧 dt=0.1 不补过多
    sm.update(0.1, mm, () => alive)
    sm.update(0.1, mm, () => alive)
    sm.update(0.1, mm, () => alive)
    const spawned = alive.filter(e => e.id.startsWith('ai_m_'))
    expect(spawned.length).toBe(1) // 只补 1 个
  })

  it('respawn queue processes entry on 0.5s cadence', () => {
    sm.setDifficulty({ allowBerserker: false, maxAliveAI: 5 })
    const e = makeEnemy('q1')
    mm.aliveEntities = []
    sm.elapsed = 10
    sm.queueRespawn(e)
    // 推进到下一个 0.5s 边界
    sm.update(0.5, mm, () => [])
    expect(sm.getQueueLength()).toBe(0)
    expect(e.alive).toBe(true)
    expect(mm.aliveEntities.includes(e)).toBe(true)
  })
})
