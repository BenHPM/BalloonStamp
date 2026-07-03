// src/systems/CollisionSystem.test.js
import { describe, it, expect } from 'vitest'
import { CollisionSystem } from './CollisionSystem.js'

describe('CollisionSystem', () => {
  const makeEntity = (x, y, vx = 0, vy = 0, balloons = 2) => ({
    x, y, width: 28, height: 36, vx, vy, balloons, alive: true,
    onGround: false, facingRight: true, animFrame: 0,
  })

  it('detects stomp when attacker is above and falling', () => {
    const cs = new CollisionSystem()
    const attacker = makeEntity(100, 100, 0, 200, 2) // bottom = 136
    const victim = makeEntity(100, 130, 0, 0, 2)     // top = 130 < 136, overlap
    const result = cs.checkCollision(attacker, victim)
    expect(result.type).toBe('stomp')
    expect(result.attacker).toBe(attacker)
  })

  it('detects side collision when not from above', () => {
    const cs = new CollisionSystem()
    const a = makeEntity(100, 100, 200, 0, 2)
    const b = makeEntity(110, 100, -200, 0, 2)
    const result = cs.checkCollision(a, b)
    expect(result.type).toBe('side')
  })

  it('detects kick-kill when victim has 0 balloons on ground', () => {
    const cs = new CollisionSystem()
    const attacker = makeEntity(100, 100, 0, 200, 2) // bottom = 136
    const victim = makeEntity(100, 130, 0, 0, 0)     // top = 130, overlap
    victim.onGround = true
    const result = cs.checkCollision(attacker, victim)
    expect(result.type).toBe('kick')
  })

  it('returns null when no overlap', () => {
    const cs = new CollisionSystem()
    const a = makeEntity(0, 0)
    const b = makeEntity(500, 500)
    expect(cs.checkCollision(a, b)).toBeNull()
  })
})
