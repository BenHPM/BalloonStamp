// src/states/ResultState.js
export class ResultState {
  constructor(matchData) {
    this.matchData = matchData
    this._time = 0
    this._animProgress = 0
    this._touchStarted = false
  }

  enter(engine) {
    this.engineRef = engine
    this._touchStarted = false
    this._animProgress = 0

    this._onPointerDown = () => { this._touchStarted = true }
    engine.canvas.addEventListener('touchstart', this._onPointerDown, { passive: true })
    engine.canvas.addEventListener('mousedown', this._onPointerDown)

    // 冠军粒子效果
    if (this.matchData?.rank === 1) {
      this._particles = []
      for (let i = 0; i < 30; i++) {
        this._particles.push({
          x: Math.random(), y: Math.random(),
          vx: (Math.random() - 0.5) * 0.3,
          vy: -0.5 - Math.random() * 0.5,
          size: 3 + Math.random() * 4,
          color: ['#FFD700', '#FFA500', '#FFFF00', '#FFE4B5'][Math.floor(Math.random() * 4)],
        })
      }
    } else {
      this._particles = []
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

    // 弹出动画：0.5s 内从 0→1.3→1
    if (this._animProgress < 1) {
      this._animProgress = Math.min(1, this._animProgress + dt / 0.5)
    }

    // 粒子更新
    if (this._particles.length > 0) {
      this._particles = this._particles.filter(p => {
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.vy += 0.3 * dt
        return p.y < 1.2
      })
    }

    if (engine.input.state.flapJustPressed || this._touchStarted) {
      this._touchStarted = false
      if (this.restart) this.restart()
    }
  }

  render(ctx, camera) {
    const w = camera.viewWidth, h = camera.viewHeight
    const data = this.matchData || {}

    // 暗色遮罩
    ctx.fillStyle = 'rgba(0,0,0,0.8)'
    ctx.fillRect(0, 0, w, h)

    // 冠军粒子
    if (this._particles.length > 0) {
      this._particles.forEach(p => {
        ctx.globalAlpha = 0.8
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x * w, p.y * h, p.size, 0, Math.PI * 2)
        ctx.fill()
      })
      ctx.globalAlpha = 1
    }

    // 弹出动画缩放
    const popScale = this._animProgress < 1
      ? 1 + 0.3 * (1 - this._animProgress) * Math.sin(this._animProgress * Math.PI)
      : 1

    ctx.save()
    ctx.translate(w / 2, h / 4)
    ctx.scale(popScale, popScale)

    // 排名徽章
    const rankColors = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' }
    const rankColor = rankColors[data.rank] || '#aaa'
    ctx.fillStyle = rankColor
    ctx.font = 'bold 56px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`#${data.rank || 1}`, 0, 0)

    ctx.restore()

    // 统计数据逐条滑入
    const stats = [
      { label: '排名', value: `#${data.rank || 1}`, delay: 0.1 },
      { label: '淘汰数', value: `${data.eliminations || 0}`, delay: 0.2 },
      { label: '最大气球数', value: `${data.maxBalloons || 0}`, delay: 0.3 },
      { label: '存活时长', value: `${Math.floor(data.survivalTime || 0)}秒`, delay: 0.4 },
    ]

    stats.forEach((stat, i) => {
      const slideIn = Math.max(0, this._animProgress - stat.delay) / (1 - stat.delay)
      if (slideIn <= 0) return
      const xOffset = (1 - Math.min(slideIn * 3, 1)) * 100

      ctx.save()
      ctx.globalAlpha = Math.min(slideIn * 2, 1)
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 24px sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(stat.value, w / 2 + xOffset, h / 3 + 20 + i * 40)
      ctx.font = '16px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(stat.label, w / 2 + 10, h / 3 + 20 + i * 40)
      ctx.restore()
    })

    // 再来一局提示
    const alpha = 0.5 + Math.sin(this._time * 3) * 0.3
    ctx.globalAlpha = alpha
    ctx.fillStyle = '#fff'
    ctx.font = '18px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('点击屏幕或按空格再来一局', w / 2, h * 0.75)
    ctx.globalAlpha = 1
  }
}
