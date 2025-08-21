
// src/game/objects/Heart.ts

import { Scene } from 'phaser'

export class Heart extends Phaser.GameObjects.Container {
  declare public body: Phaser.Physics.Arcade.Body
  private sprite: Phaser.GameObjects.Image
  private floatingTween: Phaser.Tweens.Tween | null = null
  private glowTween: Phaser.Tweens.Tween | null = null
  private pulseTween: Phaser.Tweens.Tween | null = null
  public healAmount: number = 25 // 25% of max health

  constructor(scene: Scene, x: number, y: number) {
    super(scene, x, y)
    
    // Create heart sprite
    this.sprite = scene.add.image(0, 0, 'heart')
    
    // Scale down the 1024x1024 heart to a reasonable pickup size
    const targetSize = 48 // Slightly smaller than swords/maces for distinction
    const scale = targetSize / 1024
    this.sprite.setScale(scale)
    this.sprite.setOrigin(0.5, 0.5)
    
    this.add(this.sprite)
    
    // Add to scene and enable physics
    scene.add.existing(this)
    scene.physics.add.existing(this)
    
    // Set collision body size - slightly larger for easier pickup
    const bodySize = targetSize * 1.2
    this.body.setSize(bodySize, bodySize)
    this.body.setOffset(-bodySize / 2, -bodySize / 2)
    
    // Set depth to appear in front of center piece and other pickups
    this.setDepth(30) // Higher than center piece (20) and other pickups (25) to make hearts more visible
    
    // Start animations
    this.startAnimations()
  }

  private startAnimations() {
    // Gentle floating motion
    this.floatingTween = this.scene.tweens.add({
      targets: this,
      y: this.y - 8, // Slightly more movement than other pickups
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    })
    
    // Gentle rotation
    this.scene.tweens.add({
      targets: this.sprite,
      rotation: Math.PI * 2,
      duration: 5000, // Slower rotation for hearts
      repeat: -1,
      ease: 'Linear'
    })
    
    // Pulsing glow effect - hearts should be more noticeable
    this.glowTween = this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0.6,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    })
    
    // Additional pulsing scale effect for hearts
    this.pulseTween = this.scene.tweens.add({
      targets: this,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 1200,
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
    if (this.pulseTween) {
      this.pulseTween.destroy()
      this.pulseTween = null
    }
    
    // CRITICAL: Store scene reference before destroying the heart
    const storedScene = this.scene
    
    // Get the health bar position (top-left corner where UI is)
    const healthBarX = 80 // Approximate center of health bar
    const healthBarY = 106 // Health bar Y position
    
    // Create a copy of the heart sprite for the animation
    const heartCopy = storedScene.add.image(this.x, this.y, 'heart')
    const currentScale = 48 / 1024 // Current heart scale
    heartCopy.setScale(currentScale)
    heartCopy.setOrigin(0.5, 0.5)
    heartCopy.setDepth(2000) // Very high depth to appear above everything
    heartCopy.setScrollFactor(0) // Don't scroll with camera
    
    // Get the camera to calculate screen position manually
    const camera = storedScene.cameras.main
    // Calculate screen position manually using camera properties
    const screenX = (this.x - camera.scrollX) * camera.zoom
    const screenY = (this.y - camera.scrollY) * camera.zoom
    heartCopy.setPosition(screenX, screenY)
    
    // Make sure UI camera ignores the heart copy
    const uiCamera = (storedScene as any).cameras?.cameras[1]
    if (uiCamera) {
      (storedScene as any).cameras.main.ignore(heartCopy)
    }
    
    // Get player reference to calculate healing amount
    const gameScene = storedScene as any
    const player = gameScene.player
    const healAmount = Math.floor(player.maxHealth * 0.25)
    const startingHealth = player.health
    const targetHealth = Math.min(player.maxHealth, player.health + healAmount)
    
    // Destroy the original heart immediately BEFORE starting animation
    this.destroy()
    
    // Animate heart traveling to health bar using stored scene reference
    storedScene.tweens.add({
      targets: heartCopy,
      x: healthBarX,
      y: healthBarY,
      duration: 800,
      ease: 'Power2.easeOut',
      onComplete: () => {
        // Start the healing animation once heart reaches health bar
        this.animateHealing(heartCopy, player, startingHealth, targetHealth, healAmount, storedScene, healthBarX, healthBarY)
      }
    })
  }

  private animateHealing(heartSprite: Phaser.GameObjects.Image, player: any, startHealth: number, targetHealth: number, healAmount: number, storedScene: Phaser.Scene, healthBarX: number, healthBarY: number) {
    const healingDuration = 2000 // Increased to 2 seconds for much better visibility
    
    // Safety check for scene and scene.time
    if (!storedScene || !storedScene.time) {
      console.warn('Scene or scene.time is undefined, skipping healing animation')
      // Apply healing immediately and clean up
      player.health = targetHealth
      if (heartSprite && heartSprite.active) {
        heartSprite.destroy()
      }
      console.log(`Player healed for ${healAmount} HP (${startHealth} -> ${player.health}/${player.maxHealth})`)
      return
    }
    
    // Store the initial scale for reference
    const initialScale = 48 / 1024 // Current heart scale
    
    // Create a tween that handles both health increase and heart shrinking
    storedScene.tweens.add({
      targets: { progress: 0 },
      progress: 1,
      duration: healingDuration,
      ease: 'Power2.easeOut',
      onUpdate: (tween) => {
        const progress = tween.getValue()
        
        // Add null check for progress
        if (progress === null || progress === undefined) return
        
        // FIXED: Much more gradual health increase
        const currentHealth = startHealth + (healAmount * progress)
        player.health = Math.min(player.maxHealth, currentHealth)
        
        // FIXED: Much more visible shrinking effect - heart stays large much longer
        if (heartSprite && heartSprite.active) {
          // Scale from 100% down to only 70% for most of the animation, then quickly to 50% at the end
          let currentScale
          if (progress < 0.8) {
            // For first 80% of animation, only shrink to 85% size
            currentScale = initialScale * (1 - progress * 0.15) // Only 15% shrinkage
          } else {
            // For last 20% of animation, shrink from 85% to 50%
            const finalProgress = (progress - 0.8) / 0.2 // 0 to 1 for the final 20%
            currentScale = initialScale * (0.85 - finalProgress * 0.35) // From 85% to 50%
          }
          heartSprite.setScale(currentScale)
          
          // Keep alpha very high so heart stays clearly visible
          const glowAlpha = 0.9 + (Math.sin(progress * Math.PI * 6) * 0.1) // Slower pulsing, very high base alpha
          heartSprite.setAlpha(Math.max(0.8, glowAlpha)) // Never go below 80% alpha
          
          // Much slower rotation for better visibility
          heartSprite.setRotation(progress * Math.PI * 1) // Reduced rotation speed even more
          
          // Very subtle color tint that keeps the heart clearly red
          const tintIntensity = progress * 0.2 // Much reduced intensity
          const greenTint = Math.floor(255 * (1 - tintIntensity * 0.3)) // Keep much more green
          const redTint = 255 // Keep red at full
          const blueTint = Math.floor(255 * (1 - tintIntensity * 0.3)) // Keep much more blue
          const tintColor = (redTint << 16) | (greenTint << 8) | blueTint
          heartSprite.setTint(tintColor)
          
          // Add flowing blood trail from heart to health bar
          if (progress > 0.1 && Math.random() < 0.4) { // Start after 10% progress, 40% chance each frame
            const bloodTrail = storedScene.add.graphics()
            
            // Calculate the health bar dimensions and current fill
            const healthBarWidth = 150 // Health bar width from UIManager
            const healthBarHeight = 12 // Health bar height from UIManager
            const healthBarStartX = healthBarX - (healthBarWidth / 2) // Left edge of health bar
            const currentHealthPercent = player.health / player.maxHealth
            const healthBarFillX = healthBarStartX + (healthBarWidth * currentHealthPercent) // Current end of health bar fill
            
            // Draw thick blood stream that matches health bar thickness
            const streamAlpha = 0.6 * (1 - progress * 0.3) // Fade as healing completes
            const streamThickness = healthBarHeight - 1 // Make it slightly thinner than health bar (11px instead of 14px)
            
            bloodTrail.lineStyle(streamThickness, 0x8B0000, streamAlpha) // Dark red blood, thick as health bar
            bloodTrail.beginPath()
            bloodTrail.moveTo(heartSprite.x, heartSprite.y) // Start from heart
            bloodTrail.lineTo(healthBarFillX, healthBarY + 1) // Straight line to health bar fill end, slightly lower
            bloodTrail.strokePath()
            
            // Add blood drips falling from the stream
            const numDrips = 3 + Math.floor(Math.random() * 3) // 3-5 drips
            for (let i = 0; i < numDrips; i++) {
              // Position drips along the blood stream
              const dripProgress = 0.3 + (Math.random() * 0.4) // Drips appear 30%-70% along the stream
              const dripX = heartSprite.x + (healthBarFillX - heartSprite.x) * dripProgress
              const dripY = heartSprite.y + ((healthBarY + 1) - heartSprite.y) * dripProgress // Align with adjusted stream endpoint
              
              // Create falling drip
              const dripSize = 2 + Math.random() * 2 // Random drip size
              const dripFallDistance = 15 + Math.random() * 10 // How far the drip falls
              
              // Draw the drip
              bloodTrail.fillStyle(0x660000, streamAlpha * 0.9) // Darker red for drips
              bloodTrail.fillCircle(dripX, dripY + Math.random() * dripFallDistance, dripSize)
              
              // Add small trail behind the drip
              if (Math.random() < 0.7) {
                bloodTrail.lineStyle(1, 0x660000, streamAlpha * 0.6)
                bloodTrail.beginPath()
                bloodTrail.moveTo(dripX, dripY)
                bloodTrail.lineTo(dripX + (Math.random() - 0.5) * 2, dripY + dripFallDistance * 0.5)
                bloodTrail.strokePath()
              }
            }
            
            // Add a few small droplets near the end point (where blood meets health bar)
            const numDroplets = 2 + Math.floor(Math.random() * 2) // 2-3 droplets
            for (let i = 0; i < numDroplets; i++) {
              const dropletX = healthBarFillX + (Math.random() - 0.5) * 10 // Near the fill end
              const dropletY = (healthBarY + 1) + (Math.random() - 0.5) * 8 // Centered around adjusted health bar position
              const dropletSize = 1 + Math.random() * 1.5
              
              bloodTrail.fillStyle(0x660000, streamAlpha * 0.8) // Darker red droplets
              bloodTrail.fillCircle(dropletX, dropletY, dropletSize)
            }
            
            bloodTrail.setDepth(1999) // Just below heart
            bloodTrail.setScrollFactor(0) // Don't scroll with camera
            
            // Make sure UI camera ignores the blood trail
            const uiCamera = (storedScene as any).cameras?.cameras[1]
            if (uiCamera) {
              (storedScene as any).cameras.main.ignore(bloodTrail)
            }
            
            // Animate the blood trail fading out quickly
            storedScene.tweens.add({
              targets: bloodTrail,
              alpha: 0,
              duration: 300 + Math.random() * 200, // Vary fade duration
              ease: 'Power2.easeOut',
              onComplete: () => {
                if (bloodTrail && bloodTrail.active) {
                  bloodTrail.destroy()
                }
              }
            })
          }
        }
      },
      onComplete: () => {
        // Ensure final health is set correctly
        player.health = targetHealth
        
        // Wait a bit longer before destroying the heart to let the blood effect finish
        storedScene.time.delayedCall(500, () => {
          if (heartSprite && heartSprite.active) {
            heartSprite.destroy()
          }
        })
        
        console.log(`Player healed for ${healAmount} HP (${startHealth} -> ${player.health}/${player.maxHealth})`)
      }
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
    if (this.pulseTween) {
      this.pulseTween.destroy()
      this.pulseTween = null
    }
    
    super.destroy()
  }
}
