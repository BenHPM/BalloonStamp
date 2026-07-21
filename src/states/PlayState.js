// src/states/PlayState.js
import { PHYS } from '../config/physics.js'
import { WORLD } from '../config/world.js'
import { PLAYER_CONFIG, PLATFORMS, LIGHTNING_CLOUDS, AIR_CURRENTS } from '../config/entities.js'
import { Player } from '../entities/Player.js'
import { EntityState } from '../entities/EntityState.js'
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
    let phaseIndex = phases.length - 1
    for (let i = 0; i < phases.length; i++) {
      if (t >= phases[i].time) { phase = phases[i]; phaseIndex = i }
    }
    if (!phase) return { chaseMultiplier: 1, flapMultiplier: 1, phaseIndex: 0 }
    return {
      chaseMultiplier: phase.chaseMultiplier,
      flapMultiplier: phase.flapMultiplier,
      maxAliveAI: phase.aiCount,
      allowBerserker: phase.berserker,
      phaseIndex,
    }
  }

  enter(engine) {

    // 初始化实体
    this.player = new Player()
    this.player.x = PLAYER_CONFIG.spawnX
    this.player.y = PLAYER_CONFIG.spawnY
    this.player.id = 'player'

    // 在生成初始 AI 前注入阶段 0 难度，让初始数量 = aiCount 而非满载 19
    const startingDifficulty = this._getDifficulty()
    this.spawnManager.setDifficulty({
      allowBerserker: startingDifficulty.allowBerserker,
      maxAliveAI: startingDifficulty.maxAliveAI,
    })
    this.enemies = this.spawnManager.generateInitialEnemies()
    this.matchManager.setEntities([this.player, ...this.enemies])

    // 环境实体
    this.clouds = LIGHTNING_CLOUDS.map(c => new Cloud(c.x, c.y, c.radius))
    this.airCurrents = AIR_CURRENTS.map(c => new AirCurrent(c))
    this.whale = new Whale()

    // 平台数据共享给 SpawnManager（AI 逃向最近平台）和 Enemy
    this.spawnManager.setPlatforms(PLATFORMS)
    this.spawnManager.setZoneSystem(this.zoneSystem)
    this.enemies.forEach(e => { e._platforms = PLATFORMS })

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
      this.player.state = EntityState.ELIMINATED
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
    // dt 为 fixed step（1/60），由 GameEngine 主循环传入，保证所有模拟系统时间语义一致。
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
    // 环境实体随难度阶段升级：云放电频率递增
    const difficulty = this._getDifficulty()
    this.clouds.forEach(c => c.setPhase(difficulty.phaseIndex))
    this._updateEnvironment(dt, engine)
    this._updateZone(dt, engine)
    this._updateSpawn(dt)
    engine.camera.follow(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2)
    this._checkMatchEnd()
  }

  // ─── 子步 ───────────────────────────────────────────────

  _updateCountdown(dt) {
    this.countdown -= dt
    if (this.countdown <= 0) {
      this.phase = 'playing'
      // 开局短暂无敌，防止倒计时结束瞬间被附近 AI 撞击
      this.player.invincibleTimer = 1.5
    }
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
    // 把难度快照同步给 SpawnManager：控制 maxAliveAI 维护补员 + berserker 解锁
    this.spawnManager.setDifficulty({
      allowBerserker: difficulty.allowBerserker,
      maxAliveAI: difficulty.maxAliveAI,
    })
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
    // 两段式碰撞解析：先收集所有碰撞对，再顺序 resolve。
    // 使用 victimsThisFrame 防止同一受害者被多个攻击者重复 stomp/kick（互斥）。
    const victimsThisFrame = new Set()
    const stomps = []
    const sides = []
    const kicks = []

    const handleResult = (result) => {
      if (!result) return
      if (result.type === 'stomp' && result.attacker.alive && result.victim.alive &&
          !victimsThisFrame.has(result.victim)) {
        stomps.push(result)
        victimsThisFrame.add(result.victim)
      } else if (result.type === 'side' && result.a.alive && result.b.alive) {
        sides.push(result)
      } else if (result.type === 'kick' && result.attacker.alive && result.victim.alive &&
                 !victimsThisFrame.has(result.victim)) {
        kicks.push(result)
        victimsThisFrame.add(result.victim)
      }
    }

    // 玩家 vs 敌人
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue
      if (this.player.state === EntityState.ELIMINATED || !this.player.alive) continue
      handleResult(this.collision.checkCollision(this.player, enemy))
    }

    // 敌人之间碰撞
    for (let i = 0; i < this.enemies.length; i++) {
      for (let j = i + 1; j < this.enemies.length; j++) {
        if (!this.enemies[i].alive || !this.enemies[j].alive) continue
        handleResult(this.collision.checkCollision(this.enemies[i], this.enemies[j]))
      }
    }

    // 顺序 resolve：先 stomp（可能把 victim 气球踩到 0，进而可被 kick），再 kick，最后 side
    stomps.forEach(r => {
      this.collision.resolveStomp(r.attacker, r.victim, engine.physics, this.scoreSystem, engine.renderer.particles)
      engine.renderer.shake(3)
      if (r.attacker === this.player) engine.renderer.emitText(r.victim.x, r.victim.y, 'stomp')
    })
    kicks.forEach(r => {
      // 二次校验：若 stomp 阶段已把 victim 踩到 0 且 victim 已死，跳过
      if (!r.victim.alive) return
      this._eliminate(r.victim)
      this.scoreSystem.addEliminationScore(r.attacker)
      engine.renderer.particles.burst(r.victim.x, r.victim.y, r.victim.color, PHYS.stompParticleCount)
      engine.renderer.shake(6)
      engine.renderer.emitText(r.victim.x, r.victim.y, 'elimination')
    })
    sides.forEach(r => this.collision.resolveSide(r.a, r.b, engine.physics))
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
      // 无敌时间（如复活保护）免疫缩圈 zone 伤害
      if (e.invincibleTimer > 0) return
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
    this.spawnManager.update(dt, this.matchManager, () => this.enemies)
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
    this.player.state = EntityState.FLYING
    // 复活点：安全区内最近平台，避免「复活即圈外」死亡螺旋
    const pos = this._findSafeRespawnPos()
    this.player.x = pos.x
    this.player.y = pos.y
    this.player.vx = 0
    this.player.vy = 0
    this.player.onGround = false
    this.player.invincibleTimer = PHYS.invincibleDuration // 10 秒无敌（免疫碰撞+zone 伤害）
    this.player.landSquashTimer = 0
    this.player.shockwaveTimer = 0
    this._playerDead = false
    this._respawnFlash = 0
    // 玩家复活：使用统一入口，避免手动维护 eliminated 导致排名错乱
    this.matchManager.respawnEntity(this.player)
  }

  // 寻找安全区内的最近平台（用于复活落地）；若无则退回到 zone 中心上空
  _findSafeRespawnPos() {
    const zs = this.zoneSystem
    const cx = zs.zoneCenterX
    const cy = zs.zoneCenterY
    const safeR = zs.zoneRadius * 0.6
    let best = null
    let bestDist = Infinity
    for (const plat of PLATFORMS) {
      const px = plat.x + plat.w / 2
      const py = plat.y
      const dCenter = Math.hypot(px - cx, py - cy)
      if (dCenter > safeR) continue
      const dPlayer = Math.hypot(px - this.player.x, py - this.player.y)
      if (dPlayer < bestDist) { bestDist = dPlayer; best = { x: px - this.player.width / 2, y: py - this.player.height } }
    }
    if (best) return best
    return { x: cx - this.player.width / 2, y: cy - this.player.height - 50 }
  }

  render(ctx, camera, dt) {
    // 帧边界：清除上一帧遗留的临时互斥标记（render 每帧仅一次，是真帧边界）
    const engine = this.engineRef
    this.player.clearFrameFlags()
    for (const e of this.enemies) e.clearFrameFlags()
    // 渲染层动画（粒子/浮字/背景/震动）使用帧 dt，与固定步长模拟解耦
    engine.renderer.update(dt)
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
