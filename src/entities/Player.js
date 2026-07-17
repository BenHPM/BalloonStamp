// src/entities/Player.js
import { PHYS } from '../config/physics.js'
import { PLAYER_CONFIG } from '../config/entities.js'
import { BalloonEntity } from './BalloonEntity.js'
import { EntityState } from './EntityState.js'

export class Player extends BalloonEntity {
  constructor() {
    super(PHYS.initialBalloons)
    this.isPlayer = true
    Object.assign(this, PLAYER_CONFIG)
    this.eliminations = 0
    this.maxBalloonsAchieved = this.balloons
  }

  get scale() {
    const extra = Math.max(0, this.balloons - PHYS.initialBalloons)
    return 1 + extra * PHYS.sizePerBalloon
  }

  gainBalloon() {
    if (this.balloons < this.maxBalloons) {
      this.balloons++
      if (this.balloons > this.maxBalloonsAchieved) this.maxBalloonsAchieved = this.balloons
      this._updateState()
    }
  }
}
