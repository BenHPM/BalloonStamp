// src/engine/InputManager.js
export class InputManager {
  constructor(canvas) {
    this.canvas = canvas
    this.state = { left: false, right: false, flap: false, flapJustPressed: false, moveX: 0, pause: false }
    this._prevFlap = false
    this._keys = {}
    this._touchJoystick = { active: false, startX: 0, startY: 0, dx: 0, dy: 0 }
    this._touchFlap = false
    this._gamepadIndex = null
    this._joystickEl = null
    this._flapBtnEl = null
    this._joystickCleanup = null
    this._flapCleanup = null
    this._keyboardCleanup = null
    this._gamepadCleanup = null

    this._initKeyboard()
    this._initGamepad()
  }

  // 注册触屏 UI 元素（由 HTML 层创建）
  setJoystickElement(el) {
    this._cleanupJoystick()
    this._joystickEl = el
    this._initJoystick(el)
  }
  setFlapButtonElement(el) {
    this._cleanupFlap()
    this._flapBtnEl = el
    this._initFlapButton(el)
  }

  cleanup() {
    // 仅清理每局可重绑的触屏 UI 元素监听器（joystick / flap 按钮由 PlayState 注入），
    // 保留全局键盘/手柄监听，因为 InputManager 是跨状态单例，cleanup 在 state.exit 调用。
    // 同时清空按键状态，避免 state 切换时残留按键被新状态读入。
    this._cleanupJoystick()
    this._cleanupFlap()
    this._keys = {}
    this._prevFlap = false
    this._touchJoystick.active = false
    this._touchJoystick.dx = 0
    this._touchJoystick.dy = 0
    this._touchFlap = false
  }

  // 彻底销毁（只在 engine 卸载时调用），连全局键盘/手柄监听一并移除。
  destroy() {
    this._cleanupJoystick()
    this._cleanupFlap()
    this._cleanupKeyboard()
    this._cleanupGamepad()
  }

  _cleanupJoystick() {
    if (this._joystickCleanup) { this._joystickCleanup(); this._joystickCleanup = null }
  }
  _cleanupFlap() {
    if (this._flapCleanup) { this._flapCleanup(); this._flapCleanup = null }
  }
  _cleanupKeyboard() {
    if (this._keyboardCleanup) { this._keyboardCleanup(); this._keyboardCleanup = null }
  }
  _cleanupGamepad() {
    if (this._gamepadCleanup) { this._gamepadCleanup(); this._gamepadCleanup = null }
  }

  _initKeyboard() {
    this._onKeyDown = (e) => {
      if (['ArrowLeft','ArrowRight','ArrowUp','Space','KeyW','KeyA','KeyS','KeyD','Escape'].includes(e.code))
        e.preventDefault()
      this._keys[e.code] = true
    }
    this._onKeyUp = (e) => { this._keys[e.code] = false }
    window.addEventListener('keydown', this._onKeyDown)
    window.addEventListener('keyup', this._onKeyUp)
    this._keyboardCleanup = () => {
      window.removeEventListener('keydown', this._onKeyDown)
      window.removeEventListener('keyup', this._onKeyUp)
    }
  }

  _initGamepad() {
    this._onGamepadConnected = (e) => { this._gamepadIndex = e.gamepad.index }
    this._onGamepadDisconnected = () => { this._gamepadIndex = null }
    window.addEventListener('gamepadconnected', this._onGamepadConnected)
    window.addEventListener('gamepaddisconnected', this._onGamepadDisconnected)
    this._gamepadCleanup = () => {
      window.removeEventListener('gamepadconnected', this._onGamepadConnected)
      window.removeEventListener('gamepaddisconnected', this._onGamepadDisconnected)
    }
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
    const onMouseMove = (e) => { if (this._touchJoystick.active) move(e) }
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
    el.addEventListener('mousemove', onMouseMove)
    el.addEventListener('mouseup', end)
    el.addEventListener('mouseleave', end)

    this._joystickCleanup = () => {
      el.removeEventListener('touchstart', start)
      el.removeEventListener('touchmove', move)
      el.removeEventListener('touchend', end)
      el.removeEventListener('mousedown', start)
      el.removeEventListener('mousemove', onMouseMove)
      el.removeEventListener('mouseup', end)
      el.removeEventListener('mouseleave', end)
    }
  }

  _initFlapButton(el) {
    const press = (e) => { e.preventDefault(); this._touchFlap = true }
    const release = (e) => { e.preventDefault(); this._touchFlap = false }
    el.addEventListener('touchstart', press, { passive: false })
    el.addEventListener('touchend', release, { passive: false })
    el.addEventListener('mousedown', press)
    el.addEventListener('mouseup', release)
    el.addEventListener('mouseleave', release)

    this._flapCleanup = () => {
      el.removeEventListener('touchstart', press)
      el.removeEventListener('touchend', release)
      el.removeEventListener('mousedown', press)
      el.removeEventListener('mouseup', release)
      el.removeEventListener('mouseleave', release)
    }
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
