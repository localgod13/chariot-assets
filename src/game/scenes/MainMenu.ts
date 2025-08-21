
// src/game/scenes/MainMenu.ts

import { Scene } from 'phaser'

export class MainMenu extends Scene {
  private backgroundMusic!: Phaser.Sound.BaseSound
  private startButton!: Phaser.GameObjects.Image
  private title!: Phaser.GameObjects.Text
  private subtitle!: Phaser.GameObjects.Text
  private canonballImage!: Phaser.GameObjects.Image

  constructor() {
    super('MainMenu')
  }

  preload() {
    // Load the new background image
    this.load.image('menuBackground', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/mm-DA8C6RaPpJHBdJ4xcHpCSlokuHeUax.png')
    
    // Load the new main menu music
    this.load.audio('mainmusic', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/mainmusic-teEbxvHs26u53YKihs7fcGTHKlvJfD.mp3')
    
    // Load the new start button image - FIXED URL
    this.load.image('startButton', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/st-removebg-preview-63AhvZKIEn3Bsp6zfxuZU9AB7Dbtqh.png')
    
    // Load the new options button image
    this.load.image('optionsButton', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/op-removebg-preview-RgF8nxJrd3ddPcoQ3PIIIq2Oy3UMOd.png')
    
    // Load the canonball image for hover effect
    this.load.image('canonball', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/canonball-Jc26BTlxdNLtpsttyK4KHe9WvdmVMS.png')
    
    // Load the fire sound effect for canonball firing
    this.load.audio('fire', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/fire-ggTCS3OZxzcHrokifehJ0NCKDjtPHU.mp3')
  }

  create() {
    const gameWidth = this.sys.game.config.width as number
    const gameHeight = this.sys.game.config.height as number

    // Load saved volume setting and apply it
    const savedVolume = localStorage.getItem('gameVolume')
    if (savedVolume) {
      const volume = parseFloat(savedVolume)
      this.sound.setVolume(volume)
    }

    // Add new background image with proper scaling to fit the screen
    const bg = this.add.image(gameWidth / 2, gameHeight / 2, 'menuBackground')
    bg.setOrigin(0.5, 0.5)
    // Scale the background to cover the entire screen while maintaining aspect ratio
    const scaleX = gameWidth / bg.width
    const scaleY = gameHeight / bg.height
    const scale = Math.max(scaleX, scaleY) // Use max to ensure the screen is fully covered
    bg.setScale(scale)

    // Game Title
    this.title = this.add.text(gameWidth / 2, gameHeight * 0.25, 'CHARIOT ARENA', {
      fontSize: '72px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6,
      shadow: {
        offsetX: 4,
        offsetY: 4,
        color: '#000000',
        blur: 8,
        fill: true
      }
    })
    this.title.setOrigin(0.5)

    // Subtitle
    this.subtitle = this.add.text(gameWidth / 2, gameHeight * 0.35, 'Survive the Arena', {
      fontSize: '32px',
      color: '#ffaa00',
      fontStyle: 'italic',
      stroke: '#000000',
      strokeThickness: 3
    })
    this.subtitle.setOrigin(0.5)

    // Create canonball hover image (initially hidden)
    this.canonballImage = this.add.image(0, 0, 'canonball')
    this.canonballImage.setScale(0.075) // Reduced from 0.15 to 0.075 (half size)
    this.canonballImage.setOrigin(0.5, 0.5)
    this.canonballImage.setVisible(false) // Start hidden

    // Create Start Button (this will also create the Options button)
    this.createStartButton(gameWidth, gameHeight)

    // Start background music with current volume setting - using new mainmusic
    const currentVolume = this.sound.volume
    this.backgroundMusic = this.sound.add('mainmusic', {
      loop: true,
      volume: 0.3 * currentVolume // Apply current volume setting
    })
    this.backgroundMusic.play()

    // Add keyboard shortcut
    this.input.keyboard!.on('keydown-SPACE', () => {
      this.startGame()
    })

    this.input.keyboard!.on('keydown-ENTER', () => {
      this.startGame()
    })

    // Ping the server to wake it up
    this.wakeUpServer()
  }

  private async wakeUpServer() {
    try {
      console.log('Pinging server to wake it up...')
      const response = await fetch('https://chariot-6jeu.onrender.com/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Server is awake:', data.message)
      } else {
        console.warn(`Server ping failed with status: ${response.status}`)
      }
    } catch (error) {
      console.error('Failed to ping server. This is expected if you are offline.', error)
    }
  }

  private createStartButton(gameWidth: number, gameHeight: number) {
    const buttonY = gameHeight * 0.6 // FIXED: Changed from gameWidth * 0.6 to gameHeight * 0.6

    // Create start button using the provided image
    this.startButton = this.add.image(gameWidth / 2, buttonY, 'startButton')
    this.startButton.setOrigin(0.5)
    this.startButton.setInteractive()
    this.startButton.setScale(0.2) // Increased from 0.1 to 0.2 for better visibility

    // Button hover effects
    this.startButton.on('pointerover', () => {
      this.tweens.add({
        targets: this.startButton,
        scaleX: 0.22, // 0.2 * 1.1 = 0.22
        scaleY: 0.22,
        duration: 100,
        ease: 'Power2'
      })
      
      // Show canonball to the left of the start button - FIXED positioning
      const canonballX = gameWidth / 2 - 150 // Fixed X position
      const canonballY = buttonY // Use buttonY instead of gameHeight calculation
      this.canonballImage.setPosition(canonballX, canonballY)
      this.canonballImage.setVisible(true)
    })

    this.startButton.on('pointerout', () => {
      this.tweens.add({
        targets: this.startButton,
        scaleX: 0.2, // Back to base scale
        scaleY: 0.2,
        duration: 100,
        ease: 'Power2'
      })
      
      // Hide canonball when not hovering
      this.canonballImage.setVisible(false)
    })

    this.startButton.on('pointerdown', () => {
      this.tweens.add({
        targets: this.startButton,
        scaleX: 0.19, // 0.2 * 0.95 = 0.19
        scaleY: 0.19,
        duration: 50,
        yoyo: true,
        ease: 'Power2'
      })
    })

    this.startButton.on('pointerup', () => {
      this.shootCanonballAndStart()
    })

    // Pulsing glow effect
    this.tweens.add({
      targets: this.startButton,
      alpha: 0.8,
      duration: 1500,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    })

    // Create Options button
    this.createOptionsButton(gameWidth, gameHeight)
    
    // Create High Scores button
    this.createHighScoresButton(gameWidth, gameHeight)
  }

  private createOptionsButton(gameWidth: number, gameHeight: number) {
    const buttonY = gameHeight * 0.75

    // Create options button using the provided image
    const optionsButton = this.add.image(gameWidth / 2, buttonY, 'optionsButton')
    optionsButton.setOrigin(0.5)
    optionsButton.setInteractive()
    optionsButton.setScale(0.2) // Same scale as start button for consistency

    // Button hover effects
    optionsButton.on('pointerover', () => {
      this.tweens.add({
        targets: optionsButton,
        scaleX: 0.22, // 0.2 * 1.1 = 0.22
        scaleY: 0.22,
        duration: 100,
        ease: 'Power2'
      })
      
      // Show canonball to the left of the options button - FIXED positioning
      const canonballX = gameWidth / 2 - 150 // Fixed X position
      const canonballY = buttonY // Use buttonY directly
      this.canonballImage.setPosition(canonballX, canonballY)
      this.canonballImage.setVisible(true)
    })

    optionsButton.on('pointerout', () => {
      this.tweens.add({
        targets: optionsButton,
        scaleX: 0.2, // Back to base scale
        scaleY: 0.2,
        duration: 100,
        ease: 'Power2'
      })
      
      // Hide canonball when not hovering
      this.canonballImage.setVisible(false)
    })

    optionsButton.on('pointerdown', () => {
      this.tweens.add({
        targets: optionsButton,
        scaleX: 0.19, // 0.2 * 0.95 = 0.19
        scaleY: 0.19,
        duration: 50,
        yoyo: true,
        ease: 'Power2'
      })
    })

    optionsButton.on('pointerup', () => {
      this.openOptions()
    })

    // Pulsing glow effect
    this.tweens.add({
      targets: optionsButton,
      alpha: 0.8,
      duration: 1500,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    })
  }

  private createHighScoresButton(gameWidth: number, gameHeight: number) {
    const buttonY = gameHeight * 0.9

    // Create high scores button text (since we don't have a specific image for it)
    const highScoresButton = this.add.text(gameWidth / 2, buttonY, '🏆 HIGH SCORES', {
      fontSize: '24px',
      color: '#ffaa00',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: '#000000',
        blur: 4,
        fill: true
      }
    })
    highScoresButton.setOrigin(0.5)
    highScoresButton.setInteractive()

    // Button hover effects
    highScoresButton.on('pointerover', () => {
      highScoresButton.setColor('#ffffff')
      this.tweens.add({
        targets: highScoresButton,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 100,
        ease: 'Power2'
      })
      
      // Show canonball to the left of the high scores button
      const canonballX = gameWidth / 2 - 150
      const canonballY = buttonY
      this.canonballImage.setPosition(canonballX, canonballY)
      this.canonballImage.setVisible(true)
    })

    highScoresButton.on('pointerout', () => {
      highScoresButton.setColor('#ffaa00')
      this.tweens.add({
        targets: highScoresButton,
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 100,
        ease: 'Power2'
      })
      
      // Hide canonball when not hovering
      this.canonballImage.setVisible(false)
    })

    highScoresButton.on('pointerdown', () => {
      this.tweens.add({
        targets: highScoresButton,
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 50,
        yoyo: true,
        ease: 'Power2'
      })
    })

    highScoresButton.on('pointerup', () => {
      this.openHighScores()
    })

    // Pulsing glow effect
    this.tweens.add({
      targets: highScoresButton,
      alpha: 0.8,
      duration: 1500,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    })
  }

  private openHighScores() {
    console.log('MainMenu: Opening high scores...')
    
    // Stop the menu music
    if (this.backgroundMusic) {
      this.backgroundMusic.stop()
    }

    // Transition to high scores scene
    this.cameras.main.fadeOut(300, 0, 0, 0)
    
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('HighScoreScene')
    })
  }

  private openOptions() {
    console.log('MainMenu: Opening options...')
    
    // Stop the menu music
    if (this.backgroundMusic) {
      this.backgroundMusic.stop()
    }

    // Transition to options scene
    this.cameras.main.fadeOut(300, 0, 0, 0)
    
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('Options')
    })
  }

  private shootCanonballAndStart() {
    console.log('MainMenu: Starting canonball animation...')
    
    // Get game dimensions within this method scope
    const gameWidth = this.sys.game.config.width as number
    const gameHeight = this.sys.game.config.height as number
    
    // Get the current position of the hover canonball (next to the button)
    const startX = this.canonballImage.x
    const startY = this.canonballImage.y
    
    // Add rumbling effect to the start button
    const rumbleDuration = 750 // Increased from 500ms to 750ms (added 0.25 seconds)
    const rumbleIntensity = 3 // How many pixels to shake
    
    // Create rumbling tween for the start button
    this.tweens.add({
      targets: this.startButton,
      x: this.startButton.x + rumbleIntensity,
      y: this.startButton.y + rumbleIntensity,
      duration: 50,
      ease: 'Power2.easeInOut',
      yoyo: true,
      repeat: Math.floor(rumbleDuration / 100), // Repeat for the duration
      onComplete: () => {
        // Reset button position after rumbling
        this.startButton.setPosition(gameWidth / 2, gameHeight * 0.6)
        
        // NOW hide the canonball hover effect and fire the canonball
        this.canonballImage.setVisible(false)
        this.fireCanonball(startX, startY)
      }
    })
  }

  private fireCanonball(startX: number, startY: number) {
    // Play the fire sound effect when canonball is fired
    this.sound.play('fire', {
      volume: 0.6, // Good volume level for the fire sound
      rate: 1.0   // Normal playback rate
    })
    
    // Get game dimensions for positioning
    const gameWidth = this.sys.game.config.width as number
    const gameHeight = this.sys.game.config.height as number
    const buttonY = gameHeight * 0.6
    
    // Create explosion effect at a moderate distance from the start button
    const explosionX = gameWidth / 2 - 120 // Balanced distance - closer than 200, further than 50
    const explosionY = buttonY // Same Y as the button
    this.createExplosionEffect(explosionX, explosionY)
    
    // Create a new canonball for the shooting animation at the hover position
    const shootingCanonball = this.add.image(startX, startY, 'canonball')
    shootingCanonball.setScale(0.075) // Match the hover canonball scale exactly
    shootingCanonball.setOrigin(0.5, 0.5)
    
    // Animate the canonball shooting across the screen from its current position
    this.tweens.add({
      targets: shootingCanonball,
      x: -100, // Shoot to the left side off-screen
      duration: 600, // Reduced from 800ms to 600ms for faster travel
      ease: 'Power2.easeIn',
      onComplete: () => {
        // Clean up the shooting canonball
        shootingCanonball.destroy()
        
        // Now start the actual game transition
        this.startGameTransition()
      }
    })
    
    // Add some rotation to make it look more dynamic
    this.tweens.add({
      targets: shootingCanonball,
      rotation: Math.PI * 4, // 2 full rotations
      duration: 600, // Match the movement duration
      ease: 'Linear'
    })
  }

  private createExplosionEffect(x: number, y: number) {
    // Create explosion visual
    const explosion = this.add.graphics()
    explosion.fillStyle(0xff6600, 0.8)
    explosion.fillCircle(x, y, 30) // Orange outer circle
    explosion.fillStyle(0xffaa00, 0.6)
    explosion.fillCircle(x, y, 20) // Yellow middle circle
    explosion.fillStyle(0xffffff, 0.4)
    explosion.fillCircle(x, y, 10) // White center circle
    
    // Add explosion particles
    explosion.lineStyle(3, 0xff3300, 0.8)
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      const startRadius = 15
      const endRadius = 40
      explosion.beginPath()
      explosion.moveTo(
        x + Math.cos(angle) * startRadius,
        y + Math.sin(angle) * startRadius
      )
      explosion.lineTo(
        x + Math.cos(angle) * endRadius,
        y + Math.sin(angle) * endRadius
      )
      explosion.strokePath()
    }
    
    explosion.setDepth(100)
    
    // Clean up explosion effect after 300ms
    this.time.delayedCall(300, () => {
      if (explosion && explosion.active) {
        explosion.destroy()
      }
    })
  }

  private startGameTransition() {
    console.log('MainMenu: Starting game transition...')
    
    // Stop the menu music
    if (this.backgroundMusic) {
      this.backgroundMusic.stop()
    }

    // Add error handling for scene transition
    try {
      // Transition to the game scene
      this.cameras.main.fadeOut(500, 0, 0, 0)
      
      this.cameras.main.once('camerafadeoutcomplete', () => {
        console.log('MainMenu: Fade complete, starting Game scene...')
        this.scene.start('Game')
      })
      
      // Fallback in case fade doesn't complete
      this.time.delayedCall(1000, () => {
        if (this.scene.isActive('MainMenu')) {
          console.log('MainMenu: Fallback transition to Game scene...')
          this.scene.start('Game')
        }
      })
      
    } catch (error) {
      console.error('Error during scene transition:', error)
      // Direct transition as fallback
      this.scene.start('Game')
    }
  }

  private startGame() {
    // This method is now just a wrapper that calls the new shooting animation
    this.shootCanonballAndStart()
  }

  destroy() {
    // Clean up music
    if (this.backgroundMusic) {
      this.backgroundMusic.stop()
      this.backgroundMusic.destroy()
    }
    
  }
}