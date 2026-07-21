// src/config/visuals.js
export const VISUALS = {
  pixelPerfect: false,
  // 天空（3段渐变：顶→中→底）
  skyTop: '#4A90D9',
  skyMid: '#87CEEB',
  skyBottom: '#C8E6FF',
  cloudCount: 30,
  cloudColors: ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.6)'],
  platformColor: '#FFFFFF',
  platformShadow: 'rgba(100,120,150,0.3)',
  waterColor: 'rgba(64,164,223,0.7)',
  waterSurface: 'rgba(100,200,255,0.5)',
  boundaryColor: 'rgba(150,200,255,0.3)',
  bodyOutline: 'rgba(0,0,0,0.2)',
  balloonHighlight: 'rgba(255,255,255,0.4)',
  frames: {
    flap: 4,
    walk: 4,
    idle: 2,
    fall: 2,
    inflate: 3,
    electrocute: 2,
    bounce: 1,
  },
  maxParticles: 200,
}
