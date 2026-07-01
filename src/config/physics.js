// 物理参数集中配置 — 所有数值从此处读取，方便调参
// 基于旧原型验证过的起点值

export const PHYS = {
  // 逻辑分辨率（NES 风格 4:3）
  GAME_WIDTH: 480,
  GAME_HEIGHT: 360,

  // 重力（气球越多越轻）
  gravity: [0.85, 0.72, 0.55], // [0气球, 1气球, 2+气球]

  // 拍打冲量（气球越多飞越高）
  flapImpulse: [-6, -7, -8], // [0气球, 1气球, 2+气球]

  // 踩踏弹跳
  stompBounceFactor: 0.8, // 弹跳 = flapImpulse * factor

  // 水平移动
  moveSpeed: 2.8,
  horizontalFriction: 0.85,

  // 终速限制
  terminalVelocityDown: 8,
  terminalVelocityUp: 10,

  // 拍打冷却（帧数）
  flapCooldown: 5,

  // 气球系统
  maxBalloons: 5,
  rechargeRate: 100, // 站主地面每 N 帧充 1 气球
  enemyInflateDelay: 60, // 敌人重生后充气延迟（帧）
  enemyInflateDuration: 30, // 敌人充气动画时长（帧）

  // 连击
  comboWindow: 60, // 连击窗口（帧）
  comboScores: [200, 300, 400, 500],

  // 生死
  playerLives: 10,
  respawnInvincible: 360, // 复活无敌（帧）
  enemyRespawnTime: 180, // 敌人重生时间（帧）
  enemyInvincible: 60, // 敌人重生无敌（帧）

  // 水面（死亡线）
  waterY: 320,

  // 屏幕环绕
  screenWrap: false, // 暂用硬墙，后续可改
}

// 平台配置
export const PLATFORMS = [
  // 主地面
  { x: 0, y: 340, w: 480, h: 20, isGround: true },
  // 浮空平台
  { x: 60, y: 260, w: 80, h: 12 },
  { x: 200, y: 200, w: 80, h: 12 },
  { x: 340, y: 260, w: 80, h: 12 },
  { x: 120, y: 140, w: 80, h: 12 },
  { x: 280, y: 140, w: 80, h: 12 },
  // 高台
  { x: 200, y: 80, w: 80, h: 12 },
]

// 敌人配置
export const ENEMY_CONFIGS = [
  {
    name: '红色暴躁',
    color: '#f33',
    aiLevel: 3,
    speed: 3.2,
    balloonCount: 3,
    chaseRate: 0.6,
    flapInterval: [18, 35],
    spawnX: 240,
    spawnY: 60,
  },
  {
    name: '橙色',
    color: '#f84',
    aiLevel: 2,
    speed: 2.0,
    balloonCount: 2,
    chaseRate: 0.7,
    flapInterval: [30, 55],
    spawnX: 80,
    spawnY: 180,
  },
  {
    name: '绿巨人',
    color: '#4a4',
    aiLevel: 1,
    speed: 1.2,
    balloonCount: 3,
    chaseRate: 0.5,
    flapInterval: [35, 65],
    scale: 1.5,
    spawnX: 380,
    spawnY: 180,
  },
  {
    name: '蓝色',
    color: '#48f',
    aiLevel: 2,
    speed: 2.2,
    balloonCount: 2,
    chaseRate: 0.6,
    flapInterval: [25, 45],
    spawnX: 240,
    spawnY: 120,
  },
]

// 玩家配置
export const PLAYER_CONFIG = {
  width: 16,
  height: 20,
  color: '#4488ff',
  balloonColor: '#4488ff',
  initialBalloons: 2,
  spawnX: 240,
  spawnY: 40,
}
