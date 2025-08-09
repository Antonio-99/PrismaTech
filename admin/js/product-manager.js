// public/js/product-manager.js

/**
 * ProductManager - Gestión de productos en la página pública
 * Versión conectada a API PHP
 */
class ProductManager {
    constructor() {
        this.filteredProducts = [];
        this.whatsappNumber = '522323793951';
        this.isDataLoaded = false;
        
        // Escuchar cuando los datos estén listos
        document.addEventListener('dataLoaded', (event) => {
            this.onDataLoaded(event.detail);
        });
        
        // Si los datos ya están cargados
        if (window.dataStore && window.dataStore.isDataLoaded()) {
            this.onDataLoaded({
                categories: window.dataStore.getCategories(),
                products: window.dataStore.getProducts()
            });
        }
    }

    /**
     * Manejar cuando los datos estén cargados
     */
    onDataLoaded(data) {
        this.isDataLoaded = true;
        
        // Mostrar mensaje si se usaron datos de fallback
        if (data.fromFallback) {
            this.showConnectionWarning();
        }
        
        // Cargar la interfaz
        this.loadCategories();
        this.loadProducts();
        this.setupRealtimeSearch();
        
        console.log('✅ ProductManager: Datos cargados y interfaz inicializada');
    }

    /**
     * Mostrar advertencia de conexión
     */
    showConnectionWarning() {
        const warningDiv = document.createElement('div');
        warningDiv.style.cssText = `
            background: #f59e0b;
            color: white;
            padding: 10px;
            text-align: center;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 1000;
            font-size: 14px;
        `;
        warningDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            Mostrando datos de ejemplo. Verifica la conexión con la base de datos.
        `;
        document.body.appendChild(warningDiv);
        
        // Ocultar después de 5 segundos
        setTimeout(() => {
            warningDiv.remove();
        }, 5000);
    }

    /**
     * Carga las categorías en la interfaz
     */
    loadCategories() {
        const grid = document.getElementById('categories-grid');
        const categoryFilter = document.getElementById('category-filter');
        
        if (!window.dataStore) {
            console.error('DataStore no disponible');
            return;
        }
        
        const categories = window.dataStore.getCategories();
        
        if (!grid || !categoryFilter) {
            console.error('Elementos de interfaz no encontrados');
            return;
        }
        
        // Limpiar loading
        grid.innerHTML = '';
        
        // Renderizar tarjetas de categorías
        grid.innerHTML = categories.map(category => {
            const productCount = window.dataStore.getProductsByCategory(category.id).length;
            return `
                <div class="category-card" onclick="productManager.filterByCategory(${category.id})">
                    <div class="category-icon">
                        <i class="${category.icon}"></i>
                    </div>
                    <h3 class="category-name">${this.escapeHtml(category.name)}</h3>
                    <p class="category-description">${this.escapeHtml(category.description)}</p>
                    <small style="color: var(--gray-500); margin-top: 10px; display: block;">
                        ${productCount} producto${productCount !== 1 ? 's' : ''}
                    </small>
                </div>
            `;
        }).join('');

        // Poblar filtro de categorías
        categoryFilter.innerHTML = '<option value="">Todas las categorías</option>' +
            categories.map(cat => `<option value="${cat.id}">${this.escapeHtml(cat.name)}</option>`).join('');
    }

    /**
     * Carga los productos en la interfaz
     */
    loadProducts() {
        const brandFilter = document.getElementById('brand-filter');
        
        if (!window.dataStore || !brandFilter) return;
        
        const brands = window.dataStore.getUniqueBrands();
        
        // Poblar filtro de marcas
        brandFilter.innerHTML = '<option value="">Todas las marcas</option>' +
            brands.map(brand => `<option value="${this.escapeHtml(brand)}">${this.escapeHtml(brand)}</option>`).join('');
        
        // Obtener todos los productos
        this.filteredProducts = window.dataStore.getProducts();
        this.renderProducts();
    }

    /**
     * Renderiza los productos en la grilla
     */
    renderProducts() {
        const grid = document.getElementById('products-grid');
        
        if (!grid) return;
        
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
            const statusClass = product.in_stock !== false ? "product-status" : "product-status" + " out-of-stock";
            
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
                        ${category ? `<span class="product-category">${this.escapeHtml(category.name)}</span>` : ''}
                    </div>
                    <div class="${statusClass}">${statusText}</div>
                    <p class="product-description">${this.escapeHtml(product.description || 'Sin descripción disponible')}</p>
                    <div class="product-actions">
                        <a href="${this.getWhatsAppLink(product)}" 
                           class="btn btn-whatsapp" 
                           target="_blank"
                           title="Solicitar cotización vía WhatsApp">
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
            `${product.price ? `💰 *Precio de referencia:* $${product.price.toLocaleString('es-MX')}\n` : ''}` +
            `\n¿Podrían proporcionarme el precio actualizado y disponibilidad?\n` +
            `Gracias.`;
        
        return `https://wa.me/${this.whatsappNumber}?text=${encodeURIComponent(message)}`;
    }

    /**
     * Busca productos
     */
    searchProducts() {
        if (!window.dataStore) return;
        
        const searchTerm = document.getElementById('search-input')?.value || '';
        const categoryFilter = document.getElementById('category-filter')?.value || '';
        const brandFilter = document.getElementById('brand-filter')?.value || '';
        
        this.filteredProducts = window.dataStore.filterProducts(searchTerm, categoryFilter, brandFilter);
        this.renderProducts();
        
        // Actualizar URL sin recargar la página
        this.updateURL(searchTerm, categoryFilter, brandFilter);
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
        const categoryFilter = document.getElementById('category-filter');
        if (categoryFilter) {
            categoryFilter.value = categoryId;
        }
        this.filterProducts();
        
        // Scroll suave a la sección de productos
        const productsSection = document.querySelector('.products-section');
        if (productsSection) {
            productsSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    /**
     * Actualizar URL con parámetros de búsqueda
     */
    updateURL(search, category, brand) {
        const url = new URL(window.location);
        
        if (search) {
            url.searchParams.set('q', search);
        } else {
            url.searchParams.delete('q');
        }
        
        if (category) {
            url.searchParams.set('category', category);
        } else {
            url.searchParams.delete('category');
        }
        
        if (brand) {
            url.searchParams.set('brand', brand);
        } else {
            url.searchParams.delete('brand');
        }
        
        // Actualizar URL sin recargar
        window.history.replaceState({}, '', url);
    }

    /**
     * Cargar filtros desde URL
     */
    loadFiltersFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        
        const search = urlParams.get('q');
        const category = urlParams.get('category');
        const brand = urlParams.get('brand');
        
        if (search) {
            const searchInput = document.getElementById('search-input');
            if (searchInput) searchInput.value = search;
        }
        
        if (category) {
            const categoryFilter = document.getElementById('category-filter');
            if (categoryFilter) categoryFilter.value = category;
        }
        
        if (brand) {
            const brandFilter = document.getElementById('brand-filter');
            if (brandFilter) brandFilter.value = brand;
        }
        
        // Aplicar filtros si hay alguno
        if (search || category || brand) {
            this.searchProducts();
        }
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
        if (!searchInput) return;
        
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
        
        // Cargar filtros desde URL al inicializar
        this.loadFiltersFromURL();
    }

    /**
     * Refrescar datos desde la API
     */
    async refresh() {
        if (window.dataStore) {
            try {
                await window.dataStore.refresh();
                this.loadCategories();
                this.loadProducts();
            } catch (error) {
                console.error('Error al refrescar datos:', error);
            }
        }
    }

    /**
     * Mostrar estadísticas de productos
     */
    showStats() {
        if (!window.dataStore) return;
        
        const stats = window.dataStore.getStats();
        console.log('📊 Estadísticas de productos:', stats);
        return stats;
    }

    /**
     * Buscar producto por SKU
     */
    findBySKU(sku) {
        if (!window.dataStore) return null;
        
        const products = window.dataStore.getProducts();
        return products.find(p => p.sku.toLowerCase() === sku.toLowerCase());
    }

    /**
     * Obtener productos relacionados por categoría
     */
    getRelatedProducts(productId, limit = 4) {
        if (!window.dataStore) return [];
        
        const product = window.dataStore.getProductById(productId);
        if (!product) return [];
        
        const relatedProducts = window.dataStore.getProductsByCategory(product.category_id)
            .filter(p => p.id !== productId)
            .slice(0, limit);
        
        return relatedProducts;
    }
}

// Crear instancia global
window.productManager = new ProductManager();