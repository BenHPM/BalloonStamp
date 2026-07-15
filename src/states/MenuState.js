// src/states/MenuState.js
import { EntityRenderer } from '../render/EntityRenderer.js'
import { VISUALS } from '../config/visuals.js'

export class MenuState {
  constructor() {
    this._time = 0
    this._touchStarted = false
  }

  enter(engine) {
    this.engineRef = engine
    this._touchStarted = false

    this._onPointerDown = () => { this._touchStarted = true }
    engine.canvas.addEventListener('touchstart', this._onPointerDown, { passive: true })
    engine.canvas.addEventListener('mousedown', this._onPointerDown)

    // 创建菜单浮动角色
    this._menuPlayer = {
      x: 0, y: 0, width: 28, height: 36,
      color: '#4DA6FF', balloonColor: '#4DA6FF',
      balloons: 3, facingRight: true,
      state: 'flying', isFlapping: false, flapTimer: 0,
      onGround: false, vx: 0, vy: 0,
      animFrame: 0, animTimer: 0, scale: 1,
      landSquashTimer: 0, shockwaveTimer: 0,
      getAnimName() { return 'flap' },
    }
  }

  exit(engine) {
    if (this._onPointerDown) {
      engine.canvas.removeEventListener('touchstart', this._onPointerDown)
      engine.canvas.removeEventListener('mousedown', this._onPointerDown)
      this._onPointerDown = null
    }
  }

  fixedUpdate(dt) {
    const engine = this.engineRef
    this._time += dt

    // 菜单角色 idle 浮动动画
    this._menuPlayer.y = Math.sin(this._time * 1.5) * 15
    this._menuPlayer.animTimer += dt
    if (this._menuPlayer.animTimer > 0.15) {
      this._menuPlayer.animTimer = 0
      this._menuPlayer.animFrame++
    }

    if (engine.input.state.flapJustPressed || this._touchStarted) {
      this._touchStarted = false
      if (this.startGame) this.startGame()
    }
  }

  render(ctx, camera) {
    const w = camera.viewWidth, h = camera.viewHeight

    // 背景渐变
    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, '#87CEEB')
    grad.addColorStop(1, '#E0F6FF')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)

    // 浮动角色
    const renderer = this.engineRef?.renderer?.entityRenderer
    if (renderer) {
      this._menuPlayer.x = w / 2 - 14
      this._menuPlayer.y = h / 3 + 60 + this._menuPlayer.y
      renderer.renderEntity(ctx, this._menuPlayer)
    }

    // 标题文字阴影
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.3)'
    ctx.shadowBlur = 8
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 52px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('气球大乱踩', w / 2, h / 3 - 10)
    ctx.restore()

    // 提示文字脉冲动画
    const alpha = 0.6 + Math.sin(this._time * 3) * 0.4
    ctx.globalAlpha = alpha
    ctx.fillStyle = '#fff'
    ctx.font = '20px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('点击屏幕或按空格开始', w / 2, h / 2 + 50)
    ctx.globalAlpha = 1
  }
}
