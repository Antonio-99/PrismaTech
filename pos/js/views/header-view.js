// pos/js/views/header-view.js
// ============================================
class HeaderView {
    constructor() {
        this.container = document.getElementById('pos-header');
        this.searchInput = null;
    }
    
    render() {
        this.container.innerHTML = this.getTemplate();
        this.bindEvents();
    }
    
    getTemplate() {
        return `
            <div class="header-left">
                <div class="pos-logo">
                    <div class="logo-icon">PT</div>
                    <span class="logo-text">PrismaTech POS</span>
                </div>
            </div>
            
            <div class="header-center">
                <div class="search-container">
                    <i class="fas fa-search search-icon"></i>
                    <input type="text" 
                           id="product-search" 
                           class="search-input"
                           placeholder="Buscar productos por nombre, SKU o código..."
                           autocomplete="off">
                    <button class="search-clear hidden" id="search-clear">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            
            <div class="header-right">
                <button class="header-btn" id="cart-toggle-mobile" title="Ver carrito">
                    <i class="fas fa-shopping-cart"></i>
                    <span class="cart-badge" id="cart-badge">0</span>
                </button>
                
                <div class="user-info">
                    <div class="user-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="user-details">
                        <div class="user-name">Vendedor</div>
                        <div class="user-status online">En línea</div>
                    </div>
                </div>
                
                <div class="header-actions">
                    <button class="header-btn" id="settings-btn" title="Configuración">
                        <i class="fas fa-cog"></i>
                    </button>
                    
                    <button class="header-btn" id="logout-btn" title="Cerrar sesión">
                        <i class="fas fa-sign-out-alt"></i>
                    </button>
                </div>
            </div>
        `;
    }
    
    bindEvents() {
        this.searchInput = document.getElementById('product-search');
        const searchClear = document.getElementById('search-clear');
        const cartToggle = document.getElementById('cart-toggle-mobile');
        
        // Search functionality
        this.searchInput.addEventListener('input', (e) => {
            const term = e.target.value.trim();
            this.toggleSearchClear(term.length > 0);
            this.dispatchSearchEvent(term);
        });
        
        // Clear search
        searchClear.addEventListener('click', () => {
            this.clearSearch();
        });
        
        // Mobile cart toggle
        cartToggle.addEventListener('click', () => {
            this.dispatchEvent('pos:toggle-cart-mobile');
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Focus search with Ctrl+F or F3
            if ((e.ctrlKey && e.key === 'f') || e.key === 'F3') {
                e.preventDefault();
                this.focusSearch();
            }
            
            // Clear search with Escape
            if (e.key === 'Escape' && document.activeElement === this.searchInput) {
                this.clearSearch();
            }
        });
    }
    
    toggleSearchClear(show) {
        const clearBtn = document.getElementById('search-clear');
        if (show) {
            clearBtn.classList.remove('hidden');
        } else {
            clearBtn.classList.add('hidden');
        }
    }
    
    clearSearch() {
        this.searchInput.value = '';
        this.toggleSearchClear(false);
        this.dispatchSearchEvent('');
        this.searchInput.focus();
    }
    
    focusSearch() {
        this.searchInput.focus();
        this.searchInput.select();
    }
    
    updateCartBadge(count) {
        const badge = document.getElementById('cart-badge');
        badge.textContent = count;
        
        if (count > 0) {
            badge.classList.add('has-items');
        } else {
            badge.classList.remove('has-items');
        }
    }
    
    dispatchSearchEvent(term) {
        this.dispatchEvent('pos:search', { term });
    }
    
    dispatchEvent(type, detail = {}) {
        document.dispatchEvent(new CustomEvent(type, { detail }));
    }
}