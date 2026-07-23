// src/engine/AssetLoader.js
// 预加载所有精灵图资源，供渲染管线使用

export const ASSETS = {
  skyDay: '/assets/sky/Skyboxes/skybox-day.png',
  skyMorning: '/assets/sky/Skyboxes/skybox-morning.png',
  // 动物精灵（Kenney Animal Pack CC0）
  animalPanda: '/assets/animals/PNG/Round/panda.png',
  animalSloth: '/assets/animals/PNG/Round/sloth.png',
  animalChick: '/assets/animals/PNG/Round/chick.png',
  animalGorilla: '/assets/animals/PNG/Round/gorilla.png',
  animalRhino: '/assets/animals/PNG/Round/rhino.png',
  // 闪电云精灵
  cloudSprite: '/assets/cloud.png',
  // 粒子
  particleCircle01: '/assets/particles/PNG%20(Transparent)/circle_01.png',
  particleCircle02: '/assets/particles/PNG%20(Transparent)/circle_02.png',
  particleLight01: '/assets/particles/PNG%20(Transparent)/light_01.png',
  particleSpark01: '/assets/particles/PNG%20(Transparent)/spark_01.png',
  particleStar01: '/assets/particles/PNG%20(Transparent)/star_01.png',
  particleDirt01: '/assets/particles/PNG%20(Transparent)/dirt_01.png',
  foliageSheet: '/assets/foliage/Spritesheet/foliagePack_default.png',
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
