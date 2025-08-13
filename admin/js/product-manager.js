/**
 * ProductManager - Gestión de productos en la página pública
 * Conectado a DataStore que usa APIs PHP
 */
class ProductManager {
    constructor() {
        this.filteredProducts = [];
        this.whatsappNumber = '5212381234567';
        this.isDataLoaded = false;
        
        // Escuchar cuando los datos estén listos
        document.addEventListener('dataLoaded', (event) => {
            this.onDataLoaded(event.detail);
        });
        
        // Si los datos ya están cargados
        if (window.dataStore && window.dataStore.isDataLoaded()) {
            this.onDataLoaded({
                categories: window.dataStore.getCategories(),
                products: window.dataStore.getProducts(),
                fromAPI: true
            });
        }
    }

    /**
     * Manejar cuando los datos estén cargados
     */
    onDataLoaded(data) {
        this.isDataLoaded = true;
        
        console.log('📦 ProductManager: Datos recibidos', {
            categories: data.categories.length,
            products: data.products.length,
            fromAPI: data.fromAPI
        });
        
        // Mostrar mensaje si se usaron datos de fallback
        if (data.fromFallback) {
            this.showConnectionWarning();
        }
        
        // Cargar la interfaz
        this.loadCategories();
        this.loadProducts();
        this.setupRealtimeSearch();
        
        console.log('✅ ProductManager: Interfaz inicializada');
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
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;
        warningDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            Mostrando datos de ejemplo. Verifica la conexión con la base de datos.
            <button onclick="this.parentElement.remove()" style="background:none;border:none;color:white;margin-left:10px;cursor:pointer;">✕</button>
        `;
        document.body.appendChild(warningDiv);
        
        // Ocultar después de 8 segundos
        setTimeout(() => {
            if (warningDiv.parentElement) {
                warningDiv.remove();
            }
        }, 8000);
    }

    /**
     * Carga las categorías en la interfaz
     */
    loadCategories() {
        const grid = document.getElementById('categories-grid');
        const categoryFilter = document.getElementById('category-filter');
        
        if (!window.dataStore) {
            console.error('❌ DataStore no disponible');
            this.showErrorState(grid, 'Error: Sistema de datos no disponible');
            return;
        }
        
        const categories = window.dataStore.getCategories();
        
        if (!grid || !categoryFilter) {
            console.error('❌ Elementos de interfaz no encontrados');
            return;
        }
        
        if (categories.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-tags"></i>
                    <h3>No hay categorías disponibles</h3>
                    <p>Las categorías se cargarán próximamente</p>
                </div>
            `;
            return;
        }
        
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
        
        console.log('✅ Categorías cargadas:', categories.length);
    }

    /**
     * Carga los productos en la interfaz
     */
    loadProducts() {
        const brandFilter = document.getElementById('brand-filter');
        
        if (!window.dataStore || !brandFilter) {
            console.error('❌ DataStore o filtro de marcas no disponible');
            return;
        }
        
        const brands = window.dataStore.getUniqueBrands();
        
        // Poblar filtro de marcas
        brandFilter.innerHTML = '<option value="">Todas las marcas</option>' +
            brands.map(brand => `<option value="${this.escapeHtml(brand)}">${this.escapeHtml(brand)}</option>`).join('');
        
        // Obtener todos los productos
        this.filteredProducts = window.dataStore.getProducts();
        this.renderProducts();
        
        console.log('✅ Productos cargados:', this.filteredProducts.length);
    }

    /**
     * Renderiza los productos en la grilla
     */
    renderProducts() {
        const grid = document.getElementById('products-grid');
        
        if (!grid) {
            console.error('❌ Grid de productos no encontrado');
            return;
        }
        
        if (this.filteredProducts.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>No se encontraron productos</h3>
                    <p>Intenta cambiar los filtros de búsqueda o verifica la conexión</p>
                    <button class="btn btn-whatsapp" onclick="productManager.refresh()" style="margin-top: 1rem;">
                        <i class="fas fa-redo"></i> Actualizar datos
                    </button>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = this.filteredProducts.map(product => {
            const category = window.dataStore.getCategoryById(product.category_id);
            const statusText = product.in_stock !== false ? "Disponible para cotización" : "Consultar disponibilidad";
            const statusClass = product.in_stock !== false ? "product-status" : "product-status out-of-stock";
            const priceDisplay = product.price ? `$${product.price.toLocaleString('es-MX')}` : 'Precio a consultar';
            
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
                    ${product.price ? `<div class="product-price">${priceDisplay}</div>` : ''}
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
        
        console.log('✅ Productos renderizados:', this.filteredProducts.length);
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
            `\n¿Podrían proporcionarme el precio actualizado y disponibilidad?\n\n` +
            `Gracias.`;
        
        return `https://wa.me/${this.whatsappNumber}?text=${encodeURIComponent(message)}`;
    }

    /**
     * Busca productos
     */
    searchProducts() {
        if (!window.dataStore) {
            console.error('❌ DataStore no disponible para búsqueda');
            return;
        }
        
        const searchTerm = document.getElementById('search-input')?.value || '';
        const categoryFilter = document.getElementById('category-filter')?.value || '';
        const brandFilter = document.getElementById('brand-filter')?.value || '';
        
        console.log('🔍 Buscando:', { searchTerm, categoryFilter, brandFilter });
        
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
        
        console.log('📁 Filtrando por categoría:', categoryId);
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
        return text ? text.toString().replace(/[&<>"']/g, m => map[m]) : '';
    }

    /**
     * Configura búsqueda en tiempo real
     */
    setupRealtimeSearch() {
        const searchInput = document.getElementById('search-input');
        if (!searchInput) {
            console.warn('⚠️ Campo de búsqueda no encontrado');
            return;
        }
        
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
        
        // Configurar filtros
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
        
        console.log('✅ Búsqueda en tiempo real configurada');
    }

    /**
     * Mostrar estado de error
     */
    showErrorState(element, message) {
        if (element) {
            element.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error</h3>
                    <p>${message}</p>
                    <button class="btn btn-whatsapp" onclick="location.reload()">
                        <i class="fas fa-redo"></i> Recargar página
                    </button>
                </div>
            `;
        }
    }

    /**
     * Refrescar datos desde la API
     */
    async refresh() {
        if (window.dataStore) {
            try {
                console.log('🔄 Refrescando datos...');
                await window.dataStore.refresh();
                
                // Los datos se recargarán automáticamente cuando se dispare el evento
                this.showTemporaryMessage('Datos actualizados', 'success');
                
            } catch (error) {
                console.error('❌ Error al refrescar datos:', error);
                this.showTemporaryMessage('Error al actualizar datos', 'error');
            }
        }
    }

    /**
     * Mostrar mensaje temporal
     */
    showTemporaryMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            z-index: 1000;
            font-size: 14px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            animation: slideIn 0.3s ease;
        `;
        messageDiv.textContent = message;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }

    /**
     * Mostrar estadísticas de productos
     */
    showStats() {
        if (!window.dataStore) return null;
        
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