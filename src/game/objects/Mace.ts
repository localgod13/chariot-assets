
// src/game/objects/Mace.ts

import { Scene } from 'phaser'

export class Mace extends Phaser.GameObjects.Container {
  declare public body: Phaser.Physics.Arcade.Body
  private sprite: Phaser.GameObjects.Image
  private floatingTween: Phaser.Tweens.Tween | null = null
  private glowTween: Phaser.Tweens.Tween | null = null
  public value: number = 8 // Reduced from 25 to 8 XP - same as medium orbs

  constructor(scene: Scene, x: number, y: number) {
    super(scene, x, y)
    
    // Create mace sprite
    this.sprite = scene.add.image(0, 0, 'mace')
    
    // Scale down the 1024x1024 mace to a reasonable pickup size
    const targetSize = 64 // Same size as sword for consistency
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
    
    // Set depth to appear behind enemies
    this.setDepth(10) // Same as XP orbs - behind enemies
    
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
    
    // Create sparkle effect when collected - red/orange sparkles for mace
    const sparkles = this.scene.add.graphics()
    sparkles.fillStyle(0xff4400) // Red-orange sparkles
    
    // Create sparkle particles
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2
      const distance = 32
      const x = this.x + Math.cos(angle) * distance
      const y = this.y + Math.sin(angle) * distance
      
      sparkles.fillCircle(x, y, 3)
    }
    
    // Animate sparkles
    this.scene.tweens.add({
      targets: sparkles,
      alpha: 0,
      duration: 300,
      onComplete: () => sparkles.destroy()
    })
    
    // Collection animation for the mace
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
