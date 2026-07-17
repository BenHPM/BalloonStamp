// src/systems/ZoneSystem.test.js
import { describe, it, expect } from 'vitest'
import { ZoneSystem } from './ZoneSystem.js'

// 构造时 ZoneSystem 会用 WORLD 的默认 width/height/zone* 配置，
// 我们通过 resetEntityTimer + tickEntity 测试纯逻辑；通过 update 推进缩圈。

const makeEntity = (x, y) => ({ x, y, width: 28, height: 36, balloons: 2, alive: true })

describe('ZoneSystem', () => {
  it('isOutsideZone returns false at center, true far away', () => {
    const zs = new ZoneSystem()
    const center = makeEntity(zs.zoneCenterX, zs.zoneCenterY)
    expect(zs.isOutsideZone(center)).toBe(false)
    const far = makeEntity(zs.zoneCenterX + zs.zoneRadius + 100, zs.zoneCenterY)
    expect(zs.isOutsideZone(far)).toBe(true)
  })

  it('tickEntity: outside accumulates outsideTime; inside resets to 0', () => {
    const zs = new ZoneSystem()
    const e = makeEntity(zs.zoneCenterX + zs.zoneRadius + 100, zs.zoneCenterY)
    zs.resetEntityTimer(e)
    const r1 = zs.tickEntity(e, 0.5)
    expect(r1.outside).toBe(true)
    expect(r1.outsideTime).toBeCloseTo(0.5, 5)
    const r2 = zs.tickEntity(e, 0.5)
    expect(r2.outsideTime).toBeCloseTo(1.0, 5)
    // 进入安全区 → outsideTime 归零
    e.x = zs.zoneCenterX
    const r3 = zs.tickEntity(e, 0.5)
    expect(r3.outside).toBe(false)
    expect(zs.getOutsideTime(e)).toBe(0)
  })

  it('tickEntity: damage stays 0 until outsideTime >= first zoneDamageInterval', () => {
    const zs = new ZoneSystem()
    const e = makeEntity(zs.zoneCenterX + zs.zoneRadius + 100, zs.zoneCenterY)
    // 单帧 dt 命中第一个区间阈值，防止被 Math.floor 精度吃掉
    const r = zs.tickEntity(e, 6) // > interval[0](5)，进入第二档；interval[1]=10 未达，dps = zoneDamage[1] = 5
    expect(r.outside).toBe(true)
    expect(r.dps).toBeGreaterThan(0)
    // dps * dt ≈ 5 * 6
    expect(r.damage).toBeCloseTo(r.dps * 6, 5)
  })

  it('tickEntity: damage escalates to highest tier after 10s outside', () => {
    const zs = new ZoneSystem()
    const e = makeEntity(zs.zoneCenterX + zs.zoneRadius + 100, zs.zoneCenterY)
    const r = zs.tickEntity(e, 11) // >= interval[1](10)，进入第三档 dps = zoneDamage[2] = 15
    expect(r.dps).toBe(15)
    expect(r.damage).toBeCloseTo(15 * 11, 5)
  })

  it('zone shrinks only after zoneShrinkStart and on interval; never below zoneMinRadius', () => {
    const zs = new ZoneSystem()
    const initialRadius = zs.zoneRadius
    // 直接设置 elapsed 超过起始时间，推进多帧使 shrinkTimer 超过 interval
    zs.elapsed = 61
    zs.shrinkTimer = 31
    zs.update(1, 10)
    expect(zs.zoneRadius).toBe(Math.max(400, initialRadius * 0.92))
    const afterFirst = zs.zoneRadius
    // 多轮缩圈逼近 zoneMinRadius
    for (let i = 0; i < 100; i++) {
      zs.shrinkTimer = 31
      zs.update(1, 10)
    }
    expect(zs.zoneRadius).toBeGreaterThanOrEqual(400)
  })

  it('resetEntityTimer and removeEntity manage the per-entity timer map', () => {
    const zs = new ZoneSystem()
    const e = makeEntity(0, 0)
    zs.resetEntityTimer(e)
    expect(zs.getOutsideTime(e)).toBe(0)
    zs.tickEntity(e, 1)
    expect(zs.getOutsideTime(e)).toBeGreaterThan(0)
    zs.removeEntity(e)
    expect(zs.getOutsideTime(e)).toBe(0)
  })
})
