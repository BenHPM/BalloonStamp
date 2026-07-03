// src/systems/ScoreSystem.js
export class ScoreSystem {
  constructor() {
    this.scores = new Map() // entityId → score
    this.eliminations = new Map() // entityId → count
  }

  addStompScore(entity) {
    const id = entity.id || entity
    const current = this.scores.get(id) || 0
    this.scores.set(id, current + 200)
  }

  addEliminationScore(entity) {
    const id = entity.id || entity
    const current = this.scores.get(id) || 0
    const elims = this.eliminations.get(id) || 0
    this.eliminations.set(id, elims + 1)
    this.scores.set(id, current + 300)
  }

  getScore(entity) {
    return this.scores.get(entity.id || entity) || 0
  }

  getEliminations(entity) {
    return this.eliminations.get(entity.id || entity) || 0
  }
}
