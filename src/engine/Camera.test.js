// src/engine/Camera.test.js
import { describe, it, expect } from 'vitest'
import { Camera } from './Camera.js'

describe('Camera', () => {
  it('follows target with lerp', () => {
    const cam = new Camera(2400, 1800, 720, 1280)
    cam.x = 0; cam.y = 0
    cam.follow(1000, 1000)
    // targetCamX = 1000 - 720/2 = 640, cam.x = 640 * 0.1 = 64
    expect(cam.x).toBeCloseTo(64, 0)
    // targetCamY = 1000 - 1280*2/3 ≈ 146.67, cam.y = 146.67 * 0.1 ≈ 14.67
    expect(cam.y).toBeCloseTo(14.67, 0)
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
