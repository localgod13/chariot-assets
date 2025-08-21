
// src/game/objects/XPOrb.ts

import { Scene } from 'phaser'
import { GAME_CONFIG } from '../config/constants'

export type XPOrbType = 'SMALL' | 'MEDIUM' | 'LARGE' | 'RARE'

export class XPOrb extends Phaser.GameObjects.Container {
  declare public body: Phaser.Physics.Arcade.Body
  private shape: Phaser.GameObjects.Graphics | null = null
  private sprite: Phaser.GameObjects.Image | null = null
  private glow: Phaser.GameObjects.Graphics | null = null
  public value: number
  public orbType: XPOrbType
  private floatingTween: Phaser.Tweens.Tween | null = null
  private glowTween: Phaser.Tweens.Tween | null = null

  constructor(scene: Scene, x: number, y: number, type: XPOrbType) {
    super(scene, x, y)
    this.orbType = type
    
    const orbConfig = GAME_CONFIG.XP_ORBS[type]
    this.value = orbConfig.VALUE
    
    // All orbs now use the armorpile sprite with different sizes but NO color tinting
    this.sprite = scene.add.image(0, 0, 'armorpile')
    
    // Different sizes for different orb types - much larger and more visible
    let targetSize: number
    
    switch (type) {
      case 'SMALL':
        targetSize = 80 // Much larger - was 24
        break
      case 'MEDIUM':
        targetSize = 100 // Much larger - was 32
        break
      case 'LARGE':
        targetSize = 120 // Much larger - was 40
        break
      case 'RARE':
        targetSize = 150 // Much larger - was 48
        break
    }
    
    // Scale the 1024x1024 armorpile to match the target size
    const scale = targetSize / 1024
    this.sprite.setScale(scale)
    this.sprite.setOrigin(0.5, 0.5)
    // Remove all tinting - use original armor pile colors
    
    this.add(this.sprite)
    
    // Create glow effect for larger orbs - but use white/yellow glow instead of colored
    if (type === 'LARGE' || type === 'RARE') {
      this.glow = scene.add.graphics()
      const glowColor = type === 'RARE' ? 0xffff00 : 0xffffff // Yellow for rare, white for large
      this.glow.fillStyle(glowColor, 0.3)
      this.glow.fillCircle(0, 0, targetSize + 8)
      this.add(this.glow)
    }
    
    // Add to scene and enable physics
    scene.add.existing(this)
    scene.physics.add.existing(this)
    
    // Set collision body size
    const bodySize = targetSize * 1.2 // Slightly larger collision area
    this.body.setSize(bodySize, bodySize)
    this.body.setOffset(-bodySize / 2, -bodySize / 2)
    
    // Set depth to appear in front of center piece but behind enemies
    this.setDepth(25) // Higher than center piece (20) but lower than enemies (50)
    
    // Animate rare and large orbs
    if (type === 'RARE' || type === 'LARGE') {
      this.startAnimations()
    }
    
    scene.add.existing(this)
  }

  private startAnimations() {
    // Gentle floating motion (only for rare orbs)
    this.floatingTween = this.scene.tweens.add({
      targets: this,
      y: this.y - 3, // Reduced movement
      duration: 1500, // Slower animation
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    })
    
    // Pulsing glow for rare orbs only
    if (this.glow) {
      this.glowTween = this.scene.tweens.add({
        targets: this.glow,
        alpha: 0.1,
        duration: 1200, // Slower pulse
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      })
    }
  }

  update(_time: number) {
    if (!this.active) return
    // Only update rare orbs to reduce CPU usage
    if (this.orbType === 'RARE') {
      this.rotation += 0.01 // Slower rotation
    }
    
    // Remove pulsing for medium/large orbs to improve performance
    // Only rare orbs get special treatment
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
    
    // Create collection effect for all orbs
    if (this.orbType !== 'SMALL') {
      const particles = this.scene.add.graphics()
      // Use golden sparkles for all armor piles instead of config colors
      particles.fillStyle(0xffd700) // Golden color for all armor pile sparkles
      
      // More particles for larger orbs
      const particleCount = this.orbType === 'RARE' ? 8 : 6
      for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2
        const distance = 20 + (this.orbType === 'RARE' ? 10 : 0)
        const x = this.x + Math.cos(angle) * distance
        const y = this.y + Math.sin(angle) * distance
        
        particles.fillCircle(x, y, 2)
      }
      
      this.scene.tweens.add({
        targets: particles,
        alpha: 0,
        duration: 300,
        onComplete: () => particles.destroy()
      })
    }
    
    // Collection animation
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.3,
      scaleY: 1.3,
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
    
    // Clean up sprite reference
    if (this.sprite) {
      this.sprite = null
    }
    
    // Clean up shape reference
    if (this.shape) {
      this.shape = null
    }
    
    super.destroy()
  }
}

export function getRandomXPOrbType(): XPOrbType {
  const rand = Math.random()
  const orbs = GAME_CONFIG.XP_ORBS
  
  if (rand < orbs.RARE.PROBABILITY) return 'RARE'
  if (rand < orbs.RARE.PROBABILITY + orbs.LARGE.PROBABILITY) return 'LARGE'
  if (rand < orbs.RARE.PROBABILITY + orbs.LARGE.PROBABILITY + orbs.MEDIUM.PROBABILITY) return 'MEDIUM'
  return 'SMALL'
}
