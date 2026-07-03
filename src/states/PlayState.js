// src/states/PlayState.js
import { PHYS } from '../config/physics.js'
import { PLAYER_CONFIG, PLATFORMS, LIGHTNING_CLOUDS, AIR_CURRENTS } from '../config/entities.js'
import { Player } from '../entities/Player.js'
import { Cloud, Whale, AirCurrent, Lightning } from '../entities/Environmental.js'
import { CollisionSystem } from '../systems/CollisionSystem.js'
import { AISystem } from '../systems/AISystem.js'
import { ZoneSystem } from '../systems/ZoneSystem.js'
import { ScoreSystem } from '../systems/ScoreSystem.js'
import { SpawnManager } from '../managers/SpawnManager.js'
import { MatchManager } from '../managers/MatchManager.js'

export class PlayState {
  constructor() {
    this.collision = new CollisionSystem()
    this.aiSystem = new AISystem()
    this.zoneSystem = new ZoneSystem()
    this.scoreSystem = new ScoreSystem()
    this.spawnManager = new SpawnManager()
    this.matchManager = new MatchManager()
    this.clouds = []
    this.lightnings = []
    this.airCurrents = []
    this.whale = null
    this.countdown = 3.0
    this.phase = 'countdown' // countdown | playing | ended
    this.paused = false
    this._prevPause = false
  }

  enter(engine) {
    engine.handleResize()

    // 初始化实体
    this.player = new Player()
    this.player.x = PLAYER_CONFIG.spawnX
    this.player.y = PLAYER_CONFIG.spawnY
    this.player.id = 'player'

    this.enemies = this.spawnManager.generateInitialEnemies()
    this.matchManager.setEntities([this.player, ...this.enemies])

    // 环境实体
    this.clouds = LIGHTNING_CLOUDS.map(c => new Cloud(c.x, c.y, c.radius))
    this.airCurrents = AIR_CURRENTS.map(c => new AirCurrent(c))
    this.whale = new Whale()

    // 预渲染精灵
    if (engine.renderer && engine.renderer.entityRenderer) {
      engine.renderer.entityRenderer.prerenderEntity(PLAYER_CONFIG.color, PLAYER_CONFIG.balloonColor)
      this.enemies.forEach(e => engine.renderer.entityRenderer.prerenderEntity(e.color, e.balloonColor))
    }

    // 注册触屏 UI
    const joystickEl = document.getElementById('joystick-zone')
    const flapBtn = document.getElementById('btn-flap')
    const pauseBtn = document.getElementById('btn-pause')
    if (joystickEl) engine.input.setJoystickElement(joystickEl)
    if (flapBtn) engine.input.setFlapButtonElement(flapBtn)
    if (pauseBtn) {
      this._pauseBtnHandler = () => { this.paused = !this.paused }
      pauseBtn.addEventListener('click', this._pauseBtnHandler)
    }
  }

  exit(engine) {
    // 清理触屏 UI 事件监听器，防止多局累积
    if (this._pauseBtnHandler) {
      const pauseBtn = document.getElementById('btn-pause')
      if (pauseBtn) pauseBtn.removeEventListener('click', this._pauseBtnHandler)
      this._pauseBtnHandler = null
    }
    engine.input.cleanup && engine.input.cleanup()
  }

  // 统一淘汰处理
  _eliminate(entity) {
    this.matchManager.eliminate(entity)
    if (entity !== this.player) this.spawnManager.queueRespawn(entity)
  }

  fixedUpdate(dt) {
    const engine = this.engineRef
    engine.input.update()

    // ESC 边沿触发
    const pausePressed = engine.input.state.pause
    if (pausePressed && !this._prevPause) {
      this.paused = !this.paused
    }
    this._prevPause = pausePressed

    if (this.paused || this.phase === 'ended') return

    if (this.phase === 'countdown') {
      this.countdown -= dt
      if (this.countdown <= 0) this.phase = 'playing'
      return
    }

    this.matchManager.update(dt)

    // 玩家
    if (this.player.alive) {
      const phys = engine.physics
      phys.update(this.player, engine.input.state, dt)
      this.player.tick(dt, engine.input.state)
      // 水域
      if (phys.isSubmerged(this.player) && this.player.balloons === 0) {
        this._eliminate(this.player)
      }
    }

    // AI
    this.aiSystem.update(this.enemies, this.player, dt, engine.physics)

    // 碰撞：玩家 vs 敌人
    this.enemies.forEach(enemy => {
      if (!enemy.alive) return
      const result = this.collision.checkCollision(this.player, enemy)
      if (!result) return
      if (result.type === 'stomp') {
        this.collision.resolveStomp(result.attacker, result.victim, engine.physics, this.scoreSystem, engine.renderer.particles)
      } else if (result.type === 'side') {
        this.collision.resolveSide(result.a, result.b, engine.physics)
      } else if (result.type === 'kick') {
        this._eliminate(result.victim)
        this.scoreSystem.addEliminationScore(result.attacker)
        engine.renderer.particles.burst(result.victim.x, result.victim.y, result.victim.color, 12)
      }
    })

    // 敌人之间碰撞
    for (let i = 0; i < this.enemies.length; i++) {
      for (let j = i + 1; j < this.enemies.length; j++) {
        if (!this.enemies[i].alive || !this.enemies[j].alive) continue
        const result = this.collision.checkCollision(this.enemies[i], this.enemies[j])
        if (!result) continue
        if (result.type === 'stomp') {
          this.collision.resolveStomp(result.attacker, result.victim, engine.physics, null, engine.renderer.particles)
        } else if (result.type === 'side') {
          this.collision.resolveSide(result.a, result.b, engine.physics)
        } else if (result.type === 'kick') {
          this._eliminate(result.victim)
          engine.renderer.particles.burst(result.victim.x, result.victim.y, result.victim.color, 12)
        }
      }
    }

    // 环境：闪电
    this.clouds.forEach(cloud => {
      if (cloud.update(dt)) {
        this.lightnings.push(cloud.discharge())
      }
    })
    this.lightnings = this.lightnings.filter(l => {
      l.update(dt, PLATFORMS, this.clouds)
      if (!l.alive) return false
      // 击中检测
      const allEntities = [this.player, ...this.enemies].filter(e => e.alive)
      for (const entity of allEntities) {
        if (entity.x + entity.width > l.x - 6 && entity.x < l.x + 6 &&
            entity.y + entity.height > l.y - 6 && entity.y < l.y + 6) {
          this._eliminate(entity)
          engine.renderer.particles.burst(entity.x, entity.y, '#FFFF00', 15)
          return false
        }
      }
      return true
    })

    // 环境：鲸鱼
    this.whale.update(dt, [this.player, ...this.enemies])
    if (this.whale.state === 'jumping') {
      const allEntities = [this.player, ...this.enemies].filter(e => e.alive)
      for (const entity of allEntities) {
        if (this.whale.checkEat(entity)) {
          this._eliminate(entity)
          engine.renderer.particles.burst(entity.x, entity.y, '#4488AA', 15)
        }
      }
    }

    // 环境：气流
    this.airCurrents.forEach(ac => {
      [this.player, ...this.enemies].forEach(e => { if (e.alive) ac.applyForce(e, dt) })
    })

    // 缩圈
    this.zoneSystem.update(dt, this.matchManager.getAliveCount())
    ;[this.player, ...this.enemies].forEach(e => {
      if (e.alive) this.zoneSystem.applyZoneForce(e, dt)
    })

    // 水域检测（敌人）
    this.enemies.forEach(e => {
      if (e.alive && engine.physics.isSubmerged(e) && e.balloons === 0) {
        this._eliminate(e)
      }
    })

    // Spawn manager（前30秒复活）
    this.spawnManager.update(dt, this.matchManager)

    // 相机跟随
    engine.camera.follow(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2)

    // 渲染更新
    engine.renderer.update(dt)

    // 对局结束检测
    if (this.matchManager.phase === 'ended') {
      this.phase = 'ended'
      if (this.showResult) {
        this.showResult({
          rank: this.matchManager.getRank(this.player),
          eliminations: this.scoreSystem.getEliminations(this.player),
          maxBalloons: this.player.maxBalloonsAchieved,
          survivalTime: this.matchManager.matchTime,
        })
      }
    }
  }

  render(ctx, camera, dt) {
    const engine = this.engineRef
    engine.renderer.render(ctx, camera, {
      player: this.player,
      enemies: this.enemies,
      aliveCount: this.matchManager.getAliveCount(),
      totalTime: this.matchManager.matchTime,
      lightnings: this.lightnings,
      whale: this.whale,
      airCurrents: this.airCurrents,
      clouds: this.clouds,
      zoneRadius: this.zoneSystem.zoneRadius,
      zoneCenterX: this.zoneSystem.zoneCenterX,
      zoneCenterY: this.zoneSystem.zoneCenterY,
    })

    // 倒计时
    if (this.phase === 'countdown') {
      ctx.fillStyle = 'rgba(0,0,0,0.4)'
      ctx.fillRect(0, 0, camera.viewWidth, camera.viewHeight)
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 64px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(Math.ceil(this.countdown).toString(), camera.viewWidth / 2, camera.viewHeight / 2)
    }

    // 暂停
    if (this.paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.fillRect(0, 0, camera.viewWidth, camera.viewHeight)
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 32px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('已暂停', camera.viewWidth / 2, camera.viewHeight / 2)
      ctx.font = '16px sans-serif'
      ctx.fillText('按 ESC 继续', camera.viewWidth / 2, camera.viewHeight / 2 + 30)
    }
  }
}
