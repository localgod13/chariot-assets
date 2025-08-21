
// src/game/config/constants.ts

export const GAME_CONFIG = {
  PLAYER: {
    SPEED: 300,
    SIZE: 20,
    COLOR: 0x00ff88,
    MAX_HEALTH: 100,
    ATTACK_RATE: 500, // ms between attacks
  },
  ENEMY: {
    SPEED: 100,
    SIZE: 15,
    COLOR: 0xff4444,
    SPAWN_RATE: 800, // Reduced from 1000ms to 800ms - faster spawning
    HEALTH: 20,
    XP_VALUE: 10,
  },
  ENEMY_TYPES: {
    BASIC: {
      HEALTH: 125, // Increased from 100 to 125 (requires 5 hits with 25 damage bullets)
      SPEED: 85, // Increased from 80 to 85 - faster starting speed
      SIZE: 80,
      COLOR: 0xff4444,
      XP_MULTIPLIER: 1,
      SPAWN_WEIGHT: 0.75, // Reduced from 85% to 75% to allow more variety
      MIN_LEVEL: 1
    },
    STRONG: {
      HEALTH: 225, // Increased from 175 to 225 (requires 9 hits)
      SPEED: 80, // Increased from 70 to 80 - faster starting speed
      SIZE: 100,
      COLOR: 0xff8800,
      XP_MULTIPLIER: 2,
      SPAWN_WEIGHT: 0.20, // Increased from 13% to 20% - more threatening enemies
      MIN_LEVEL: 2 // Earlier appearance - level 2 instead of 3
    },
    ELITE: {
      HEALTH: 350, // Increased from 275 to 350 (requires 14 hits)
      SPEED: 110, // Increased from 95 to 110 - much faster
      SIZE: 120,
      COLOR: 0xff0088,
      XP_MULTIPLIER: 3,
      SPAWN_WEIGHT: 0.04, // Increased from 1.5% to 4%
      MIN_LEVEL: 4 // Earlier appearance - level 4 instead of 6
    },
    BOSS: {
      HEALTH: 650, // Increased from 500 to 650 (requires 26 hits)
      SPEED: 70, // Increased from 55 to 70 - much faster
      SIZE: 240, // Increased from 160 to 240 (50% larger)
      COLOR: 0x8800ff,
      XP_MULTIPLIER: 5,
      SPAWN_WEIGHT: 0.01, // Increased from 0.5% to 1%
      MIN_LEVEL: 6 // Earlier appearance - level 6 instead of 10
    }
  },
  BULLET: {
    SPEED: 600,
    SIZE: 8,
    PLAYER_COLOR: 0xffff00,
    ENEMY_COLOR: 0xff0088,
    DAMAGE: 25,
  },
  WORLD: {
    WIDTH: 2400, // Reduced from 4000 for better performance and gameplay
    HEIGHT: 1800, // Reduced from 3000 for better performance and gameplay
  },
  LEVELING: {
    BASE_XP: 300, // Increased from 200 to 300
    XP_MULTIPLIER: 1.6, // Increased from 1.5 to 1.6 for even steeper curve
  },
  XP_ORBS: {
    SMALL: {
      VALUE: 3, // Reduced from 5
      SIZE: 6,
      COLOR: 0x00ff00,
      PROBABILITY: 0.6
    },
    MEDIUM: {
      VALUE: 8, // Reduced from 15
      SIZE: 10,
      COLOR: 0x00ffff,
      PROBABILITY: 0.3
    },
    LARGE: {
      VALUE: 20, // Reduced from 30
      SIZE: 14,
      COLOR: 0xffff00,
      PROBABILITY: 0.08
    },
    RARE: {
      VALUE: 50, // Reduced from 100
      SIZE: 18,
      COLOR: 0xff00ff,
      PROBABILITY: 0.02
    }
  },
  COLLISION_BOXES: [
    {
      "id": "box_1",
      "x": 0,
      "y": 4,
      "width": 67,
      "height": 1790
    },
    {
      "id": "box_2",
      "x": -2,
      "y": 0,
      "width": 994,
      "height": 176
    },
    {
      "id": "box_3",
      "x": 990,
      "y": 4,
      "width": 406,
      "height": 268
    },
    {
      "id": "box_4",
      "x": 1398,
      "y": 9,
      "width": 1004,
      "height": 169
    },
    {
      "id": "box_6",
      "x": 2330,
      "y": 9,
      "width": 70,
      "height": 1784
    },
    {
      "id": "box_7",
      "x": 2,
      "y": 1641,
      "width": 2395,
      "height": 160
    },
    {
      "id": "box_8",
      "x": 551,
      "y": 1606,
      "width": 97,
      "height": 27
    },
    {
      "id": "box_9",
      "x": 1749,
      "y": 1604,
      "width": 91,
      "height": 20
    },
    {
      "id": "box_10",
      "x": 2265,
      "y": 1323,
      "width": 60,
      "height": 103
    },
    {
      "id": "box_11",
      "x": 2269,
      "y": 453,
      "width": 52,
      "height": 78
    },
    {
      "id": "box_12",
      "x": 1846,
      "y": 172,
      "width": 111,
      "height": 23
    },
    {
      "id": "box_13",
      "x": 448,
      "y": 168,
      "width": 98,
      "height": 27
    },
    {
      "id": "box_14",
      "x": 76,
      "y": 1324,
      "width": 55,
      "height": 103
    },
    {
      "id": "box_15",
      "x": 73,
      "y": 452,
      "width": 46,
      "height": 73
    }
  ]
}

export const COLORS = {
  BACKGROUND: 0x1a0d2e,
  UI_DARK: 0x2d1b3d,
  UI_LIGHT: 0x4a2c5a,
  TEXT: 0xffffff,
  ACCENT: 0xff6b9d,
  SUCCESS: 0x00ff88,
  WARNING: 0xffaa00,
  DANGER: 0xff4444,
}