// pos/js/pos-app.js - Main Application Entry Point
// ============================================
class POSApp {
    constructor() {
        this.controller = null;
        this.init();
    }
    
    async init() {
        try {
            // Check browser compatibility
            this.checkBrowserSupport();
            
            // Initialize storage
            if (!StorageService.isAvailable()) {
                throw new Error('LocalStorage no disponible');
            }
            
            // Initialize controller
            this.controller = new POSController();
            
            console.log('POS System initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize POS:', error);
            this.showFatalError(error.message);
        }
    }
    
    checkBrowserSupport() {
        const requiredFeatures = [
            'fetch',
            'localStorage',
            'Map',
            'Set',
            'Promise'
        ];
        
        const missing = requiredFeatures.filter(feature => !(feature in window));
        
        if (missing.length > 0) {
            throw new Error(`Navegador no compatible. Faltan: ${missing.join(', ')}`);
        }
    }
    
    showFatalError(message) {
        document.body.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 100vh; text-align: center;">
                <div>
                    <h1 style="color: #dc2626;">Error Fatal</h1>
                    <p>${message}</p>
                    <button onclick="location.reload()">Recargar</button>
                </div>
            </div>
        `;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.posApp = new POSApp();
});

// Export for debugging
window.POSConfig = POSConfig;
window.POSUtils = POSUtils;