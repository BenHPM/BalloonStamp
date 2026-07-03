// src/config/visuals.js
export const VISUALS = {
  // 通用
  pixelPerfect: false, // 不用像素风，用平滑渲染
  // 天空
  skyTop: '#87CEEB',
  skyBottom: '#E0F6FF',
  // 云朵（背景装饰）
  cloudCount: 30,
  cloudColors: ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.6)'],
  // 云岛平台
  platformColor: '#FFFFFF',
  platformShadow: 'rgba(100,120,150,0.3)',
  // 水面
  waterColor: 'rgba(64,164,223,0.7)',
  waterSurface: 'rgba(100,200,255,0.5)',
  // 气流墙
  boundaryColor: 'rgba(150,200,255,0.3)',
  // 角色
  bodyOutline: 'rgba(0,0,0,0.2)',
  // 气球
  balloonHighlight: 'rgba(255,255,255,0.4)',
  // 动画帧数
  frames: {
    flap: 4,
    walk: 4,
    idle: 2,
    fall: 2,
    inflate: 3,
    electrocute: 2,
    bounce: 1,
  },
  // 粒子上限
  maxParticles: 200,
}
