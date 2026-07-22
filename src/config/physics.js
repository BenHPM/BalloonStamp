// src/config/physics.js
// 所有数值以"世界单位/秒"定义，固定步长 dt=1/60s 应用
// 物理模型参考 FC 气球大战 ROM 拆解 (LuigiBlood/balloonfight_dis)
// FC 终端下落 ≈ 2px/frame = 120px/s，水平加速 ≈ 10/256 px/frame²
// 因 .io 大地图(2400x1800 vs FC 256x240)，按屏幕比例放大约 2.5-3×
export const PHYS = {
  // 重力：恒定向下加速度
  gravity: 650,
  // 浮力：按气球数提供向上加速度
  // FC 原作 2 气球 ≈ 中性浮力，此处扩展至 5 支持 .io 玩法
  // 关键：flapImpulse 与气球数无关——技能差距来自拍打频率，而非气球数
  buoyancy: [0, 280, 530, 630, 700, 750],
  // 拍打冲量（统一值，加法脉冲：在当前 vy 基础上叠加）
  // FC 原作拍打频率 ≈ 0.12s/次，冲量 ≈ -90~-120 px/s（.io 按比例放大至 -150）
  flapImpulse: [-150, -150, -150, -150, -150, -150],
  flapCooldown: 0.12,

  // 水平移动：加速度模型（FC 空中=地面完全相同加速度）
  // FC 水平加速 ≈ 10/256 px/frame² = 140px/s²；.io 大地图放大至 500
  moveAccel: 500,
  maxMoveSpeed: 250,
  // 空中摩擦极轻（FC 约 1-2%/帧），保持水平动量 → 标志性"飘滑感"
  coastFriction: 0.993,
  groundFriction: 0.88,
  moveDeadZone: 0.05,
  // 终速（参考 FC 终端下落 ≈ 120px/s，.io 放大至 350）
  terminalVelocityDown: 350,
  terminalVelocityUp: 500,
  // 踩踏弹跳
  stompBounceFactor: 0.75,
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
  invincibleDuration: 10.0,
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
  stunDuration: 0.3,
}
