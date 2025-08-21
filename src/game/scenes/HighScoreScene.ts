
// src/game/scenes/HighScoreScene.ts

import { Scene } from 'phaser'

interface ScoreEntry {
  name: string
  score: number
  timestamp: string
  id: number
}

interface HighScoreResponse {
  success: boolean
  scores: ScoreEntry[]
  total: number
}

export class HighScoreScene extends Scene {
  private titleText!: Phaser.GameObjects.Text
  private scoreTexts: Phaser.GameObjects.Text[] = []
  private backButton!: Phaser.GameObjects.Text
  private loadingText!: Phaser.GameObjects.Text

  constructor() {
    super('HighScoreScene')
  }

  create() {
    const gameWidth = this.sys.game.config.width as number
    const gameHeight = this.sys.game.config.height as number

    // Create title
    this.titleText = this.add.text(gameWidth / 2, 80, '🏆 High Scores', {
      fontSize: '48px',
      color: '#ffffff',
      align: 'center',
      fontStyle: 'bold'
    })
    this.titleText.setOrigin(0.5)

    // Create loading text
    this.loadingText = this.add.text(gameWidth / 2, gameHeight / 2, 'Loading scores...', {
      fontSize: '24px',
      color: '#cccccc',
      align: 'center'
    })
    this.loadingText.setOrigin(0.5)

    // Create back button
    this.backButton = this.add.text(gameWidth / 2, gameHeight - 80, '← Back to Menu', {
      fontSize: '24px',
      color: '#ffaa00',
      align: 'center'
    })
    this.backButton.setOrigin(0.5)
    this.backButton.setInteractive()

    // Back button interactions
    this.backButton.on('pointerover', () => {
      this.backButton.setColor('#ffffff')
      this.tweens.add({
        targets: this.backButton,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 100,
        ease: 'Power2'
      })
    })

    this.backButton.on('pointerout', () => {
      this.backButton.setColor('#ffaa00')
      this.tweens.add({
        targets: this.backButton,
        scaleX: 1.0,
        scaleY: 1.0,
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

    // Add keyboard shortcut
    this.input.keyboard!.on('keydown-ESC', () => {
      this.returnToMainMenu()
    })

    // Fetch high scores
    this.fetchHighScores()
  }

  private async fetchHighScores() {
    try {
      console.log('Fetching high scores from API...')
      
      const response = await fetch('https://chariot-6jeu.onrender.com/highscores', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: HighScoreResponse = await response.json()
      
      if (data.success && data.scores) {
        console.log(`Successfully loaded ${data.scores.length} high scores`)
        this.displayScores(data.scores)
      } else {
        throw new Error('Invalid response format')
      }

    } catch (error) {
      console.error('Error fetching high scores:', error)
      this.displayError()
    }
  }

  private displayScores(scores: ScoreEntry[]) {
    // Hide loading text
    this.loadingText.setVisible(false)

    const gameWidth = this.sys.game.config.width as number
    const startY = 160 // Start below the title
    const lineHeight = 40 // Space between each score line

    // Take only top 10 scores
    const topScores = scores.slice(0, 10)

    // Display each score
    topScores.forEach((scoreEntry, index) => {
      const rank = index + 1
      const yPosition = startY + (index * lineHeight)
      
      // Format the score with commas for better readability
      const formattedScore = scoreEntry.score.toLocaleString()
      
      // Create score text with rank, name, and score
      const scoreText = this.add.text(
        gameWidth / 2, 
        yPosition, 
        `${rank}. ${scoreEntry.name} - ${formattedScore}`, 
        {
          fontSize: '20px',
          color: index < 3 ? '#ffaa00' : '#ffffff', // Gold color for top 3
          align: 'center',
          fontStyle: index === 0 ? 'bold' : 'normal' // Bold for #1
        }
      )
      scoreText.setOrigin(0.5)

      // Add subtle glow effect for top 3
      if (index < 3) {
        scoreText.setStroke('#000000', 2)
      }

      this.scoreTexts.push(scoreText)
    })

    // If no scores available
    if (topScores.length === 0) {
      const noScoresText = this.add.text(gameWidth / 2, startY + 100, 'No scores available yet.\nBe the first to set a high score!', {
        fontSize: '24px',
        color: '#cccccc',
        align: 'center',
        lineSpacing: 10
      })
      noScoresText.setOrigin(0.5)
      this.scoreTexts.push(noScoresText)
    }

    console.log(`Displayed ${topScores.length} high scores`)
  }

  private displayError() {
    // Hide loading text
    this.loadingText.setVisible(false)

    const gameWidth = this.sys.game.config.width as number
    const gameHeight = this.sys.game.config.height as number

    // Show error message
    const errorText = this.add.text(gameWidth / 2, gameHeight / 2, 'Error loading scores\n\nPlease check your internet connection\nand try again later.', {
      fontSize: '24px',
      color: '#ff6666',
      align: 'center',
      lineSpacing: 10
    })
    errorText.setOrigin(0.5)
    this.scoreTexts.push(errorText)

    console.log('Displayed error message for failed score fetch')
  }

  private returnToMainMenu() {
    console.log('Returning to main menu from high scores...')
    
    // Fade out transition
    this.cameras.main.fadeOut(300, 0, 0, 0)
    
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('MainMenu')
    })
  }

  destroy() {
    // Clean up score texts
    this.scoreTexts.forEach(text => {
      if (text && text.active) {
        text.destroy()
      }
    })
    this.scoreTexts = []
    
  }
}
