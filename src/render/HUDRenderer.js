// src/render/HUDRenderer.js
import { WORLD } from '../config/world.js'

export class HUDRenderer {
  render(ctx, camera, data) {
    const w = camera.viewWidth
    const h = camera.viewHeight
    const { player, aliveCount, totalTime } = data

    ctx.save()

    // === 左上：气球数 ===
    const balloonCount = player?.balloons || 0
    const balloonColor = player?.balloonColor || '#4DA6FF'

    // 背景面板
    const panelW = 30 + Math.max(balloonCount, 1) * 28 + 40
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.beginPath()
    ctx.roundRect(10, 8, panelW, 36, 12)
    ctx.fill()

    // 气球图标（大且清晰）
    for (let i = 0; i < balloonCount; i++) {
      const bx = 28 + i * 28
      const by = 26
      // 气球主体
      ctx.fillStyle = balloonColor
      ctx.beginPath()
      ctx.arc(bx, by, 10, 0, Math.PI * 2)
      ctx.fill()
      // 高光
      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      ctx.beginPath()
      ctx.arc(bx - 3, by - 3, 3.5, 0, Math.PI * 2)
      ctx.fill()
      // 描边
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'
      ctx.lineWidth = 1
      ctx.stroke()
    }

    // 数字
    ctx.font = 'bold 22px sans-serif'
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'left'
    ctx.fillText(`×${balloonCount}`, 28 + balloonCount * 28 + 4, 33)

    // === 右上：剩余人数 ===
    ctx.font = 'bold 18px sans-serif'
    ctx.textAlign = 'right'
    // 背景面板
    const aliveText = `存活 ${aliveCount || 0}`
    const aliveW = ctx.measureText(aliveText).width + 20
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.beginPath()
    ctx.roundRect(w - aliveW - 10, 8, aliveW, 30, 10)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.fillText(aliveText, w - 20, 29)

    // === 顶部居中：时间 ===
    ctx.textAlign = 'center'
    const sec = Math.floor(totalTime || 0)
    const mm = Math.floor(sec / 60).toString().padStart(2, '0')
    const ss = (sec % 60).toString().padStart(2, '0')
    const timeText = `${mm}:${ss}`
    const timeW = ctx.measureText(timeText).width + 20
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.beginPath()
    ctx.roundRect(w / 2 - timeW / 2, 8, timeW, 30, 10)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.fillText(timeText, w / 2, 29)

    // === 右上小地图 ===
    const mapSize = 70
    const mapX = w - mapSize - 14
    const mapY = 46
    const mapH = mapSize * (WORLD.height / WORLD.width)

    // 小地图背景
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.beginPath()
    ctx.roundRect(mapX - 2, mapY - 2, mapSize + 4, mapH + 4, 6)
    ctx.fill()

    // 小地图水域
    const waterRatio = (WORLD.height - WORLD.waterY) / WORLD.height
    ctx.fillStyle = 'rgba(64,164,223,0.4)'
    ctx.fillRect(mapX, mapY + mapH * (1 - waterRatio), mapSize, mapH * waterRatio)

    // 玩家点（大且醒目）
    if (player && player.alive) {
      const px = mapX + (player.x / WORLD.width) * mapSize
      const py = mapY + (player.y / WORLD.height) * mapH
      ctx.fillStyle = '#4DA6FF'
      ctx.beginPath()
      ctx.arc(px, py, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 1
      ctx.stroke()
    }

    // 敌人点
    if (data.enemies) {
      data.enemies.forEach(e => {
        if (!e.alive) return
        const ex = mapX + (e.x / WORLD.width) * mapSize
        const ey = mapY + (e.y / WORLD.height) * mapH
        ctx.fillStyle = e.color || '#f00'
        ctx.fillRect(ex - 1.5, ey - 1.5, 3, 3)
      })
    }

    ctx.restore()
  }
}
