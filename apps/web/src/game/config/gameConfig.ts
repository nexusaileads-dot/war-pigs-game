import Phaser from 'phaser';

/**
 * Phaser game configuration for War Pigs.
 * 
 * NOTE: Dimension resolution is deferred to BootScene.ts to avoid
 * SSR/hydration issues. This config is evaluated at module load time,
 * so all values must be statically safe or wrapped in functions.
 */
export const createGameConfig = (canvasParent?: string): Phaser.Types.Core.GameConfig => {
  const isDev = import.meta.env?.DEV || process.env.NODE_ENV === 'development';
  
  return {
    type: Phaser.AUTO,
    // Dimensions are overridden in BootScene.ts based on actual container
    // These defaults prevent SSR crashes
    width: 1920,
    height: 1080,
    parent: canvasParent,
    backgroundColor: '#1a1a1a',
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: isDev // Env-driven debug toggle
      }
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      // Cap pixel ratio for performance on high-DPI screens
      pixelRatio: Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio : 1),
      // Ensure crisp rendering
      autoRound: true
    },
    // Performance optimizations
    fps: {
      target: 60,
      forceSetTimeOut: false
    },
    render: {
      // Round pixels for crisp sprite rendering
      roundPixels: true,
      // Optimize batch rendering
      batchSize: 2000
    },
    // Audio config placeholder (handled by WebAudioPlugin)
    audio: {
      disableWebAudio: false,
      noAudio: false
    },
    // Prevent default browser gestures on mobile
    input: {
      gamepad: true,
      activeInput: true
    }
  };
};

// Legacy export for backward compatibility during refactor
export const gameConfig = createGameConfig();
