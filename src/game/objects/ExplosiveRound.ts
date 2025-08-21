
// src/game/objects/ExplosiveRound.ts

import { Scene } from 'phaser'

export class ExplosiveRound extends Phaser.GameObjects.Container {
  declare public body: Phaser.Physics.Arcade.Body
  private shape: Phaser.GameObjects.Graphics
  public damage: number = 35
  public isPlayerBullet: boolean = true
  public explosionRadius: number = 60
  private level: number = 1
  private pulseTimer: number = 0

  constructor(scene: Scene, x: number, y: number, angle: number, level: number = 1) {
    super(scene, x, y)
    this.level = level
    this.damage = 30 + (level * 15) // Progressive damage
    this.explosionRadius = 50 + (level * 25) // Progressive explosion radius
    
    // Create explosive round visual - larger and more menacing
    this.shape = scene.add.graphics()
    this.shape.fillStyle(0xff6600) // Orange color for explosive rounds
    this.shape.fillCircle(0, 0, 10) // Larger than basic bullets
    this.shape.fillStyle(0xffaa00, 0.6)
    this.shape.fillCircle(0, 0, 6) // Inner glow
    this.shape.fillStyle(0xff0000, 0.8)
    this.shape.fillCircle(-2, -2, 3) // Red highlight
    this.add(this.shape)
    
    // Add to scene and enable physics
    scene.add.existing(this)
    scene.physics.add.existing(this)
    this.body.setSize(20, 20)
    this.body.setOffset(-10, -10)
    
    // Set velocity - slower than basic bullets but more powerful
    const speed = 350 + (level * 25)
    const velocityX = Math.cos(angle) * speed
    const velocityY = Math.sin(angle) * speed
    this.body.setVelocity(velocityX, velocityY)
    
    // Auto-destroy after 3 seconds
    scene.time.delayedCall(3000, () => {
      if (this.active) this.explode()
    })
    
    // Make sure UI camera ignores this round
    const uiCamera = (scene as any).cameras?.cameras[1]
    if (uiCamera) {
      uiCamera.ignore(this)
    }
  }

  public update() {
    if (!this.active) return
    
    // Pulsing effect to show it's explosive
    this.pulseTimer += 0.1
    const scale = 1 + Math.sin(this.pulseTimer) * 0.2
    this.setScale(scale)
  }

  public hitTarget(_target: any) {
    this.explode()
  }

  private explode() {
    const scene = this.scene as any
    if (!scene) return
    
    // Create explosion visual
    const explosion = scene.add.graphics()
    explosion.fillStyle(0xff6600, 0.8)
    explosion.fillCircle(this.x, this.y, this.explosionRadius)
    explosion.fillStyle(0xffaa00, 0.6)
    explosion.fillCircle(this.x, this.y, this.explosionRadius * 0.7)
    explosion.fillStyle(0xffffff, 0.4)
    explosion.fillCircle(this.x, this.y, this.explosionRadius * 0.4)
    
    // Add explosion particles
    const particleCount = 8 + (this.level * 4)
    explosion.lineStyle(4, 0xff3300, 0.8)
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2
      const startRadius = this.explosionRadius * 0.3
      const endRadius = this.explosionRadius * 1.2
      explosion.beginPath()
      explosion.moveTo(
        this.x + Math.cos(angle) * startRadius,
        this.y + Math.sin(angle) * startRadius
      )
      explosion.lineTo(
        this.x + Math.cos(angle) * endRadius,
        this.y + Math.sin(angle) * endRadius
      )
      explosion.strokePath()
    }
    
    explosion.setDepth(100)
    const uiCamera = scene.cameras?.cameras[1]
    if (uiCamera) {
      uiCamera.ignore(explosion)
    }
    
    // Damage all enemies in radius
    scene.enemies.children.entries.forEach((enemy: any) => {
      const distance = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y)
      if (distance < this.explosionRadius) {
        enemy.takeDamage(this.damage)
      }
    })
    
    // Clean up explosion effect
    scene.time.delayedCall(300, () => {
      if (explosion && explosion.active) {
        explosion.destroy()
      }
    })
    
    this.destroy()
  }
}
