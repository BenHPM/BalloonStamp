// 渲染器 — Canvas 像素风渲染

import { PHYS, PLATFORMS } from '../config/physics.js'

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.shakeAmount = 0
    this.particles = []
    this._setupPixelRendering()
  }

  _setupPixelRendering() {
    this.ctx.imageSmoothingEnabled = false
  }

  resize(width, height) {
    // 使用设备像素比保证清晰
    const dpr = window.devicePixelRatio || 1
    this.canvas.width = Math.floor(width * dpr)
    this.canvas.height = Math.floor(height * dpr)
    this.canvas.style.width = width + 'px'
    this.canvas.style.height = height + 'px'
    this.ctx.imageSmoothingEnabled = false
    this._computeScale()
  }

  _computeScale() {
    const scaleX = this.canvas.width / PHYS.GAME_WIDTH
    const scaleY = this.canvas.height / PHYS.GAME_HEIGHT
    this.scale = Math.min(scaleX, scaleY)
    this.offsetX = (this.canvas.width - PHYS.GAME_WIDTH * this.scale) / 2
    this.offsetY = (this.canvas.height - PHYS.GAME_HEIGHT * this.scale) / 2
  }

  // 屏幕震动
  shake(amount) {
    this.shakeAmount = Math.max(this.shakeAmount, amount)
  }

  // 添加粒子
  addParticles(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6 - 2,
        life: 20 + Math.random() * 15,
        color,
        size: 2 + Math.random() * 2,
      })
    }
  }

  update() {
    // 更新粒子
    this.particles = this.particles.filter(p => {
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.15
      p.life--
      return p.life > 0
    })

    // 衰减震动
    if (this.shakeAmount > 0) this.shakeAmount *= 0.85
    if (this.shakeAmount < 0.5) this.shakeAmount = 0
  }

  // 主渲染
  render(gameState) {
    const ctx = this.ctx
    const w = this.canvas.width
    const h = this.canvas.height

    // 清屏
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, w, h)

    // 变换到逻辑坐标
    ctx.save()
    ctx.translate(this.offsetX, this.offsetY)
    ctx.scale(this.scale, this.scale)

    // 震动偏移
    if (this.shakeAmount > 0) {
      ctx.translate(
        (Math.random() - 0.5) * this.shakeAmount,
        (Math.random() - 0.5) * this.shakeAmount
      )
    }

    // 背景
    this._drawBackground(ctx)

    // 水面
    this._drawWater(ctx)

    // 平台
    this._drawPlatforms(ctx)

    // 实体（敌人 → 玩家，玩家在最上层）
    if (gameState.enemies) {
      gameState.enemies.forEach(e => e.draw(ctx))
    }
    if (gameState.player) {
      gameState.player.draw(ctx)
    }

    // 粒子
    this._drawParticles(ctx)

    // HUD
    this._drawHUD(ctx, gameState)

    // 浮动文字
    if (gameState.scoreSystem) {
      this._drawFloatingTexts(ctx, gameState.scoreSystem.getFloatingTexts())
    }

    // Game Over
    if (gameState.gameOver) {
      this._drawGameOver(ctx, gameState)
    } else if (gameState.player && !gameState.player.alive && gameState.player.lives > 0) {
      // 复活倒计时
      this._drawRespawnCountdown(ctx, gameState.player)
    }

    ctx.restore()
  }

  _drawBackground(ctx) {
    // 夜空渐变
    const grad = ctx.createLinearGradient(0, 0, 0, PHYS.GAME_HEIGHT)
    grad.addColorStop(0, '#0a0a1a')
    grad.addColorStop(0.6, '#1a1a3e')
    grad.addColorStop(1, '#2a2a4e')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, PHYS.GAME_WIDTH, PHYS.GAME_HEIGHT)

    // 星星
    ctx.fillStyle = '#fff'
    const stars = [
      [30, 20], [120, 35], [200, 15], [280, 40], [350, 25],
      [80, 60], [180, 55], [300, 50], [420, 30], [450, 60],
      [50, 100], [150, 90], [250, 110], [370, 85], [440, 105],
    ]
    stars.forEach(([sx, sy]) => {
      ctx.fillRect(sx, sy, 1, 1)
    })
  }

  _drawWater(ctx) {
    // 水面
    const wy = PHYS.waterY
    ctx.fillStyle = '#1a4a8a'
    ctx.fillRect(0, wy, PHYS.GAME_WIDTH, PHYS.GAME_HEIGHT - wy)

    // 波浪线
    ctx.strokeStyle = '#3a7acc'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = 0; x < PHYS.GAME_WIDTH; x += 8) {
      ctx.lineTo(x, wy + Math.sin(x * 0.05 + Date.now() * 0.002) * 2)
    }
    ctx.stroke()
  }

  _drawPlatforms(ctx) {
    PLATFORMS.forEach(plat => {
      const { x, y, w, h, isGround } = plat

      if (isGround) {
        // 主地面 — 砖块纹理
        ctx.fillStyle = '#5a4a3a'
        ctx.fillRect(x, y, w, h)
        // 砖块线条
        ctx.strokeStyle = '#3a2a1a'
        ctx.lineWidth = 1
        for (let bx = 0; bx < w; bx += 16) {
          ctx.strokeRect(x + bx, y, 16, h / 2)
          ctx.strokeRect(x + bx + 8, y + h / 2, 16, h / 2)
        }
        // 绿色前沿
        ctx.fillStyle = '#4a4'
        ctx.fillRect(x, y, w, 3)
      } else {
        // 浮空平台
        ctx.fillStyle = 'rgba(100, 100, 140, 0.8)'
        ctx.fillRect(x, y, w, h)
        // 高光
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
        ctx.fillRect(x + 2, y, w - 4, 2)
        // 底部阴影
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
        ctx.fillRect(x + 2, y + h - 1, w - 4, 1)
      }
    })
  }

  _drawParticles(ctx) {
    this.particles.forEach(p => {
      ctx.globalAlpha = Math.min(1, p.life / 10)
      ctx.fillStyle = p.color
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
    })
    ctx.globalAlpha = 1
  }

  _drawHUD(ctx, gameState) {
    const player = gameState.player
    if (!player) return

    ctx.font = '8px monospace'
    ctx.fillStyle = '#fff'

    // 气球数
    ctx.fillText(`🎈${player.balloons}`, 8, 12)
    // 分数
    ctx.fillText(`分数: ${gameState.scoreSystem?.score || 0}`, PHYS.GAME_WIDTH / 2 - 20, 12)
    // 复活次数
    ctx.fillText(`❤${player.lives}`, PHYS.GAME_WIDTH - 30, 12)
  }

  _drawFloatingTexts(ctx, texts) {
    ctx.font = 'bold 8px monospace'
    texts.forEach(t => {
      ctx.globalAlpha = Math.min(1, t.timer / 20)
      ctx.fillStyle = t.color
      ctx.fillText(t.text, t.x, t.y)
    })
    ctx.globalAlpha = 1
  }

  _drawGameOver(ctx, gameState) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.fillRect(0, 0, PHYS.GAME_WIDTH, PHYS.GAME_HEIGHT)

    ctx.font = 'bold 16px monospace'
    ctx.fillStyle = '#f44'
    ctx.textAlign = 'center'
    ctx.fillText('GAME OVER', PHYS.GAME_WIDTH / 2, PHYS.GAME_HEIGHT / 2 - 30)

    ctx.font = '10px monospace'
    ctx.fillStyle = '#ff0'
    const finalScore = gameState.scoreSystem?.score || 0
    ctx.fillText(`最终得分: ${finalScore}`, PHYS.GAME_WIDTH / 2, PHYS.GAME_HEIGHT / 2)

    ctx.fillStyle = '#fff'
    ctx.fillText('按 R 或点击重来', PHYS.GAME_WIDTH / 2, PHYS.GAME_HEIGHT / 2 + 20)

    ctx.textAlign = 'left'
  }

  _drawRespawnCountdown(ctx, player) {
    const seconds = Math.ceil(player.respawnTimer / 60)
    ctx.font = 'bold 12px monospace'
    ctx.fillStyle = '#ff0'
    ctx.textAlign = 'center'
    ctx.fillText(`复活 ${seconds}`, PHYS.GAME_WIDTH / 2, PHYS.GAME_HEIGHT / 2)
    ctx.textAlign = 'left'
  }
}
