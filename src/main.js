// src/main.js
import { GameEngine } from './engine/GameEngine.js'
import { DebugRenderer } from './engine/Renderer.js'
import { PhysicsEngine } from './engine/PhysicsEngine.js'
import { Player } from './entities/Player.js'
import { PLATFORMS, PLAYER_CONFIG } from './config/entities.js'
import { WORLD } from './config/world.js'

const canvas = document.getElementById('game-canvas')
const engine = new GameEngine(canvas)
const renderer = new DebugRenderer()
const physics = new PhysicsEngine()
physics.setPlatforms(PLATFORMS)

const player = new Player()
player.x = PLAYER_CONFIG.spawnX
player.y = PLAYER_CONFIG.spawnY

engine.setState({
  enter(engine) { engine.handleResize() },
  fixedUpdate(dt) {
    engine.input.update()
    if (player.alive) {
      physics.update(player, engine.input.state, dt)
      player.tick(dt, engine.input.state)
      // 水域检测
      if (physics.isSubmerged(player) && player.balloons === 0) {
        player.eliminate()
        console.log('玩家被水域淘汰')
      }
    }
    engine.camera.follow(player.x + player.width / 2, player.y + player.height / 2)
  },
  render(ctx, camera) {
    renderer.render(ctx, camera, 0, [player, ...PLATFORMS.map(p => ({...p, color: 'rgba(255,255,255,0.8)', width: p.w, height: p.h}))])
  }
})

window.addEventListener('resize', () => engine.handleResize())
engine.handleResize()
engine.start()
