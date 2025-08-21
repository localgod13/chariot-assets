
// src/game/objects/HomingMissile.ts

import { Scene } from 'phaser'

export class HomingMissile extends Phaser.GameObjects.Container {
  declare public body: Phaser.Physics.Arcade.Body
  private missileSprite: Phaser.GameObjects.Image
  private trail: Phaser.GameObjects.Graphics
  public damage: number = 30
  public isPlayerBullet: boolean = true
  private targetEnemy: any = null
  private homingStrength: number = 0.3
  private level: number = 1
  private trailPoints: Array<{x: number, y: number}> = []

  constructor(scene: Scene, x: number, y: number, angle: number, level: number = 1) {
    super(scene, x, y)
    this.level = level
    this.homingStrength = 0.2 + (level * 0.1) // Progressive homing strength
    this.damage = 25 + (level * 10) // Progressive damage
    
    // Create missile visual using the provided sprite
    this.missileSprite = scene.add.image(0, 0, 'missile')
    this.missileSprite.setScale(0.05) // Reduced from 0.08 to 0.05 for smaller size
    this.missileSprite.setOrigin(0.5, 0.5)
    this.add(this.missileSprite)
    
    // Create trail graphics
    this.trail = scene.add.graphics()
    this.trail.setDepth(45) // Below missile but above background
    
    // Add to scene and enable physics
    scene.add.existing(this)
    scene.physics.add.existing(this)
    this.body.setSize(32, 16) // Increased from 24x12 to 32x16 to match larger sprite
    
    // Set initial velocity
    const speed = 400 + (level * 50) // Progressive speed
    const velocityX = Math.cos(angle) * speed
    const velocityY = Math.sin(angle) * speed
    this.body.setVelocity(velocityX, velocityY)
    
    // Set rotation to match movement direction
    this.rotation = angle
    
    // Auto-destroy after 4 seconds
    scene.time.delayedCall(4000, () => {
      if (this.active) this.destroy()
    })
    
    // Make sure UI camera ignores this missile
    const uiCamera = (scene as any).cameras?.cameras[1]
    if (uiCamera) {
      uiCamera.ignore([this, this.trail])
    }
  }

  public update() {
    if (!this.active) return
    
    // Update trail
    this.updateTrail()
    
    // Find target if we don't have one
    if (!this.targetEnemy || !this.targetEnemy.active) {
      this.targetEnemy = this.findNearestEnemy()
    }
    
    // Home towards target
    if (this.targetEnemy && this.targetEnemy.active) {
      const targetAngle = Phaser.Math.Angle.Between(this.x, this.y, this.targetEnemy.x, this.targetEnemy.y)
      const currentAngle = Math.atan2(this.body.velocity.y, this.body.velocity.x)
      
      // Smoothly adjust angle towards target
      const angleDiff = Phaser.Math.Angle.Wrap(targetAngle - currentAngle)
      const adjustedAngle = currentAngle + (angleDiff * this.homingStrength * 0.2)
      
      // Update velocity and rotation
      const speed = Math.sqrt(this.body.velocity.x ** 2 + this.body.velocity.y ** 2)
      this.body.setVelocity(
        Math.cos(adjustedAngle) * speed,
        Math.sin(adjustedAngle) * speed
      )
      this.rotation = adjustedAngle
    }
  }

  private updateTrail() {
    // Add current position to trail
    this.trailPoints.push({x: this.x, y: this.y})
    
    // Limit trail length
    const maxTrailLength = 8 + (this.level * 2)
    if (this.trailPoints.length > maxTrailLength) {
      this.trailPoints.shift()
    }
    
    // Draw trail
    this.trail.clear()
    if (this.trailPoints.length > 1) {
      this.trail.lineStyle(3, 0x00aaff, 0.6)
      this.trail.beginPath()
      this.trail.moveTo(this.trailPoints[0].x, this.trailPoints[0].y)
      
      for (let i = 1; i < this.trailPoints.length; i++) {
        const alpha = i / this.trailPoints.length
        this.trail.lineStyle(3 * alpha, 0x00aaff, 0.6 * alpha)
        this.trail.lineTo(this.trailPoints[i].x, this.trailPoints[i].y)
      }
      this.trail.strokePath()
    }
  }

  private findNearestEnemy(): any {
    const scene = this.scene as any
    if (!scene || !scene.enemies) return null
    
    let nearest = null
    let minDistance = Infinity
    const maxRange = 500 + (this.level * 100) // Progressive range
    
    scene.enemies.children.entries.forEach((enemy: any) => {
      const distance = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y)
      if (distance < minDistance && distance < maxRange) {
        minDistance = distance
        nearest = enemy
      }
    })
    
    return nearest
  }

  public hitTarget(_target: any) {
    if (this.active) this.destroy()
  }

  destroy() {
    if (this.trail && this.trail.active) {
      this.trail.destroy()
    }
    super.destroy()
  }
}
