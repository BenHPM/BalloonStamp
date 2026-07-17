// src/entities/BalloonEntity.test.js
import { describe, it, expect } from 'vitest'
import { BalloonEntity } from './BalloonEntity.js'
import { Player } from './Player.js'
import { EntityState } from './EntityState.js'
import { PHYS } from '../config/physics.js'

describe('BalloonEntity (base)', () => {
  it('starts in FLYING state with given balloons and alive=true', () => {
    const e = new BalloonEntity(2)
    expect(e.state).toBe(EntityState.FLYING)
    expect(e.balloons).toBe(2)
    expect(e.alive).toBe(true)
    expect(e.maxBalloons).toBe(PHYS.maxBalloons)
  })

  it('loseBalloon decrements and clamps at 0 (never negative)', () => {
    const e = new BalloonEntity(1)
    e.loseBalloon()
    expect(e.balloons).toBe(0)
    e.loseBalloon() // 再次掉球不应为负
    expect(e.balloons).toBe(0)
  })

  it('gainBalloon increments and clamps at maxBalloons', () => {
    const e = new BalloonEntity(0)
    e.maxBalloons = 3
    e.gainBalloon()
    e.gainBalloon()
    e.gainBalloon()
    expect(e.balloons).toBe(3)
    e.gainBalloon() // 不应超过上限
    expect(e.balloons).toBe(3)
  })

  it('eliminate() sets alive=false and state=ELIMINATED', () => {
    const e = new BalloonEntity(2)
    e.eliminate()
    expect(e.alive).toBe(false)
    expect(e.state).toBe(EntityState.ELIMINATED)
  })

  it('_updateState refuses to leave ELIMINATED (terminal state)', () => {
    const e = new BalloonEntity(0)
    e.eliminate()
    e.balloons = 2
    e._updateState()
    expect(e.state).toBe(EntityState.ELIMINATED)
    expect(e.alive).toBe(false)
  })

  it('0 balloons + onGround → GROUNDED; 0 balloons + airborne → FALLING', () => {
    const grounded = new BalloonEntity(2)
    grounded.loseBalloon()
    grounded.loseBalloon()
    grounded.onGround = true
    grounded._updateState()
    expect(grounded.state).toBe(EntityState.GROUNDED)

    const falling = new BalloonEntity(1)
    falling.loseBalloon()
    falling.onGround = false
    falling._updateState()
    expect(falling.state).toBe(EntityState.FALLING)
  })

  it('still on ground for inflateStillTime transitions GROUNDED→INFLATING then recovers to FLYING (no deadlock)', () => {
    const e = new BalloonEntity(2)
    e.loseBalloon()
    e.loseBalloon() // 0 气球
    e.onGround = true
    e._updateState()
    expect(e.state).toBe(EntityState.GROUNDED)
    const input = { moveX: 0 }
    // 累积 stillTimer 直到触发 INFLATING
    let guard = 0
    while (e.state === EntityState.GROUNDED && guard < 1000) {
      e.vx = 0
      e.tick(1 / 60, input)
      guard++
    }
    expect(e.state).toBe(EntityState.INFLATING)
    expect(e.inflateTimer).toBeCloseTo(PHYS.inflateDuration, 5)
    // 推进 > inflateDuration 帧：修复后 INFLATING 保位完成，应落到 FLYING
    guard = 0
    while (e.state === EntityState.INFLATING && guard < 200) {
      e.tick(1 / 60, input)
      guard++
    }
    expect(e.state).toBe(EntityState.FLYING)
    expect(e.balloons).toBe(PHYS.inflateRecoverTo)
  })

  it('stops accumulating stillTimer during INFLATING (still input does not reset)', () => {
    const e = new BalloonEntity(2)
    e.loseBalloon()
    e.loseBalloon()
    e.onGround = true
    e._updateState()
    const input = { moveX: 0 }
    let guard = 0
    while (e.state === EntityState.GROUNDED && guard < 1000) {
      e.vx = 0
      e.tick(1 / 60, input)
      guard++
    }
    expect(e.state).toBe(EntityState.INFLATING)
    const timerBefore = e.inflateTimer
    e.tick(1 / 60, input)
    expect(e.state).toBe(EntityState.INFLATING)
    expect(e.inflateTimer).toBeLessThan(timerBefore)
  })

  it('gainBalloon recovers a grounded 0-balloon entity back to FLYING via _updateState', () => {
    const e = new BalloonEntity(2)
    e.loseBalloon()
    e.loseBalloon()
    e.onGround = true
    e._updateState()
    expect(e.state).toBe(EntityState.GROUNDED)
    e.gainBalloon()
    expect(e.balloons).toBe(1)
    expect(e.state).toBe(EntityState.FLYING)
  })

  it('moving on ground resets stillTimer, blocking INFLATING', () => {
    const e = new BalloonEntity(2)
    e.loseBalloon()
    e.loseBalloon()
    e.onGround = true
    e._updateState()
    const inputStill = { moveX: 0 }
    for (let i = 0; i < Math.floor(PHYS.inflateStillTime * 60 * 0.8); i++) {
      e.vx = 0
      e.tick(1 / 60, inputStill)
    }
    expect(e.stillTimer).toBeGreaterThan(0)
    e.vx = 50
    e.tick(1 / 60, { moveX: 1 })
    expect(e.stillTimer).toBe(0)
    expect(e.state).toBe(EntityState.GROUNDED)
  })

  it('justLostAllBalloons is set when loseBalloon reaches 0, cleared by clearFrameFlags', () => {
    const e = new BalloonEntity(1)
    e.loseBalloon()
    expect(e.balloons).toBe(0)
    expect(e.justLostAllBalloons).toBe(true)
    e.clearFrameFlags()
    expect(e.justLostAllBalloons).toBe(false)
  })

  it('setFinalRank stores final rank; 0 means undetermined', () => {
    const e = new BalloonEntity(2)
    expect(e.finalRank).toBe(0)
    e.setFinalRank(3)
    expect(e.finalRank).toBe(3)
    e.setFinalRank(0)
    expect(e.finalRank).toBe(0)
  })
})

describe('Player (maxBalloonsAchieved high-water)', () => {
  it('tracks maxBalloonsAchieved high-water mark, which does not regress on loss', () => {
    const p = new Player()
    p.maxBalloons = 5
    const initial = p.maxBalloonsAchieved
    p.gainBalloon()
    p.gainBalloon()
    expect(p.maxBalloonsAchieved).toBe(initial + 2)
    p.loseBalloon()
    p.loseBalloon()
    expect(p.maxBalloonsAchieved).toBe(initial + 2) // 历史最高不回落
  })
})
