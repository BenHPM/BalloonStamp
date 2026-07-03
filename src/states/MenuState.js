// src/states/MenuState.js
export class MenuState {
  enter(engine) {
    engine.handleResize()
  }

  fixedUpdate(dt) {
    const engine = this.engineRef
    engine.input.update()
    if (engine.input.state.flapJustPressed) {
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
    ctx.fillText('点击或按空格开始', w / 2, h / 2)
  }
}
