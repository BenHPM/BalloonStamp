// 游戏引擎 — 主循环、状态管理、协调各系统

import { PHYS, PLATFORMS, ENEMY_CONFIGS } from '../config/physics.js'
import { PhysicsEngine } from './PhysicsEngine.js'
import { InputManager } from './InputManager.js'
import { Renderer } from './Renderer.js'
import { Player } from '../entities/Player.js'
import { Enemy } from '../entities/Enemy.js'
import { Platform } from '../entities/Platform.js'
import { CollisionSystem } from '../systems/CollisionSystem.js'
import { ScoreSystem } from '../systems/ScoreSystem.js'

export class GameEngine {
  constructor(canvas) {
    this.canvas = canvas
    this.renderer = new Renderer(canvas)
    this.physics = new PhysicsEngine()
    this.input = new InputManager(canvas)
    this.collision = new CollisionSystem()
    this.scoreSystem = new ScoreSystem()

    this.player = null
    this.enemies = []
    this.platforms = []
    this.gameOver = false
    this.running = false
    this.lastTime = 0
    this.accumulator = 0
    this.fixedStep = 1000 / 60 // 16.67ms per tick

    this._init()
  }

  _init() {
    // 创建平台
    this.platforms = PLATFORMS.map(p => new Platform(p))
    this.physics.setPlatforms(this.platforms)

    // 创建玩家
    this.player = new Player()

    // 创建敌人
    this.enemies = ENEMY_CONFIGS.map((_, i) => new Enemy(i))

    // 注册触摸按钮
    this._registerTouchButtons()

    // 键盘重开
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyR' && this.gameOver) {
        this._restart()
      }
    })

    // 窗口大小变化
    window.addEventListener('resize', () => this._handleResize())
    this._handleResize()
  }

  _registerTouchButtons() {
    const buttons = {
      left: document.getElementById('btn-left'),
      right: document.getElementById('btn-right'),
      flap: document.getElementById('btn-flap'),
    }
    Object.entries(buttons).forEach(([id, el]) => {
      if (el) this.input.registerTouchButton(id, el)
    })

    // Game Over 点击重开
    this.canvas.addEventListener('click', () => {
      if (this.gameOver) this._restart()
    })
  }

  _handleResize() {
    const wrapper = document.getElementById('canvas-wrapper')
    if (wrapper) {
      const rect = wrapper.getBoundingClientRect()
      this.renderer.resize(rect.width, rect.height)
    }
  }

  _restart() {
    this.player = new Player()
    this.enemies = ENEMY_CONFIGS.map((_, i) => new Enemy(i))
    this.scoreSystem = new ScoreSystem()
    this.collision = new CollisionSystem()
    this.gameOver = false
  }

  start() {
    this.running = true
    this.lastTime = performance.now()
    this._loop(this.lastTime)
  }

  _loop(timestamp) {
    if (!this.running) return

    const dt = timestamp - this.lastTime
    this.lastTime = timestamp

    // 固定步长累积器 — 防止帧率波动影响物理
    this.accumulator += Math.min(dt, 100) // 上限防止切标签页后暴走
    while (this.accumulator >= this.fixedStep) {
      this._update()
      this.accumulator -= this.fixedStep
    }

    this._render()
    requestAnimationFrame((t) => this._loop(t))
  }

  _update() {
    if (this.gameOver) return

    // 输入
    this.input.update()

    // 玩家物理
    if (this.player.alive) {
      const playerInput = {
        left: this.input.state.left,
        right: this.input.state.right,
        flapJustPressed: this.input.state.flapJustPressed,
      }
      const didFlap = this.physics.update(this.player, playerInput)
      this.player.update()

      if (didFlap) {
        // 拍打音效/特效可以在这里触发
      }

      // 落水检测
      if (this.physics.isInWater(this.player)) {
        this.player.die()
        this.scoreSystem.penalty(300, this.player.x, this.player.y, '落水!')
        this.renderer.shake(8)
        this.renderer.addParticles(this.player.x, PHYS.waterY, '#4af', 12)
        this._checkGameOver()
      }
    } else {
      // 复活倒计时
      this.player.respawnTimer--
      if (this.player.respawnTimer <= 0 && this.player.lives > 0) {
        this.player.respawn()
      }
    }

    // 敌人
    this.enemies.forEach(enemy => {
      if (!enemy.alive) {
        enemy.update()
        return
      }

      // AI 决策
      const aiInput = enemy.updateAI(this.player, this.platforms)
      this.physics.update(enemy, aiInput)
      enemy.update()

      // 落水
      if (this.physics.isInWater(enemy)) {
        enemy.die()
        this.renderer.addParticles(enemy.x, PHYS.waterY, '#4af', 8)
      }
    })

    // 碰撞检测
    this.collision.update()
    if (this.player.alive) {
      this.enemies.forEach(enemy => {
        if (!enemy.alive || enemy.invincible > 0 || enemy.isInflating) return

        // --- 玩家踢杀敌人 ---
        if (this.collision.checkKick(this.player, enemy)) {
          enemy.die()
          this.scoreSystem.addScore(300, enemy.x, enemy.y)
          this.renderer.shake(5)
          this.renderer.addParticles(enemy.x, enemy.y, enemy.color, 10)
          return
        }

        // --- 敌人踢杀玩家（敌人有气球 + 玩家0气球+地面） ---
        if (this.player.invincible <= 0 && this.collision.checkKick(enemy, this.player)) {
          this.player.die()
          this.scoreSystem.penalty(300, this.player.x, this.player.y, '被踢杀!')
          this.renderer.shake(8)
          this.renderer.addParticles(this.player.x, this.player.y, '#f44', 12)
          this._checkGameOver()
          return
        }

        // --- 踩踏/侧面碰撞 ---
        const result = this.collision.checkStomp(this.player, enemy)
        if (!result) return

        // 敌人踩踏玩家时，玩家无敌则跳过
        if (result.victim === this.player && this.player.invincible > 0) return
        // 玩家踩踏敌人时，敌人无敌已在上方过滤

        if (result.type === 'stomp') {
          const events = this.collision.resolveStomp(result.attacker, result.victim)
          events.forEach(evt => this._handleEvent(evt))
        } else if (result.type === 'side') {
          // 侧面碰撞：玩家无敌则跳过
          if (this.player.invincible > 0) return
          const events = this.collision.resolveSide(result.a, result.b)
          events.forEach(evt => this._handleEvent(evt))
        }
      })
    }

    // 更新系统
    this.scoreSystem.update()
    this.renderer.update()
  }

  _handleEvent(evt) {
    switch (evt.type) {
      case 'balloonPop':
        this.renderer.shake(3)
        this.renderer.addParticles(evt.entity.x + evt.entity.width / 2, evt.entity.y, '#fff', 6)
        if (evt.entity === this.player) {
          this.scoreSystem.penalty(300, this.player.x, this.player.y, '气球被爆!')
          // 玩家0气球+地面 = 被踢杀状态，下一帧碰撞检测会处理
          // 但如果是侧面互爆导致0气球且不在地面，玩家会坠落
        } else {
          // 敌人被爆气球
          this.scoreSystem.addScore(100, evt.entity.x, evt.entity.y)
        }
        break

      case 'stompBounce':
        this.physics.applyStompBounce(evt.entity)
        break

      case 'kickKill':
        this.renderer.shake(5)
        this.renderer.addParticles(evt.entity.x, evt.entity.y, evt.entity.color, 10)
        if (evt.entity === this.player) {
          this.player.die()
          this.scoreSystem.penalty(300, this.player.x, this.player.y, '被踢杀!')
          this._checkGameOver()
        } else {
          evt.entity.die()
          this.scoreSystem.addScore(300, evt.entity.x, evt.entity.y)
        }
        break

      case 'score':
        this.scoreSystem.addScore(evt.value, this.player.x, this.player.y - 10, evt.combo)
        break
    }
  }

  _checkGameOver() {
    if (this.player.lives <= 0) {
      this.gameOver = true
    }
  }

  _render() {
    this.renderer.render({
      player: this.player,
      enemies: this.enemies,
      scoreSystem: this.scoreSystem,
      gameOver: this.gameOver,
    })
  }
}
