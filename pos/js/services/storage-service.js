/ pos/js/services/storage-service.js
// ============================================
class StorageService {
    /**
     * Save data to localStorage with error handling
     */
    static save(key, data) {
        try {
            const serialized = JSON.stringify(data);
            localStorage.setItem(key, serialized);
            return true;
        } catch (error) {
            console.error('Storage save error:', error);
            return false;
        }
    }
    
    /**
     * Load data from localStorage
     */
    static load(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Storage load error:', error);
            return defaultValue;
        }
    }
    
    /**
     * Remove item from localStorage
     */
    static remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Storage remove error:', error);
            return false;
        }
    }
    
    /**
     * Clear all POS data
     */
    static clearPOSData() {
        Object.values(POSConfig.storage).forEach(key => {
            this.remove(key);
        });
    }
    
    /**
     * Check storage availability
     */
    static isAvailable() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            return false;
        }
    }
}