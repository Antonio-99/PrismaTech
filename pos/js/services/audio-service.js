/ pos/js/services/audio-service.js
// ============================================
class AudioService {
    constructor() {
        this.enabled = POSConfig.audio.enabled;
        this.volume = POSConfig.audio.volume;
        this.sounds = new Map();
        this.preloadSounds();
    }
    
    async preloadSounds() {
        const soundPromises = Object.entries(POSConfig.audio.sounds).map(async ([key, path]) => {
            try {
                const audio = new Audio(path);
                audio.volume = this.volume;
                audio.preload = 'auto';
                this.sounds.set(key, audio);
            } catch (error) {
                console.warn(`Failed to load sound: ${path}`);
            }
        });
        
        await Promise.allSettled(soundPromises);
    }
    
    play(soundKey) {
        if (!this.enabled) return;
        
        const sound = this.sounds.get(soundKey);
        if (sound) {
            try {
                sound.currentTime = 0;
                sound.play().catch(e => console.warn('Audio play failed:', e));
            } catch (error) {
                console.warn('Audio playback error:', error);
            }
        }
    }
    
    setEnabled(enabled) {
        this.enabled = enabled;
        StorageService.save('audio_enabled', enabled);
    }
    
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        this.sounds.forEach(sound => {
            sound.volume = this.volume;
        });
        StorageService.save('audio_volume', this.volume);
    }
}
