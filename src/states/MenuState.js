// src/states/MenuState.js
export class MenuState {
  enter(engine) {
    engine.handleResize()
    this._touchStarted = false

    // 监听触屏/鼠标点击来开始游戏
    this._onPointerDown = () => { this._touchStarted = true }
    engine.canvas.addEventListener('touchstart', this._onPointerDown, { passive: true })
    engine.canvas.addEventListener('mousedown', this._onPointerDown)
  }

  exit(engine) {
    if (this._onPointerDown) {
      engine.canvas.removeEventListener('touchstart', this._onPointerDown)
      engine.canvas.removeEventListener('mousedown', this._onPointerDown)
    }
  }

  fixedUpdate(dt) {
    const engine = this.engineRef
    engine.input.update()

    // 键盘/手柄 或 触屏点击
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

    // 标题
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 48px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('气球大乱踩', w / 2, h / 3)
    ctx.font = '20px sans-serif'
    ctx.fillText('点击屏幕或按空格开始', w / 2, h / 2)
  }
}
