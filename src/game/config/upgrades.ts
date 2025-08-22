
// src/game/config/upgrades.ts

import { GAME_CONFIG } from './constants'

export interface Upgrade {
  id: string
  name: string
  description: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  color: number
  effect: (player: any) => void
  synergies?: string[]
  maxLevel?: number
  currentLevel?: number
  imageKey?: string // New property for card images
}

export const UPGRADES: Upgrade[] = [
  // Weapon Modifications - Now with progressive levels
  {
    id: 'explosive_rounds',
    name: 'Explosive Rounds',
    description: 'Bullets explode on impact, dealing area damage',
    rarity: 'rare',
    color: 0xff6600,
    maxLevel: 3,
    imageKey: 'er', // Add image for explosive rounds card
    effect: (player) => {
      const currentLevel = player.getUpgradeLevel('explosive_rounds') + 1
      player.setUpgradeLevel('explosive_rounds', currentLevel)
      player.addUpgrade('explosive_rounds')
    }
  },
  {
    id: 'piercing_arrows',
    name: 'Piercing Arrows',
    description: 'Bullets pierce through enemies',
    rarity: 'common',
    color: 0x88ff00,
    maxLevel: 3,
    imageKey: 'pierce', // Add image for piercing arrows card
    effect: (player) => {
      const currentLevel = player.getUpgradeLevel('piercing_arrows') + 1
      player.setUpgradeLevel('piercing_arrows', currentLevel)
      player.addUpgrade('piercing_arrows')
    }
  },
  {
    id: 'rapid_fire',
    name: 'Rapid Fire',
    description: 'Increase attack speed',
    rarity: 'common',
    color: 0xffff00,
    maxLevel: 5,
    imageKey: 'rapid', // Add image for rapid fire card
    effect: (player) => {
      const currentLevel = player.getUpgradeLevel('rapid_fire') + 1
      player.setUpgradeLevel('rapid_fire', currentLevel)
      
      // Reset to base attack rate first to prevent compounding
      player.attackRate = GAME_CONFIG.PLAYER.ATTACK_RATE
      
      // Apply progressive attack speed increase: 15%, 25%, 35%, 45%, 55%
      const speedBonus = 0.05 + (currentLevel * 0.1) // Changed from 0.1 + 0.1 to 0.05 + 0.1
      player.attackRate *= (1 - speedBonus)
      
      // Ensure attack rate doesn't go below a reasonable minimum
      player.attackRate = Math.max(player.attackRate, 100) // Minimum 100ms between attacks
    }
  },
  {
    id: 'homing_missiles',
    name: 'Homing Missiles',
    description: 'Bullets slowly track towards enemies',
    rarity: 'common',
    color: 0x00ffff,
    maxLevel: 4,
    imageKey: 'hm', // Add image for homing missiles card
    effect: (player) => {
      const currentLevel = player.getUpgradeLevel('homing_missiles') + 1
      player.setUpgradeLevel('homing_missiles', currentLevel)
      player.addUpgrade('homing_missiles')
    }
  },
  
  // Passive Abilities
  {
    id: 'slow_time',
    name: 'Slow Time on Hit',
    description: 'Time slows when you take damage',
    rarity: 'epic',
    color: 0x0088ff,
    maxLevel: 2,
    imageKey: 'slow', // Add image for slow time card
    effect: (player) => {
      const currentLevel = player.getUpgradeLevel('slow_time') + 1
      player.setUpgradeLevel('slow_time', currentLevel)
      player.addUpgrade('slow_time')
    }
  },
  {
    id: 'shield_regen',
    name: 'Energy Shield',
    description: 'Regenerate health over time',
    rarity: 'rare',
    color: 0x00ff00,
    maxLevel: 4,
    imageKey: 'energy', // Add image for energy shield card
    effect: (player) => {
      const currentLevel = player.getUpgradeLevel('shield_regen') + 1
      player.setUpgradeLevel('shield_regen', currentLevel)
      player.addUpgrade('shield_regen')
    }
  },
  
  // Advanced Effects - Unlocked at higher levels
  {
    id: 'ricochet',
    name: 'Ricochet Shot',
    description: 'Bullets bounce off walls',
    rarity: 'epic',
    color: 0xff0088,
    maxLevel: 2,
    imageKey: 'rico', // Updated to use the new rico asset
    effect: (player) => {
      const currentLevel = player.getUpgradeLevel('ricochet') + 1
      player.setUpgradeLevel('ricochet', currentLevel)
      player.addUpgrade('ricochet')
    },
    synergies: ['explosive_rounds', 'piercing_arrows']
  },
  {
    id: 'chain_lightning',
    name: 'Chain Lightning',
    description: 'Bullets jump between enemies',
    rarity: 'legendary',
    color: 0x8800ff,
    maxLevel: 3,
    effect: (player) => {
      const currentLevel = player.getUpgradeLevel('chain_lightning') + 1
      player.setUpgradeLevel('chain_lightning', currentLevel)
      player.addUpgrade('chain_lightning')
    },
    synergies: ['homing_missiles']
  },
  {
    id: 'bullet_storm',
    name: 'Bullet Storm',
    description: 'Fire an extra bullet with each shot',
    rarity: 'epic',
    color: 0xff4400,
    maxLevel: 3,
    effect: (player) => {
      const currentLevel = player.getUpgradeLevel('bullet_storm') + 1
      player.setUpgradeLevel('bullet_storm', currentLevel)
      player.addUpgrade('bullet_storm')
    }
  },
  {
    id: 'scythe',
    name: '',
    description: 'Attached Scythes to the wheels of your chariot for melee damage!',
    rarity: 'common',
    color: 0x8B4513, // Brown color for scythes
    maxLevel: 3, // Allow upgrading scythe damage
    imageKey: 'scytheupgrade', // Use scytheupgrade.png for upgrade card
    effect: (player) => {
      const currentLevel = player.getUpgradeLevel('scythe') + 1
      player.setUpgradeLevel('scythe', currentLevel)
      player.addUpgrade('scythe')
      // Show the scythes when the upgrade is obtained (first time)
      if (currentLevel === 1 && player.showScythes) {
        player.showScythes()
      }
    }
  }
]

export function getRandomUpgrades(count: number = 3, playerLevel: number = 1): Upgrade[] {
  // Filter upgrades based on player level and current upgrade levels
  const availableUpgrades = UPGRADES.filter(upgrade => {
    // Some upgrades only unlock at higher levels
    if (upgrade.id === 'chain_lightning' && playerLevel < 8) return false
    if (upgrade.id === 'bullet_storm' && playerLevel < 6) return false
    if (upgrade.id === 'ricochet' && playerLevel < 4) return false
    
    return true
  })
  
  const shuffled = [...availableUpgrades].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, count).map(upgrade => {
    // Update description based on current level
    const clone = { ...upgrade }
    updateUpgradeDescription(clone)
    return clone
  })
}

function updateUpgradeDescription(upgrade: Upgrade) {
  const level = upgrade.currentLevel || 1
  
  switch (upgrade.id) {
    case 'explosive_rounds':
      const radius = 50 + (level * 25)
      const damage = 30 + (level * 15)
      upgrade.description = `Fires explosive rounds that deal ${damage} damage in ${radius}px radius`
      if (level > 1) upgrade.name = `${upgrade.name} ${level}`
      break
      
    case 'piercing_arrows':
      const pierceCount = level + 1
      const arrowDamage = 18 + (level * 8)
      upgrade.description = `Fires arrows that pierce ${pierceCount} enemies for ${arrowDamage} damage each`
      if (level > 1) upgrade.name = `${upgrade.name} ${level}`
      break
      
    case 'rapid_fire':
      const speedPercent = Math.round((0.05 + level * 0.1) * 100)
      upgrade.description = `Basic attack speed increased by ${speedPercent}%`
      if (level > 1) upgrade.name = `${upgrade.name} ${level}`
      break
      
    case 'homing_missiles':
      const missileCount = level
      const missileDamage = 25 + (level * 10)
      upgrade.description = `Fires ${missileCount} homing missile${missileCount > 1 ? 's' : ''} dealing ${missileDamage} damage each`
      if (level > 1) upgrade.name = `${upgrade.name} ${level}`
      break
      
    case 'slow_time':
      const range = 200 + (level * 100)
      upgrade.description = `Attract XP orbs from ${range}px away`
      if (level > 1) upgrade.name = `${upgrade.name} ${level}`
      break
      
    case 'shield_regen':
      const regenRate = level * 0.10 // Reduced from 0.15 to 0.10 per second
      upgrade.description = `Regenerate ${regenRate.toFixed(1)} health per second`
      if (level > 1) upgrade.name = `${upgrade.name} ${level}`
      break
      
    case 'bullet_storm':
      const projectiles = 1 + level
      if (level === 1) {
        upgrade.description = `Basic attack fires ${projectiles + 1} bullets (1 extra projectile)`
      } else {
        upgrade.description = `Basic attack fires ${projectiles + 1} bullets in spread pattern`
      }
      if (level > 1) upgrade.name = `${upgrade.name} ${level}`
      break
      
    case 'chain_lightning':
      const chains = 1 + level
      const lightningDamage = 20 + (level * 10)
      upgrade.description = `Fires lightning that chains to ${chains} additional enemies for ${lightningDamage} damage`
      if (level > 1) upgrade.name = `${upgrade.name} ${level}`
      break
      
    case 'ricochet':
      const bounces = 1 + level // Level 1: bounces to 2 enemies, Level 2: bounces to 3 enemies
      upgrade.description = `Bullets bounce between ${bounces} enemies after hitting the first target`
      if (level > 1) upgrade.name = `${upgrade.name} ${level}`
      break
      
    case 'scythe':
      const scytheDamage = 45 + (level * 15)
      upgrade.description = `Attached Scythes to the wheels of your chariot for ${scytheDamage} melee damage!`
      // Keep name empty for all levels since the image shows the title
      break
  }
}
