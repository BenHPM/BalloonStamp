// src/systems/CollisionSystem.js
import { PHYS } from '../config/physics.js'

export class CollisionSystem {
  // 检查两个实体之间的碰撞
  checkCollision(a, b) {
    if (!a.alive || !b.alive) return null
    // AABB 重叠
    if (a.x + a.width <= b.x || b.x + b.width <= a.x) return null
    if (a.y + a.height <= b.y || b.y + b.height <= a.y) return null

    // 踢杀：攻击方有气球 + 被攻方 0 气球 + 在地面
    if (a.balloons > 0 && b.balloons === 0 && b.onGround) {
      return { type: 'kick', attacker: a, victim: b }
    }
    if (b.balloons > 0 && a.balloons === 0 && a.onGround) {
      return { type: 'kick', attacker: b, victim: a }
    }

    // 判断谁从上方踩踏
    const aFromAbove = a.vy > 0 && (a.y + a.height * 0.5) < (b.y + b.height * 0.5) &&
      (a.y + a.height) - b.y > PHYS.stompOverlapDepth
    const bFromAbove = b.vy > 0 && (b.y + b.height * 0.5) < (a.y + a.height * 0.5) &&
      (b.y + b.height) - a.y > PHYS.stompOverlapDepth

    if (aFromAbove && !bFromAbove && a.balloons > 0 && b.balloons > 0) {
      return { type: 'stomp', attacker: a, victim: b }
    }
    if (bFromAbove && !aFromAbove && b.balloons > 0 && a.balloons > 0) {
      return { type: 'stomp', attacker: b, victim: a }
    }

    // 侧面碰撞
    return { type: 'side', a, b }
  }

  // 解析踩踏事件
  resolveStomp(attacker, victim, physicsEngine, scoreSystem, particleSystem) {
    const events = []

    // 被踩方失 1 气球
    victim.loseBalloon()
    events.push({ type: 'balloonPop', entity: victim })

    // 攻击方获得气球（如果未达上限）
    if (attacker.balloons < attacker.maxBalloons) {
      attacker.gainBalloon()
      events.push({ type: 'balloonGain', entity: attacker })
    }

    // 攻击方弹跳
    physicsEngine.applyStompBounce(attacker)
    events.push({ type: 'stompBounce', entity: attacker })

    // 分数
    if (scoreSystem && attacker.isPlayer) {
      scoreSystem.addStompScore(attacker)
    }

    // 粒子
    if (particleSystem) {
      particleSystem.burst(victim.x + victim.width / 2, victim.y, '#fff', PHYS.stompParticleCount)
    }

    return events
  }

  // 解析侧面弹开
  resolveSide(a, b, physicsEngine) {
    const dirA = a.x < b.x ? -1 : 1
    physicsEngine.applyBounce(a, dirA)
    physicsEngine.applyBounce(b, -dirA)
    // 击晕：双方短暂硬直
    a.stunTimer = PHYS.stunDuration
    b.stunTimer = PHYS.stunDuration
    return [{ type: 'bounce', a, b }]
  }
}
