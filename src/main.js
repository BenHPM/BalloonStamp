// src/main.js
const canvas = document.getElementById('game-canvas')
const ctx = canvas.getContext('2d')

function resize() {
  const dpr = window.devicePixelRatio || 1
  canvas.width = window.innerWidth * dpr
  canvas.height = window.innerHeight * dpr
  canvas.style.width = window.innerWidth + 'px'
  canvas.style.height = window.innerHeight + 'px'
}
window.addEventListener('resize', resize)
resize()

ctx.fillStyle = '#87CEEB'
ctx.fillRect(0, 0, canvas.width, canvas.height)
ctx.fillStyle = '#fff'
ctx.font = '24px sans-serif'
ctx.textAlign = 'center'
ctx.fillText('BalloonStamp v2 — 加载中...', canvas.width / 2, canvas.height / 2)
