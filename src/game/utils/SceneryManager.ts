
// src/game/utils/SceneryManager.ts

import { Scene } from 'phaser'
import { GAME_CONFIG } from '../config/constants'

export class SceneryManager {
  private scene: Scene
  public sceneryObjects: Phaser.GameObjects.Image[] = [] // Make public so Game.ts can access it

  constructor(scene: Scene) {
    this.scene = scene
  }

  public createScenery(): void {
    this.createWeaponracks()
    this.createWeaponracks2()
    this.createWeaponracks2OnBox1()
    this.createWeaponracks3OnBox7()
    this.createShieldsOnBox3()
    this.createShield2OnBox1()
    this.createShield2OnBox6()
    this.createCenterPiece()
  }

  private createWeaponracks(): void {
    // Find collision boxes 2 and 4 from the constants
    const box2 = GAME_CONFIG.COLLISION_BOXES.find(box => box.id === 'box_2')
    const box4 = GAME_CONFIG.COLLISION_BOXES.find(box => box.id === 'box_4')
    
    if (box2) {
      // Position weaponrack at bottom center of collision box 2, moved down significantly
      const weaponrack1 = this.scene.add.image(
        box2.x + box2.width / 2,  // Center horizontally
        box2.y + box2.height + 70, // Bottom of the box + 70 pixels down
        'weaponrack'
      )
      
      // Scale the weaponrack appropriately (assuming it's a large image)
      weaponrack1.setScale(0.15) // Adjust scale as needed
      weaponrack1.setOrigin(0.5, 1) // Anchor at bottom center
      weaponrack1.setDepth(25) // Above background but below enemies
      weaponrack1.setScrollFactor(1, 1) // Follow world camera
      
      // CRITICAL: Ensure this weapon rack is ONLY rendered by main camera
      const gameScene = this.scene as any
      if (gameScene.cameras && gameScene.cameras.cameras && gameScene.cameras.cameras.length > 1) {
        const uiCamera = gameScene.cameras.cameras[1]
        if (uiCamera && uiCamera.ignore) {
          // Force the UI camera to ignore this weapon rack
          uiCamera.ignore(weaponrack1)
          console.log('UI camera ignoring weaponrack1')
        }
      }
      
      this.sceneryObjects.push(weaponrack1)
      console.log(`Weaponrack 1 placed at box_2: (${weaponrack1.x}, ${weaponrack1.y}) with scale ${weaponrack1.scaleX}`)
    }
    
    if (box4) {
      // Position weaponrack at bottom center of collision box 4, moved down significantly
      const weaponrack2 = this.scene.add.image(
        box4.x + box4.width / 2,  // Center horizontally
        box4.y + box4.height + 70, // Bottom of the box + 70 pixels down
        'weaponrack'
      )
      
      // Scale the weaponrack appropriately
      weaponrack2.setScale(0.15) // Adjust scale as needed
      weaponrack2.setOrigin(0.5, 1) // Anchor at bottom center
      weaponrack2.setDepth(25) // Above background but below enemies
      weaponrack2.setScrollFactor(1, 1) // Follow world camera
      
      // CRITICAL: Ensure this weapon rack is ONLY rendered by main camera
      const gameScene = this.scene as any
      if (gameScene.cameras && gameScene.cameras.cameras && gameScene.cameras.cameras.length > 1) {
        const uiCamera = gameScene.cameras.cameras[1]
        if (uiCamera && uiCamera.ignore) {
          // Force the UI camera to ignore this weapon rack
          uiCamera.ignore(weaponrack2)
          console.log('UI camera ignoring weaponrack2')
        }
      }
      
      this.sceneryObjects.push(weaponrack2)
      console.log(`Weaponrack 2 placed at box_4: (${weaponrack2.x}, ${weaponrack2.y}) with scale ${weaponrack2.scaleX}`)
    }
  }

  private createWeaponracks2(): void {
    // Find collision box 6 from the constants
    const box6 = GAME_CONFIG.COLLISION_BOXES.find(box => box.id === 'box_6')
    
    if (box6) {
      // Position first weaponrack2 at 1/4 from the bottom on the left edge, moved much further left
      const weaponrack2_bottom = this.scene.add.image(
        box6.x - 130, // Moved right another 10px from -140 to -130 pixels
        box6.y + box6.height - (box6.height * 0.25), // 1/4 from the bottom
        'weaponrack2'
      )
      
      // Scale the weaponrack2 appropriately
      weaponrack2_bottom.setScale(0.15) // Same scale as other weapon racks
      weaponrack2_bottom.setOrigin(0, 0.5) // Anchor at left center
      weaponrack2_bottom.setDepth(25) // Above background but below enemies
      weaponrack2_bottom.setScrollFactor(1, 1) // Follow world camera
      
      // CRITICAL: Ensure this weapon rack is ONLY rendered by main camera
      const gameScene = this.scene as any
      if (gameScene.cameras && gameScene.cameras.cameras && gameScene.cameras.cameras.length > 1) {
        const uiCamera = gameScene.cameras.cameras[1]
        if (uiCamera && uiCamera.ignore) {
          // Force the UI camera to ignore this weapon rack
          uiCamera.ignore(weaponrack2_bottom)
          console.log('UI camera ignoring weaponrack2_bottom')
        }
      }
      
      this.sceneryObjects.push(weaponrack2_bottom)
      console.log(`Weaponrack2 bottom placed at box_6: (${weaponrack2_bottom.x}, ${weaponrack2_bottom.y}) with scale ${weaponrack2_bottom.scaleX}`)
      
      // Position second weaponrack2 at 1/4 from the top on the left edge, moved much further left
      const weaponrack2_top = this.scene.add.image(
        box6.x - 130, // Moved right another 10px from -140 to -130 pixels
        box6.y + (box6.height * 0.25), // 1/4 from the top
        'weaponrack2'
      )
      
      // Scale the weaponrack2 appropriately
      weaponrack2_top.setScale(0.15) // Same scale as other weapon racks
      weaponrack2_top.setOrigin(0, 0.5) // Anchor at left center
      weaponrack2_top.setDepth(25) // Above background but below enemies
      weaponrack2_top.setScrollFactor(1, 1) // Follow world camera
      
      // CRITICAL: Ensure this weapon rack is ONLY rendered by main camera
      if (gameScene.cameras && gameScene.cameras.cameras && gameScene.cameras.cameras.length > 1) {
        const uiCamera = gameScene.cameras.cameras[1]
        if (uiCamera && uiCamera.ignore) {
          // Force the UI camera to ignore this weapon rack
          uiCamera.ignore(weaponrack2_top)
          console.log('UI camera ignoring weaponrack2_top')
        }
      }
      
      this.sceneryObjects.push(weaponrack2_top)
      console.log(`Weaponrack2 top placed at box_6: (${weaponrack2_top.x}, ${weaponrack2_top.y}) with scale ${weaponrack2_top.scaleX}`)
    }
  }

  private createWeaponracks2OnBox1(): void {
    // Find collision box 1 from the constants
    const box1 = GAME_CONFIG.COLLISION_BOXES.find(box => box.id === 'box_1')
    
    if (box1) {
      // Position first weaponrack2 at 1/4 from the bottom on the right edge of box 1, moved further right
      const weaponrack2_bottom_box1 = this.scene.add.image(
        box1.x + box1.width + 130, // Right edge of box1 + 130 pixels to the right
        box1.y + box1.height - (box1.height * 0.25), // 1/4 from the bottom
        'weaponrack2'
      )
      
      // Scale and flip horizontally
      weaponrack2_bottom_box1.setScale(-0.15, 0.15) // Negative X scale to flip horizontally
      weaponrack2_bottom_box1.setOrigin(0, 0.5) // Anchor at left center (will be right center when flipped)
      weaponrack2_bottom_box1.setDepth(25) // Above background but below enemies
      weaponrack2_bottom_box1.setScrollFactor(1, 1) // Follow world camera
      
      // CRITICAL: Ensure this weapon rack is ONLY rendered by main camera
      const gameScene = this.scene as any
      if (gameScene.cameras && gameScene.cameras.cameras && gameScene.cameras.cameras.length > 1) {
        const uiCamera = gameScene.cameras.cameras[1]
        if (uiCamera && uiCamera.ignore) {
          // Force the UI camera to ignore this weapon rack
          uiCamera.ignore(weaponrack2_bottom_box1)
          console.log('UI camera ignoring weaponrack2_bottom_box1')
        }
      }
      
      this.sceneryObjects.push(weaponrack2_bottom_box1)
      console.log(`Weaponrack2 bottom placed at box_1: (${weaponrack2_bottom_box1.x}, ${weaponrack2_bottom_box1.y}) with scale ${weaponrack2_bottom_box1.scaleX}`)
      
      // Position second weaponrack2 at 1/4 from the top on the right edge of box 1, moved further right
      const weaponrack2_top_box1 = this.scene.add.image(
        box1.x + box1.width + 130, // Right edge of box1 + 130 pixels to the right
        box1.y + (box1.height * 0.25), // 1/4 from the top
        'weaponrack2'
      )
      
      // Scale and flip horizontally
      weaponrack2_top_box1.setScale(-0.15, 0.15) // Negative X scale to flip horizontally
      weaponrack2_top_box1.setOrigin(0, 0.5) // Anchor at left center (will be right center when flipped)
      weaponrack2_top_box1.setDepth(25) // Above background but below enemies
      weaponrack2_top_box1.setScrollFactor(1, 1) // Follow world camera
      
      // CRITICAL: Ensure this weapon rack is ONLY rendered by main camera
      if (gameScene.cameras && gameScene.cameras.cameras && gameScene.cameras.cameras.length > 1) {
        const uiCamera = gameScene.cameras.cameras[1]
        if (uiCamera && uiCamera.ignore) {
          // Force the UI camera to ignore this weapon rack
          uiCamera.ignore(weaponrack2_top_box1)
          console.log('UI camera ignoring weaponrack2_top_box1')
        }
      }
      
      this.sceneryObjects.push(weaponrack2_top_box1)
      console.log(`Weaponrack2 top placed at box_1: (${weaponrack2_top_box1.x}, ${weaponrack2_top_box1.y}) with scale ${weaponrack2_top_box1.scaleX}`)
    }
  }

  private createWeaponracks3OnBox7(): void {
    // Find collision box 7 from the constants
    const box7 = GAME_CONFIG.COLLISION_BOXES.find(box => box.id === 'box_7')
    
    if (box7) {
      // Position first weaponrack3 at 1/4 from the left at the top of the box
      const weaponrack3_left = this.scene.add.image(
        box7.x + (box7.width * 0.25), // 1/4 from the left
        box7.y + 10, // Top of the box + 10 pixels down (moved down 40px from -30)
        'weaponrack3'
      )
      
      // Scale the weaponrack3 appropriately
      weaponrack3_left.setScale(0.15) // Same scale as other weapon racks
      weaponrack3_left.setOrigin(0.5, 1) // Anchor at bottom center
      weaponrack3_left.setDepth(1100) // Higher than player (1000) so player goes behind it
      weaponrack3_left.setScrollFactor(1, 1) // Follow world camera
      
      // CRITICAL: Ensure this weapon rack is ONLY rendered by main camera
      const gameScene = this.scene as any
      if (gameScene.cameras && gameScene.cameras.cameras && gameScene.cameras.cameras.length > 1) {
        const uiCamera = gameScene.cameras.cameras[1]
        if (uiCamera && uiCamera.ignore) {
          // Force the UI camera to ignore this weapon rack
          uiCamera.ignore(weaponrack3_left)
          console.log('UI camera ignoring weaponrack3_left')
        }
      }
      
      this.sceneryObjects.push(weaponrack3_left)
      console.log(`Weaponrack3 left placed at box_7: (${weaponrack3_left.x}, ${weaponrack3_left.y}) with scale ${weaponrack3_left.scaleX}`)
      
      // Position second weaponrack3 at 1/4 from the right at the top of the box
      const weaponrack3_right = this.scene.add.image(
        box7.x + box7.width - (box7.width * 0.25), // 1/4 from the right (3/4 from the left)
        box7.y + 10, // Top of the box + 10 pixels down (moved down 40px from -30)
        'weaponrack3'
      )
      
      // Scale the weaponrack3 appropriately
      weaponrack3_right.setScale(0.15) // Same scale as other weapon racks
      weaponrack3_right.setOrigin(0.5, 1) // Anchor at bottom center
      weaponrack3_right.setDepth(1100) // Higher than player (1000) so player goes behind it
      weaponrack3_right.setScrollFactor(1, 1) // Follow world camera
      
      // CRITICAL: Ensure this weapon rack is ONLY rendered by main camera
      if (gameScene.cameras && gameScene.cameras.cameras && gameScene.cameras.cameras.length > 1) {
        const uiCamera = gameScene.cameras.cameras[1]
        if (uiCamera && uiCamera.ignore) {
          // Force the UI camera to ignore this weapon rack
          uiCamera.ignore(weaponrack3_right)
          console.log('UI camera ignoring weaponrack3_right')
        }
      }
      
      this.sceneryObjects.push(weaponrack3_right)
      console.log(`Weaponrack3 right placed at box_7: (${weaponrack3_right.x}, ${weaponrack3_right.y}) with scale ${weaponrack3_right.scaleX}`)
    }
  }

  private createShieldsOnBox3(): void {
    // Find collision box 3 from the constants
    const box3 = GAME_CONFIG.COLLISION_BOXES.find(box => box.id === 'box_3')
    
    if (box3) {
      // Position first shield on the left side of collision box 3
      const shieldLeft = this.scene.add.image(
        box3.x - 80, // Left side of box3 - 80 pixels to the left
        box3.y + box3.height / 2 - 15, // Vertically centered on the box, moved up 15px
        'shield'
      )
      
      // Scale the shield appropriately
      shieldLeft.setScale(0.08) // Reduced from 0.12 to 0.08 for smaller shields
      shieldLeft.setOrigin(0.5, 0.5) // Center anchor
      shieldLeft.setDepth(25) // Above background but below enemies
      shieldLeft.setScrollFactor(1, 1) // Follow world camera
      
      // CRITICAL: Ensure this shield is ONLY rendered by main camera
      const gameScene = this.scene as any
      if (gameScene.cameras && gameScene.cameras.cameras && gameScene.cameras.cameras.length > 1) {
        const uiCamera = gameScene.cameras.cameras[1]
        if (uiCamera && uiCamera.ignore) {
          // Force the UI camera to ignore this shield
          uiCamera.ignore(shieldLeft)
          console.log('UI camera ignoring shieldLeft')
        }
      }
      
      this.sceneryObjects.push(shieldLeft)
      console.log(`Shield left placed at box_3: (${shieldLeft.x}, ${shieldLeft.y}) with scale ${shieldLeft.scaleX}`)
      
      // Position second shield on the right side of collision box 3
      const shieldRight = this.scene.add.image(
        box3.x + box3.width + 80, // Right side of box3 + 80 pixels to the right
        box3.y + box3.height / 2 - 15, // Vertically centered on the box, moved up 15px
        'shield'
      )
      
      // Scale the shield appropriately
      shieldRight.setScale(0.08) // Reduced from 0.12 to 0.08 for smaller shields
      shieldRight.setOrigin(0.5, 0.5) // Center anchor
      shieldRight.setDepth(25) // Above background but below enemies
      shieldRight.setScrollFactor(1, 1) // Follow world camera
      
      // CRITICAL: Ensure this shield is ONLY rendered by main camera
      if (gameScene.cameras && gameScene.cameras.cameras && gameScene.cameras.cameras.length > 1) {
        const uiCamera = gameScene.cameras.cameras[1]
        if (uiCamera && uiCamera.ignore) {
          // Force the UI camera to ignore this shield
          uiCamera.ignore(shieldRight)
          console.log('UI camera ignoring shieldRight')
        }
      }
      
      this.sceneryObjects.push(shieldRight)
      console.log(`Shield right placed at box_3: (${shieldRight.x}, ${shieldRight.y}) with scale ${shieldRight.scaleX}`)
    }
  }

  private createShield2OnBox1(): void {
    // Find collision box 1 from the constants
    const box1 = GAME_CONFIG.COLLISION_BOXES.find(box => box.id === 'box_1')
    
    if (box1) {
      // Position shield2 at the center of collision box 1
      const shield2 = this.scene.add.image(
        box1.x + box1.width / 2,  // Center horizontally
        box1.y + box1.height / 2, // Center vertically
        'shield2'
      )
      
      // Scale the shield2 appropriately (same as other shields)
      shield2.setScale(0.08) // Same scale as other shields for consistency
      shield2.setOrigin(0.5, 0.5) // Center anchor
      shield2.setDepth(25) // Above background but below enemies
      shield2.setScrollFactor(1, 1) // Follow world camera
      
      // CRITICAL: Ensure this shield is ONLY rendered by main camera
      const gameScene = this.scene as any
      if (gameScene.cameras && gameScene.cameras.cameras && gameScene.cameras.cameras.length > 1) {
        const uiCamera = gameScene.cameras.cameras[1]
        if (uiCamera && uiCamera.ignore) {
          // Force the UI camera to ignore this shield
          uiCamera.ignore(shield2)
          console.log('UI camera ignoring shield2 on box_1')
        }
      }
      
      this.sceneryObjects.push(shield2)
      console.log(`Shield2 placed at center of box_1: (${shield2.x}, ${shield2.y}) with scale ${shield2.scaleX}`)
    }
  }

  private createShield2OnBox6(): void {
    // Find collision box 6 from the constants
    const box6 = GAME_CONFIG.COLLISION_BOXES.find(box => box.id === 'box_6')
    
    if (box6) {
      // Position shield2 at the center of collision box 6, flipped horizontally
      const shield2 = this.scene.add.image(
        box6.x + box6.width / 2,  // Center horizontally
        box6.y + box6.height / 2, // Center vertically
        'shield2'
      )
      
      // Scale and flip horizontally (negative X scale)
      shield2.setScale(-0.08, 0.08) // Same scale as other shields but flipped horizontally
      shield2.setOrigin(0.5, 0.5) // Center anchor
      shield2.setDepth(25) // Above background but below enemies
      shield2.setScrollFactor(1, 1) // Follow world camera
      
      // CRITICAL: Ensure this shield is ONLY rendered by main camera
      const gameScene = this.scene as any
      if (gameScene.cameras && gameScene.cameras.cameras && gameScene.cameras.cameras.length > 1) {
        const uiCamera = gameScene.cameras.cameras[1]
        if (uiCamera && uiCamera.ignore) {
          // Force the UI camera to ignore this shield
          uiCamera.ignore(shield2)
          console.log('UI camera ignoring shield2 on box_6')
        }
      }
      
      this.sceneryObjects.push(shield2)
      console.log(`Shield2 placed at center of box_6: (${shield2.x}, ${shield2.y}) with scale ${shield2.scaleX}`)
    }
  }

  private createCenterPiece(): void {
    // Place the center image at the exact center of the world
    const centerX = GAME_CONFIG.WORLD.WIDTH / 2
    const centerY = GAME_CONFIG.WORLD.HEIGHT / 2
    
    const centerPiece = this.scene.add.image(centerX, centerY, 'center')
    
    // Scale appropriately - increased from 0.2 to 0.4 for much larger size
    centerPiece.setScale(0.4) // Doubled the scale from 20% to 40%
    centerPiece.setOrigin(0.5, 0.5) // Center anchor
    centerPiece.setDepth(20) // Above background but below enemies and other scenery
    centerPiece.setScrollFactor(1, 1) // Follow world camera
    
    // CRITICAL: Ensure this center piece is ONLY rendered by main camera
    const gameScene = this.scene as any
    if (gameScene.cameras && gameScene.cameras.cameras && gameScene.cameras.cameras.length > 1) {
      const uiCamera = gameScene.cameras.cameras[1]
      if (uiCamera && uiCamera.ignore) {
        // Force the UI camera to ignore this center piece
        uiCamera.ignore(centerPiece)
        console.log('UI camera ignoring center piece')
      }
    }
    
    this.sceneryObjects.push(centerPiece)
    console.log(`Center piece placed at world center: (${centerPiece.x}, ${centerPiece.y}) with scale ${centerPiece.scaleX}`)
  }

  public destroy(): void {
    // Clean up all scenery objects
    this.sceneryObjects.forEach(obj => {
      if (obj && obj.active) {
        obj.destroy()
      }
    })
    this.sceneryObjects = []
  }
}
