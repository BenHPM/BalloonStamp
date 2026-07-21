// src/entities/Environmental.js
import { WORLD } from '../config/world.js'

// 闪电弹球 — 参考 FC 原作 lc9b6_boltupdate（固定点速度 + 小数累积）
export class Lightning {
  constructor(x, y, cloudX, cloudY) {
    this.x = x; this.y = y
    this.cloudX = cloudX; this.cloudY = cloudY // 发射来源云位置
    // FC 原作：从速度表取弹道（含 Y 速度整数 + X 速度分数偏移）
    const entry = BOLT_SPEED_TABLE[Math.floor(Math.random() * BOLT_SPEED_TABLE.length)]
    // FC 用 8-bit 小数部分，这里用浮点模拟：vy = 整数部分，vxFrac 为累积偏移
    this.vy = entry.yVel
    this.vxFrac = entry.xFrac // 模拟 FC 的低 8 位小数累积
    this.width = 12; this.height = 12
    this.life = 4.0 // 秒（FC 约 256 帧 ≈ 4.3s）
    this.alive = true
  }

  update(dt, platforms, clouds) {
    // 模拟 FC 固定点：vxFrac 每帧累积到 vx
    this.vxFrac += (this.vxFrac > 0 ? 30 : -30) * dt // 模拟 frac 位的微调漂移
    const vx = (this.cloudX - this.x) * 0.02 + Math.sin(this.vxFrac * 0.1) * 40 // 微弧度飘动

    this.x += vx * dt
    this.y += this.vy * dt
    this.life -= dt
    if (this.life <= 0) { this.alive = false; return }

    // 碰上下边界反弹（FC 原作：Y=#$02 和 Y=#$D8 反弹 lca4f）
    if (this.y < 0) { this.y = 0; this.vy = Math.abs(this.vy) }
    if (this.y > WORLD.height - this.height) { this.y = WORLD.height - this.height; this.vy = -Math.abs(this.vy) * 0.6 }
    // 出左右界消失（FC 出界即消失）
    if (this.x < -20 || this.x > WORLD.width + 20) { this.alive = false; return }

    // 反弹平台（FC 原作碰到平台即反弹）
    for (const p of platforms) {
      if (this.x > p.x && this.x < p.x + p.w && this.y > p.y && this.y < p.y + p.h) {
        this.vy = -this.vy
        this.y += this.vy * dt
        break
      }
    }

    // 碰白云本体消散（FC：bolt 碰 cloud 即消失）
    if (clouds) {
      for (const c of clouds) {
        const dx = this.x - c.x
        const dy = this.y - c.y
        if (Math.hypot(dx, dy) < c.radius + 5) {
          this.alive = false
          return
        }
      }
    }

    // 碰水面消散
    if (this.y >= WORLD.waterY) this.alive = false
  }
}

// 闪电云放电间隔：随 phase 递减（FC 原作 lc761：25 级 countdown 从 15 缩至 5）
// phase 0-3 分别对应前 4 个难度阶段；后续 phase 保持最低值
const CLOUD_DISCHARGE_INTERVALS = [8, 6, 5, 4, 3, 3, 2.5, 2.5]

// 闪电弹道速度表（FC 原作 lc8ab/lc89f，带小数部分的固定点速度）
// [Y_vel_int, X_vel_frac_adjust] — 对应 FC 的 lc8ab（Y速度整数）和 lc89f（X速度分数偏移）
const BOLT_SPEED_TABLE = [
  { yVel: -180, xFrac: 0 },    // 向上慢
  { yVel: -140, xFrac: 20 },   // 向上中
  { yVel: -80, xFrac: 40 },    // 向上快+横移
  { yVel: 60, xFrac: 60 },     // 向下慢+横移
  { yVel: 100, xFrac: 80 },    // 向下中
  { yVel: 140, xFrac: 100 },   // 向下快
]

// 小白云
export class Cloud {
  constructor(x, y, radius, phase = 0) {
    this.x = x; this.y = y; this.radius = radius
    this.width = radius * 2; this.height = radius * 2
    // FC 原作：放电间隔按 phase 递减，模拟难度递增
    this.dischargeInterval = CLOUD_DISCHARGE_INTERVALS[Math.min(phase, CLOUD_DISCHARGE_INTERVALS.length - 1)]
    this.dischargeTimer = 1 + Math.random() * this.dischargeInterval * 0.5 // 初始随机偏移
    this.alive = true
    this.phase = phase
  }

  update(dt) {
    this.dischargeTimer -= dt
    if (this.dischargeTimer <= 0) {
      // 按 phase 调整间隔（难度越高放电越频繁）
      this.dischargeInterval = CLOUD_DISCHARGE_INTERVALS[Math.min(this.phase, CLOUD_DISCHARGE_INTERVALS.length - 1)]
      this.dischargeTimer = this.dischargeInterval * (0.7 + Math.random() * 0.6)
      return true // 发出闪电
    }
    return false
  }

  // 随游戏阶段升级放电频率
  setPhase(phase) {
    this.phase = phase
    this.dischargeInterval = CLOUD_DISCHARGE_INTERVALS[Math.min(phase, CLOUD_DISCHARGE_INTERVALS.length - 1)]
  }

  discharge() {
    return new Lightning(this.x, this.y, this.x, this.y)
  }
}

// 鲸鱼 — 参考 FC 原作 fish 行为（lc614_fishsearchtarget）
// FC：鱼优先游向「Y 位置在鱼上方且气球数=1」的玩家，击中后恢复气球
export class Whale {
  constructor() {
    this.x = Math.random() * WORLD.width
    this.y = WORLD.waterY
    this.state = 'hidden' // hidden | warning | charging | jumping | returning
    this.timer = 8 + Math.random() * 12
    this.width = 80; this.height = 60
    this.alive = true
    this.targetX = 0
    this.targetY = 0
    // 弹射轨迹（FC 原作快速扑击，非缓慢正弦）
    this.launchVx = 0
    this.launchVy = 0
  }

  update(dt, entities) {
    this.timer -= dt
    if (this.state === 'hidden') {
      if (this.timer <= 0) {
        // FC 风格目标选择：优先瞄准上方且气球数=1 的实体（最危险的猎物）
        this._selectTarget(entities)
        if (this.targetX !== null) {
          this.x = this.targetX // 对准目标 X
          this.state = 'warning'
          this.timer = 1.2 // 预警（比旧版 1.5s 更快）
        } else {
          this.timer = 5 // 无目标则等待
        }
      }
    } else if (this.state === 'warning') {
      if (this.timer <= 0) {
        this.state = 'charging'
        this.timer = 0.25 // 蓄力窗口
        this.launchVx = (this.targetX - this.x) / 0.45 // 弹射到目标 X
        this.launchVy = -400 // 弹射速度（快速上跃）
      }
    } else if (this.state === 'charging') {
      if (this.timer <= 0) {
        this.state = 'jumping'
        this.timer = 0.5 // 弹射持续（比旧版 0.8s 更短更致命）
        this.jumpStartX = this.x
        this.jumpStartY = WORLD.waterY
      }
    } else if (this.state === 'jumping') {
      const progress = 1 - this.timer / 0.5
      this.x = this.jumpStartX + this.launchVx * progress
      this.y = this.jumpStartY + this.launchVy * progress + 600 * progress * progress // 重力抛物线
      if (this.timer <= 0) {
        this.state = 'returning'
        this.timer = 0.6
        this.y = WORLD.waterY
      }
    } else if (this.state === 'returning') {
      if (this.timer <= 0) {
        this.state = 'hidden'
        this.timer = 10 + Math.random() * 15 // 冷却
      }
    }
    return this.state
  }

  // FC 风格：优先选择「上方且气球数=1」的目标
  _selectTarget(entities) {
    this.targetX = null
    this.targetY = null
    const candidates = entities.filter(e => e.alive && e.y < WORLD.waterY - 100)
    if (candidates.length === 0) return

    // 第一优先级：上方 + 仅 1 气球（FC 最容易吃的猎物）
    const vulnerable = candidates.filter(e => e.balloons === 1 && e.y < WORLD.waterY - 200)
    const pool = vulnerable.length > 0 ? vulnerable : candidates

    // 在候选池中随机选择，但加权靠近水面的（更容易扑到）
    pool.sort((a, b) => (b.y - a.y) - (a.y - a.y)) // 按 Y 降序（越靠近水越优先）
    const top = pool.slice(0, Math.min(3, pool.length))
    const pick = top[Math.floor(Math.random() * top.length)]
    this.targetX = pick.x + pick.width / 2
    this.targetY = pick.y
  }

  checkEat(entity) {
    if (this.state !== 'jumping') return false
    // 更严格的碰撞（只有鲸鱼腹部判定）
    const dx = Math.abs(entity.x + entity.width / 2 - this.x)
    const dy = Math.abs(entity.y + entity.height / 2 - this.y)
    return dx < 35 && dy < 35
  }
}

// 气流区
export class AirCurrent {
  constructor(config) {
    Object.assign(this, config)
  }

  applyForce(entity, dt) {
    if (entity.x + entity.width > this.x && entity.x < this.x + this.w &&
        entity.y + entity.height > this.y && entity.y < this.y + this.h) {
      entity.vx += this.dirX * this.strength * dt
      entity.vy += this.dirY * this.strength * dt
    }
  }
}
