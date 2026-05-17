class AudioManager {
  private static instance: AudioManager;
  private bgm: HTMLAudioElement | null = null;
  private musicEnabled: boolean = true;
  private soundEnabled: boolean = true;
  private currentBgmKey: string = '';

  private constructor() {
    // Load saved settings from local storage
    const savedMusic = localStorage.getItem('musicEnabled');
    const savedSound = localStorage.getItem('soundEnabled');
    this.musicEnabled = savedMusic !== 'false'; // Defaults to true
    this.soundEnabled = savedSound !== 'false';
  }

  static getInstance() {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  playBGM(url: string) {
    // If it's already playing this exact track, do nothing
    if (this.currentBgmKey === url && this.bgm) {
      if (this.musicEnabled && this.bgm.paused) this.bgm.play().catch(() => {});
      return;
    }

    if (this.bgm) {
      this.bgm.pause();
      this.bgm.src = '';
    }

    this.currentBgmKey = url;
    this.bgm = new Audio(url);
    this.bgm.loop = true;
    this.bgm.volume = 0.4; // Background music should be slightly quiet

    if (this.musicEnabled) {
      const playPromise = this.bgm.play();
      
      // Browsers block autoplay until the user interacts with the screen. 
      // This catches the error and waits for their first tap/click to start the music.
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          console.warn('[Audio] Autoplay blocked. Waiting for user interaction...');
          const startAudio = () => {
            if (this.musicEnabled && this.bgm) this.bgm.play();
            document.removeEventListener('click', startAudio);
            document.removeEventListener('touchstart', startAudio);
          };
          document.addEventListener('click', startAudio);
          document.addEventListener('touchstart', startAudio);
        });
      }
    }
  }

  stopBGM() {
    if (this.bgm) {
      this.bgm.pause();
    }
  }

  playSFX(url: string) {
    if (!this.soundEnabled) return;
    const sfx = new Audio(url);
    sfx.volume = 0.7;
    sfx.play().catch(e => console.warn('[Audio] SFX failed:', e));
  }

  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    localStorage.setItem('musicEnabled', String(this.musicEnabled));
    
    if (this.musicEnabled && this.bgm) {
      this.bgm.play().catch(() => {});
    } else if (this.bgm) {
      this.bgm.pause();
    }
    return this.musicEnabled;
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    localStorage.setItem('soundEnabled', String(this.soundEnabled));
    return this.soundEnabled;
  }

  isMusicEnabled() { return this.musicEnabled; }
  isSoundEnabled() { return this.soundEnabled; }
}

export const audioManager = AudioManager.getInstance();
