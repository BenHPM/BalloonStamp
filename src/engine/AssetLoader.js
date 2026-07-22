// src/engine/AssetLoader.js
// 预加载所有精灵图资源，供渲染管线使用

const ASSET_BASE = '/assets/'

export const ASSETS = {
  skyDay: `${ASSET_BASE}sky/Skyboxes/skybox-day.png`,
  skyMorning: `${ASSET_BASE}sky/Skyboxes/skybox-morning.png`,
  whaleRound: `${ASSET_BASE}animals/PNG/Round/whale.png`,
  whaleSquare: `${ASSET_BASE}animals/PNG/Square/whale.png`,
}

// 粒子精灵映射
export const PARTICLE_SPRITES = {
  circle: (i) => `${ASSET_BASE}particles/circle_${String(i).padStart(2,'0')}.png`,
  light: (i) => `${ASSET_BASE}particles/light_${String(i).padStart(2,'0')}.png`,
  spark: (i) => `${ASSET_BASE}particles/spark_${String(i).padStart(2,'0')}.png`,
  star: (i) => `${ASSET_BASE}particles/star_${String(i).padStart(2,'0')}.png`,
  dirt: (i) => `${ASSET_BASE}particles/dirt_${String(i).padStart(2,'0')}.png`,
}

export class AssetLoader {
  constructor() {
    this._cache = new Map()
    this._loading = new Map()
  }

  /** 加载单个图片，返回 Promise<Image> */
  load(src) {
    if (this._cache.has(src)) return Promise.resolve(this._cache.get(src))
    if (this._loading.has(src)) return this._loading.get(src)

    const promise = new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => { this._cache.set(src, img); resolve(img) }
      img.onerror = () => { this._loading.delete(src); reject(new Error(`Failed: ${src}`)) }
      img.src = src
    })
    this._loading.set(src, promise)
    return promise
  }

  /** 批量加载，返回 Promise<Map> */
  loadAll(sources) {
    return Promise.all(sources.map(s => this.load(s))).then(imgs => {
      const map = new Map()
      sources.forEach((s, i) => map.set(s, imgs[i]))
      return map
    })
  }

  /** 获取缓存图片（同步，可能返回 null） */
  get(src) {
    return this._cache.get(src) || null
  }
}
