// src/engine/PhysicsEngine.test.js
import { describe, it, expect } from 'vitest'
import { PhysicsEngine } from './PhysicsEngine.js'
import { PHYS } from '../config/physics.js'

describe('PhysicsEngine', () => {
  it('applies gravity based on balloon count', () => {
    const phys = new PhysicsEngine()
    const entity = { x: 100, y: 100, vx: 0, vy: 0, balloons: 2, width: 20, height: 30, onGround: false }
    phys.update(entity, { moveX: 0, flapJustPressed: false }, 1/60)
    expect(entity.vy).toBeGreaterThan(0) // 下落
    // 2 气球重力 = 1000
    expect(entity.vy).toBeCloseTo(1000 / 60, 1)
  })

  it('flap sets upward velocity', () => {
    const phys = new PhysicsEngine()
    const entity = { x: 100, y: 100, vx: 0, vy: 0, balloons: 2, width: 20, height: 30, onGround: false, flapCooldown: 0 }
    phys.update(entity, { moveX: 0, flapJustPressed: true }, 1/60)
    expect(entity.vy).toBeLessThan(0) // 向上
  })

  it('zero balloons prevents flapping', () => {
    const phys = new PhysicsEngine()
    const entity = { x: 100, y: 100, vx: 0, vy: 0, balloons: 0, width: 20, height: 30, onGround: false, flapCooldown: 0 }
    phys.update(entity, { moveX: 0, flapJustPressed: true }, 1/60)
    expect(entity.vy).toBeGreaterThan(0) // 仍然下落
  })

  it('horizontal input sets acceleration', () => {
    const phys = new PhysicsEngine()
    const entity = { x: 100, y: 100, vx: 0, vy: 0, balloons: 2, width: 20, height: 30, onGround: false }
    phys.update(entity, { moveX: 1, flapJustPressed: false }, 1/60)
    expect(entity.vx).toBeGreaterThan(0)
  })

  it('terminal velocity caps downward speed', () => {
    const phys = new PhysicsEngine()
    const entity = { x: 100, y: 100, vx: 0, vy: 99999, balloons: 0, width: 20, height: 30, onGround: false }
    phys.update(entity, { moveX: 0, flapJustPressed: false }, 1/60)
    expect(entity.vy).toBeLessThanOrEqual(PHYS.terminalVelocityDown)
  })
})
