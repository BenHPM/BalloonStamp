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
