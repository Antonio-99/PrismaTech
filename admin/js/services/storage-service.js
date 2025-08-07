// ============================================
// admin/js/services/storage-service.js - Servicio de Almacenamiento
// ============================================

class StorageService {
    constructor() {
        this.prefix = 'prismatech_admin_';
        this.version = '1.0';
        this.checkAvailability();
    }

    checkAvailability() {
        try {
            const test = 'test';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            this.available = true;
        } catch (e) {
            this.available = false;
            console.warn('LocalStorage no disponible');
        }
    }

    // Almacenamiento básico
    set(key, value, options = {}) {
        if (!this.available) return false;

        try {
            const data = {
                value: value,
                timestamp: Date.now(),
                version: this.version,
                expires: options.expires ? Date.now() + options.expires : null
            };

            localStorage.setItem(this.prefix + key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Storage set error:', error);
            return false;
        }
    }

    get(key, defaultValue = null) {
        if (!this.available) return defaultValue;

        try {
            const item = localStorage.getItem(this.prefix + key);
            if (!item) return defaultValue;

            const data = JSON.parse(item);

            // Verificar expiración
            if (data.expires && Date.now() > data.expires) {
                this.remove(key);
                return defaultValue;
            }

            return data.value;
        } catch (error) {
            console.error('Storage get error:', error);
            return defaultValue;
        }
    }

    remove(key) {
        if (!this.available) return false;

        try {
            localStorage.removeItem(this.prefix + key);
            return true;
        } catch (error) {
            console.error('Storage remove error:', error);
            return false;
        }
    }

    clear() {
        if (!this.available) return false;

        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(this.prefix)) {
                    localStorage.removeItem(key);
                }
            });
            return true;
        } catch (error) {
            console.error('Storage clear error:', error);
            return false;
        }
    }

    // Almacenamiento de configuraciones de usuario
    setUserPreference(key, value) {
        const preferences = this.get('user_preferences', {});
        preferences[key] = value;
        return this.set('user_preferences', preferences);
    }

    getUserPreference(key, defaultValue = null) {
        const preferences = this.get('user_preferences', {});
        return preferences[key] !== undefined ? preferences[key] : defaultValue;
    }

    // Caché con TTL
    setCache(key, value, ttl = 3600000) { // 1 hora por defecto
        return this.set('cache_' + key, value, { expires: ttl });
    }

    getCache(key) {
        return this.get('cache_' + key);
    }

    clearCache() {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith(this.prefix + 'cache_')) {
                localStorage.removeItem(key);
            }
        });
    }

    // Borradores de formularios
    saveDraft(formId, data) {
        return this.set('draft_' + formId, data, { expires: 7 * 24 * 60 * 60 * 1000 }); // 7 días
    }

    getDraft(formId) {
        return this.get('draft_' + formId);
    }

    clearDraft(formId) {
        return this.remove('draft_' + formId);
    }

    // Historial de búsquedas
    addSearchHistory(term, category = 'general') {
        const history = this.get('search_history_' + category, []);
        
        // Remover término existente
        const index = history.indexOf(term);
        if (index > -1) {
            history.splice(index, 1);
        }

        // Agregar al inicio
        history.unshift(term);

        // Mantener solo los últimos 10
        if (history.length > 10) {
            history.splice(10);
        }

        return this.set('search_history_' + category, history);
    }

    getSearchHistory(category = 'general') {
        return this.get('search_history_' + category, []);
    }

    // Estadísticas de uso
    recordAction(action, data = {}) {
        const stats = this.get('usage_stats', {});
        const today = new Date().toDateString();

        if (!stats[today]) {
            stats[today] = {};
        }

        if (!stats[today][action]) {
            stats[today][action] = 0;
        }

        stats[today][action]++;

        // Mantener solo los últimos 30 días
        const keys = Object.keys(stats);
        if (keys.length > 30) {
            const oldestKey = keys.sort()[0];
            delete stats[oldestKey];
        }

        return this.set('usage_stats', stats);
    }

    getUsageStats(days = 7) {
        const stats = this.get('usage_stats', {});
        const result = {};
        const now = new Date();

        for (let i = 0; i < days; i++) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toDateString();
            result[dateStr] = stats[dateStr] || {};
        }

        return result;
    }

    // Información del almacenamiento
    getStorageInfo() {
        if (!this.available) {
            return { available: false };
        }

        let totalSize = 0;
        let itemCount = 0;
        const items = {};

        try {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith(this.prefix)) {
                    const size = localStorage.getItem(key).length;
                    totalSize += size;
                    itemCount++;
                    items[key.replace(this.prefix, '')] = size;
                }
            });

            return {
                available: true,
                totalSize: totalSize,
                itemCount: itemCount,
                items: items,
                quota: this.estimateQuota()
            };
        } catch (error) {
            return { available: true, error: error.message };
        }
    }

    estimateQuota() {
        try {
            let i = 0;
            const testKey = 'test_quota';
            const testValue = '0123456789';
            
            while (i < 10000) {
                try {
                    localStorage.setItem(testKey + i, testValue);
                    i++;
                } catch (e) {
                    // Cleanup
                    for (let j = 0; j < i; j++) {
                        localStorage.removeItem(testKey + j);
                    }
                    return i * testValue.length;
                }
            }
            
            // Cleanup if we didn't hit the limit
            for (let j = 0; j < i; j++) {
                localStorage.removeItem(testKey + j);
            }
            
            return i * testValue.length;
        } catch (error) {
            return 'Unknown';
        }
    }
}
