// src/systems/AISystem.js
export class AISystem {
  update(enemies, player, dt, physicsEngine, context = {}) {
    const allAlive = enemies.filter(e => e.alive)
    const difficulty = context.difficulty || {}
    enemies.forEach(enemy => {
      if (!enemy.alive) return
      const ctx = {
        allEnemies: allAlive,
        lightningBolts: context.lightningBolts || [],
        whale: context.whale || null,
        zoneCenterX: context.zoneCenterX || null,
        zoneCenterY: context.zoneCenterY || null,
        zoneRadius: context.zoneRadius || null,
        difficulty,
      }
      const input = enemy.decideAI(player, dt, ctx)
      physicsEngine.update(enemy, input, dt)
      enemy.tick(dt, input)
    })
  }
}
