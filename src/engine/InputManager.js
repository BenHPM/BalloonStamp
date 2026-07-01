// 输入管理器 — 键盘 + 触摸 + 手柄统一抽象

export class InputManager {
  constructor(canvas) {
    this.canvas = canvas
    this.state = {
      left: false,
      right: false,
      flap: false,
      flapJustPressed: false,
    }
    this._prevFlap = false
    this._keys = {}
    this._touchState = { left: false, right: false, flap: false } // 触摸持续状态
    this._gamepadIndex = null

    this._initKeyboard()
    this._initGamepad()
  }

  // 触摸按钮注册（由 UI 层调用）
  registerTouchButton(id, element) {
    const press = () => {
      this._touchState[id] = true
    }
    const release = () => {
      this._touchState[id] = false
    }

    element.addEventListener('touchstart', (e) => {
      e.preventDefault()
      press()
    }, { passive: false })
    element.addEventListener('touchend', (e) => {
      e.preventDefault()
      release()
    }, { passive: false })
    element.addEventListener('touchcancel', release)
    // 鼠标后备
    element.addEventListener('mousedown', (e) => {
      e.preventDefault()
      press()
    })
    element.addEventListener('mouseup', release)
    element.addEventListener('mouseleave', release)
  }

  _initKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyZ', 'KeyX', 'KeyA', 'KeyS', 'KeyW', 'KeyD', 'KeyR'].includes(e.code)) {
        e.preventDefault()
      }
      this._keys[e.code] = true
    })
    window.addEventListener('keyup', (e) => {
      this._keys[e.code] = false
    })
  }

  _initGamepad() {
    window.addEventListener('gamepadconnected', (e) => {
      this._gamepadIndex = e.gamepad.index
    })
    window.addEventListener('gamepaddisconnected', () => {
      this._gamepadIndex = null
    })
  }

  _pollGamepad() {
    if (this._gamepadIndex === null) return null
    const gp = navigator.getGamepads?.()[this._gamepadIndex]
    if (!gp) return null

    const result = { left: false, right: false, flap: false }
    if (gp.buttons[14]?.pressed || gp.axes[0] < -0.5) result.left = true
    if (gp.buttons[15]?.pressed || gp.axes[0] > 0.5) result.right = true
    if (gp.buttons[0]?.pressed || gp.buttons[1]?.pressed || gp.buttons[2]?.pressed || gp.buttons[3]?.pressed) {
      result.flap = true
    }
    return result
  }

  // 每帧调用 — 合并所有输入源
  update() {
    // 键盘输入
    const keyLeft = this._keys['ArrowLeft'] || this._keys['KeyA']
    const keyRight = this._keys['ArrowRight'] || this._keys['KeyD']
    const keyFlap = this._keys['Space'] || this._keys['ArrowUp'] || this._keys['KeyZ'] || this._keys['KeyW']

    // 手柄输入
    const gp = this._pollGamepad()

    // 合并：触摸 + 键盘 + 手柄（任一按下即为 true）
    this.state.left = this._touchState.left || keyLeft || (gp?.left ?? false)
    this.state.right = this._touchState.right || keyRight || (gp?.right ?? false)
    this.state.flap = this._touchState.flap || keyFlap || (gp?.flap ?? false)

    // 检测 flap 刚按下
    this.state.flapJustPressed = this.state.flap && !this._prevFlap
    this._prevFlap = this.state.flap
  }
}
