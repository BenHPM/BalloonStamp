// src/engine/Camera.test.js
import { describe, it, expect } from 'vitest'
import { Camera } from './Camera.js'

describe('Camera', () => {
  it('follows target with lerp', () => {
    const cam = new Camera(2400, 1800, 720, 1280)
    cam.x = 0; cam.y = 0
    // 帧率补偿：单步增量极小，需模拟多帧
    for (let i = 0; i < 120; i++) cam.follow(1000, 1000, 1/60)
    expect(cam.x).toBeGreaterThan(500)
    expect(cam.x).toBeLessThan(700)
    expect(cam.y).toBeGreaterThan(100)
    expect(cam.y).toBeLessThan(200)
  })

  it('clamps to world bounds', () => {
    const cam = new Camera(2400, 1800, 720, 1280)
    cam.follow(0, 0) // 玩家在左上角
    expect(cam.x).toBeGreaterThanOrEqual(0)
    expect(cam.y).toBeGreaterThanOrEqual(0)
  })

  it('clamps to right/bottom bounds', () => {
    const cam = new Camera(2400, 1800, 720, 1280)
    cam.follow(2400, 1800)
    expect(cam.x + 720).toBeLessThanOrEqual(2400 + 1)
    expect(cam.y + 1280).toBeLessThanOrEqual(1800 + 1)
  })
})
