// src/engine/PhysicsEngine.test.js
import { describe, it, expect } from 'vitest'
import { PhysicsEngine } from './PhysicsEngine.js'
import { PHYS } from '../config/physics.js'

const noFlap = { moveX: 0, flap: false }
const flap = { moveX: 0, flap: true }

describe('PhysicsEngine', () => {
  it('applies gravity based on balloon count', () => {
    const phys = new PhysicsEngine()
    const entity = { x: 100, y: 100, vx: 0, vy: 0, balloons: 2, width: 20, height: 30, onGround: false }
    phys.update(entity, noFlap, 1/60)
    expect(entity.vy).toBeGreaterThan(0) // 下落
    expect(entity.vy).toBeCloseTo(720 / 60, 1)
  })

  it('flap sets upward velocity', () => {
    const phys = new PhysicsEngine()
    const entity = { x: 100, y: 100, vx: 0, vy: 0, balloons: 2, width: 20, height: 30, onGround: false, flapCooldown: 0 }
    phys.update(entity, flap, 1/60)
    expect(entity.vy).toBeLessThan(0) // 向上
  })

  it('zero balloons prevents flapping', () => {
    const phys = new PhysicsEngine()
    const entity = { x: 100, y: 100, vx: 0, vy: 0, balloons: 0, width: 20, height: 30, onGround: false, flapCooldown: 0 }
    phys.update(entity, flap, 1/60)
    expect(entity.vy).toBeGreaterThan(0) // 仍然下落
  })

  it('horizontal input sets acceleration', () => {
    const phys = new PhysicsEngine()
    const entity = { x: 100, y: 100, vx: 0, vy: 0, balloons: 2, width: 20, height: 30, onGround: false }
    phys.update(entity, { moveX: 1, flap: false }, 1/60)
    expect(entity.vx).toBeGreaterThan(0)
  })

  it('terminal velocity caps downward speed', () => {
    const phys = new PhysicsEngine()
    const entity = { x: 100, y: 100, vx: 0, vy: 99999, balloons: 0, width: 20, height: 30, onGround: false }
    phys.update(entity, noFlap, 1/60)
    expect(entity.vy).toBeLessThanOrEqual(PHYS.terminalVelocityDown)
  })

  it('substep integration lands a moderate-speed falling entity on thin platform without tunneling', () => {
    const phys = new PhysicsEngine()
    phys.setPlatforms([{ x: 0, y: 400, w: 400, h: 8 }])
    const entity = {
      x: 100, y: 340, vx: 0, vy: 400,
      balloons: 0, width: 20, height: 30, onGround: false,
    }
    for (let i = 0; i < 60; i++) {
      phys.update(entity, noFlap, 1 / 60)
      if (entity.onGround) break
    }
    expect(entity.onGround).toBe(true)
    expect(entity.y).toBeCloseTo(400 - 30, 5)
    expect(entity.vy).toBe(0)
  })

  it('entity falls through when no platform is beneath', () => {
    const phys = new PhysicsEngine()
    phys.setPlatforms([{ x: 0, y: 200, w: 400, h: 8 }])
    const entity = {
      x: 500, y: 180, vx: 0, vy: 5000, balloons: 0, width: 20, height: 30, onGround: false,
    }
    phys.update(entity, noFlap, 1/60)
    expect(entity.onGround).toBe(false)
    expect(entity.y).toBeGreaterThan(180)
  })

  it('ground friction stops horizontal drift quickly', () => {
    const phys = new PhysicsEngine()
    phys.setPlatforms([{ x: 0, y: 200, w: 400, h: 8 }])
    const entity = {
      x: 100, y: 170, vx: 200, vy: 0, balloons: 2, width: 20, height: 30, onGround: true,
    }
    // 不给输入，地面摩擦应快速衰减 vx
    for (let i = 0; i < 30; i++) {
      phys.update(entity, noFlap, 1 / 60)
    }
    expect(Math.abs(entity.vx)).toBeLessThan(5) // 0.5 秒后几乎停住
  })
})
