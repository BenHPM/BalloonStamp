// src/states/PlayState.js
import { PHYS } from '../config/physics.js'
import { WORLD } from '../config/world.js'
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
    this.phase = 'countdown'
    this.paused = false
    this._prevPause = false
    this._playerLives = 3 // 3 条命（可复活 2 次）
    this._respawnTimer = 0
    this._playerRespawnPos = { x: PLAYER_CONFIG.spawnX, y: PLAYER_CONFIG.spawnY }
    this._playerDead = false // 玩家死亡等待复活
    this._respawnFlash = 0 // 复活闪烁
    this._playerZoneDps = 0 // 玩家圈外 DPS（用于渐晕）
  }

  // 根据比赛时间计算难度阶段
  _getDifficulty() {
    const t = this.matchManager.matchTime
    const phases = WORLD.difficultyPhases || []
    let phase = phases[phases.length - 1]
    for (const p of phases) {
      if (t >= p.time) phase = p
    }
    if (!phase) return { chaseMultiplier: 1, flapMultiplier: 1 }
    return {
      chaseMultiplier: phase.chaseMultiplier,
      flapMultiplier: phase.flapMultiplier,
      maxAliveAI: phase.aiCount,
      allowBerserker: phase.berserker,
    }
  }

  enter(engine) {

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

    // 平台数据共享给 SpawnManager（AI 逃向最近平台）和 Enemy
    this.spawnManager.setPlatforms(PLATFORMS)
    this.enemies.forEach(e => { e._platforms = PLATFORMS })

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
    if (entity === this.player) {
      this._playerLives--
      if (this._playerLives <= 0) {
        this.player.eliminate()
        this.matchManager.eliminate(this.player)
        this.matchManager.phase = 'ended'
        return
      }
      // 还有命 → 暂时从 MatchManager 移除（等复活再加回）
      this.player.alive = false
      this.player.state = PlayerState.ELIMINATED
      this.matchManager.aliveEntities = this.matchManager.aliveEntities.filter(e => e !== this.player)
      this._respawnTimer = 2.0
      this._playerDead = true
      this.engineRef.renderer.particles.burst(entity.x, entity.y, '#4DA6FF', 20)
      return
    }
    this.matchManager.eliminate(entity)
    this.spawnManager.queueRespawn(entity)
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
      this._updateCountdown(dt)
      return
    }

    this._updateMatchManager(dt)
    this._updatePlayer(dt)
    this._updateEnemies(dt)
    this._resolveCollisions(engine)
    this._updateEnvironment(dt, engine)
    this._updateZone(dt, engine)
    this._updateSpawn(dt)
    engine.camera.follow(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2)
    engine.renderer.update(dt)
    this._checkMatchEnd()
  }

  // ─── 子步 ───────────────────────────────────────────────

  _updateCountdown(dt) {
    this.countdown -= dt
    if (this.countdown <= 0) this.phase = 'playing'
  }

  _updateMatchManager(dt) {
    this.matchManager.update(dt)
  }

  _updatePlayer(dt) {
    if (this._playerDead) {
      this._updateRespawn(dt)
      return
    }
    if (!this.player.alive) return

    const phys = this.engineRef.physics
    phys.update(this.player, this.engineRef.input.state, dt)
    this.player.tick(dt, this.engineRef.input.state)

    // 水域检测：0 气球才沉没淘汰（有气球可在水面飞行）
    if (phys.isSubmerged(this.player) && this.player.balloons === 0) {
      this._eliminate(this.player)
    }
  }

  _updateRespawn(dt) {
    this._respawnTimer -= dt
    this._respawnFlash = Math.sin(this._respawnTimer * Math.PI * 4) * 0.5 + 0.5
    if (this._respawnTimer <= 0) {
      this._respawnPlayer()
    }
  }

  _updateEnemies(dt) {
    const difficulty = this._getDifficulty()
    this.aiSystem.update(this.enemies, this.player, dt, this.engineRef.physics, {
      lightningBolts: this.lightnings,
      whale: this.whale,
      zoneCenterX: this.zoneSystem.zoneCenterX,
      zoneCenterY: this.zoneSystem.zoneCenterY,
      zoneRadius: this.zoneSystem.zoneRadius,
      difficulty,
    })
  }

  _resolveCollisions(engine) {
    // 玩家 vs 敌人
    this.enemies.forEach(enemy => {
      if (!enemy.alive) return
      const result = this.collision.checkCollision(this.player, enemy)
      if (!result) return
      if (result.type === 'stomp') {
        this.collision.resolveStomp(result.attacker, result.victim, engine.physics, this.scoreSystem, engine.renderer.particles)
        engine.renderer.shake(3)
        if (result.attacker === this.player) {
          engine.renderer.emitText(result.victim.x, result.victim.y, 'stomp')
        }
      } else if (result.type === 'side') {
        this.collision.resolveSide(result.a, result.b, engine.physics)
      } else if (result.type === 'kick') {
        this._eliminate(result.victim)
        this.scoreSystem.addEliminationScore(result.attacker)
        engine.renderer.particles.burst(result.victim.x, result.victim.y, result.victim.color, PHYS.stompParticleCount)
        engine.renderer.shake(6)
        engine.renderer.emitText(result.victim.x, result.victim.y, 'elimination')
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
          engine.renderer.shake(3)
        } else if (result.type === 'side') {
          this.collision.resolveSide(result.a, result.b, engine.physics)
        } else if (result.type === 'kick') {
          this._eliminate(result.victim)
          engine.renderer.particles.burst(result.victim.x, result.victim.y, result.victim.color, PHYS.stompParticleCount)
          engine.renderer.shake(6)
          engine.renderer.emitText(result.victim.x, result.victim.y, 'elimination')
        }
      }
    }
  }

  _updateEnvironment(dt, engine) {
    // 闪电云
    this.clouds.forEach(cloud => {
      if (cloud.update(dt)) {
        this.lightnings.push(cloud.discharge())
      }
    })
    this.lightnings = this.lightnings.filter(l => {
      l.update(dt, PLATFORMS, this.clouds)
      if (!l.alive) return false
      const allEntities = [this.player, ...this.enemies].filter(e => e.alive)
      for (const entity of allEntities) {
        const hitPad = PHYS.hitTolerance
        if (entity.x + entity.width > l.x - hitPad && entity.x < l.x + hitPad &&
            entity.y + entity.height > l.y - hitPad && entity.y < l.y + hitPad) {
          this._eliminate(entity)
          engine.renderer.particles.burst(entity.x, entity.y, '#FFFF00', PHYS.lightningParticleCount)
          engine.renderer.shake(10)
          engine.renderer.emitText(entity.x, entity.y, 'elimination')
          return false
        }
      }
      return true
    })

    // 鲸鱼
    this.whale.update(dt, [this.player, ...this.enemies])
    if (this.whale.state === 'jumping') {
      const allEntities = [this.player, ...this.enemies].filter(e => e.alive)
      for (const entity of allEntities) {
        if (this.whale.checkEat(entity)) {
          this._eliminate(entity)
          engine.renderer.particles.burst(entity.x, entity.y, '#4488AA', PHYS.whaleParticleCount)
          engine.renderer.shake(8)
          engine.renderer.emitText(entity.x, entity.y, 'elimination')
        }
      }
    }

    // 气流
    this.airCurrents.forEach(ac => {
      [this.player, ...this.enemies].forEach(e => { if (e.alive) ac.applyForce(e, dt) })
    })
  }

  _updateZone(dt, engine) {
    this.zoneSystem.update(dt, this.matchManager.getAliveCount())
    const allAlive = [this.player, ...this.enemies].filter(e => e.alive)
    allAlive.forEach(e => {
      this.zoneSystem.applyZoneForce(e, dt)
      const zoneResult = this.zoneSystem.tickEntity(e, dt)

      if (zoneResult.damage > 0) {
        // 记录玩家 DPS（仅用于渐晕）
        if (e === this.player) {
          this._playerZoneDps = zoneResult.dps
        }

        // 每 tick 间隔掉 1 气球（统一逻辑）
        if (Math.floor(zoneResult.outsideTime / WORLD.zoneDamageTickInterval) >
            Math.floor((zoneResult.outsideTime - dt) / WORLD.zoneDamageTickInterval)) {
          if (e.balloons > 0) {
            e.loseBalloon()
            const isPlayer = e === this.player
            const px = isPlayer ? e.x + e.width / 2 : e.x
            const py = isPlayer ? e.y + e.height / 2 : e.y
            engine.renderer.particles.burst(px, py, '#FF4444', 8)
            engine.renderer.emitText(px, py, 'zoneDmg')
          } else {
            // 0 气球在圈外 → 淘汰
            this._eliminate(e)
            engine.renderer.particles.burst(e.x, e.y, '#FF4444', 8)
          }
        }
      } else if (e === this.player) {
        this._playerZoneDps = 0
      }
    })

    // 玩家回到安全区时重置
    if (this.player.alive && !this.zoneSystem.isOutsideZone(this.player)) {
      this._playerZoneDps = 0
    }

    // 敌人水域检测（0 气球才沉没）
    this.enemies.forEach(e => {
      if (e.alive && engine.physics.isSubmerged(e) && e.balloons === 0) {
        this._eliminate(e)
      }
    })
  }

  _updateSpawn(dt) {
    this.spawnManager.update(dt, this.matchManager)
  }

  _checkMatchEnd() {
    if (this._playerLives <= 0 && this.matchManager.phase === 'ended') {
      this.phase = 'ended'
      if (this.showResult) {
        this.showResult({
          rank: this.matchManager.getRank(this.player),
          eliminations: this.scoreSystem.getEliminations(this.player),
          maxBalloons: this.player.maxBalloonsAchieved,
          survivalTime: this.matchManager.matchTime,
          livesRemaining: this._playerLives,
        })
      }
    }
  }

  // 复活玩家
  _respawnPlayer() {
    this.player.alive = true
    this.player.balloons = 2
    this.player.state = PlayerState.FLYING
    this.player.x = this._playerRespawnPos.x
    this.player.y = this._playerRespawnPos.y
    this.player.vx = 0
    this.player.vy = 0
    this.player.onGround = false
    this.player.invincibleTimer = 3.0 // 3 秒无敌
    this.player.landSquashTimer = 0
    this.player.shockwaveTimer = 0
    this._playerDead = false
    this._respawnFlash = 0
    // 将玩家加回 MatchManager
    if (!this.matchManager.aliveEntities.includes(this.player)) {
      this.matchManager.aliveEntities.push(this.player)
    }
    this.matchManager.eliminated = this.matchManager.eliminated.filter(e => e !== this.player)
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

    // 圈外红色渐晕
    if (this._playerZoneDps > 0) {
      const alpha = Math.min(WORLD.zoneVignetteMax, this._playerZoneDps / 15 * WORLD.zoneVignetteMax)
      const grad = ctx.createRadialGradient(
        camera.viewWidth / 2, camera.viewHeight / 2, camera.viewWidth * 0.3,
        camera.viewWidth / 2, camera.viewHeight / 2, camera.viewWidth * 0.7
      )
      grad.addColorStop(0, 'rgba(255,0,0,0)')
      grad.addColorStop(1, `rgba(255,0,0,${alpha})`)
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, camera.viewWidth, camera.viewHeight)
    }
  }
}
