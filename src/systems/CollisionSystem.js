// 碰撞检测系统 — 踩踏判定、侧面碰撞、踢杀

import { PHYS } from '../config/physics.js'

export class CollisionSystem {
  constructor() {
    this.comboCount = 0
    this.comboTimer = 0
  }

  update() {
    if (this.comboTimer > 0) {
      this.comboTimer--
      if (this.comboTimer <= 0) this.comboCount = 0
    }
  }

  // 检测两个实体的碰撞结果
  checkStomp(a, b) {
    if (!this._overlap(a, b)) return null

    const aCenterY = a.y + a.height / 2
    const bCenterY = b.y + b.height / 2
    const aAbove = aCenterY < bCenterY

    // A 在上方且向下运动 = A 踩 B
    if (aAbove && a.vy > 0 && a.balloons > 0) {
      return { attacker: a, victim: b, type: 'stomp' }
    }
    // B 在上方且向下运动 = B 踩 A
    if (!aAbove && b.vy > 0 && b.balloons > 0) {
      return { attacker: b, victim: a, type: 'stomp' }
    }
    // 侧面碰撞 = 互爆
    return { type: 'side', a, b }
  }

  // 踢杀判定（有气球踩无气球地面敌人）
  checkKick(attacker, victim) {
    if (!this._overlap(attacker, victim)) return false
    if (attacker.balloons > 0 && victim.balloons <= 0 && victim.onGround) {
      return true
    }
    return false
  }

  // 处理踩踏结果，返回事件列表
  resolveStomp(attacker, victim) {
    const events = []

    if (victim.balloons > 0) {
      // 爆一个气球（用实体方法以同步视觉）
      victim.loseBalloon()
      // 气球转移给攻击者
      attacker.gainBalloon()
      events.push({ type: 'balloonPop', entity: victim })
      events.push({ type: 'stompBounce', entity: attacker })

      // 连击（仅玩家为攻击者时计连击）
      if (attacker._isPlayer) {
        this.comboCount++
        this.comboTimer = PHYS.comboWindow
        const comboIndex = Math.min(this.comboCount - 1, PHYS.comboScores.length - 1)
        events.push({ type: 'score', value: PHYS.comboScores[comboIndex], combo: this.comboCount })
      }
    } else {
      // 踢杀（0气球被踩 = 直接击杀）
      events.push({ type: 'kickKill', entity: victim })
      events.push({ type: 'stompBounce', entity: attacker })
      events.push({ type: 'score', value: 300 })
    }

    return events
  }

  // 侧面碰撞结果
  resolveSide(a, b) {
    const events = []
    if (a.balloons > 0) {
      a.loseBalloon()
      events.push({ type: 'balloonPop', entity: a })
    }
    if (b.balloons > 0) {
      b.loseBalloon()
      events.push({ type: 'balloonPop', entity: b })
    }
    // 弹开
    const knockback = 3
    if (a.x < b.x) {
      a.vx = -knockback
      b.vx = knockback
    } else {
      a.vx = knockback
      b.vx = -knockback
    }
    return events
  }

  _overlap(a, b) {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y
  }
}
