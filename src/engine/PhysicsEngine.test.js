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
    // 2 气球重力 = 720
    expect(entity.vy).toBeCloseTo(720 / 60, 1)
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

  it('substep integration lands a moderate-speed falling entity on thin platform without tunneling', () => {
    const phys = new PhysicsEngine()
    // 薄平台：y=400，厚度 8
    phys.setPlatforms([{ x: 0, y: 400, w: 400, h: 8 }])
    // 实体在平台上方（bottom=372），以 moderate 速度下落，验证子步不破坏正常着陆
    const entity = {
      x: 100, y: 340, vx: 0, vy: 400,
      balloons: 0, width: 20, height: 30, onGround: false,
    }
    for (let i = 0; i < 60; i++) {
      phys.update(entity, { moveX: 0, flapJustPressed: false }, 1 / 60)
      if (entity.onGround) break
    }
    expect(entity.onGround).toBe(true)
    expect(entity.y).toBeCloseTo(400 - 30, 5)
    expect(entity.vy).toBe(0)
  })

  it('entity falls through when no platform is beneath', () => {
    const phys = new PhysicsEngine()
    phys.setPlatforms([{ x: 0, y: 200, w: 400, h: 8 }])
    // 实体在平台右侧之外，应直接下落穿过
    const entity = {
      x: 500, y: 180, vx: 0, vy: 5000, balloons: 0, width: 20, height: 30, onGround: false,
    }
    phys.update(entity, { moveX: 0, flapJustPressed: false }, 1/60)
    expect(entity.onGround).toBe(false)
    expect(entity.y).toBeGreaterThan(180)
  })
})
