
// src/game/scenes/Loading.ts

import { Scene } from 'phaser'

export class Loading extends Scene {
  private logo!: Phaser.GameObjects.Image
  private fadeComplete: boolean = false
  private slimeSound!: Phaser.Sound.BaseSound
  private hasUserInteracted: boolean = false
  private clickToStartText!: Phaser.GameObjects.Text
  private currentPhase: 'interaction' | 'logo' | 'complete' = 'interaction'

  constructor() {
    super('Loading')
  }

  preload() {
    // Load the developer logo
    this.load.image('toxic', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/toxic-QlgPZy7s8QxdeHF26sadU7aUVor6EN.png')
    
    // Load the slime sound effect
    this.load.audio('slime', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/slime-jYKxQKdvsP0bkWRABECWFdgIwJyFpS.mp3')
  }

  create() {
    const gameWidth = this.sys.game.config.width as number
    const gameHeight = this.sys.game.config.height as number

    // Set black background
    this.cameras.main.setBackgroundColor('#000000')

    // Create the logo but keep it hidden initially
    this.logo = this.add.image(gameWidth / 2, gameHeight / 2, 'toxic')
    this.logo.setOrigin(0.5)
    this.logo.setScale(0.5)
    this.logo.setAlpha(0)

    // Create "Click to Start" text for the interaction phase
    this.clickToStartText = this.add.text(gameWidth / 2, gameHeight / 2, 'Click anywhere to continue', {
      fontSize: '32px',
      color: '#ffffff',
      align: 'center'
    })
    this.clickToStartText.setOrigin(0.5)

    // Add a subtle pulsing effect to the text
    this.tweens.add({
      targets: this.clickToStartText,
      alpha: 0.6,
      duration: 1000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    })

    // Start in interaction phase
    this.currentPhase = 'interaction'

    // Set up input handlers
    this.input.keyboard!.on('keydown', () => {
      this.handleUserInput()
    })

    this.input.on('pointerdown', () => {
      this.handleUserInput()
    })
  }

  private handleUserInput() {
    if (this.currentPhase === 'interaction' && !this.hasUserInteracted) {
      this.hasUserInteracted = true
      console.log('User interaction detected - transitioning to logo phase')
      this.transitionToLogoPhase()
    } else if (this.currentPhase === 'logo' && !this.fadeComplete) {
      // Allow skipping the logo phase
      this.fadeOutAndTransition()
    }
  }

  private transitionToLogoPhase() {
    this.currentPhase = 'logo'

    // Fade out the click to start text
    this.tweens.add({
      targets: this.clickToStartText,
      alpha: 0,
      duration: 500,
      ease: 'Power2.easeIn',
      onComplete: () => {
        // Hide the text completely
        this.clickToStartText.setVisible(false)
        
        // Start the logo sequence
        this.startLogoSequence()
      }
    })
  }

  private startLogoSequence() {
    console.log('Starting logo sequence with sound')

    // Create the slime sound (audio context should be unlocked now)
    this.slimeSound = this.sound.add('slime', {
      volume: 0.52 // Reduced from 0.8 by 35% (0.8 * 0.65 = 0.52)
    })

    // Fade in the logo
    this.tweens.add({
      targets: this.logo,
      alpha: 1,
      duration: 1000,
      ease: 'Power2.easeOut',
      onComplete: () => {
        // Play the slime sound when logo is fully visible
        console.log('Playing slime sound...')
        
        try {
          const soundInstance = this.slimeSound.play()
          console.log('Slime sound play result:', soundInstance)
        } catch (error) {
          console.error('Error playing slime sound:', error)
        }
        
        // Hold the logo for a moment, then transition
        this.time.delayedCall(1500, () => {
          this.fadeOutAndTransition()
        })
      }
    })
  }

  private fadeOutAndTransition() {
    if (this.fadeComplete) return
    this.fadeComplete = true
    this.currentPhase = 'complete'

    console.log('Fading out and transitioning to main menu...')

    // Stop the slime sound if it's still playing
    if (this.slimeSound && this.slimeSound.isPlaying) {
      console.log('Stopping slime sound')
      this.slimeSound.stop()
    }

    // Fade out the logo
    this.tweens.add({
      targets: this.logo,
      alpha: 0,
      duration: 500,
      ease: 'Power2.easeIn',
      onComplete: () => {
        this.scene.start('MainMenu')
      }
    })
  }

  destroy() {
    // Clean up sound
    if (this.slimeSound) {
      if (this.slimeSound.isPlaying) {
        this.slimeSound.stop()
      }
      this.slimeSound.destroy()
    }
    
  }
}
