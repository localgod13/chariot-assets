
// src/game/utils/GameOverManager.ts
import { Scene } from 'phaser'
import { Player } from '../objects/Player'
import { RoundManager } from './RoundManager'

export class GameOverManager {
  private scene: Scene & { restartGame: () => void; returnToMainMenu: () => void }
  private player: Player
  private roundManager: RoundManager
  private isSubmittingScore: boolean = false
  private gameOverOverlay!: Phaser.GameObjects.Container
  private gameTime: number = 0

  constructor(scene: Scene, player: Player, roundManager: RoundManager) {
    this.scene = scene as Scene & { restartGame: () => void; returnToMainMenu: () => void }
    this.player = player
    this.roundManager = roundManager
  }

  public show(gameTime: number) {
    this.gameTime = gameTime
    this.scene.physics.world.pause()
    this.showScoreSubmissionScreen()
  }

  private showScoreSubmissionScreen() {
    this.isSubmittingScore = false // Reset submission flag
    const gameWidth = this.scene.sys.game.config.width as number
    const gameHeight = this.scene.sys.game.config.height as number

    // Calculate final score based on game stats
    const roundData = this.roundManager.getRoundData()
    const baseScore = roundData.totalEnemiesKilled * 100
    const levelBonus = this.player.level * 500
    const timeBonus = Math.max(0, Math.floor(this.gameTime / 1000) * 10) // 10 points per second survived
    const finalScore = baseScore + levelBonus + timeBonus

    console.log(`Final Score Calculation: Base(${baseScore}) + Level(${levelBonus}) + Time(${timeBonus}) = ${finalScore}`)

    // Create score submission overlay
    const scoreSubmissionOverlay = this.scene.add.container(0, 0)
    scoreSubmissionOverlay.setScrollFactor(0)
    scoreSubmissionOverlay.setDepth(3500) // Higher than game over screen

    // Create semi-transparent background
    const overlay = this.scene.add.graphics()
    overlay.fillStyle(0x000000, 0.9)
    overlay.fillRect(0, 0, gameWidth, gameHeight)
    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, gameWidth, gameHeight), Phaser.Geom.Rectangle.Contains)
    scoreSubmissionOverlay.add(overlay)

    // Title
    const titleText = this.scene.add.text(gameWidth / 2, gameHeight / 2 - 150, 'FINAL SCORE', {
      fontSize: '48px',
      color: '#ffaa00',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center'
    })
    titleText.setOrigin(0.5)
    scoreSubmissionOverlay.add(titleText)

    // Score display
    const scoreText = this.scene.add.text(gameWidth / 2, gameHeight / 2 - 80, finalScore.toLocaleString(), {
      fontSize: '64px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center'
    })
    scoreText.setOrigin(0.5)
    scoreSubmissionOverlay.add(scoreText)

    // Score breakdown
    const breakdownText = this.scene.add.text(
      gameWidth / 2,
      gameHeight / 2 - 20,
      [
        `Enemies Defeated: ${roundData.totalEnemiesKilled} × 100 = ${baseScore.toLocaleString()}`,
        `Level Bonus: ${this.player.level} × 500 = ${levelBonus.toLocaleString()}`,
        `Survival Bonus: ${Math.floor(this.gameTime / 1000)}s × 10 = ${timeBonus.toLocaleString()}`
      ],
      {
        fontSize: '16px',
        color: '#cccccc',
        align: 'center',
        lineSpacing: 5
      }
    )
    breakdownText.setOrigin(0.5)
    scoreSubmissionOverlay.add(breakdownText)

    // Name input label
    const nameLabel = this.scene.add.text(gameWidth / 2, gameHeight / 2 + 60, 'Enter your name for the leaderboard:', {
      fontSize: '24px',
      color: '#ffffff',
      align: 'center'
    })
    nameLabel.setOrigin(0.5)
    scoreSubmissionOverlay.add(nameLabel)

    // Create HTML input field for name
    const inputElement = document.createElement('input')
    inputElement.type = 'text'
    inputElement.maxLength = 20
    inputElement.placeholder = 'Your Name'
    inputElement.style.position = 'absolute'
    inputElement.style.left = `${gameWidth / 2 - 100}px`
    inputElement.style.top = `${gameHeight / 2 + 100}px`
    inputElement.style.width = '200px'
    inputElement.style.height = '40px'
    inputElement.style.fontSize = '18px'
    inputElement.style.textAlign = 'center'
    inputElement.style.border = '2px solid #ffaa00'
    inputElement.style.borderRadius = '5px'
    inputElement.style.backgroundColor = '#333333'
    inputElement.style.color = '#ffffff'
    inputElement.style.zIndex = '1000'

    // Add input to game container
    const gameContainer = document.getElementById('game-container')
    if (gameContainer) {
      gameContainer.appendChild(inputElement)
      inputElement.focus()
      
      // Disable player controls while name input is active
      this.player.disableControls()
      
      // Add event listener to prevent WASD key capture by Phaser
      const preventWASDCapture = (event: KeyboardEvent) => {
        const key = event.key.toLowerCase()
        if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
          event.stopPropagation()
          event.stopImmediatePropagation()
        }
      }
      
      // Add the listener to capture keys before Phaser gets them
      document.addEventListener('keydown', preventWASDCapture, true)
      document.addEventListener('keyup', preventWASDCapture, true)
      
      // Store the cleanup function for later
      inputElement.setAttribute('data-cleanup-wasd', 'true')
      ;(inputElement as any).cleanupWASD = () => {
        document.removeEventListener('keydown', preventWASDCapture, true)
        document.removeEventListener('keyup', preventWASDCapture, true)
      }
    }

    // Submit button
    const submitButton = this.scene.add.text(gameWidth / 2, gameHeight / 2 + 180, 'SUBMIT SCORE', {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#ffaa00',
      padding: { x: 20, y: 10 },
      align: 'center'
    })
    submitButton.setOrigin(0.5)
    submitButton.setInteractive()
    scoreSubmissionOverlay.add(submitButton)

    // Skip button
    const skipButton = this.scene.add.text(gameWidth / 2, gameHeight / 2 + 230, 'Skip', {
      fontSize: '18px',
      color: '#cccccc',
      align: 'center'
    })
    skipButton.setOrigin(0.5)
    skipButton.setInteractive()
    scoreSubmissionOverlay.add(skipButton)

    // Button interactions
    submitButton.on('pointerover', () => {
      submitButton.setStyle({ backgroundColor: '#ffffff', color: '#000000' })
    })

    submitButton.on('pointerout', () => {
      submitButton.setStyle({ backgroundColor: '#ffaa00', color: '#ffffff' })
    })

    const handleSubmit = () => {
      if (this.isSubmittingScore) return

      const playerName = inputElement.value.trim()
      if (playerName.length === 0) {
        // Show error message
        const errorText = this.scene.add.text(gameWidth / 2, gameHeight / 2 + 140, 'Please enter your name!', {
          fontSize: '16px',
          color: '#ff6666',
          align: 'center'
        })
        errorText.setOrigin(0.5)
        scoreSubmissionOverlay.add(errorText)

        this.scene.time.delayedCall(2000, () => {
          if (errorText && errorText.active) {
            errorText.destroy()
          }
        })
        return
      }

      this.isSubmittingScore = true
      submitButton.disableInteractive().setAlpha(0.5)
      skipButton.disableInteractive().setAlpha(0.5)
      inputElement.disabled = true

      this.submitScore(playerName, finalScore, scoreSubmissionOverlay, inputElement, submitButton, skipButton)
    }

    submitButton.on('pointerdown', handleSubmit)

    skipButton.on('pointerover', () => {
      skipButton.setStyle({ color: '#ffffff' })
    })

    skipButton.on('pointerout', () => {
      skipButton.setStyle({ color: '#cccccc' })
    })

    skipButton.on('pointerdown', () => {
      if (this.isSubmittingScore) return
      
      // Re-enable player controls
      this.player.enableControls()
      
      // Clean up WASD event listeners
      if (inputElement && (inputElement as any).cleanupWASD) {
        (inputElement as any).cleanupWASD()
      }
      
      // Clean up input element
      if (inputElement && inputElement.parentNode) {
        inputElement.parentNode.removeChild(inputElement)
      }

      // Clean up overlay
      if (scoreSubmissionOverlay && scoreSubmissionOverlay.active) {
        scoreSubmissionOverlay.destroy()
      }

      // Show regular game over screen
      this.showRegularGameOverScreen()
    })

    // Enter key submission
    const handleEnterKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        handleSubmit()
      }
    }
    inputElement.addEventListener('keydown', handleEnterKey)

    // Make sure main camera ignores the overlay
    if (this.scene.cameras && this.scene.cameras.main) {
      this.scene.cameras.main.ignore([scoreSubmissionOverlay, overlay, titleText, scoreText, breakdownText, nameLabel, submitButton, skipButton])
    }
  }

  private async submitScore(
    playerName: string,
    score: number,
    overlay: Phaser.GameObjects.Container,
    inputElement: HTMLInputElement,
    submitButton: Phaser.GameObjects.Text,
    skipButton: Phaser.GameObjects.Text
  ) {
    // Show loading state
    const loadingText = this.scene.add.text(
      (this.scene.sys.game.config.width as number) / 2,
      (this.scene.sys.game.config.height as number) / 2 + 140,
      'Submitting...',
      {
        fontSize: '16px',
        color: '#ffaa00',
        align: 'center'
      }
    )
    loadingText.setOrigin(0.5)
    overlay.add(loadingText)

    // Hide the input field immediately after submission starts
    if (inputElement && inputElement.parentNode) {
      inputElement.style.display = 'none'
    }

    try {
      console.log('Submitting score:', { name: playerName, score })

      const response = await fetch('https://chariot-6jeu.onrender.com/highscores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: playerName,
          score: score
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        console.log('Score submitted successfully:', data)
        this.showScoreSubmissionResult(data, overlay, inputElement)
      } else {
        throw new Error(data.error || 'Failed to submit score')
      }
    } catch (error) {
      console.error('Error submitting score:', error)

      // Show error message
      loadingText.setText('Failed to submit score. Please try again.')
      loadingText.setStyle({ color: '#ff6666' })

      // Re-enable UI for another attempt after a delay
      this.scene.time.delayedCall(2000, () => {
        if (overlay.active) {
          loadingText.destroy()
          submitButton.setInteractive().setAlpha(1)
          skipButton.setInteractive().setAlpha(1)
          inputElement.disabled = false
          
          // Clean up and re-enable player controls for retry
          if (inputElement && (inputElement as any).cleanupWASD) {
            (inputElement as any).cleanupWASD()
          }
          this.player.enableControls()
          
          this.isSubmittingScore = false // Allow another attempt
        }
      })
    }
  }

  private showScoreSubmissionResult(data: any, overlay: Phaser.GameObjects.Container, inputElement: HTMLInputElement) {
    const gameWidth = this.scene.sys.game.config.width as number
    const gameHeight = this.scene.sys.game.config.height as number

    // Clean up input element immediately when showing results
    if (inputElement && inputElement.parentNode) {
      // Clean up WASD event listeners
      if ((inputElement as any).cleanupWASD) {
        (inputElement as any).cleanupWASD()
      }
      
      inputElement.parentNode.removeChild(inputElement)
      
      // Re-enable player controls
      this.player.enableControls()
    }

    // Clear the overlay and create success screen
    overlay.removeAll(true)

    // Background
    const successOverlay = this.scene.add.graphics()
    successOverlay.fillStyle(0x000000, 0.9)
    successOverlay.fillRect(0, 0, gameWidth, gameHeight)
    successOverlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, gameWidth, gameHeight), Phaser.Geom.Rectangle.Contains)
    overlay.add(successOverlay)

    // Success title
    const successTitle = this.scene.add.text(gameWidth / 2, gameHeight / 2 - 100, 'SCORE SUBMITTED!', {
      fontSize: '48px',
      color: '#00ff88',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center'
    })
    successTitle.setOrigin(0.5)
    overlay.add(successTitle)

    // Rank display
    const rankText = this.scene.add.text(gameWidth / 2, gameHeight / 2 - 20, `Your Rank: #${data.ranking}`, {
      fontSize: '36px',
      color: '#ffaa00',
      fontStyle: 'bold',
      align: 'center'
    })
    rankText.setOrigin(0.5)
    overlay.add(rankText)

    // Top 10 indicator
    if (data.isTopTen) {
      const topTenText = this.scene.add.text(gameWidth / 2, gameHeight / 2 + 20, '🏆 TOP 10 HIGH SCORE! 🏆', {
        fontSize: '24px',
        color: '#ffaa00',
        fontStyle: 'bold',
        align: 'center'
      })
      topTenText.setOrigin(0.5)
      overlay.add(topTenText)
    }

    // Score details
    const scoreDetails = this.scene.add.text(
      gameWidth / 2,
      gameHeight / 2 + 60,
      [`Player: ${data.score.name}`, `Score: ${data.score.score.toLocaleString()}`, `Submitted: ${new Date(data.score.timestamp).toLocaleString()}`],
      {
        fontSize: '16px',
        color: '#cccccc',
        align: 'center',
        lineSpacing: 5
      }
    )
    scoreDetails.setOrigin(0.5)
    overlay.add(scoreDetails)

    // Continue button
    const continueButton = this.scene.add.text(gameWidth / 2, gameHeight / 2 + 140, 'CONTINUE', {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#ffaa00',
      padding: { x: 20, y: 10 },
      align: 'center'
    })
    continueButton.setOrigin(0.5)
    continueButton.setInteractive()
    overlay.add(continueButton)

    continueButton.on('pointerover', () => {
      continueButton.setStyle({ backgroundColor: '#ffffff', color: '#000000' })
    })

    continueButton.on('pointerout', () => {
      continueButton.setStyle({ backgroundColor: '#ffaa00', color: '#ffffff' })
    })

    continueButton.on('pointerdown', () => {
      // Input element already cleaned up above, just clean up overlay
      if (overlay && overlay.active) {
        overlay.destroy()
      }

      // Show regular game over screen
      this.showRegularGameOverScreen()
    })

    // Make sure main camera ignores the new elements
    if (this.scene.cameras && this.scene.cameras.main) {
      this.scene.cameras.main.ignore([successOverlay, successTitle, rankText, scoreDetails, continueButton])
    }

    // Auto-continue after 10 seconds
    this.scene.time.delayedCall(10000, () => {
      if (overlay && overlay.active) {
        // Input element already cleaned up above
        overlay.destroy()
        this.showRegularGameOverScreen()
      }
    })
  }

  private showRegularGameOverScreen() {
    // Play fail sound when death screen appears - with error handling
    try {
      const currentVolume = this.scene.sound.volume
      if (this.scene.sound.get('fail')) {
        this.scene.sound.play('fail', {
          volume: 0.7 * currentVolume // Adjust volume as needed
        })
        console.log('Fail sound played successfully')
      } else {
        console.warn('Fail sound not found in cache, skipping sound effect')
      }
    } catch (error) {
      console.error('Error playing fail sound:', error)
      // Continue with game over screen even if sound fails
    }

    const gameWidth = this.scene.sys.game.config.width as number
    const gameHeight = this.scene.sys.game.config.height as number

    this.gameOverOverlay = this.scene.add.container(0, 0)
    this.gameOverOverlay.setScrollFactor(0)
    this.gameOverOverlay.setDepth(3000)

    // Store apples and tomatoes arrays on the overlay for cleanup
    const apples: Phaser.GameObjects.Image[] = []
    const tomatoes: Phaser.GameObjects.Image[] = []
    this.gameOverOverlay.setData('apples', apples)
    this.gameOverOverlay.setData('tomatoes', tomatoes)

    // Create semi-transparent background overlay
    const overlay = this.scene.add.graphics()
    overlay.fillStyle(0x000000, 0.8)
    overlay.fillRect(0, 0, gameWidth, gameHeight)
    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, gameWidth, gameHeight), Phaser.Geom.Rectangle.Contains)
    this.gameOverOverlay.add(overlay)

    // Add the death image instead of text
    const deathImage = this.scene.add.image(gameWidth / 2, gameHeight / 2 - 50, 'death')
    deathImage.setOrigin(0.5, 0.5)

    // Scale the death image to fit nicely on screen - made 2x larger
    const maxWidth = gameWidth * 1.8 // Increased from 0.9 to 1.8 (2x larger)
    const maxHeight = gameHeight * 1.2 // Increased from 0.6 to 1.2 (2x larger)
    const scaleX = maxWidth / deathImage.width
    const scaleY = maxHeight / deathImage.height
    const scale = Math.min(scaleX, scaleY, 1) // Don't scale up beyond original size
    deathImage.setScale(scale)

    this.gameOverOverlay.add(deathImage)

    // Add apple and tomato throwing celebration effect - MOVED BEFORE other UI elements
    this.throwApplesAndTomatoes(gameWidth, gameHeight, apples, tomatoes)

    const roundData = this.roundManager.getRoundData()
    const minutes = Math.floor(this.gameTime / 60000)
    const seconds = Math.floor((this.gameTime % 60000) / 1000)
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`

    // Position stats text below the death image
    const statsText = this.scene.add.text(
      gameWidth / 2,
      gameHeight / 2 + 150,
      [
        `Final Level: ${this.player.level}`,
        `Rounds Completed: ${roundData.currentRound - 1}`,
        `Current Round Progress: ${roundData.enemiesKilledThisRound}/${roundData.enemiesNeededThisRound}`,
        `Total Enemies Defeated: ${roundData.totalEnemiesKilled}`,
        `Time Survived: ${timeString}`
      ],
      {
        fontSize: '14px', // Reduced from 20px to 14px
        color: '#ffffff',
        align: 'center',
        lineSpacing: 2, // Reduced from 10 to 2 for much tighter spacing
        stroke: '#000000',
        strokeThickness: 1 // Reduced from 2 to 1 for thinner stroke
      }
    )
    statsText.setOrigin(0.5)
    this.gameOverOverlay.add(statsText)

    this.createGameOverButtons(gameWidth, gameHeight)

    // Add safety check for cameras before trying to ignore objects
    if (this.scene.cameras && this.scene.cameras.main) {
      this.scene.cameras.main.ignore([this.gameOverOverlay, overlay, deathImage, statsText])
    }

    console.log('Game Over screen displayed with death image and apple throwing effect')
  }

  private throwApplesAndTomatoes(gameWidth: number, gameHeight: number, apples: Phaser.GameObjects.Image[], tomatoes: Phaser.GameObjects.Image[]): void {
    console.log('Starting apple and tomato throwing effect') // Debug log

    const numApples = 6 // Increased from 4 to 6
    const numTomatoes = 4 // Increased from 3 to 4
    const centerX = gameWidth / 2
    const centerY = gameHeight / 2
    const targetRadius = 250 // Larger area around the death image

    // Pre-calculate landing positions to avoid overlaps for both apples and tomatoes
    const landingPositions: { x: number; y: number }[] = []
    const minDistance = 70 // Minimum distance between items
    const totalItems = numApples + numTomatoes // Now 10 total items instead of 7

    // Generate non-overlapping landing positions for all items
    for (let i = 0; i < totalItems; i++) {
      let attempts = 0
      let validPosition = false
      let targetX, targetY

      while (!validPosition && attempts < 50) {
        // Create positions in a more distributed pattern
        const angle = (i / totalItems) * Math.PI * 2 + (Math.random() - 0.5) * 0.8
        const distance = (Math.random() * 0.7 + 0.3) * targetRadius // 30% to 100% of radius
        targetX = centerX + Math.cos(angle) * distance
        targetY = centerY + Math.sin(angle) * distance + 50 // Slightly below center

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
        const gridAngle = (i / totalItems) * Math.PI * 2
        const gridDistance = targetRadius * 0.8
        targetX = centerX + Math.cos(gridAngle) * gridDistance
        targetY = centerY + Math.sin(gridAngle) * gridDistance + 50
      }

      // Ensure we always have valid coordinates
      if (targetX === undefined || targetY === undefined) {
        targetX = centerX
        targetY = centerY
      }

      landingPositions.push({ x: targetX, y: targetY })
    }

    // Throw apples
    for (let i = 0; i < numApples; i++) {
      // Random delay for each apple (0-2 seconds, spread out more)
      const delay = Math.random() * 2000

      this.scene.time.delayedCall(delay, () => {
        console.log(`Throwing apple ${i + 1}`) // Debug log

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

        // Create apple sprite
        const apple = this.scene.add.image(startX, startY, 'apple')
        apple.setScale(0.08) // Reduced from 0.12 to 0.08 for smaller apples
        apple.setOrigin(0.5, 0.5)
        apple.setDepth(3200) // Increased from 3100 to 3200 to ensure all apples appear above death image
        apple.setScrollFactor(0) // Don't scroll with camera

        console.log(`Apple ${i + 1} created at (${startX}, ${startY}) targeting (${targetX}, ${targetY})`) // Debug log

        // Add apple to the array for cleanup
        apples.push(apple)

        // CRITICAL: Make sure main camera ignores apples so they only render on UI layer
        if (this.scene.cameras && this.scene.cameras.main) {
          this.scene.cameras.main.ignore(apple)
        }

        // Calculate flight duration based on distance
        const distance = Phaser.Math.Distance.Between(startX, startY, targetX, targetY)
        const flightDuration = 900 + distance / 2 // Slightly longer flight than roses

        // Animate apple flying to target with arc
        const midX = (startX + targetX) / 2
        const midY = Math.min(startY, targetY) - 180 // Higher arc than roses

        // Create curved path using bezier curve
        this.scene.tweens.add({
          targets: apple,
          x: targetX,
          y: targetY,
          duration: flightDuration,
          ease: 'Power2.easeOut',
          onUpdate: tween => {
            const progress = tween.progress
            // Bezier curve calculation for arc
            const currentX = Math.pow(1 - progress, 2) * startX + 2 * (1 - progress) * progress * midX + Math.pow(progress, 2) * targetX
            const currentY = Math.pow(1 - progress, 2) * startY + 2 * (1 - progress) * progress * midY + Math.pow(progress, 2) * targetY
            apple.setPosition(currentX, currentY)
          },
          onComplete: () => {
            console.log(`Apple ${i + 1} landed`) // Debug log

            // Apple lands - add bounce effect
            this.scene.tweens.add({
              targets: apple,
              scaleX: 0.11, // Reduced from 0.16 to 0.11
              scaleY: 0.06, // Reduced from 0.08 to 0.06
              duration: 120,
              yoyo: true,
              ease: 'Power2.easeOut',
              onComplete: () => {
                // Settle to final size
                apple.setScale(0.09) // Reduced from 0.14 to 0.09

                // Add gentle rotation
                this.scene.tweens.add({
                  targets: apple,
                  rotation: (Math.random() - 0.5) * 0.6,
                  duration: 400,
                  ease: 'Power2.easeOut'
                })

                // Apples stay visible until game over screen is dismissed
              }
            })
          }
        })

        // Add spinning during flight - faster than roses for more chaotic effect
        this.scene.tweens.add({
          targets: apple,
          rotation: Math.PI * 6 * (Math.random() > 0.5 ? 1 : -1), // 3 full rotations, random direction
          duration: flightDuration,
          ease: 'Linear'
        })
      })
    }

    // Throw tomatoes
    for (let i = 0; i < numTomatoes; i++) {
      // Random delay for each tomato (0-2.5 seconds, slightly different timing than apples)
      const delay = Math.random() * 2500

      this.scene.time.delayedCall(delay, () => {
        console.log(`Throwing tomato ${i + 1}`) // Debug log

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

        // Use pre-calculated landing position (offset by numApples)
        const targetPosition = landingPositions[numApples + i]
        const targetX = targetPosition.x
        const targetY = targetPosition.y

        // Create tomato sprite
        const tomato = this.scene.add.image(startX, startY, 'tom')
        tomato.setScale(0.07) // Slightly smaller than apples for variety
        tomato.setOrigin(0.5, 0.5)
        tomato.setDepth(3200) // Same depth as apples
        tomato.setScrollFactor(0) // Don't scroll with camera

        console.log(`Tomato ${i + 1} created at (${startX}, ${startY}) targeting (${targetX}, ${targetY})`) // Debug log

        // Add tomato to the array for cleanup
        tomatoes.push(tomato)

        // CRITICAL: Make sure main camera ignores tomatoes so they only render on UI layer
        if (this.scene.cameras && this.scene.cameras.main) {
          this.scene.cameras.main.ignore(tomato)
        }

        // Calculate flight duration based on distance
        const distance = Phaser.Math.Distance.Between(startX, startY, targetX, targetY)
        const flightDuration = 850 + distance / 2 // Slightly faster than apples

        // Animate tomato flying to target with arc
        const midX = (startX + targetX) / 2
        const midY = Math.min(startY, targetY) - 170 // Slightly lower arc than apples

        // Create curved path using bezier curve
        this.scene.tweens.add({
          targets: tomato,
          x: targetX,
          y: targetY,
          duration: flightDuration,
          ease: 'Power2.easeOut',
          onUpdate: tween => {
            const progress = tween.progress
            // Bezier curve calculation for arc
            const currentX = Math.pow(1 - progress, 2) * startX + 2 * (1 - progress) * progress * midX + Math.pow(progress, 2) * targetX
            const currentY = Math.pow(1 - progress, 2) * startY + 2 * (1 - progress) * progress * midY + Math.pow(progress, 2) * targetY
            tomato.setPosition(currentX, currentY)
          },
          onComplete: () => {
            console.log(`Tomato ${i + 1} landed`) // Debug log

            // Switch to splat image when tomato hits the ground - BEFORE any other operations
            tomato.setTexture('tomsplat')
            console.log(`Tomato ${i + 1} texture changed to tomsplat`) // Debug log to confirm texture change

            // Tomato lands - add bounce effect with splat texture
            this.scene.tweens.add({
              targets: tomato,
              scaleX: 0.12, // Increased from 0.10 to 0.12 for larger splat bounce
              scaleY: 0.06, // Increased from 0.05 to 0.06 for larger splat bounce
              duration: 110,
              yoyo: true,
              ease: 'Power2.easeOut',
              onComplete: () => {
                // Ensure splat texture is still applied after bounce
                tomato.setTexture('tomsplat')

                // Settle to final size with splat texture - larger than before
                tomato.setScale(0.1) // Increased from 0.08 to 0.10 for larger final splat size

                // NO rotation for splats - they should stay still once they hit the ground
                // Removed the rotation tween entirely for splats

                // Final confirmation that splat texture is applied
                tomato.setTexture('tomsplat')
                console.log(`Tomato ${i + 1} final texture: ${tomato.texture.key}`) // Debug log

                // Tomatoes stay visible until game over screen is dismissed
              }
            })
          }
        })

        // Add spinning during flight - different rotation speed than apples
        this.scene.tweens.add({
          targets: tomato,
          rotation: Math.PI * (3 + Math.random() * 4) * (Math.random() > 0.5 ? 1 : -1), // 1.5 to 3.5 full rotations, random direction
          duration: flightDuration,
          ease: 'Linear'
        })
      })
    }
  }

  private createGameOverButtons(gameWidth: number, gameHeight: number) {
    const buttonY = gameHeight - 45

    // Create restart button using the rest image instead of graphics
    const restartButton = this.scene.add.image(gameWidth / 2 - 120, buttonY + 25, 'rest')
    restartButton.setOrigin(0.5)
    restartButton.setScale(0.15) // Adjust scale as needed for proper size
    restartButton.setInteractive()
    this.gameOverOverlay.add(restartButton)

    // Create menu button using the mainmenu image instead of graphics
    const menuButton = this.scene.add.image(gameWidth / 2 + 120, buttonY + 25, 'mainmenu')
    menuButton.setOrigin(0.5)
    menuButton.setScale(0.15) // Same scale as restart button for consistency
    menuButton.setInteractive()
    this.gameOverOverlay.add(menuButton)

    const shortcutsText = this.scene.add.text(gameWidth / 2, buttonY + 80, 'Press R or ESC to restart', {
      fontSize: '16px',
      color: '#cccccc',
      align: 'center'
    })
    shortcutsText.setOrigin(0.5)
    this.gameOverOverlay.add(shortcutsText)

    restartButton.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation()
      this.scene.restartGame()
    })

    menuButton.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation()
      // Clean up apples before returning to main menu
      const apples = this.gameOverOverlay.getData('apples')
      if (apples) {
        apples.forEach((apple: Phaser.GameObjects.Image) => {
          if (apple && apple.active) {
            apple.destroy()
          }
        })
      }
      this.scene.returnToMainMenu()
    })

    restartButton.on('pointerover', () => {
      this.scene.tweens.add({
        targets: restartButton,
        scaleX: 0.17, // Slightly larger on hover
        scaleY: 0.17,
        duration: 100,
        ease: 'Power2'
      })
    })

    restartButton.on('pointerout', () => {
      this.scene.tweens.add({
        targets: restartButton,
        scaleX: 0.15, // Back to normal size
        scaleY: 0.15,
        duration: 100,
        ease: 'Power2'
      })
    })

    menuButton.on('pointerover', () => {
      this.scene.tweens.add({
        targets: menuButton,
        scaleX: 0.17, // Slightly larger on hover
        scaleY: 0.17,
        duration: 100,
        ease: 'Power2'
      })
    })

    menuButton.on('pointerout', () => {
      this.scene.tweens.add({
        targets: menuButton,
        scaleX: 0.15, // Back to normal size
        scaleY: 0.15,
        duration: 100,
        ease: 'Power2'
      })
    })

    this.scene.cameras.main.ignore([restartButton, menuButton, shortcutsText])
  }
}
