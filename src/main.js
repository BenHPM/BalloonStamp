// src/main.js
import { GameEngine } from './engine/GameEngine.js'
import { Renderer } from './engine/Renderer.js'
import { PhysicsEngine } from './engine/PhysicsEngine.js'
import { AssetLoader } from './engine/AssetLoader.js'
import { MenuState } from './states/MenuState.js'
import { PlayState } from './states/PlayState.js'
import { ResultState } from './states/ResultState.js'
import { PLATFORMS } from './config/entities.js'

const canvas = document.getElementById('game-canvas')
const engine = new GameEngine(canvas)
const assetLoader = new AssetLoader()
engine.renderer = new Renderer(assetLoader)
engine.physics = new PhysicsEngine()
engine.physics.setPlatforms(PLATFORMS)

// 预加载精灵资源（异步，不阻塞启动）
assetLoader.loadAll([
  '/assets/sky/Skyboxes/skybox-day.png',
  '/assets/animals/PNG/Round/panda.png',
  '/assets/animals/PNG/Round/sloth.png',
  '/assets/animals/PNG/Round/chick.png',
  '/assets/animals/PNG/Round/gorilla.png',
  '/assets/animals/PNG/Round/rhino.png',
  '/assets/cloud.png',
  '/assets/particles/PNG (Transparent)/circle_01.png',
  '/assets/particles/PNG (Transparent)/circle_02.png',
  '/assets/particles/PNG (Transparent)/light_01.png',
  '/assets/particles/PNG (Transparent)/spark_01.png',
  '/assets/particles/PNG (Transparent)/star_01.png',
]).then(() => engine.renderer.loadAssets()).catch(() => {})

function startGame() {
  const playState = new PlayState()
  playState.engineRef = engine
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
