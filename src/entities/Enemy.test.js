// src/entities/Enemy.test.js
import { describe, it, expect } from 'vitest'
import { Enemy } from './Enemy.js'

describe('Enemy AI', () => {
  it('decideAI returns no move when eliminated or inflating', () => {
    const e = new Enemy('chaser', 100, 100)
    e.state = 'eliminated'
    const r = e.decideAI(null, 0.016, {})
    expect(r).toEqual({ moveX: 0, flap: false })
  })

  it('outside zone triggers zone-return as top priority (move toward center)', () => {
    const e = new Enemy('chaser', 100, 100)
    const ctx = { allEnemies: [], zoneCenterX: 1200, zoneCenterY: 900, zoneRadius: 100 }
    // 实体在 zone 左侧外部，期望向右移动
    const r = e.decideAI(null, 0.5, ctx) // 大 dt 确保跨过 decision interval
    expect(r.moveX).toBe(1)
  })

  it('danger altitude triggers flap during decision interval (safety behavior)', () => {
    const e = new Enemy('chaser', 100, 1600) // 接近 waterY=1700
    e._decisionInterval = 0.5
    e.aiTimer = 0.1 // 还在决策间隔内，不重新决策
    const r = e.decideAI(null, 0.016, { zoneCenterX: 100, zoneCenterY: 100, zoneRadius: 1000 })
    expect(r.flap).toBe(true) // 危险高度应保底拍打
  })

  it('safe altitude does NOT flap during decision interval', () => {
    const e = new Enemy('chaser', 100, 500)
    e._decisionInterval = 0.5
    e.aiTimer = 0.1
    const r = e.decideAI(null, 0.016, { zoneCenterX: 1200, zoneCenterY: 900, zoneRadius: 500 })
    expect(r.flap).toBe(false)
  })
})
