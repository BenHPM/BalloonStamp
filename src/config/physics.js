// src/config/physics.js
// 所有数值以"世界单位/秒"定义，固定步长 dt=1/60s 应用
export const PHYS = {
  // 重力（按气球数索引：0最重，5最轻）
  gravity: [1050, 880, 720, 620, 520, 420],
  // 拍打冲量
  flapImpulse: [0, -380, -420, -450, -480, -510],
  flapCooldown: 0.35,
  // 水平移动
  moveAccel: 2000,
  maxMoveSpeed: 280,
  coastFriction: 0.985,
  moveDeadZone: 0.05,
  // 终速
  terminalVelocityDown: 500,
  terminalVelocityUp: 600,
  // 踩踏弹跳
  stompBounceFactor: 0.8,
  // 气球
  maxBalloons: 5,
  initialBalloons: 2,
  sizePerBalloon: 0.03,
  speedPerBalloon: 0.02,
  // 0气球恢复
  inflateStillTime: 2.0,
  inflateDuration: 1.5,
  inflateRecoverTo: 1,
  // 反馈动画
  landSquashDuration: 0.12,
  shockwaveDuration: 0.25,
  invincibleDuration: 3.0,
  // 踩踏判定
  stompOverlapDepth: 5,
  stompParticleCount: 12,
  // 平台碰撞容差
  platformTolerance: 0,
  // 击中判定容差
  hitTolerance: 6,
  lightningParticleCount: 15,
  whaleParticleCount: 15,
  // 动画
  animFrameDuration: 0.1,
  // 输入
  inputDeadZone: 0.1,
  stillThreshold: 20,
  // 侧面弹开
  bounceForce: 200,
  // 击晕（侧面碰撞硬直）
  stunDuration: 0.3, // 秒
}
