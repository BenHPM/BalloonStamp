// src/engine/SpatialGrid.test.js
import { describe, it, expect } from 'vitest'
import { SpatialGrid } from './SpatialGrid.js'

describe('SpatialGrid', () => {
  it('inserts and queries nearby entities', () => {
    const grid = new SpatialGrid(2400, 1800, 120)
    grid.insert({ id: 1, x: 100, y: 100, width: 20, height: 20 })
    grid.insert({ id: 2, x: 200, y: 200, width: 20, height: 20 })
    grid.insert({ id: 3, x: 1000, y: 1000, width: 20, height: 20 })

    const nearby = grid.query(90, 90, 130, 130)
    expect(nearby.map(e => e.id).sort()).toEqual([1, 2])
  })

  it('returns empty for empty area', () => {
    const grid = new SpatialGrid(2400, 1800, 120)
    expect(grid.query(0, 0, 100, 100)).toEqual([])
  })

  it('clears between frames', () => {
    const grid = new SpatialGrid(2400, 1800, 120)
    grid.insert({ id: 1, x: 50, y: 50, width: 10, height: 10 })
    grid.clear()
    expect(grid.query(0, 0, 100, 100)).toEqual([])
  })
})
