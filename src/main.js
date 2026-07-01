// 入口 — 初始化游戏

import { GameEngine } from './engine/GameEngine.js'

function init() {
  const canvas = document.getElementById('game-canvas')
  if (!canvas) {
    console.error('Canvas element not found')
    return
  }

  const engine = new GameEngine(canvas)
  engine.start()
}

// DOM 就绪后启动
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
