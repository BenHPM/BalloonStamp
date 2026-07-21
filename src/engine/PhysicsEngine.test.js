// src/engine/PhysicsEngine.test.js
import { describe, it, expect } from 'vitest'
import { PhysicsEngine } from './PhysicsEngine.js'
import { PHYS } from '../config/physics.js'

const noFlap = { moveX: 0, flap: false }
const flap = { moveX: 0, flap: true }

describe('PhysicsEngine', () => {
  it('applies net gravity (gravity - buoyancy) based on balloon count', () => {
    const phys = new PhysicsEngine()
    const entity = { x: 100, y: 100, vx: 0, vy: 0, balloons: 2, width: 20, height: 30, onGround: false }
    phys.update(entity, noFlap, 1/60)
    expect(entity.vy).toBeGreaterThan(0) // 2气球仍有净下落
    // 净加速度 = gravity - buoyancy[2] = 650 - 530 = 120 px/s²
    expect(entity.vy).toBeCloseTo(120 / 60, 1)
  })

  it('0 balloons: full gravity with no buoyancy', () => {
    const phys = new PhysicsEngine()
    const entity = { x: 100, y: 100, vx: 0, vy: 0, balloons: 0, width: 20, height: 30, onGround: false }
    phys.update(entity, noFlap, 1/60)
    expect(entity.vy).toBeGreaterThan(0)
    // 净加速度 = 650 - 0 = 650
    expect(entity.vy).toBeCloseTo(650 / 60, 1)
  })

  it('5 balloons: buoyancy exceeds gravity (gentle float upward)', () => {
    const phys = new PhysicsEngine()
    const entity = { x: 100, y: 100, vx: 0, vy: 0, balloons: 5, width: 20, height: 30, onGround: false }
    phys.update(entity, noFlap, 1/60)
    // 净加速度 = 650 - 750 = -100（浮力超过重力，轻微上升趋势）
    expect(entity.vy).toBeLessThan(0) // 微弱上升
    expect(entity.vy).toBeCloseTo(-100 / 60, 1)
  })

  it('flap adds upward impulse (additive, not set)', () => {
    const phys = new PhysicsEngine()
    const entity = { x: 100, y: 100, vx: 0, vy: 100, balloons: 2, width: 20, height: 30, onGround: false, flapCooldown: 0 }
    phys.update(entity, flap, 1/60)
    // 加法脉冲 + 同帧重力：
    // vy = 100 + (gravity - buoyancy[2]) * dt + flapImpulse[2]
    //    = 100 + (650-530)/60 + (-170) = 100 + 2.0 - 170 = -68.0
    expect(entity.vy).toBeLessThan(0) // 向上
    expect(entity.vy).toBeCloseTo(100 + (650 - 530) / 60 + (-170), 1) // 加法而非覆盖
  })

  it('flap respects terminal velocity up', () => {
    const phys = new PhysicsEngine()
    const entity = { x: 100, y: 100, vx: 0, vy: -590, balloons: 2, width: 20, height: 30, onGround: false, flapCooldown: 0 }
    phys.update(entity, flap, 1/60)
    // -590 + (-200) = -790，但被终速 -600 截断
    expect(entity.vy).toBeGreaterThanOrEqual(-PHYS.terminalVelocityUp)
  })

  it('zero balloons prevents flapping', () => {
    const phys = new PhysicsEngine()
    const entity = { x: 100, y: 100, vx: 0, vy: 0, balloons: 0, width: 20, height: 30, onGround: false, flapCooldown: 0 }
    phys.update(entity, flap, 1/60)
    expect(entity.vy).toBeGreaterThan(0) // 仍然下落（全重力）
  })

  it('horizontal input sets acceleration', () => {
    const phys = new PhysicsEngine()
    const entity = { x: 100, y: 100, vx: 0, vy: 0, balloons: 2, width: 20, height: 30, onGround: false }
    phys.update(entity, { moveX: 1, flap: false }, 1/60)
    expect(entity.vx).toBeGreaterThan(0)
    expect(entity.vx).toBeCloseTo(500 / 60, 1) // moveAccel=500
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

  it('air friction preserves most horizontal momentum (coast friction)', () => {
    const phys = new PhysicsEngine()
    const entity = {
      x: 100, y: 100, vx: 200, vy: 0, balloons: 2, width: 20, height: 30, onGround: false,
    }
    // 不给输入，空中摩擦应缓慢衰减
    for (let i = 0; i < 60; i++) {
      phys.update(entity, noFlap, 1 / 60)
    }
    // 0.993^60 ≈ 0.66，1秒后仍保留约 66% 速度
    expect(Math.abs(entity.vx)).toBeGreaterThan(100) // 远大于旧版的 ~17
    expect(Math.abs(entity.vx)).toBeLessThan(200) // 但确实在衰减
  })

  it('flap cooldown prevents rapid re-flapping', () => {
    const phys = new PhysicsEngine()
    const entity = { x: 100, y: 100, vx: 0, vy: 0, balloons: 2, width: 20, height: 30, onGround: false, flapCooldown: 0 }
    // 第一次拍打
    phys.update(entity, flap, 1/60)
    expect(entity.flapCooldown).toBe(PHYS.flapCooldown)
    // 冷却中再次拍打不应生效（只有重力/浮力作用）
    entity.vy = 0 // 重置以便观察
    phys.update(entity, flap, 1/60)
    // 只有净重力作用：(650-530)/60 ≈ 2.0，拍打冲量不应叠加
    expect(entity.vy).toBeCloseTo((650 - 530) / 60, 1) // 仅重力，无拍打冲量
  })

  it('stomp bounce is additive impulse', () => {
    const phys = new PhysicsEngine()
    const entity = { x: 100, y: 100, vx: 0, vy: 50, balloons: 2, width: 20, height: 30, onGround: false }
    phys.applyStompBounce(entity)
    // 加法脉冲：vy = 50 + (-170 * 0.75) = 50 - 127.5 = -77.5
    expect(entity.vy).toBeLessThan(0) // 向上弹跳
    expect(entity.vy).toBeCloseTo(50 + (-170 * 0.75), 1)
  })
})
