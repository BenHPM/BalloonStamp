// src/config/physics.js
// 所有数值以"世界单位/秒"定义，固定步长 dt=1/60s 应用
export const PHYS = {
  // 重力（按气球数索引：0最重，5最轻）
  gravity: [1400, 1200, 1000, 850, 750, 650], // px/s²，索引 0-5 对应气球数
  // 拍打冲量（按气球数索引，0时无法拍打）
  flapImpulse: [0, -280, -310, -330, -350, -370], // px/s — 拍打冲量适度，气球越多越高
  flapCooldown: 0.35, // 秒 — 拍打节奏感，不能疯狂连拍
  // 水平移动
  moveAccel: 1800, // px/s²
  maxMoveSpeed: 280, // px/s
  horizontalFriction: 0.92, // 每步衰减系数
  // 终速
  terminalVelocityDown: 500, // px/s
  terminalVelocityUp: 600, // px/s
  // 踩踏弹跳
  stompBounceFactor: 0.8, // 弹跳 = 当前flapImpulse × factor
  // 气球
  maxBalloons: 5,
  initialBalloons: 2,
  // 成长（每多1个气球超过初始值）
  sizePerBalloon: 0.03, // +3%
  speedPerBalloon: 0.02, // +2%
  // 0气球恢复
  inflateStillTime: 2.0, // 静止秒数触发充气
  inflateDuration: 1.5, // 充气动画秒数
  inflateRecoverTo: 1, // 恢复到几个气球
  // 侧面弹开
  bounceForce: 200, // px/s
}
