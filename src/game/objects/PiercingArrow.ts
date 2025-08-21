
// src/game/objects/PiercingArrow.ts

import { Scene } from 'phaser'

export class PiercingArrow extends Phaser.GameObjects.Container {
  declare public body: Phaser.Physics.Arcade.Body
  private shape: Phaser.GameObjects.Graphics
  public damage: number = 20
  public isPlayerBullet: boolean = true
  private level: number = 1
  private maxPiercing: number = 2
  private piercingCount: number = 0
  private trailPoints: Array<{x: number, y: number}> = []

  constructor(scene: Scene, x: number, y: number, angle: number, level: number = 1) {
    super(scene, x, y)
    this.level = level
    this.damage = 18 + (level * 8)
    this.maxPiercing = 1 + level // Level 1: pierce 2, Level 2: pierce 3, etc.
    
    // Create piercing arrow visual - sharp and elongated
    this.shape = scene.add.graphics()
    this.shape.fillStyle(0x88ff00) // Bright green for piercing arrows
    
    // Draw arrow shape
    this.shape.beginPath()
    this.shape.moveTo(8, 0) // Arrow tip
    this.shape.lineTo(-6, -3) // Top of shaft
    this.shape.lineTo(-4, 0) // Middle of shaft
    this.shape.lineTo(-6, 3) // Bottom of shaft
    this.shape.closePath()
    this.shape.fillPath()
    
    // Add fletching
    this.shape.fillStyle(0xaaff44, 0.8)
    this.shape.fillTriangle(-6, -2, -8, -4, -8, 0)
    this.shape.fillTriangle(-6, 2, -8, 4, -8, 0)
    
    // Add sharp tip highlight
    this.shape.fillStyle(0xffffff, 0.9)
    this.shape.fillTriangle(8, 0, 4, -1, 4, 1)
    
    this.add(this.shape)
    
    // Add to scene and enable physics
    scene.add.existing(this)
    scene.physics.add.existing(this)
    this.body.setSize(16, 6)
    this.body.setOffset(-8, -3)
    
    // Set velocity - fast and straight
    const speed = 650 + (level * 50)
    const velocityX = Math.cos(angle) * speed
    const velocityY = Math.sin(angle) * speed
    this.body.setVelocity(velocityX, velocityY)
    
    // Set rotation to match movement direction
    this.rotation = angle
    
    // Auto-destroy after 4 seconds
    scene.time.delayedCall(4000, () => {
      if (this.active) this.destroy()
    })
    
    // Make sure UI camera ignores this
    const uiCamera = (scene as any).cameras?.cameras[1]
    if (uiCamera) {
      uiCamera.ignore(this)
    }
  }

  public update() {
    if (!this.active) return
    
    // Update trail
    this.updateTrail()
  }

  private updateTrail() {
    // Add current position to trail
    this.trailPoints.push({x: this.x, y: this.y})
    
    // Limit trail length
    const maxTrailLength = 6 + (this.level * 2)
    if (this.trailPoints.length > maxTrailLength) {
      this.trailPoints.shift()
    }
    
    // Draw trail effect on the scene
    if (this.trailPoints.length > 1 && Math.random() < 0.7) {
      const trail = (this.scene as any).add.graphics()
      trail.lineStyle(2, 0x88ff00, 0.4)
      trail.beginPath()
      trail.moveTo(this.trailPoints[0].x, this.trailPoints[0].y)
      
      for (let i = 1; i < this.trailPoints.length; i++) {
        const alpha = i / this.trailPoints.length
        trail.lineStyle(2 * alpha, 0x88ff00, 0.4 * alpha)
        trail.lineTo(this.trailPoints[i].x, this.trailPoints[i].y)
      }
      trail.strokePath()
      trail.setDepth(45)
      
      const uiCamera = (this.scene as any).cameras?.cameras[1]
      if (uiCamera) {
        uiCamera.ignore(trail)
      }
      
      this.scene.time.delayedCall(200, () => {
        if (trail && trail.active) {
          trail.destroy()
        }
      })
    }
  }

  public hitTarget(_target: any) {
    // Piercing arrows don't destroy on hit, they continue through
    this.piercingCount++
    
    // If we've pierced our limit, destroy the arrow
    if (this.piercingCount >= this.maxPiercing) {
      this.destroy()
    }
  }
}
