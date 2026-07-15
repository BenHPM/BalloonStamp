// src/config/world.js
export const WORLD = {
  width: 2400,
  height: 1800,
  // 空间网格
  cellSize: 120,
  // 可视区域（逻辑分辨率）
  viewPortrait: { w: 720, h: 1280 },
  viewLandscape: { w: 1280, h: 720 },
  // 水域
  waterY: 1700,
  waterLethalDepth: 1760,
  // 缩圈
  zoneShrinkStart: 60,
  zoneShrinkInterval: 30,
  zoneShrinkRate: 0.92,
  zoneMinRadius: 400,
  // 边界反弹
  boundaryBounce: 0.5,
  zonePushForce: 400,
  // 圈外伤害（每秒）
  zoneDamage: [0, 5, 15], // 0-5s: 0, 5-10s: 5/s, 10s+: 15/s
  zoneDamageIntervals: [5, 10], // 伤害递增的时间节点
  zoneVignetteMax: 0.35, // 圈外红色渐晕最大透明度
  zoneDamageTickInterval: 0.5, // 圈外伤害计时精度（秒）
  // AI 难度阶段
  difficultyPhases: [
    { time: 0,   aiCount: 4, chaseMultiplier: 0.5,  flapMultiplier: 1.5,  berserker: false },
    { time: 30,  aiCount: 6, chaseMultiplier: 0.75, flapMultiplier: 1.2,  berserker: true  },
    { time: 90,  aiCount: 7, chaseMultiplier: 1.0,  flapMultiplier: 1.0,  berserker: true  },
    { time: 150, aiCount: 8, chaseMultiplier: 1.2,  flapMultiplier: 0.85, berserker: true  },
  ],
}
