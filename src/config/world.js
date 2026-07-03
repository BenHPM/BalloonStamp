// src/config/world.js
export const WORLD = {
  width: 2400,
  height: 1800,
  // 空间网格
  cellSize: 120, // 格子边长
  // 可视区域（逻辑分辨率）
  viewPortrait: { w: 720, h: 1280 },
  viewLandscape: { w: 1280, h: 720 },
  // 水域
  waterY: 1700, // 水面 Y 坐标
  waterLethalDepth: 1760, // 完全沉没线
  // 缩圈
  zoneShrinkStart: 60, // 对局开始后多少秒开始缩
  zoneShrinkInterval: 30, // 每多少秒缩一次
  zoneShrinkRate: 0.92, // 每次缩到上一圈的多少比例
  zoneMinRadius: 400, // 最小圈半径
  // 边界反弹
  boundaryBounce: 0.5, // 气流墙反弹系数
  zonePushForce: 400, // 圈外推力 px/s
}
