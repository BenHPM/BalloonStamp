// 平台实体

export class Platform {
  constructor(config) {
    this.x = config.x
    this.y = config.y
    this.w = config.w
    this.h = config.h
    this.isGround = config.isGround || false
  }
}
