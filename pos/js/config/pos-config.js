/ pos/js/config/pos-config.js
// ============================================
const POSConfig = {
    // API Configuration
    api: {
        baseURL: '/api',
        endpoints: {
            products: '/products/get.php',
            categories: '/categories/get.php',
            sales: '/sales/post.php',
            quotes: '/sales/post.php?quote=1'
        },
        timeout: 10000,
        retryAttempts: 3
    },
    
    // UI Configuration
    ui: {
        itemsPerPage: 50,
        searchDelay: 300,
        toastDuration: 3000,
        animationDuration: 300
    },
    
    // Business Rules
    business: {
        taxRate: 0.16,
        currency: 'MXN',
        currencySymbol: '$',
        maxCartItems: 50,
        maxQuantityPerItem: 999
    },
    
    // Audio Configuration
    audio: {
        enabled: true,
        volume: 0.5,
        sounds: {
            addToCart: 'sounds/add-item.mp3',
            removeFromCart: 'sounds/remove-item.mp3',
            sale: 'sounds/sale-complete.mp3',
            error: 'sounds/error.mp3'
        }
    },
    
    // Local Storage Keys
    storage: {
        cart: 'pos_cart',
        settings: 'pos_settings',
        lastCustomer: 'pos_last_customer'
    }
};