# BalloonStamp 重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 从零重建 BalloonStamp 为 .io 风格大地图淘汰赛游戏

**Architecture:** Vite + 原生 ES Modules + Canvas 2D。世界坐标 2400×1800 + 相机跟随。固定步长 1/60s 物理循环。预渲染精灵缓存 + 空间网格碰撞。状态机驱动游戏流程（菜单→对局→结算）。

**Tech Stack:** Vite 8.x, vanilla ES Modules, HTML5 Canvas 2D, vitest（单元测试）

**设计规格书:** `docs/game-design-spec.md`

---

## 项目定位与开发策略

### 两阶段路线

**阶段 A（本计划）：Web 原型验证** — 用 Vite + Canvas 2D 快速实现可玩游戏原型，在浏览器和手机浏览器中验证核心玩法手感、视觉风格、操控方案、性能表现。Web 版本身不是最终产品，而是降低试错成本的原型工具。

**阶段 B（后续）：鸿蒙原生 App** — 基于原型验证结果，用 ArkTS + ArkUI Canvas 开发鸿蒙原生应用，作为正式商业产品发布。旧版代码和文档全部废弃，仅以本计划和设计规格书为唯一信源重新开发。

### 模块可移植性分类

开发时需明确区分哪些层可以从 Web 直接迁移到 ArkTS，哪些需要重写：

| 层级 | 模块 | 可移植性 | 迁移说明 |
|------|------|---------|---------|
| **可移植层** | config/ 全部 | ✅ 直接搬 | 纯数据常量，零平台依赖 |
| **可移植层** | entities/ 全部 | ✅ 直接搬 | 纯逻辑类，零 DOM 依赖 |
| **可移植层** | systems/ 全部 | ✅ 直接搬 | 纯逻辑，零 DOM 依赖 |
| **可移植层** | managers/ 全部 | ✅ 直接搬 | 纯逻辑，零 DOM 依赖 |
| **可移植层** | engine/PhysicsEngine | ✅ 直接搬 | 纯数学，零 DOM 依赖 |
| **可移植层** | engine/SpatialGrid | ✅ 直接搬 | 纯数据结构 |
| **可移植层** | engine/Camera | ✅ 直接搬 | 纯数学 |
| **需适配层** | engine/GameEngine | ⚠️ 改入口 | 主循环结构可复用，requestAnimationFrame → ArkUI 渲染回调 |
| **需适配层** | render/SpriteCache | ⚠️ 改 API | OffscreenCanvas 两个平台都有，API 几乎一致，少量调整 |
| **需适配层** | render/EntityRenderer | ⚠️ 改 API | drawImage 调用可复用，Canvas 2D Context API 基本一致 |
| **需重写层** | engine/InputManager | ❌ 重写 | DOM 事件 → ArkUI 手势/触摸 API |
| **需重写层** | render/BackgroundRenderer | ❌ 重写 | 含 Canvas Gradient 等 Web 专属调用 |
| **需重写层** | render/HUDRenderer | ❌ 重写 | 同上 |
| **需重写层** | render/ParticleSystem | ❌ 重写 | 同上 |
| **需重写层** | engine/Renderer | ❌ 重写 | 渲染主控，整合各子渲染器 |
| **需重写层** | states/ 全部 | ❌ 重写 | 含 DOM 操作和 Canvas 调用 |
| **需重写层** | main.js + index.html | ❌ 重写 | DOM 入口 → ArkUI 页面入口 |

### 开发原则

1. **保持可移植层纯净**：config/entities/systems/managers 中的代码不得 import 任何浏览器 API（window、document、DOM 事件、Canvas 2D Context）。违反此原则的代码在 code review 时应被拒绝。
2. **渲染层隔离 DOM**：render/ 模块可以调用 Canvas 2D API（因为 ArkUI Canvas 也兼容），但不得直接操作 DOM 元素（document.getElementById 等）。DOM 操作限制在 main.js 和 states/ 中。
3. **输入抽象**：InputManager 是需重写层，但应定义清晰的 `state` 接口（`{ moveX, flapJustPressed, pause }`），使得鸿蒙版只需替换输入采集方式，下游消费代码不变。
4. **配置驱动**：所有平台差异参数（可视区域尺寸、触屏按钮位置等）放 config/，不硬编码在逻辑中。

---

## 文件结构总览

```
src/
├── main.js                        # 入口：DOM Ready → new GameEngine(canvas).start()
├── config/
│   ├── physics.js                 # 物理常量（世界单位/秒）
│   ├── world.js                   # 地图尺寸、网格、缩圈参数
│   ├── entities.js                # AI 类型配置、玩家配置
│   └── visuals.js                 # 颜色、尺寸、动画帧数
├── engine/
│   ├── GameEngine.js              # 主循环 + 状态机调度
│   ├── PhysicsEngine.js           # 重力、拍打、加速度、平台碰撞
│   ├── Camera.js                  # 跟随 + 边界钳制
│   ├── Renderer.js                # Canvas 渲染主控
│   ├── SpatialGrid.js             # 空间分区
│   └── InputManager.js            # 虚拟摇杆 + 拍打键 + 键盘 + 手柄
├── entities/
│   ├── Player.js                  # 玩家（含 0 气球状态机）
│   ├── Enemy.js                   # AI 气球战士（4 种性格）
│   ├── Whale.js                   # 鲸鱼
│   └── Environmental.js           # 云岛平台、小白云、闪电、气流区
├── systems/
│   ├── CollisionSystem.js         # 踩踏/弹开/踢杀/闪电
│   ├── ScoreSystem.js             # 淘汰数、排名
│   ├── AISystem.js                # AI 决策调度
│   └── ZoneSystem.js              # 缩圈、环境更新
├── managers/
│   ├── SpawnManager.js            # 生成/复活
│   └── MatchManager.js            # 存活跟踪、胜者判定
├── render/
│   ├── SpriteCache.js             # 精灵预渲染
│   ├── BackgroundRenderer.js      # 天空、视差云、水域、边界
│   ├── EntityRenderer.js          # 实体 blit + 变换
│   ├── ParticleSystem.js          # 粒子（有上限）
│   └── HUDRenderer.js             # 气球数、剩余人数、小地图
└── states/
    ├── MenuState.js               # 标题画面
    ├── PlayState.js               # 对局中（含暂停子状态）
    └── ResultState.js             # 结算画面
```

---

## Phase 1：脚手架与配置

**里程碑：** `npm run dev` 能启动，空白 Canvas 全屏显示，无报错。

### Task 1.1：清理旧代码 + 更新项目配置

**Files:**
- Modify: `package.json`（加 vitest）
- Modify: `index.html`（重写为最小骨架）
- Archive: `src/` 旧代码（移到 `archive/v1-src/`）

- [ ] **Step 1: 归档旧 src/**

```bash
cd D:\ProgramData\Projects\BalloonStamp
move src archive\v1-src
```

- [ ] **Step 2: 更新 package.json**

```json
{
  "name": "balloonstamp",
  "version": "2.0.0",
  "description": "气球大乱踩 — .io 风格大地图淘汰赛",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vite": "^8.1.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 3: 安装依赖**

Run: `npm install`
Expected: 安装成功，node_modules 出现 vitest

- [ ] **Step 4: 重写 index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>气球大乱踩</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%; height: 100%; overflow: hidden;
      background: #87CEEB; touch-action: none;
      -webkit-user-select: none; user-select: none;
    }
    #game-canvas {
      display: block; width: 100%; height: 100%;
    }
  </style>
</head>
<body>
  <canvas id="game-canvas"></canvas>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

- [ ] **Step 5: 创建最小 main.js**

```javascript
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
```

- [ ] **Step 6: 验证启动**

Run: `npm run dev`
Expected: 浏览器打开，蓝色背景 + "BalloonStamp v2 — 加载中..." 居中文字

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold v2 project, archive v1 code"
```

### Task 1.2：配置文件

**Files:**
- Create: `src/config/physics.js`
- Create: `src/config/world.js`
- Create: `src/config/entities.js`
- Create: `src/config/visuals.js`

- [ ] **Step 1: 创建 physics.js**

```javascript
// src/config/physics.js
// 所有数值以"世界单位/秒"定义，固定步长 dt=1/60s 应用
export const PHYS = {
  // 重力（按气球数索引：0最重，5最轻）
  gravity: [1400, 1200, 1000, 850, 750, 650], // px/s²，索引 0-5 对应气球数
  // 拍打冲量（按气球数索引，0时无法拍打）
  flapImpulse: [0, -380, -420, -450, -470, -490], // px/s
  flapCooldown: 0.083, // 秒（约5帧）
  // 水平移动
  moveAccel: 1800, // px/s²
  maxMoveSpeed: 280, // px/s
  horizontalFriction: 0.92, // 每步衰减系数
  // 终速
  terminalVelocityDown: 500, // px/s
  terminalVelocityUp: 600, // px/s
  // 踩踏弹跳
  stompBounceFactor: 0.8, // 弹跳 = 当前flapImpulse × factor
  // 气球
  maxBalloons: 5,
  initialBalloons: 2,
  // 成长（每多1个气球超过初始值）
  sizePerBalloon: 0.03, // +3%
  speedPerBalloon: 0.02, // +2%
  // 0气球恢复
  inflateStillTime: 2.0, // 静止秒数触发充气
  inflateDuration: 1.5, // 充气动画秒数
  inflateRecoverTo: 1, // 恢复到几个气球
  // 侧面弹开
  bounceForce: 200, // px/s
}
```

- [ ] **Step 2: 创建 world.js**

```javascript
// src/config/world.js
export const WORLD = {
  width: 2400,
  height: 1800,
  // 空间网格
  cellSize: 120, // 格子边长
  // 可视区域（逻辑分辨率）
  viewPortrait: { w: 720, h: 1280 },
  viewLandscape: { w: 1280, h: 720 },
  // 水域
  waterY: 1700, // 水面 Y 坐标
  waterLethalDepth: 1760, // 完全沉没线
  // 缩圈
  zoneShrinkStart: 60, // 对局开始后多少秒开始缩
  zoneShrinkInterval: 30, // 每多少秒缩一次
  zoneShrinkRate: 0.92, // 每次缩到上一圈的多少比例
  zoneMinRadius: 400, // 最小圈半径
  // 边界反弹
  boundaryBounce: 0.5, // 气流墙反弹系数
  zonePushForce: 400, // 圈外推力 px/s
}
```

- [ ] **Step 3: 创建 entities.js**

```javascript
// src/config/entities.js
export const PLAYER_CONFIG = {
  width: 28, height: 36,
  color: '#4DA6FF',
  balloonColor: '#4DA6FF',
  spawnX: 1200, spawnY: 200,
}

export const AI_TYPES = {
  drifter: {
    name: '飘游型',
    color: '#A8D8EA',
    speed: 0.6, // 相对系数
    chaseRate: 0.15, // 追击概率
    flapInterval: [0.5, 1.2], // 秒
    balloonCount: 2,
    scale: 0.9,
  },
  chaser: {
    name: '追击型',
    color: '#FF8855',
    speed: 1.0,
    chaseRate: 0.6,
    flapInterval: [0.3, 0.7],
    balloonCount: 2,
    scale: 1.0,
  },
  ambusher: {
    name: '伏击型',
    color: '#6B4E71',
    speed: 1.2,
    chaseRate: 0.4,
    flapInterval: [0.25, 0.5],
    balloonCount: 2,
    scale: 0.85,
  },
  berserker: {
    name: '暴躁型',
    color: '#E63946',
    speed: 1.4,
    chaseRate: 0.7,
    flapInterval: [0.2, 0.4],
    balloonCount: 3,
    scale: 1.3,
  },
}

// AI 占比
export const AI_DISTRIBUTION = [
  { type: 'drifter', ratio: 0.40 },
  { type: 'chaser', ratio: 0.25 },
  { type: 'ambusher', ratio: 0.20 },
  { type: 'berserker', ratio: 0.15 },
]

// 总实体数
export const TOTAL_ENTITIES = 20 // 含玩家

// AI 决策间隔（秒）
export const AI_DECISION_INTERVAL = [0.25, 0.5]

// 云岛平台布局（示例，后续调参）
export const PLATFORMS = [
  { x: 200, y: 500, w: 140, h: 24 },
  { x: 500, y: 800, w: 120, h: 24 },
  { x: 800, y: 400, w: 160, h: 24 },
  { x: 1100, y: 700, w: 140, h: 24 },
  { x: 1400, y: 500, w: 120, h: 24 },
  { x: 1700, y: 900, w: 160, h: 24 },
  { x: 2000, y: 600, w: 140, h: 24 },
  { x: 300, y: 1200, w: 120, h: 24 },
  { x: 700, y: 1400, w: 140, h: 24 },
  { x: 1100, y: 1100, w: 160, h: 24 },
  { x: 1500, y: 1350, w: 120, h: 24 },
  { x: 1900, y: 1150, w: 140, h: 24 },
  { x: 400, y: 300, w: 100, h: 20 },
  { x: 1000, y: 250, w: 120, h: 20 },
  { x: 1600, y: 350, w: 100, h: 20 },
  { x: 2100, y: 1200, w: 140, h: 24 },
  { x: 2200, y: 800, w: 100, h: 20 },
  { x: 200, y: 1550, w: 120, h: 24 },
]

// 小白云（闪电云）
export const LIGHTNING_CLOUDS = [
  { x: 600, y: 600, radius: 50 },
  { x: 1300, y: 900, radius: 50 },
  { x: 1800, y: 400, radius: 50 },
  { x: 900, y: 1300, radius: 50 },
]

// 气流区
export const AIR_CURRENTS = [
  { x: 400, y: 1000, w: 200, h: 150, dirX: 1, dirY: 0, strength: 150 },
  { x: 1500, y: 600, w: 200, h: 150, dirX: -1, dirY: 0, strength: 150 },
  { x: 1000, y: 1200, w: 150, h: 200, dirX: 0, dirY: -1, strength: 200 },
]
```

- [ ] **Step 4: 创建 visuals.js**

```javascript
// src/config/visuals.js
export const VISUALS = {
  // 通用
  pixelPerfect: false, // 不用像素风，用平滑渲染
  // 天空
  skyTop: '#87CEEB',
  skyBottom: '#E0F6FF',
  // 云朵（背景装饰）
  cloudCount: 30,
  cloudColors: ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.6)'],
  // 云岛平台
  platformColor: '#FFFFFF',
  platformShadow: 'rgba(100,120,150,0.3)',
  // 水面
  waterColor: 'rgba(64,164,223,0.7)',
  waterSurface: 'rgba(100,200,255,0.5)',
  // 气流墙
  boundaryColor: 'rgba(150,200,255,0.3)',
  // 角色
  bodyOutline: 'rgba(0,0,0,0.2)',
  // 气球
  balloonHighlight: 'rgba(255,255,255,0.4)',
  // 动画帧数
  frames: {
    flap: 4,
    walk: 4,
    idle: 2,
    fall: 2,
    inflate: 3,
    electrocute: 2,
    bounce: 1,
  },
  // 粒子上限
  maxParticles: 200,
}
```

- [ ] **Step 5: Commit**

```bash
git add src/config/
git commit -m "feat: add config files (physics, world, entities, visuals)"
```

---

## Phase 2：引擎核心

**里程碑：** 能在 Canvas 上绘制一个矩形在世界坐标 (1200, 200) 处，相机跟随移动，键盘 WASD 可平移视角。

### Task 2.1：SpatialGrid

**Files:**
- Create: `src/engine/SpatialGrid.js`
- Test: `src/engine/SpatialGrid.test.js`

- [ ] **Step 1: 写测试**

```javascript
// src/engine/SpatialGrid.test.js
import { describe, it, expect } from 'vitest'
import { SpatialGrid } from './SpatialGrid.js'

describe('SpatialGrid', () => {
  it('inserts and queries nearby entities', () => {
    const grid = new SpatialGrid(2400, 1800, 120)
    grid.insert({ id: 1, x: 100, y: 100, width: 20, height: 20 })
    grid.insert({ id: 2, x: 200, y: 200, width: 20, height: 20 })
    grid.insert({ id: 3, x: 1000, y: 1000, width: 20, height: 20 })

    const nearby = grid.query(90, 90, 130, 130)
    expect(nearby.map(e => e.id).sort()).toEqual([1, 2])
  })

  it('returns empty for empty area', () => {
    const grid = new SpatialGrid(2400, 1800, 120)
    expect(grid.query(0, 0, 100, 100)).toEqual([])
  })

  it('clears between frames', () => {
    const grid = new SpatialGrid(2400, 1800, 120)
    grid.insert({ id: 1, x: 50, y: 50, width: 10, height: 10 })
    grid.clear()
    expect(grid.query(0, 0, 100, 100)).toEqual([])
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/engine/SpatialGrid.test.js`
Expected: FAIL — 模块不存在

- [ ] **Step 3: 实现 SpatialGrid**

```javascript
// src/engine/SpatialGrid.js
export class SpatialGrid {
  constructor(worldWidth, worldHeight, cellSize) {
    this.cellSize = cellSize
    this.cols = Math.ceil(worldWidth / cellSize)
    this.rows = Math.ceil(worldHeight / cellSize)
    this.cells = new Map()
  }

  _key(cx, cy) { return `${cx},${cy}` }

  insert(entity) {
    const x1 = Math.floor(entity.x / this.cellSize)
    const y1 = Math.floor(entity.y / this.cellSize)
    const x2 = Math.floor((entity.x + entity.width) / this.cellSize)
    const y2 = Math.floor((entity.y + entity.height) / this.cellSize)
    for (let cx = x1; cx <= x2; cx++) {
      for (let cy = y1; cy <= y2; cy++) {
        const key = this._key(cx, cy)
        if (!this.cells.has(key)) this.cells.set(key, [])
        this.cells.get(key).push(entity)
      }
    }
  }

  query(x, y, w, h) {
    const x1 = Math.max(0, Math.floor(x / this.cellSize))
    const y1 = Math.max(0, Math.floor(y / this.cellSize))
    const x2 = Math.min(this.cols - 1, Math.floor((x + w) / this.cellSize))
    const y2 = Math.min(this.rows - 1, Math.floor((y + h) / this.cellSize))
    const result = []
    const seen = new Set()
    for (let cx = x1; cx <= x2; cx++) {
      for (let cy = y1; cy <= y2; cy++) {
        const cell = this.cells.get(this._key(cx, cy))
        if (!cell) continue
        for (const e of cell) {
          if (!seen.has(e)) { seen.add(e); result.push(e) }
        }
      }
    }
    return result
  }

  clear() { this.cells.clear() }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/engine/SpatialGrid.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/SpatialGrid.js src/engine/SpatialGrid.test.js
git commit -m "feat: add SpatialGrid for spatial partitioning"
```

### Task 2.2：Camera

**Files:**
- Create: `src/engine/Camera.js`
- Test: `src/engine/Camera.test.js`

- [ ] **Step 1: 写测试**

```javascript
// src/engine/Camera.test.js
import { describe, it, expect } from 'vitest'
import { Camera } from './Camera.js'

describe('Camera', () => {
  it('follows target with lerp', () => {
    const cam = new Camera(2400, 1800, 720, 1280)
    cam.x = 0; cam.y = 0
    cam.follow(1000, 1000)
    // targetCamX = 1000 - 720/2 = 640, cam.x = 640 * 0.1 = 64
    expect(cam.x).toBeCloseTo(64, 0)
    // targetCamY = 1000 - 1280*2/3 ≈ 146.67, cam.y = 146.67 * 0.1 ≈ 14.67
    expect(cam.y).toBeCloseTo(14.67, 0)
  })

  it('clamps to world bounds', () => {
    const cam = new Camera(2400, 1800, 720, 1280)
    cam.follow(0, 0) // 玩家在左上角
    expect(cam.x).toBeGreaterThanOrEqual(0)
    expect(cam.y).toBeGreaterThanOrEqual(0)
  })

  it('clamps to right/bottom bounds', () => {
    const cam = new Camera(2400, 1800, 720, 1280)
    cam.follow(2400, 1800)
    expect(cam.x + 720).toBeLessThanOrEqual(2400 + 1)
    expect(cam.y + 1280).toBeLessThanOrEqual(1800 + 1)
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/engine/Camera.test.js`
Expected: FAIL

- [ ] **Step 3: 实现 Camera**

```javascript
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
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run src/engine/Camera.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/Camera.js src/engine/Camera.test.js
git commit -m "feat: add Camera with lerp follow and bounds clamping"
```

### Task 2.3：InputManager

**Files:**
- Create: `src/engine/InputManager.js`

- [ ] **Step 1: 实现 InputManager**

```javascript
// src/engine/InputManager.js
export class InputManager {
  constructor(canvas) {
    this.canvas = canvas
    this.state = { left: false, right: false, flap: false, flapJustPressed: false, moveX: 0 }
    this._prevFlap = false
    this._keys = {}
    this._touchJoystick = { active: false, startX: 0, startY: 0, dx: 0, dy: 0 }
    this._touchFlap = false
    this._gamepadIndex = null
    this._joystickEl = null
    this._flapBtnEl = null

    this._initKeyboard()
    this._initGamepad()
  }

  // 注册触屏 UI 元素（由 HTML 层创建）
  setJoystickElement(el) { this._joystickEl = el; this._initJoystick(el) }
  setFlapButtonElement(el) { this._flapBtnEl = el; this._initFlapButton(el) }

  _initKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (['ArrowLeft','ArrowRight','ArrowUp','Space','KeyW','KeyA','KeyS','KeyD','Escape'].includes(e.code))
        e.preventDefault()
      this._keys[e.code] = true
    })
    window.addEventListener('keyup', (e) => { this._keys[e.code] = false })
  }

  _initGamepad() {
    window.addEventListener('gamepadconnected', (e) => { this._gamepadIndex = e.gamepad.index })
    window.addEventListener('gamepaddisconnected', () => { this._gamepadIndex = null })
  }

  _initJoystick(el) {
    const start = (e) => {
      e.preventDefault()
      const t = e.touches ? e.touches[0] : e
      this._touchJoystick.active = true
      this._touchJoystick.startX = t.clientX
      this._touchJoystick.startY = t.clientY
    }
    const move = (e) => {
      if (!this._touchJoystick.active) return
      e.preventDefault()
      const t = e.touches ? e.touches[0] : e
      this._touchJoystick.dx = t.clientX - this._touchJoystick.startX
      this._touchJoystick.dy = t.clientY - this._touchJoystick.startY
    }
    const end = (e) => {
      e.preventDefault()
      this._touchJoystick.active = false
      this._touchJoystick.dx = 0
      this._touchJoystick.dy = 0
    }
    el.addEventListener('touchstart', start, { passive: false })
    el.addEventListener('touchmove', move, { passive: false })
    el.addEventListener('touchend', end, { passive: false })
    el.addEventListener('mousedown', start)
    el.addEventListener('mousemove', (e) => { if (this._touchJoystick.active) move(e) })
    el.addEventListener('mouseup', end)
    el.addEventListener('mouseleave', end)
  }

  _initFlapButton(el) {
    const press = (e) => { e.preventDefault(); this._touchFlap = true }
    const release = (e) => { e.preventDefault(); this._touchFlap = false }
    el.addEventListener('touchstart', press, { passive: false })
    el.addEventListener('touchend', release, { passive: false })
    el.addEventListener('mousedown', press)
    el.addEventListener('mouseup', release)
    el.addEventListener('mouseleave', release)
  }

  _pollGamepad() {
    if (this._gamepadIndex === null) return null
    const gp = navigator.getGamepads?.()[this._gamepadIndex]
    if (!gp) return null
    return {
      left: gp.buttons[14]?.pressed || gp.axes[0] < -0.3,
      right: gp.buttons[15]?.pressed || gp.axes[0] > 0.3,
      moveX: gp.axes[0] || 0,
      flap: gp.buttons[0]?.pressed || gp.buttons[1]?.pressed || gp.buttons[2]?.pressed || gp.buttons[3]?.pressed,
    }
  }

  update() {
    // 键盘
    const keyLeft = this._keys['ArrowLeft'] || this._keys['KeyA']
    const keyRight = this._keys['ArrowRight'] || this._keys['KeyD']
    const keyFlap = this._keys['Space'] || this._keys['ArrowUp'] || this._keys['KeyW']

    // 手柄
    const gp = this._pollGamepad()

    // 摇杆输入（-1 到 1）
    const joystickX = this._touchJoystick.active
      ? Math.max(-1, Math.min(1, this._touchJoystick.dx / 60))
      : 0

    // 合并 moveX：摇杆优先，否则键盘/手柄
    if (Math.abs(joystickX) > 0.1) {
      this.state.moveX = joystickX
    } else if (gp && Math.abs(gp.moveX) > 0.1) {
      this.state.moveX = gp.moveX
    } else {
      this.state.moveX = keyLeft ? -1 : (keyRight ? 1 : 0)
    }

    this.state.left = this.state.moveX < -0.1
    this.state.right = this.state.moveX > 0.1

    // flap
    this.state.flap = this._touchFlap || keyFlap || (gp?.flap ?? false)
    this.state.flapJustPressed = this.state.flap && !this._prevFlap
    this._prevFlap = this.state.flap

    // 暂停
    this.state.pause = this._keys['Escape'] || false
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/engine/InputManager.js
git commit -m "feat: add InputManager with joystick, keyboard, gamepad support"
```

### Task 2.4：GameEngine 主循环 + 验证用 Renderer 骨架

**Files:**
- Create: `src/engine/GameEngine.js`
- Create: `src/engine/Renderer.js`
- Modify: `src/main.js`

- [ ] **Step 1: 实现 GameEngine 骨架**

```javascript
// src/engine/GameEngine.js
import { PHYS } from '../config/physics.js'
import { WORLD } from '../config/world.js'
import { Camera } from './Camera.js'
import { InputManager } from './InputManager.js'
import { SpatialGrid } from './SpatialGrid.js'

export class GameEngine {
  constructor(canvas) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.camera = new Camera(WORLD.width, WORLD.height, WORLD.viewPortrait.w, WORLD.viewPortrait.h)
    this.input = new InputManager(canvas)
    this.spatialGrid = new SpatialGrid(WORLD.width, WORLD.height, WORLD.cellSize)
    this.running = false
    this.lastTime = 0
    this.accumulator = 0
    this.fixedStep = 1 / 60 // 秒
    this.state = null // 当前游戏状态对象
    this.entityManager = null // 由 PlayState 设置
  }

  setState(state) {
    if (this.state && this.state.exit) this.state.exit(this)
    this.state = state
    if (state.enter) state.enter(this)
  }

  start() {
    this.running = true
    this.lastTime = performance.now() / 1000
    this._loop()
  }

  _loop() {
    if (!this.running) return
    const now = performance.now() / 1000
    let dt = now - this.lastTime
    this.lastTime = now
    if (dt > 0.1) dt = 0.1 // 防止切标签暴走

    this.accumulator += dt
    while (this.accumulator >= this.fixedStep) {
      if (this.state && this.state.fixedUpdate) this.state.fixedUpdate(this.fixedStep)
      this.accumulator -= this.fixedStep
    }

    if (this.state && this.state.render) {
      this.ctx.save()
      this.ctx.translate(this._screenOffsetX || 0, this._screenOffsetY || 0)
      this.ctx.scale(this._renderScale || 1, this._renderScale || 1)
      this.state.render(this.ctx, this.camera, dt)
      this.ctx.restore()
    }
    requestAnimationFrame(() => this._loop())
  }

  handleResize() {
    const dpr = window.devicePixelRatio || 1
    const w = window.innerWidth
    const h = window.innerHeight
    this.canvas.width = w * dpr
    this.canvas.height = h * dpr
    this.canvas.style.width = w + 'px'
    this.canvas.style.height = h + 'px'
    this.ctx.scale(dpr, dpr)
    // 横竖屏
    const isLandscape = w > h
    const view = isLandscape ? WORLD.viewLandscape : WORLD.viewPortrait
    this.camera.setViewport(view.w, view.h)
    // 计算缩放：让可视区域填满屏幕
    this._renderScale = Math.min(w / view.w, h / view.h)
    this._screenOffsetX = (w - view.w * this._renderScale) / 2
    this._screenOffsetY = (h - view.h * this._renderScale) / 2
  }
}
```

- [ ] **Step 2: 实现 Renderer 骨架（临时，后续替换）**

```javascript
// src/engine/Renderer.js
// 临时渲染器 — 画天空 + 中心矩形验证相机
import { WORLD } from '../config/world.js'
import { Camera } from './Camera.js'

export class DebugRenderer {
  render(ctx, camera, dt, entities = []) {
    const w = camera.viewWidth
    const h = camera.viewHeight

    // 天空渐变
    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, '#87CEEB')
    grad.addColorStop(1, '#E0F6FF')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)

    // 世界变换
    ctx.save()
    ctx.translate(-camera.x, -camera.y)

    // 世界边界
    ctx.strokeStyle = 'rgba(150,200,255,0.5)'
    ctx.lineWidth = 4
    ctx.strokeRect(0, 0, WORLD.width, WORLD.height)

    // 水域
    ctx.fillStyle = 'rgba(64,164,223,0.4)'
    ctx.fillRect(0, WORLD.waterY, WORLD.width, WORLD.height - WORLD.waterY)

    // 实体（临时方块）
    entities.forEach(e => {
      ctx.fillStyle = e.color || '#f00'
      ctx.fillRect(e.x, e.y, e.width || 20, e.height || 20)
    })

    ctx.restore()
  }
}
```

- [ ] **Step 3: 更新 main.js 连接引擎**

```javascript
// src/main.js
import { GameEngine } from './engine/GameEngine.js'
import { DebugRenderer } from './engine/Renderer.js'
import { WORLD } from './config/world.js'

const canvas = document.getElementById('game-canvas')
const engine = new GameEngine(canvas)

const renderer = new DebugRenderer()

// 临时测试实体
const testEntity = {
  x: 1200, y: 200, width: 30, height: 40, color: '#4DA6FF',
  vx: 0, vy: 0
}

// 临时状态
engine.setState({
  enter(engine) { engine.handleResize() },
  fixedUpdate(dt) {
    // 键盘移动测试实体
    engine.input.update()
    const speed = 300
    testEntity.x += engine.input.state.moveX * speed * dt
    if (engine.input.state.flapJustPressed) testEntity.vy = -400
    testEntity.vy += 800 * dt
    testEntity.y += testEntity.vy * dt
    // 边界
    testEntity.x = Math.max(0, Math.min(WORLD.width - testEntity.width, testEntity.x))
    testEntity.y = Math.max(0, Math.min(WORLD.height - testEntity.height, testEntity.y))
    // 相机跟随
    engine.camera.follow(testEntity.x + testEntity.width / 2, testEntity.y + testEntity.height / 2)
  },
  render(ctx, camera) {
    renderer.render(ctx, camera, 0, [testEntity])
  }
})

window.addEventListener('resize', () => engine.handleResize())
engine.handleResize()
engine.start()
```

- [ ] **Step 4: 验证**

Run: `npm run dev`
Expected: 蓝色天空背景，一个蓝色矩形在中心，WASD/方向键可移动矩形，相机平滑跟随，边界有轮廓线，底部有水域色块

- [ ] **Step 5: Commit**

```bash
git add src/engine/GameEngine.js src/engine/Renderer.js src/main.js
git commit -m "feat: add GameEngine main loop, Camera-followed debug rendering"
```

---

## Phase 3：物理与玩家

**里程碑：** 玩家角色在地图上飞行——重力下落、拍打上升、左右飘移、平台碰撞着陆、水面检测。能看到气球数和重力变化。

### Task 3.1：PhysicsEngine

**Files:**
- Create: `src/engine/PhysicsEngine.js`
- Test: `src/engine/PhysicsEngine.test.js`

- [ ] **Step 1: 写测试**

```javascript
// src/engine/PhysicsEngine.test.js
import { describe, it, expect } from 'vitest'
import { PhysicsEngine } from './PhysicsEngine.js'
import { PHYS } from '../config/physics.js'

describe('PhysicsEngine', () => {
  it('applies gravity based on balloon count', () => {
    const phys = new PhysicsEngine()
    const entity = { x: 100, y: 100, vx: 0, vy: 0, balloons: 2, width: 20, height: 30, onGround: false }
    phys.update(entity, { moveX: 0, flapJustPressed: false }, 1/60)
    expect(entity.vy).toBeGreaterThan(0) // 下落
    // 2 气球重力 = 1000
    expect(entity.vy).toBeCloseTo(1000 / 60, 1)
  })

  it('flap sets upward velocity', () => {
    const phys = new PhysicsEngine()
    const entity = { x: 100, y: 100, vx: 0, vy: 0, balloons: 2, width: 20, height: 30, onGround: false, flapCooldown: 0 }
    phys.update(entity, { moveX: 0, flapJustPressed: true }, 1/60)
    expect(entity.vy).toBeLessThan(0) // 向上
  })

  it('zero balloons prevents flapping', () => {
    const phys = new PhysicsEngine()
    const entity = { x: 100, y: 100, vx: 0, vy: 0, balloons: 0, width: 20, height: 30, onGround: false, flapCooldown: 0 }
    phys.update(entity, { moveX: 0, flapJustPressed: true }, 1/60)
    expect(entity.vy).toBeGreaterThan(0) // 仍然下落
  })

  it('horizontal input sets acceleration', () => {
    const phys = new PhysicsEngine()
    const entity = { x: 100, y: 100, vx: 0, vy: 0, balloons: 2, width: 20, height: 30, onGround: false }
    phys.update(entity, { moveX: 1, flapJustPressed: false }, 1/60)
    expect(entity.vx).toBeGreaterThan(0)
  })

  it('terminal velocity caps downward speed', () => {
    const phys = new PhysicsEngine()
    const entity = { x: 100, y: 100, vx: 0, vy: 99999, balloons: 0, width: 20, height: 30, onGround: false }
    phys.update(entity, { moveX: 0, flapJustPressed: false }, 1/60)
    expect(entity.vy).toBeLessThanOrEqual(PHYS.terminalVelocityDown)
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/engine/PhysicsEngine.test.js`
Expected: FAIL

- [ ] **Step 3: 实现 PhysicsEngine**

```javascript
// src/engine/PhysicsEngine.js
import { PHYS } from '../config/physics.js'
import { WORLD } from '../config/world.js'

export class PhysicsEngine {
  constructor() {
    this.platforms = []
  }

  setPlatforms(platforms) {
    this.platforms = platforms
  }

  update(entity, input, dt) {
    const balloons = Math.max(0, Math.min(5, entity.balloons))

    // 重力
    const gravity = PHYS.gravity[balloons] || PHYS.gravity[0]
    entity.vy += gravity * dt

    // 终速
    if (entity.vy > PHYS.terminalVelocityDown) entity.vy = PHYS.terminalVelocityDown
    if (entity.vy < -PHYS.terminalVelocityUp) entity.vy = -PHYS.terminalVelocityUp

    // 水平移动（加速度模型）
    if (Math.abs(input.moveX) > 0.05) {
      const accel = PHYS.moveAccel * input.moveX
      entity.vx += accel * dt
    }
    // 摩擦
    entity.vx *= PHYS.horizontalFriction
    // 限速
    const maxSpeed = PHYS.maxMoveSpeed * (1 + Math.max(0, balloons - PHYS.initialBalloons) * PHYS.speedPerBalloon)
    entity.vx = Math.max(-maxSpeed, Math.min(maxSpeed, entity.vx))

    // 拍打
    entity.flapCooldown = Math.max(0, (entity.flapCooldown || 0) - dt)
    if (input.flapJustPressed && balloons > 0 && entity.flapCooldown <= 0) {
      entity.vy = PHYS.flapImpulse[balloons] || PHYS.flapImpulse[2]
      entity.flapCooldown = PHYS.flapCooldown
      entity.isFlapping = true
      entity.flapTimer = 0.15 // 拍打动画时长
    }
    if (entity.flapTimer > 0) {
      entity.flapTimer -= dt
      if (entity.flapTimer <= 0) entity.isFlapping = false
    }

    // 位置
    entity.x += entity.vx * dt
    entity.y += entity.vy * dt

    // 平台碰撞（仅下落时）
    entity.onGround = false
    if (entity.vy >= 0) {
      const prevBottom = entity.y + entity.height - entity.vy * dt
      const newBottom = entity.y + entity.height
      for (const plat of this.platforms) {
        if (entity.x + entity.width > plat.x && entity.x < plat.x + plat.w &&
            prevBottom <= plat.y + 2 && newBottom >= plat.y) {
          entity.y = plat.y - entity.height
          entity.vy = 0
          entity.onGround = true
          entity.onPlatform = plat
          break
        }
      }
    }

    // 世界边界（气流墙反弹）
    if (entity.x < 0) { entity.x = 0; entity.vx = Math.abs(entity.vx) * WORLD.boundaryBounce }
    if (entity.x + entity.width > WORLD.width) { entity.x = WORLD.width - entity.width; entity.vx = -Math.abs(entity.vx) * WORLD.boundaryBounce }
    if (entity.y < 0) { entity.y = 0; entity.vy = Math.abs(entity.vy) * WORLD.boundaryBounce }
  }

  // 踩踏弹跳
  applyStompBounce(entity) {
    const balloons = Math.max(0, Math.min(5, entity.balloons))
    const impulse = PHYS.flapImpulse[balloons] || PHYS.flapImpulse[2]
    entity.vy = impulse * PHYS.stompBounceFactor
  }

  // 侧面弹开
  applyBounce(entity, dir) {
    entity.vx = dir * PHYS.bounceForce
  }

  // 水域检测
  isSubmerged(entity) {
    return entity.y + entity.height >= WORLD.waterLethalDepth
  }
  isTouchingWater(entity) {
    return entity.y + entity.height >= WORLD.waterY
  }
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run src/engine/PhysicsEngine.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/PhysicsEngine.js src/engine/PhysicsEngine.test.js
git commit -m "feat: add PhysicsEngine with gravity, flap, acceleration, platform collision"
```

### Task 3.2：Player 实体

**Files:**
- Create: `src/entities/Player.js`

- [ ] **Step 1: 实现 Player**

```javascript
// src/entities/Player.js
import { PHYS } from '../config/physics.js'
import { PLAYER_CONFIG } from '../config/entities.js'

// 玩家状态枚举
export const PlayerState = {
  FLYING: 'flying',       // 正常飞行
  FALLING: 'falling',     // 0气球自由坠落（可左右操控但无法拍打）
  GROUNDED: 'grounded',   // 0气球落地（地面脆弱态）
  INFLATING: 'inflating', // 充气中
  ELIMINATED: 'eliminated',// 已淘汰
}

export class Player {
  constructor() {
    this.isPlayer = true
    Object.assign(this, PLAYER_CONFIG)
    this.vx = 0; this.vy = 0
    this.balloons = PHYS.initialBalloons
    this.maxBalloons = PHYS.maxBalloons
    this.flapCooldown = 0
    this.isFlapping = false; this.flapTimer = 0
    this.onGround = false; this.onPlatform = null
    this.facingRight = true
    this.state = PlayerState.FLYING
    this.stillTimer = 0 // 静止计时
    this.inflateTimer = 0
    this.alive = true
    this.eliminations = 0 // 淘汰数
    this.maxBalloonsAchieved = this.balloons
    this.animFrame = 0; this.animTimer = 0
  }

  get scale() {
    const extra = Math.max(0, this.balloons - PHYS.initialBalloons)
    return 1 + extra * PHYS.sizePerBalloon
  }

  get effectiveWidth() { return this.width * this.scale }
  get effectiveHeight() { return this.height * this.scale }

  gainBalloon() {
    if (this.balloons < this.maxBalloons) {
      this.balloons++
      if (this.balloons > this.maxBalloonsAchieved) this.maxBalloonsAchieved = this.balloons
      this._updateState()
    }
  }

  loseBalloon() {
    if (this.balloons > 0) {
      this.balloons--
      this._updateState()
    }
  }

  _updateState() {
    if (this.state === PlayerState.ELIMINATED) return
    if (this.balloons === 0 && !this.onGround) {
      this.state = PlayerState.FALLING
    } else if (this.balloons === 0 && this.onGround) {
      this.state = PlayerState.GROUNDED
    } else if (this.balloons > 0 && this.state !== PlayerState.INFLATING) {
      this.state = PlayerState.FLYING
    }
  }

  eliminate() {
    this.state = PlayerState.ELIMINATED
    this.alive = false
  }

  // 由 PhysicsEngine 固定步调用后调用
  tick(dt, input) {
    // 动画
    this.animTimer += dt
    if (this.animTimer > 0.1) { this.animTimer = 0; this.animFrame++ }

    if (this.facingRight !== (input.moveX > 0) && Math.abs(input.moveX) > 0.1) {
      this.facingRight = input.moveX > 0
    }

    if (this.state === PlayerState.ELIMINATED) return

    // 充气处理（必须在提前返回之前执行，否则 inflateTimer 永远不递减）
    if (this.state === PlayerState.INFLATING) {
      this.inflateTimer -= dt
      if (this.inflateTimer <= 0) {
        this.balloons = PHYS.inflateRecoverTo
        this.state = PlayerState.FLYING
        this.stillTimer = 0
      }
      return // 充气期间跳过其他逻辑
    }

    // 0 气球着陆 → FALLING 转 GROUNDED
    if (this.balloons === 0 && this.onGround && this.state === PlayerState.FALLING) {
      this.state = PlayerState.GROUNDED
    }
    // 0 气球离地 → GROUNDED 转 FALLING
    if (this.balloons === 0 && !this.onGround && this.state === PlayerState.GROUNDED) {
      this.state = PlayerState.FALLING
    }

    // 0气球落地 → 检测静止
    if (this.state === PlayerState.GROUNDED) {
      const isStill = Math.abs(input.moveX) < 0.1 && Math.abs(this.vx) < 20
      if (isStill) {
        this.stillTimer += dt
        if (this.stillTimer >= PHYS.inflateStillTime) {
          this.state = PlayerState.INFLATING
          this.inflateTimer = PHYS.inflateDuration
        }
      } else {
        this.stillTimer = 0
      }
    }

    // 恢复状态
    if (this.balloons > 0 && this.state === PlayerState.FALLING) {
      this.state = PlayerState.FLYING
    }
    if (this.balloons > 0 && this.state === PlayerState.GROUNDED) {
      this.state = PlayerState.FLYING
    }
  }

  // 获取渲染用的动画状态名
  getAnimName() {
    switch (this.state) {
      case PlayerState.INFLATING: return 'inflate'
      case PlayerState.ELIMINATED: return 'fall'
      case PlayerState.FALLING: return 'fall'
      case PlayerState.GROUNDED:
        return Math.abs(this.vx) > 20 ? 'walk' : 'idle'
      default:
        if (this.isFlapping) return 'flap'
        if (this.onGround) return Math.abs(this.vx) > 20 ? 'walk' : 'idle'
        return 'idle'
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/entities/Player.js
git commit -m "feat: add Player entity with 0-balloon state machine"
```

### Task 3.3：连接 Player 到引擎 + 验证

**Files:**
- Modify: `src/main.js`（用真实 Player + PhysicsEngine 替换临时测试实体）

- [ ] **Step 1: 更新 main.js**

```javascript
// src/main.js
import { GameEngine } from './engine/GameEngine.js'
import { DebugRenderer } from './engine/Renderer.js'
import { PhysicsEngine } from './engine/PhysicsEngine.js'
import { Player } from './entities/Player.js'
import { PLATFORMS, PLAYER_CONFIG } from './config/entities.js'
import { WORLD } from './config/world.js'

const canvas = document.getElementById('game-canvas')
const engine = new GameEngine(canvas)
const renderer = new DebugRenderer()
const physics = new PhysicsEngine()
physics.setPlatforms(PLATFORMS)

const player = new Player()
player.x = PLAYER_CONFIG.spawnX
player.y = PLAYER_CONFIG.spawnY

engine.setState({
  enter(engine) { engine.handleResize() },
  fixedUpdate(dt) {
    engine.input.update()
    if (player.alive) {
      physics.update(player, engine.input.state, dt)
      player.tick(dt, engine.input.state)
      // 水域检测
      if (physics.isSubmerged(player) && player.balloons === 0) {
        player.eliminate()
        console.log('玩家被水域淘汰')
      }
    }
    engine.camera.follow(player.x + player.width / 2, player.y + player.height / 2)
  },
  render(ctx, camera) {
    renderer.render(ctx, camera, 0, [player, ...PLATFORMS.map(p => ({...p, color: 'rgba(255,255,255,0.8)', width: p.w, height: p.h}))])
  }
})

window.addEventListener('resize', () => engine.handleResize())
engine.handleResize()
engine.start()
```

- [ ] **Step 2: 验证**

Run: `npm run dev`
Expected: 蓝色矩形（玩家）受重力下落，按空格拍打上升，A/D 或左右键左右飘移，能着陆在白色平台方块上，0 气球时无法拍打

- [ ] **Step 3: Commit**

```bash
git add src/main.js
git commit -m "feat: connect Player + PhysicsEngine to game loop"
```

---

## Phase 4：渲染层

**里程碑：** 玩家角色有卡通造型和气球、天空有云层视差背景、平台是云朵造型、水面有波纹、HUD 显示气球数。视觉不再是调试方块。

### Task 4.1：SpriteCache

**Files:**
- Create: `src/render/SpriteCache.js`

- [ ] **Step 1: 实现 SpriteCache**

```javascript
// src/render/SpriteCache.js
import { VISUALS } from '../config/visuals.js'

export class SpriteCache {
  constructor() {
    this.cache = new Map()
  }

  // 为指定颜色 + 动画类型预渲染精灵表
  prerender(color, balloonColor) {
    const key = `${color}_${balloonColor}`
    if (this.cache.has(key)) return

    const frames = VISUALS.frames
    const allFrames = {}

    // 每种动画类型预渲染
    for (const [animName, count] of Object.entries(frames)) {
      allFrames[animName] = []
      for (let i = 0; i < count; i++) {
        allFrames[animName].push(this._drawCharacterFrame(color, balloonColor, animName, i))
      }
    }

    this.cache.set(key, allFrames)
  }

  _drawCharacterFrame(bodyColor, balloonColor, animName, frameIndex) {
    const w = 32, h = 48
    const off = document.createElement('canvas')
    off.width = w; off.height = h
    const ctx = off.getContext('2d')

    // 身体（圆角矩形）
    ctx.fillStyle = bodyColor
    ctx.beginPath()
    ctx.roundRect(6, 16, 20, 24, 6)
    ctx.fill()
    // 描边
    ctx.strokeStyle = VISUALS.bodyOutline
    ctx.lineWidth = 1.5
    ctx.stroke()

    // 头（圆）
    ctx.fillStyle = bodyColor
    ctx.beginPath()
    ctx.arc(16, 12, 8, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    // 眼睛
    ctx.fillStyle = '#000'
    ctx.beginPath()
    ctx.arc(19, 11, 1.5, 0, Math.PI * 2)
    ctx.fill()

    // 气球（如果有）
    if (animName !== 'fall' && animName !== 'electrocute' && animName !== 'inflate') {
      const balloonY = 2 + Math.sin(frameIndex * 0.5) * 1
      ctx.fillStyle = balloonColor
      ctx.beginPath()
      ctx.arc(16, balloonY, 5, 0, Math.PI * 2)
      ctx.fill()
      // 高光
      ctx.fillStyle = VISUALS.balloonHighlight
      ctx.beginPath()
      ctx.arc(14, balloonY - 1, 1.5, 0, Math.PI * 2)
      ctx.fill()
      // 气球线
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(16, balloonY + 5)
      ctx.lineTo(16, 8)
      ctx.stroke()
    }

    // 动画特定细节
    if (animName === 'flap') {
      // 手臂上扬
      ctx.fillStyle = bodyColor
      ctx.fillRect(2, 18, 5, 4)
      ctx.fillRect(25, 18, 5, 4)
    } else if (animName === 'walk') {
      // 腿部交替
      ctx.fillStyle = bodyColor
      const offset = frameIndex % 2 === 0 ? 1 : -1
      ctx.fillRect(9, 40, 4, 6)
      ctx.fillRect(19, 40, 4, 6 + offset)
    } else if (animName === 'inflate') {
      // 充气：气球逐渐出现
      const progress = (frameIndex + 1) / VISUALS.frames.inflate
      ctx.globalAlpha = progress
      ctx.fillStyle = balloonColor
      ctx.beginPath()
      ctx.arc(16, 4, 3 * progress, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    } else if (animName === 'electrocute') {
      // 电弧效果
      ctx.strokeStyle = '#FFFF00'
      ctx.lineWidth = 1
      for (let j = 0; j < 3; j++) {
        ctx.beginPath()
        ctx.moveTo(Math.random() * w, Math.random() * h)
        ctx.lineTo(Math.random() * w, Math.random() * h)
        ctx.stroke()
      }
    } else if (animName === 'fall') {
      // 坠落：手臂上举
      ctx.fillStyle = bodyColor
      ctx.fillRect(2, 14, 5, 4)
      ctx.fillRect(25, 14, 5, 4)
    }

    return off
  }

  get(color, balloonColor, animName, frameIndex) {
    const key = `${color}_${balloonColor}`
    const sprites = this.cache.get(key)
    if (!sprites || !sprites[animName]) return null
    const frames = sprites[animName]
    return frames[frameIndex % frames.length]
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/render/SpriteCache.js
git commit -m "feat: add SpriteCache for pre-rendered character sprites"
```

### Task 4.2：BackgroundRenderer

**Files:**
- Create: `src/render/BackgroundRenderer.js`

- [ ] **Step 1: 实现 BackgroundRenderer**

```javascript
// src/render/BackgroundRenderer.js
import { WORLD } from '../config/world.js'
import { VISUALS } from '../config/visuals.js'

export class BackgroundRenderer {
  constructor() {
    // 预生成云朵装饰
    this.clouds = []
    for (let i = 0; i < VISUALS.cloudCount; i++) {
      this.clouds.push({
        x: Math.random() * WORLD.width,
        y: Math.random() * (WORLD.waterY - 100),
        size: 30 + Math.random() * 40,
        speed: 5 + Math.random() * 10,
        alpha: 0.3 + Math.random() * 0.4,
      })
    }
    this.time = 0
  }

  update(dt) {
    this.time += dt
    this.clouds.forEach(c => {
      c.x -= c.speed * dt
      if (c.x < -100) c.x = WORLD.width + 100
    })
  }

  render(ctx, camera) {
    const w = camera.viewWidth
    const h = camera.viewHeight

    // 天空渐变
    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, VISUALS.skyTop)
    grad.addColorStop(1, VISUALS.skyBottom)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)

    // 世界变换
    ctx.save()
    ctx.translate(-camera.x, -camera.y)

    // 远景云层（视差 0.3）
    this.clouds.forEach(c => {
      ctx.globalAlpha = c.alpha
      this._drawCloud(ctx, c.x, c.y, c.size)
    })
    ctx.globalAlpha = 1

    // 水域
    ctx.fillStyle = VISUALS.waterColor
    ctx.fillRect(0, WORLD.waterY, WORLD.width, WORLD.height - WORLD.waterY)
    // 水面波纹
    ctx.strokeStyle = VISUALS.waterSurface
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let x = 0; x <= WORLD.width; x += 10) {
      const y = WORLD.waterY + Math.sin(x * 0.02 + this.time * 2) * 3
      if (x === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()

    // 边界
    ctx.strokeStyle = VISUALS.boundaryColor
    ctx.lineWidth = 6
    ctx.strokeRect(0, 0, WORLD.width, WORLD.height)

    ctx.restore()
  }

  _drawCloud(ctx, x, y, size) {
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(x, y, size * 0.5, 0, Math.PI * 2)
    ctx.arc(x + size * 0.4, y - size * 0.1, size * 0.4, 0, Math.PI * 2)
    ctx.arc(x + size * 0.7, y, size * 0.45, 0, Math.PI * 2)
    ctx.arc(x + size * 0.3, y + size * 0.15, size * 0.35, 0, Math.PI * 2)
    ctx.fill()
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/render/BackgroundRenderer.js
git commit -m "feat: add BackgroundRenderer with sky, clouds, water"
```

### Task 4.3：EntityRenderer + ParticleSystem + HUDRenderer

**Files:**
- Create: `src/render/EntityRenderer.js`
- Create: `src/render/ParticleSystem.js`
- Create: `src/render/HUDRenderer.js`

- [ ] **Step 1: 实现 EntityRenderer**

```javascript
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
```

- [ ] **Step 2: 实现 ParticleSystem**

```javascript
// src/render/ParticleSystem.js
import { VISUALS } from '../config/visuals.js'

export class ParticleSystem {
  constructor() {
    this.particles = []
    this.maxParticles = VISUALS.maxParticles
  }

  burst(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) this.particles.shift()
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 300,
        vy: (Math.random() - 0.5) * 300 - 100,
        life: 0.3 + Math.random() * 0.3,
        maxLife: 0.5,
        color,
        size: 3 + Math.random() * 3,
      })
    }
  }

  update(dt) {
    this.particles = this.particles.filter(p => {
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vy += 600 * dt
      p.life -= dt
      return p.life > 0
    })
  }

  render(ctx) {
    this.particles.forEach(p => {
      ctx.globalAlpha = Math.min(1, p.life / 0.2)
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    })
    ctx.globalAlpha = 1
  }
}
```

- [ ] **Step 3: 实现 HUDRenderer**

```javascript
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
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.fillRect(mapX, mapY, mapSize, mapSize * (WORLD.height / WORLD.width))
    // 玩家点
    if (player) {
      const px = mapX + (player.x / WORLD.width) * mapSize
      const py = mapY + (player.y / WORLD.height) * mapSize * (WORLD.height / WORLD.width)
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
        const ey = mapY + (e.y / WORLD.height) * mapSize * (WORLD.height / WORLD.width)
        ctx.fillStyle = e.color || '#f00'
        ctx.fillRect(ex - 1, ey - 1, 2, 2)
      })
    }

    ctx.restore()
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/render/
git commit -m "feat: add EntityRenderer, ParticleSystem, HUDRenderer"
```

### Task 4.4：更新 Renderer 主控 + 验证

**Files:**
- Modify: `src/engine/Renderer.js`（替换 DebugRenderer）
- Modify: `src/main.js`（连接真实渲染层）

- [ ] **Step 1: 重写 Renderer.js**

```javascript
// src/engine/Renderer.js
import { BackgroundRenderer } from '../render/BackgroundRenderer.js'
import { EntityRenderer } from '../render/EntityRenderer.js'
import { ParticleSystem } from '../render/ParticleSystem.js'
import { HUDRenderer } from '../render/HUDRenderer.js'
import { WORLD } from '../config/world.js'
import { PLATFORMS, LIGHTNING_CLOUDS, AIR_CURRENTS } from '../config/entities.js'

export class Renderer {
  constructor() {
    this.bg = new BackgroundRenderer()
    this.entityRenderer = new EntityRenderer()
    this.particles = new ParticleSystem()
    this.hud = new HUDRenderer()
    this.time = 0
  }

  update(dt) {
    this.time += dt
    this.bg.update(dt)
    this.particles.update(dt)
  }

  render(ctx, camera, data) {
    const w = camera.viewWidth
    const h = camera.viewHeight

    // 背景
    this.bg.render(ctx, camera)

    // 世界变换
    ctx.save()
    ctx.translate(-camera.x, -camera.y)

    // 平台
    PLATFORMS.forEach(p => this.entityRenderer.renderPlatform(ctx, p))

    // 气流区
    AIR_CURRENTS.forEach(ac => {
      ctx.strokeStyle = 'rgba(200,220,255,0.4)'
      ctx.lineWidth = 2
      ctx.strokeRect(ac.x, ac.y, ac.w, ac.h)
    })

    // 小白云
    LIGHTNING_CLOUDS.forEach(lc => {
      ctx.fillStyle = 'rgba(255,255,255,0.8)'
      ctx.beginPath()
      ctx.arc(lc.x, lc.y, lc.radius, 0, Math.PI * 2)
      ctx.fill()
    })

    // 闪电
    if (data.lightnings) {
      data.lightnings.forEach(l => {
        ctx.strokeStyle = '#FFFF00'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(l.x, l.y)
        ctx.lineTo(l.x + l.vx * 0.05, l.y + l.vy * 0.05)
        ctx.stroke()
        ctx.fillStyle = '#FFFF00'
        ctx.beginPath()
        ctx.arc(l.x, l.y, 4, 0, Math.PI * 2)
        ctx.fill()
      })
    }

    // 鲸鱼
    if (data.whale && data.whale.state !== 'hidden') {
      const w = data.whale
      ctx.fillStyle = w.state === 'warning' ? 'rgba(100,150,200,0.5)' : '#4488AA'
      if (w.state === 'warning') {
        // 预警漩涡
        ctx.beginPath()
        ctx.arc(w.x, WORLD.waterY, 30, 0, Math.PI * 2)
        ctx.fill()
      } else {
        // 鲸鱼身体
        ctx.beginPath()
        ctx.ellipse(w.x, w.y, 40, 25, 0, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // 缩圈边界
    if (data.zoneRadius) {
      ctx.strokeStyle = 'rgba(150,200,255,0.6)'
      ctx.lineWidth = 8
      ctx.beginPath()
      ctx.arc(data.zoneCenterX, data.zoneCenterY, data.zoneRadius, 0, Math.PI * 2)
      ctx.stroke()
    }

    // 实体
    if (data.enemies) data.enemies.forEach(e => { if (e.alive) this.entityRenderer.renderEntity(ctx, e) })
    if (data.player && data.player.alive) this.entityRenderer.renderEntity(ctx, data.player)

    // 粒子
    this.particles.render(ctx)

    ctx.restore()

    // HUD（屏幕空间）
    this.hud.render(ctx, camera, data)
  }
}
```

- [ ] **Step 2: 更新 main.js**

```javascript
// src/main.js
import { GameEngine } from './engine/GameEngine.js'
import { Renderer } from './engine/Renderer.js'
import { PhysicsEngine } from './engine/PhysicsEngine.js'
import { Player } from './entities/Player.js'
import { PLATFORMS, PLAYER_CONFIG } from './config/entities.js'

const canvas = document.getElementById('game-canvas')
const engine = new GameEngine(canvas)
const renderer = new Renderer()
const physics = new PhysicsEngine()
physics.setPlatforms(PLATFORMS)
renderer.entityRenderer.prerenderEntity(PLAYER_CONFIG.color, PLAYER_CONFIG.balloonColor)

const player = new Player()
player.x = PLAYER_CONFIG.spawnX
player.y = PLAYER_CONFIG.spawnY

let totalTime = 0
engine.setState({
  enter(engine) { engine.handleResize() },
  fixedUpdate(dt) {
    engine.input.update()
    totalTime += dt
    if (player.alive) {
      physics.update(player, engine.input.state, dt)
      player.tick(dt, engine.input.state)
    }
    renderer.update(dt)
    engine.camera.follow(player.x + player.width / 2, player.y + player.height / 2)
  },
  render(ctx, camera) {
    renderer.render(ctx, camera, {
      player, enemies: [], aliveCount: 1, totalTime,
    })
  }
})

window.addEventListener('resize', () => engine.handleResize())
engine.handleResize()
engine.start()
```

- [ ] **Step 3: 验证**

Run: `npm run dev`
Expected: 天空蓝色渐变背景，飘动的云朵，白色云岛平台，玩家是卡通小人造型（蓝色身体+气球），HUD 左上显示气球数，右上显示"剩余 1"和小地图，顶部居中显示计时器

- [ ] **Step 4: Commit**

```bash
git add src/engine/Renderer.js src/main.js
git commit -m "feat: connect full render pipeline, replace debug rendering"
```

---

## Phase 5：战斗与碰撞

**里程碑：** 有多个 AI 敌人在地图上飞行，可以踩踏夺取气球、侧面弹开、踢杀淘汰。0 气球坠落→落地→充气→翻盘链路可操作。

### Task 5.1：CollisionSystem

**Files:**
- Create: `src/systems/CollisionSystem.js`
- Test: `src/systems/CollisionSystem.test.js`

- [ ] **Step 1: 写测试**

```javascript
// src/systems/CollisionSystem.test.js
import { describe, it, expect } from 'vitest'
import { CollisionSystem } from './CollisionSystem.js'

describe('CollisionSystem', () => {
  const makeEntity = (x, y, vx = 0, vy = 0, balloons = 2) => ({
    x, y, width: 28, height: 36, vx, vy, balloons, alive: true,
    onGround: false, facingRight: true, animFrame: 0,
  })

  it('detects stomp when attacker is above and falling', () => {
    const cs = new CollisionSystem()
    const attacker = makeEntity(100, 100, 0, 200, 2) // bottom = 136
    const victim = makeEntity(100, 130, 0, 0, 2)     // top = 130 < 136, overlap
    const result = cs.checkCollision(attacker, victim)
    expect(result.type).toBe('stomp')
    expect(result.attacker).toBe(attacker)
  })

  it('detects side collision when not from above', () => {
    const cs = new CollisionSystem()
    const a = makeEntity(100, 100, 200, 0, 2)
    const b = makeEntity(110, 100, -200, 0, 2)
    const result = cs.checkCollision(a, b)
    expect(result.type).toBe('side')
  })

  it('detects kick-kill when victim has 0 balloons on ground', () => {
    const cs = new CollisionSystem()
    const attacker = makeEntity(100, 100, 0, 200, 2) // bottom = 136
    const victim = makeEntity(100, 130, 0, 0, 0)     // top = 130, overlap
    victim.onGround = true
    const result = cs.checkCollision(attacker, victim)
    expect(result.type).toBe('kick')
  })

  it('returns null when no overlap', () => {
    const cs = new CollisionSystem()
    const a = makeEntity(0, 0)
    const b = makeEntity(500, 500)
    expect(cs.checkCollision(a, b)).toBeNull()
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/systems/CollisionSystem.test.js`
Expected: FAIL

- [ ] **Step 3: 实现 CollisionSystem**

```javascript
// src/systems/CollisionSystem.js
import { PHYS } from '../config/physics.js'

export class CollisionSystem {
  // 检查两个实体之间的碰撞
  checkCollision(a, b) {
    if (!a.alive || !b.alive) return null
    // AABB 重叠
    if (a.x + a.width <= b.x || b.x + b.width <= a.x) return null
    if (a.y + a.height <= b.y || b.y + b.height <= a.y) return null

    // 踢杀：攻击方有气球 + 被攻方 0 气球 + 在地面
    if (a.balloons > 0 && b.balloons === 0 && b.onGround) {
      return { type: 'kick', attacker: a, victim: b }
    }
    if (b.balloons > 0 && a.balloons === 0 && a.onGround) {
      return { type: 'kick', attacker: b, victim: a }
    }

    // 判断谁从上方踩踏
    const aFromAbove = a.vy > 0 && (a.y + a.height * 0.5) < (b.y + b.height * 0.5)
    const bFromAbove = b.vy > 0 && (b.y + b.height * 0.5) < (a.y + a.height * 0.5)

    if (aFromAbove && !bFromAbove && a.balloons > 0 && b.balloons > 0) {
      return { type: 'stomp', attacker: a, victim: b }
    }
    if (bFromAbove && !aFromAbove && b.balloons > 0 && a.balloons > 0) {
      return { type: 'stomp', attacker: b, victim: a }
    }

    // 侧面碰撞
    return { type: 'side', a, b }
  }

  // 解析踩踏事件
  resolveStomp(attacker, victim, physicsEngine, scoreSystem, particleSystem) {
    const events = []

    // 被踩方失 1 气球
    victim.loseBalloon()
    events.push({ type: 'balloonPop', entity: victim })

    // 攻击方获得气球（如果未达上限）
    if (attacker.balloons < attacker.maxBalloons) {
      attacker.gainBalloon()
      events.push({ type: 'balloonGain', entity: attacker })
    }

    // 攻击方弹跳
    physicsEngine.applyStompBounce(attacker)
    events.push({ type: 'stompBounce', entity: attacker })

    // 分数
    if (scoreSystem && attacker.isPlayer) {
      scoreSystem.addStompScore(attacker)
    }

    // 粒子
    if (particleSystem) {
      particleSystem.burst(victim.x + victim.width / 2, victim.y, '#fff', 8)
    }

    return events
  }

  // 解析侧面弹开
  resolveSide(a, b, physicsEngine) {
    const dirA = a.x < b.x ? -1 : 1
    physicsEngine.applyBounce(a, dirA)
    physicsEngine.applyBounce(b, -dirA)
    return [{ type: 'bounce', a, b }]
  }
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run src/systems/CollisionSystem.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/systems/CollisionSystem.js src/systems/CollisionSystem.test.js
git commit -m "feat: add CollisionSystem with stomp, side, kick-kill detection"
```

### Task 5.2：Enemy 实体

**Files:**
- Create: `src/entities/Enemy.js`

- [ ] **Step 1: 实现 Enemy**

```javascript
// src/entities/Enemy.js
import { PHYS } from '../config/physics.js'
import { AI_TYPES, AI_DECISION_INTERVAL } from '../config/entities.js'
import { PlayerState } from './Player.js' // 复用状态枚举

export class Enemy {
  constructor(typeKey, spawnX, spawnY) {
    const cfg = AI_TYPES[typeKey]
    this.typeKey = typeKey
    this.name = cfg.name
    this.color = cfg.color
    this.balloonColor = cfg.color
    this.speed = cfg.speed
    this.chaseRate = cfg.chaseRate
    this.flapInterval = cfg.flapInterval
    this.baseScale = cfg.scale
    this.width = 28 * cfg.scale
    this.height = 36 * cfg.scale
    this.x = spawnX; this.y = spawnY
    this.vx = 0; this.vy = 0
    this.balloons = cfg.balloonCount
    this.maxBalloons = PHYS.maxBalloons
    this.flapCooldown = 0; this.isFlapping = false; this.flapTimer = 0
    this.onGround = false; this.onPlatform = null
    this.facingRight = true
    this.state = PlayerState.FLYING
    this.stillTimer = 0; this.inflateTimer = 0
    this.alive = true
    this.aiTimer = 0
    this.flapAiTimer = 0
    this.moveDir = 0
    this.animFrame = 0; this.animTimer = 0
    this._decisionInterval = AI_DECISION_INTERVAL[0] + Math.random() * (AI_DECISION_INTERVAL[1] - AI_DECISION_INTERVAL[0])
  }

  get scale() {
    const extra = Math.max(0, this.balloons - PHYS.initialBalloons)
    return this.baseScale * (1 + extra * PHYS.sizePerBalloon)
  }

  get effectiveWidth() { return this.width * this.scale / this.baseScale }
  get effectiveHeight() { return this.height * this.scale / this.baseScale }
  gainBalloon() { if (this.balloons < this.maxBalloons) { this.balloons++; this._updateState() } }
  loseBalloon() { if (this.balloons > 0) { this.balloons--; this._updateState() } }
  eliminate() { this.state = PlayerState.ELIMINATED; this.alive = false }
  _updateState() {
    if (this.state === PlayerState.ELIMINATED) return
    if (this.balloons === 0 && !this.onGround) this.state = PlayerState.FALLING
    else if (this.balloons === 0 && this.onGround) this.state = PlayerState.GROUNDED
    else if (this.balloons > 0 && this.state !== PlayerState.INFLATING) this.state = PlayerState.FLYING
  }

  // AI 决策
  decideAI(player, dt) {
    if (!this.alive || this.state === PlayerState.INFLATING || this.state === PlayerState.ELIMINATED) {
      return { moveX: 0, flapJustPressed: false }
    }

    this.aiTimer += dt
    if (this.aiTimer < this._decisionInterval) {
      // 沿用上次决策
      return { moveX: this.moveDir, flapJustPressed: false }
    }
    this.aiTimer = 0

    const dist = Math.hypot(player.x - this.x, player.y - this.y)
    const shouldChase = Math.random() < this.chaseRate

    if (shouldChase && player.alive) {
      this.moveDir = player.x > this.x + 10 ? 1 : (player.x < this.x - 10 ? -1 : 0)
      // 玩家在上方时尝试拍打
      this.flapAiTimer -= dt
      if (player.y < this.y - 30 && this.flapAiTimer <= 0 && this.balloons > 0) {
        this.flapAiTimer = this.flapInterval[0] + Math.random() * (this.flapInterval[1] - this.flapInterval[0])
        return { moveX: this.moveDir, flapJustPressed: true }
      }
    } else {
      // 随机飘浮
      if (Math.random() < 0.3) this.moveDir = Math.random() < 0.5 ? -1 : 1
      if (Math.random() < 0.2 && this.balloons > 0) {
        return { moveX: this.moveDir, flapJustPressed: true }
      }
    }

    // 地面卡住时强制拍打
    if (this.onGround && Math.abs(this.vx) < 10 && this.balloons > 0) {
      return { moveX: this.moveDir, flapJustPressed: true }
    }

    return { moveX: this.moveDir, flapJustPressed: false }
  }

  tick(dt, input) {
    this.animTimer += dt
    if (this.animTimer > 0.1) { this.animTimer = 0; this.animFrame++ }
    if (input.moveX !== 0) this.facingRight = input.moveX > 0

    if (this.state === PlayerState.ELIMINATED) return

    // 充气处理（必须在提前返回之前执行）
    if (this.state === PlayerState.INFLATING) {
      this.inflateTimer -= dt
      if (this.inflateTimer <= 0) {
        this.balloons = PHYS.inflateRecoverTo
        this.state = PlayerState.FLYING
        this.stillTimer = 0
      }
      return
    }

    // 0 气球着陆/离地状态转换
    if (this.balloons === 0 && this.onGround && this.state === PlayerState.FALLING) {
      this.state = PlayerState.GROUNDED
    }
    if (this.balloons === 0 && !this.onGround && this.state === PlayerState.GROUNDED) {
      this.state = PlayerState.FALLING
    }

    if (this.state === PlayerState.GROUNDED) {
      const isStill = Math.abs(input.moveX) < 0.1 && Math.abs(this.vx) < 20
      if (isStill) {
        this.stillTimer += dt
        if (this.stillTimer >= PHYS.inflateStillTime) {
          this.state = PlayerState.INFLATING
          this.inflateTimer = PHYS.inflateDuration
        }
      } else { this.stillTimer = 0 }
    }

    if (this.balloons > 0 && (this.state === PlayerState.FALLING || this.state === PlayerState.GROUNDED)) {
      this.state = PlayerState.FLYING
    }
  }

  getAnimName() {
    switch (this.state) {
      case PlayerState.INFLATING: return 'inflate'
      case PlayerState.ELIMINATED: return 'fall'
      case PlayerState.FALLING: return 'fall'
      case PlayerState.GROUNDED: return Math.abs(this.vx) > 20 ? 'walk' : 'idle'
      default:
        if (this.isFlapping) return 'flap'
        if (this.onGround) return Math.abs(this.vx) > 20 ? 'walk' : 'idle'
        return 'idle'
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/entities/Enemy.js
git commit -m "feat: add Enemy entity with 4 AI personality types"
```

### Task 5.3：连接碰撞 + AI 到游戏循环

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: 更新 main.js 加入敌人和碰撞**

在 main.js 中加入敌人生成和碰撞检测。创建 `src/systems/AISystem.js` 作为简单调度器：

```javascript
// src/systems/AISystem.js
export class AISystem {
  update(enemies, player, dt, physicsEngine) {
    enemies.forEach(enemy => {
      if (!enemy.alive) return
      const input = enemy.decideAI(player, dt)
      physicsEngine.update(enemy, input, dt)
      enemy.tick(dt, input)
    })
  }
}
```

更新 main.js 的 fixedUpdate 加入敌人、AI、碰撞：

```javascript
// 在 main.js 的 fixedUpdate 中追加：
// AI 更新
aiSystem.update(enemies, player, dt, physics)
// 碰撞检测
enemies.forEach(enemy => {
  if (!enemy.alive) return
  const result = collisionSystem.checkCollision(player, enemy)
  if (!result) return
  if (result.type === 'stomp') {
    collisionSystem.resolveStomp(result.attacker, result.victim, physics, null, renderer.particles)
  } else if (result.type === 'side') {
    collisionSystem.resolveSide(result.a, result.b, physics)
  } else if (result.type === 'kick') {
    result.victim.eliminate()
    renderer.particles.burst(result.victim.x, result.victim.y, result.victim.color, 12)
  }
})
// 敌人之间碰撞（简化：只检测邻近的）
// ... 可在后续迭代中加入
```

- [ ] **Step 2: 验证**

Run: `npm run dev`
Expected: 地图上有多个彩色敌人在飞行，碰到敌人时可以踩踏（从上方）夺取气球，侧面碰撞弹开，0 气球时坠落可着陆平台充气翻盘

- [ ] **Step 3: Commit**

```bash
git add src/systems/AISystem.js src/main.js
git commit -m "feat: connect AI enemies and collision system to game loop"
```

---

## Phase 6：环境危险

**里程碑：** 小白云发出弹球闪电、鲸鱼随机跳出水面、气流区推动角色、缩圈逐渐收缩。

### Task 6.1：Environmental 实体 + ZoneSystem

**Files:**
- Create: `src/entities/Environmental.js`
- Create: `src/systems/ZoneSystem.js`

- [ ] **Step 1: 实现 Environmental（小白云、闪电、气流、鲸鱼）**

```javascript
// src/entities/Environmental.js
import { WORLD } from '../config/world.js'

// 闪电弹球
export class Lightning {
  constructor(x, y, dirX, dirY) {
    this.x = x; this.y = y
    this.vx = dirX * 150; this.vy = dirY * 150
    this.width = 12; this.height = 12
    this.life = 5.0 // 秒
    this.alive = true
  }

  update(dt, platforms, clouds) {
    this.x += this.vx * dt
    this.y += this.vy * dt
    this.life -= dt
    if (this.life <= 0) { this.alive = false; return }

    // 反弹平台
    for (const p of platforms) {
      if (this.x > p.x && this.x < p.x + p.w && this.y > p.y && this.y < p.y + p.h) {
        // 简单反弹：反转速度
        this.vy = -this.vy
        this.y += this.vy * dt
        break
      }
    }

    // 碰白云本体消散
    if (clouds) {
      for (const c of clouds) {
        const dx = this.x - c.x
        const dy = this.y - c.y
        if (Math.hypot(dx, dy) < c.radius) {
          this.alive = false
          return
        }
      }
    }

    // 碰水面消散
    if (this.y >= WORLD.waterY) this.alive = false
    // 出界消散
    if (this.x < 0 || this.x > WORLD.width) this.alive = false
  }
}

// 小白云
export class Cloud {
  constructor(x, y, radius) {
    this.x = x; this.y = y; this.radius = radius
    this.width = radius * 2; this.height = radius * 2
    this.dischargeTimer = 3 + Math.random() * 4 // 秒
    this.alive = true
  }

  update(dt) {
    this.dischargeTimer -= dt
    if (this.dischargeTimer <= 0) {
      this.dischargeTimer = 5 + Math.random() * 5
      return true // 发出闪电
    }
    return false
  }

  discharge() {
    const angle = Math.random() * Math.PI * 2
    return new Lightning(this.x, this.y, Math.cos(angle), Math.sin(angle))
  }
}

// 鲸鱼
export class Whale {
  constructor() {
    this.x = Math.random() * WORLD.width
    this.y = WORLD.waterY
    this.state = 'hidden' // hidden | warning | jumping | returning
    this.timer = 10 + Math.random() * 15
    this.width = 80; this.height = 60
    this.alive = true
  }

  update(dt, entities) {
    this.timer -= dt
    if (this.state === 'hidden') {
      if (this.timer <= 0) {
        // 寻找贴水目标
        const target = entities.find(e => e.alive && e.y > WORLD.waterY - 200)
        if (target) {
          this.x = target.x
          this.state = 'warning'
          this.timer = 1.5 // 预警时长
        } else {
          this.timer = 5
        }
      }
    } else if (this.state === 'warning') {
      if (this.timer <= 0) {
        this.state = 'jumping'
        this.timer = 0.8
        this.jumpStartY = WORLD.waterY
        this.jumpPeakY = WORLD.waterY - 150
      }
    } else if (this.state === 'jumping') {
      const progress = 1 - this.timer / 0.8
      this.y = this.jumpStartY + (this.jumpPeakY - this.jumpStartY) * Math.sin(progress * Math.PI)
      if (this.timer <= 0) {
        this.state = 'returning'
        this.timer = 0.5
        this.y = WORLD.waterY
      }
    } else if (this.state === 'returning') {
      if (this.timer <= 0) {
        this.state = 'hidden'
        this.timer = 15 + Math.random() * 15
      }
    }
    return this.state
  }

  checkEat(entity) {
    if (this.state !== 'jumping') return false
    const dx = Math.abs(entity.x + entity.width / 2 - this.x)
    const dy = Math.abs(entity.y + entity.height / 2 - this.y)
    return dx < 50 && dy < 50
  }
}

// 气流区
export class AirCurrent {
  constructor(config) {
    Object.assign(this, config)
  }

  applyForce(entity, dt) {
    if (entity.x + entity.width > this.x && entity.x < this.x + this.w &&
        entity.y + entity.height > this.y && entity.y < this.y + this.h) {
      entity.vx += this.dirX * this.strength * dt
      entity.vy += this.dirY * this.strength * dt
    }
  }
}
```

- [ ] **Step 2: 实现 ZoneSystem**

```javascript
// src/systems/ZoneSystem.js
import { WORLD } from '../config/world.js'

export class ZoneSystem {
  constructor() {
    this.zoneRadius = Math.max(WORLD.width, WORLD.height) / 2
    this.zoneCenterX = WORLD.width / 2
    this.zoneCenterY = WORLD.height / 2
    this.elapsed = 0
    this.shrinkTimer = 0
  }

  update(dt, aliveCount) {
    this.elapsed += dt
    this.shrinkTimer += dt

    if (this.elapsed >= WORLD.zoneShrinkStart && this.shrinkTimer >= WORLD.zoneShrinkInterval) {
      this.shrinkTimer = 0
      this.zoneRadius = Math.max(WORLD.zoneMinRadius, this.zoneRadius * WORLD.zoneShrinkRate)
    }
  }

  // 检查实体是否在圈外
  isOutsideZone(entity) {
    const cx = entity.x + entity.width / 2
    const cy = entity.y + entity.height / 2
    const dist = Math.hypot(cx - this.zoneCenterX, cy - this.zoneCenterY)
    return dist > this.zoneRadius
  }

  // 对圈外实体施加推力
  applyZoneForce(entity, dt) {
    if (!this.isOutsideZone(entity)) return
    const cx = entity.x + entity.width / 2
    const cy = entity.y + entity.height / 2
    const dx = this.zoneCenterX - cx
    const dy = this.zoneCenterY - cy
    const dist = Math.hypot(dx, dy) || 1
    entity.vx += (dx / dist) * WORLD.zonePushForce * dt
    entity.vy += (dy / dist) * WORLD.zonePushForce * dt
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/entities/Environmental.js src/systems/ZoneSystem.js
git commit -m "feat: add environmental entities (lightning, whale, air currents) and zone system"
```

---

## Phase 7：对局流程

**里程碑：** 完整对局——菜单→倒计时入场→自由对战→缩圈→淘汰→结算→重开。

### Task 7.1：ScoreSystem + SpawnManager + MatchManager

**Files:**
- Create: `src/systems/ScoreSystem.js`
- Create: `src/managers/SpawnManager.js`
- Create: `src/managers/MatchManager.js`

- [ ] **Step 1: 实现 ScoreSystem**

```javascript
// src/systems/ScoreSystem.js
export class ScoreSystem {
  constructor() {
    this.scores = new Map() // entityId → score
    this.eliminations = new Map() // entityId → count
  }

  addStompScore(entity) {
    const id = entity.id || entity
    const current = this.scores.get(id) || 0
    this.scores.set(id, current + 200)
  }

  addEliminationScore(entity) {
    const id = entity.id || entity
    const current = this.scores.get(id) || 0
    const elims = this.eliminations.get(id) || 0
    this.eliminations.set(id, elims + 1)
    this.scores.set(id, current + 300)
  }

  getScore(entity) {
    return this.scores.get(entity.id || entity) || 0
  }

  getEliminations(entity) {
    return this.eliminations.get(entity.id || entity) || 0
  }
}
```

- [ ] **Step 2: 实现 SpawnManager**

```javascript
// src/managers/SpawnManager.js
import { AI_DISTRIBUTION, TOTAL_ENTITIES } from '../config/entities.js'
import { WORLD } from '../config/world.js'
import { Enemy } from '../entities/Enemy.js'

export class SpawnManager {
  constructor() {
    this.respawnQueue = [] // 前30秒可复活一次的 AI
    this.elapsed = 0
  }

  generateInitialEnemies() {
    const enemies = []
    const count = TOTAL_ENTITIES - 1 // 减去玩家
    for (let i = 0; i < count; i++) {
      const typeKey = this._pickType()
      const pos = this._pickEdgePosition(i, count)
      const enemy = new Enemy(typeKey, pos.x, pos.y)
      enemy.id = `ai_${i}`
      enemies.push(enemy)
    }
    return enemies
  }

  _pickType() {
    const r = Math.random()
    let acc = 0
    for (const { type, ratio } of AI_DISTRIBUTION) {
      acc += ratio
      if (r < acc) return type
    }
    return AI_DISTRIBUTION[0].type
  }

  _pickEdgePosition(index, total) {
    // 从地图边缘不同位置入场
    const angle = (index / total) * Math.PI * 2
    const cx = WORLD.width / 2
    const cy = WORLD.height / 2
    const r = Math.min(WORLD.width, WORLD.height) * 0.4
    return {
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
    }
  }

  update(dt, matchManager) {
    this.elapsed += dt
    // 前30秒内被淘汰的 AI 可复活一次
    if (this.elapsed < 30 && this.respawnQueue.length > 0) {
      const enemy = this.respawnQueue.shift()
      enemy.alive = true
      enemy.balloons = 1
      enemy.state = 'flying'
      enemy.x = this._pickEdgePosition(Math.random(), 1).x
      enemy.y = 100
      matchManager.addAlive(enemy)
      return enemy
    }
    return null
  }

  queueRespawn(enemy) {
    if (this.elapsed < 30) {
      this.respawnQueue.push(enemy)
    }
  }
}
```

- [ ] **Step 3: 实现 MatchManager**

```javascript
// src/managers/MatchManager.js
export class MatchManager {
  constructor() {
    this.aliveEntities = [] // 所有存活实体（含玩家）
    this.eliminated = []
    this.matchTime = 0
    this.phase = 'waiting' // waiting | playing | ended
    this.winner = null
  }

  setEntities(entities) {
    this.aliveEntities = entities.slice()
    this.eliminated = []
    this.matchTime = 0
    this.phase = 'playing'
    this.winner = null
  }

  addAlive(entity) {
    if (!this.aliveEntities.includes(entity)) {
      this.aliveEntities.push(entity)
    }
  }

  eliminate(entity) {
    entity.eliminate()
    this.aliveEntities = this.aliveEntities.filter(e => e !== entity)
    this.eliminated.push(entity)
    if (this.aliveEntities.length <= 1) {
      this.phase = 'ended'
      this.winner = this.aliveEntities[0] || null
    }
  }

  update(dt) {
    if (this.phase !== 'playing') return
    this.matchTime += dt
  }

  getAliveCount() { return this.aliveEntities.length }
  getRank(entity) {
    // 淘汰越晚排名越高
    const elimIndex = this.eliminated.indexOf(entity)
    if (elimIndex >= 0) return this.eliminated.length - elimIndex + 1
    if (this.aliveEntities.includes(entity)) return 1
    return this.eliminated.length + 1
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/systems/ScoreSystem.js src/managers/
git commit -m "feat: add ScoreSystem, SpawnManager, MatchManager for battle royale flow"
```

### Task 7.2：状态机（MenuState, PlayState, ResultState）

**Files:**
- Create: `src/states/MenuState.js`
- Create: `src/states/PlayState.js`
- Create: `src/states/ResultState.js`
- Modify: `src/main.js`

- [ ] **Step 1: 实现 MenuState**

```javascript
// src/states/MenuState.js
export class MenuState {
  enter(engine) {
    engine.handleResize()
  }

  fixedUpdate(dt) {
    const engine = this.engineRef
    engine.input.update()
    if (engine.input.state.flapJustPressed) {
      if (this.startGame) this.startGame()
    }
  }

  render(ctx, camera) {
    const w = camera.viewWidth, h = camera.viewHeight
    // 背景渐变
    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, '#87CEEB')
    grad.addColorStop(1, '#E0F6FF')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)

    // 标题
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 48px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('气球大乱踩', w / 2, h / 3)
    ctx.font = '20px sans-serif'
    ctx.fillText('点击或按空格开始', w / 2, h / 2)
  }
}
```

- [ ] **Step 2: 实现 PlayState**

```javascript
// src/states/PlayState.js
import { PHYS } from '../config/physics.js'
import { PLAYER_CONFIG, PLATFORMS, LIGHTNING_CLOUDS, AIR_CURRENTS } from '../config/entities.js'
import { Player } from '../entities/Player.js'
import { Cloud, Whale, AirCurrent, Lightning } from '../entities/Environmental.js'
import { CollisionSystem } from '../systems/CollisionSystem.js'
import { AISystem } from '../systems/AISystem.js'
import { ZoneSystem } from '../systems/ZoneSystem.js'
import { ScoreSystem } from '../systems/ScoreSystem.js'
import { SpawnManager } from '../managers/SpawnManager.js'
import { MatchManager } from '../managers/MatchManager.js'

export class PlayState {
  constructor() {
    this.collision = new CollisionSystem()
    this.aiSystem = new AISystem()
    this.zoneSystem = new ZoneSystem()
    this.scoreSystem = new ScoreSystem()
    this.spawnManager = new SpawnManager()
    this.matchManager = new MatchManager()
    this.clouds = []
    this.lightnings = []
    this.airCurrents = []
    this.whale = null
    this.countdown = 3.0
    this.phase = 'countdown' // countdown | playing | ended
    this.paused = false
  }

  enter(engine) {
    engine.handleResize()
    const renderer = engine.state.renderer

    // 初始化实体
    this.player = new Player()
    this.player.x = PLAYER_CONFIG.spawnX
    this.player.y = PLAYER_CONFIG.spawnY
    this.player.id = 'player'

    this.enemies = this.spawnManager.generateInitialEnemies()
    this.matchManager.setEntities([this.player, ...this.enemies])

    // 环境实体
    this.clouds = LIGHTNING_CLOUDS.map(c => new Cloud(c.x, c.y, c.radius))
    this.airCurrents = AIR_CURRENTS.map(c => new AirCurrent(c))
    this.whale = new Whale()

    // 预渲染精灵
    if (renderer && renderer.entityRenderer) {
      renderer.entityRenderer.prerenderEntity(PLAYER_CONFIG.color, PLAYER_CONFIG.balloonColor)
      this.enemies.forEach(e => renderer.entityRenderer.prerenderEntity(e.color, e.balloonColor))
    }
  }

  exit(engine) {
    // 清理触屏 UI 事件监听器，防止多局累积
    if (this._pauseBtnHandler) {
      const pauseBtn = document.getElementById('btn-pause')
      if (pauseBtn) pauseBtn.removeEventListener('click', this._pauseBtnHandler)
      this._pauseBtnHandler = null
    }
    // InputManager 的触屏监听器由 setJoystickElement/setFlapButtonElement 管理
    // 下次 enter 时会重新注册，需确保 InputManager 内部先移除旧监听器
    engine.input.cleanup && engine.input.cleanup()
  }

  // 统一淘汰处理：更新存活列表 + AI 复活排队
  _eliminate(entity) {
    this.matchManager.eliminate(entity)
    if (entity !== this.player) this.spawnManager.queueRespawn(entity)
  }

  fixedUpdate(dt) {
    const engine = this.engineRef
    engine.input.update()

    // ESC 边沿触发：按下时切换暂停状态
    const pausePressed = engine.input.state.pause
    if (pausePressed && !this._prevPause) {
      this.paused = !this.paused
    }
    this._prevPause = pausePressed

    if (this.paused || this.phase === 'ended') return

    if (this.phase === 'countdown') {
      this.countdown -= dt
      if (this.countdown <= 0) this.phase = 'playing'
      return
    }

    this.matchManager.update(dt)

    // 玩家
    if (this.player.alive) {
      const phys = engine.physics
      phys.update(this.player, engine.input.state, dt)
      this.player.tick(dt, engine.input.state)
      // 水域
      if (phys.isSubmerged(this.player) && this.player.balloons === 0) {
        this._eliminate(this.player)
      }
    }

    // AI
    this.aiSystem.update(this.enemies, this.player, dt, engine.physics)

    // 碰撞：玩家 vs 敌人
    this.enemies.forEach(enemy => {
      if (!enemy.alive) return
      const result = this.collision.checkCollision(this.player, enemy)
      if (!result) return
      if (result.type === 'stomp') {
        this.collision.resolveStomp(result.attacker, result.victim, engine.physics, this.scoreSystem, this.engineRef.renderer.particles)
      } else if (result.type === 'side') {
        this.collision.resolveSide(result.a, result.b, engine.physics)
      } else if (result.type === 'kick') {
        this._eliminate(result.victim)
        this.scoreSystem.addEliminationScore(result.attacker)
        this.engineRef.renderer.particles.burst(result.victim.x, result.victim.y, result.victim.color, 12)
      }
    })

    // 敌人之间碰撞
    for (let i = 0; i < this.enemies.length; i++) {
      for (let j = i + 1; j < this.enemies.length; j++) {
        if (!this.enemies[i].alive || !this.enemies[j].alive) continue
        const result = this.collision.checkCollision(this.enemies[i], this.enemies[j])
        if (!result) continue
        if (result.type === 'stomp') {
          this.collision.resolveStomp(result.attacker, result.victim, engine.physics, null, this.engineRef.renderer.particles)
        } else if (result.type === 'side') {
          this.collision.resolveSide(result.a, result.b, engine.physics)
        } else if (result.type === 'kick') {
          this._eliminate(result.victim)
          this.engineRef.renderer.particles.burst(result.victim.x, result.victim.y, result.victim.color, 12)
        }
      }
    }

    // 环境：闪电
    this.clouds.forEach(cloud => {
      if (cloud.update(dt)) {
        this.lightnings.push(cloud.discharge())
      }
    })
    this.lightnings = this.lightnings.filter(l => {
      l.update(dt, PLATFORMS, this.clouds)
      if (!l.alive) return false
      // 击中检测
      const allEntities = [this.player, ...this.enemies].filter(e => e.alive)
      for (const entity of allEntities) {
        if (entity.x + entity.width > l.x - 6 && entity.x < l.x + 6 &&
            entity.y + entity.height > l.y - 6 && entity.y < l.y + 6) {
          this._eliminate(entity)
          this.engineRef.renderer.particles.burst(entity.x, entity.y, '#FFFF00', 15)
          return false
        }
      }
      return true
    })

    // 环境：鲸鱼
    this.whale.update(dt, [this.player, ...this.enemies])
    if (this.whale.state === 'jumping') {
      const allEntities = [this.player, ...this.enemies].filter(e => e.alive)
      for (const entity of allEntities) {
        if (this.whale.checkEat(entity)) {
          this._eliminate(entity)
          this.engineRef.renderer.particles.burst(entity.x, entity.y, '#4488AA', 15)
        }
      }
    }

    // 环境：气流
    this.airCurrents.forEach(ac => {
      [this.player, ...this.enemies].forEach(e => { if (e.alive) ac.applyForce(e, dt) })
    })

    // 缩圈
    this.zoneSystem.update(dt, this.matchManager.getAliveCount())
    ;[this.player, ...this.enemies].forEach(e => {
      if (e.alive) this.zoneSystem.applyZoneForce(e, dt)
    })

    // 水域检测（敌人）
    this.enemies.forEach(e => {
      if (e.alive && engine.physics.isSubmerged(e) && e.balloons === 0) {
        this._eliminate(e)
      }
    })

    // Spawn manager（前30秒复活）
    const respawned = this.spawnManager.update(dt, this.matchManager)
    // 复活成功已在 matchManager.addAlive 中处理

    // 相机跟随
    engine.camera.follow(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2)

    // 渲染更新
    engine.renderer.update(dt)

    // 对局结束检测
    if (this.matchManager.phase === 'ended') {
      this.phase = 'ended'
      if (this.showResult) {
        this.showResult({
          rank: this.matchManager.getRank(this.player),
          eliminations: this.scoreSystem.getEliminations(this.player),
          maxBalloons: this.player.maxBalloonsAchieved,
          survivalTime: this.matchManager.matchTime,
        })
      }
    }
  }

  render(ctx, camera, dt) {
    const engine = this.engineRef
    engine.renderer.render(ctx, camera, {
      player: this.player,
      enemies: this.enemies,
      aliveCount: this.matchManager.getAliveCount(),
      totalTime: this.matchManager.matchTime,
      lightnings: this.lightnings,
      whale: this.whale,
      airCurrents: this.airCurrents,
      clouds: this.clouds,
      zoneRadius: this.zoneSystem.zoneRadius,
      zoneCenterX: this.zoneSystem.zoneCenterX,
      zoneCenterY: this.zoneSystem.zoneCenterY,
    })

    // 倒计时
    if (this.phase === 'countdown') {
      ctx.fillStyle = 'rgba(0,0,0,0.4)'
      ctx.fillRect(0, 0, camera.viewWidth, camera.viewHeight)
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 64px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(Math.ceil(this.countdown).toString(), camera.viewWidth / 2, camera.viewHeight / 2)
    }

    // 暂停
    if (this.paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.fillRect(0, 0, camera.viewWidth, camera.viewHeight)
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 32px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('已暂停', camera.viewWidth / 2, camera.viewHeight / 2)
      ctx.font = '16px sans-serif'
      ctx.fillText('按 ESC 继续', camera.viewWidth / 2, camera.viewHeight / 2 + 30)
    }
  }
}
```

- [ ] **Step 3: 实现 ResultState**

```javascript
// src/states/ResultState.js
export class ResultState {
  constructor(matchData) {
    this.matchData = matchData
  }

  enter(engine) {
    engine.handleResize()
  }

  fixedUpdate(dt) {
    const engine = this.engineRef
    engine.input.update()
    if (engine.input.state.flapJustPressed) {
      if (this.restart) this.restart()
    }
  }

  render(ctx, camera) {
    const w = camera.viewWidth, h = camera.viewHeight
    ctx.fillStyle = 'rgba(0,0,0,0.8)'
    ctx.fillRect(0, 0, w, h)

    ctx.fillStyle = '#fff'
    ctx.textAlign = 'center'
    ctx.font = 'bold 40px sans-serif'
    ctx.fillText('对局结束', w / 2, h / 4)

    ctx.font = '24px sans-serif'
    const data = this.matchData || {}
    ctx.fillText(`排名: #${data.rank || 1}`, w / 2, h / 3 + 20)
    ctx.fillText(`淘汰数: ${data.eliminations || 0}`, w / 2, h / 3 + 60)
    ctx.fillText(`最大气球数: ${data.maxBalloons || 0}`, w / 2, h / 3 + 100)
    ctx.fillText(`存活时长: ${Math.floor(data.survivalTime || 0)}秒`, w / 2, h / 3 + 140)

    ctx.font = '18px sans-serif'
    ctx.fillText('点击或按空格再来一局', w / 2, h * 0.75)
  }
}
```

- [ ] **Step 4: 更新 main.js 连接状态机**

```javascript
// src/main.js
import { GameEngine } from './engine/GameEngine.js'
import { Renderer } from './engine/Renderer.js'
import { PhysicsEngine } from './engine/PhysicsEngine.js'
import { MenuState } from './states/MenuState.js'
import { PlayState } from './states/PlayState.js'
import { ResultState } from './states/ResultState.js'
import { PLATFORMS } from './config/entities.js'

const canvas = document.getElementById('game-canvas')
const engine = new GameEngine(canvas)
engine.renderer = new Renderer()
engine.physics = new PhysicsEngine()
engine.physics.setPlatforms(PLATFORMS)

function startGame() {
  const playState = new PlayState()
  playState.engineRef = engine
  playState.renderer = engine.renderer
  playState.showResult = showResult
  engine.setState(playState)
}

function showResult(data) {
  const resultState = new ResultState(data)
  resultState.engineRef = engine
  resultState.restart = showMenu
  engine.setState(resultState)
}

function showMenu() {
  const menuState = new MenuState()
  menuState.engineRef = engine
  menuState.startGame = startGame
  engine.setState(menuState)
}

window.addEventListener('resize', () => engine.handleResize())
engine.handleResize()
showMenu()
engine.start()
```

- [ ] **Step 5: 验证**

Run: `npm run dev`
Expected: 标题画面 → 点击/空格 → 倒计时 3-2-1 → 20 个彩色敌人和玩家从边缘入场 → 自由飞行对战 → 踩踏夺取气球 → 0 气球坠落翻盘 → 闪电/鲸鱼/缩圈淘汰 → 最后存活者胜 → 结算画面 → 再来一局

- [ ] **Step 6: Commit**

```bash
git add src/states/ src/main.js
git commit -m "feat: add state machine (Menu/Play/Result) and full game flow"
```

---

## Phase 8：集成与调优

**里程碑：** 完整可玩游戏，触屏操控正常，性能稳定 60fps。

### Task 8.1：触屏 UI（虚拟摇杆 + 拍打键 + 暂停键）

**Files:**
- Modify: `index.html`（加触屏 UI 元素）
- Modify: `src/states/PlayState.js`（连接 InputManager 到触屏 UI）

- [ ] **Step 1: 在 index.html 加触屏 UI**

在 `<canvas>` 后添加：
```html
<div id="joystick-zone" style="position:fixed;left:0;bottom:0;width:50%;height:40%;z-index:10;"></div>
<button id="btn-flap" style="position:fixed;right:20px;bottom:30px;width:80px;height:80px;border-radius:50%;border:2px solid rgba(255,255,255,0.4);background:rgba(77,166,255,0.2);color:#fff;font-size:24px;font-weight:bold;z-index:10;">A</button>
<button id="btn-pause" style="position:fixed;right:20px;top:20px;width:40px;height:40px;border:none;background:rgba(0,0,0,0.3);color:#fff;font-size:18px;z-index:10;">⏸</button>
```

- [ ] **Step 2: 在 PlayState.enter 中注册触屏元素**

```javascript
// 在 PlayState.enter() 中追加：
const joystickEl = document.getElementById('joystick-zone')
const flapBtn = document.getElementById('btn-flap')
const pauseBtn = document.getElementById('btn-pause')
if (joystickEl) engine.input.setJoystickElement(joystickEl)
if (flapBtn) engine.input.setFlapButtonElement(flapBtn)
if (pauseBtn) {
  this._pauseBtnHandler = () => { this.paused = !this.paused }
  pauseBtn.addEventListener('click', this._pauseBtnHandler)
}
```

- [ ] **Step 3: Commit**

```bash
git add index.html src/states/PlayState.js
git commit -m "feat: add touch screen UI (joystick, flap button, pause)"
```

### Task 8.2：全部测试 + 性能检查

- [ ] **Step 1: 运行所有单元测试**

Run: `npx vitest run`
Expected: 所有测试通过

- [ ] **Step 2: 浏览器性能检查**

Run: `npm run dev`，打开 Chrome DevTools Performance 面板
Expected: 60fps 稳定，无长任务 > 16ms

- [ ] **Step 3: 触屏设备测试**

在手机浏览器打开，验证摇杆和拍打键操作
Expected: 虚拟摇杆响应灵敏，拍打键点击生效，横竖屏切换正常

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test: verify all unit tests pass and performance is stable"
```

### Task 8.3：旧文档与旧代码归档

**Files:**
- Move: `PROJECT-ANALYSIS.md` → `archive/`
- Move: `gameplay-checklist.md` → `archive/`
- Move: `docs/可行性分析报告.md` → `archive/`（基于旧设计，已被本计划和设计规格书替代）

- [ ] **Step 1: 归档旧文档**

```bash
move PROJECT-ANALYSIS.md archive\
move gameplay-checklist.md archive\
move docs\可行性分析报告.md archive\
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "chore: archive v1 docs and feasibility report, implementation plan is the single source of truth"
```

---

## 后续调参（对应规格书第十章）

完成以上 8 个 Phase 后，以下参数需要在真机试玩中逐步调整：

- 物理参数精确值（重力数组、拍打冲量数组、加速度、终速）
- 0 气球静止判定阈值
- 粒子系统并发上限
- AI 各类型精确属性
- 缩圈节奏
- 闪电频率和寿命
- 鲸鱼概率和预警时长
- 气流区分布
- 地图布局
- 音效方案
- 道具系统
- 多人模式预研

这些不影响架构搭建，在可玩游戏跑通后逐步迭代。

---

## 阶段 B：鸿蒙原生迁移（原型验证通过后启动）

当 Web 原型完成核心玩法验证（手感、视觉、操控、性能均可接受）后，进入鸿蒙原生开发阶段。基于本计划的模块可移植性分类：

1. 直接搬运可移植层（config/entities/systems/managers/engine 中的 PhysicsEngine/SpatialGrid/Camera）到 ArkTS 项目
2. 适配需适配层（GameEngine 主循环改 ArkUI 渲染回调、SpriteCache/EntityRenderer 调整 Canvas API 差异）
3. 重写需重写层（InputManager 用 ArkUI 手势 API、BackgroundRenderer/HUDRenderer/ParticleSystem/Renderer/States 用 ArkUI Canvas 重写、main.js+index.html 改为 ArkUI 页面入口）
4. 迁移验证：逐模块移植后跑回归测试，确保玩法手感与 Web 原型一致

阶段 B 的详细实施计划在原型验证通过后另行编写。
