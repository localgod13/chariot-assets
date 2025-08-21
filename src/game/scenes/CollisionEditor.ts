
// src/game/scenes/CollisionEditor.ts

import { Scene } from 'phaser'
import { GAME_CONFIG } from '../config/constants'

interface CollisionBox {
  id: string
  x: number
  y: number
  width: number
  height: number
  graphics: Phaser.GameObjects.Graphics
  handles: Phaser.GameObjects.Graphics[]
}

export class CollisionEditor extends Scene {
  private collisionBoxes: CollisionBox[] = []
  private selectedBox: CollisionBox | null = null
  private isDragging: boolean = false
  private isResizing: boolean = false
  private dragStartX: number = 0
  private dragStartY: number = 0
  private resizeHandle: number = -1 // 0=TL, 1=TR, 2=BL, 3=BR
  private nextId: number = 1
  
  // UI Elements
  private instructionsText!: Phaser.GameObjects.Text
  private exportButton!: Phaser.GameObjects.Graphics
  private exportButtonText!: Phaser.GameObjects.Text
  private clearButton!: Phaser.GameObjects.Graphics
  private clearButtonText!: Phaser.GameObjects.Text

  constructor() {
    super("CollisionEditor")
  }

  preload() {
    // Load the same background as the game
    this.load.image('background', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/BG-Lm6OWlkXYa6Rztqzp3Yq1USBR34bZM.png')
  }

  create() {
    // Add the background image
    const bg = this.add.image(0, 0, 'background')
    bg.setOrigin(0, 0)
    const scaleX = GAME_CONFIG.WORLD.WIDTH / bg.width
    const scaleY = GAME_CONFIG.WORLD.HEIGHT / bg.height
    bg.setScale(scaleX, scaleY)
    
    // Create weapon racks for visual reference
    this.createWeaponRacks()
    
    // Setup camera without zoom to avoid UI positioning issues
    this.cameras.main.setBounds(0, 0, GAME_CONFIG.WORLD.WIDTH, GAME_CONFIG.WORLD.HEIGHT)
    
    // Create UI
    this.createUI()
    
    // Setup input handlers
    this.setupInputHandlers()
    
    // Add camera controls
    this.setupCameraControls()
  }

  private createUI() {
    // Use the actual game canvas dimensions from the config
    const gameWidth = this.sys.game.config.width as number
    const gameHeight = this.sys.game.config.height as number
    
    // Instructions - compact and positioned safely
    this.instructionsText = this.add.text(5, 5, [
      'COLLISION EDITOR (F9)',
      'L-Click: Create box',
      'Drag: Move box',
      'Drag corners: Resize',
      'R-Click or Double-Click: Delete',
      'WASD: Move camera',
      'Mouse Wheel: Zoom in/out'
    ], {
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.8)',
      padding: { x: 6, y: 4 }
    })
    this.instructionsText.setScrollFactor(0)
    this.instructionsText.setDepth(1000)
    
    // Position buttons at bottom with safe margins
    const buttonY = gameHeight - 45
    const buttonWidth = 80
    const buttonHeight = 30
    const margin = 5
    
    // Export button - bottom left
    this.exportButton = this.add.graphics()
    this.exportButton.fillStyle(0x00aa00)
    this.exportButton.fillRoundedRect(margin, buttonY, buttonWidth, buttonHeight, 3)
    this.exportButton.setScrollFactor(0)
    this.exportButton.setDepth(1000)
    this.exportButton.setInteractive(new Phaser.Geom.Rectangle(margin, buttonY, buttonWidth, buttonHeight), Phaser.Geom.Rectangle.Contains)
    
    this.exportButtonText = this.add.text(margin + buttonWidth/2, buttonY + buttonHeight/2, 'EXPORT', {
      fontSize: '12px',
      color: '#ffffff'
    })
    this.exportButtonText.setOrigin(0.5)
    this.exportButtonText.setScrollFactor(0)
    this.exportButtonText.setDepth(1001)
    
    // Clear button - next to export
    const clearButtonX = margin + buttonWidth + 10
    this.clearButton = this.add.graphics()
    this.clearButton.fillStyle(0xaa0000)
    this.clearButton.fillRoundedRect(clearButtonX, buttonY, buttonWidth, buttonHeight, 3)
    this.clearButton.setScrollFactor(0)
    this.clearButton.setDepth(1000)
    this.clearButton.setInteractive(new Phaser.Geom.Rectangle(clearButtonX, buttonY, buttonWidth, buttonHeight), Phaser.Geom.Rectangle.Contains)
    
    this.clearButtonText = this.add.text(clearButtonX + buttonWidth/2, buttonY + buttonHeight/2, 'CLEAR', {
      fontSize: '12px',
      color: '#ffffff'
    })
    this.clearButtonText.setOrigin(0.5)
    this.clearButtonText.setScrollFactor(0)
    this.clearButtonText.setDepth(1001)
    
    // Add debug info to verify positioning
    console.log(`Game dimensions: ${gameWidth}x${gameHeight}`)
    console.log(`Button Y position: ${buttonY}`)
  }

  private setupInputHandlers() {
    // Mouse/pointer events
    this.input.on('pointerdown', this.onPointerDown, this)
    this.input.on('pointermove', this.onPointerMove, this)
    this.input.on('pointerup', this.onPointerUp, this)
    
    // Mouse wheel zoom
    this.input.on('wheel', (pointer: Phaser.Input.Pointer, _gameObjects: any, _deltaX: number, deltaY: number, _deltaZ: number) => {
      const camera = this.cameras.main
      
      // Get the current world point under pointer
      const worldPoint = camera.getWorldPoint(pointer.x, pointer.y)
      
      // Calculate new zoom level
      const zoomSpeed = 0.001
      const newZoom = camera.zoom - camera.zoom * zoomSpeed * deltaY
      camera.zoom = Phaser.Math.Clamp(newZoom, 0.1, 3) // Allow zooming out to 0.1x and in to 3x
      
      // Update camera matrix for accurate world point calculation
      camera.preRender()
      const newWorldPoint = camera.getWorldPoint(pointer.x, pointer.y)
      
      // Adjust camera scroll to keep the pointer under the same world point
      camera.scrollX -= newWorldPoint.x - worldPoint.x
      camera.scrollY -= newWorldPoint.y - worldPoint.y
    })
    
    // Button clicks with event stopping
    this.exportButton.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation()
      this.exportCollisionBoxes()
    })
    
    this.clearButton.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation()
      this.clearAllBoxes()
    })
    
    // F9 key to return to game
    this.input.keyboard!.on('keydown-F9', () => {
      this.scene.start('Game')
    })
  }

  private setupCameraControls() {
    // Camera movement with faster speed
    this.input.keyboard!.on('keydown-W', () => {
      this.cameras.main.scrollY -= 30
    })
    this.input.keyboard!.on('keydown-S', () => {
      this.cameras.main.scrollY += 30
    })
    this.input.keyboard!.on('keydown-A', () => {
      this.cameras.main.scrollX -= 30
    })
    this.input.keyboard!.on('keydown-D', () => {
      this.cameras.main.scrollX += 30
    })
  }

  private onPointerDown(pointer: Phaser.Input.Pointer) {
    // Check if clicking on UI buttons first
    const gameHeight = this.sys.game.config.height as number
    const buttonY = gameHeight - 45
    const buttonWidth = 80
    const buttonHeight = 30
    const margin = 5
    const clearButtonX = margin + buttonWidth + 10
    
    // Check if clicking on export button
    if (pointer.x >= margin && pointer.x <= margin + buttonWidth &&
        pointer.y >= buttonY && pointer.y <= buttonY + buttonHeight) {
      return // Don't process further
    }
    
    // Check if clicking on clear button
    if (pointer.x >= clearButtonX && pointer.x <= clearButtonX + buttonWidth &&
        pointer.y >= buttonY && pointer.y <= buttonY + buttonHeight) {
      return // Don't process further
    }
    
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
    
    if (pointer.rightButtonDown()) {
      // Right click - delete box
      const box = this.getBoxAtPosition(worldPoint.x, worldPoint.y)
      if (box) {
        this.deleteBox(box)
      }
      return
    }
    
    // Check for double-click to delete box
    if (pointer.getDuration() < 300 && pointer.event.detail === 2) {
      const box = this.getBoxAtPosition(worldPoint.x, worldPoint.y)
      if (box) {
        this.deleteBox(box)
        return
      }
    }
    
    // Check if clicking on a resize handle
    const handleInfo = this.getResizeHandleAtPosition(worldPoint.x, worldPoint.y)
    if (handleInfo) {
      this.selectedBox = handleInfo.box
      this.isResizing = true
      this.resizeHandle = handleInfo.handle
      this.dragStartX = worldPoint.x
      this.dragStartY = worldPoint.y
      return
    }
    
    // Check if clicking on an existing box
    const box = this.getBoxAtPosition(worldPoint.x, worldPoint.y)
    if (box) {
      this.selectedBox = box
      this.isDragging = true
      this.dragStartX = worldPoint.x - box.x
      this.dragStartY = worldPoint.y - box.y
      this.updateBoxSelection()
      return
    }
    
    // Create new box
    this.createBox(worldPoint.x, worldPoint.y)
  }

  private onPointerMove(pointer: Phaser.Input.Pointer) {
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
    
    if (this.isResizing && this.selectedBox) {
      this.resizeBox(this.selectedBox, worldPoint.x, worldPoint.y)
    } else if (this.isDragging && this.selectedBox) {
      this.selectedBox.x = worldPoint.x - this.dragStartX
      this.selectedBox.y = worldPoint.y - this.dragStartY
      this.updateBoxGraphics(this.selectedBox)
    }
  }

  private onPointerUp() {
    this.isDragging = false
    this.isResizing = false
    this.resizeHandle = -1
  }

  private createBox(x: number, y: number) {
    const box: CollisionBox = {
      id: `box_${this.nextId++}`,
      x: x,
      y: y,
      width: 100,
      height: 100,
      graphics: this.add.graphics(),
      handles: []
    }
    
    // Create resize handles
    for (let i = 0; i < 4; i++) {
      box.handles.push(this.add.graphics())
    }
    
    this.collisionBoxes.push(box)
    this.selectedBox = box
    this.updateBoxGraphics(box)
    this.updateBoxSelection()
  }

  private updateBoxGraphics(box: CollisionBox) {
    box.graphics.clear()
    
    // Draw box outline
    const isSelected = box === this.selectedBox
    box.graphics.lineStyle(3, isSelected ? 0x00ff00 : 0xff0000, 0.8)
    box.graphics.fillStyle(0xff0000, 0.2)
    box.graphics.fillRect(box.x, box.y, box.width, box.height)
    box.graphics.strokeRect(box.x, box.y, box.width, box.height)
    
    // Update resize handles
    if (isSelected) {
      const handlePositions = [
        { x: box.x, y: box.y }, // Top-left
        { x: box.x + box.width, y: box.y }, // Top-right
        { x: box.x, y: box.y + box.height }, // Bottom-left
        { x: box.x + box.width, y: box.y + box.height } // Bottom-right
      ]
      
      box.handles.forEach((handle, index) => {
        handle.clear()
        handle.fillStyle(0x00ff00)
        handle.fillCircle(handlePositions[index].x, handlePositions[index].y, 8)
        handle.setVisible(true)
      })
    } else {
      box.handles.forEach(handle => handle.setVisible(false))
    }
  }

  private updateBoxSelection() {
    this.collisionBoxes.forEach(box => {
      this.updateBoxGraphics(box)
    })
  }

  private getBoxAtPosition(x: number, y: number): CollisionBox | null {
    for (const box of this.collisionBoxes) {
      if (x >= box.x && x <= box.x + box.width && 
          y >= box.y && y <= box.y + box.height) {
        return box
      }
    }
    return null
  }

  private getResizeHandleAtPosition(x: number, y: number): { box: CollisionBox, handle: number } | null {
    for (const box of this.collisionBoxes) {
      if (box !== this.selectedBox) continue
      
      const handlePositions = [
        { x: box.x, y: box.y }, // Top-left
        { x: box.x + box.width, y: box.y }, // Top-right
        { x: box.x, y: box.y + box.height }, // Bottom-left
        { x: box.x + box.width, y: box.y + box.height } // Bottom-right
      ]
      
      for (let i = 0; i < handlePositions.length; i++) {
        const handle = handlePositions[i]
        const distance = Phaser.Math.Distance.Between(x, y, handle.x, handle.y)
        if (distance <= 12) {
          return { box, handle: i }
        }
      }
    }
    return null
  }

  private resizeBox(box: CollisionBox, x: number, y: number) {
    const originalX = box.x
    const originalY = box.y
    const originalWidth = box.width
    const originalHeight = box.height
    
    switch (this.resizeHandle) {
      case 0: // Top-left
        box.width = originalWidth + (originalX - x)
        box.height = originalHeight + (originalY - y)
        box.x = x
        box.y = y
        break
      case 1: // Top-right
        box.width = x - originalX
        box.height = originalHeight + (originalY - y)
        box.y = y
        break
      case 2: // Bottom-left
        box.width = originalWidth + (originalX - x)
        box.height = y - originalY
        box.x = x
        break
      case 3: // Bottom-right
        box.width = x - originalX
        box.height = y - originalY
        break
    }
    
    // Ensure minimum size
    box.width = Math.max(20, box.width)
    box.height = Math.max(20, box.height)
    
    this.updateBoxGraphics(box)
  }

  private deleteBox(box: CollisionBox) {
    const index = this.collisionBoxes.indexOf(box)
    if (index > -1) {
      box.graphics.destroy()
      box.handles.forEach(handle => handle.destroy())
      this.collisionBoxes.splice(index, 1)
      
      if (this.selectedBox === box) {
        this.selectedBox = null
      }
    }
  }

  private clearAllBoxes() {
    this.collisionBoxes.forEach(box => {
      box.graphics.destroy()
      box.handles.forEach(handle => handle.destroy())
    })
    this.collisionBoxes = []
    this.selectedBox = null
  }

  private exportCollisionBoxes() {
    const exportData = this.collisionBoxes.map(box => ({
      id: box.id,
      x: Math.round(box.x),
      y: Math.round(box.y),
      width: Math.round(box.width),
      height: Math.round(box.height)
    }))
    
    const jsonString = JSON.stringify(exportData, null, 2)
    
    // Copy to clipboard
    navigator.clipboard.writeText(jsonString).then(() => {
      console.log('Collision boxes exported to clipboard:')
      console.log(jsonString)
      
      // Show temporary success message in center of viewport
      const gameWidth = this.sys.game.config.width as number
      const gameHeight = this.sys.game.config.height as number
      
      const successText = this.add.text(gameWidth / 2, gameHeight / 2, 
        'EXPORTED TO CLIPBOARD!', {
        fontSize: '20px',
        color: '#00ff00',
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: { x: 12, y: 6 }
      })
      successText.setOrigin(0.5)
      successText.setScrollFactor(0)
      successText.setDepth(2000)
      
      this.time.delayedCall(2000, () => {
        successText.destroy()
      })
    }).catch(() => {
      console.log('Collision boxes data:')
      console.log(jsonString)
    })
  }

  private createWeaponRacks() {
    // Create weapon racks using the same logic as SceneryManager for visual reference
    
    // Find collision boxes for weapon rack placement
    const box2 = GAME_CONFIG.COLLISION_BOXES.find(box => box.id === 'box_2')
    const box4 = GAME_CONFIG.COLLISION_BOXES.find(box => box.id === 'box_4')
    const box6 = GAME_CONFIG.COLLISION_BOXES.find(box => box.id === 'box_6')
    const box1 = GAME_CONFIG.COLLISION_BOXES.find(box => box.id === 'box_1')
    const box7 = GAME_CONFIG.COLLISION_BOXES.find(box => box.id === 'box_7')
    const box3 = GAME_CONFIG.COLLISION_BOXES.find(box => box.id === 'box_3')
    
    // Create weaponracks at boxes 2 and 4
    if (box2) {
      const weaponrack1 = this.add.image(
        box2.x + box2.width / 2,
        box2.y + box2.height + 70,
        'weaponrack'
      )
      weaponrack1.setScale(0.15)
      weaponrack1.setOrigin(0.5, 1)
      weaponrack1.setDepth(25)
      weaponrack1.setScrollFactor(1, 1)
    }
    
    if (box4) {
      const weaponrack2 = this.add.image(
        box4.x + box4.width / 2,
        box4.y + box4.height + 70,
        'weaponrack'
      )
      weaponrack2.setScale(0.15)
      weaponrack2.setOrigin(0.5, 1)
      weaponrack2.setDepth(25)
      weaponrack2.setScrollFactor(1, 1)
    }
    
    // Create weaponrack2s at box 6
    if (box6) {
      const weaponrack2_bottom = this.add.image(
        box6.x - 130,
        box6.y + box6.height - (box6.height * 0.25),
        'weaponrack2'
      )
      weaponrack2_bottom.setScale(0.15)
      weaponrack2_bottom.setOrigin(0, 0.5)
      weaponrack2_bottom.setDepth(25)
      weaponrack2_bottom.setScrollFactor(1, 1)
      
      const weaponrack2_top = this.add.image(
        box6.x - 130,
        box6.y + (box6.height * 0.25),
        'weaponrack2'
      )
      weaponrack2_top.setScale(0.15)
      weaponrack2_top.setOrigin(0, 0.5)
      weaponrack2_top.setDepth(25)
      weaponrack2_top.setScrollFactor(1, 1)
    }
    
    // Create weaponrack2s at box 1 (flipped)
    if (box1) {
      const weaponrack2_bottom_box1 = this.add.image(
        box1.x + box1.width + 130,
        box1.y + box1.height - (box1.height * 0.25),
        'weaponrack2'
      )
      weaponrack2_bottom_box1.setScale(-0.15, 0.15)
      weaponrack2_bottom_box1.setOrigin(0, 0.5)
      weaponrack2_bottom_box1.setDepth(25)
      weaponrack2_bottom_box1.setScrollFactor(1, 1)
      
      const weaponrack2_top_box1 = this.add.image(
        box1.x + box1.width + 130,
        box1.y + (box1.height * 0.25),
        'weaponrack2'
      )
      weaponrack2_top_box1.setScale(-0.15, 0.15)
      weaponrack2_top_box1.setOrigin(0, 0.5)
      weaponrack2_top_box1.setDepth(25)
      weaponrack2_top_box1.setScrollFactor(1, 1)
    }
    
    // Create weaponrack3s at box 7
    if (box7) {
      const weaponrack3_left = this.add.image(
        box7.x + (box7.width * 0.25),
        box7.y + 10,
        'weaponrack3'
      )
      weaponrack3_left.setScale(0.15)
      weaponrack3_left.setOrigin(0.5, 1)
      weaponrack3_left.setDepth(1100)
      weaponrack3_left.setScrollFactor(1, 1)
      
      const weaponrack3_right = this.add.image(
        box7.x + box7.width - (box7.width * 0.25),
        box7.y + 10,
        'weaponrack3'
      )
      weaponrack3_right.setScale(0.15)
      weaponrack3_right.setOrigin(0.5, 1)
      weaponrack3_right.setDepth(1100)
      weaponrack3_right.setScrollFactor(1, 1)
    }
    
    // Create shields at box 3
    if (box3) {
      const shieldLeft = this.add.image(
        box3.x - 80,
        box3.y + box3.height / 2 - 15, // Moved up 15px
        'shield'
      )
      shieldLeft.setScale(0.08)
      shieldLeft.setOrigin(0.5, 0.5)
      shieldLeft.setDepth(25)
      shieldLeft.setScrollFactor(1, 1)
      
      const shieldRight = this.add.image(
        box3.x + box3.width + 80,
        box3.y + box3.height / 2 - 15, // Moved up 15px
        'shield'
      )
      shieldRight.setScale(0.08)
      shieldRight.setOrigin(0.5, 0.5)
      shieldRight.setDepth(25)
      shieldRight.setScrollFactor(1, 1)
    }
    
    console.log('Weapon racks and shields created in collision editor for visual reference')
  }
}
