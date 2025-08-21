
// src/game/objects/Sword.ts

import { Scene } from 'phaser'

export class Sword extends Phaser.GameObjects.Container {
  declare public body: Phaser.Physics.Arcade.Body
  private sprite: Phaser.GameObjects.Image
  private floatingTween: Phaser.Tweens.Tween | null = null
  private glowTween: Phaser.Tweens.Tween | null = null
  public value: number = 5 // Reduced from 15 to 5 XP - similar to small orbs (3) but slightly better

  constructor(scene: Scene, x: number, y: number) {
    super(scene, x, y)
    
    // Create sword sprite
    this.sprite = scene.add.image(0, 0, 'sword')
    
    // Scale down the 1024x1024 sword to a reasonable pickup size - increased for better visibility
    const targetSize = 64 // Increased from 32 to 64 pixels for better visibility
    const scale = targetSize / 1024
    this.sprite.setScale(scale)
    this.sprite.setOrigin(0.5, 0.5)
    
    this.add(this.sprite)
    
    // Add to scene and enable physics
    scene.add.existing(this)
    scene.physics.add.existing(this)
    
    // Set collision body size
    this.body.setSize(targetSize, targetSize)
    this.body.setOffset(-targetSize / 2, -targetSize / 2)
    
    // Set depth to appear in front of center piece but behind enemies
    this.setDepth(25) // Higher than center piece (20) but lower than enemies (50)
    
    // Start animations
    this.startAnimations()
  }

  private startAnimations() {
    // Gentle floating motion
    this.floatingTween = this.scene.tweens.add({
      targets: this,
      y: this.y - 5,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    })
    
    // Gentle rotation
    this.scene.tweens.add({
      targets: this.sprite,
      rotation: Math.PI * 2,
      duration: 4000,
      repeat: -1,
      ease: 'Linear'
    })
    
    // Subtle glow effect
    this.glowTween = this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0.7,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    })
  }

  public collect() {
    // Stop all tweens immediately to prevent memory leaks
    if (this.floatingTween) {
      this.floatingTween.destroy()
      this.floatingTween = null
    }
    if (this.glowTween) {
      this.glowTween.destroy()
      this.glowTween = null
    }
    
    // Create sparkle effect when collected - scaled up for larger sword
    const sparkles = this.scene.add.graphics()
    sparkles.fillStyle(0xffff00) // Golden sparkles
    
    // Create sparkle particles - more particles for larger sword
    for (let i = 0; i < 12; i++) { // Increased from 8 to 12 particles
      const angle = (i / 12) * Math.PI * 2
      const distance = 32 // Increased from 20 to 32 for larger spread
      const x = this.x + Math.cos(angle) * distance
      const y = this.y + Math.sin(angle) * distance
      
      sparkles.fillCircle(x, y, 3) // Increased particle size from 2 to 3
    }
    
    // Animate sparkles
    this.scene.tweens.add({
      targets: sparkles,
      alpha: 0,
      duration: 300,
      onComplete: () => sparkles.destroy()
    })
    
    // Collection animation for the sword
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 200,
      ease: 'Back.easeOut',
      onComplete: () => this.destroy()
    })
  }

  destroy() {
    // Clean up tweens to prevent memory leaks
    if (this.floatingTween) {
      this.floatingTween.destroy()
      this.floatingTween = null
    }
    if (this.glowTween) {
      this.glowTween.destroy()
      this.glowTween = null
    }
    
    super.destroy()
  }
}
