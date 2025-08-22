
// src/game/objects/Player.ts

import { Scene } from 'phaser'
import { GAME_CONFIG } from '../config/constants'

export class Player extends Phaser.GameObjects.Container {
  declare public body: Phaser.Physics.Arcade.Body
  private chariotSprite: Phaser.GameObjects.Image
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd: any
  private controlsEnabled: boolean = true
  
  public health: number = GAME_CONFIG.PLAYER.MAX_HEALTH
  public maxHealth: number = GAME_CONFIG.PLAYER.MAX_HEALTH
  public xp: number = 0
  public level: number = 1
  public attackRate: number = GAME_CONFIG.PLAYER.ATTACK_RATE
  public upgrades: Set<string> = new Set()
  public upgradelevels: Map<string, number> = new Map() // Track upgrade levels
  
  private lastAttack: number = 0
  private nearestEnemy: any = null
  
  // Multiple weapon systems with independent timers
  private lastHomingMissile: number = 0
  private lastExplosiveRound: number = 0
  private lastChainLightning: number = 0
  private lastPiercingArrow: number = 0
  
  // Hit sound alternation system
  private lastHitSound: string = '' // Track which hit sound was played last
  private lastTrailTime: number = 0 // Track when last trail was created
  private lastHorseSound: string = '' // Track which horse sound was played last
  
  // Trail system with spline interpolation
  private trailSegments: Phaser.GameObjects.Graphics[] = []
  private lastTrailX: number = 0
  private lastTrailY: number = 0
  private readonly TRAIL_INTERVAL = 30 // Less frequent for better performance
  private readonly TRAIL_LIFETIME = 1500 // Much shorter trails (reduced from 2500)
  private readonly TRAIL_DISTANCE = 8 // Slightly larger distance between segments
  
  // Blood trail system
  private readonly BLOOD_FADE_DURATION = 1500 // Reduced from 3000 to 1500ms (1.5 seconds)
  private leftWheelInBlood: boolean = false
  private rightWheelInBlood: boolean = false
  private leftWheelBloodContactTime: number = 0
  private rightWheelBloodContactTime: number = 0
  
  // Blood effect delay system - new properties
  private readonly BLOOD_EFFECT_DELAY = 200 // 200ms delay before blood shows in trails
  private rightWheelBloodEffectStartTime: number = 0
  
  // Track wheel position history for spline interpolation
  private leftWheelHistory: Array<{x: number, y: number}> = []
  private rightWheelHistory: Array<{x: number, y: number}> = []
  private readonly MAX_HISTORY_POINTS = 6 // Fewer points for shorter trails
  
  private trotSound: Phaser.Sound.BaseSound | null // Initialize movement sound
  
  private isMoving: boolean = false
  private wasMovingLastFrame: boolean = false
  
  private muzzleFlashGraphics: Phaser.GameObjects.Graphics | null = null
  private muzzleFlashTween: Phaser.Tweens.Tween | null = null
  
  // Scythe system
  private leftScythe: Phaser.GameObjects.Image | null = null
  private rightScythe: Phaser.GameObjects.Image | null = null
  private scythesVisible: boolean = false // Hidden by default until upgrade is obtained
  private scytheFlipTimer: number = 0
  private readonly SCYTHE_FLIP_INTERVAL: number = 80 // 0.08 seconds in milliseconds
  private scythesFlipped: boolean = false
  
  // Scythe collision debug visualization
  private leftScytheCollisionBox: Phaser.GameObjects.Graphics | null = null
  private rightScytheCollisionBox: Phaser.GameObjects.Graphics | null = null
  
  // Player collision debug visualization
  private playerCollisionBox: Phaser.GameObjects.Graphics | null = null
  private readonly SCYTHE_COLLISION_WIDTH: number = 120 // Much larger horizontal collision width for testing
  private readonly SCYTHE_COLLISION_HEIGHT: number = 80 // Much larger vertical collision height for testing
  private readonly SCYTHE_COLLISION_OFFSET: number = 10 // Reduced offset to keep closer to player
  
  // Scythe damage system
  private readonly SCYTHE_BASE_DAMAGE: number = 45 // Base damage per scythe hit
  private readonly SCYTHE_HIT_COOLDOWN: number = 150 // Reduced cooldown for more responsive melee combat (ms)
  private readonly SCYTHE_KNOCKBACK_FORCE: number = 300 // Knockback force applied to enemies
  private readonly SCYTHE_KNOCKBACK_DURATION: number = 200 // Duration of knockback effect (ms)
  private scytheHitMap: Map<number, number> = new Map() // Track last hit time per enemy ID
  private lastScytheSound: string = '' // Track which scythe sound was played last

  
  constructor(scene: Scene, x: number, y: number) {
    super(scene, x, y)
    
    // Initialize trail position
    this.lastTrailX = x
    this.lastTrailY = y
    
    // Initialize wheel position history for spline interpolation
    this.leftWheelHistory = []
    this.rightWheelHistory = []
    
    // Initialize movement sound
    this.trotSound = scene.sound.add('trot', {
      loop: true,
      volume: 0.4 // Set to 40% volume so it doesn't overpower other sounds
    })
    
    // Create scythe sprites first (so they render behind the chariot)
    this.leftScythe = scene.add.image(-42.4, 48.0, 'scythe')
    this.leftScythe.setScale(0.110)
    this.leftScythe.setOrigin(0.5, 0.5)
    this.leftScythe.setRotation(Math.PI) // Point west (left)
    this.leftScythe.setVisible(false) // Hidden by default until upgrade is obtained
    this.add(this.leftScythe) // Add scythes first

    this.rightScythe = scene.add.image(40.8, 51.2, 'scythe')
    this.rightScythe.setScale(0.110)
    this.rightScythe.setOrigin(0.5, 0.51)
    this.rightScythe.setRotation(0) // Point east (right) - default direction
    this.rightScythe.setVisible(false) // Hidden by default until upgrade is obtained
    this.add(this.rightScythe) // Add scythes first
    
    // Create chariot sprite after scythes (so it renders on top)
    this.chariotSprite = scene.add.image(0, 0, 'chariot')
    this.chariotSprite.setScale(0.21) // Reduced by 30% from 0.3 to 0.21
    this.chariotSprite.setOrigin(0.5, 0.5)
    this.add(this.chariotSprite) // Add chariot last so it renders on top
    
    // Create collision box visualizations for scythes (debug)
    this.createScytheCollisionBoxes(scene)
    
    // Add to scene first
    scene.add.existing(this)
    
    // Set player to very high depth to ensure it renders above everything
    this.setDepth(1000) // Much higher than enemies (50), trails (1), blood (-10), etc.
    
    // Then enable physics - this is crucial for the body to be created
    scene.physics.add.existing(this)
    
    // Ensure body exists before trying to configure it
    if (!this.body) {
      console.error('Physics body not created for Player')
      return
    }
    
    // For Containers with large scaled sprites, we need to be more explicit
    // Calculate the actual display size after scaling
    const displayWidth = 1024 * 0.21  // Original width * scale
    const displayHeight = 1024 * 0.21 // Original height * scale
    
    // Set body size to a rectangle that represents the chariot shape
    // Chariot should be longer front-to-back (height) than side-to-side (width)
    const bodyWidth = displayWidth * 0.3   // 30% of display width (narrower)
    const bodyHeight = displayHeight * 0.5  // 50% of display height (longer)
    
    // Set the physics body size as rectangle
    this.body.setSize(bodyWidth, bodyHeight)
    
    // For Containers, we need to center the body properly
    // The body should be centered on the Container's origin (0,0)
    this.body.setOffset(-bodyWidth / 2, -bodyHeight / 2)
    
    console.log(`Player collision body: ${bodyWidth.toFixed(1)}x${bodyHeight.toFixed(1)} (rectangular, will rotate with player)`)
    
    // Create player collision debug visualization
    this.createPlayerCollisionBox(scene, bodyWidth, bodyHeight)
    
    // Input setup - ensure fresh input handlers
    this.setupInputHandlers(scene)
  }

  private setupInputHandlers(scene: Scene) {
    // Clean up any existing input handlers first
    if (this.cursors) {
      // Phaser automatically manages cursor cleanup, but we can reset the reference
      this.cursors = null as any
    }
    
    // Create fresh input handlers
    this.cursors = scene.input.keyboard!.createCursorKeys()
    this.wasd = scene.input.keyboard!.addKeys('W,S,A,D')
    
    // Ensure the keys are properly initialized and active
    if (this.wasd.W) this.wasd.W.reset()
    if (this.wasd.S) this.wasd.S.reset()
    if (this.wasd.A) this.wasd.A.reset()
    if (this.wasd.D) this.wasd.D.reset()
    
    console.log('Player input handlers initialized:', {
      cursors: !!this.wasd?.W,
      wasd: !!this.wasd,
      W: !!this.wasd?.W,
      S: !!this.wasd?.S
    })
  }



  update(time: number, enemies: Phaser.GameObjects.Group) {
    this.handleMouseRotation()
    this.handleMovement()
    this.handleAutoAttack(time, enemies)
    this.updateUpgradeEffects()
    this.keepInBounds()
    this.updateTrails(time)
    this.updateMovementSound()
    this.updateScythePositions()
    this.updateScytheFlipping(time)
  }

  private updateTrails(time: number) {
    // Safety check: ensure scene exists
    if (!this.scene) {
      return
    }
    
    // Only create trails if the player is moving
    const isMoving = this.wasd.W.isDown || this.wasd.S.isDown
    
    if (isMoving && time - this.lastTrailTime > this.TRAIL_INTERVAL) {
      // Check if we've moved far enough to create a new trail segment
      const distanceMoved = Phaser.Math.Distance.Between(
        this.x, this.y, this.lastTrailX, this.lastTrailY
      )
      
      if (distanceMoved > this.TRAIL_DISTANCE) {
        this.createTrailSegment()
        this.lastTrailTime = time
        this.lastTrailX = this.x
        this.lastTrailY = this.y
      }
    }
    
    // Update existing trail segments (fade them out)
    for (let i = this.trailSegments.length - 1; i >= 0; i--) {
      const segment = this.trailSegments[i]
      const segmentData = segment.getData('trailData') as any
      
      if (segmentData) {
        const age = time - segmentData.createdAt
        const alpha = Math.max(0, 1 - (age / this.TRAIL_LIFETIME))
        
        segment.setAlpha(alpha)
        
        // Remove expired segments
        if (alpha <= 0) {
          if (segment.active) {
            segment.destroy()
          }
          this.trailSegments.splice(i, 1)
        }
      }
    }
  }

  private createTrailSegment() {
    // Safety check: ensure scene exists
    if (!this.scene) {
      return
    }
    
    // Check if player is currently in a blood pool
    this.checkBloodPoolContact()
    
    // Get trail colors for each wheel separately
    const leftWheelColors = this.getLeftWheelTrailColors()
    const rightWheelColors = this.getRightWheelTrailColors()
    
    // Create wheel tracks using Catmull-Rom spline interpolation for smooth curves
    const trailGraphics = this.scene.add.graphics()
    
    // Calculate wheel positions relative to chariot center
    const wheelOffset = 36 // Distance from center to each wheel track (left/right)
    const behindDistance = 100 // Distance behind the chariot
    
    // Calculate the position behind the chariot
    const behindAngle = this.rotation - Math.PI / 2 + Math.PI // Opposite to movement direction
    const behindX = this.x + Math.cos(behindAngle) * behindDistance
    const behindY = this.y + Math.sin(behindAngle) * behindDistance
    
    // Calculate perpendicular direction for wheel spacing (left/right of chariot)
    const perpAngle = this.rotation // Use rotation directly for left/right positioning
    const wheelLeftX = behindX + Math.cos(perpAngle) * wheelOffset
    const wheelLeftY = behindY + Math.sin(perpAngle) * wheelOffset
    const wheelRightX = behindX - Math.cos(perpAngle) * wheelOffset
    const wheelRightY = behindY - Math.sin(perpAngle) * wheelOffset
    
    // Add current wheel positions to history
    this.leftWheelHistory.push({x: wheelLeftX, y: wheelLeftY})
    this.rightWheelHistory.push({x: wheelRightX, y: wheelRightY})
    
    // Keep only the last MAX_HISTORY_POINTS
    if (this.leftWheelHistory.length > this.MAX_HISTORY_POINTS) {
      this.leftWheelHistory.shift()
    }
    if (this.rightWheelHistory.length > this.MAX_HISTORY_POINTS) {
      this.rightWheelHistory.shift()
    }
    
    // Need at least 4 points for Catmull-Rom spline
    if (this.leftWheelHistory.length < 4) {
      // For the first few points, draw simple lines
      if (this.leftWheelHistory.length >= 2) {
        this.drawSimpleTrack(trailGraphics, this.leftWheelHistory, leftWheelColors)
        this.drawSimpleTrack(trailGraphics, this.rightWheelHistory, rightWheelColors)
      }
    } else {
      // Draw smooth spline curves for both wheel tracks with their individual colors
      this.drawSplineTrack(trailGraphics, this.leftWheelHistory, leftWheelColors)
      this.drawSplineTrack(trailGraphics, this.rightWheelHistory, rightWheelColors)
    }
    
    // Set trail data for lifecycle management - with null check
    if (this.scene.time) {
      trailGraphics.setData('trailData', {
        createdAt: this.scene.time.now,
        leftWheelColors: leftWheelColors, // Store colors for left wheel
        rightWheelColors: rightWheelColors // Store colors for right wheel
      })
    }
    
    // Make sure trails follow the world camera and are ignored by UI camera
    trailGraphics.setScrollFactor(1, 1)
    trailGraphics.setDepth(1) // Put trails above background but below other objects
    
    const uiCamera = (this.scene as any).cameras?.cameras[1]
    if (uiCamera) {
      uiCamera.ignore(trailGraphics)
    }
    
    // Add to trail segments array
    this.trailSegments.push(trailGraphics)
  }

  private checkBloodPoolContact() {
    const scene = this.scene as any
    if (!scene) return
    
    const currentTime = scene.time.now
    
    // Clean up old blood pools (older than 10 seconds) - this is now a backup cleanup
    const initialLength = Player.bloodPools.length
    Player.bloodPools = Player.bloodPools.filter(pool => currentTime - pool.createdAt < 10000)
    const finalLength = Player.bloodPools.length
    if (initialLength !== finalLength) {
      console.log(`Cleaned up ${initialLength - finalLength} old blood pools via time-based cleanup`)
    }
    
    // Calculate current wheel positions
    const wheelOffset = 36 // Distance from center to each wheel track (left/right)
    const behindDistance = 100 // Distance behind the chariot
    
    // Calculate the position behind the chariot
    const behindAngle = this.rotation - Math.PI / 2 + Math.PI // Opposite to movement direction
    const behindX = this.x + Math.cos(behindAngle) * behindDistance
    const behindY = this.y + Math.sin(behindAngle) * behindDistance
    
    // Calculate perpendicular direction for wheel spacing (left/right of chariot)
    const perpAngle = this.rotation // Use rotation directly for left/right positioning
    const leftWheelX = behindX + Math.cos(perpAngle) * wheelOffset
    const leftWheelY = behindY + Math.sin(perpAngle) * wheelOffset
    const rightWheelX = behindX - Math.cos(perpAngle) * wheelOffset
    const rightWheelY = behindY - Math.sin(perpAngle) * wheelOffset
    
    // Check if each wheel is within any active blood pool
    let leftWheelFoundBlood = false
    let rightWheelFoundBlood = false
    
    for (const pool of Player.bloodPools) {
      const leftWheelDistance = Phaser.Math.Distance.Between(leftWheelX, leftWheelY, pool.x, pool.y)
      const rightWheelDistance = Phaser.Math.Distance.Between(rightWheelX, rightWheelY, pool.x, pool.y)
      
      if (leftWheelDistance < pool.radius) {
        leftWheelFoundBlood = true
      }
      
      if (rightWheelDistance < pool.radius) {
        rightWheelFoundBlood = true
      }
    }
    
    // Update left wheel blood contact state
    if (leftWheelFoundBlood) {
      if (!this.leftWheelInBlood) {
        // Just entered blood - set the effect start time with delay
        this.rightWheelBloodEffectStartTime = currentTime + this.BLOOD_EFFECT_DELAY
      }
      this.leftWheelInBlood = true
      this.leftWheelBloodContactTime = currentTime
    } else {
      this.leftWheelInBlood = false
    }
    
    // Update right wheel blood contact state
    if (rightWheelFoundBlood) {
      if (!this.rightWheelInBlood) {
        // Just entered blood - set the effect start time with delay
        this.rightWheelBloodEffectStartTime = currentTime + this.BLOOD_EFFECT_DELAY
      }
      this.rightWheelInBlood = true
      this.rightWheelBloodContactTime = currentTime
    } else {
      this.rightWheelInBlood = false
    }
  }

  private getLeftWheelTrailColors(): {mainColor: number, innerColor: number, alpha: number} {
    const currentTime = this.scene.time.now
    const timeSinceBloodContact = currentTime - this.leftWheelBloodContactTime
    
    // If currently in blood or recently contacted blood
    if (this.leftWheelInBlood || timeSinceBloodContact < this.BLOOD_FADE_DURATION) {
      // Calculate fade factor (1.0 = full blood, 0.0 = normal)
      let bloodFactor = 1.0
      if (!this.leftWheelInBlood && timeSinceBloodContact < this.BLOOD_FADE_DURATION) {
        bloodFactor = 1.0 - (timeSinceBloodContact / this.BLOOD_FADE_DURATION)
      }
      
      // Interpolate between normal brown and blood red
      const normalMain = 0x8B4513  // Brown
      const normalInner = 0x654321 // Dark brown
      const bloodMain = 0x8B0000   // Dark red (same as blood splatter)
      const bloodInner = 0x660000  // Darker red
      
      // Linear interpolation between colors
      const mainColor = this.interpolateColor(normalMain, bloodMain, bloodFactor)
      const innerColor = this.interpolateColor(normalInner, bloodInner, bloodFactor)
      
      // Increase alpha slightly for blood trails to make them more visible
      const alpha = 0.4 + (bloodFactor * 0.2) // 0.4 normal, up to 0.6 for blood
      
      return { mainColor, innerColor, alpha }
    }
    
    // Normal trail colors
    return {
      mainColor: 0x8B4513,  // Brown
      innerColor: 0x654321, // Dark brown
      alpha: 0.4
    }
  }

  private getRightWheelTrailColors(): {mainColor: number, innerColor: number, alpha: number} {
    const currentTime = this.scene.time.now
    const timeSinceBloodContact = currentTime - this.rightWheelBloodContactTime
    
    // Check if blood effect should be active (either currently in blood with delay passed, or recently contacted blood)
    const bloodEffectActive = (this.rightWheelInBlood && currentTime >= this.rightWheelBloodEffectStartTime) || 
                             (!this.rightWheelInBlood && timeSinceBloodContact < this.BLOOD_FADE_DURATION)
    
    if (bloodEffectActive) {
      // Calculate fade factor (1.0 = full blood, 0.0 = normal)
      let bloodFactor = 1.0
      if (!this.rightWheelInBlood && timeSinceBloodContact < this.BLOOD_FADE_DURATION) {
        bloodFactor = 1.0 - (timeSinceBloodContact / this.BLOOD_FADE_DURATION)
      } else if (this.rightWheelInBlood && currentTime < this.rightWheelBloodEffectStartTime) {
        // Still in delay period - no blood effect yet
        bloodFactor = 0.0
      }
      
      // Interpolate between normal brown and blood red
      const normalMain = 0x8B4513  // Brown
      const normalInner = 0x654321 // Dark brown
      const bloodMain = 0x8B0000   // Dark red (same as blood splatter)
      const bloodInner = 0x660000  // Darker red
      
      // Linear interpolation between colors
      const mainColor = this.interpolateColor(normalMain, bloodMain, bloodFactor)
      const innerColor = this.interpolateColor(normalInner, bloodInner, bloodFactor)
      
      // Increase alpha slightly for blood trails to make them more visible
      const alpha = 0.4 + (bloodFactor * 0.2) // 0.4 normal, up to 0.6 for blood
      
      return { mainColor, innerColor, alpha }
    }
    
    // Normal trail colors
    return {
      mainColor: 0x8B4513,  // Brown
      innerColor: 0x654321, // Dark brown
      alpha: 0.4
    }
  }

  private interpolateColor(color1: number, color2: number, factor: number): number {
    // Extract RGB components
    const r1 = (color1 >> 16) & 0xFF
    const g1 = (color1 >> 8) & 0xFF
    const b1 = color1 & 0xFF
    
    const r2 = (color2 >> 16) & 0xFF
    const g2 = (color2 >> 8) & 0xFF
    const b2 = color2 & 0xFF
    
    // Interpolate each component
    const r = Math.round(r1 + (r2 - r1) * factor)
    const g = Math.round(g1 + (g2 - g1) * factor)
    const b = Math.round(b1 + (b2 - b1) * factor)
    
    // Combine back into hex color
    return (r << 16) | (g << 8) | b
  }

  private drawSimpleTrack(graphics: Phaser.GameObjects.Graphics, points: Array<{x: number, y: number}>, colors: {mainColor: number, innerColor: number, alpha: number}) {
    if (points.length < 2) return
    
    // Main track line
    graphics.lineStyle(6, colors.mainColor, colors.alpha)
    graphics.beginPath()
    graphics.moveTo(points[0].x, points[0].y)
    
    for (let i = 1; i < points.length; i++) {
      graphics.lineTo(points[i].x, points[i].y)
    }
    
    graphics.strokePath()
    
    // Inner track line
    graphics.lineStyle(3, colors.innerColor, colors.alpha * 0.75)
    graphics.beginPath()
    graphics.moveTo(points[0].x, points[0].y)
    
    for (let i = 1; i < points.length; i++) {
      graphics.lineTo(points[i].x, points[i].y)
    }
    
    graphics.strokePath()
  }

  private drawSplineTrack(graphics: Phaser.GameObjects.Graphics, points: Array<{x: number, y: number}>, colors: {mainColor: number, innerColor: number, alpha: number}) {
    if (points.length < 4) return
    
    // Main track line - thicker and more transparent for sand effect
    graphics.lineStyle(6, colors.mainColor, colors.alpha)
    graphics.beginPath()
    
    // Start from the second point (we need points before and after for interpolation)
    const startPoint = points[1]
    graphics.moveTo(startPoint.x, startPoint.y)
    
    // Draw Catmull-Rom spline through the points
    for (let i = 1; i < points.length - 2; i++) {
      const p0 = points[i - 1]
      const p1 = points[i]
      const p2 = points[i + 1]
      const p3 = points[i + 2]
      
      // Draw curve segment from p1 to p2 using p0 and p3 as control points
      this.drawCatmullRomSegment(graphics, p0, p1, p2, p3)
    }
    
    graphics.strokePath()
    
    // Add subtle depth with darker inner line
    graphics.lineStyle(3, colors.innerColor, colors.alpha * 0.75)
    graphics.beginPath()
    graphics.moveTo(startPoint.x, startPoint.y)
    
    // Redraw the same spline for the inner track
    for (let i = 1; i < points.length - 2; i++) {
      const p0 = points[i - 1]
      const p1 = points[i]
      const p2 = points[i + 1]
      const p3 = points[i + 2]
      
      this.drawCatmullRomSegment(graphics, p0, p1, p2, p3)
    }
    
    graphics.strokePath()
  }

  private drawCatmullRomSegment(
    graphics: Phaser.GameObjects.Graphics,
    p0: {x: number, y: number},
    p1: {x: number, y: number},
    p2: {x: number, y: number},
    p3: {x: number, y: number}
  ) {
    // Number of interpolation steps for smooth curve
    const steps = 10
    
    for (let t = 0; t <= steps; t++) {
      const u = t / steps
      const point = this.catmullRomInterpolate(p0, p1, p2, p3, u)
      
      if (t === 0) {
        graphics.moveTo(point.x, point.y)
      } else {
        graphics.lineTo(point.x, point.y)
      }
    }
  }

  private catmullRomInterpolate(
    p0: {x: number, y: number},
    p1: {x: number, y: number},
    p2: {x: number, y: number},
    p3: {x: number, y: number},
    t: number
  ): {x: number, y: number} {
    const t2 = t * t
    const t3 = t2 * t
    
    // Catmull-Rom spline formula
    const x = 0.5 * (
      (2 * p1.x) +
      (-p0.x + p2.x) * t +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
    )
    
    const y = 0.5 * (
      (2 * p1.y) +
      (-p0.y + p2.y) * t +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
    )
    
    return {x, y}
  }

  private handleMouseRotation() {
    // Safety check: ensure scene and input exist
    if (!this.scene || !this.scene.input || !this.scene.input.activePointer) {
      return // Exit early if scene or input is not available
    }
    
    // Get mouse position in world coordinates
    const pointer = this.scene.input.activePointer
    const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y)
    
    // Calculate distance from player to mouse
    const distance = Phaser.Math.Distance.Between(this.x, this.y, worldPoint.x, worldPoint.y)
    
    // Dead zone - don't rotate if mouse is too close to player center
    const deadZone = 120 // Increased from 50 to 120 pixels
    if (distance < deadZone) {
      return // Keep current rotation
    }
    
    // Calculate target angle from player to mouse
    const targetAngle = Phaser.Math.Angle.Between(this.x, this.y, worldPoint.x, worldPoint.y)
    
    // Add Math.PI/2 since chariot image faces north/up by default
    const adjustedTargetAngle = targetAngle + Math.PI / 2
    
    // Smooth rotation using lerp to prevent jittery movement
    const rotationSpeed = 0.1 // Lower = smoother, higher = more responsive
    this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, adjustedTargetAngle, rotationSpeed)
    
    // Note: Physics body rotation is handled automatically by Phaser for Containers
    // No need to manually sync body.rotation
  }

  private handleMovement() {
    // Don't handle movement if controls are disabled
    if (!this.controlsEnabled) {
      if (this.body) {
        this.body.setVelocity(0, 0)
      }
      return
    }
    
    // Safety check: ensure body exists
    if (!this.body) {
      console.warn('Player body is undefined, cannot handle movement')
      return
    }
    
    // Don't allow movement during round transitions (positioning phase)
    const scene = this.scene as any
    if (scene && scene.isRoundTransition) {
      this.body.setVelocity(0, 0) // Stop any existing movement
      return // Wait for combat phase to begin
    }
    
    const speed = GAME_CONFIG.PLAYER.SPEED
    let velocityX = 0
    let velocityY = 0

    // Forward/backward movement based on current rotation
    if (this.wasd.W.isDown) {
      // Move forward in the direction the chariot is facing
      velocityX = Math.cos(this.rotation - Math.PI / 2) * speed
      velocityY = Math.sin(this.rotation - Math.PI / 2) * speed
    } else if (this.wasd.S.isDown) {
      // Move backward (opposite direction)
      velocityX = Math.cos(this.rotation - Math.PI / 2) * -speed * 0.7 // Slower reverse
      velocityY = Math.sin(this.rotation - Math.PI / 2) * -speed * 0.7
    }

    this.body.setVelocity(velocityX, velocityY)
  }

  private keepInBounds() {
    // Safety check: ensure body exists
    if (!this.body) {
      return
    }
    
    // Manually keep player within world bounds
    if (this.x < 0) this.x = 0
    if (this.x > GAME_CONFIG.WORLD.WIDTH) this.x = GAME_CONFIG.WORLD.WIDTH
    if (this.y < 0) this.y = 0
    if (this.y > GAME_CONFIG.WORLD.HEIGHT) this.y = GAME_CONFIG.WORLD.HEIGHT
  }

  private handleAutoAttack(time: number, enemies: Phaser.GameObjects.Group) {
    // Don't attack during round transitions (positioning phase)
    const scene = this.scene as any
    if (scene && scene.isRoundTransition) {
      return // Wait for combat phase to begin
    }
    
    this.nearestEnemy = this.findNearestEnemy(enemies)
    if (!this.nearestEnemy) return
    
    // Basic attack (always fires)
    if (time - this.lastAttack >= this.attackRate) {
      this.fireBasicAttack(this.nearestEnemy)
      this.lastAttack = time
    }
    
    // Homing Missiles (independent weapon)
    if (this.upgrades.has('homing_missiles') && time - this.lastHomingMissile >= 800) {
      this.fireHomingMissile(this.nearestEnemy)
      this.lastHomingMissile = time
    }
    
    // Explosive Rounds (independent weapon)
    if (this.upgrades.has('explosive_rounds') && time - this.lastExplosiveRound >= 1200) {
      this.fireExplosiveRound(this.nearestEnemy)
      this.lastExplosiveRound = time
    }
    
    // Chain Lightning (independent weapon)
    if (this.upgrades.has('chain_lightning') && time - this.lastChainLightning >= 1500) {
      this.fireChainLightning(this.nearestEnemy)
      this.lastChainLightning = time
    }
    
    // Piercing Arrows (independent weapon)
    if (this.upgrades.has('piercing_arrows') && time - this.lastPiercingArrow >= 600) {
      this.firePiercingArrow(this.nearestEnemy)
      this.lastPiercingArrow = time
    }
  }

  private findNearestEnemy(enemies: Phaser.GameObjects.Group): any {
    let nearest = null
    let minDistance = Infinity
    
    enemies.children.entries.forEach((enemy: any) => {
      // Skip enemies that are still positioning or not combat-ready
      if (enemy.getData('isPositioning') === true) {
        return // Don't target enemies that are still moving to position
      }
      
      if (enemy.getData('combatActive') !== true) {
        return // Don't target enemies that haven't entered combat phase yet
      }
      
      const distance = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y)
      if (distance < minDistance) {
        minDistance = distance
        nearest = enemy
      }
    })
    
    return nearest
  }

  private fireBasicAttack(target: any) {
    const scene = this.scene as any
    if (!scene || typeof scene.createBullet !== 'function') return
    
    // Play explosion sound effect with pitch variation to avoid repetition
    if (scene.sound) {
      try {
        scene.sound.play('explosion', {
          volume: Phaser.Math.FloatBetween(0.05, 0.15), // Reduced volume: 5-15% instead of 10-20%
          rate: Phaser.Math.FloatBetween(0.8, 1.2)    // Random pitch between 80-120% for variety
        })
      } catch (error) {
        // Fallback to canon sound if explosion isn't loaded yet
        scene.sound.play('canon', {
          volume: Phaser.Math.FloatBetween(0.05, 0.15), // Also reduced fallback volume
          rate: Phaser.Math.FloatBetween(0.9, 1.1)
        })
      }
    }
    
    // Create explosion effect at player position when firing
    this.createMuzzleFlash()
    
    if (this.upgrades.has('bullet_storm')) {
      // Bullet storm fires multiple basic bullets
      const level = this.getUpgradeLevel('bullet_storm')
      const bulletCount = 1 + level
      const baseAngle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y)
      
      if (bulletCount === 2) {
        const spreadAngle = 0.3
        for (let i = 0; i < bulletCount; i++) {
          const offset = (i - 0.5) * spreadAngle
          const angle = baseAngle + offset
          const bullet = scene.createBasicBullet(this.x, this.y, angle)
          this.applyBulletUpgrades(bullet)
        }
      } else {
        for (let i = 0; i < bulletCount; i++) {
          const angle = baseAngle + (i * Math.PI * 2) / bulletCount
          const bullet = scene.createBasicBullet(this.x, this.y, angle)
          this.applyBulletUpgrades(bullet)
        }
      }
    } else {
      // Single basic bullet
      const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y)
      const bullet = scene.createBasicBullet(this.x, this.y, angle)
      this.applyBulletUpgrades(bullet)
    }
  }
  
  private applyBulletUpgrades(bullet: any) {
    if (!bullet) return
    
    // Apply ricochet upgrade
    if (this.upgrades.has('ricochet')) {
      bullet.enableRicochet()
      const ricochetLevel = this.getUpgradeLevel('ricochet')
      bullet.setRicochetLevel(ricochetLevel)
    }
  }

  private createMuzzleFlash() {
    const scene = this.scene as any
    if (!scene) return
    
    // Reuse existing muzzle flash graphics to prevent constant creation/destruction
    if (this.muzzleFlashGraphics && this.muzzleFlashGraphics.active) {
      // Stop existing tween
      if (this.muzzleFlashTween) {
        this.muzzleFlashTween.destroy()
      }
      // Reset and reuse
      this.muzzleFlashGraphics.setAlpha(1)
      this.muzzleFlashGraphics.setVisible(true)
    } else {
      // Create new muzzle flash graphics only if needed
      this.muzzleFlashGraphics = scene.add.graphics()
      if (this.muzzleFlashGraphics) {
        this.muzzleFlashGraphics.fillStyle(0xff6600, 0.8)
        this.muzzleFlashGraphics.fillCircle(0, 0, 15)
        this.muzzleFlashGraphics.fillStyle(0xffaa00, 0.6)
        this.muzzleFlashGraphics.fillCircle(0, 0, 10)
        this.muzzleFlashGraphics.fillStyle(0xffffff, 0.4)
        this.muzzleFlashGraphics.fillCircle(0, 0, 5)
        
        // Add small explosion particles
        this.muzzleFlashGraphics.lineStyle(2, 0xff3300, 0.8)
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2
          const startRadius = 8
          const endRadius = 20
          this.muzzleFlashGraphics.beginPath()
          this.muzzleFlashGraphics.moveTo(
            Math.cos(angle) * startRadius,
            Math.sin(angle) * startRadius
          )
          this.muzzleFlashGraphics.lineTo(
            Math.cos(angle) * endRadius,
            Math.sin(angle) * endRadius
          )
          this.muzzleFlashGraphics.strokePath()
        }
      }
      
      if (this.muzzleFlashGraphics) {
        this.add(this.muzzleFlashGraphics)
        this.muzzleFlashGraphics.setDepth(1050)
      }
    }
    
    // Animate fade out
    if (this.muzzleFlashGraphics) {
      this.muzzleFlashTween = scene.tweens.add({
        targets: this.muzzleFlashGraphics,
        alpha: 0,
        duration: 150,
        ease: 'Power2.easeOut',
        onComplete: () => {
          if (this.muzzleFlashGraphics) {
            this.muzzleFlashGraphics.setVisible(false)
          }
        }
      })
    }
  }

  private fireHomingMissile(target: any) {
    const scene = this.scene as any
    if (!scene || typeof scene.createHomingMissile !== 'function') return
    
    // Play rockets sound for homing missiles
    if (scene.sound) {
      scene.sound.play('rockets', {
        volume: Phaser.Math.FloatBetween(0.4, 0.5), // Slightly louder for missiles
        rate: Phaser.Math.FloatBetween(0.9, 1.1)   // More pitch variation for variety
      })
    }
    
    const level = this.getUpgradeLevel('homing_missiles')
    const missileCount = level // Level 1: 1 missile, Level 2: 2 missiles, etc.
    
    for (let i = 0; i < missileCount; i++) {
      const baseAngle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y)
      const spreadAngle = missileCount > 1 ? (i - (missileCount - 1) / 2) * 0.4 : 0
      const angle = baseAngle + spreadAngle
      
      scene.createHomingMissile(this.x, this.y, angle, level)
    }
  }

  private fireExplosiveRound(target: any) {
    const scene = this.scene as any
    if (!scene || typeof scene.createExplosiveRound !== 'function') return
    
    const level = this.getUpgradeLevel('explosive_rounds')
    const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y)
    
    scene.createExplosiveRound(this.x, this.y, angle, level)
  }

  private fireChainLightning(target: any) {
    const scene = this.scene as any
    if (!scene || typeof scene.createChainLightning !== 'function') return
    
    // Chain lightning can use a modified rockets sound for electrical feel
    if (scene.sound) {
      scene.sound.play('rockets', {
        volume: Phaser.Math.FloatBetween(0.3, 0.4), // Quieter for lightning
        rate: Phaser.Math.FloatBetween(1.2, 1.4)   // Higher pitch for electrical sound
      })
    }
    
    const level = this.getUpgradeLevel('chain_lightning')
    const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y)
    
    scene.createChainLightning(this.x, this.y, angle, level)
  }

  private firePiercingArrow(target: any) {
    const scene = this.scene as any
    if (!scene || typeof scene.createPiercingArrow !== 'function') return
    
    // Play arrow sound for piercing arrows
    if (scene.sound) {
      scene.sound.play('arrow', {
        volume: Phaser.Math.FloatBetween(0.4, 0.5), // Good volume for arrows
        rate: Phaser.Math.FloatBetween(0.95, 1.05)  // Slight pitch variation
      })
    }
    
    const level = this.getUpgradeLevel('piercing_arrows')
    const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y)
    
    scene.createPiercingArrow(this.x, this.y, angle, level)
  }

  public addUpgrade(upgradeId: string) {
    this.upgrades.add(upgradeId)
  }

  public getUpgradeLevel(upgradeId: string): number {
    return this.upgradelevels.get(upgradeId) || 0
  }

  public setUpgradeLevel(upgradeId: string, level: number) {
    this.upgradelevels.set(upgradeId, level)
  }

  private updateUpgradeEffects() {
    // Progressive shield regeneration - reduced effectiveness
    if (this.upgrades.has('shield_regen') && this.health < this.maxHealth) {
      const level = this.getUpgradeLevel('shield_regen')
      const regenRate = level * 0.10 // Reduced from 0.15 to 0.10 per second
      this.health = Math.min(this.maxHealth, this.health + (regenRate / 60)) // Per frame
    }
  }

  public gainXP(amount: number) {
    this.xp += amount
    const xpNeeded = GAME_CONFIG.LEVELING.BASE_XP * Math.pow(GAME_CONFIG.LEVELING.XP_MULTIPLIER, this.level - 1)
    
    if (this.xp >= xpNeeded) {
      this.levelUp()
    }
  }

  private levelUp() {
    this.level++
    this.xp = 0
    
    // Check if this is a chariot upgrade level (5, 10, 15)
    if (this.level === 5 || this.level === 10 || this.level === 15) {
      this.upgradeChariot()
    }
    
    const scene = this.scene as any
    // Validate scene exists and has the showCardSelection method
    if (scene && typeof scene.showCardSelection === 'function') {
      scene.showCardSelection()
    } else {
      console.warn('Scene or showCardSelection method not available')
    }
  }

  public takeDamage(amount: number) {
    this.health -= amount
    
    // Play alternating hit sounds to avoid repetition
    const hitSound = this.lastHitSound === 'hit1' ? 'hit2' : 'hit1'
    this.lastHitSound = hitSound
    
    // Play alternating horse sounds to avoid repetition
    const horseSound = this.lastHorseSound === 'horse' ? 'horse2' : 'horse'
    this.lastHorseSound = horseSound
    
    // Play the hit sound with some variation in volume and pitch for more variety
    const scene = this.scene as any
    if (scene && scene.sound) {
      scene.sound.play(hitSound, {
        volume: Phaser.Math.FloatBetween(0.6, 0.8), // Slight volume variation
        rate: Phaser.Math.FloatBetween(0.9, 1.1)    // Slight pitch variation
      })
      
      // Also play alternating horse sound when player gets hurt
      scene.sound.play(horseSound, {
        volume: Phaser.Math.FloatBetween(0.5, 0.7), // Slightly quieter than hit sounds
        rate: Phaser.Math.FloatBetween(0.95, 1.05)  // Slight pitch variation
      })
    }
    
    if (this.upgrades.has('slow_time')) {
      const scene = this.scene as any
      if (scene && scene.time) {
        // Get the upgrade level for progressive slow time effect
        const level = this.getUpgradeLevel('slow_time')
        const slowFactor = level === 1 ? 0.3 : 0.15 // Level 1: 30% speed, Level 2: 15% speed
        const duration = level === 1 ? 2000 : 3000 // Level 1: 2s, Level 2: 3s
        
        // Set global slow time flag on the scene
        scene.slowTimeActive = true
        scene.slowTimeFactor = slowFactor
        
        // Visual effect - tint the screen slightly blue during slow time
        const slowTimeOverlay = scene.add.graphics()
        slowTimeOverlay.fillStyle(0x0088ff, 0.25)
        slowTimeOverlay.fillRect(0, 0, scene.sys.game.config.width, scene.sys.game.config.height)
        slowTimeOverlay.setScrollFactor(0)
        slowTimeOverlay.setDepth(1500) // Below UI but above everything else
        
        // Make sure UI camera ignores the overlay
        const uiCamera = scene.cameras.cameras[1]
        if (uiCamera) {
          scene.cameras.main.ignore(slowTimeOverlay)
        }
        
        // Clear any existing time scale reset timers to prevent conflicts
        if (scene.timeScaleResetTimer) {
          scene.timeScaleResetTimer.destroy()
        }
        
        // Reset everything after the duration
        scene.timeScaleResetTimer = scene.time.delayedCall(duration, () => {
          // Clear slow time flag
          scene.slowTimeActive = false
          scene.slowTimeFactor = 1.0
          
          // FIXED: Properly destroy the overlay instead of just fading it
          if (slowTimeOverlay && slowTimeOverlay.active) {
            slowTimeOverlay.destroy()
          }
          
          scene.timeScaleResetTimer = null
          console.log('Slow time effect ended - enemies back to normal speed')
        })
        
        console.log(`Slow time activated! Level ${level}, Enemy speed: ${(slowFactor * 100).toFixed(0)}%, Duration: ${duration}ms`)
      }
    }
    
    if (this.health <= 0) {
      this.health = 0 // Ensure health doesn't go negative
      this.triggerGameOver()
    }
  }

  private triggerGameOver() {
    const scene = this.scene as any
    
    // Validate scene exists and has the showGameOver method
    if (scene && typeof scene.showGameOver === 'function') {
      scene.showGameOver()
    } else {
      console.warn('Scene or showGameOver method not available')
    }
    
    // Don't destroy the player immediately - let the game over screen handle it
  }

  private upgradeChariot() {
    // Determine which chariot sprite to use based on level
    let chariotKey = 'chariot' // Default chariot
    
    if (this.level >= 15) {
      chariotKey = 'chariot4'
    } else if (this.level >= 10) {
      chariotKey = 'chariot3'
    } else if (this.level >= 5) {
      chariotKey = 'chariot2'
    }
    
    // Actually change the chariot sprite texture
    this.chariotSprite.setTexture(chariotKey)
    
    // Add a visual effect to make the upgrade obvious - with null checks
    if (this.scene && this.scene.tweens) {
      this.scene.tweens.add({
        targets: this.chariotSprite,
        scaleX: 0.25,
        scaleY: 0.25,
        duration: 200,
        yoyo: true,
        ease: 'Power2'
      })
    }
    
    console.log(`🚗 CHARIOT UPGRADED! Level ${this.level} -> ${chariotKey}`)
    console.log('Chariot sprite texture is now:', this.chariotSprite.texture.key)
  }

  private updateMovementSound() {
    // Check if player is currently moving
    this.isMoving = this.wasd.W.isDown || this.wasd.S.isDown
    
    // Handle movement sound state changes
    if (this.isMoving && !this.wasMovingLastFrame) {
      // Started moving - play trot sound
      if (this.trotSound && !this.trotSound.isPlaying) {
        this.trotSound.play()
      }
    } else if (!this.isMoving && this.wasMovingLastFrame) {
      // Stopped moving - stop trot sound
      if (this.trotSound && this.trotSound.isPlaying) {
        this.trotSound.stop()
      }
    }
    
    // Update previous frame state
    this.wasMovingLastFrame = this.isMoving
  }

  public disableControls(): void {
    this.controlsEnabled = false
    
    // Completely disable keyboard input to allow HTML input to receive all keys
    if (this.scene.input && this.scene.input.keyboard) {
      this.scene.input.keyboard.enabled = false
    }
    
    // Also remove WASD key listeners specifically
    if (this.wasd) {
      this.wasd = null
    }
  }

  public enableControls(): void {
    this.controlsEnabled = true
    
    // Re-enable keyboard input
    if (this.scene.input && this.scene.input.keyboard) {
      this.scene.input.keyboard.enabled = true
    }
    
    // Recreate WASD key listeners
    this.wasd = this.scene.input.keyboard!.addKeys('W,S,A,D')
  }
  

  
  public areScythesVisible(): boolean {
    return this.scythesVisible && this.upgrades.has('scythe')
  }

  public showScythes(): void {
    if (this.upgrades.has('scythe') && this.leftScythe && this.rightScythe) {
      this.scythesVisible = true
      this.leftScythe.setVisible(true)
      this.rightScythe.setVisible(true)
      // Note: Collision boxes remain hidden by default (use 'C' key to toggle)
    }
  }

  public hideScythes(): void {
    this.scythesVisible = false
    if (this.leftScythe && this.rightScythe) {
      this.leftScythe.setVisible(false)
      this.rightScythe.setVisible(false)
    }
    // Hide collision boxes when scythes are hidden
    this.hideScytheCollisionBoxes()
  }
  
  private createScytheCollisionBoxes(scene: Scene): void {
    // Create left scythe collision box (oval extending further left)
    this.leftScytheCollisionBox = scene.add.graphics()
    this.leftScytheCollisionBox.lineStyle(2, 0xff0000, 0.8) // Red outline, 80% opacity
    this.leftScytheCollisionBox.strokeEllipse(-42.4 - this.SCYTHE_COLLISION_OFFSET, 48.0, this.SCYTHE_COLLISION_WIDTH, this.SCYTHE_COLLISION_HEIGHT)
    this.leftScytheCollisionBox.setVisible(false) // Hidden by default
    this.add(this.leftScytheCollisionBox)
    
    // Create right scythe collision box (oval extending further right)
    this.rightScytheCollisionBox = scene.add.graphics()
    this.rightScytheCollisionBox.lineStyle(2, 0x00ff00, 0.8) // Green outline, 80% opacity
    this.rightScytheCollisionBox.strokeEllipse(40.8 + this.SCYTHE_COLLISION_OFFSET, 51.2, this.SCYTHE_COLLISION_WIDTH, this.SCYTHE_COLLISION_HEIGHT)
    this.rightScytheCollisionBox.setVisible(false) // Hidden by default
        this.add(this.rightScytheCollisionBox)
  }

  private createPlayerCollisionBox(scene: Scene, width: number, height: number): void {
    // Create player collision box (rectangle that rotates with player)
    this.playerCollisionBox = scene.add.graphics()
    this.playerCollisionBox.lineStyle(3, 0x0000ff, 0.9) // Blue outline, 90% opacity
    this.playerCollisionBox.strokeRect(-width / 2, -height / 2, width, height)
    this.playerCollisionBox.setVisible(false) // Hidden by default
    this.add(this.playerCollisionBox)
  }




  
  private hideScytheCollisionBoxes(): void {
    if (this.leftScytheCollisionBox && this.rightScytheCollisionBox) {
      this.leftScytheCollisionBox.setVisible(false)
      this.rightScytheCollisionBox.setVisible(false)
    }
  }
  
  // Debug method to toggle collision boxes (for testing)
  public toggleScytheCollisionBoxes(): void {
    if (this.leftScytheCollisionBox && this.rightScytheCollisionBox && this.playerCollisionBox) {
      const isVisible = this.leftScytheCollisionBox.visible
      this.leftScytheCollisionBox.setVisible(!isVisible)
      this.rightScytheCollisionBox.setVisible(!isVisible)
      this.playerCollisionBox.setVisible(!isVisible)
      console.log(`All collision boxes ${!isVisible ? 'shown' : 'hidden'} (Player: blue rectangle, Scythes: red/green ovals)`)
    }
  }
  
  // Debug method to toggle scythe upgrade (for testing)
  public toggleScytheUpgrade(): void {
    if (this.upgrades.has('scythe')) {
      // Remove scythe upgrade
      this.upgrades.delete('scythe')
      this.upgradelevels.delete('scythe')
      this.hideScythes()
      console.log('Scythe upgrade removed for testing')
    } else {
      // Add scythe upgrade
      this.upgrades.add('scythe')
      this.setUpgradeLevel('scythe', 1)
      this.showScythes()
      console.log('Scythe upgrade added for testing (Level 1)')
    }
  }
  
  // Check if enemy would be hit by scythes (used to prevent player damage)
  public wouldScytheHitEnemy(enemy: any): boolean {
    if (!this.scythesVisible || !this.upgrades.has('scythe')) {
      console.log('Scythe priority check failed: scythes not visible or no upgrade')
      return false
    }
    
    const leftScytheX = this.x + (-42.4 - this.SCYTHE_COLLISION_OFFSET)
    const leftScytheY = this.y + 48.0
    const rightScytheX = this.x + (40.8 + this.SCYTHE_COLLISION_OFFSET)
    const rightScytheY = this.y + 51.2
    
    const enemyX = enemy.x
    const enemyY = enemy.y
    
    // Use much larger collision areas for priority check (very aggressive protection)
    const priorityWidth = this.SCYTHE_COLLISION_WIDTH + 30
    const priorityHeight = this.SCYTHE_COLLISION_HEIGHT + 30
    
    console.log(`Priority check: Player at (${this.x.toFixed(1)}, ${this.y.toFixed(1)}), Enemy at (${enemyX.toFixed(1)}, ${enemyY.toFixed(1)})`)
    console.log(`Left scythe at (${leftScytheX.toFixed(1)}, ${leftScytheY.toFixed(1)}), Right scythe at (${rightScytheX.toFixed(1)}, ${rightScytheY.toFixed(1)})`)
    console.log(`Priority collision size: ${priorityWidth}x${priorityHeight}`)
    
    // Check if enemy is in either scythe collision area with priority buffer
    const leftHit = this.isPointInEllipse(enemyX, enemyY, leftScytheX, leftScytheY, priorityWidth, priorityHeight)
    const rightHit = this.isPointInEllipse(enemyX, enemyY, rightScytheX, rightScytheY, priorityWidth, priorityHeight)
    
    console.log(`Priority collision results: Left=${leftHit}, Right=${rightHit}`)
    
    if (leftHit || rightHit) {
      console.log(`SCYTHE PRIORITY ACTIVATED: Enemy would be hit by ${leftHit ? 'left' : 'right'} scythe`)
      return true
    }
    
    console.log('No scythe priority - enemy will damage player')
    return false
  }
  
  // Process immediate scythe damage when enemy touches player but is in scythe range
  public processImmediateScytheDamage(enemy: any): void {
    console.log('processImmediateScytheDamage called')
    
    if (!this.scythesVisible || !this.upgrades.has('scythe')) {
      console.log('processImmediateScytheDamage failed: scythes not visible or no upgrade')
      return
    }
    
    const currentTime = Date.now()
    const leftScytheX = this.x + (-42.4 - this.SCYTHE_COLLISION_OFFSET)
    const leftScytheY = this.y + 48.0
    const rightScytheX = this.x + (40.8 + this.SCYTHE_COLLISION_OFFSET)
    const rightScytheY = this.y + 51.2
    
    const enemyX = enemy.x
    const enemyY = enemy.y
    const enemyId = enemy.id || enemy.x + enemy.y
    
    console.log(`Immediate damage check: Enemy at (${enemyX.toFixed(1)}, ${enemyY.toFixed(1)})`)
    console.log(`Immediate scythe positions: Left (${leftScytheX.toFixed(1)}, ${leftScytheY.toFixed(1)}), Right (${rightScytheX.toFixed(1)}, ${rightScytheY.toFixed(1)})`)
    
    // Check if enemy was hit recently (respect cooldown)
    const lastHitTime = this.scytheHitMap.get(enemyId) || 0
    if (currentTime - lastHitTime < this.SCYTHE_HIT_COOLDOWN) {
      console.log('Scythe hit blocked by cooldown - enemy should not damage player either')
      return // Don't damage enemy again, but also don't let enemy damage player
    }
    
    // Check which scythe should hit the enemy
    const leftHit = this.isPointInEllipse(enemyX, enemyY, leftScytheX, leftScytheY, this.SCYTHE_COLLISION_WIDTH, this.SCYTHE_COLLISION_HEIGHT)
    const rightHit = this.isPointInEllipse(enemyX, enemyY, rightScytheX, rightScytheY, this.SCYTHE_COLLISION_WIDTH, this.SCYTHE_COLLISION_HEIGHT)
    
    console.log(`Immediate collision results: Left=${leftHit}, Right=${rightHit}`)
    
    if (leftHit) {
      this.damageEnemyWithScythe(enemy, enemyId, currentTime, 'left')
      console.log('✅ Immediate left scythe damage processed successfully')
    } else if (rightHit) {
      this.damageEnemyWithScythe(enemy, enemyId, currentTime, 'right')
      console.log('✅ Immediate right scythe damage processed successfully')
    } else {
      console.log('❌ No immediate scythe hit detected - this should not happen!')
    }
  }
  
  // Check for scythe collisions with enemies
  public checkScytheCollisions(enemies: Phaser.GameObjects.Group): void {
    if (!this.scythesVisible || !this.upgrades.has('scythe')) return
    
    const currentTime = Date.now()
    const leftScytheX = this.x + (-42.4 - this.SCYTHE_COLLISION_OFFSET)
    const leftScytheY = this.y + 48.0
    const rightScytheX = this.x + (40.8 + this.SCYTHE_COLLISION_OFFSET)
    const rightScytheY = this.y + 51.2
    
    let enemiesChecked = 0
    let enemiesInRange = 0
    
    enemies.children.entries.forEach((enemy: any) => {
      if (!enemy.active) return
      
      enemiesChecked++
      const enemyId = enemy.id || enemy.x + enemy.y // Use ID or fallback to position
      const lastHitTime = this.scytheHitMap.get(enemyId) || 0
      
      // Check cooldown
      if (currentTime - lastHitTime < this.SCYTHE_HIT_COOLDOWN) return
      
      const enemyX = enemy.x
      const enemyY = enemy.y
      
      // Check left scythe collision (oval)
      if (this.isPointInEllipse(enemyX, enemyY, leftScytheX, leftScytheY, this.SCYTHE_COLLISION_WIDTH, this.SCYTHE_COLLISION_HEIGHT)) {
        enemiesInRange++
        this.damageEnemyWithScythe(enemy, enemyId, currentTime, 'left')
        return // Don't check right scythe if left already hit
      }
      
      // Check right scythe collision (oval)
      if (this.isPointInEllipse(enemyX, enemyY, rightScytheX, rightScytheY, this.SCYTHE_COLLISION_WIDTH, this.SCYTHE_COLLISION_HEIGHT)) {
        enemiesInRange++
        this.damageEnemyWithScythe(enemy, enemyId, currentTime, 'right')
      }
    })
    
    // Debug logging every 30 frames (about once per second)
    if (this.scene && (this.scene as any).updateCounter && (this.scene as any).updateCounter % 30 === 0) {
      console.log(`Scythe collision check: ${enemiesChecked} enemies checked, ${enemiesInRange} in range`)
    }
  }
  
  private isPointInEllipse(pointX: number, pointY: number, ellipseX: number, ellipseY: number, width: number, height: number): boolean {
    const dx = pointX - ellipseX
    const dy = pointY - ellipseY
    const a = width / 2
    const b = height / 2
    const ellipseResult = (dx * dx) / (a * a) + (dy * dy) / (b * b) <= 1
    
    // Also check simple distance as backup
    const distance = Math.sqrt(dx * dx + dy * dy)
    const maxRadius = Math.max(a, b)
    const distanceResult = distance <= maxRadius
    
    // Use the more generous result for now (testing)
    const result = ellipseResult || distanceResult
    
    if (result) {
      console.log(`Collision detected! Point (${pointX.toFixed(1)}, ${pointY.toFixed(1)}) vs Ellipse (${ellipseX.toFixed(1)}, ${ellipseY.toFixed(1)}) size ${width}x${height}`)
      console.log(`  Distance: ${distance.toFixed(1)} vs MaxRadius: ${maxRadius.toFixed(1)} = ${distanceResult}`)
      console.log(`  Ellipse: ${((dx * dx) / (a * a) + (dy * dy) / (b * b)).toFixed(3)} <= 1 = ${ellipseResult}`)
    }
    
    return result
  }
  
  private damageEnemyWithScythe(enemy: any, enemyId: number, currentTime: number, scytheSide: 'left' | 'right'): void {
    const scytheDamage = this.getScytheDamage()
    
    // Apply damage
    enemy.takeDamage(scytheDamage)
    
    // Record hit time
    this.scytheHitMap.set(enemyId, currentTime)
    
    // Apply knockback effect to push enemy away from player
    this.applyScytheKnockback(enemy, scytheSide)
    
    // Add visual/audio effects
    this.createScytheHitEffect(enemy.x, enemy.y, scytheSide)
    
    console.log(`${scytheSide} scythe hit enemy for ${scytheDamage} damage with knockback`)
  }
  
  private getScytheDamage(): number {
    const scytheLevel = this.getUpgradeLevel('scythe')
    return this.SCYTHE_BASE_DAMAGE + (scytheLevel * 15) // +15 damage per level
  }

  private applyScytheKnockback(enemy: any, scytheSide: 'left' | 'right'): void {
    if (!enemy.body) return // Safety check for physics body
    
    // Calculate knockback direction based on scythe side and player position
    const angleFromPlayer = Phaser.Math.Angle.Between(this.x, this.y, enemy.x, enemy.y)
    
    // Adjust angle based on which scythe hit (left scythe pushes more left, right scythe pushes more right)
    let knockbackAngle = angleFromPlayer
    if (scytheSide === 'left') {
      // Left scythe pushes enemy more to the left relative to player
      knockbackAngle += Math.PI * 0.25 // 45 degrees left
    } else {
      // Right scythe pushes enemy more to the right relative to player
      knockbackAngle -= Math.PI * 0.25 // 45 degrees right
    }
    
    // Calculate knockback velocity
    const knockbackX = Math.cos(knockbackAngle) * this.SCYTHE_KNOCKBACK_FORCE
    const knockbackY = Math.sin(knockbackAngle) * this.SCYTHE_KNOCKBACK_FORCE
    
    // Apply immediate velocity change
    enemy.body.setVelocity(knockbackX, knockbackY)
    
    // Create tween to gradually reduce the knockback over time
    const scene = this.scene as any
    if (scene && scene.tweens) {
      scene.tweens.add({
        targets: enemy.body.velocity,
        x: 0,
        y: 0,
        duration: this.SCYTHE_KNOCKBACK_DURATION,
        ease: 'Power2'
      })
    }
    
    console.log(`Applied ${scytheSide} scythe knockback: angle ${(knockbackAngle * 180 / Math.PI).toFixed(1)}°, force ${this.SCYTHE_KNOCKBACK_FORCE}`)
  }
  
  private createScytheHitEffect(x: number, y: number, scytheSide: 'left' | 'right'): void {
    const scene = this.scene as any
    if (!scene) return
    
    // Create blood effect at hit location
    const hitEffect = scene.add.graphics()
    const color = scytheSide === 'left' ? 0xff4444 : 0x44ff44 // Red for left, green for right
    hitEffect.fillStyle(color, 0.8)
    hitEffect.fillCircle(x, y, 8)
    hitEffect.setDepth(1000)
    
    // Fade out effect
    scene.tweens.add({
      targets: hitEffect,
      alpha: 0,
      scale: 1.5,
      duration: 200,
      onComplete: () => {
        hitEffect.destroy()
      }
    })
    
    // Play alternating scythe hit sounds (never the same back-to-back)
    if (scene.sound) {
      let scytheSound: string
      if (this.lastScytheSound === 'scythehit1') {
        scytheSound = 'scythehit2'
      } else {
        scytheSound = 'scythehit1'
      }
      
      scene.sound.play(scytheSound, {
        volume: 0.15, // Reduced by 75% from 0.6 to 0.15
        rate: Phaser.Math.FloatBetween(0.95, 1.05) // Slight pitch variation
      })
      
      // Update last sound played
      this.lastScytheSound = scytheSound
    }
  }


  
    private updateScythePositions(): void {
    // Since scythes are children of the Player container, their relative positions
    // and rotations are maintained automatically during container rotation.
    // No updates needed - the container handles everything!
  }

  private updateScytheFlipping(time: number): void {
    // Only flip scythes when they are visible and the player is moving
    if (this.scythesVisible && this.isMoving && this.leftScythe && this.rightScythe) {
      // Check if it's time to flip
      if (time - this.scytheFlipTimer >= this.SCYTHE_FLIP_INTERVAL) {
        this.scythesFlipped = !this.scythesFlipped
        
        // Flip both scythes vertically
        this.leftScythe.setFlipY(this.scythesFlipped)
        this.rightScythe.setFlipY(this.scythesFlipped)
        
        // Update the timer
        this.scytheFlipTimer = time
      }
    } else if (this.scythesVisible && !this.isMoving && this.leftScythe && this.rightScythe) {
      // Reset to normal orientation when stopped
      this.leftScythe.setFlipY(false)
      this.rightScythe.setFlipY(false)
      this.scythesFlipped = false
    }
  }



  destroy() {
    // Clean up movement sound
    if (this.trotSound) {
      if (this.trotSound.isPlaying) {
        this.trotSound.stop()
      }
      this.trotSound.destroy()
      this.trotSound = null
    }
    
    // Clean up trail segments
    this.trailSegments.forEach(segment => {
      if (segment && segment.active) {
        segment.destroy()
      }
    })
    this.trailSegments = []
    
    // Clean up muzzle flash
    if (this.muzzleFlashTween) {
      this.muzzleFlashTween.destroy()
      this.muzzleFlashTween = null
    }
    if (this.muzzleFlashGraphics) {
      this.muzzleFlashGraphics.destroy()
      this.muzzleFlashGraphics = null
    }
    
    // Clean up scythes
    if (this.leftScythe) {
      this.leftScythe.destroy()
      this.leftScythe = null
    }
    if (this.rightScythe) {
      this.rightScythe.destroy()
      this.rightScythe = null
    }
    
    // Clean up collision boxes
    if (this.leftScytheCollisionBox) {
      this.leftScytheCollisionBox.destroy()
      this.leftScytheCollisionBox = null
    }
    if (this.rightScytheCollisionBox) {
      this.rightScytheCollisionBox.destroy()
      this.rightScytheCollisionBox = null
    }
    
    // Clean up scythe hit map
    this.scytheHitMap.clear()
    
    super.destroy()
  }
  
  // Static method to register blood pools when enemies die
  public static registerBloodPool(x: number, y: number, radius: number): number {
    const currentTime = Date.now()
    const bloodPoolId = Date.now() + Math.random() // Create unique ID
    Player.bloodPools.push({ id: bloodPoolId, x, y, radius, createdAt: currentTime })
    console.log('Blood pool registered at:', { id: bloodPoolId, x, y, radius })
    return bloodPoolId
  }
  
  // Static method to remove blood pools when they fade out
  public static removeBloodPool(bloodPoolId: number) {
    const initialLength = Player.bloodPools.length
    Player.bloodPools = Player.bloodPools.filter(pool => pool.id !== bloodPoolId)
    const finalLength = Player.bloodPools.length
    console.log(`Blood pool ${bloodPoolId} removed. Pools: ${initialLength} -> ${finalLength}`)
  }
  
  private static bloodPools: Array<{id: number, x: number, y: number, radius: number, createdAt: number}> = []
}
