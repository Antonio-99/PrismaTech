/**
 * ProductManager - Gestión de productos en la página pública
 * Versión actualizada compatible con DataStore con APIs
 */
class ProductManager {
    constructor() {
        this.filteredProducts = [];
        this.whatsappNumber = '5212381234567';
        this.isDataLoaded = false;
        this.searchTimeout = null;
        
        // Configurar event listeners del DataStore
        this.setupDataStoreListeners();
        
        // Escuchar cuando el DataStore esté listo
        document.addEventListener('dataLoaded', (event) => {
            this.onDataLoaded(event.detail);
        });
        
        // Si el DataStore ya está inicializado
        if (window.dataStore && window.dataStore.isDataLoaded()) {
            setTimeout(() => {
                this.onDataLoaded({
                    categories: window.dataStore.getCategories(),
                    products: window.dataStore.getProducts(),
                    fromFallback: !window.dataStore.isOnline
                });
            }, 100);
        }
    }

    /**
     * Configurar listeners del DataStore
     */
    setupDataStoreListeners() {
        // Escuchar eventos del DataStore usando el nuevo sistema
        if (window.dataStore) {
            window.dataStore.on('dataRefreshed', () => {
                console.log('🔄 Datos refrescados, actualizando interfaz');
                this.loadCategories();
                this.loadProducts();
            });

            window.dataStore.on('productCreated', (product) => {
                console.log('✅ Producto creado:', product.name);
                this.loadProducts();
            });

            window.dataStore.on('productUpdated', (product) => {
                console.log('✏️ Producto actualizado:', product.name);
                this.loadProducts();
            });

            window.dataStore.on('productDeleted', (productId) => {
                console.log('🗑️ Producto eliminado:', productId);
                this.loadProducts();
            });
        }
    }

    /**
     * Manejar cuando los datos estén cargados
     */
    onDataLoaded(data) {
        this.isDataLoaded = true;
        
        // Mostrar información de conexión
        this.showConnectionStatus(data);
        
        // Cargar la interfaz
        this.loadCategories();
        this.loadProducts();
        this.setupRealtimeSearch();
        this.setupConnectionMonitoring();
        
        console.log('✅ ProductManager: Interfaz inicializada', {
            categories: data.categories?.length || 0,
            products: data.products?.length || 0,
            fromFallback: data.fromFallback
        });
    }

    /**
     * Mostrar estado de conexión
     */
    showConnectionStatus(data) {
        if (data.fromFallback) {
            this.showConnectionWarning(data.error);
        } else {
            this.showConnectionSuccess();
        }
    }

    /**
     * Mostrar advertencia de conexión
     */
    showConnectionWarning(error = null) {
        const warningDiv = document.createElement('div');
        warningDiv.id = 'connection-warning';
        warningDiv.style.cssText = `
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            color: white;
            padding: 12px 20px;
            text-align: center;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 1000;
            font-size: 14px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;
        
        warningDiv.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                <i class="fas fa-exclamation-triangle"></i>
                <span>Mostrando datos de ejemplo. Conectando a la base de datos...</span>
                <button onclick="this.parentElement.parentElement.style.display='none'" 
                        style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 4px 8px; border-radius: 4px; cursor: pointer;">
                    ✕
                </button>
            </div>
            ${error ? `<div style="font-size: 12px; margin-top: 5px; opacity: 0.9;">Error: ${error}</div>` : ''}
        `;
        
        // Remover advertencia anterior si existe
        const existing = document.getElementById('connection-warning');
        if (existing) existing.remove();
        
        document.body.appendChild(warningDiv);
        
        // Auto-ocultar después de 10 segundos
        setTimeout(() => {
            if (warningDiv.parentNode) {
                warningDiv.style.transform = 'translateY(-100%)';
                setTimeout(() => warningDiv.remove(), 300);
            }
        }, 10000);
    }

    /**
     * Mostrar mensaje de conexión exitosa
     */
    showConnectionSuccess() {
        const successDiv = document.createElement('div');
        successDiv.style.cssText = `
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 8px 20px;
            text-align: center;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 1000;
            font-size: 14px;
            transform: translateY(-100%);
            transition: transform 0.3s ease;
        `;
        
        successDiv.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                <i class="fas fa-check-circle"></i>
                <span>Conectado a la base de datos</span>
            </div>
        `;
        
        document.body.appendChild(successDiv);
        
        // Mostrar y luego ocultar
        setTimeout(() => successDiv.style.transform = 'translateY(0)', 100);
        setTimeout(() => {
            successDiv.style.transform = 'translateY(-100%)';
            setTimeout(() => successDiv.remove(), 300);
        }, 3000);
    }

    /**
     * Configurar monitoreo de conexión
     */
    setupConnectionMonitoring() {
        // Verificar conexión cada 30 segundos
        setInterval(async () => {
            if (window.dataStore) {
                const wasOnline = window.dataStore.isOnline;
                await window.dataStore.checkConnectivity();
                
                // Si cambió el estado de conexión
                if (wasOnline !== window.dataStore.isOnline) {
                    if (window.dataStore.isOnline) {
                        console.log('🟢 Conexión restaurada');
                        this.showConnectionSuccess();
                        // Refrescar datos
                        await window.dataStore.refresh();
                    } else {
                        console.log('🔴 Conexión perdida');
                        this.showConnectionWarning('Conexión perdida - usando datos en cache');
                    }
                }
            }
        }, 30000);
    }

    /**
     * Carga las categorías en la interfaz
     */
    loadCategories() {
        const grid = document.getElementById('categories-grid');
        const categoryFilter = document.getElementById('category-filter');
        
        if (!window.dataStore || !grid || !categoryFilter) {
            console.error('Elementos de interfaz no encontrados');
            return;
        }
        
        const categories = window.dataStore.getCategories();
        
        // Limpiar loading
        grid.innerHTML = '';
        
        if (categories.length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <i class="fas fa-folder-open"></i>
                    <h3>No hay categorías disponibles</h3>
                    <p>Las categorías se cargarán cuando se establezca la conexión</p>
                </div>
            `;
            return;
        }
        
        // Renderizar tarjetas de categorías
        grid.innerHTML = categories.map(category => {
            const productCount = window.dataStore.getProductsByCategory(category.id).length;
            return `
                <div class="category-card" onclick="productManager.filterByCategory(${category.id})" role="button" tabindex="0">
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
        
        // Actualizar estadísticas en consola
        if (this.filteredProducts.length > 0) {
            console.log('📊 Estadísticas de productos:', window.dataStore.getStats());
        }
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
                    <p>Intenta cambiar los filtros de búsqueda o verifica la conexión</p>
                    ${!window.dataStore?.isOnline ? `
                        <button class="btn btn-primary" onclick="productManager.refresh()" style="margin-top: 1rem;">
                            <i class="fas fa-sync"></i> Reintentar conexión
                        </button>
                    ` : ''}
                </div>
            `;
            return;
        }
        
        grid.innerHTML = this.filteredProducts.map(product => {
            const category = window.dataStore.getCategoryById(product.category_id);
            const statusText = product.in_stock !== false ? "Disponible para cotización" : "Consultar disponibilidad";
            const statusClass = product.in_stock !== false ? "product-status" : "product-status out-of-stock";
            
            // Información de stock si está disponible
            const stockInfo = product.stock !== undefined ? 
                `<span class="product-stock" style="font-size: 0.75rem; color: var(--gray-500);">
                    Stock: ${product.stock} unidades
                </span>` : '';
            
            return `
                <div class="product-card" data-product-id="${product.id}">
                    <div class="product-image">
                        <i class="${product.icon || 'fas fa-cube'}"></i>
                    </div>
                    <h3 class="product-title">${this.escapeHtml(product.name)}</h3>
                    <div class="product-meta">
                        ${product.brand ? `<span class="product-brand">${this.escapeHtml(product.brand)}</span>` : ''}
                        <span class="product-sku">SKU: ${this.escapeHtml(product.sku)}</span>
                        ${product.part_number ? `<span class="product-part-number">P/N: ${this.escapeHtml(product.part_number)}</span>` : ''}
                        ${category ? `<span class="product-category">${this.escapeHtml(category.name)}</span>` : ''}
                        ${stockInfo}
                    </div>
                    ${product.price ? `
                        <div class="product-price" style="font-size: 1.1rem; font-weight: 600; color: var(--primary-blue); margin: 0.5rem 0;">
                            $${product.price.toLocaleString('es-MX')} MXN
                        </div>
                    ` : ''}
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
            `${product.price ? `💰 *Precio de referencia:* $${product.price.toLocaleString('es-MX')} MXN\n` : ''}` +
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
        
        // Analytics simple
        if (searchTerm) {
            console.log(`🔍 Búsqueda: "${searchTerm}" - ${this.filteredProducts.length} resultados`);
        }
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
        
        // Log de analytics
        const category = window.dataStore.getCategoryById(categoryId);
        console.log(`📂 Filtro por categoría: ${category?.name} (${this.filteredProducts.length} productos)`);
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
        
        // Búsqueda con debounce
        searchInput.addEventListener('input', () => {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.searchProducts();
            }, 300);
        });
        
        // Búsqueda inmediata con Enter
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                clearTimeout(this.searchTimeout);
                this.searchProducts();
            }
        });
        
        // Agregar listeners a los filtros
        const categoryFilter = document.getElementById('category-filter');
        const brandFilter = document.getElementById('brand-filter');
        
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => this.filterProducts());
        }
        
        if (brandFilter) {
            brandFilter.addEventListener('change', () => this.filterProducts());
        }
        
        // Cargar filtros desde URL al inicializar
        this.loadFiltersFromURL();
    }

    /**
     * Refrescar datos desde la API
     */
    async refresh() {
        if (window.dataStore) {
            try {
                const loadingDiv = document.createElement('div');
                loadingDiv.innerHTML = `
                    <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                                background: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); 
                                z-index: 2000; text-align: center;">
                        <div class="loading-spinner" style="width: 30px; height: 30px; margin: 0 auto 10px;"></div>
                        <div>Conectando...</div>
                    </div>
                `;
                document.body.appendChild(loadingDiv);
                
                await window.dataStore.refresh();
                
                loadingDiv.remove();
                
                // Recargar interfaz
                this.loadCategories();
                this.loadProducts();
                
                console.log('✅ Datos refrescados exitosamente');
            } catch (error) {
                console.error('Error al refrescar datos:', error);
                this.showConnectionWarning('Error al conectar con el servidor');
            }
        }
    }

    /**
     * Mostrar estadísticas de productos
     */
    showStats() {
        if (!window.dataStore) return null;
        
        const stats = window.dataStore.getStats();
        console.table(stats);
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

    /**
     * Obtener productos con stock bajo
     */
    getLowStockProducts() {
        if (!window.dataStore) return [];
        return window.dataStore.getLowStockProducts();
    }

    /**
     * Configurar accesibilidad para teclado
     */
    setupKeyboardNavigation() {
        // Navegación con teclado para las tarjetas de categorías
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                const focused = document.activeElement;
                if (focused.classList.contains('category-card')) {
                    e.preventDefault();
                    focused.click();
                }
            }
        });
    }

    /**
     * Obtener estado de conexión
     */
    getConnectionStatus() {
        return window.dataStore ? window.dataStore.getConnectionStatus() : { isOnline: false };
    }
}

// Crear instancia global
window.productManager = new ProductManager();