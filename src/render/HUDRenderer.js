// src/render/HUDRenderer.js
import { WORLD } from '../config/world.js'

export class HUDRenderer {
  render(ctx, camera, data) {
    const w = camera.viewWidth
    const h = camera.viewHeight
    const { player, aliveCount, totalTime } = data

    ctx.save()

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

    // === 左上：气球数 ===
    const balloonCount = player?.balloons || 0
    const balloonColor = player?.balloonColor || '#4DA6FF'
    const balloonIconsX = 12
    const balloonIconsY = 48
    const iconR = 8
    for (let i = 0; i < balloonCount; i++) {
      const bx = balloonIconsX + iconR + i * (iconR * 2 + 3)
      const by = balloonIconsY + iconR
      ctx.fillStyle = balloonColor
      ctx.beginPath()
      ctx.arc(bx, by, iconR, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'
      ctx.lineWidth = 1
      ctx.stroke()
    }
    ctx.font = 'bold 16px sans-serif'
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'left'
    ctx.fillText(`×${balloonCount}`, balloonIconsX + iconR + balloonCount * (iconR * 2 + 3) + 2, balloonIconsY + iconR + 6)

    // === 右上：剩余人数 ===
    ctx.font = 'bold 18px sans-serif'
    ctx.textAlign = 'right'
    const aliveText = `存活 ${aliveCount || 0}`
    const aliveW = ctx.measureText(aliveText).width + 20
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.beginPath()
    ctx.roundRect(w - aliveW - 10, 8, aliveW, 30, 10)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.fillText(aliveText, w - 20, 29)

    // === 右下：小地图 ===
    const mapSize = 85
    const mapX = w - mapSize - 10
    const mapY = h - mapSize * (WORLD.height / WORLD.width) - 10
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

    // 缩圈弧线
    if (data.zoneRadius && data.zoneCenterX !== undefined) {
      const zcx = mapX + (data.zoneCenterX / WORLD.width) * mapSize
      const zcy = mapY + (data.zoneCenterY / WORLD.height) * mapH
      const zr = (data.zoneRadius / WORLD.width) * mapSize
      ctx.strokeStyle = 'rgba(150,200,255,0.5)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(zcx, zcy, zr, 0, Math.PI * 2)
      ctx.stroke()
    }

    // 玩家点（大圆点 + 白色描边）
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

    // 敌人点（小圆点）
    if (data.enemies) {
      data.enemies.forEach(e => {
        if (!e.alive) return
        const ex = mapX + (e.x / WORLD.width) * mapSize
        const ey = mapY + (e.y / WORLD.height) * mapH
        ctx.fillStyle = e.color || '#f00'
        ctx.beginPath()
        ctx.arc(ex, ey, 1.5, 0, Math.PI * 2)
        ctx.fill()
      })
    }

    ctx.restore()
  }
}
