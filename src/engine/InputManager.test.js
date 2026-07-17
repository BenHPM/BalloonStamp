// src/engine/InputManager.test.js
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { InputManager } from './InputManager.js'

/**
 * InputManager 直接绑 window 事件，在 jsdom-less 环境下用简易 EventTarget mock 模拟。
 * 只验证关键契约：cleanup() 之后 keydown 仍能写入 state（单例跨状态，cleanup 不应破坏全局监听）。
 */
function makeWindowMock() {
  const listeners = new Map()
  return {
    addEventListener: (type, fn) => { (listeners.get(type) || listeners.set(type, []).get(type)).push(fn) },
    removeEventListener: (type, fn) => {
      const arr = listeners.get(type)
      if (!arr) return
      const idx = arr.indexOf(fn)
      if (idx >= 0) arr.splice(idx, 1)
    },
    dispatch: (type, ev) => { (listeners.get(type) || []).forEach(fn => fn(ev)) },
    _listeners: listeners,
    // keydown handler 会调用 preventDefault
    preventDefault: () => {},
  }
}

describe('InputManager', () => {
  let win

  beforeEach(() => {
    win = makeWindowMock()
    globalThis.window = win
    // navigator 在某些 node 版本是只读 getter；优先 defineProperty
    try {
      Object.defineProperty(globalThis, 'navigator', { value: { getGamepads: () => [] }, configurable: true })
    } catch {
      // 忽略只读场景；InputManager 不依赖 navigator 存在
    }
  })

  afterEach(() => {
    delete globalThis.window
  })

  it('keydown sets state (keyboard works)', () => {
    const im = new InputManager({})
    win.dispatch('keydown', { code: 'ArrowLeft', preventDefault: () => {} })
    im.update()
    expect(im.state.left).toBe(true)
  })

  it('cleanup() preserves global keydown listener (state.exit 后下一局仍可按键)', () => {
    const im = new InputManager({})
    im.cleanup()
    expect(() => win.dispatch('keydown', { code: 'Space', preventDefault: () => {} })).not.toThrow()
    im.update()
    expect(im.state.flap).toBe(true)
  })

  it('cleanup() clears key state (state 切换后不残留按键)', () => {
    const im = new InputManager({})
    win.dispatch('keydown', { code: 'ArrowLeft', preventDefault: () => {} })
    im.update()
    expect(im.state.left).toBe(true)
    im.cleanup()
    // cleanup 后清掉按键状态；再次 update 不应再读到 ArrowLeft
    im.update()
    expect(im._keys).toEqual({})
    expect(im.state.left).toBe(false)
    expect(im.state.flap).toBe(false)
    expect(im._prevFlap).toBe(false)
  })
})
