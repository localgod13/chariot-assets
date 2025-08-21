
// src/game/objects/Enemy.ts

import { Scene } from 'phaser'
import { GAME_CONFIG } from '../config/constants'

export type EnemyType = 'BASIC' | 'STRONG' | 'ELITE' | 'BOSS'

export class Enemy extends Phaser.GameObjects.Container {
  declare public body: Phaser.Physics.Arcade.Body
  private sprite: Phaser.GameObjects.Image | null = null
  private healthBar: Phaser.GameObjects.Graphics | null = null
  public health: number
  public maxHealth: number
  private player: any
  public enemyType: EnemyType
  private config: any
  private walkingTimer: number = 0
  private baseRotation: number = 0
  private walkingAmplitude: number = 0.1 // How much to rock (in radians)
  private walkingSpeed: number = 8 // How fast to rock back and forth

  // Static property to track the last death sound played across all enemies
  private static lastDeathSound: string = ''
  private static deathSounds: string[] = ['death1', 'death2', 'death3']
  private static lastEliteDeathTime: number = 0 // Track when last elite death sound played
  private static lastBossDeathTime: number = 0 // Track when last boss death sound played

  constructor(scene: Scene, x: number, y: number, type: EnemyType, player: any, round: number = 1) {
    super(scene, x, y)
    this.player = player
    this.enemyType = type
    this.config = GAME_CONFIG.ENEMY_TYPES[type]
    
    // Apply difficulty scaling based on round
    const scaledHealth = this.calculateScaledHealth(this.config.HEALTH, round)
    this.health = scaledHealth
    this.maxHealth = scaledHealth
    
    // Log difficulty scaling if applied
    if (round >= 15 && scaledHealth > this.config.HEALTH) {
      const scalingPercent = Math.round(((scaledHealth / this.config.HEALTH) - 1) * 100)
      console.log(`🎯 Round ${round} Difficulty Scaling: ${this.enemyType} enemy health increased by ${scalingPercent}% (${this.config.HEALTH} → ${scaledHealth})`)
    }
    
    // Set walking animation parameters based on enemy type - MUCH slower and more subtle
    switch (type) {
      case 'BASIC':
        this.walkingAmplitude = 0.04 // Reduced from 0.25 to 0.04 - very subtle
        this.walkingSpeed = 3 // Reduced from 12 to 3 - much slower
        break
      case 'STRONG':
        this.walkingAmplitude = 0.03 // Reduced from 0.20 to 0.03 - very subtle
        this.walkingSpeed = 2.5 // Reduced from 10 to 2.5 - much slower
        break
      case 'ELITE':
        this.walkingAmplitude = 0.035 // Reduced from 0.18 to 0.035 - very subtle
        this.walkingSpeed = 3.5 // Reduced from 14 to 3.5 - much slower
        break
      case 'BOSS':
        this.walkingAmplitude = 0.025 // Reduced from 0.15 to 0.025 - very subtle
        this.walkingSpeed = 2 // Reduced from 8 to 2 - much slower
        break
    }
    
    this.createVisuals()
    this.setupPhysics()
    
    // Set depth to appear above pickups and other ground items
    this.setDepth(50) // Higher depth than XP orbs (10) so enemies appear on top
    
    scene.add.existing(this)
  }

  private createVisuals() {
    // Add health bar for stronger enemies
    if (this.enemyType === 'STRONG' || this.enemyType === 'ELITE' || this.enemyType === 'BOSS') {
      this.healthBar = this.scene.add.graphics()
      this.add(this.healthBar)
      this.updateHealthBar()
    }
    
    // Create enemy visual based on type
    if (this.enemyType === 'BASIC') {
      // Use sprite for basic enemies
      const spriteKey = Math.random() < 0.5 ? 'basic1' : 'basic2'
      this.sprite = this.scene.add.image(0, 0, spriteKey)
      
      // Scale the 1024x1024 sprite to match the enemy size
      const targetSize = this.config.SIZE
      const scale = targetSize / 1024 // Scale down from 1024 to target size
      this.sprite.setScale(scale)
      this.sprite.setOrigin(0.5, 0.5)
      
      this.add(this.sprite)
    } else if (this.enemyType === 'STRONG') {
      // Use sprite for strong enemies
      this.sprite = this.scene.add.image(0, 0, 'stong')
      
      // Scale the 1024x1024 sprite to match the enemy size
      const targetSize = this.config.SIZE
      const scale = targetSize / 1024 // Scale down from 1024 to target size
      this.sprite.setScale(scale)
      this.sprite.setOrigin(0.5, 0.5)
      
      this.add(this.sprite)
    } else if (this.enemyType === 'ELITE') {
      // Use sprite for elite enemies
      this.sprite = this.scene.add.image(0, 0, 'elite')
      
      // Scale the 1024x1024 sprite to match the enemy size
      const targetSize = this.config.SIZE
      const scale = targetSize / 1024 // Scale down from 1024 to target size
      this.sprite.setScale(scale)
      this.sprite.setOrigin(0.5, 0.5)
      
      this.add(this.sprite)
    } else if (this.enemyType === 'BOSS') {
      // Use sprite for boss enemies (no special outline)
      this.sprite = this.scene.add.image(0, 0, 'boss')
      
      // Scale the 1024x1024 sprite to match the enemy size
      const targetSize = this.config.SIZE
      const scale = targetSize / 1024 // Scale down from 1024 to target size
      this.sprite.setScale(scale)
      this.sprite.setOrigin(0.5, 0.5)
      
      this.add(this.sprite)
    }
  }

  private setupPhysics() {
    this.scene.physics.add.existing(this)
    
    // Set physics body size to match the actual visual size
    if (this.sprite) {
      // For all sprite-based enemies (BASIC, STRONG, ELITE, and BOSS), use the actual scaled dimensions
      const scale = this.config.SIZE / 1024 // This is the scale we applied to the sprite
      const actualWidth = 1024 * scale
      const actualHeight = 1024 * scale
      this.body.setSize(actualWidth, actualHeight)
      
      // CRITICAL: Center the physics body within the Container following README rules
      this.body.setOffset(-actualWidth / 2, -actualHeight / 2)
    } else {
      // Fallback for any geometric shape enemies (none should exist now)
      this.body.setSize(this.config.SIZE, this.config.SIZE)
      this.body.setOffset(-this.config.SIZE / 2, -this.config.SIZE / 2)
    }
  }

  update() {
    if (!this.player || !this.player.active) return
    
    // Don't move toward player if we're still positioning
    if (this.getData('isPositioning') === true) {
      return // Let the tween handle movement during positioning
    }
    
    // Don't engage in combat until combat phase is active
    // Check explicitly for false or undefined to ensure combat starts properly
    const combatActive = this.getData('combatActive')
    if (combatActive !== true) {
      // Only log occasionally to avoid spam
      if (Math.random() < 0.01) { // 1% chance to log
        console.log(`Enemy at (${Math.round(this.x)}, ${Math.round(this.y)}) waiting for combat activation`)
      }
      return // Wait for combat phase to begin
    }
    
    // Additional safety check: don't move toward player if too close during positioning phase
    const gameScene = this.scene as any
    if (gameScene && gameScene.isRoundTransition) {
      const distanceToPlayer = Phaser.Math.Distance.Between(this.x, this.y, this.player.x, this.player.y)
      if (distanceToPlayer < 300) {
        // Stop moving if too close to player during round transition
        this.body.setVelocity(0, 0)
        return
      }
    }
    
    // IMPROVED: Better movement logic with wall avoidance
    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.player.x, this.player.y)
    
    // Store the base rotation for walking animation
    this.baseRotation = angle - Math.PI / 2 // Adjust for sprite facing direction
    
    // Apply more aggressive speed scaling based on player level
    // Start at 90% of base speed, gradually increase to 150% by level 20
    const playerLevel = this.player.level || 1
    const speedMultiplier = 0.90 + (playerLevel * 0.03) // 0.90 at level 1, 1.50 at level 20 (was 0.85 + 0.0175)
    let adjustedSpeed = this.config.SPEED * speedMultiplier
    
    // Apply slow time effect if active
    if (gameScene.slowTimeActive) {
      adjustedSpeed *= gameScene.slowTimeFactor
    }
    
    let velocityX = Math.cos(angle) * adjustedSpeed
    let velocityY = Math.sin(angle) * adjustedSpeed
    
    // Check if enemy is actually moving (has velocity)
    const isMoving = Math.abs(velocityX) > 10 || Math.abs(velocityY) > 10
    
    // IMPROVED: Wall avoidance system
    const wallAvoidanceDistance = 100 // Distance to start avoiding walls
    const wallAvoidanceStrength = 0.8 // How strongly to avoid walls
    
    // Check distance to each wall and apply avoidance force
    let avoidanceX = 0
    let avoidanceY = 0
    
    // Left wall avoidance
    if (this.x < wallAvoidanceDistance) {
      avoidanceX += (wallAvoidanceDistance - this.x) * wallAvoidanceStrength
    }
    
    // Right wall avoidance
    if (this.x > GAME_CONFIG.WORLD.WIDTH - wallAvoidanceDistance) {
      avoidanceX -= (this.x - (GAME_CONFIG.WORLD.WIDTH - wallAvoidanceDistance)) * wallAvoidanceStrength
    }
    
    // Top wall avoidance
    if (this.y < wallAvoidanceDistance) {
      avoidanceY += (wallAvoidanceDistance - this.y) * wallAvoidanceStrength
    }
    
    // Bottom wall avoidance
    if (this.y > GAME_CONFIG.WORLD.HEIGHT - wallAvoidanceDistance) {
      avoidanceY -= (this.y - (GAME_CONFIG.WORLD.HEIGHT - wallAvoidanceDistance)) * wallAvoidanceStrength
    }
    
    // Apply wall avoidance to velocity
    velocityX += avoidanceX
    velocityY += avoidanceY
    
    // IMPROVED: Collision box avoidance
    const collisionAvoidanceDistance = 80
    const collisionAvoidanceStrength = 1.2
    
    for (const box of GAME_CONFIG.COLLISION_BOXES) {
      // Check if enemy is near this collision box
      const closestX = Phaser.Math.Clamp(this.x, box.x, box.x + box.width)
      const closestY = Phaser.Math.Clamp(this.y, box.y, box.y + box.height)
      const distanceToBox = Phaser.Math.Distance.Between(this.x, this.y, closestX, closestY)
      
      if (distanceToBox < collisionAvoidanceDistance) {
        // Calculate avoidance direction (away from the collision box)
        const avoidAngle = Phaser.Math.Angle.Between(closestX, closestY, this.x, this.y)
        const avoidForce = (collisionAvoidanceDistance - distanceToBox) * collisionAvoidanceStrength
        
        velocityX += Math.cos(avoidAngle) * avoidForce
        velocityY += Math.sin(avoidAngle) * avoidForce
      }
    }
    
    // IMPROVED: Enemy separation to prevent clumping
    if (gameScene && gameScene.enemies) {
      const separationDistance = 60 // Minimum distance between enemies
      const separationStrength = 0.5
      
      gameScene.enemies.children.entries.forEach((otherEnemy: any) => {
        if (otherEnemy !== this && otherEnemy.active) {
          const distance = Phaser.Math.Distance.Between(this.x, this.y, otherEnemy.x, otherEnemy.y)
          if (distance < separationDistance && distance > 0) {
            // Push away from other enemy
            const separationAngle = Phaser.Math.Angle.Between(otherEnemy.x, otherEnemy.y, this.x, this.y)
            const separationForce = (separationDistance - distance) * separationStrength
            
            velocityX += Math.cos(separationAngle) * separationForce
            velocityY += Math.sin(separationAngle) * separationForce
          }
        }
      })
    }
    
    // Limit maximum velocity to prevent enemies from moving too fast due to avoidance
    const maxVelocity = adjustedSpeed * 1.5 // Allow up to 50% faster than base speed
    const currentSpeed = Math.sqrt(velocityX * velocityX + velocityY * velocityY)
    if (currentSpeed > maxVelocity) {
      const scale = maxVelocity / currentSpeed
      velocityX *= scale
      velocityY *= scale
    }
    
    this.body.setVelocity(velocityX, velocityY)
    
    // Update walking animation and sprite rotation
    if (this.sprite) {
      if (isMoving) {
        // Update walking timer - much slower increment for subtle animation
        this.walkingTimer += 0.05 // Reduced from 0.20 to 0.05 - much slower animation
        
        // Calculate walking rock motion with subtle effect
        const walkingOffset = Math.sin(this.walkingTimer * this.walkingSpeed) * this.walkingAmplitude
        
        // Apply base rotation plus subtle walking rock
        this.sprite.rotation = this.baseRotation + walkingOffset
        
        // Keep original scale
        this.sprite.setScale(this.config.SIZE / 1024)
        
        // Reset vertical position
        this.sprite.y = 0
        
      } else {
        // When not moving, gradually return to base rotation
        const currentRotation = this.sprite.rotation
        const targetRotation = this.baseRotation
        this.sprite.rotation = Phaser.Math.Angle.RotateTo(currentRotation, targetRotation, 0.05) // Slower return
        
        // Ensure scale and position are at defaults
        this.sprite.setScale(this.config.SIZE / 1024)
        this.sprite.y = 0
      }
    }
    
    // Add speed boost when low on health (desperation mechanic) - also apply gradual scaling
    const healthPercent = this.health / this.maxHealth
    if (healthPercent < 0.3) {
      const speedBoost = 1.5 // 50% speed boost when below 30% health
      this.body.setVelocity(velocityX * speedBoost, velocityY * speedBoost)
    }
  }

  private updateHealthBar() {
    if (!this.healthBar) return
    
    this.healthBar.clear()
    
    const barWidth = this.config.SIZE
    const barHeight = 6
    const barY = -this.config.SIZE/2 - 15
    
    // Background
    this.healthBar.fillStyle(0x000000, 0.8)
    this.healthBar.fillRect(-barWidth/2, barY, barWidth, barHeight)
    
    // Health bar
    const healthPercent = this.health / this.maxHealth
    let healthColor = 0x00ff00 // Green
    if (healthPercent < 0.6) healthColor = 0xffff00 // Yellow
    if (healthPercent < 0.3) healthColor = 0xff0000 // Red
    
    this.healthBar.fillStyle(healthColor)
    this.healthBar.fillRect(-barWidth/2, barY, barWidth * healthPercent, barHeight)
  }

  public takeDamage(amount: number) {
    this.health -= amount
    
    // Update health bar
    this.updateHealthBar()
    
    // Flash effect - now all enemies use sprites
    if (this.sprite) {
      // Flash all sprite enemies (BASIC, STRONG, ELITE, and BOSS)
      const originalTint = this.sprite.tint
      this.sprite.setTint(0xff0000)
      
      this.scene.time.delayedCall(100, () => {
        if (this.active && this.sprite) {
          this.sprite.setTint(originalTint)
        }
      })
    }
    
    if (this.health <= 0) {
      // Create blood splatter effect before destroying enemy
      this.createBloodSplatter()
      
      // Play death sounds based on enemy type with proper throttling
      if (this.enemyType === 'BASIC') {
        this.playNextDeathSound()
      } else if (this.enemyType === 'STRONG') {
        this.playStrongDeathSound()
      } else if (this.enemyType === 'ELITE') {
        this.playEliteDeathSound()
      } else if (this.enemyType === 'BOSS') {
        this.playBossDeathSound()
      }
      
      this.dropXP()
      this.destroy()
    }
  }

  private createBloodSplatter() {
    const scene = this.scene as any
    if (!scene) return

    // Reduce blood splatter complexity for better performance
    const bloodSplatter = scene.add.graphics()
    
    // Different blood splatter sizes based on enemy type
    let splatterSize: number
    let splatterIntensity: number
    
    switch (this.enemyType) {
      case 'BASIC':
        splatterSize = 30 // Reduced from 40
        splatterIntensity = 0.5 // Reduced from 0.6
        break
      case 'STRONG':
        splatterSize = 45 // Reduced from 60
        splatterIntensity = 0.6 // Reduced from 0.7
        break
      case 'ELITE':
        splatterSize = 60 // Reduced from 80
        splatterIntensity = 0.7 // Reduced from 0.8
        break
      case 'BOSS':
        splatterSize = 80 // Reduced from 120
        splatterIntensity = 0.8 // Reduced from 0.9
        break
      default:
        splatterSize = 30
        splatterIntensity = 0.5
    }

    // Register this blood pool with the Player class for trail detection
    const { Player } = require('./Player')
    const bloodPoolId = Player.registerBloodPool(this.x, this.y, splatterSize)

    // Create simplified main blood pool - fewer points for better performance
    const mainPoolPoints = []
    const numPoints = 6 + Math.floor(Math.random() * 2) // Reduced from 8-12 to 6-8 points
    
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2
      const radiusVariation = 0.7 + Math.random() * 0.6
      const radius = splatterSize * radiusVariation
      const x = this.x + Math.cos(angle) * radius
      const y = this.y + Math.sin(angle) * radius
      mainPoolPoints.push({ x, y })
    }
    
    // Draw the main irregular blood pool
    bloodSplatter.fillStyle(0x8B0000, splatterIntensity)
    bloodSplatter.beginPath()
    bloodSplatter.moveTo(mainPoolPoints[0].x, mainPoolPoints[0].y)
    
    for (let i = 1; i < mainPoolPoints.length; i++) {
      bloodSplatter.lineTo(mainPoolPoints[i].x, mainPoolPoints[i].y)
    }
    bloodSplatter.closePath()
    bloodSplatter.fillPath()
    
    // Reduce number of droplets and streaks forperformance
    const numDroplets = Math.floor(splatterSize / 12) + Math.floor(Math.random() * 3) // Reduced complexity
    for (let i = 0; i < numDroplets; i++) {
      const angle = Math.random() * Math.PI * 2
      const distance = splatterSize * 0.8 + Math.random() * splatterSize * 0.2 // Reduced spread
      const dropletX = this.x + Math.cos(angle) * distance
      const dropletY = this.y + Math.sin(angle) * distance
      
      const dropletSize = 2 + Math.random() * 4 // Simplified size
      const bloodShade = Math.random() < 0.5 ? 0x8B0000 : 0x660000
      
      // Simple circular droplets instead of complex shapes
      bloodSplatter.fillStyle(bloodShade, splatterIntensity * 0.8)
      bloodSplatter.fillCircle(dropletX, dropletY, dropletSize)
    }
    
    // Reduce streaks for performance
    const numStreaks = 1 + Math.floor(Math.random() * 2) // Reduced from 2-4 to 1-3 streaks
    for (let i = 0; i < numStreaks; i++) {
      const streakAngle = Math.random() * Math.PI * 2
      const streakLength = splatterSize * (0.3 + Math.random() * 0.3) // Shorter streaks
      const streakWidth = 2 + Math.random() * 2 // Thinner streaks
      
      // Simple straight streaks instead of wavy ones
      const endX = this.x + Math.cos(streakAngle) * streakLength
      const endY = this.y + Math.sin(streakAngle) * streakLength
      
      bloodSplatter.lineStyle(streakWidth, 0x660000, splatterIntensity * 0.7)
      bloodSplatter.beginPath()
      bloodSplatter.moveTo(this.x, this.y)
      bloodSplatter.lineTo(endX, endY)
      bloodSplatter.strokePath()
    }
    
    // Fewer speckles
    const numSpeckles = Math.floor(splatterSize / 16) + Math.floor(Math.random() * 4) // Reduced
    for (let i = 0; i < numSpeckles; i++) {
      const speckleAngle = Math.random() * Math.PI * 2
      const speckleDistance = splatterSize * 1.1 + Math.random() * splatterSize * 0.2
      const speckleX = this.x + Math.cos(speckleAngle) * speckleDistance
      const speckleY = this.y + Math.sin(speckleAngle) * speckleDistance
      const speckleSize = 1 + Math.random() * 1.5
      
      bloodSplatter.fillStyle(0x660000, splatterIntensity * 0.6)
      bloodSplatter.fillCircle(speckleX, speckleY, speckleSize)
    }
    
    bloodSplatter.setDepth(5)
    bloodSplatter.setScrollFactor(1, 1)
    
    const uiCamera = scene.cameras?.cameras[1]
    if (uiCamera) {
      uiCamera.ignore(bloodSplatter)
    }
    
    // Create bones on top of the blood pool
    const boneSprites = this.createBonesOnBlood(scene, splatterSize, uiCamera)
    
    // Fade out the blood splatter and bones together
    scene.tweens.add({
      targets: [bloodSplatter, ...boneSprites],
      alpha: 0,
      duration: 6000, // Reduced from 8000 to 6000 for faster cleanup
      ease: 'Power2.easeOut',
      onComplete: () => {
        if (bloodSplatter && bloodSplatter.active) {
          bloodSplatter.destroy()
        }
        boneSprites.forEach(bone => {
          if (bone && bone.active) {
            bone.destroy()
          }
        })
        
        Player.removeBloodPool(bloodPoolId)
      }
    })
  }

  private createBonesOnBlood(scene: any, splatterSize: number, uiCamera: any): Phaser.GameObjects.Image[] {
    const boneSprites: Phaser.GameObjects.Image[] = []
    
    // Always drop exactly 1 bone per enemy, regardless of type
    const numBones = 1
    
    for (let i = 0; i < numBones; i++) {
      // Position bones randomly within the blood splatter area
      const angle = Math.random() * Math.PI * 2
      const distance = Math.random() * splatterSize * 0.6 // Keep bones within the main blood pool
      const boneX = this.x + Math.cos(angle) * distance
      const boneY = this.y + Math.sin(angle) * distance
      
      // Create bone sprite
      const bone = scene.add.image(boneX, boneY, 'bones')
      
      // Smaller bone scales - balanced between visibility and subtlety
      let boneScale: number
      switch (this.enemyType) {
        case 'BASIC':
          boneScale = 0.05 + Math.random() * 0.02 // 0.05-0.07 scale (smaller but visible)
          break
        case 'STRONG':
          boneScale = 0.06 + Math.random() * 0.02 // 0.06-0.08 scale (slightly larger)
          break
        case 'ELITE':
          boneScale = 0.07 + Math.random() * 0.02 // 0.07-0.09 scale (medium size)
          break
        case 'BOSS':
          boneScale = 0.08 + Math.random() * 0.03 // 0.08-0.11 scale (largest but not overwhelming)
          break
        default:
          boneScale = 0.05
      }
      
      bone.setScale(boneScale)
      bone.setOrigin(0.5, 0.5)
      
      // Set bone rotation to match the enemy's facing direction when they died
      // For all sprite-based enemies, use their sprite rotation
      let enemyFacingDirection = 0
      if (this.sprite) {
        enemyFacingDirection = this.sprite.rotation
      } else {
        enemyFacingDirection = this.rotation
      }
      
      // Add some random variation to the bone rotation while keeping it generally aligned
      const rotationVariation = (Math.random() - 0.5) * Math.PI * 0.3 // ±27 degrees variation
      bone.setRotation(enemyFacingDirection + rotationVariation)
      
      // Set depth higher than center piece to ensure bones appear in front
      bone.setDepth(25) // Higher than center piece (20) so bones appear in front
      bone.setScrollFactor(1, 1) // Follow world camera
      
      // Make sure UI camera ignores bones
      if (uiCamera) {
        uiCamera.ignore(bone)
      }
      
      // Use natural bone color - no tinting or effects
      
      // Only add the actual bone sprite to the array
      boneSprites.push(bone)
    }
    
    return boneSprites
  }

  private playNextDeathSound() {
    const scene = this.scene as any
    if (!scene || !scene.sound) return

    // Only play death sound 1 in 3 times (33% chance)
    if (Math.random() > 0.33) return

    // Get the next death sound in the cycle
    const currentIndex = Enemy.deathSounds.indexOf(Enemy.lastDeathSound)
    const nextIndex = (currentIndex + 1) % Enemy.deathSounds.length
    const nextSound = Enemy.deathSounds[nextIndex]
    
    // Update the last played sound
    Enemy.lastDeathSound = nextSound
    
    // Play the death sound with slight variation for more variety
    scene.sound.play(nextSound, {
      volume: Phaser.Math.FloatBetween(0.4, 0.6), // Slightly quieter than hit sounds
      rate: Phaser.Math.FloatBetween(0.95, 1.05)  // Slight pitch variation
    })
  }

  private playStrongDeathSound() {
    const scene = this.scene as any
    if (!scene || !scene.sound) {
      console.warn('Scene or sound not available for STRONG enemy death')
      return
    }

    // Check if this is the first strong enemy death of the round
    const isFirstOfRound = scene.isFirstStrongDeathThisRound && scene.isFirstStrongDeathThisRound()
    
    // Always play for first strong death of round, otherwise 1 in 3 chance
    if (!isFirstOfRound && Math.random() > 0.33) {
      console.log('Strong death sound skipped (random chance)')
      return
    }

    console.log(`Playing STRONG enemy death sound ${isFirstOfRound ? '(first of round)' : '(random chance)'}`)
    
    // Use strongdeath sound for strong enemies
    scene.sound.play('strongdeath', {
      volume: Phaser.Math.FloatBetween(0.6, 0.8), // Increased volume range for better audibility
      rate: Phaser.Math.FloatBetween(0.95, 1.05)  // Slight pitch variation
    })
  }

  private playEliteDeathSound() {
    const scene = this.scene as any
    if (!scene || !scene.sound) {
      console.warn('Scene or sound not available for ELITE enemy death')
      return
    }

    // Throttle elite death sounds - only play if at least 800ms have passed since last elite death
    const currentTime = scene.time.now
    if (currentTime - Enemy.lastEliteDeathTime < 800) {
      console.log('Elite death sound throttled')
      return
    }

    // Only play elite death sound 1 in 2 times (50% chance) to reduce repetition
    if (Math.random() > 0.5) {
      console.log('Elite death sound skipped (random chance)')
      return
    }

    Enemy.lastEliteDeathTime = currentTime
    
    console.log('Playing ELITE enemy death sound')
    
    // Use strongdeath sound for elite enemies but with different settings
    scene.sound.play('strongdeath', {
      volume: Phaser.Math.FloatBetween(0.7, 0.9), // Slightly louder than strong enemies
      rate: Phaser.Math.FloatBetween(0.85, 0.95)  // Lower pitch to differentiate from strong enemies
    })
  }

  private playBossDeathSound() {
    const scene = this.scene as any
    if (!scene || !scene.sound) {
      console.warn('Scene or sound not available for BOSS enemy death')
      return
    }

    // Throttle boss death sounds - only play if at least 1000ms have passed since last boss death
    const currentTime = scene.time.now
    if (currentTime - Enemy.lastBossDeathTime < 1000) {
      console.log('Boss death sound throttled')
      return
    }

    Enemy.lastBossDeathTime = currentTime
    
    console.log('Playing BOSS enemy death sound')
    
    // Use strongdeath sound for boss enemies but with dramatic settings
    scene.sound.play('strongdeath', {
      volume: Phaser.Math.FloatBetween(0.8, 1.0), // Loudest for boss enemies
      rate: Phaser.Math.FloatBetween(0.75, 0.85)  // Much lower pitch for dramatic effect
    })
  }

  private dropXP() {
    const scene = this.scene as any
    
    // All enemies now drop physical assets instead of orbs
    let numDrops: number
    switch (this.enemyType) {
      case 'BASIC': numDrops = 1; break // Always 1 drop
      case 'STRONG': numDrops = Phaser.Math.Between(1, 2); break // 1-2 drops
      case 'ELITE': numDrops = Phaser.Math.Between(2, 3); break // 2-3 drops  
      case 'BOSS': numDrops = Phaser.Math.Between(3, 5); break // 3-5 drops
      default: numDrops = 1
    }
    
    console.log(`${this.enemyType} enemy killed, dropping ${numDrops} items`)
    
    for (let i = 0; i < numDrops; i++) {
      // Spread drops around the enemy position
      const offsetX = Phaser.Math.Between(-30, 30)
      const offsetY = Phaser.Math.Between(-30, 30)
      const dropX = this.x + offsetX
      const dropY = this.y + offsetY
      
      // Determine what to drop based on enemy type and random chance
      const dropType = this.getWeightedDropType()
      console.log(`Drop ${i + 1}: ${dropType}`)
      
      switch (dropType) {
        case 'SWORD':
          scene.createSword(dropX, dropY)
          break
        case 'MACE':
          scene.createMace(dropX, dropY)
          break
        case 'HEART':
          // Always drop a heart when this case is hit
          console.log('Creating heart at:', dropX, dropY)
          scene.createHeart(dropX, dropY)
          break
        case 'ARMOR_SMALL':
        case 'ARMOR_LARGE':
        case 'ARMOR_RARE':
          // Create XP orbs that use armor pile assets with different variations
          const orbType = dropType === 'ARMOR_SMALL' ? 'SMALL' : 
                         dropType === 'ARMOR_LARGE' ? 'LARGE' : 'RARE'
          console.log(`Creating armor pile: ${orbType}`)
          scene.createXPOrb(dropX, dropY, orbType)
          break
      }
    }
  }

  private getWeightedDropType(): string {
    const baseRand = Math.random()
    
    // Reduce heart drop chance back to 10% for rarity
    if (baseRand < 0.10) return 'HEART'
    
    // Adjust remaining probabilities to account for heart drop chance
    const adjustedRand = (baseRand - 0.10) / 0.90 // Rescale to 0-1 range
    
    switch (this.enemyType) {
      case 'BASIC':
        // Basic enemies drop swords or maces based on sprite
        if (this.sprite && this.sprite.texture.key === 'basic1') return 'SWORD'
        if (this.sprite && this.sprite.texture.key === 'basic2') return 'MACE'
        return Math.random() < 0.5 ? 'SWORD' : 'MACE'
        
      case 'STRONG':
        // Strong enemies drop more armor piles - increased armor chance from 30% to 60%
        if (adjustedRand < 0.2) return 'SWORD'
        if (adjustedRand < 0.4) return 'MACE'
        return 'ARMOR_SMALL' // 60% chance for armor
        
      case 'ELITE':
        // Elite enemies drop better loot - increased armor chances
        if (adjustedRand < 0.2) return 'SWORD'
        if (adjustedRand < 0.3) return 'MACE'
        if (adjustedRand < 0.7) return 'ARMOR_SMALL' // 40% chance for small armor
        return 'ARMOR_LARGE' // 30% chance for large armor
        
      case 'BOSS':
        // Boss enemies drop the best loot - guaranteed armor
        if (adjustedRand < 0.1) return 'SWORD'
        if (adjustedRand < 0.2) return 'MACE'
        if (adjustedRand < 0.5) return 'ARMOR_LARGE' // 30% chance for large armor
        return 'ARMOR_RARE' // 50% chance for rare armor
        
      default:
        return 'SWORD'
    }
  }

  private calculateScaledHealth(baseHealth: number, round: number): number {
    // Difficulty scaling: starts at round 15, then every 5 rounds after that
    if (round < 15) {
      return baseHealth; // No scaling before round 15
    }
    
    // Calculate how many scaling points we've passed
    const scalingRounds = [15, 20, 25, 30, 35, 40, 45, 50]; // Every 5 rounds starting at 15
    let scalingLevel = 0;
    
    for (const scalingRound of scalingRounds) {
      if (round >= scalingRound) {
        scalingLevel++;
      } else {
        break;
      }
    }
    
    // Apply scaling: each level adds 50% more health
    const healthMultiplier = 1 + (scalingLevel * 0.5);
    const scaledHealth = baseHealth * healthMultiplier;
    
    return Math.floor(scaledHealth); // Ensure it's an integer
  }
}

export function getRandomEnemyType(playerLevel: number): EnemyType {
  const availableTypes: Array<{type: EnemyType, weight: number}> = []
  
  // Add enemy types based on player level
  Object.entries(GAME_CONFIG.ENEMY_TYPES).forEach(([type, config]) => {
    if (playerLevel >= config.MIN_LEVEL) {
      availableTypes.push({
        type: type as EnemyType,
        weight: config.SPAWN_WEIGHT
      })
    }
  })
  
  // Weighted random selection
  const totalWeight = availableTypes.reduce((sum, item) => sum + item.weight, 0)
  let random = Math.random() * totalWeight
  
  for (const item of availableTypes) {
    random -= item.weight
    if (random <= 0) {
      return item.type
    }
  }
  
  return 'BASIC' // Fallback
}
