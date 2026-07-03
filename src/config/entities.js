// src/config/entities.js
export const PLAYER_CONFIG = {
  width: 28, height: 36,
  color: '#4DA6FF',
  balloonColor: '#4DA6FF',
  spawnX: 1200, spawnY: 200,
}

export const AI_TYPES = {
  drifter: {
    name: '飘游型',
    color: '#A8D8EA',
    speed: 0.6, // 相对系数
    chaseRate: 0.15, // 追击概率
    flapInterval: [0.5, 1.2], // 秒
    balloonCount: 2,
    scale: 0.9,
  },
  chaser: {
    name: '追击型',
    color: '#FF8855',
    speed: 1.0,
    chaseRate: 0.6,
    flapInterval: [0.3, 0.7],
    balloonCount: 2,
    scale: 1.0,
  },
  ambusher: {
    name: '伏击型',
    color: '#6B4E71',
    speed: 1.2,
    chaseRate: 0.4,
    flapInterval: [0.25, 0.5],
    balloonCount: 2,
    scale: 0.85,
  },
  berserker: {
    name: '暴躁型',
    color: '#E63946',
    speed: 1.4,
    chaseRate: 0.7,
    flapInterval: [0.2, 0.4],
    balloonCount: 3,
    scale: 1.3,
  },
}

// AI 占比
export const AI_DISTRIBUTION = [
  { type: 'drifter', ratio: 0.40 },
  { type: 'chaser', ratio: 0.25 },
  { type: 'ambusher', ratio: 0.20 },
  { type: 'berserker', ratio: 0.15 },
]

// 总实体数
export const TOTAL_ENTITIES = 20 // 含玩家

// AI 决策间隔（秒）
export const AI_DECISION_INTERVAL = [0.25, 0.5]

// 云岛平台布局
export const PLATFORMS = [
  { x: 200, y: 500, w: 140, h: 24 },
  { x: 500, y: 800, w: 120, h: 24 },
  { x: 800, y: 400, w: 160, h: 24 },
  { x: 1100, y: 700, w: 140, h: 24 },
  { x: 1400, y: 500, w: 120, h: 24 },
  { x: 1700, y: 900, w: 160, h: 24 },
  { x: 2000, y: 600, w: 140, h: 24 },
  { x: 300, y: 1200, w: 120, h: 24 },
  { x: 700, y: 1400, w: 140, h: 24 },
  { x: 1100, y: 1100, w: 160, h: 24 },
  { x: 1500, y: 1350, w: 120, h: 24 },
  { x: 1900, y: 1150, w: 140, h: 24 },
  { x: 400, y: 300, w: 100, h: 20 },
  { x: 1000, y: 250, w: 120, h: 20 },
  { x: 1600, y: 350, w: 100, h: 20 },
  { x: 2100, y: 1200, w: 140, h: 24 },
  { x: 2200, y: 800, w: 100, h: 20 },
  { x: 200, y: 1550, w: 120, h: 24 },
]

// 小白云（闪电云）
export const LIGHTNING_CLOUDS = [
  { x: 600, y: 600, radius: 50 },
  { x: 1300, y: 900, radius: 50 },
  { x: 1800, y: 400, radius: 50 },
  { x: 900, y: 1300, radius: 50 },
]

// 气流区
export const AIR_CURRENTS = [
  { x: 400, y: 1000, w: 200, h: 150, dirX: 1, dirY: 0, strength: 150 },
  { x: 1500, y: 600, w: 200, h: 150, dirX: -1, dirY: 0, strength: 150 },
  { x: 1000, y: 1200, w: 150, h: 200, dirX: 0, dirY: -1, strength: 200 },
]
