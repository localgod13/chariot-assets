
// src/game/objects/Trap.ts

import { Scene } from 'phaser'

export class Trap extends Phaser.GameObjects.Container {
  declare public body: Phaser.Physics.Arcade.Body
  private sprite: Phaser.GameObjects.Sprite
  private isActive: boolean = true
  private damage: number = 15
  private activationCooldown: number = 1000 // 1 second cooldown between activations
  private lastActivation: number = 0

  constructor(scene: Scene, x: number, y: number) {
    super(scene, x, y)
    
    // Create spike trap sprite with animation
    this.sprite = scene.add.sprite(0, 0, 'spike')
    this.sprite.setOrigin(0.5, 0.5)
    
    // Reduced scale from 2.5 to 1.25 (half the size) - still larger than original 0.8
    const scale = 1.25 // Half of previous 2.5 scale but still substantial
    this.sprite.setScale(scale)
    
    this.add(this.sprite)
    
    // Add to scene and enable physics
    scene.add.existing(this)
    scene.physics.add.existing(this)
    
    // Set physics body size based on scaled sprite
    const bodyWidth = 448 * scale
    const bodyHeight = 32 * scale
    this.body.setSize(bodyWidth, bodyHeight)
    this.body.setOffset(-bodyWidth / 2, -bodyHeight / 2)
    
    // Make trap static (doesn't move)
    this.body.setImmovable(true)
    
    // Set depth to appear above background but below enemies
    this.setDepth(15)
    
    // Create spike animation frames
    this.createAnimations(scene)
    
    // Start in idle state
    this.sprite.play('spike_idle')
    
    console.log(`Spike trap created at (${x}, ${y}) with scale ${scale}`)
  }

  private createAnimations(scene: Scene) {
    // Create idle animation (first frame)
    if (!scene.anims.exists('spike_idle')) {
      scene.anims.create({
        key: 'spike_idle',
        frames: scene.anims.generateFrameNumbers('spike', { start: 0, end: 0 }),
        frameRate: 1,
        repeat: -1
      })
    }
    
    // Create activation animation (all frames)
    if (!scene.anims.exists('spike_activate')) {
      scene.anims.create({
        key: 'spike_activate',
        frames: scene.anims.generateFrameNumbers('spike', { start: 0, end: 13 }),
        frameRate: 20, // Fast activation
        repeat: 0
      })
    }
    
    // Create retract animation (reverse)
    if (!scene.anims.exists('spike_retract')) {
      scene.anims.create({
        key: 'spike_retract',
        frames: scene.anims.generateFrameNumbers('spike', { start: 13, end: 0 }),
        frameRate: 15, // Slightly slower retraction
        repeat: 0
      })
    }
  }

  public activate(): boolean {
    const currentTime = this.scene.time.now
    
    // Check cooldown
    if (currentTime - this.lastActivation < this.activationCooldown) {
      return false
    }
    
    if (!this.isActive) {
      return false
    }
    
    this.lastActivation = currentTime
    
    // Play activation animation
    this.sprite.play('spike_activate')
    
    // After activation animation completes, start retraction
    this.sprite.once('animationcomplete-spike_activate', () => {
      this.scene.time.delayedCall(200, () => { // Brief pause at full extension
        this.sprite.play('spike_retract')
        
        // Return to idle after retraction
        this.sprite.once('animationcomplete-spike_retract', () => {
          this.sprite.play('spike_idle')
        })
      })
    })
    
    return true
  }

  public getDamage(): number {
    return this.damage
  }

  public isOnCooldown(): boolean {
    const currentTime = this.scene.time.now
    return (currentTime - this.lastActivation) < this.activationCooldown
  }

  public setActive(active: boolean): this {
    this.isActive = active
    this.setVisible(active)
    
    if (this.body) {
      this.body.enable = active
    }
    
    return this
  }

  destroy() {
    super.destroy()
  }
}
