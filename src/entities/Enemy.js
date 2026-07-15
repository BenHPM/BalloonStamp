// src/entities/Enemy.js
import { PHYS } from '../config/physics.js'
import { AI_TYPES, AI_DECISION_INTERVAL } from '../config/entities.js'
import { WORLD } from '../config/world.js'
import { PlayerState } from './Player.js'
import { BalloonEntity } from './BalloonEntity.js'

export class Enemy extends BalloonEntity {
  constructor(typeKey, spawnX, spawnY) {
    super(PHYS.initialBalloons)
    const cfg = AI_TYPES[typeKey]
    this.typeKey = typeKey
    this.name = cfg.name
    this.color = cfg.color
    this.balloonColor = cfg.color
    this.speed = cfg.speed
    this.chaseRate = cfg.chaseRate
    this.flapInterval = cfg.flapInterval
    this.baseScale = cfg.scale
    this.width = 28 * cfg.scale
    this.height = 36 * cfg.scale
    this.x = spawnX; this.y = spawnY
    this.balloons = cfg.balloonCount
    this.maxBalloons = PHYS.maxBalloons
    this.aiTimer = 0
    this.flapAiTimer = 0
    this.moveDir = 0
    this._decisionInterval = AI_DECISION_INTERVAL[0] + Math.random() * (AI_DECISION_INTERVAL[1] - AI_DECISION_INTERVAL[0])
  }

  get scale() {
    const extra = Math.max(0, this.balloons - PHYS.initialBalloons)
    return this.baseScale * (1 + extra * PHYS.sizePerBalloon)
  }

  get effectiveWidth() { return this.width * this.scale / this.baseScale }
  get effectiveHeight() { return this.height * this.scale / this.baseScale }

  // AI 决策 — 带目标优先级、危险规避和难度阶段
  decideAI(player, dt, context = {}) {
    const { allEnemies, lightningBolts, whale, difficulty = {} } = context

    if (!this.alive || this.state === PlayerState.INFLATING || this.state === PlayerState.ELIMINATED) {
      return { moveX: 0, flapJustPressed: false }
    }

    this.aiTimer += dt
    if (this.aiTimer < this._decisionInterval) {
      return { moveX: this.moveDir, flapJustPressed: false }
    }
    this.aiTimer = 0

    const chaseMult = difficulty.chaseMultiplier || 1
    const flapMult = difficulty.flapMultiplier || 1

    // P0: 躲避致命危险
    if (this._shouldDodge(lightningBolts, whale)) {
      return this._dodgeMove(flapMult)
    }

    // P1: 0 气球 → 优先逃到最近平台
    if (this.balloons === 0 && this.state !== PlayerState.INFLATING) {
      return this._fleeToNearestPlatform(flapMult)
    }

    // P2: 追逐可攻击目标（难度阶段影响 chaseRate）
    const adjustedChase = Math.min(1, this.chaseRate * chaseMult)
    const target = this._pickTarget(player, allEnemies, adjustedChase)
    if (target) {
      return this._chaseTarget(target, flapMult)
    }

    // P3: 随机巡逻
    return this._roam()
  }

  _pickTarget(player, allEnemies, chaseRate) {
    if (!player?.alive) return null
    const candidates = []
    if (player.alive) {
      candidates.push({ x: player.x, y: player.y, balloons: player.balloons, score: 10 })
    }
    if (allEnemies) {
      allEnemies.forEach(e => {
        if (e === this || !e.alive) return
        const score = e.balloons === 0 && e.onGround ? 50 : e.balloons * 5
        candidates.push({ x: e.x, y: e.y, balloons: e.balloons, score })
      })
    }
    if (candidates.length === 0) return null
    candidates.sort((a, b) => b.score - a.score)
    const best = candidates[0]
    if (best.score > 10 && Math.random() > chaseRate) return null
    if (best.score <= 10 && Math.random() > chaseRate * 0.5) return null
    return best
  }

  _chaseTarget(target, flapMult = 1) {
    this.moveDir = target.x > this.x + this.width / 2 ? 1 : (target.x < this.x ? -1 : 0)
    if (target.y < this.y - 20 && this.balloons > 0) {
      this.flapAiTimer -= flapMult
      if (this.flapAiTimer <= 0) {
        this.flapAiTimer = this.flapInterval[0] + Math.random() * (this.flapInterval[1] - this.flapInterval[0])
        return { moveX: this.moveDir, flapJustPressed: true }
      }
    }
    return { moveX: this.moveDir, flapJustPressed: false }
  }

  _dodgeMove(flapMult = 1) {
    const fleeDir = Math.random() < 0.5 ? -1 : 1
    this.moveDir = fleeDir
    if (this.balloons > 0 && Math.random() < (0.5 * flapMult)) {
      return { moveX: fleeDir, flapJustPressed: true }
    }
    return { moveX: fleeDir, flapJustPressed: false }
  }

  _shouldDodge(lightningBolts, whale) {
    if (lightningBolts) {
      for (const l of lightningBolts) {
        if (Math.abs(this.x - l.x) < 40 && Math.abs(this.y - l.y) < 40) return true
      }
    }
    if (whale && whale.state === 'jumping') {
      const dx = Math.abs(this.x + this.width / 2 - whale.x)
      const dy = Math.abs(this.y + this.height / 2 - whale.y)
      if (dx < 60 && dy < 60) return true
    }
    if (this.balloons === 0 && this.y + this.height > WORLD.waterY - 100) return true
    return false
  }

  _fleeToNearestPlatform(flapMult = 1) {
    let bestPlat = null, bestDist = Infinity
    const platList = this._platforms || []
    for (const plat of platList) {
      const dx = Math.abs((plat.x + plat.w / 2) - (this.x + this.width / 2))
      const dy = plat.y - this.y
      const dist = dx + dy
      if (dist < bestDist) { bestDist = dist; bestPlat = plat }
    }
    if (bestPlat) {
      const targetX = bestPlat.x + bestPlat.w / 2
      this.moveDir = targetX > this.x + this.width / 2 ? 1 : (targetX < this.x ? -1 : 0)
      if (this.balloons > 0 && Math.random() < (0.6 * flapMult)) {
        return { moveX: this.moveDir, flapJustPressed: true }
      }
    }
    return { moveX: this.moveDir, flapJustPressed: false }
  }

  _roam() {
    if (Math.random() < 0.3) this.moveDir = Math.random() < 0.5 ? -1 : 1
    if (Math.random() < 0.15 && this.balloons > 0) {
      return { moveX: this.moveDir, flapJustPressed: true }
    }
    if (this.onGround && Math.abs(this.vx) < 10 && this.balloons > 0) {
      return { moveX: this.moveDir, flapJustPressed: true }
    }
    return { moveX: this.moveDir, flapJustPressed: false }
  }
}
