
// src/game/objects/Card.ts

import { Scene } from 'phaser'
import { Upgrade } from '../config/upgrades'
import { COLORS } from '../config/constants'

export class Card extends Phaser.GameObjects.Container {
  private background: Phaser.GameObjects.Graphics
  private titleText: Phaser.GameObjects.Text
  private descText: Phaser.GameObjects.Text
  private cardImage: Phaser.GameObjects.Image | null = null
  private upgrade: Upgrade
  private isHovered: boolean = false

  constructor(scene: Scene, x: number, y: number, upgrade: Upgrade) {
    super(scene, x, y)
    this.upgrade = upgrade
    
    // Add card image if available
    if (upgrade.imageKey) {
      this.cardImage = scene.add.image(0, -20, upgrade.imageKey)
      
      // Special handling for homing missile card - make it smaller and move it up
      if (upgrade.imageKey === 'hm') {
        this.cardImage.setScale(0.27) // Increased from 0.25 to 0.27 - slightly larger
        this.cardImage.setY(-30) // Move it up from -20 to -30
      } else {
        this.cardImage.setScale(0.3) // Standard size for all other cards
      }
      
      this.cardImage.setOrigin(0.5)
      this.add(this.cardImage)
      
      // Position title in lower area when image is present
      this.titleText = scene.add.text(0, 50, upgrade.name, {
        fontSize: '16px',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: 220 }
      })
      this.titleText.setOrigin(0.5)
      this.add(this.titleText)
      
      // Position description at bottom when image is present
      this.descText = scene.add.text(0, 70, upgrade.description, {
        fontSize: '12px',
        color: '#cccccc',
        align: 'center',
        wordWrap: { width: 220 }
      })
      this.descText.setOrigin(0.5)
      this.add(this.descText)
      
      // Don't create the graphics background when image is present
      this.background = null as any
    } else {
      // Original layout for cards without images - create graphics background
      this.background = scene.add.graphics()
      this.background.fillStyle(COLORS.UI_DARK)
      this.background.fillRoundedRect(-120, -80, 240, 160, 10)
      this.background.lineStyle(3, upgrade.color)
      this.background.strokeRoundedRect(-120, -80, 240, 160, 10)
      this.add(this.background)
      
      // Title
      this.titleText = scene.add.text(0, -40, upgrade.name, {
        fontSize: '18px',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: 220 }
      })
      this.titleText.setOrigin(0.5)
      this.add(this.titleText)
      
      // Description
      this.descText = scene.add.text(0, 10, upgrade.description, {
        fontSize: '14px',
        color: '#cccccc',
        align: 'center',
        wordWrap: { width: 220 }
      })
      this.descText.setOrigin(0.5)
      this.add(this.descText)
    }
    
    // Remove rarity indicator for image cards, keep for non-image cards
    if (!upgrade.imageKey) {
      // Rarity indicator
      const rarityColor = this.getRarityColor(upgrade.rarity)
      const rarityBg = scene.add.graphics()
      rarityBg.fillStyle(rarityColor)
      rarityBg.fillRoundedRect(-60, 50, 120, 20, 5)
      this.add(rarityBg)
      
      const rarityText = scene.add.text(0, 60, upgrade.rarity.toUpperCase(), {
        fontSize: '12px',
        color: '#ffffff',
        align: 'center'
      })
      rarityText.setOrigin(0.5)
      this.add(rarityText)
    }
    
    // Add to scene first
    scene.add.existing(this)
    
    // Set up interaction with proper bounds - use a simpler approach
    this.setSize(240, 160)
    this.setInteractive()
    this.setupInteractions()
  }

  private getRarityColor(rarity: string): number {
    switch (rarity) {
      case 'common': return 0x888888
      case 'rare': return 0x0088ff
      case 'epic': return 0x8800ff
      case 'legendary': return 0xff8800
      default: return 0x888888
    }
  }

  private setupInteractions() {
    this.on('pointerover', () => {
      this.isHovered = true
      this.setScale(1.05)
      
      // Only update background if it exists (for non-image cards)
      if (this.background) {
        this.background.clear()
        this.background.fillStyle(COLORS.UI_LIGHT)
        this.background.fillRoundedRect(-120, -80, 240, 160, 10)
        this.background.lineStyle(4, this.upgrade.color)
        this.background.strokeRoundedRect(-120, -80, 240, 160, 10)
      }
    })
    
    this.on('pointerout', () => {
      this.isHovered = false
      this.setScale(1)
      
      // Only update background if it exists (for non-image cards)
      if (this.background) {
        this.background.clear()
        this.background.fillStyle(COLORS.UI_DARK)
        this.background.fillRoundedRect(-120, -80, 240, 160, 10)
        this.background.lineStyle(3, this.upgrade.color)
        this.background.strokeRoundedRect(-120, -80, 240, 160, 10)
      }
    })
    
    this.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Prevent event bubbling
      pointer.event.stopPropagation()
      
      console.log('Card clicked:', this.upgrade.name)
      const scene = this.scene as any
      if (scene.selectUpgrade) {
        scene.selectUpgrade(this.upgrade)
      }
    })
    
    // Add visual feedback for clicks
    this.on('pointerup', () => {
      if (this.isHovered) {
        this.setScale(1.05)
      } else {
        this.setScale(1)
      }
    })
  }
}
