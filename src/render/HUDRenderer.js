// src/render/HUDRenderer.js
import { WORLD } from '../config/world.js'

export class HUDRenderer {
  render(ctx, camera, data) {
    const w = camera.viewWidth
    const h = camera.viewHeight
    const { player, aliveCount, totalTime } = data

    ctx.save()

    // 左上：气球数
    ctx.font = 'bold 20px sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.textAlign = 'left'
    // 画气球图标
    for (let i = 0; i < (player?.balloons || 0); i++) {
      ctx.beginPath()
      ctx.arc(20 + i * 22, 24, 8, 0, Math.PI * 2)
      ctx.fillStyle = player?.balloonColor || '#4DA6FF'
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'
      ctx.lineWidth = 1
      ctx.stroke()
    }
    ctx.fillStyle = '#fff'
    ctx.fillText(`×${player?.balloons || 0}`, 20 + (player?.balloons || 0) * 22 + 5, 29)

    // 右上：剩余人数
    ctx.textAlign = 'right'
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.fillText(`剩余 ${aliveCount || 0}`, w - 20, 29)

    // 顶部居中：时间
    ctx.textAlign = 'center'
    const sec = Math.floor(totalTime || 0)
    const mm = Math.floor(sec / 60).toString().padStart(2, '0')
    const ss = (sec % 60).toString().padStart(2, '0')
    ctx.fillText(`${mm}:${ss}`, w / 2, 29)

    // 右上小地图
    const mapSize = 80
    const mapX = w - mapSize - 20
    const mapY = 40
    const mapH = mapSize * (WORLD.height / WORLD.width)
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.fillRect(mapX, mapY, mapSize, mapH)
    // 玩家点
    if (player) {
      const px = mapX + (player.x / WORLD.width) * mapSize
      const py = mapY + (player.y / WORLD.height) * mapH
      ctx.fillStyle = '#4DA6FF'
      ctx.beginPath()
      ctx.arc(px, py, 2, 0, Math.PI * 2)
      ctx.fill()
    }
    // 敌人点
    if (data.enemies) {
      data.enemies.forEach(e => {
        if (!e.alive) return
        const ex = mapX + (e.x / WORLD.width) * mapSize
        const ey = mapY + (e.y / WORLD.height) * mapH
        ctx.fillStyle = e.color || '#f00'
        ctx.fillRect(ex - 1, ey - 1, 2, 2)
      })
    }

    ctx.restore()
  }
}
