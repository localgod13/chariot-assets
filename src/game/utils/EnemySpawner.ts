
// src/game/utils/EnemySpawner.ts

import { Scene } from 'phaser'
import { Enemy, EnemyType } from '../objects/Enemy'
import { GAME_CONFIG } from '../config/constants'

export class EnemySpawner {
  private scene: Scene
  private player: any
  private enemies: Phaser.GameObjects.Group
  private currentRound: number = 1

  constructor(scene: Scene, player: any, enemies: Phaser.GameObjects.Group) {
    this.scene = scene
    this.player = player
    this.enemies = enemies
  }

  public setCurrentRound(round: number) {
    this.currentRound = round
  }

  public spawnEnemy(enemyType: EnemyType, enemyData?: any): any {
    const entranceBox = GAME_CONFIG.COLLISION_BOXES.find(box => box.id === 'box_3')
    if (!entranceBox) {
      console.warn('Arena entrance (box_3) not found, falling back to random spawn')
      return this.spawnEnemyRandomly(enemyType)
    }
    
    let spawnX = entranceBox.x + entranceBox.width / 2
    let spawnY = entranceBox.y + entranceBox.height
    
    // Adjust spawn position for formations
    if (enemyData && enemyData.formationId >= 0) {
      const formationSize = enemyData.formationSize
      const positionInFormation = enemyData.positionInFormation
      
      const row = Math.floor(positionInFormation / formationSize)
      const col = positionInFormation % formationSize
      
      const spacing = 60
      const formationWidth = (formationSize - 1) * spacing
      
      spawnX = (entranceBox.x + entranceBox.width / 2) - (formationWidth / 2) + (col * spacing)
      spawnY = (entranceBox.y + entranceBox.height) + (row * spacing)
    }
    
    // Validate spawn position isn't too close to player
    const distanceToPlayer = Phaser.Math.Distance.Between(spawnX, spawnY, this.player.x, this.player.y)
    if (distanceToPlayer < 200) {
      const angleAwayFromPlayer = Phaser.Math.Angle.Between(this.player.x, this.player.y, spawnX, spawnY)
      spawnX = this.player.x + Math.cos(angleAwayFromPlayer) * 250
      spawnY = this.player.y + Math.sin(angleAwayFromPlayer) * 250
    }
    
    try {
      const enemy = new Enemy(this.scene, spawnX, spawnY, enemyType, this.player, this.currentRound)
      
      if (!enemy || !enemy.active) {
        console.error('Failed to create enemy - enemy is null or inactive')
        return null
      }
      
      enemy.setScrollFactor(1, 1)
      
      const uiCamera = (this.scene as any).cameras.cameras[1]
      if (uiCamera) {
        uiCamera.ignore(enemy)
      }
      
      this.enemies.add(enemy)
      
      if (enemy.body) {
        enemy.body.setCollideWorldBounds(true)
        enemy.body.onWorldBounds = true
      }
      
      return enemy
      
    } catch (error) {
      console.error('Error creating enemy:', error)
      return null
    }
  }

  public calculateCombatPosition(enemyIndex: number): {x: number, y: number} {
    const baseRadius = 450
    const enemiesPerCircle = 8
    const circleIndex = Math.floor(enemyIndex / enemiesPerCircle)
    const positionInCircle = enemyIndex % enemiesPerCircle
    
    const radius = baseRadius + (circleIndex * 120)
    const baseAngle = (positionInCircle / enemiesPerCircle) * Math.PI * 2
    
    const angleVariation = (Math.random() - 0.5) * 0.2
    const radiusVariation = (Math.random() - 0.5) * 40
    
    const finalAngle = baseAngle + angleVariation
    const finalRadius = radius + radiusVariation
    
    let x = this.player.x + Math.cos(finalAngle) * finalRadius
    let y = this.player.y + Math.sin(finalAngle) * finalRadius
    
    const margin = 150
    x = Phaser.Math.Clamp(x, margin, GAME_CONFIG.WORLD.WIDTH - margin)
    y = Phaser.Math.Clamp(y, margin, GAME_CONFIG.WORLD.HEIGHT - margin)
    
    const distanceFromPlayer = Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y)
    if (distanceFromPlayer < baseRadius) {
      const angleToPlayer = Phaser.Math.Angle.Between(this.player.x, this.player.y, x, y)
      
      let newX = this.player.x + Math.cos(angleToPlayer) * baseRadius
      let newY = this.player.y + Math.sin(angleToPlayer) * baseRadius
      
      if (newX < margin || newX > GAME_CONFIG.WORLD.WIDTH - margin ||
          newY < margin || newY > GAME_CONFIG.WORLD.HEIGHT - margin) {
        for (let attempt = 0; attempt < 8; attempt++) {
          const alternativeAngle = finalAngle + (attempt * Math.PI / 4)
          newX = this.player.x + Math.cos(alternativeAngle) * baseRadius
          newY = this.player.y + Math.sin(alternativeAngle) * baseRadius
          
          if (newX >= margin && newX <= GAME_CONFIG.WORLD.WIDTH - margin &&
              newY >= margin && newY <= GAME_CONFIG.WORLD.HEIGHT - margin &&
              !this.isPositionInCollisionBox(newX, newY)) {
            x = newX
            y = newY
            break
          }
        }
      } else {
        x = newX
        y = newY
      }
    }
    
    let attempts = 0
    const maxAttempts = 12
    
    while (this.isPositionInCollisionBox(x, y) && attempts < maxAttempts) {
      const adjustedAngle = finalAngle + (attempts * 0.5)
      let testX = this.player.x + Math.cos(adjustedAngle) * finalRadius
      let testY = this.player.y + Math.sin(adjustedAngle) * finalRadius
      
      testX = Phaser.Math.Clamp(testX, margin, GAME_CONFIG.WORLD.WIDTH - margin)
      testY = Phaser.Math.Clamp(testY, margin, GAME_CONFIG.WORLD.HEIGHT - margin)
      
      if (!this.isPositionInCollisionBox(testX, testY)) {
        x = testX
        y = testY
        break
      }
      
      attempts++
    }
    
    if (this.isPositionInCollisionBox(x, y)) {
      for (let spiralRadius = baseRadius; spiralRadius < baseRadius + 300; spiralRadius += 50) {
        for (let spiralAngle = 0; spiralAngle < Math.PI * 2; spiralAngle += Math.PI / 8) {
          let spiralX = this.player.x + Math.cos(spiralAngle) * spiralRadius
          let spiralY = this.player.y + Math.sin(spiralAngle) * spiralRadius
          
          spiralX = Phaser.Math.Clamp(spiralX, margin, GAME_CONFIG.WORLD.WIDTH - margin)
          spiralY = Phaser.Math.Clamp(spiralY, margin, GAME_CONFIG.WORLD.HEIGHT - margin)
          
          if (!this.isPositionInCollisionBox(spiralX, spiralY)) {
            x = spiralX
            y = spiralY
            break
          }
        }
        if (!this.isPositionInCollisionBox(x, y)) break
      }
    }
    
    return { x, y }
  }

  private spawnEnemyRandomly(enemyType: EnemyType): any {
    let attempts = 0
    const maxAttempts = 50
    
    while (attempts < maxAttempts) {
      const spawnDistance = 600 + Math.random() * 200
      const angle = Math.random() * Math.PI * 2
      
      let x = this.player.x + Math.cos(angle) * spawnDistance
      let y = this.player.y + Math.sin(angle) * spawnDistance
      
      x = Phaser.Math.Clamp(x, 50, GAME_CONFIG.WORLD.WIDTH - 50)
      y = Phaser.Math.Clamp(y, 50, GAME_CONFIG.WORLD.HEIGHT - 50)
      
      if (!this.isPositionInCollisionBox(x, y)) {
        const enemy = new Enemy(this.scene, x, y, enemyType, this.player, this.currentRound)
        enemy.setScrollFactor(1, 1)
        
        const uiCamera = (this.scene as any).cameras.cameras[1]
        if (uiCamera) {
          uiCamera.ignore(enemy)
        }
        
        this.enemies.add(enemy)
        return enemy
      }
      
      attempts++
    }
    
    console.warn(`Could not find safe spawn position for ${enemyType} enemy`)
    return null
  }

  private isPositionInCollisionBox(x: number, y: number): boolean {
    return GAME_CONFIG.COLLISION_BOXES.some(box => {
      return x >= box.x && 
             x <= box.x + box.width && 
             y >= box.y && 
             y <= box.y + box.height
    })
  }
}
