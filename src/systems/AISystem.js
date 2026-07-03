// src/systems/AISystem.js
export class AISystem {
  update(enemies, player, dt, physicsEngine) {
    enemies.forEach(enemy => {
      if (!enemy.alive) return
      const input = enemy.decideAI(player, dt)
      physicsEngine.update(enemy, input, dt)
      enemy.tick(dt, input)
    })
  }
}
