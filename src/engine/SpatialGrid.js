// src/engine/SpatialGrid.js
export class SpatialGrid {
  constructor(worldWidth, worldHeight, cellSize) {
    this.cellSize = cellSize
    this.cols = Math.ceil(worldWidth / cellSize)
    this.rows = Math.ceil(worldHeight / cellSize)
    this.cells = new Map()
  }

  _key(cx, cy) { return `${cx},${cy}` }

  insert(entity) {
    const x1 = Math.floor(entity.x / this.cellSize)
    const y1 = Math.floor(entity.y / this.cellSize)
    const x2 = Math.floor((entity.x + entity.width) / this.cellSize)
    const y2 = Math.floor((entity.y + entity.height) / this.cellSize)
    for (let cx = x1; cx <= x2; cx++) {
      for (let cy = y1; cy <= y2; cy++) {
        const key = this._key(cx, cy)
        if (!this.cells.has(key)) this.cells.set(key, [])
        this.cells.get(key).push(entity)
      }
    }
  }

  query(x, y, w, h) {
    const x1 = Math.max(0, Math.floor(x / this.cellSize))
    const y1 = Math.max(0, Math.floor(y / this.cellSize))
    const x2 = Math.min(this.cols - 1, Math.floor((x + w) / this.cellSize))
    const y2 = Math.min(this.rows - 1, Math.floor((y + h) / this.cellSize))
    const result = []
    const seen = new Set()
    for (let cx = x1; cx <= x2; cx++) {
      for (let cy = y1; cy <= y2; cy++) {
        const cell = this.cells.get(this._key(cx, cy))
        if (!cell) continue
        for (const e of cell) {
          if (!seen.has(e)) { seen.add(e); result.push(e) }
        }
      }
    }
    return result
  }

  clear() { this.cells.clear() }
}
