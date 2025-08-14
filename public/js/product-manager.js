// public/js/product-manager.js

/**
 * ProductManager - Gestión de productos en la página pública
 */
class ProductManager {
    constructor() {
        this.filteredProducts = [];
        this.whatsappNumber = '5212381234567';
    }

    /**
     * Carga las categorías en la interfaz
     */
    loadCategories() {
        const grid = document.getElementById('categories-grid');
        const categoryFilter = document.getElementById('category-filter');
        const categories = window.dataStore.getCategories();
        
        // Renderizar tarjetas de categorías
        grid.innerHTML = categories.map(category => `
            <div class="category-card" onclick="productManager.filterByCategory(${category.id})">
                <div class="category-icon">
                    <i class="${category.icon}"></i>
                </div>
                <h3 class="category-name">${category.name}</h3>
                <p class="category-description">${category.description}</p>
            </div>
        `).join('');

        // Poblar filtro de categorías
        categoryFilter.innerHTML = '<option value="">Todas las categorías</option>' +
            categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
    }

    /**
     * Carga los productos en la interfaz
     */
    loadProducts() {
        const brandFilter = document.getElementById('brand-filter');
        const brands = window.dataStore.getUniqueBrands();
        
        // Poblar filtro de marcas
        brandFilter.innerHTML = '<option value="">Todas las marcas</option>' +
            brands.map(brand => `<option value="${brand}">${brand}</option>`).join('');
        
        // Obtener todos los productos
        this.filteredProducts = window.dataStore.getProducts();
        this.renderProducts();
    }

    /**
     * Renderiza los productos en la grilla
     */
    renderProducts() {
        const grid = document.getElementById('products-grid');
        
        if (this.filteredProducts.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>No se encontraron productos</h3>
                    <p>Intenta cambiar los filtros de búsqueda</p>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = this.filteredProducts.map(product => {
            const category = window.dataStore.getCategoryById(product.category_id);
            const statusText = product.in_stock !== false ? "Disponible para cotización" : "Consultar disponibilidad";
            
            return `
                <div class="product-card">
                    <div class="product-image">
                        <i class="${product.icon || 'fas fa-cube'}"></i>
                    </div>
                    <h3 class="product-title">${this.escapeHtml(product.name)}</h3>
                    <div class="product-meta">
                        ${product.brand ? `<span class="product-brand">${this.escapeHtml(product.brand)}</span>` : ''}
                        <span class="product-sku">SKU: ${this.escapeHtml(product.sku)}</span>
                        ${product.part_number ? `<span class="product-part-number">P/N: ${this.escapeHtml(product.part_number)}</span>` : ''}
                    </div>
                    <div class="product-status">${statusText}</div>
                    <p class="product-description">${this.escapeHtml(product.description || 'Sin descripción disponible')}</p>
                    <div class="product-actions">
                        <a href="${this.getWhatsAppLink(product)}" 
                           class="btn btn-whatsapp" 
                           target="_blank">
                            <i class="fab fa-whatsapp"></i> Solicitar Cotización
                        </a>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Genera el enlace de WhatsApp para un producto
     */
    getWhatsAppLink(product) {
        const message = `Hola, me interesa solicitar una cotización para:\n\n` +
            `📦 *Producto:* ${product.name}\n` +
            `🔢 *SKU:* ${product.sku}\n` +
            `${product.part_number ? `📋 *Número de Parte:* ${product.part_number}\n` : ''}` +
            `${product.brand ? `🏷️ *Marca:* ${product.brand}\n` : ''}` +
            `\n¿Podrían proporcionarme el precio y disponibilidad?\n` +
            `Gracias.`;
        
        return `https://wa.me/${this.whatsappNumber}?text=${encodeURIComponent(message)}`;
    }

    /**
     * Busca productos
     */
    searchProducts() {
        const searchTerm = document.getElementById('search-input').value;
        const categoryFilter = document.getElementById('category-filter').value;
        const brandFilter = document.getElementById('brand-filter').value;
        
        this.filteredProducts = window.dataStore.filterProducts(searchTerm, categoryFilter, brandFilter);
        this.renderProducts();
    }

    /**
     * Filtra productos por categoría, marca, etc.
     */
    filterProducts() {
        this.searchProducts();
    }

    /**
     * Filtra por categoría específica
     */
    filterByCategory(categoryId) {
        document.getElementById('category-filter').value = categoryId;
        this.filterProducts();
        document.querySelector('.products-section').scrollIntoView({ behavior: 'smooth' });
    }

    /**
     * Escapa HTML para prevenir XSS
     */
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text ? text.replace(/[&<>"']/g, m => map[m]) : '';
    }

    /**
     * Configura búsqueda en tiempo real
     */
    setupRealtimeSearch() {
        const searchInput = document.getElementById('search-input');
        let searchTimeout;
        
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.searchProducts();
            }, 300);
        });
        
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                clearTimeout(searchTimeout);
                this.searchProducts();
            }
        });
    }
}

// Crear instancia global
window.productManager = new ProductManager();