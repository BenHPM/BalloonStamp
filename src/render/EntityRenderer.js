// src/render/EntityRenderer.js
import { SpriteCache } from './SpriteCache.js'

export class EntityRenderer {
  constructor() {
    this.spriteCache = new SpriteCache()
  }

  prerenderEntity(color, balloonColor) {
    this.spriteCache.prerender(color, balloonColor)
  }

  renderEntity(ctx, entity) {
    const animName = entity.getAnimName ? entity.getAnimName() : 'idle'
    const frameIndex = entity.animFrame || 0
    const sprite = this.spriteCache.get(entity.color, entity.balloonColor || entity.color, animName, frameIndex)
    const scale = entity.scale || 1
    const flip = entity.facingRight === false

    if (sprite) {
      ctx.save()
      const cx = entity.x + (entity.width || 28) / 2
      const cy = entity.y + (entity.height || 36) / 2
      ctx.translate(cx, cy)
      if (flip) ctx.scale(-1, 1)
      ctx.scale(scale, scale)
      ctx.drawImage(sprite, -sprite.width / 2, -sprite.height / 2)
      ctx.restore()
    } else {
      // 后备：色块
      ctx.fillStyle = entity.color || '#f00'
      ctx.fillRect(entity.x, entity.y, (entity.width || 28) * scale, (entity.height || 36) * scale)
    }
  }

  renderPlatform(ctx, plat) {
    // 云岛平台
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.roundRect(plat.x, plat.y, plat.w, plat.h, 8)
    ctx.fill()
    // 阴影
    ctx.fillStyle = 'rgba(100,120,150,0.2)'
    ctx.fillRect(plat.x + 4, plat.y + plat.h - 3, plat.w - 8, 3)
  }
}
