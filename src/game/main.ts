import { Game as MainGame } from "./scenes/Game"
import { MainMenu } from "./scenes/MainMenu"
import { Loading } from "./scenes/Loading"
import { CollisionEditor } from "./scenes/CollisionEditor"
import { Options } from "./scenes/Options"
import { HighScoreScene } from "./scenes/HighScoreScene"
import { AUTO, Game, Scale, Types } from "phaser"

// Find out more information about the Game Config at:
// https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const config: Types.Core.GameConfig = {
  type: AUTO,
  width: 1200, // Reduced viewport size for better performance
  height: 800,  // Reduced viewport size for better performance
  parent: "game-container",
  backgroundColor: "#000000", // Changed to black to match loading screen
  scale: {
    mode: Scale.FIT,
    autoCenter: Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: { 
      gravity: { x: 0, y: 0 }, 
      debug: false 
    }
  },
  scene: [Loading, MainMenu, Options, HighScoreScene, MainGame, CollisionEditor],
}

const StartGame = (parent: string) => {
  return new Game({ ...config, parent })
}

export default StartGame
