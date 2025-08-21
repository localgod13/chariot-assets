
// src/game/utils/TrapManager.ts

import { Scene } from 'phaser'
import { Trap } from '../objects/Trap'
import { GAME_CONFIG } from '../config/constants'

export class TrapManager {
  private scene: Scene
  private traps: Trap[] = []

  constructor(scene: Scene) {
    this.scene = scene
  }

  public createTraps(): void {
    // Calculate trap positions in the four specified areas
    const worldWidth = GAME_CONFIG.WORLD.WIDTH
    const worldHeight = GAME_CONFIG.WORLD.HEIGHT
    
    // Define the four trap zones
    const trapZones = [
      { // Mid upper left
        centerX: worldWidth * 0.25,
        centerY: worldHeight * 0.35,
        name: 'upper_left'
      },
      { // Mid upper right
        centerX: worldWidth * 0.75,
        centerY: worldHeight * 0.35,
        name: 'upper_right'
      },
      { // Mid lower right
        centerX: worldWidth * 0.75,
        centerY: worldHeight * 0.65,
        name: 'lower_right'
      },
      { // Mid lower left
        centerX: worldWidth * 0.25,
        centerY: worldHeight * 0.65,
        name: 'lower_left'
      }
    ]

    // Create 2x2 trap formations in each zone
    trapZones.forEach(zone => {
      this.createTrapFormation(zone.centerX, zone.centerY, zone.name)
    })

    console.log(`Created ${this.traps.length} spike traps in 2x2 formations across 4 zones`)
  }

  private createTrapFormation(centerX: number, centerY: number, zoneName: string): void {
    // Create a 2x2 formation of traps with extremely close spacing
    // Each trap is now scaled to 1.25x (560x40 pixels), pack them very tightly
    const trapSpacing = 40 // Reduced from 60 to 40 - extremely tight formations
    
    // Calculate positions for 2x2 grid
    const positions = [
      { x: centerX - trapSpacing/2, y: centerY - trapSpacing/2 }, // Top-left
      { x: centerX + trapSpacing/2, y: centerY - trapSpacing/2 }, // Top-right
      { x: centerX - trapSpacing/2, y: centerY + trapSpacing/2 }, // Bottom-left
      { x: centerX + trapSpacing/2, y: centerY + trapSpacing/2 }  // Bottom-right
    ]
    
    positions.forEach((pos, index) => {
      let trapX = pos.x
      let trapY = pos.y
      
      // Ensure trap stays within world bounds with margin
      const margin = 100
      trapX = Phaser.Math.Clamp(trapX, margin, GAME_CONFIG.WORLD.WIDTH - margin)
      trapY = Phaser.Math.Clamp(trapY, margin, GAME_CONFIG.WORLD.HEIGHT - margin)
      
      // Check if position conflicts with collision boxes
      if (!this.isPositionInCollisionBox(trapX, trapY)) {
        const trap = new Trap(this.scene, trapX, trapY)
        
        // Make sure UI camera ignores traps
        const uiCamera = (this.scene as any).cameras?.cameras[1]
        if (uiCamera) {
          uiCamera.ignore(trap)
        }
        
        this.traps.push(trap)
        console.log(`Placed trap ${index + 1}/4 in ${zoneName} 2x2 formation at (${Math.round(trapX)}, ${Math.round(trapY)})`)
      } else {
        console.log(`Skipped trap ${index + 1} in ${zoneName} formation due to collision box conflict`)
      }
    })
  }

  private isPositionInCollisionBox(x: number, y: number): boolean {
    return GAME_CONFIG.COLLISION_BOXES.some(box => {
      // Add some padding around collision boxes
      const padding = 50
      return x >= (box.x - padding) && 
             x <= (box.x + box.width + padding) && 
             y >= (box.y - padding) && 
             y <= (box.y + box.height + padding)
    })
  }

  public checkTrapCollisions(player: any, enemies: Phaser.GameObjects.Group): void {
    this.traps.forEach(trap => {
      if (!trap.active) return
      
      // Reduced activation radius from 80 to 50 pixels to match smaller trap size
      const playerDistance = Phaser.Math.Distance.Between(player.x, player.y, trap.x, trap.y)
      if (playerDistance < 50 && !trap.isOnCooldown()) { // Smaller activation radius for smaller traps
        if (trap.activate()) {
          // Damage player after a brief delay (when spikes are fully extended)
          this.scene.time.delayedCall(300, () => {
            const currentDistance = Phaser.Math.Distance.Between(player.x, player.y, trap.x, trap.y)
            if (currentDistance < 50) { // Still close enough to take damage
              player.takeDamage(trap.getDamage())
              console.log(`Player hit by spike trap for ${trap.getDamage()} damage`)
            }
          })
        }
      }
      
      // Check enemy collisions with trap - reduced activation radius
      enemies.children.entries.forEach((enemy: any) => {
        if (!enemy.active) return
        
        const enemyDistance = Phaser.Math.Distance.Between(enemy.x, enemy.y, trap.x, trap.y)
        if (enemyDistance < 50 && !trap.isOnCooldown()) { // Smaller activation radius
          if (trap.activate()) {
            // Damage enemy after a brief delay
            this.scene.time.delayedCall(300, () => {
              if (enemy.active) { // Make sure enemy still exists
                const currentDistance = Phaser.Math.Distance.Between(enemy.x, enemy.y, trap.x, trap.y)
                if (currentDistance < 50) {
                  enemy.takeDamage(trap.getDamage())
                  console.log(`Enemy hit by spike trap for ${trap.getDamage()} damage`)
                }
              }
            })
          }
        }
      })
    })
  }

  public getTraps(): Trap[] {
    return this.traps
  }

  public destroy(): void {
    this.traps.forEach(trap => {
      if (trap && trap.active) {
        trap.destroy()
      }
    })
    this.traps = []
  }
}
