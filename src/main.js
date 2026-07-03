// src/main.js
import { GameEngine } from './engine/GameEngine.js'
import { DebugRenderer } from './engine/Renderer.js'
import { WORLD } from './config/world.js'

const canvas = document.getElementById('game-canvas')
const engine = new GameEngine(canvas)

const renderer = new DebugRenderer()

// 临时测试实体
const testEntity = {
  x: 1200, y: 200, width: 30, height: 40, color: '#4DA6FF',
  vx: 0, vy: 0
}

// 临时状态
engine.setState({
  enter(engine) { engine.handleResize() },
  fixedUpdate(dt) {
    // 键盘移动测试实体
    engine.input.update()
    const speed = 300
    testEntity.x += engine.input.state.moveX * speed * dt
    if (engine.input.state.flapJustPressed) testEntity.vy = -400
    testEntity.vy += 800 * dt
    testEntity.y += testEntity.vy * dt
    // 边界
    testEntity.x = Math.max(0, Math.min(WORLD.width - testEntity.width, testEntity.x))
    testEntity.y = Math.max(0, Math.min(WORLD.height - testEntity.height, testEntity.y))
    // 相机跟随
    engine.camera.follow(testEntity.x + testEntity.width / 2, testEntity.y + testEntity.height / 2)
  },
  render(ctx, camera) {
    renderer.render(ctx, camera, 0, [testEntity])
  }
})

window.addEventListener('resize', () => engine.handleResize())
engine.handleResize()
engine.start()
