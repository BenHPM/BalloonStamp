// src/engine/Camera.js
export class Camera {
  constructor(worldWidth, worldHeight, viewWidth, viewHeight) {
    this.worldWidth = worldWidth
    this.worldHeight = worldHeight
    this.viewWidth = viewWidth
    this.viewHeight = viewHeight
    this.x = 0
    this.y = 0
    this.lerp = 0.1
    // 玩家偏下：屏幕 2/3 处
    this.verticalOffset = viewHeight * (1 / 3)
  }

  follow(targetX, targetY) {
    const targetCamX = targetX - this.viewWidth / 2
    const targetCamY = targetY - this.viewHeight * 2 / 3 // 玩家在偏下位置
    this.x += (targetCamX - this.x) * this.lerp
    this.y += (targetCamY - this.y) * this.lerp
    this._clamp()
  }

  _clamp() {
    this.x = Math.max(0, Math.min(this.x, this.worldWidth - this.viewWidth))
    this.y = Math.max(0, Math.min(this.y, this.worldHeight - this.viewHeight))
  }

  setViewport(w, h) {
    this.viewWidth = w
    this.viewHeight = h
    this.verticalOffset = h * (1 / 3)
    this._clamp()
  }

  // 世界坐标 → 屏幕坐标
  worldToScreen(wx, wy) {
    return { x: wx - this.x, y: wy - this.y }
  }

  // 屏幕坐标 → 世界坐标
  screenToWorld(sx, sy) {
    return { x: sx + this.x, y: sy + this.y }
  }
}
