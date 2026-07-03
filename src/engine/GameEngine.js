// src/engine/GameEngine.js
import { PHYS } from '../config/physics.js'
import { WORLD } from '../config/world.js'
import { Camera } from './Camera.js'
import { InputManager } from './InputManager.js'
import { SpatialGrid } from './SpatialGrid.js'

export class GameEngine {
  constructor(canvas) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.camera = new Camera(WORLD.width, WORLD.height, WORLD.viewPortrait.w, WORLD.viewPortrait.h)
    this.input = new InputManager(canvas)
    this.spatialGrid = new SpatialGrid(WORLD.width, WORLD.height, WORLD.cellSize)
    this.running = false
    this.lastTime = 0
    this.accumulator = 0
    this.fixedStep = 1 / 60 // 秒
    this.state = null // 当前游戏状态对象
    this.entityManager = null // 由 PlayState 设置
    this.renderer = null // 由 main.js 设置
    this.physics = null // 由 main.js 设置
    this._renderScale = 1
    this._screenOffsetX = 0
    this._screenOffsetY = 0
  }

  setState(state) {
    if (this.state && this.state.exit) this.state.exit(this)
    this.state = state
    if (state.enter) state.enter(this)
  }

  start() {
    this.running = true
    this.lastTime = performance.now() / 1000
    this._loop()
  }

  _loop() {
    if (!this.running) return
    const now = performance.now() / 1000
    let dt = now - this.lastTime
    this.lastTime = now
    if (dt > 0.1) dt = 0.1 // 防止切标签暴走

    this.accumulator += dt
    while (this.accumulator >= this.fixedStep) {
      if (this.state && this.state.fixedUpdate) this.state.fixedUpdate(this.fixedStep)
      this.accumulator -= this.fixedStep
    }

    if (this.state && this.state.render) {
      this.ctx.save()
      this.ctx.translate(this._screenOffsetX || 0, this._screenOffsetY || 0)
      this.ctx.scale(this._renderScale || 1, this._renderScale || 1)
      this.state.render(this.ctx, this.camera, dt)
      this.ctx.restore()
    }
    requestAnimationFrame(() => this._loop())
  }

  handleResize() {
    const dpr = window.devicePixelRatio || 1
    const w = window.innerWidth
    const h = window.innerHeight
    this.canvas.width = w * dpr
    this.canvas.height = h * dpr
    this.canvas.style.width = w + 'px'
    this.canvas.style.height = h + 'px'
    this.ctx.scale(dpr, dpr)
    // 横竖屏
    const isLandscape = w > h
    const view = isLandscape ? WORLD.viewLandscape : WORLD.viewPortrait
    this.camera.setViewport(view.w, view.h)
    // 计算缩放：让可视区域填满屏幕
    this._renderScale = Math.min(w / view.w, h / view.h)
    this._screenOffsetX = (w - view.w * this._renderScale) / 2
    this._screenOffsetY = (h - view.h * this._renderScale) / 2
  }
}
