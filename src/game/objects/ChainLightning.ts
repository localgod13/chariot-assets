
// src/game/objects/ChainLightning.ts

import { Scene } from 'phaser'

export class ChainLightning extends Phaser.GameObjects.Container {
  declare public body: Phaser.Physics.Arcade.Body
  private shape: Phaser.GameObjects.Graphics
  public damage: number = 25
  public isPlayerBullet: boolean = true
  private level: number = 1
  private chainCount: number = 2
  private hitEnemies: Set<any> = new Set()
  private lightningEffects: Phaser.GameObjects.Graphics[] = []

  constructor(scene: Scene, x: number, y: number, angle: number, level: number = 1) {
    super(scene, x, y)
    this.level = level
    this.damage = 20 + (level * 10)
    this.chainCount = 1 + level // Level 1: chains to 2, Level 2: chains to 3, etc.
    
    // Create lightning bolt visual - electric blue
    this.shape = scene.add.graphics()
    this.shape.fillStyle(0x8800ff) // Purple-blue for chain lightning
    this.shape.fillCircle(0, 0, 8)
    this.shape.fillStyle(0xaaaaff, 0.8)
    this.shape.fillCircle(0, 0, 5)
    this.shape.fillStyle(0xffffff, 0.6)
    this.shape.fillCircle(-1, -1, 2)
    this.add(this.shape)
    
    // Add to scene and enable physics
    scene.add.existing(this)
    scene.physics.add.existing(this)
    this.body.setSize(16, 16)
    this.body.setOffset(-8, -8)
    
    // Set velocity
    const speed = 500 + (level * 50)
    const velocityX = Math.cos(angle) * speed
    const velocityY = Math.sin(angle) * speed
    this.body.setVelocity(velocityX, velocityY)
    
    // Auto-destroy after 2.5 seconds
    scene.time.delayedCall(2500, () => {
      if (this.active) this.destroy()
    })
    
    // Make sure UI camera ignores this
    const uiCamera = (scene as any).cameras?.cameras[1]
    if (uiCamera) {
      uiCamera.ignore(this)
    }
  }

  public update() {
    if (!this.active) return
    
    // Electric crackling effect
    if (Math.random() < 0.3) {
      const crackle = (this.scene as any).add.graphics()
      crackle.lineStyle(2, 0xaaaaff, 0.8)
      const offsetX = (Math.random() - 0.5) * 20
      const offsetY = (Math.random() - 0.5) * 20
      crackle.beginPath()
      crackle.moveTo(this.x, this.y)
      crackle.lineTo(this.x + offsetX, this.y + offsetY)
      crackle.strokePath()
      crackle.setDepth(50)
      
      const uiCamera = (this.scene as any).cameras?.cameras[1]
      if (uiCamera) {
        uiCamera.ignore(crackle)
      }
      
      this.scene.time.delayedCall(100, () => {
        if (crackle && crackle.active) {
          crackle.destroy()
        }
      })
    }
  }

  public hitTarget(target: any) {
    if (this.hitEnemies.has(target)) return
    
    this.hitEnemies.add(target)
    this.createChainLightning(target)
    this.destroy()
  }

  private createChainLightning(fromTarget: any) {
    const scene = this.scene as any
    const enemies = scene.enemies.children.entries
    
    let chainsCreated = 0
    enemies.forEach((enemy: any) => {
      if (enemy !== fromTarget && !this.hitEnemies.has(enemy) && chainsCreated < this.chainCount) {
        const distance = Phaser.Math.Distance.Between(fromTarget.x, fromTarget.y, enemy.x, enemy.y)
        const chainRange = 120 + (this.level * 30)
        
        if (distance < chainRange) {
          enemy.takeDamage(this.damage * (0.8 - chainsCreated * 0.1)) // Diminishing damage
          this.hitEnemies.add(enemy)
          chainsCreated++
          
          // Create lightning visual effect
          const lightning = scene.add.graphics()
          const thickness = 3 + (this.level * 0.5)
          lightning.lineStyle(thickness, 0x8800ff, 0.9)
          
          // Create jagged lightning bolt
          const segments = 5 + Math.floor(distance / 30)
          const points = []
          for (let i = 0; i <= segments; i++) {
            const progress = i / segments
            const baseX = fromTarget.x + (enemy.x - fromTarget.x) * progress
            const baseY = fromTarget.y + (enemy.y - fromTarget.y) * progress
            const jitter = (Math.random() - 0.5) * 25
            const perpAngle = Math.atan2(enemy.y - fromTarget.y, enemy.x - fromTarget.x) + Math.PI / 2
            points.push({
              x: baseX + Math.cos(perpAngle) * jitter,
              y: baseY + Math.sin(perpAngle) * jitter
            })
          }
          
          lightning.beginPath()
          lightning.moveTo(points[0].x, points[0].y)
          for (let i = 1; i < points.length; i++) {
            lightning.lineTo(points[i].x, points[i].y)
          }
          lightning.strokePath()
          
          // Add secondary crackling effects
          for (let i = 0; i < 3; i++) {
            lightning.lineStyle(1, 0xaaaaff, 0.6)
            const midPoint = points[Math.floor(points.length / 2)]
            const crackleX = midPoint.x + (Math.random() - 0.5) * 30
            const crackleY = midPoint.y + (Math.random() - 0.5) * 30
            lightning.beginPath()
            lightning.moveTo(midPoint.x, midPoint.y)
            lightning.lineTo(crackleX, crackleY)
            lightning.strokePath()
          }
          
          lightning.setDepth(100)
          const uiCamera = scene.cameras?.cameras[1]
          if (uiCamera) {
            uiCamera.ignore(lightning)
          }
          
          this.lightningEffects.push(lightning)
          
          // Chain to more enemies from this one
          this.createChainLightning(enemy)
        }
      }
    })
    
    // Clean up lightning effects
    scene.time.delayedCall(150, () => {
      this.lightningEffects.forEach(effect => {
        if (effect && effect.active) {
          effect.destroy()
        }
      })
      this.lightningEffects = []
    })
  }

  destroy() {
    this.lightningEffects.forEach(effect => {
      if (effect && effect.active) {
        effect.destroy()
      }
    })
    super.destroy()
  }
}
