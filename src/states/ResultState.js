// src/states/ResultState.js
export class ResultState {
  constructor(matchData) {
    this.matchData = matchData
  }

  enter(engine) {
    engine.handleResize()
    this._touchStarted = false

    // 监听触屏/鼠标点击来重开
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
      if (this.restart) this.restart()
    }
  }

  render(ctx, camera) {
    const w = camera.viewWidth, h = camera.viewHeight
    ctx.fillStyle = 'rgba(0,0,0,0.8)'
    ctx.fillRect(0, 0, w, h)

    ctx.fillStyle = '#fff'
    ctx.textAlign = 'center'
    ctx.font = 'bold 40px sans-serif'
    ctx.fillText('对局结束', w / 2, h / 4)

    ctx.font = '24px sans-serif'
    const data = this.matchData || {}
    ctx.fillText(`排名: #${data.rank || 1}`, w / 2, h / 3 + 20)
    ctx.fillText(`淘汰数: ${data.eliminations || 0}`, w / 2, h / 3 + 60)
    ctx.fillText(`最大气球数: ${data.maxBalloons || 0}`, w / 2, h / 3 + 100)
    ctx.fillText(`存活时长: ${Math.floor(data.survivalTime || 0)}秒`, w / 2, h / 3 + 140)

    ctx.font = '18px sans-serif'
    ctx.fillText('点击屏幕或按空格再来一局', w / 2, h * 0.75)
  }
}
