
// src/game/utils/RoundManager.ts

import { EnemyType } from '../objects/Enemy'

export interface RoundData {
  currentRound: number
  enemiesKilledThisRound: number
  enemiesNeededThisRound: number
  enemiesSpawnedThisRound: number
  totalEnemiesKilled: number
  isRoundTransition: boolean
  roundEnemyQueue: Array<{
    type: EnemyType
    spawnDelay: number
    formationId?: number
    formationSize?: number
    positionInFormation?: number
  }>
  nextEnemySpawnTime: number
  firstStrongDeathThisRound: boolean
  enemyPositionIndex: number
}

export class RoundManager {
  private data: RoundData

  constructor() {
    this.data = {
      currentRound: 1,
      enemiesKilledThisRound: 0,
      enemiesNeededThisRound: 10,
      enemiesSpawnedThisRound: 0,
      totalEnemiesKilled: 0,
      isRoundTransition: true,
      roundEnemyQueue: [],
      nextEnemySpawnTime: 0,
      firstStrongDeathThisRound: false,
      enemyPositionIndex: 0
    }
  }

  public getRoundData(): RoundData {
    return this.data
  }

  public onEnemyKilled(): boolean {
    this.data.enemiesKilledThisRound++
    this.data.totalEnemiesKilled++
    
    // Check if round is complete (all enemies spawned AND all killed)
    return this.data.enemiesKilledThisRound >= this.data.enemiesNeededThisRound && 
           this.data.enemiesSpawnedThisRound >= this.data.enemiesNeededThisRound
  }

  public startNextRound(): void {
    this.data.currentRound++
    this.data.enemiesKilledThisRound = 0
    this.data.enemiesSpawnedThisRound = 0
    this.data.firstStrongDeathThisRound = false
    this.data.enemiesNeededThisRound = this.calculateEnemiesForRound(this.data.currentRound)
    this.data.isRoundTransition = true
    this.data.enemyPositionIndex = 0
  }

  public completeRound(): void {
    this.data.isRoundTransition = true
  }

  public startCombatPhase(): void {
    this.data.isRoundTransition = false
  }

  public isFirstStrongDeathThisRound(): boolean {
    if (this.data.firstStrongDeathThisRound) {
      return false
    }
    this.data.firstStrongDeathThisRound = true
    return true
  }

  public generateRoundEnemies(): void {
    this.data.roundEnemyQueue = []
    const totalEnemies = this.data.enemiesNeededThisRound
    
    const formationSize = this.getFormationSize(this.data.currentRound)
    const enemiesPerFormation = formationSize * formationSize
    
    const completeFormations = Math.floor(totalEnemies / enemiesPerFormation)
    const remainingEnemies = totalEnemies % enemiesPerFormation
    
    const enemyComposition = this.calculateEnemyComposition(this.data.currentRound)
    
    let spawnTime = 0
    const baseFormationInterval = 2000
    const baseIndividualInterval = 800
    
    // Create formations first
    for (let f = 0; f < completeFormations; f++) {
      const formationType = this.selectFormationTypeFromComposition(enemyComposition, enemiesPerFormation)
      
      for (let i = 0; i < enemiesPerFormation; i++) {
        const enemyType = formationType[i] || 'BASIC'
        
        let formationSpawnDelay = spawnTime + (i * 100)
        
        if (enemyType === 'STRONG') formationSpawnDelay += 500
        if (enemyType === 'ELITE') formationSpawnDelay += 1000
        if (enemyType === 'BOSS') formationSpawnDelay += 1500
        
        this.data.roundEnemyQueue.push({
          type: enemyType,
          spawnDelay: formationSpawnDelay,
          formationId: f,
          formationSize: formationSize,
          positionInFormation: i
        })
      }
      spawnTime += baseFormationInterval + Math.random() * 1000
    }
    
    // Add remaining individual enemies
    for (let i = 0; i < remainingEnemies; i++) {
      const enemyType = this.selectEnemyTypeFromComposition(enemyComposition, i, remainingEnemies)
      
      let individualSpawnDelay = spawnTime + (i * baseIndividualInterval)
      
      if (enemyType === 'STRONG') individualSpawnDelay += 1000
      if (enemyType === 'ELITE') individualSpawnDelay += 2000
      if (enemyType === 'BOSS') individualSpawnDelay += 3000
      
      this.data.roundEnemyQueue.push({
        type: enemyType,
        spawnDelay: individualSpawnDelay,
        formationId: -1,
        formationSize: 1,
        positionInFormation: 0
      })
    }
    
    this.data.roundEnemyQueue.sort((a, b) => a.spawnDelay - b.spawnDelay)
  }

  public getNextEnemyToSpawn(currentTime: number): any {
    if (this.data.roundEnemyQueue.length === 0) return null
    if (currentTime < this.data.nextEnemySpawnTime) return null
    if (this.data.enemiesSpawnedThisRound >= this.data.enemiesNeededThisRound) return null

    const enemyData = this.data.roundEnemyQueue.shift()
    if (enemyData) {
      this.data.enemiesSpawnedThisRound++
      
      if (this.data.roundEnemyQueue.length > 0) {
        this.data.nextEnemySpawnTime = currentTime + 200
      }
    }
    
    return enemyData
  }

  public getNextPositionIndex(): number {
    return this.data.enemyPositionIndex++
  }

  private calculateEnemiesForRound(round: number): number {
    // Start with 8 enemies in round 1, add 1 per round, cap at 30
    const baseEnemies = 8
    const enemiesThisRound = Math.min(30, baseEnemies + (round - 1))
    
    return enemiesThisRound
  }

  private getFormationSize(round: number): number {
    if (round <= 3) return 2
    if (round <= 7) return 3
    if (round <= 12) return 4
    return 5
  }

  private calculateEnemyComposition(round: number): {[key in EnemyType]: number} {
    const composition = {
      BASIC: 0,
      STRONG: 0,
      ELITE: 0,
      BOSS: 0
    }
    
    const totalEnemies = this.data.enemiesNeededThisRound
    
    if (round === 1) {
      composition.BASIC = totalEnemies
    } else if (round === 2) {
      composition.BASIC = Math.floor(totalEnemies * 0.75)
      composition.STRONG = totalEnemies - composition.BASIC
    } else if (round === 3) {
      composition.BASIC = Math.floor(totalEnemies * 0.6)
      composition.STRONG = Math.floor(totalEnemies * 0.4)
    } else if (round <= 6) {
      composition.BASIC = Math.floor(totalEnemies * 0.5)
      composition.STRONG = Math.floor(totalEnemies * 0.35)
      composition.ELITE = totalEnemies - composition.BASIC - composition.STRONG
    } else if (round <= 10) {
      composition.BASIC = Math.floor(totalEnemies * 0.3)
      composition.STRONG = Math.floor(totalEnemies * 0.4)
      composition.ELITE = Math.floor(totalEnemies * 0.3)
    } else if (round <= 15) {
      composition.BASIC = Math.floor(totalEnemies * 0.25)
      composition.STRONG = Math.floor(totalEnemies * 0.35)
      composition.ELITE = Math.floor(totalEnemies * 0.3)
      composition.BOSS = totalEnemies - composition.BASIC - composition.STRONG - composition.ELITE
    } else {
      composition.BASIC = Math.floor(totalEnemies * 0.2)
      composition.STRONG = Math.floor(totalEnemies * 0.3)
      composition.ELITE = Math.floor(totalEnemies * 0.35)
      composition.BOSS = totalEnemies - composition.BASIC - composition.STRONG - composition.ELITE
    }
    
    return composition
  }

  private selectFormationTypeFromComposition(
    composition: {[key in EnemyType]: number},
    formationSize: number
  ): EnemyType[] {
    const enemyPool: EnemyType[] = []
    
    for (let i = 0; i < composition.BASIC; i++) enemyPool.push('BASIC')
    for (let i = 0; i < composition.STRONG; i++) enemyPool.push('STRONG')
    for (let i = 0; i < composition.ELITE; i++) enemyPool.push('ELITE')
    for (let i = 0; i < composition.BOSS; i++) enemyPool.push('BOSS')
    
    // Shuffle the pool
    for (let i = enemyPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[enemyPool[i], enemyPool[j]] = [enemyPool[j], enemyPool[i]]
    }
    
    const formation: EnemyType[] = []
    for (let i = 0; i < formationSize; i++) {
      formation.push(enemyPool[i] || 'BASIC')
    }
    
    return formation
  }

  private selectEnemyTypeFromComposition(
    composition: {[key in EnemyType]: number}, 
    index: number, 
    _totalCount: number
  ): EnemyType {
    const enemyPool: EnemyType[] = []
    
    for (let i = 0; i < composition.BASIC; i++) enemyPool.push('BASIC')
    for (let i = 0; i < composition.STRONG; i++) enemyPool.push('STRONG')
    for (let i = 0; i < composition.ELITE; i++) enemyPool.push('ELITE')
    for (let i = 0; i < composition.BOSS; i++) enemyPool.push('BOSS')
    
    // Shuffle the pool
    for (let i = enemyPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[enemyPool[i], enemyPool[j]] = [enemyPool[j], enemyPool[i]]
    }
    
    return enemyPool[index] || 'BASIC'
  }
}
