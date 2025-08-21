
// src/game/utils/UIManager.ts

import { Scene } from 'phaser'
import { COLORS, GAME_CONFIG } from '../config/constants'

export class UIManager {
  private scene: Scene
  private player: any
  private gameTime: number = 0
  
  // UI Elements
  private healthBar!: Phaser.GameObjects.Graphics
  private xpBar!: Phaser.GameObjects.Graphics
  private levelText!: Phaser.GameObjects.Text
  private timeText!: Phaser.GameObjects.Text
  private roundText!: Phaser.GameObjects.Text
  private enemyCountText!: Phaser.GameObjects.Text

  constructor(scene: Scene, player: any) {
    this.scene = scene
    this.player = player
  }

  public createUI(_uiCamera: Phaser.Cameras.Scene2D.Camera): void {
    const cornerX = 5
    const cornerY = 5
    
    this.levelText = this.scene.add.text(cornerX, cornerY, 'Level: 1', {
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.9)',
      padding: { x: 6, y: 3 }
    })
    this.levelText.setOrigin(0, 0)
    this.levelText.setDepth(1000)
    
    this.timeText = this.scene.add.text(cornerX, cornerY + 25, 'Time: 0:00', {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.9)',
      padding: { x: 6, y: 3 }
    })
    this.timeText.setOrigin(0, 0)
    this.timeText.setDepth(1000)
    
    this.roundText = this.scene.add.text(cornerX, cornerY + 50, 'Round: 1', {
      fontSize: '16px',
      color: '#ffff00',
      backgroundColor: 'rgba(0,0,0,0.9)',
      padding: { x: 6, y: 3 }
    })
    this.roundText.setOrigin(0, 0)
    this.roundText.setDepth(1000)
    
    this.enemyCountText = this.scene.add.text(cornerX, cornerY + 75, 'Enemies: 0/10', {
      fontSize: '14px',
      color: '#ff6666',
      backgroundColor: 'rgba(0,0,0,0.9)',
      padding: { x: 6, y: 3 }
    })
    this.enemyCountText.setOrigin(0, 0)
    this.enemyCountText.setDepth(1000)
    
    this.healthBar = this.scene.add.graphics()
    this.healthBar.setDepth(1000)
    
    this.xpBar = this.scene.add.graphics()
    this.xpBar.setDepth(1000)
    
    // Make main camera ignore UI elements
    this.scene.cameras.main.ignore([
      this.levelText, 
      this.timeText, 
      this.roundText, 
      this.enemyCountText, 
      this.healthBar, 
      this.xpBar
    ])
  }

  public updateUI(
    _gameTime: number, 
    currentRound: number, 
    enemiesKilled: number, 
    enemiesNeeded: number
  ) {
    this.gameTime = _gameTime
    
    const cornerX = 5
    const cornerY = 5
    const barWidth = 150
    const barHeight = 12
    const healthBarY = cornerY + 100
    const xpBarY = cornerY + 116
    
    // Clear and redraw health bar
    this.healthBar.clear()
    this.healthBar.fillStyle(COLORS.UI_DARK)
    this.healthBar.fillRoundedRect(cornerX, healthBarY, barWidth, barHeight, 3)
    this.healthBar.fillStyle(COLORS.DANGER)
    const healthPercent = this.player.health / this.player.maxHealth
    this.healthBar.fillRoundedRect(cornerX + 2, healthBarY + 2, (barWidth - 4) * healthPercent, barHeight - 4, 2)
    
    // Clear and redraw XP bar
    this.xpBar.clear()
    this.xpBar.fillStyle(COLORS.UI_DARK)
    this.xpBar.fillRoundedRect(cornerX, xpBarY, barWidth, barHeight, 3)
    this.xpBar.fillStyle(COLORS.ACCENT)
    const xpNeeded = GAME_CONFIG.LEVELING.BASE_XP * Math.pow(GAME_CONFIG.LEVELING.XP_MULTIPLIER, this.player.level - 1)
    const xpPercent = this.player.xp / xpNeeded
    this.xpBar.fillRoundedRect(cornerX + 2, xpBarY + 2, (barWidth - 4) * xpPercent, barHeight - 4, 2)
    
    // Update text content
    this.levelText.setText(`Level: ${this.player.level}`)
    
    const minutes = Math.floor(this.gameTime / 60000)
    const seconds = Math.floor((this.gameTime % 60000) / 1000)
    this.timeText.setText(`Time: ${minutes}:${seconds.toString().padStart(2, '0')}`)
    
    this.roundText.setText(`Round: ${currentRound}`)
    this.enemyCountText.setText(`Enemies: ${enemiesKilled}/${enemiesNeeded}`)
  }

  public showRoundComplete(currentRound: number, enemiesKilled: number, enemiesNeeded: number, totalKills: number): Phaser.GameObjects.Container {
    const gameWidth = this.scene.sys.game.config.width as number
    const gameHeight = this.scene.sys.game.config.height as number
    
    const roundCompleteOverlay = this.scene.add.container(0, 0)
    roundCompleteOverlay.setScrollFactor(0)
    roundCompleteOverlay.setDepth(2500)
    
    // Store roses array on the overlay for cleanup
    const roses: Phaser.GameObjects.Image[] = []
    roundCompleteOverlay.setData('roses', roses)
    
    // Create semi-transparent background overlay
    const overlay = this.scene.add.graphics()
    overlay.fillStyle(0x000000, 0.4)
    overlay.fillRect(0, 0, gameWidth, gameHeight)
    roundCompleteOverlay.add(overlay)
    
    // Add the round completion image
    const roundImage = this.scene.add.image(gameWidth / 2, gameHeight / 2, 'roundComplete')
    roundImage.setOrigin(0.5, 0.5)
    
    // Scale the image to fit nicely on screen (adjust as needed based on original image size)
    const maxWidth = gameWidth * 0.8
    const maxHeight = gameHeight * 0.8
    const scaleX = maxWidth / roundImage.width
    const scaleY = maxHeight / roundImage.height
    const scale = Math.min(scaleX, scaleY, 1) // Don't scale up beyond original size
    roundImage.setScale(scale)
    
    roundCompleteOverlay.add(roundImage)
    
    // Position text in the lower half of the image - moved down slightly
    const imageBottom = (gameHeight / 2) + (roundImage.displayHeight / 2)
    const textAreaTop = gameHeight / 2 + (roundImage.displayHeight * 0.05) // Moved down from -0.1 to 0.05
    const textAreaHeight = imageBottom - textAreaTop
    
    // Round number text - positioned in upper part of text area
    const roundText = this.scene.add.text(gameWidth / 2, textAreaTop + (textAreaHeight * 0.15), `ROUND ${currentRound} COMPLETE!`, {
      fontSize: '36px',
      color: '#FFD700',
      align: 'center',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    })
    roundText.setOrigin(0.5)
    roundCompleteOverlay.add(roundText)
    
    // Stats text - positioned in middle part of text area
    const statsText = this.scene.add.text(gameWidth / 2, textAreaTop + (textAreaHeight * 0.35), [
      `Enemies Defeated: ${enemiesKilled}/${enemiesNeeded}`,
      `Total Kills: ${totalKills}`,
      `Ready for Round ${currentRound + 1}?`
    ], {
      fontSize: '18px',
      color: '#FFFFFF',
      align: 'center',
      lineSpacing: 6,
      stroke: '#000000',
      strokeThickness: 2
    })
    statsText.setOrigin(0.5)
    roundCompleteOverlay.add(statsText)
    
    // Add countdown text - positioned above instruction text
    const countdownText = this.scene.add.text(gameWidth / 2, textAreaTop + (textAreaHeight * 0.5), '5', {
      fontSize: '48px',
      color: '#FF6666',
      align: 'center',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    })
    countdownText.setOrigin(0.5)
    roundCompleteOverlay.add(countdownText)
    
    // Add instruction text - positioned at bottom of text area (initially hidden)
    const instructionText = this.scene.add.text(gameWidth / 2, textAreaTop + (textAreaHeight * 0.6), 'Click anywhere to continue', {
      fontSize: '20px',
      color: '#FFFF00',
      align: 'center',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    })
    instructionText.setOrigin(0.5)
    instructionText.setAlpha(0) // Start hidden
    roundCompleteOverlay.add(instructionText)
    
    // Add rose throwing celebration effect
    this.throwRoses(gameWidth, gameHeight, roses)
    
    // Track countdown state
    let countdownValue = 5
    let canContinue = false
    
    // Start countdown timer
    const countdownTimer = this.scene.time.addEvent({
      delay: 1000, // 1 second intervals
      callback: () => {
        countdownValue--
        if (countdownValue > 0) {
          countdownText.setText(countdownValue.toString())
          
          // Add pulsing effect to countdown numbers
          this.scene.tweens.add({
            targets: countdownText,
            scaleX: 1.3,
            scaleY: 1.3,
            duration: 200,
            yoyo: true,
            ease: 'Power2.easeOut'
          })
        } else {
          // Countdown finished
          canContinue = true
          
          // Hide countdown text
          this.scene.tweens.add({
            targets: countdownText,
            alpha: 0,
            scaleX: 0.5,
            scaleY: 0.5,
            duration: 300,
            ease: 'Power2.easeIn',
            onComplete: () => {
              countdownText.setVisible(false)
            }
          })
          
          // Show instruction text with fade in
          this.scene.tweens.add({
            targets: instructionText,
            alpha: 1,
            duration: 500,
            ease: 'Power2.easeOut',
            onComplete: () => {
              // Add pulsing effect to the instruction text
              this.scene.tweens.add({
                targets: instructionText,
                alpha: 0.6,
                duration: 1000,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1
              })
            }
          })
          
          // Stop the countdown timer
          countdownTimer.destroy()
        }
      },
      repeat: 4 // Repeat 4 times (5, 4, 3, 2, 1, then stop)
    })
    
    // Make the entire overlay clickable (but only functional after countdown)
    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, gameWidth, gameHeight), Phaser.Geom.Rectangle.Contains)
    overlay.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Only allow continuation after countdown finishes
      if (!canContinue) {
        // Optional: Add visual feedback that clicking is not yet allowed
        this.scene.tweens.add({
          targets: countdownText,
          scaleX: 1.2,
          scaleY: 1.2,
          duration: 100,
          yoyo: true,
          ease: 'Power2.easeOut'
        })
        return
      }
      
      pointer.event.stopPropagation()
      
      // Clean up countdown timer if still active
      if (countdownTimer) {
        countdownTimer.destroy()
      }
      
      // Clean up roses when continuing
      roses.forEach(rose => {
        if (rose && rose.active) {
          rose.destroy()
        }
      })
      
      // Trigger the continue event on the scene
      const gameScene = this.scene as any
      if (gameScene && gameScene.continueToNextRound) {
        gameScene.continueToNextRound()
      }
    })
    
    this.scene.cameras.main.ignore([roundCompleteOverlay, overlay, roundImage, roundText, statsText, countdownText, instructionText])
    
    return roundCompleteOverlay
  }

  private throwRoses(gameWidth: number, gameHeight: number, roses: Phaser.GameObjects.Image[]): void {
    const numRoses = 10 // Increased from 5 to 10
    const centerX = gameWidth / 2
    const centerY = gameHeight / 2
    const targetRadius = 200 // Area around the round complete UI
    
    // Pre-calculate landing positions to avoid overlaps
    const landingPositions: {x: number, y: number}[] = []
    const minDistance = 80 // Minimum distance between roses
    
    // Generate non-overlapping landing positions
    for (let i = 0; i < numRoses; i++) {
      let attempts = 0
      let validPosition = false
      let targetX, targetY
      
      while (!validPosition && attempts < 50) {
        // Create positions in a more distributed pattern
        const angle = (i / numRoses) * Math.PI * 2 + (Math.random() - 0.5) * 0.8
        const distance = (Math.random() * 0.7 + 0.3) * targetRadius // 30% to 100% of radius
        targetX = centerX + Math.cos(angle) * distance
        targetY = centerY + Math.sin(angle) * distance + 100 // Slightly below center
        
        // Check if this position is far enough from existing positions
        validPosition = true
        for (const existingPos of landingPositions) {
          const dist = Phaser.Math.Distance.Between(targetX, targetY, existingPos.x, existingPos.y)
          if (dist < minDistance) {
            validPosition = false
            break
          }
        }
        attempts++
      }
      
      // If we couldn't find a valid position, use a fallback grid-based position
      if (!validPosition) {
        const gridAngle = (i / numRoses) * Math.PI * 2
        const gridDistance = targetRadius * 0.8
        targetX = centerX + Math.cos(gridAngle) * gridDistance
        targetY = centerY + Math.sin(gridAngle) * gridDistance + 100
      }
      
      // Ensure we always have valid coordinates
      if (targetX === undefined || targetY === undefined) {
        targetX = centerX
        targetY = centerY
      }
      
      landingPositions.push({x: targetX, y: targetY})
    }
    
    for (let i = 0; i < numRoses; i++) {
      // Random delay for each rose (0-1.5 seconds, spread out more)
      const delay = Math.random() * 1500
      
      this.scene.time.delayedCall(delay, () => {
        // Random starting position off-screen
        const side = Math.floor(Math.random() * 4) // 0=top, 1=right, 2=bottom, 3=left
        let startX, startY
        
        switch (side) {
          case 0: // Top
            startX = Math.random() * gameWidth
            startY = -100
            break
          case 1: // Right
            startX = gameWidth + 100
            startY = Math.random() * gameHeight
            break
          case 2: // Bottom
            startX = Math.random() * gameWidth
            startY = gameHeight + 100
            break
          case 3: // Left
            startX = -100
            startY = Math.random() * gameHeight
            break
          default:
            startX = -100
            startY = Math.random() * gameHeight
        }
        
        // Use pre-calculated landing position
        const targetPosition = landingPositions[i]
        const targetX = targetPosition.x
        const targetY = targetPosition.y
        
        // Skip if target position is invalid
        if (targetX === undefined || targetY === undefined) return
        
        // Create rose sprite
        const rose = this.scene.add.image(startX, startY, 'rose')
        rose.setScale(0.08) // Small rose size
        rose.setOrigin(0.5, 0.5)
        rose.setDepth(2600) // Above the round complete overlay
        rose.setScrollFactor(0) // Don't scroll with camera
        
        // Add rose to the array for cleanup
        roses.push(rose)
        
        // Make sure main camera ignores this rose
        this.scene.cameras.main.ignore(rose)
        
        // Calculate flight duration based on distance
        const distance = Phaser.Math.Distance.Between(startX, startY, targetX, targetY)
        const flightDuration = 800 + (distance / 2) // Base 800ms + distance factor
        
        // Animate rose flying to target with arc
        const midX = (startX + targetX) / 2
        const midY = Math.min(startY, targetY) - 150 // Arc peak above both points
        
        // Create curved path using bezier curve
        this.scene.tweens.add({
          targets: rose,
          x: targetX,
          y: targetY,
          duration: flightDuration,
          ease: 'Power2.easeOut',
          onUpdate: (tween) => {
            const progress = tween.progress
            // Bezier curve calculation for arc
            const currentX = Math.pow(1 - progress, 2) * startX + 
                           2 * (1 - progress) * progress * midX + 
                           Math.pow(progress, 2) * targetX
            const currentY = Math.pow(1 - progress, 2) * startY + 
                           2 * (1 - progress) * progress * midY + 
                           Math.pow(progress, 2) * targetY
            rose.setPosition(currentX, currentY)
          },
          onComplete: () => {
            // Rose lands - add bounce effect
            this.scene.tweens.add({
              targets: rose,
              scaleX: 0.12,
              scaleY: 0.06,
              duration: 100,
              yoyo: true,
              ease: 'Power2.easeOut',
              onComplete: () => {
                // Settle to final size
                rose.setScale(0.10)
                
                // Add gentle rotation
                this.scene.tweens.add({
                  targets: rose,
                  rotation: (Math.random() - 0.5) * 0.5,
                  duration: 300,
                  ease: 'Power2.easeOut'
                })
                
                // Roses now stay visible until player clicks to continue
                // No automatic fade-out timer
              }
            })
          }
        })
        
        // Add spinning during flight
        this.scene.tweens.add({
          targets: rose,
          rotation: Math.PI * 4 * (Math.random() > 0.5 ? 1 : -1), // 2 full rotations, random direction
          duration: flightDuration,
          ease: 'Linear'
        })
      })
    }
  }

  public destroy(): void {
    if (this.healthBar) this.healthBar.destroy()
    if (this.xpBar) this.xpBar.destroy()
    if (this.levelText) this.levelText.destroy()
    if (this.timeText) this.timeText.destroy()
    if (this.roundText) this.roundText.destroy()
    if (this.enemyCountText) this.enemyCountText.destroy()
  }
}