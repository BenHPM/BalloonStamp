// src/main.js
import { GameEngine } from './engine/GameEngine.js'
import { Renderer } from './engine/Renderer.js'
import { PhysicsEngine } from './engine/PhysicsEngine.js'
import { Player } from './entities/Player.js'
import { PLATFORMS, PLAYER_CONFIG } from './config/entities.js'

const canvas = document.getElementById('game-canvas')
const engine = new GameEngine(canvas)
const renderer = new Renderer()
const physics = new PhysicsEngine()
physics.setPlatforms(PLATFORMS)
renderer.entityRenderer.prerenderEntity(PLAYER_CONFIG.color, PLAYER_CONFIG.balloonColor)

const player = new Player()
player.x = PLAYER_CONFIG.spawnX
player.y = PLAYER_CONFIG.spawnY

let totalTime = 0
engine.setState({
  enter(engine) { engine.handleResize() },
  fixedUpdate(dt) {
    engine.input.update()
    totalTime += dt
    if (player.alive) {
      physics.update(player, engine.input.state, dt)
      player.tick(dt, engine.input.state)
    }
    renderer.update(dt)
    engine.camera.follow(player.x + player.width / 2, player.y + player.height / 2)
  },
  render(ctx, camera) {
    renderer.render(ctx, camera, {
      player, enemies: [], aliveCount: 1, totalTime,
    })
  }
})

window.addEventListener('resize', () => engine.handleResize())
engine.handleResize()
engine.start()
