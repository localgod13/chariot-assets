
// src/game/scenes/Options.ts

import { Scene } from 'phaser'

export class Options extends Scene {
  private backgroundMusic!: Phaser.Sound.BaseSound
  private backButton!: Phaser.GameObjects.Container
  private volumeSlider!: Phaser.GameObjects.Container
  private volumeHandle!: Phaser.GameObjects.Graphics
  private volumeTrack!: Phaser.GameObjects.Graphics
  private volumeText!: Phaser.GameObjects.Text
  private volumeValueText!: Phaser.GameObjects.Text
  private isDragging: boolean = false
  private sliderWidth: number = 300
  private currentVolume: number = 1.0

  constructor() {
    super('Options')
  }

  preload() {
    // Load the same assets as the main menu for consistency
    this.load.image('background', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/BG-Lm6OWlkXYa6Rztqzp3Yq1USBR34bZM.png')
    this.load.audio('arena', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/arena-6OLO9iZKW6G7wyuzBXPiOe8q62FiYD.mp3')
  }

  create() {
    const gameWidth = this.sys.game.config.width as number
    const gameHeight = this.sys.game.config.height as number

    // Get current volume from the sound manager
    this.currentVolume = this.sound.volume

    // Add background
    const bg = this.add.image(0, 0, 'background')
    bg.setOrigin(0, 0)
    bg.setDisplaySize(gameWidth, gameHeight)

    // Add a dark overlay for better text readability
    const overlay = this.add.graphics()
    overlay.fillStyle(0x000000, 0.7)
    overlay.fillRect(0, 0, gameWidth, gameHeight)

    // Options Title
    const title = this.add.text(gameWidth / 2, gameHeight * 0.2, 'OPTIONS', {
      fontSize: '64px',
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
    title.setOrigin(0.5)

    // Volume Section
    this.createVolumeControls(gameWidth, gameHeight)

    // Back Button
    this.createBackButton(gameWidth, gameHeight)

    // Start background music at current volume
    this.backgroundMusic = this.sound.add('arena', {
      loop: true,
      volume: 0.3 * this.currentVolume // Apply current volume setting
    })
    this.backgroundMusic.play()

    // Add keyboard shortcuts
    this.input.keyboard!.on('keydown-ESC', () => {
      this.returnToMainMenu()
    })

    // Add particle effects for atmosphere
    this.createParticleEffects(gameWidth, gameHeight)
  }

  private createVolumeControls(gameWidth: number, gameHeight: number) {
    const centerY = gameHeight * 0.5

    // Volume label
    this.volumeText = this.add.text(gameWidth / 2, centerY - 60, 'Master Volume', {
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    })
    this.volumeText.setOrigin(0.5)

    // Volume value display
    this.volumeValueText = this.add.text(gameWidth / 2, centerY - 20, `${Math.round(this.currentVolume * 100)}%`, {
      fontSize: '24px',
      color: '#ffaa00',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    })
    this.volumeValueText.setOrigin(0.5)

    // Create volume slider
    this.createVolumeSlider(gameWidth / 2, centerY + 40)
  }

  private createVolumeSlider(x: number, y: number) {
    // Create slider container
    this.volumeSlider = this.add.container(x, y)

    // Create slider track
    this.volumeTrack = this.add.graphics()
    this.volumeTrack.fillStyle(0x333333, 0.8)
    this.volumeTrack.fillRoundedRect(-this.sliderWidth / 2, -8, this.sliderWidth, 16, 8)
    this.volumeTrack.lineStyle(2, 0x666666, 1)
    this.volumeTrack.strokeRoundedRect(-this.sliderWidth / 2, -8, this.sliderWidth, 16, 8)

    // Create volume fill (shows current volume level)
    const volumeFill = this.add.graphics()
    const fillWidth = this.sliderWidth * this.currentVolume
    volumeFill.fillStyle(0x4a2c5a, 0.9)
    volumeFill.fillRoundedRect(-this.sliderWidth / 2, -6, fillWidth, 12, 6)

    // Create slider handle
    this.volumeHandle = this.add.graphics()
    this.volumeHandle.fillStyle(0xff6b9d, 1)
    this.volumeHandle.fillCircle(0, 0, 12)
    this.volumeHandle.lineStyle(3, 0xffffff, 1)
    this.volumeHandle.strokeCircle(0, 0, 12)

    // Position handle based on current volume
    const handleX = (this.currentVolume - 0.5) * this.sliderWidth
    this.volumeHandle.x = handleX

    // Add components to slider container
    this.volumeSlider.add([this.volumeTrack, volumeFill, this.volumeHandle])

    // Make slider interactive
    this.volumeSlider.setSize(this.sliderWidth + 24, 40)
    this.volumeSlider.setInteractive()

    // Handle slider interactions
    this.volumeSlider.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.isDragging = true
      this.updateVolumeFromPointer(pointer)
    })

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging) {
        this.updateVolumeFromPointer(pointer)
      }
    })

    this.input.on('pointerup', () => {
      this.isDragging = false
    })

    // Hover effects
    this.volumeSlider.on('pointerover', () => {
      this.volumeHandle.clear()
      this.volumeHandle.fillStyle(0xff8bbd, 1)
      this.volumeHandle.fillCircle(0, 0, 14)
      this.volumeHandle.lineStyle(3, 0xffffff, 1)
      this.volumeHandle.strokeCircle(0, 0, 14)
    })

    this.volumeSlider.on('pointerout', () => {
      if (!this.isDragging) {
        this.volumeHandle.clear()
        this.volumeHandle.fillStyle(0xff6b9d, 1)
        this.volumeHandle.fillCircle(0, 0, 12)
        this.volumeHandle.lineStyle(3, 0xffffff, 1)
        this.volumeHandle.strokeCircle(0, 0, 12)
      }
    })
  }

  private updateVolumeFromPointer(pointer: Phaser.Input.Pointer) {
    // Get local position relative to slider
    const localX = pointer.x - this.volumeSlider.x
    
    // Clamp to slider bounds
    const clampedX = Phaser.Math.Clamp(localX, -this.sliderWidth / 2, this.sliderWidth / 2)
    
    // Convert to volume (0-1)
    this.currentVolume = (clampedX + this.sliderWidth / 2) / this.sliderWidth
    this.currentVolume = Phaser.Math.Clamp(this.currentVolume, 0, 1)

    // Update handle position
    this.volumeHandle.x = clampedX

    // Update volume fill
    this.updateVolumeFill()

    // Update volume text
    this.volumeValueText.setText(`${Math.round(this.currentVolume * 100)}%`)

    // Apply volume to sound manager
    this.sound.setVolume(this.currentVolume)

    // Store volume in localStorage for persistence
    localStorage.setItem('gameVolume', this.currentVolume.toString())
  }

  private updateVolumeFill() {
    // Find and update the volume fill graphics
    const volumeFill = this.volumeSlider.list[1] as Phaser.GameObjects.Graphics
    volumeFill.clear()
    
    const fillWidth = this.sliderWidth * this.currentVolume
    volumeFill.fillStyle(0x4a2c5a, 0.9)
    volumeFill.fillRoundedRect(-this.sliderWidth / 2, -6, fillWidth, 12, 6)
  }

  private createBackButton(gameWidth: number, gameHeight: number) {
    const buttonY = gameHeight * 0.8
    const buttonWidth = 200
    const buttonHeight = 60

    // Button background
    const buttonBg = this.add.graphics()
    buttonBg.fillStyle(0x4a2c5a, 0.9)
    buttonBg.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 10)
    buttonBg.lineStyle(3, 0xff6b9d, 1)
    buttonBg.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 10)

    // Button text
    const buttonText = this.add.text(0, 0, 'BACK', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    })
    buttonText.setOrigin(0.5)

    // Create button container
    this.backButton = this.add.container(gameWidth / 2, buttonY, [buttonBg, buttonText])
    this.backButton.setSize(buttonWidth, buttonHeight)
    this.backButton.setInteractive()

    // Button hover effects
    this.backButton.on('pointerover', () => {
      buttonBg.clear()
      buttonBg.fillStyle(0x6b4c7a, 1)
      buttonBg.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 10)
      buttonBg.lineStyle(4, 0xff8bbd, 1)
      buttonBg.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 10)
      
      this.tweens.add({
        targets: this.backButton,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 100,
        ease: 'Power2'
      })
    })

    this.backButton.on('pointerout', () => {
      buttonBg.clear()
      buttonBg.fillStyle(0x4a2c5a, 0.9)
      buttonBg.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 10)
      buttonBg.lineStyle(3, 0xff6b9d, 1)
      buttonBg.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 10)
      
      this.tweens.add({
        targets: this.backButton,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
        ease: 'Power2'
      })
    })

    this.backButton.on('pointerdown', () => {
      this.tweens.add({
        targets: this.backButton,
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 50,
        yoyo: true,
        ease: 'Power2'
      })
    })

    this.backButton.on('pointerup', () => {
      this.returnToMainMenu()
    })

    // Pulsing glow effect
    this.tweens.add({
      targets: buttonBg,
      alpha: 0.7,
      duration: 1500,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    })
  }

  private createParticleEffects(gameWidth: number, gameHeight: number) {
    // Create some floating dust particles for atmosphere
    for (let i = 0; i < 15; i++) {
      const particle = this.add.graphics()
      particle.fillStyle(0xffffff, 0.2)
      particle.fillCircle(0, 0, Math.random() * 2 + 1)
      
      const x = Math.random() * gameWidth
      const y = Math.random() * gameHeight
      particle.setPosition(x, y)

      // Animate particles floating upward
      this.tweens.add({
        targets: particle,
        y: y - gameHeight - 100,
        duration: (Math.random() * 12000) + 18000,
        ease: 'Linear',
        repeat: -1,
        delay: Math.random() * 6000,
        onRepeat: () => {
          particle.setPosition(Math.random() * gameWidth, gameHeight + 100)
        }
      })

      // Add slight horizontal drift
      this.tweens.add({
        targets: particle,
        x: x + (Math.random() - 0.5) * 80,
        duration: (Math.random() * 6000) + 4000,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1
      })
    }
  }

  private returnToMainMenu() {
    console.log('Options: Returning to main menu...')
    
    // Stop the options music
    if (this.backgroundMusic) {
      this.backgroundMusic.stop()
    }

    // Transition back to main menu
    this.cameras.main.fadeOut(300, 0, 0, 0)
    
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('MainMenu')
    })
  }

  init() {
    // Load saved volume setting
    const savedVolume = localStorage.getItem('gameVolume')
    if (savedVolume) {
      this.currentVolume = parseFloat(savedVolume)
      this.sound.setVolume(this.currentVolume)
    }
  }

  destroy() {
    // Clean up music
    if (this.backgroundMusic) {
      this.backgroundMusic.stop()
      this.backgroundMusic.destroy()
    }
    
  }
}