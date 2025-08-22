import { Scene } from "phaser"
import { Player } from "../objects/Player"
import { Bullet } from "../objects/Bullet"
import { Card } from "../objects/Card"
import { XPOrb, XPOrbType } from "../objects/XPOrb"
import { Sword } from "../objects/Sword"
import { Mace } from "../objects/Mace"
import { GAME_CONFIG } from "../config/constants"
import { getRandomUpgrades, Upgrade } from "../config/upgrades"
import { RoundManager } from "../utils/RoundManager"
import { EnemySpawner } from "../utils/EnemySpawner"
import { UIManager } from "../utils/UIManager"
import { SceneryManager } from "../utils/SceneryManager"
import { TrapManager } from "../utils/TrapManager"
import { GameOverManager } from "../utils/GameOverManager"

export class Game extends Scene {
  private player!: Player
  private enemies!: Phaser.GameObjects.Group
  private bullets!: Phaser.GameObjects.Group
  private xpOrbs!: Phaser.GameObjects.Group
  private swords!: Phaser.GameObjects.Group
  private maces!: Phaser.GameObjects.Group
  private collisionBodies!: Phaser.GameObjects.Group
  private hearts!: Phaser.GameObjects.Group
  private cards: Card[] = []
  
  private gameTime: number = 0
  private isPaused: boolean = false
  private isGameOver: boolean = false
  
  // Managers
  private roundManager!: RoundManager
  private enemySpawner!: EnemySpawner
  private uiManager!: UIManager
  private sceneryManager!: SceneryManager
  private trapManager!: TrapManager
  private gameOverManager!: GameOverManager
  
  // Overlays
  private cardOverlay!: Phaser.GameObjects.Container
  private roundCompleteOverlay!: Phaser.GameObjects.Container
  private pauseOverlay!: Phaser.GameObjects.Container
  
  // Debug collision boxes
  private debugCollisionBoxes: (Phaser.GameObjects.Graphics | Phaser.GameObjects.Text)[] = []
  private enemyDebugBoxes: (Phaser.GameObjects.Graphics | Phaser.GameObjects.Text)[] = []
  private showCollisionBoxes: boolean = false
  
  // Background music
  private backgroundMusic!: Phaser.Sound.BaseSound | null
  private timeScaleResetTimer: any = null
  
  // Audio properties
  private crowdAudio!: Phaser.Sound.BaseSound | null
  private cheerSound!: Phaser.Sound.BaseSound | null
  private vicSound!: Phaser.Sound.BaseSound | null

  // Slow time system
  private slowTimeActive: boolean = false

  // Performance optimization variables
  private updateCounter: number = 0
  private readonly UPDATE_FREQUENCY = 3 // Only do expensive operations every 3rd frame

  constructor() {
    super("Game")
  }
  
  destroy() {
    console.log('Game scene destroy() called - cleaning up')
    
    // Clean up managers
    if (this.uiManager) {
      this.uiManager.destroy()
    }
    
    if (this.sceneryManager) {
      this.sceneryManager.destroy()
    }
    
    // Clean up debug collision boxes when scene is destroyed
    this.destroyDebugCollisionBoxes()
    
    // Clean up enemy debug boxes
    this.enemyDebugBoxes.forEach(item => {
      if (item && item.active) {
        item.destroy()
      }
    })
    this.enemyDebugBoxes = []
    
    // Stop and clean up background music
    if (this.backgroundMusic) {
      this.backgroundMusic.stop()
      this.backgroundMusic.destroy()
    }
    
    // Clean up any existing timers
    if (this.timeScaleResetTimer) {
      this.timeScaleResetTimer.destroy()
      this.timeScaleResetTimer = null
    }
    
    // Clean up all overlays
    if (this.cardOverlay && this.cardOverlay.active) {
      this.cardOverlay.destroy()
    }
    if (this.roundCompleteOverlay && this.roundCompleteOverlay.active) {
      this.roundCompleteOverlay.destroy()
    }
    if (this.pauseOverlay && this.pauseOverlay.active) {
      this.pauseOverlay.destroy()
    }
    
    // Clean up cards
    this.cards.forEach(card => {
      if (card && card.active) {
        card.destroy()
      }
    })
    this.cards = []
    
    // Remove all keyboard listeners
    if (this.input && this.input.keyboard) {
      this.input.keyboard.removeAllListeners()
    }
    
    // Clean up trap manager
    if (this.trapManager) {
      this.trapManager.destroy()
    }
  }

  preload() {
    // Load the 4K background image
    this.load.image('background', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/BG-Lm6OWlkXYa6Rztqzp3Yq1USBR34bZM.png')
    
    // Load the chariot player images - base and upgrades
    this.load.image('chariot', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/chariot-Hr5QjJWTcVU2cmSwZG0pLvd2cnTRJl.png')
    this.load.image('chariot2', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/chariot2-2ZtaBPdncm7Vvy04BM5aPHGL2sjVOd.png')
    this.load.image('chariot3', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/chariot3-xxzbNAmKvxPSqvkL4iSGdxSmCuBSBA.png')
    this.load.image('chariot4', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/chariot4-TX05IufSSOiwoW3SLq1QsWMwp7fdQ7.png')
    
    // Load canonball image for basic bullets
    this.load.image('canonball', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/canonball-Jc26BTlxdNLtpsttyK4KHe9WvdmVMS.png')
    
    // Load basic enemy sprites
    this.load.image('basic1', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/basic1-DfqEDutwtGr73D2q3EQbCC1bvn2VPf.png')
    this.load.image('basic2', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/basic2-rwTlJASVyswn0uWowePaR9a1JaIX0Y.png')
    
    // Load strong enemy sprite
    this.load.image('stong', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/stong-9SVwfazIZWI54ZMUaBIdPvybyMpcON.png')
    
    // Load elite enemy sprite
    this.load.image('elite', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/elite-UmWir821SxeadJh0ISsBsAe6ovQX7w.png')
    
    // Load boss enemy sprite
    this.load.image('boss', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/boss-ycLkBFUKy3FIiNpO8kQPxfklqQbCKJ.png')
    
    // Load pickup images
    this.load.image('sword', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/sword-GXhddYJutWfK10njUhzwT6q3lcNAhG.png')
    this.load.image('mace', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/mace-sPDKZnxySis7wvqdg8bx9Tv7PO5tJp.png');
    this.load.image('armorpile', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/armorpile-PKtx9Wq1gXHyeHvI4moxtVlfPNyY6n.png');
    
    // Load bones image for death effects
    this.load.image('bones', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/bones-gPktCsJwXJnnZhjbZyh2YJzYw4Yl4W.png');
    
    // Load heart image for healing - using the correct provided asset URL
    this.load.image('heart', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/heart-EK6Bpapf7sSH30sOhpgMLAvEEwf1Vq.png');
    
    // Load weaponrack image for scenery
    this.load.image('weaponrack', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/weaponrack-DoxPp9a7P6q5OoGxs6zK1Xjuld7sTg.png');
    
    // Load weaponrack2 image for scenery
    this.load.image('weaponrack2', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/weaponrack2-6UVBNCtBpmFKhPyS11LRMdAoSfOLro.png');
    
    // Load weaponrack3 image for scenery
    this.load.image('weaponrack3', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/weaponrack3-LDVnoEybUAqdHzpWfkI644LtpJKUT5.png');
    
    // Load shield image for scenery
    this.load.image('shield', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/shield-ZuMPbB3fqv1H3XMEVsUQPjE3XHoxrr.png');
    
    // Load shield2 image for scenery
    this.load.image('shield2', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/shield2-O9eTQcLcRLgSUz5rBN2NW0JUOOxASm.png');
    
    // Load center image for player field center
    this.load.image('center', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/center-ubnXxcR46iBXQ2E5cYlJyiG5zZqAwn.png');
    
    // Load round completion image
    this.load.image('roundComplete', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/round-AjEdtfTZ7A3ilsSjXr0p4nrXCRFFJR.png');
    
    // Load upgrade card images
    this.load.image('pierce', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/pierce-GTrrtGsfhmIql1wvV7Nmt3TH5H3cVv.png');
    this.load.image('rapid', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/rapid-NDV4ZcRG8CWFCMW0hlsGOXrncn07LD.png');
    this.load.image('energy', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/energy-enzhGLWePrVPMMv5sPJSsqyG2Zdm3p.png');
    this.load.image('hm', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/hm-W6TzDb5yhz6vzCqa32ewJSb4vN0P6X.png');
    this.load.image('er', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/er-HteSd1RRLigbQ9EZTBf40YIemxc0qL.png');
    this.load.image('slow', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/slow-9ShcONnmaz1fJXMPzTur53Tk8nnknC.png');
    this.load.image('rico', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/rico-AV8R6ImFOCoKQ9iD1VIxsx4fpVRCkj.png');
    this.load.image('levelup', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/levelup-SfsXzHBScIgVi1r0GGYIbhrX8Gs5sJ.png');
    
    // Add success logging for heart image loading
    this.load.on('filecomplete-image-heart', () => {
      console.log('Heart image loaded successfully from provided asset');
    });
    
    // Add success logging for weaponrack image loading
    this.load.on('filecomplete-image-weaponrack', () => {
      console.log('Weaponrack image loaded successfully from provided asset');
    });
    
    // Add success logging for weaponrack2 image loading
    this.load.on('filecomplete-image-weaponrack2', () => {
      console.log('Weaponrack2 image loaded successfully from provided asset');
    });
    
    // Add success logging for weaponrack3 image loading
    this.load.on('filecomplete-image-weaponrack3', () => {
      console.log('Weaponrack3 image loaded successfully from provided asset');
    });
    
    // Load scythe image for player upgrades
    this.load.image('scythe', 'https://cdn.jsdelivr.net/gh/localgod13/chariot-assets@New-branch-reverted/public/assets/scythe.png')
    
    // Load background music
    this.load.audio('arena', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/arena-6OLO9iZKW6G7wyuzBXPiOe8q62FiYD.mp3')
    
    // Load movement sound effect
    this.load.audio('trot', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/trot-GAeQzWni7rkutYD4RQ34Vrp3vEXpEq.mp3')
    
    // Load attack sound effects
    this.load.audio('canon', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/canon-b5OYxoaQsyITqiw8zAb5PcIKN0tyna.mp3');
    this.load.audio('rockets', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/rockets-2MJJPfglsCcr0oXDZWsgke1avYKrEE.mp3');
    this.load.audio('arrow', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/arrow-NFGxFyU9eVFdbxVgdwjAoJIazZmU9a.mp3');
    this.load.audio('explosion', 'https://cdn.jsdelivr.net/gh/localgod13/chariot-assets@main/bexplosion.mp3');
    
    // Load hit sound effects
    this.load.audio('hit1', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/hit1-cpDzbE2Wb4srwW5nH4hvohAvj260ur.mp3');
    this.load.audio('hit2', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/hit2-rWKNzAsHKmgBnTYfMUWyDS2mkOB0Zj.mp3');
    
    // Load horse sound for player damage
    this.load.audio('horse', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/horse-tBToQQ2Xu1y4E9jP12R6sRPgt440k9.mp3');
    
    // Load second horse sound for alternating player damage sounds
    this.load.audio('horse2', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/horse2-w8pE6BwMWMoMwKQFwkdMpXTKVhi0DM.mp3');
    
    // Load enemy death sound effects
    this.load.audio('death1', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/death1-KU9GGtimcGw5IDMrwuH9E0I5misbKs.mp3');
    this.load.audio('death2', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/death2-mNXIOyFRksB7wkZTahJ3vvdvxN4ZjE.mp3');
    this.load.audio('death3', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/death3-be2n84MFyLG3c5WXF00U6BBXGWRqxt.mp3');
    
    // Load strong enemy death sound effect
    this.load.audio('strongdeath', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/strongdeath-5AMnb2cV0US5dw5pNrH9nCKYxPNaF9.mp3');
    
    // Load crowd background audio for gameplay
    this.load.audio('crowd', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/crowd-bRvLO1cI0WwaqJfq6F7Z8tGKbq0FV2.mp3');
    
    // Load cheer sound for round completion
    this.load.audio('cheer', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/cheer-MqrMQx7yaaFU2DgZsCSGFOBLLDF9lB.mp3');
    
    // Load vic sound for round completion celebration
    this.load.audio('vic', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/vic-oOq6AynuCd4CTYCLKKpFrxzgOWIxJ4.mp3');
    
    // Load spike trap sprite sheet
    this.load.spritesheet('spike', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/Spike%20Trap-Xdhc5epLupYHTdIAi3NgMAs5s4SZXs.png', {
      frameWidth: 32, // 448 / 14 columns = 32 pixels per frame
      frameHeight: 32
    });
    
    // Load missile image for homing missiles
    this.load.image('missile', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/missile-7cxQrXfHDTKHZHfiotW4IzpWGTSoTL.webp');
    
    // Load drum sound for level up
    this.load.audio('drum', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/drum-DeCJoNNjg8VAUcqO0SVENbB148Ron3.mp3');
    
    // Load rose image for round completion celebration
    this.load.image('rose', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/rose-MEfL3zIOtl2mJgpi3oz6u5RkUYWivl.webp');
    
    // Load rest image for death screen restart button
    this.load.image('rest', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/rest-OYKzylJ9r03z3BoVVY8Om5nMl5kWWq.png');
    
    // Load mainmenu image for death screen menu button
    this.load.image('mainmenu', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/mainmenu-6eYaruoZbGzXNZyaW2vnbGdvyBZZ00.png');
    
    // Load death image for game over screen
    this.load.image('death', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/death-0jgKAuYTQtlW181piEpakMhT7EPV3n.png');
    
    // Load apple image for death screen celebration
    this.load.image('apple', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/apple-SOgNQm02xJgeV2hRGfdUsmYlToDtIJ.webp');
    
    // Load tomato image for death screen
    this.load.image('tom', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/tom-YmvaxiAbfUJKN9OOIj1DGQrwqValX1.png');
    
    // Load tomato splat image for when tomatoes hit the ground
    this.load.image('tomsplat', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/tomsplat-mg662dLZ7QBNj8iLStjtpgkvIaSFWh.png');
    
    // Load fail sound for death screen
    this.load.audio('fail', 'https://1jnxxd5hmjmhwwrc.public.blob.vercel-storage.com/fail-96sT3a48qTeWqfcHckIeVhjHZqxy75.mp3');
  }

  create() {
    console.log('Game scene create() called - initializing fresh game state');
    
    try {
      // Initialize managers
      this.roundManager = new RoundManager();
      
      // Initialize game state flags
      this.isPaused = false;
      this.isGameOver = false;
      this.gameTime = 0;
      
      // Initialize slow time system
      this.slowTimeActive = false;
      
      // Clear any existing timers
      if (this.timeScaleResetTimer) {
        this.timeScaleResetTimer.destroy();
        this.timeScaleResetTimer = null;
      }
      
      // Add the background image and scale it properly
      const bg = this.add.image(0, 0, 'background');
      bg.setOrigin(0, 0);
      
      const scaleX = GAME_CONFIG.WORLD.WIDTH / bg.width;
      const scaleY = GAME_CONFIG.WORLD.HEIGHT / bg.height;
      bg.setScale(scaleX, scaleY);
      
      // Set physics world bounds to match our world size
      this.physics.world.setBounds(0, 0, GAME_CONFIG.WORLD.WIDTH, GAME_CONFIG.WORLD.HEIGHT);
      
      // Ensure physics world is resumed and at normal time scale
      this.physics.world.resume();
      this.physics.world.timeScale = 1;
      
      // Create player at center of world
      this.player = new Player(this, GAME_CONFIG.WORLD.WIDTH / 2, GAME_CONFIG.WORLD.HEIGHT / 2);
      console.log('Player created successfully:', !!this.player);
      
      // Create groups - destroy existing ones first if they exist
      if (this.enemies) this.enemies.destroy(true);
      if (this.bullets) this.bullets.destroy(true);
      if (this.xpOrbs) this.xpOrbs.destroy(true);
      if (this.swords) this.swords.destroy(true);
      if (this.maces) this.maces.destroy(true);
      if (this.hearts) this.hearts.destroy(true);
      if (this.collisionBodies) this.collisionBodies.destroy(true);
      
      this.enemies = this.add.group();
      this.bullets = this.add.group();
      this.xpOrbs = this.add.group();
      this.swords = this.add.group();
      this.maces = this.add.group();
      this.hearts = this.add.group();
      this.collisionBodies = this.add.group();
      
      // Initialize enemy spawner after groups are created
      this.enemySpawner = new EnemySpawner(this, this.player, this.enemies);
      
      // Initialize scenery manager
      this.sceneryManager = new SceneryManager(this);
      
      // Initialize trap manager
      this.trapManager = new TrapManager(this);
      
      // Clear cards array
      this.cards = [];
      
      // Create collision boxes
      this.createCollisionBoxes();
      
      // Setup main camera to follow player
      this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
      this.cameras.main.setBounds(0, 0, GAME_CONFIG.WORLD.WIDTH, GAME_CONFIG.WORLD.HEIGHT);
      
      // Set camera zoom to zoom out more for better view
      this.cameras.main.setZoom(0.6);
      
      // Create separate UI camera that stays fixed - MOVED BEFORE scenery creation
      const gameWidth = this.sys.game.config.width as number;
      const gameHeight = this.sys.game.config.height as number;
      const uiCamera = this.cameras.add(0, 0, gameWidth, gameHeight);
      
      // Make cameras ignore each other's objects
      this.cameras.main.ignore([]);
      uiCamera.ignore([bg, this.player, this.enemies, this.bullets, this.xpOrbs, this.swords, this.maces, this.hearts, this.collisionBodies] as any);
      
      // Create scenery objects (weapon racks, etc.) - AFTER UI camera is created
      this.sceneryManager.createScenery();
      
      // Create spike traps after scenery
      this.trapManager.createTraps();
      
      // CRITICAL: After creating scenery, ensure UI camera ignores ALL scenery objects
      const sceneryObjects = this.sceneryManager.sceneryObjects || [];
      if (sceneryObjects.length > 0) {
        uiCamera.ignore(sceneryObjects);
        console.log(`UI camera ignoring ${sceneryObjects.length} scenery objects`);
      }
      
      // Setup physics collisions
      this.setupCollisions();
      
      // Initialize UI manager and create UI - ENSURE this happens before any update calls
      this.uiManager = new UIManager(this, this.player);
      this.uiManager.createUI(uiCamera);
      console.log('UIManager initialized successfully:', !!this.uiManager);
      
      this.gameOverManager = new GameOverManager(this, this.player, this.roundManager);

      // Clear any existing keyboard handlers to prevent conflicts
      this.input.keyboard!.removeAllListeners();
      
      // Add keyboard handlers
      this.setupKeyboardHandlers();
      
      // Start background music with current volume setting
      const currentVolume = this.sound.volume;
      this.backgroundMusic = this.sound.add('arena', {
        loop: true,
        volume: 0.361 * currentVolume
      });
      this.backgroundMusic.play();
      
      // Start crowd audio for gameplay atmosphere
      this.crowdAudio = this.sound.add('crowd', {
        loop: true,
        volume: 0.25 * currentVolume // Quieter than main music to not overpower
      });
      this.crowdAudio.play();
      
      // Initialize cheer sound for round completion
      this.cheerSound = this.sound.add('cheer', {
        loop: false,
        volume: 0.6 * currentVolume // Celebratory volume level
      });
      
      // Initialize vic sound for round completion
      this.vicSound = this.sound.add('vic', {
        loop: false,
        volume: 0.7 * currentVolume // Victory celebration volume
      });
      
      // Generate enemies for the first round
      this.roundManager.generateRoundEnemies();
      
      console.log('Game scene initialization complete');
      
    } catch (error) {
      console.error('Error during Game scene initialization:', error);
      // Try to restart the scene if initialization fails
      this.time.delayedCall(1000, () => {
        this.scene.restart();
      });
    }
  }

  private setupKeyboardHandlers(): void {
    // Add F9 key handler to switch to collision editor
    this.input.keyboard!.on('keydown-F9', () => {
      this.scene.start('CollisionEditor');
    });
    
    // Add F8 key handler to toggle collision box debug view
    this.input.keyboard!.on('keydown-F8', () => {
      this.toggleCollisionBoxDebug();
    });
    
    // Add R key handler to restart when game over
    this.input.keyboard!.on('keydown-R', () => {
      if (this.isGameOver) {
        this.restartGame();
      }
    });
    
    // Add ESC key handler to restart when game over or show/hide pause menu
    this.input.keyboard!.on('keydown-ESC', () => {
      if (this.isGameOver) {
        this.restartGame();
      } else if (this.isPaused) {
        this.resumeGame();
      } else {
        this.showPauseMenu();
      }
    });
    
    // Add backslash key handler to skip round (for testing/debugging)
    this.input.keyboard!.on('keydown-BACK_SLASH', () => {
      const roundData = this.roundManager.getRoundData();
      if (!this.isGameOver && !this.isPaused && !roundData.isRoundTransition) {
        this.skipRound();
      }
    });
    
    // Add L key handler for debug level up
    this.input.keyboard!.on('keydown-L', () => {
      if (!this.isGameOver && !this.isPaused) {
        this.debugLevelUp();
      }
    });
    

  }

  private onEnemyKilled(): void {
    const isRoundComplete = this.roundManager.onEnemyKilled();
    
    if (isRoundComplete) {
      this.completeRound();
    }
  }

  private completeRound(): void {
    const roundData = this.roundManager.getRoundData()
    if (roundData.isRoundTransition) return // Prevent multiple triggers
    
    this.roundManager.completeRound()
    this.physics.world.pause()
    
    // Play cheer sound for round completion
    if (this.cheerSound) {
      console.log('Playing cheer sound for round completion')
      this.cheerSound.play()
    } else {
      console.warn('Cheer sound not available')
    }
    
    // Play vic sound for victory celebration with 500ms delay
    this.time.delayedCall(500, () => {
      if (this.vicSound) {
        console.log('Playing vic sound for victory celebration (delayed)')
        this.vicSound.play()
      } else {
        console.warn('Vic sound not available')
      }
    })
    
    // Show round complete overlay with continue button
    this.roundCompleteOverlay = this.uiManager.showRoundComplete(
      roundData.currentRound,
      roundData.enemiesKilledThisRound,
      roundData.enemiesNeededThisRound,
      roundData.totalEnemiesKilled
    )
    
    // No automatic timer - player must click to continue
  }

  // New method to handle manual round continuation
  public continueToNextRound(): void {
    console.log('Player clicked continue - starting next round')
    this.startNextRound()
  }

  private startNextRound(): void {
    this.roundManager.startNextRound()
    const roundData = this.roundManager.getRoundData()
    
    // Clear existing enemies to start fresh
    this.enemies.children.entries.forEach((enemy: any) => {
      if (enemy && enemy.active) {
        enemy.destroy()
      }
    })
    
    // Generate new enemy queue for this round
    this.roundManager.generateRoundEnemies()
    
    // Hide round complete overlay
    if (this.roundCompleteOverlay && this.roundCompleteOverlay.active) {
      this.roundCompleteOverlay.destroy()
    }
    
    this.physics.world.resume()
    
    console.log(`Starting Round ${roundData.currentRound} - Spawning ${roundData.enemiesNeededThisRound} enemies`)
    
    // Update EnemySpawner with current round for difficulty scaling
    this.enemySpawner.setCurrentRound(roundData.currentRound)
    
    // Dynamic fallback timer based on number of enemies
    const baseTime = 5000
    const timePerEnemy = 150
    const fallbackTime = baseTime + (roundData.enemiesNeededThisRound * timePerEnemy)
    
    this.time.delayedCall(fallbackTime, () => {
      const currentRoundData = this.roundManager.getRoundData()
      if (currentRoundData.isRoundTransition) {
        console.log(`FALLBACK: Force starting combat after ${fallbackTime}ms`)
        this.startCombatPhase()
      }
    })
  }

  private spawnQueuedEnemies(time: number): void {
    const enemyData = this.roundManager.getNextEnemyToSpawn(time)
    if (!enemyData) return
    
    const enemy = this.enemySpawner.spawnEnemy(enemyData.type, enemyData)
    if (!enemy) return
    
    // Calculate combat position
    const positionIndex = this.roundManager.getNextPositionIndex()
    const combatPosition = this.enemySpawner.calculateCombatPosition(positionIndex)
    
    enemy.setData('combatPosition', combatPosition)
    enemy.setData('isPositioning', true)
    enemy.setData('formationData', enemyData)
    
    // Move enemy to combat position
    this.moveEnemyToPosition(enemy, combatPosition)
    
    const roundData = this.roundManager.getRoundData()
    const formationInfo = enemyData.formationId >= 0 ? 
      `Formation ${enemyData.formationId + 1} (${enemyData.formationSize}x${enemyData.formationSize}) pos ${enemyData.positionInFormation + 1}` : 
      'Individual'
    console.log(`SpawnSpawn ${enemyData.type} enemy (${roundData.enemiesSpawnedThisRound}/${roundData.enemiesNeededThisRound}) - ${formationInfo}`)
  }

  private moveEnemyToPosition(enemy: any, targetPosition: {x: number, y: number}): void {
    const distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, targetPosition.x, targetPosition.y)
    const baseSpeed = 350
    const duration = Math.max(1000, (distance / baseSpeed) * 1000)
    
    const movementTween = this.tweens.add({
      targets: enemy,
      x: targetPosition.x,
      y: targetPosition.y,
      duration: duration,
      ease: 'Power2.easeOut',
      onComplete: () => {
        if (enemy.body) {
          enemy.body.setVelocity(0, 0)
        }
        
        enemy.setData('isPositioning', false)
        enemy.setData('isPositioned', true)
        enemy.setData('combatActive', false)
        
        this.checkAllEnemiesPositioned()
      },
      onCompleteScope: this
    })
    
    enemy.setData('positioningTween', movementTween)
    enemy.setData('isPositioning', true)
    enemy.setData('isPositioned', false)
    enemy.setData('combatActive', false)
  }

  private checkAllEnemiesPositioned(): void {
    const allEnemies = this.enemies.children.entries
    const activeEnemies = allEnemies.filter((enemy: any) => enemy.active)
    const positionedEnemies = activeEnemies.filter((enemy: any) => 
      enemy.getData('isPositioned') === true
    )
    
    const roundData = this.roundManager.getRoundData()
    
    console.log(`Positioning check: ${positionedEnemies.length}/${activeEnemies.length} enemies positioned, ${roundData.enemiesSpawnedThisRound}/${roundData.enemiesNeededThisRound} spawned`)
    
    // FIXED: Use correct property name
    const allEnemiesSpawned = roundData.enemiesSpawnedThisRound >= roundData.enemiesNeededThisRound
    const allActiveEnemiesPositioned = activeEnemies.length > 0 && 
                                      positionedEnemies.length === activeEnemies.length
    
    if (allEnemiesSpawned && allActiveEnemiesPositioned) {
      console.log('All enemies spawned and positioned - starting combat phase')
      this.startCombatPhase()
    } else {
      console.log(`Still waiting: spawned=${roundData.enemiesSpawnedThisRound}/${roundData.enemiesNeededThisRound}, positioned=${positionedEnemies.length}/${activeEnemies.length}`)
      
      if (allEnemiesSpawned && activeEnemies.length > 0) {
        this.time.delayedCall(4000, () => {
          const currentRoundData = this.roundManager.getRoundData()
          if (currentRoundData.isRoundTransition && activeEnemies.length > 0) {
            console.log('FALLBACK: Starting combat after timeout')
            this.startCombatPhase()
          }
        })
      }
    }
  }

  private startCombatPhase(): void {
    this.roundManager.startCombatPhase()
    
    let activatedCount = 0
    this.enemies.children.entries.forEach((enemy: any) => {
      if (enemy.active) {
        enemy.setData('combatActive', true)
        activatedCount++
        console.log(`Activated combat for enemy at (${Math.round(enemy.x)}, ${Math.round(enemy.y)})`)
      }
    })
    
    const roundData = this.roundManager.getRoundData()
    console.log(`Combat phase started for Round ${roundData.currentRound} - ${activatedCount} enemies activated`)
    
    // Force a quick update on all enemies
    this.enemies.children.entries.forEach((enemy: any) => {
      if (enemy.active && enemy.update) {
        enemy.update()
      }
    })
  }

  private createCollisionBoxes(): void {
    GAME_CONFIG.COLLISION_BOXES.forEach(boxData => {
      const zone = this.add.zone(
        boxData.x + boxData.width / 2, 
        boxData.y + boxData.height / 2, 
        boxData.width, 
        boxData.height
      );
      
      this.physics.add.existing(zone, true);
      this.collisionBodies.add(zone);
      
      if (this.showCollisionBoxes) {
        const debugBox = this.add.graphics()
        debugBox.lineStyle(2, 0xff0000, 1)
        debugBox.strokeRect(zone.x - zone.width / 2, zone.y - zone.height / 2, zone.width, zone.height)
        this.debugCollisionBoxes.push(debugBox)
      }
    })
  }

  private setupCollisions(): void {
    // Player bullets hit enemies
    this.physics.add.overlap(this.bullets, this.enemies, (bullet: any, enemy: any) => {
      if (bullet.isPlayerBullet) {
        const enemyWasAlive = enemy.health > 0
        enemy.takeDamage(bullet.damage)
        
        if (enemyWasAlive && enemy.health <= 0) {
          this.onEnemyKilled()
        }
        
        bullet.hitTarget(enemy)
      }
    })
    
    // Enemies hit player - but only during combat phase
    this.physics.add.overlap(this.player, this.enemies, (player: any, enemy: any) => {
      const roundData = this.roundManager.getRoundData()
      if (roundData.isRoundTransition || enemy.getData('isPositioning') === true) {
        return
      }
      
      if (enemy.getData('combatActive') !== true) {
        return
      }
      
      let damage = 10
      switch (enemy.enemyType) {
        case 'BASIC': damage = 10; break
        case 'STRONG': damage = 16; break
        case 'ELITE': damage = 22; break
        case 'BOSS': damage = 30; break
      }
      
      player.takeDamage(damage)
      this.onEnemyKilled()
      enemy.destroy()
    })
    
    // Player collects XP orbs
    this.physics.add.overlap(this.player, this.xpOrbs, (player: any, orb: any) => {
      player.gainXP(orb.value)
      orb.collect()
    })
    
    // Player collects swords
    this.physics.add.overlap(this.player, this.swords, (player: any, sword: any) => {
      player.gainXP(sword.value)
      sword.collect()
    })
    
    // Player collects maces
    this.physics.add.overlap(this.player, this.maces, (player: any, mace: any) => {
      player.gainXP(mace.value)
      mace.collect()
    })
    
    // Player collects hearts for healing
    this.physics.add.overlap(this.player, this.hearts, (_player: any, heart: any) => {
      console.log('Heart collision detected!')
      // FIXED: Don't apply health immediately - let the heart animation handle it
      heart.collect()
      
      console.log(`Heart collected - animation will handle healing`)
    })
    
    // Player collides with collision boxes
    this.physics.add.collider(this.player, this.collisionBodies)
    
    // Enemies collide with collision boxes
    this.physics.add.collider(this.enemies, this.collisionBodies)
    
    // Bullets collide with collision boxes
    this.physics.add.collider(this.bullets, this.collisionBodies, (bullet: any) => {
      if (!bullet.ricochet) {
        bullet.destroy()
      }
    })
  }

  update(time: number, delta: number) {
    if (this.isPaused || this.isGameOver) return
    
    this.gameTime += delta
    this.updateCounter++
    
    // Update player every frame (critical for responsiveness)
    this.player.update(time, this.enemies)
    
    // Stagger expensive operations across frames to reduce hitching
    const frameOffset = this.updateCounter % this.UPDATE_FREQUENCY
    
    if (frameOffset === 0) {
      // Frame 0: Update enemies (most expensive)
      this.enemies.children.entries.forEach((enemy: any) => {
        if (enemy && enemy.active) {
          enemy.update()
        }
      })
    } else if (frameOffset === 1) {
      // Frame 1: Update bullets and XP orbs
      this.bullets.children.entries.forEach((bullet: any) => {
        if (bullet && bullet.update) bullet.update()
      })
      
      this.xpOrbs.children.entries.forEach((orb: any) => {
        if (orb && orb.update) orb.update(time)
      })
    } else if (frameOffset === 2) {
      // Frame 2: Update debug boxes, UI, and cleanup
      if (this.showCollisionBoxes) {
        this.updateDebugBoxes()
      }
      
      // Update XP orb attraction
      this.updateXPOrbs()
      
      // Clean up distant objects (less frequently)
      if (this.updateCounter % (this.UPDATE_FREQUENCY * 5) === 0) {
        this.cleanupDistantObjects()
      }
    }
    
    // Spawn enemies from queue (every frame for timing accuracy)
    this.spawnQueuedEnemies(time)
    
    // Safety check and UI update (every frame)
    const roundData = this.roundManager.getRoundData()
    if (!roundData.isRoundTransition && 
        this.enemies.children.entries.length === 0 && 
        roundData.roundEnemyQueue.length === 0 && 
        roundData.enemiesKilledThisRound < roundData.enemiesNeededThisRound) {
      console.log('Safety check: No enemies left but round incomplete, forcing completion')
      const updatedRoundData = this.roundManager.getRoundData()
      updatedRoundData.enemiesNeededThisRound = updatedRoundData.enemiesKilledThisRound
      this.completeRound()
    }
    
    // Update UI (every frame for smooth display)
    if (this.uiManager && this.uiManager.updateUI) {
      this.uiManager.updateUI(
        this.gameTime, 
        roundData.currentRound, 
        roundData.enemiesKilledThisRound, 
        roundData.enemiesNeededThisRound
      )
    }
    
    // Update trap collisions (less frequently)
    if (this.trapManager && this.updateCounter % this.UPDATE_FREQUENCY === 0) {
      this.trapManager.checkTrapCollisions(this.player, this.enemies)
    }
  }

  private updateXPOrbs() {
    // Remove bullet_magnet functionality entirely
    // XP orbs no longer have magnetic attraction
    
    // All XP orbs, swords, maces, and hearts now behave normally without magnetic attraction
  }

  private cleanupDistantObjects() {
    const maxDistance = 1500
    const playerX = this.player.x
    const playerY = this.player.y
    
    // Clean up bullets - batch process
    const bulletsToDestroy: any[] = []
    this.bullets.children.entries.forEach((bullet: any) => {
      const distance = Phaser.Math.Distance.Between(playerX, playerY, bullet.x, bullet.y)
      if (distance > maxDistance) {
        bulletsToDestroy.push(bullet)
      }
    })
    bulletsToDestroy.forEach(bullet => bullet.destroy())
    
    // More aggressive XP orb cleanup and limit total count
    const maxXPOrbs = 40 // Reduced from 50
    const xpOrbEntries = this.xpOrbs.children.entries
    
    // Clean up distant orbs - batch process
    const orbsToDestroy: any[] = []
    xpOrbEntries.forEach((orb: any) => {
      const distance = Phaser.Math.Distance.Between(playerX, playerY, orb.x, orb.y)
      if (distance > maxDistance) {
        orbsToDestroy.push(orb)
      }
    })
    orbsToDestroy.forEach(orb => orb.destroy())
    
    // If we still have too many orbs, remove the oldest ones
    const remainingOrbs = this.xpOrbs.children.entries
    if (remainingOrbs.length > maxXPOrbs) {
      const orbsToRemove = remainingOrbs.length - maxXPOrbs
      for (let i = 0; i < orbsToRemove; i++) {
        const oldestOrb = remainingOrbs[i]
        if (oldestOrb && oldestOrb.active) {
          oldestOrb.destroy()
        }
      }
    }
    
    // Clean up distant swords
    this.swords.children.entries.forEach((sword: any) => {
      const distance = Phaser.Math.Distance.Between(playerX, playerY, sword.x, sword.y)
      if (distance > maxDistance) {
        sword.destroy()
      }
    })
    
    // Clean up distant maces
    this.maces.children.entries.forEach((mace: any) => {
      const distance = Phaser.Math.Distance.Between(playerX, playerY, mace.x, mace.y)
      if (distance > maxDistance) {
        mace.destroy()
      }
    })
    
    // Clean up distant hearts
    this.hearts.children.entries.forEach((heart: any) => {
      const distance = Phaser.Math.Distance.Between(playerX, playerY, heart.x, heart.y)
      if (distance > maxDistance) {
        heart.destroy()
      }
    })
  }

  private updateDebugBoxes() {
    if (!this.showCollisionBoxes) return
    
    this.updatePlayerDebugBox()
    this.updateEnemyDebugBoxes()
  }
  
  private updatePlayerDebugBox() {
    if (!this.player || !this.player.body) return
    
    let playerDebugBox = null
    let playerLabel = null
    
    for (const item of this.debugCollisionBoxes) {
      if (item.getData && item.getData('debugType') === 'player') {
        if (item instanceof Phaser.GameObjects.Graphics) {
          playerDebugBox = item
        } else if (item instanceof Phaser.GameObjects.Text) {
          playerLabel = item
        }
      }
    }
    
    if (playerDebugBox && playerDebugBox.active) {
      playerDebugBox.clear()
      playerDebugBox.lineStyle(3, 0x00ff00, 0.8)
      playerDebugBox.fillStyle(0x00ff00, 0.2)
      
      const body = this.player.body as Phaser.Physics.Arcade.Body
      playerDebugBox.fillRect(body.x, body.y, body.width, body.height)
      playerDebugBox.strokeRect(body.x, body.y, body.width, body.height)
    }
    
    if (playerLabel && playerLabel.active) {
      const body = this.player.body as Phaser.Physics.Arcade.Body
      playerLabel.setPosition(body.center.x, body.center.y)
    }
  }
  
  private updateEnemyDebugBoxes() {
    this.enemyDebugBoxes.forEach(item => {
      if (item && item.active) {
        item.destroy()
      }
    })
    this.enemyDebugBoxes = []
    
    if (this.enemies && this.enemies.children) {
      this.enemies.children.entries.forEach((enemy: any) => {
        if (enemy && enemy.active && enemy.body) {
          this.createEnemyDebugBox(enemy)
        }
      })
    }
  }
  
  private createEnemyDebugBox(enemy: any) {
    const body = enemy.body as Phaser.Physics.Arcade.Body
    
    const enemyDebugBox = this.add.graphics()
    enemyDebugBox.lineStyle(2, 0xff8800, 0.8)
    enemyDebugBox.fillStyle(0xff8800, 0.15)
    enemyDebugBox.fillRect(body.x, body.y, body.width, body.height)
    enemyDebugBox.strokeRect(body.x, body.y, body.width, body.height)
    
    const enemyLabel = this.add.text(
      body.center.x,
      body.center.y,
      enemy.enemyType || 'ENEMY',
      {
        fontSize: '10px',
        color: '#ffffff',
        backgroundColor: 'rgba(255,136,0,0.8)',
        padding: { x: 2, y: 1 }
      }
    )
    enemyLabel.setOrigin(0.5)
    
    enemyDebugBox.setDepth(500)
    enemyDebugBox.setScrollFactor(1, 1)
    enemyLabel.setDepth(500)
    enemyLabel.setScrollFactor(1, 1)
    
    const uiCamera = this.cameras.cameras[1]
    if (uiCamera) {
      uiCamera.ignore([enemyDebugBox, enemyLabel])
    }
    
    this.enemyDebugBoxes.push(enemyDebugBox)
    this.enemyDebugBoxes.push(enemyLabel)
  }

  public createBullet(x: number, y: number, angle: number, _isPlayerBullet: boolean = true) {
    this.createBasicBullet(x, y, angle)
  }

  public createBasicBullet(x: number, y: number, angle: number) {
    if (typeof x !== 'number' || typeof y !== 'number' || typeof angle !== 'number' || 
        isNaN(x) || isNaN(y) || isNaN(angle)) {
      console.warn('Invalid bullet parameters:', { x, y, angle })
      return null
    }
    
    const bullet = new Bullet(this, x, y, angle, true)
    bullet.setScrollFactor(1, 1)
    bullet.setDepth(1100) // Set bullet depth higher than player (1000)
    
    const uiCamera = this.cameras.cameras[1]
    if (uiCamera) {
      uiCamera.ignore(bullet)
    }
    
    this.bullets.add(bullet)
    return bullet // Return the bullet instance so upgrades can be applied
  }

  public createHomingMissile(x: number, y: number, angle: number, level: number = 1) {
    const { HomingMissile } = require('../objects/HomingMissile')
    const missile = new HomingMissile(this, x, y, angle, level)
    missile.setScrollFactor(1, 1)
    missile.setDepth(1100) // Set missile depth higher than player (1000)
    
    const uiCamera = this.cameras.cameras[1]
    if (uiCamera) {
      uiCamera.ignore(missile)
    }
    
    this.bullets.add(missile)
  }

  public createExplosiveRound(x: number, y: number, angle: number, level: number = 1) {
    const { ExplosiveRound } = require('../objects/ExplosiveRound')
    const round = new ExplosiveRound(this, x, y, angle, level)
    round.setScrollFactor(1, 1)
    round.setDepth(1100) // Set explosive round depth higher than player (1000)
    
    const uiCamera = this.cameras.cameras[1]
    if (uiCamera) {
      uiCamera.ignore(round)
    }
    
    this.bullets.add(round)
  }

  public createChainLightning(x: number, y: number, angle: number, level: number = 1) {
    const { ChainLightning } = require('../objects/ChainLightning')
    const lightning = new ChainLightning(this, x, y, angle, level)
    lightning.setScrollFactor(1, 1)
    lightning.setDepth(1100) // Set chain lightning depth higher than player (1000)
    
    const uiCamera = this.cameras.cameras[1]
    if (uiCamera) {
      uiCamera.ignore(lightning)
    }
    
    this.bullets.add(lightning)
  }

  public createPiercingArrow(x: number, y: number, angle: number, level: number = 1) {
    const { PiercingArrow } = require('../objects/PiercingArrow')
    const arrow = new PiercingArrow(this, x, y, angle, level)
    arrow.setScrollFactor(1, 1)
    arrow.setDepth(1100) // Set piercing arrow depth higher than player (1000)
    
    const uiCamera = this.cameras.cameras[1]
    if (uiCamera) {
      uiCamera.ignore(arrow)
    }
    
    this.bullets.add(arrow)
  }

  public createXPOrb(x: number, y: number, type: XPOrbType) {
    const orb = new XPOrb(this, x, y, type)
    orb.setScrollFactor(1, 1)
    this.xpOrbs.add(orb)
    
    const uiCamera = this.cameras.cameras[1]
    if (uiCamera) {
      uiCamera.ignore(orb)
    }
  }

  public createSword(x: number, y: number) {
    const sword = new Sword(this, x, y)
    sword.setScrollFactor(1, 1)
    this.swords.add(sword)
    
    const uiCamera = this.cameras.cameras[1]
    if (uiCamera) {
      uiCamera.ignore(sword)
    }
  }

  public createMace(x: number, y: number) {
    const mace = new Mace(this, x, y)
    mace.setScrollFactor(1, 1)
    this.maces.add(mace)
    
    const uiCamera = this.cameras.cameras[1]
    if (uiCamera) {
      uiCamera.ignore(mace)
    }
  }

  public createHeart(x: number, y: number) {
    console.log('Game.createHeart called at:', x, y)
    const { Heart } = require('../objects/Heart')
    const heart = new Heart(this, x, y)
    heart.setScrollFactor(1, 1)
    this.hearts.add(heart)
    
    const uiCamera = this.cameras.cameras[1]
    if (uiCamera) {
      uiCamera.ignore(heart)
    }
    
    console.log('Heart created and added to hearts group. Total hearts:', this.hearts.children.entries.length)
  }

  public showCardSelection() {
    this.isPaused = true
    this.physics.world.pause()
    
    // Play drum sound for level up - with better error handling and logging
    console.log('Attempting to play drum sound...')
    try {
      // Ensure the sound is properly loaded before playing
      if (this.sound.get('drum')) {
        const drumSound = this.sound.play('drum', {
          volume: 0.8// Increased from 0.7 to 0.8 for better audibility
        })
        console.log('Drum sound played:', drumSound)
      } else {
        console.error('Drum sound not loaded yet')
        // Try to load and play immediately
        this.sound.play('drum', {
          volume: 0.8
        })
      }
    } catch (error) {
      console.error('Error playing drum sound:', error)
    }
    
    const gameWidth = this.sys.game.config.width as number
    const gameHeight = this.sys.game.config.height as number
    
    this.cardOverlay = this.add.container(0, 0)
    this.cardOverlay.setScrollFactor(0)
    this.cardOverlay.setDepth(2000)
    
    const overlay = this.add.graphics()
    overlay.fillStyle(0x000000, 0.8)
    overlay.fillRect(0, 0, gameWidth, gameHeight)
    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, gameWidth, gameHeight), Phaser.Geom.Rectangle.Contains)
    this.cardOverlay.add(overlay)
    
    const levelupImage = this.add.image(gameWidth / 2, 170, 'levelup') // Moved down from 150 to 170
    levelupImage.setOrigin(0.5)
    levelupImage.setScale(0.35) // Reduced from 0.5 to 0.35 for smaller size
    this.cardOverlay.add(levelupImage)
    
    this.cameras.main.ignore([this.cardOverlay, overlay, levelupImage])
    
    const upgrades = getRandomUpgrades(3, this.player.level)
    const cardSpacing = 320 // Increased from 280 to 320 for more room between cards
    const totalWidth = (upgrades.length - 1) * cardSpacing
    const startX = gameWidth / 2 - totalWidth / 2
    
    this.cards = []
    upgrades.forEach((upgrade, index) => {
      const cardx = startX + (index * cardSpacing)
      const cardY = gameHeight / 2 + 100 // Moved down 100 pixels from center
      
      const card = new Card(this, cardx, cardY, upgrade)
      card.setScrollFactor(0)
      card.setDepth(2001)
      this.cards.push(card)
      
      this.cameras.main.ignore(card)
    })
    
    // Move subtitle text below the cards
    const subtitle = this.add.text(gameWidth / 2, gameHeight / 2 + 250, 'Choose an upgrade:', {
      fontSize: '24px',
      color: '#cccccc',
      align: 'center'
    })
    subtitle.setOrigin(0.5)
    this.cardOverlay.add(subtitle)
    
    this.cameras.main.ignore(subtitle)
  }

  public selectUpgrade(upgrade: Upgrade) {
    console.log('Selectselect upgrade:', upgrade.name)
    
    upgrade.effect(this.player)
    
    this.cards.forEach(card => {
      if (card && card.active) {
        card.destroy()
      }
    })
    this.cards= []
    
    if (this.cardOverlay && this.cardOverlay.active) {
      this.cardOverlay.destroy()
    }
    
    this.isPaused = false
    this.physics.world.resume()
    
    if (this.physics && this.physics.world) {
      this.physics.world.timeScale = 1
    }
    
    if (this.backgroundMusic && this.backgroundMusic.isPaused) {
      this.backgroundMusic.resume()
    }
    
    if (this.crowdAudio && this.crowdAudio.isPaused) {
      this.crowdAudio.resume()
    }
    
    console.log('Upgrade applied and cards cleaned up')
  }

  public showGameOver() {
    // Add safety checks to prevent the camera error
    if (!this.scene || !this.scene.isActive()) {
      console.warn('Scene is not active, cannot show game over screen');
      return;
    }
    
    if (!this.cameras || !this.cameras.main) {
      console.warn('Cameras not available, cannot show game over screen');
      return;
    }
    
    this.isGameOver = true
    this.gameOverManager.show(this.gameTime)
  }

  public restartGame() {
    console.log('Restartinging game from level 1...')
    
    if ( this.backgroundMusic) {
      this.backgroundMusic.stop()
      this.backgroundMusic.destroy()
      this.backgroundMusic = null
    }
    
    if (this.crowdAudio) {
      this.crowdAudio.stop()
      this.crowdAudio.destroy()
    }
    
    if (this.cheerSound) {
      this.cheerSound.stop()
      this.cheerSound.destroy()
    }
    
    if (this.vicSound) {
      this.vicSound.stop()
      this.vicSound.destroy()
    }
    
    if (this.timeScaleResetTimer) {
      this.timeScaleResetTimer.destroy()
      this.timeScaleResetTimer = null
    }
    
    if (this.cardOverlay && this.cardOverlay.active) {
      this.cardOverlay.destroy()
    }
    if (this.roundCompleteOverlay && this.roundCompleteOverlay.active) {
      this.roundCompleteOverlay.destroy()
    }
    if (this.pauseOverlay && this.pauseOverlay.active) {
      this.pauseOverlay.destroy()
    }
    
    this.cards.forEach(card => {
      if (card && card.active) {
        card.destroy()
      }
    })
    this.cards = []
    
    this.destroyDebugCollisionBoxes()
    this.enemyDebugBoxes.forEach(item => {
      if (item && item.active) {
        item.destroy()
      }
    })
    this.enemyDebugBoxes = []
    
    if (this.enemies) this.enemies.destroy(true)
    if (this.bullets) this.bullets.destroy(true)
    if (this.xpOrbs) this.xpOrbs.destroy(true)
    if (this.swords) this.swords.destroy(true)
    if (this.maces) this.maces.destroy(true)
    if (this.hearts) this.hearts.destroy(true)
    if (this.collisionBodies) this.collisionBodies.destroy(true)
    
    if (this.uiManager) {
      this.uiManager.destroy()
    }
    
    if (this.player) {
      this.player.destroy()
    }
    
    if (this.input && this.input.keyboard) {
      this.input.keyboard.removeAllListeners()
    }
    
    this.physics.world.resume()
    this.physics.world.timeScale = 1
    
    this.isPaused = false
    this.isGameOver = false
    this.gameTime = 0
    this.slowTimeActive = false
    this.showCollisionBoxes = false
    
    this.scene.restart()
  }

  public returnToMainMenu() {
    console.log('Returning to main menu...')
    
    if ( this.backgroundMusic) {
      this.backgroundMusic.stop()
      this.backgroundMusic.destroy()
    }
    
    this.scene.start('MainMenu')
  }

  private showPauseMenu() {
    if ( this.isPaused || this.isGameOver) return
    
    this.isPaused = true
    this.physics.world.pause()
    
    if ( this.backgroundMusic && this.backgroundMusic.isPlaying) {
      this.backgroundMusic.pause()
    }
    
    const gameWidth = this.sys.game.config.width as number
    const gameHeight = this.sys.game.config.height as number
    
    this.pauseOverlay = this.add.container(0, 0)
    this.pauseOverlay.setScrollFactor(0)
    this.pauseOverlay.setDepth(2500)
    
    const overlay = this.add.graphics()
    overlay.fillStyle(0x000000, 0.6)
    overlay.fillRect(0, 0, gameWidth, gameHeight)
    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, gameWidth, gameHeight), Phaser.Geom.Rectangle.Contains)
    this.pauseOverlay.add(overlay)
    
    const pauseTitle = this.add.text(gameWidth / 2, gameHeight / 2 - 100, 'GAME PAUSED', {
      fontSize: '48px',
      color: '#ffffff',
      align: 'center',
      fontStyle: 'bold'
    })
    pauseTitle.setOrigin(0.5)
    this.pauseOverlay.add(pauseTitle)
    
    this.createPauseMenuButtons(gameWidth, gameHeight)
    
    this.cameras.main.ignore([this.pauseOverlay, overlay, pauseTitle])
    
    console.log('Pause menu displayed')
  }

  private createPauseMenuButtons(gameWidth: number, gameHeight: number) {
    const buttonY = gameHeight / 2
    const buttonSpacing = 80
    const buttonWidth = 200
    const buttonHeight = 50
    
    const resumeButton = this.add.graphics()
    resumeButton.fillStyle(0x00aa00, 0.8)
    resumeButton.fillRoundedRect(gameWidth / 2 - buttonWidth / 2, buttonY - buttonSpacing, buttonWidth, buttonHeight, 8)
    resumeButton.lineStyle(3, 0x00ff00)
    resumeButton.strokeRoundedRect(gameWidth / 2 - buttonWidth / 2, buttonY - buttonSpacing, buttonWidth, buttonHeight, 8)
    resumeButton.setInteractive(new Phaser.Geom.Rectangle(gameWidth / 2 - buttonWidth / 2, buttonY - buttonSpacing, buttonWidth, buttonHeight), Phaser.Geom.Rectangle.Contains)
    this.pauseOverlay.add(resumeButton)
    
    const resumeText = this.add.text(gameWidth / 2, buttonY - buttonSpacing + buttonHeight / 2, 'RESUME', {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold'
    })
    resumeText.setOrigin(0.5)
    this.pauseOverlay.add(resumeText)
    
    const menuButton = this.add.graphics()
    menuButton.fillStyle(0xaa0000, 0.8)
    menuButton.fillRoundedRect(gameWidth / 2 - buttonWidth / 2, buttonY, buttonWidth, buttonHeight, 8);
    menuButton.lineStyle(3, 0xff0000)
    menuButton.strokeRoundedRect(gameWidth / 2 - buttonWidth / 2, buttonY, buttonWidth, buttonHeight, 8)
    menuButton.setInteractive(new Phaser.Geom.Rectangle(gameWidth / 2 - buttonWidth / 2, buttonY, buttonWidth, buttonHeight), Phaser.Geom.Rectangle.Contains)
    this.pauseOverlay.add(menuButton)
    
    const menuText = this.add.text(gameWidth / 2, buttonY + buttonHeight / 2, 'MAIN MENU', {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold'
    })
    menuText.setOrigin(0.5)
    this.pauseOverlay.add(menuText)
    
    const restartButton = this.add.graphics()
    restartButton.fillStyle(0x0066aa, 0.8)
    restartButton.fillRoundedRect(gameWidth / 2 - buttonWidth / 2, buttonY + buttonSpacing, buttonWidth, buttonHeight, 8)
    restartButton.lineStyle(3, 0x0088ff)
    restartButton.strokeRoundedRect(gameWidth / 2 - buttonWidth / 2, buttonY + buttonSpacing, buttonWidth, buttonHeight, 8)
    restartButton.setInteractive(new Phaser.Geom.Rectangle(gameWidth / 2 - buttonWidth / 2, buttonY + buttonSpacing, buttonWidth, buttonHeight), Phaser.Geom.Rectangle.Contains)
    this.pauseOverlay.add(restartButton)
    
    const restartText = this.add.text(gameWidth / 2, buttonY + buttonSpacing + buttonHeight / 2, 'RESTART', {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold'
    })
    restartText.setOrigin(0.5)
    this.pauseOverlay.add(restartText)
    
    const shortcutsText = this.add.text(gameWidth / 2, buttonY + buttonSpacing + 80, 'Press ESC to resume', {
      fontSize: '16px',
      color: '#cccccc',
      align: 'center'
    })
    shortcutsText.setOrigin(0.5)
    this.pauseOverlay.add(shortcutsText)
    
    resumeButton.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation()
      this.resumeGame()
    })
    
    menuButton.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation()
      this.returnToMainMenu()
    })
    
    restartButton.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation()
      this.restartGame()
    })
    
    this.cameras.main.ignore([resumeButton, menuButton, restartButton, resumeText, menuText, restartText, shortcutsText])
  }

  private resumeGame() {
    if (!this.isPaused) return
    
    this.isPaused = false
    
    if (this.pauseOverlay && this.pauseOverlay.active) {
      this.pauseOverlay.destroy()
    }
    
    this.physics.world.resume()
    
    if (this.backgroundMusic && this.backgroundMusic.isPaused) {
      this.backgroundMusic.resume()
    }
    
    console.log('Game resumed')
  }

  private skipRound() {
    console.log('Skipping current round (debug)')
    
    // Kill all existing enemies
    this.enemies.children.entries.forEach((enemy: any) => {
      if (enemy && enemy.active) {
        enemy.destroy()
      }
    })
    
    // Force round completion
    this.completeRound()
  }

  private debugLevelUp() {
    console.log('Debug: Forcing level up');
    
    // Force the player to level up by giving them enough XP
    const xpNeeded = GAME_CONFIG.LEVELING.BASE_XP * Math.pow(GAME_CONFIG.LEVELING.XP_MULTIPLIER, this.player.level - 1);
    const xpToGive = xpNeeded - this.player.xp + 1; // Give just enough to level up
    
    this.player.gainXP(xpToGive);
  }

  private toggleCollisionBoxDebug() {
    this.showCollisionBoxes = !this.showCollisionBoxes
    
    if (this.showCollisionBoxes) {
      this.createDebugCollisionBoxes()
      console.log('Collision box debug view enabled - showing collision boundaries')
    } else {
      this.destroyDebugCollisionBoxes()
      console.log('Collision box debug view disabled')
    }
    
    // Show a temporary on-screen message
    const gameWidth = this.sys.game.config.width as number
    
    const statusText = this.add.text(gameWidth / 2, 100, 
      this.showCollisionBoxes ? 'COLLISION DEBUG: ON' : 'COLLISION DEBUG: OFF', {
      fontSize: '20px',
      color: this.showCollisionBoxes ? '#00ff00' : '#ff0000',
      backgroundColor: 'rgba(0,0,0,0.8)',
      padding: { x: 12, y: 6 }
    })
    statusText.setOrigin(0.5)
    statusText.setScrollFactor(0)
    statusText.setDepth(2000)
    
    // Make sure main camera ignores this status text
    const uiCamera = this.cameras.cameras[1]
    if (uiCamera) {
      this.cameras.main.ignore(statusText)
    }
    
    this.time.delayedCall(2000, () => {
      if (statusText && statusText.active) {
        statusText.destroy()
      }
    })
  }

  private createDebugCollisionBoxes() {
    this.destroyDebugCollisionBoxes()
    
    // Create debug boxes for collision areas
    GAME_CONFIG.COLLISION_BOXES.forEach(boxData => {
      const debugBox = this.add.graphics()
      debugBox.lineStyle(2, 0xff0000, 1)
      debugBox.fillStyle(0xff0000, 0.1)
      debugBox.fillRect(boxData.x, boxData.y, boxData.width, boxData.height)
      debugBox.strokeRect(boxData.x, boxData.y, boxData.width, boxData.height)
      debugBox.setDepth(500)
      debugBox.setScrollFactor(1, 1)
      
      const label = this.add.text(
        boxData.x + boxData.width / 2,
        boxData.y + boxData.height / 2,
        boxData.id || 'COLLISION',
        {
          fontSize: '12px',
          color: '#ffffff',
          backgroundColor: 'rgba(255,0,0,0.8)',
          padding: { x: 4, y: 2 }
        }
      )
      label.setOrigin(0.5)
      label.setDepth(500)
      label.setScrollFactor(1, 1)
      
      const uiCamera = this.cameras.cameras[1]
      if (uiCamera) {
        uiCamera.ignore([debugBox, label])
      }
      
      this.debugCollisionBoxes.push(debugBox)
      this.debugCollisionBoxes.push(label)
    })
    
    // Create debug box for player
    if (this.player && this.player.body) {
      const playerDebugBox = this.add.graphics()
      playerDebugBox.setData('debugType', 'player')
      playerDebugBox.setDepth(500)
      playerDebugBox.setScrollFactor(1, 1)
      
      const playerLabel = this.add.text(0, 0, 'PLAYER', {
        fontSize: '10px',
        color: '#ffffff',
        backgroundColor: 'rgba(0,255,0,0.8)',
        padding: { x: 2, y: 1 }
      })
      playerLabel.setOrigin(0.5)
      playerLabel.setData('debugType', 'player')
      playerLabel.setDepth(500)
      playerLabel.setScrollFactor(1, 1)
      
      const uiCamera = this.cameras.cameras[1]
      if (uiCamera) {
        uiCamera.ignore([playerDebugBox, playerLabel])
      }
      
      this.debugCollisionBoxes.push(playerDebugBox)
      this.debugCollisionBoxes.push(playerLabel)
    }
    
    console.log(`Created ${this.debugCollisionBoxes.length} debug collision elements`)
  }

  private destroyDebugCollisionBoxes() {
    this.debugCollisionBoxes.forEach(item => {
      if (item && item.active) {
        item.destroy()
      }
    })
    this.debugCollisionBoxes = []
  }

  public activateSlowTime(duration: number = 3000, factor: number = 0.3) {
    if (this.slowTimeActive) return
    
    this.slowTimeActive = true
    
    // Apply slow time to physics
    if (this.physics && this.physics.world) {
      this.physics.world.timeScale = factor
    }
    
    // Apply slow time to tweens
    this.tweens.timeScale = factor
    
    console.log(`Slow time activated: ${factor}x speed for ${duration}ms`)
    
    // Clear any existing timer
    if (this.timeScaleResetTimer) {
      this.timeScaleResetTimer.destroy()
    }
    
    // Set timer to restore normal time
    this.timeScaleResetTimer = this.time.delayedCall(duration, () => {
      this.deactivateSlowTime()
    })
  }

  public deactivateSlowTime() {
    if (!this.slowTimeActive) return
    
    this.slowTimeActive = false
    
    // Restore normal physics time
    if (this.physics && this.physics.world) {
      this.physics.world.timeScale = 1
    }
    
    // Restore normal tween time
    this.tweens.timeScale = 1
    
    console.log('Slow time deactivated - normal speed restored')
    
    // Clear the timer
    if (this.timeScaleResetTimer) {
      this.timeScaleResetTimer.destroy()
      this.timeScaleResetTimer = null
    }
  }
}