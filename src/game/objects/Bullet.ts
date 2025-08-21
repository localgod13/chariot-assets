
// src/game/objects/Bullet.ts

import { Scene } from 'phaser'
import { GAME_CONFIG } from '../config/constants'

export class Bullet extends Phaser.GameObjects.Container {
  declare public body: Phaser.Physics.Arcade.Body
  private shape: Phaser.GameObjects.Graphics
  public damage: number = GAME_CONFIG.BULLET.DAMAGE
  public isPlayerBullet: boolean
  public piercing: boolean = false
  public piercingCount: number = 0 // Track how many enemies pierced
  public maxPiercing: number = 1 // Default piercing limit
  public explosive: boolean = false
  public explosionRadius: number = 40 // Default explosion radius
  public ricochet: boolean = false
  public chainLightning: boolean = false
  public chainCount: number = 1 // How many enemies to chain to
  public homing: boolean = false
  public homingStrength: number = 0 // 0-1, how strongly it tracks
  private hitEnemies: Set<any> = new Set()
  private targetEnemy: any = null
  private homingUpdateTimer: number = 0
  public ricochetCount: number = 0 // Track how many enemies we've bounced between
  public maxRicochets: number = 1 // Maximum number of ricochets allowed

  constructor(scene: Scene, x: number, y: number, angle: number, isPlayerBullet: boolean = true) {
    super(scene, x, y)
    this.isPlayerBullet = isPlayerBullet
    
    // Validate position parameters
    if (isNaN(x) || isNaN(y) || isNaN(angle)) {
      console.warn('Bullet created with invalid parameters:', { x, y, angle })
      // Set to safe defaults if invalid
      this.x = 0
      this.y = 0
      angle = 0
    }
    
    // Create bullet visual - use canonball image for player bullets, graphics for enemy bullets
    if (isPlayerBullet) {
      // Use canonball image for player bullets
      const canonballSprite = scene.add.image(0, 0, 'canonball')
      canonballSprite.setScale(0.03) // Reduced from 0.04 to 0.03 for smaller size
      canonballSprite.setOrigin(0.5, 0.5)
      this.add(canonballSprite)
    } else {
      // Keep graphics shape for enemy bullets
      this.shape = scene.add.graphics()
      const color = GAME_CONFIG.BULLET.ENEMY_COLOR
      this.shape.fillStyle(color)
      this.shape.fillCircle(0, 0, GAME_CONFIG.BULLET.SIZE)
      this.add(this.shape)
    }
    
    // Add to scene and enable physics
    scene.add.existing(this)
    scene.physics.add.existing(this)
    this.body.setSize(GAME_CONFIG.BULLET.SIZE * 2, GAME_CONFIG.BULLET.SIZE * 2)
    
    // Set velocity based on angle - validate angle first
    if (!isNaN(angle)) {
      const velocityX = Math.cos(angle) * GAME_CONFIG.BULLET.SPEED
      const velocityY = Math.sin(angle) * GAME_CONFIG.BULLET.SPEED
      this.body.setVelocity(velocityX, velocityY)
    } else {
      // If angle is invalid, set zero velocity
      this.body.setVelocity(0, 0)
    }
    
    // Auto-destroy after 3 seconds
    scene.time.delayedCall(3000, () => {
      if (this.active) this.destroy()
    })
    
  }

  public update() {
    if (!this.homing || !this.active) return
    
    // Update homing every few frames for performance - increased interval
    this.homingUpdateTimer++
    if (this.homingUpdateTimer % 5 !== 0) return // Changed from every 3rd to every 5th frame
    
    const scene = this.scene as any
    if (!scene || !scene.enemies) return
    
    // Find nearest enemy if we don't have a target or target is dead
    if (!this.targetEnemy || !this.targetEnemy.active) {
      this.targetEnemy = this.findNearestEnemy(scene.enemies)
    }
    
    if (this.targetEnemy && this.targetEnemy.active) {
      // Calculate angle to target
      const targetAngle = Phaser.Math.Angle.Between(this.x, this.y, this.targetEnemy.x, this.targetEnemy.y)
      const currentAngle = Math.atan2(this.body.velocity.y, this.body.velocity.x)
      
      // Smoothly adjust angle towards target based on homing strength
      const angleDiff = Phaser.Math.Angle.Wrap(targetAngle - currentAngle)
      const adjustedAngle = currentAngle + (angleDiff * this.homingStrength * 0.1)
      
      // Update velocity to new angle while maintaining speed
      const speed = Math.sqrt(this.body.velocity.x ** 2 + this.body.velocity.y ** 2)
      this.body.setVelocity(
        Math.cos(adjustedAngle) * speed,
        Math.sin(adjustedAngle) * speed
      )
      
      // Reduce trail frequency for better performance
      if (this.homingStrength > 0.5 && Math.random() < 0.3) { // Reduced from always to 30% chance
        const trail = scene.add.graphics()
        trail.lineStyle(2, 0x00ffff, 0.3)
        trail.lineTo(this.x - this.body.velocity.x * 0.1, this.y - this.body.velocity.y * 0.1)
        trail.lineTo(this.x, this.y)
        trail.setScrollFactor(1, 1)
        trail.setDepth(50)
        
        const uiCamera = scene.cameras.cameras[1]
        if (uiCamera) {
          uiCamera.ignore(trail)
        }
        
        scene.time.delayedCall(150, () => { // Reduced from 200 to 150
          if (trail && trail.active) {
            trail.destroy()
          }
        })
      }
    }
  }

  private findNearestEnemy(enemies: Phaser.GameObjects.Group): any {
    let nearest = null
    let minDistance = Infinity
    const maxRange = 400 // Only track enemies within reasonable range
    
    enemies.children.entries.forEach((enemy: any) => {
      const distance = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y)
      if (distance < minDistance && distance < maxRange) {
        minDistance = distance
        nearest = enemy
      }
    })
    
    return nearest
  }

  public hitTarget(target: any) {
    if (this.chainLightning && !this.hitEnemies.has(target)) {
      this.hitEnemies.add(target)
      this.createChainLightning(target)
    }
    
    if (this.explosive) {
      this.explode()
    }
    
    // Handle ricochet bouncing between enemies
    if (this.ricochet && this.ricochetCount < this.maxRicochets) {
      this.hitEnemies.add(target)
      this.ricochetCount++
      
      // Find next enemy to bounce to
      const nextTarget = this.findNextRicochetTarget(target)
      if (nextTarget) {
        // Calculate angle to next target
        const bounceAngle = Phaser.Math.Angle.Between(this.x, this.y, nextTarget.x, nextTarget.y)
        
        // Update velocity to bounce toward next target
        const currentSpeed = Math.sqrt(this.body.velocity.x ** 2 + this.body.velocity.y ** 2)
        this.body.setVelocity(
          Math.cos(bounceAngle) * currentSpeed,
          Math.sin(bounceAngle) * currentSpeed
        )
        
        // Create ricochet visual effect
        this.createRicochetEffect(target, nextTarget)
        
        // Don't destroy, let it continue to next target
        return
      }
    }
    
    if (this.piercing && this.piercingCount < this.maxPiercing) {
      this.piercingCount++
      // Don't destroy, let it continue
    } else {
      this.destroy()
    }
  }

  private findNextRicochetTarget(currentTarget: any): any {
    const scene = this.scene as any
    if (!scene || !scene.enemies) return null
    
    let nearestTarget = null
    let minDistance = Infinity
    const maxRicochetRange = 200 // Maximum distance for ricochet
    
    scene.enemies.children.entries.forEach((enemy: any) => {
      // Skip if it's the current target or we've already hit this enemy
      if (enemy === currentTarget || this.hitEnemies.has(enemy) || !enemy.active) {
        return
      }
      
      const distance = Phaser.Math.Distance.Between(currentTarget.x, currentTarget.y, enemy.x, enemy.y)
      if (distance < minDistance && distance < maxRicochetRange) {
        minDistance = distance
        nearestTarget = enemy
      }
    })
    
    return nearestTarget
  }

  private createRicochetEffect(fromTarget: any, toTarget: any) {
    const scene = this.scene as any
    if (!scene) return
    
    // Create ricochet visual effect - a bright line between targets
    const ricochetLine = scene.add.graphics()
    ricochetLine.lineStyle(3, 0xff0088, 0.8) // Pink/magenta line for ricochet
    ricochetLine.beginPath()
    ricochetLine.moveTo(fromTarget.x, fromTarget.y)
    ricochetLine.lineTo(toTarget.x, toTarget.y)
    ricochetLine.strokePath()
    
    // Add sparkle effects at both ends
    const sparkles = scene.add.graphics()
    sparkles.fillStyle(0xff0088, 0.9)
    
    // Sparkles at origin
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2
      const distance = 15
      const x = fromTarget.x + Math.cos(angle) * distance
      const y = fromTarget.y + Math.sin(angle) * distance
      sparkles.fillCircle(x, y, 2)
    }
    
    // Sparkles at destination
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2
      const distance = 15
      const x = toTarget.x + Math.cos(angle) * distance
      const y = toTarget.y + Math.sin(angle) * distance
      sparkles.fillCircle(x, y, 2)
    }
    
    ricochetLine.setScrollFactor(1, 1)
    ricochetLine.setDepth(100)
    sparkles.setScrollFactor(1, 1)
    sparkles.setDepth(100)
    
    // Make sure UI camera ignores these effects
    const uiCamera = scene.cameras.cameras[1]
    if (uiCamera) {
      uiCamera.ignore([ricochetLine, sparkles])
    }
    
    // Clean up effects
    scene.time.delayedCall(200, () => {
      if (ricochetLine && ricochetLine.active) {
        ricochetLine.destroy()
      }
      if (sparkles && sparkles.active) {
        sparkles.destroy()
      }
    })
  }

  private createChainLightning(fromTarget: any) {
    const scene = this.scene as any
    const enemies = scene.enemies.children.entries
    
    let chainsCreated = 0
    enemies.forEach((enemy: any) => {
      if (enemy !== fromTarget && !this.hitEnemies.has(enemy) && chainsCreated < this.chainCount) {
        const distance = Phaser.Math.Distance.Between(fromTarget.x, fromTarget.y, enemy.x, enemy.y)
        if (distance < 150) {
          enemy.takeDamage(this.damage * 0.7)
          this.hitEnemies.add(enemy)
          chainsCreated++
          
          // Enhanced visual lightning effect based on level
          const lightning = scene.add.graphics()
          const thickness = 2 + (this.chainCount * 0.5) // Thicker lines for higher levels
          lightning.lineStyle(thickness, 0x8800ff, 0.8)
          lightning.beginPath()
          lightning.moveTo(fromTarget.x, fromTarget.y)
          lightning.lineTo(enemy.x, enemy.y)
          lightning.strokePath()
          
          // Add crackling effect for higher levels
          if (this.chainCount > 1) {
            for (let i = 0; i < 3; i++) {
              const midX = (fromTarget.x + enemy.x) / 2 + (Math.random() - 0.5) * 20
              const midY = (fromTarget.y + enemy.y) / 2 + (Math.random() - 0.5) * 20
              lightning.lineStyle(1, 0xaaaaff, 0.6)
              lightning.beginPath()
              lightning.moveTo(fromTarget.x, fromTarget.y)
              lightning.lineTo(midX, midY)
              lightning.lineTo(enemy.x, enemy.y)
              lightning.strokePath()
            }
          }
          
          // Make sure it's only rendered by the main camera
          lightning.setScrollFactor(1, 1)
          lightning.setDepth(100)
          
          // Make sure UI camera ignores this effect
          const uiCamera = scene.cameras.cameras[1]
          if (uiCamera) {
            uiCamera.ignore(lightning)
          }
          
          // Destroy it quickly
          scene.time.delayedCall(100, () => {
            if (lightning && lightning.active) {
              lightning.destroy()
            }
          })
        }
      }
    })
  }

  private explode() {
    const scene = this.scene as any
    
    // Progressive explosion visual based on radius
    const explosion = scene.add.graphics()
    const alpha = Math.min(0.8, 0.4 + (this.explosionRadius / 100))
    explosion.fillStyle(0xff6600, alpha)
    explosion.fillCircle(this.x, this.y, this.explosionRadius)
    
    // More elaborate explosion particles for larger explosions
    const particleCount = Math.min(12, 6 + Math.floor(this.explosionRadius / 20))
    explosion.lineStyle(3, 0xff3300, 0.8)
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2
      const startRadius = this.explosionRadius * 0.3
      const endRadius = this.explosionRadius * 0.9
      explosion.beginPath()
      explosion.moveTo(
        this.x + Math.cos(angle) * startRadius,
        this.y + Math.sin(angle) * startRadius
      )
      explosion.lineTo(
        this.x + Math.cos(angle) * endRadius,
        this.y + Math.sin(angle) * endRadius
      )
      explosion.strokePath()
    }
    
    // Add shockwave effect for larger explosions
    if (this.explosionRadius > 60) {
      const shockwave = scene.add.graphics()
      shockwave.lineStyle(4, 0xffaa00, 0.6)
      shockwave.strokeCircle(this.x, this.y, this.explosionRadius * 1.2)
      
      shockwave.setScrollFactor(1, 1)
      shockwave.setDepth(99)
      
      const uiCamera = scene.cameras.cameras[1]
      if (uiCamera) {
        uiCamera.ignore(shockwave)
      }
      
      scene.time.delayedCall(150, () => {
        if (shockwave && shockwave.active) {
          shockwave.destroy()
        }
      })
    }
    
    // Make sure it's only rendered by the main camera
    explosion.setScrollFactor(1, 1)
    explosion.setDepth(100)
    
    // Make sure UI camera ignores this effect
    const uiCamera = scene.cameras.cameras[1]
    if (uiCamera) {
      uiCamera.ignore(explosion)
    }
    
    scene.time.delayedCall(200, () => {
      if (explosion && explosion.active) {
        explosion.destroy()
      }
    })
    
    // Progressive damage based on explosion radius
    const damageMultiplier = 1 + (this.explosionRadius - 40) / 40 // Base 1x, increases with radius
    scene.enemies.children.entries.forEach((enemy: any) => {
      const distance = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y)
      if (distance < this.explosionRadius) {
        enemy.takeDamage(this.damage * damageMultiplier)
      }
    })
  }

  public enableRicochet() {
    this.ricochet = true
    this.body.setBounce(1, 1)
    this.body.setCollideWorldBounds(true)
  }
  
  public setRicochetLevel(level: number) {
    this.maxRicochets = 1 + level // Level 1: 2 bounces, Level 2: 3 bounces, etc.
  }
}
