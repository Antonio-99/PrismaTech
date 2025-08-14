/**
 * ProductManager - Gestión de productos conectado directamente a APIs PHP
 */
class ProductManager {
    constructor() {
        this.baseUrl = '../backend';
        this.categories = [];
        this.products = [];
        this.filteredProducts = [];
        this.whatsappNumber = '5212381234567';
        this.isDataLoaded = false;
        this.searchTimeout = null;
        
        // Cargar datos al inicializar
        this.loadAllData();
    }

    /**
     * Cargar todos los datos desde las APIs
     */
    async loadAllData() {
        try {
            console.log('🔄 Cargando datos desde APIs...');
            
            // Cargar en paralelo
            await Promise.all([
                this.loadCategoriesFromAPI(),
                this.loadProductsFromAPI()
            ]);

            this.isDataLoaded = true;
            
            // Cargar la interfaz
            this.loadCategories();
            this.loadProducts();
            this.setupRealtimeSearch();
            
            console.log('✅ ProductManager: Datos cargados', {
                categories: this.categories.length,
                products: this.products.length
            });
            
        } catch (error) {
            console.error('❌ Error cargando datos:', error);
            this.showConnectionWarning('Error al conectar con la base de datos');
            this.loadFallbackData();
        }
    }

    /**
     * Cargar categorías desde API
     */
    async loadCategoriesFromAPI() {
        try {
            const response = await fetch(`${this.baseUrl}/categorias.php`);
            if (!response.ok) throw new Error('Error en API categorías');
            
            const data = await response.json();
            
            // Transformar datos de la API al formato esperado
            this.categories = data.map(cat => ({
                id: cat.id,
                name: cat.nombre,
                description: cat.descripcion || '',
                icon: this.getCategoryIcon(cat.nombre)
            }));
            
            console.log('✅ Categorías cargadas desde API:', this.categories.length);
        } catch (error) {
            console.error('Error cargando categorías:', error);
            throw error;
        }
    }

    /**
     * Cargar productos desde API
     */
    async loadProductsFromAPI() {
        try {
            const response = await fetch(`${this.baseUrl}/productos.php`);
            if (!response.ok) throw new Error('Error en API productos');
            
            const data = await response.json();
            
            // Transformar datos de la API al formato esperado
            this.products = data.map(prod => ({
                id: prod.id,
                name: prod.nombre,
                description: prod.descripcion || '',
                brand: this.extractBrand(prod.nombre),
                sku: prod.sku,
                part_number: this.extractPartNumber(prod.descripcion),
                category_id: prod.categoria_id,
                price: parseFloat(prod.precio),
                stock: parseInt(prod.stock) || 0,
                icon: this.getProductIcon(prod.categoria_id),
                in_stock: (prod.stock > 0),
                estado: prod.estado
            }));
            
            console.log('✅ Productos cargados desde API:', this.products.length);
        } catch (error) {
            console.error('Error cargando productos:', error);
            throw error;
        }
    }

    /**
     * Cargar datos de fallback si la API falla
     */
    loadFallbackData() {
        console.log('📦 Cargando datos de fallback...');
        
        this.categories = [
            { id: 1, name: "Pantallas", description: "Displays LCD, LED, OLED", icon: "fas fa-tv" },
            { id: 2, name: "Teclados", description: "Teclados de reemplazo", icon: "fas fa-keyboard" },
            { id: 3, name: "Baterías", description: "Baterías para laptops", icon: "fas fa-battery-three-quarters" },
            { id: 4, name: "Cargadores", description: "Adaptadores de corriente", icon: "fas fa-plug" },
            { id: 5, name: "Memorias", description: "RAM DDR3, DDR4, DDR5", icon: "fas fa-memory" },
            { id: 6, name: "Almacenamiento", description: "SSD, HDD, M.2 NVMe", icon: "fas fa-hdd" }
        ];

        this.products = [
            {
                id: 1,
                name: "Display LCD 15.6\" HP Pavilion",
                description: "Pantalla LCD de 15.6 pulgadas con resolución HD (1366x768) compatible con laptops HP Pavilion.",
                brand: "HP Compatible",
                sku: "LCD-HP-156-001",
                part_number: "HP-156-LCD-001",
                category_id: 1,
                price: 1250.00,
                stock: 8,
                icon: "fas fa-tv",
                in_stock: true
            },
            {
                id: 2,
                name: "Teclado Lenovo ThinkPad T440",
                description: "Teclado de reemplazo para ThinkPad T440/T450 con distribución en español y retroiluminación.",
                brand: "Lenovo",
                sku: "KBD-LEN-T440-ES",
                part_number: "LEN-T440-KB-ES",
                category_id: 2,
                price: 850.00,
                stock: 12,
                icon: "fas fa-keyboard",
                in_stock: true
            }
        ];

        this.isDataLoaded = true;
        this.loadCategories();
        this.loadProducts();
        this.setupRealtimeSearch();
    }

    /**
     * Mostrar advertencia de conexión
     */
    showConnectionWarning(message = 'Conexión con la base de datos no disponible') {
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
                <span>${message} - Mostrando datos de ejemplo</span>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 4px 8px; border-radius: 4px; cursor: pointer;">
                    ✕
                </button>
            </div>
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
     * Determinar icono de categoría
     */
    getCategoryIcon(categoryName) {
        const iconMap = {
            'pantallas': 'fas fa-tv',
            'teclados': 'fas fa-keyboard',
            'baterías': 'fas fa-battery-three-quarters',
            'cargadores': 'fas fa-plug',
            'memorias': 'fas fa-memory',
            'almacenamiento': 'fas fa-hdd',
            'componentes': 'fas fa-microchip',
            'periféricos': 'fas fa-mouse'
        };
        
        const key = categoryName.toLowerCase();
        return iconMap[key] || 'fas fa-cube';
    }

    /**
     * Determinar icono de producto basado en categoría
     */
    getProductIcon(categoryId) {
        const iconMap = {
            1: 'fas fa-tv',        // Pantallas
            2: 'fas fa-keyboard',  // Teclados
            3: 'fas fa-battery-three-quarters', // Baterías
            4: 'fas fa-plug',      // Cargadores
            5: 'fas fa-memory',    // Memorias
            6: 'fas fa-hdd',       // Almacenamiento
            7: 'fas fa-microchip', // Componentes
            8: 'fas fa-mouse'      // Periféricos
        };
        
        return iconMap[categoryId] || 'fas fa-cube';
    }

    /**
     * Extraer marca del nombre del producto
     */
    extractBrand(productName) {
        const brands = ['HP', 'Lenovo', 'Dell', 'Acer', 'ASUS', 'Toshiba', 'Samsung', 'Kingston', 'Western Digital', 'Seagate', 'Corsair', 'Crucial'];
        for (let brand of brands) {
            if (productName.toLowerCase().includes(brand.toLowerCase())) {
                return brand;
            }
        }
        return 'Compatible';
    }

    /**
     * Extraer número de parte de la descripción
     */
    extractPartNumber(description) {
        if (!description) return null;
        
        // Buscar patrones comunes de números de parte
        const patterns = [
            /P\/N:\s*([A-Z0-9\-]+)/i,
            /Part\s*Number:\s*([A-Z0-9\-]+)/i,
            /PN:\s*([A-Z0-9\-]+)/i,
            /Número\s*de\s*parte:\s*([A-Z0-9\-]+)/i
        ];
        
        for (let pattern of patterns) {
            const match = description.match(pattern);
            if (match) {
                return match[1];
            }
        }
        
        return null;
    }

    /**
     * Carga las categorías en la interfaz
     */
    loadCategories() {
        const grid = document.getElementById('categories-grid');
        const categoryFilter = document.getElementById('category-filter');
        
        if (!grid || !categoryFilter) {
            console.error('Elementos de interfaz no encontrados');
            return;
        }
        
        // Limpiar loading
        grid.innerHTML = '';
        
        if (this.categories.length === 0) {
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
        grid.innerHTML = this.categories.map(category => {
            const productCount = this.getProductsByCategory(category.id).length;
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
            this.categories.map(cat => `<option value="${cat.id}">${this.escapeHtml(cat.name)}</option>`).join('');
    }

    /**
     * Carga los productos en la interfaz
     */
    loadProducts() {
        const brandFilter = document.getElementById('brand-filter');
        
        if (!brandFilter) return;
        
        const brands = this.getUniqueBrands();
        
        // Poblar filtro de marcas
        brandFilter.innerHTML = '<option value="">Todas las marcas</option>' +
            brands.map(brand => `<option value="${this.escapeHtml(brand)}">${this.escapeHtml(brand)}</option>`).join('');
        
        // Obtener todos los productos
        this.filteredProducts = [...this.products];
        this.renderProducts();
        
        // Mostrar estadísticas en consola
        if (this.filteredProducts.length > 0) {
            console.log('📊 Estadísticas de productos:', this.getStats());
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
                    <button class="btn btn-primary" onclick="productManager.refresh()" style="margin-top: 1rem;">
                        <i class="fas fa-sync"></i> Intentar de nuevo
                    </button>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = this.filteredProducts.map(product => {
            const category = this.getCategoryById(product.category_id);
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
        const searchTerm = document.getElementById('search-input')?.value || '';
        const categoryFilter = document.getElementById('category-filter')?.value || '';
        const brandFilter = document.getElementById('brand-filter')?.value || '';
        
        this.filteredProducts = this.filterProducts(searchTerm, categoryFilter, brandFilter);
        this.renderProducts();
        
        // Actualizar URL sin recargar la página
        this.updateURL(searchTerm, categoryFilter, brandFilter);
        
        // Analytics simple
        if (searchTerm) {
            console.log(`🔍 Búsqueda: "${searchTerm}" - ${this.filteredProducts.length} resultados`);
        }
    }

    /**
     * Filtra productos
     */
    filterProducts(searchTerm = '', categoryId = '', brand = '') {
        return this.products.filter(product => {
            const matchesSearch = !searchTerm || 
                product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (product.part_number && product.part_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
                product.brand.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesCategory = !categoryId || product.category_id === parseInt(categoryId);
            const matchesBrand = !brand || product.brand === brand;
            
            return matchesSearch && matchesCategory && matchesBrand;
        });
    }

    /**
     * Filtra por categoría específica
     */
    filterByCategory(categoryId) {
        const categoryFilter = document.getElementById('category-filter');
        if (categoryFilter) {
            categoryFilter.value = categoryId;
        }
        this.searchProducts();
        
        // Scroll suave a la sección de productos
        const productsSection = document.querySelector('.products-section');
        if (productsSection) {
            productsSection.scrollIntoView({ behavior: 'smooth' });
        }
        
        // Log de analytics
        const category = this.getCategoryById(categoryId);
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
            categoryFilter.addEventListener('change', () => this.searchProducts());
        }
        
        if (brandFilter) {
            brandFilter.addEventListener('change', () => this.searchProducts());
        }
        
        // Cargar filtros desde URL al inicializar
        this.loadFiltersFromURL();
    }

    /**
     * Refrescar datos desde la API
     */
    async refresh() {
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
            
            await this.loadAllData();
            
            loadingDiv.remove();
            
            console.log('✅ Datos refrescados exitosamente');
        } catch (error) {
            console.error('Error al refrescar datos:', error);
            this.showConnectionWarning('Error al conectar con el servidor');
        }
    }

    // ===========================================
    // MÉTODOS DE UTILIDAD
    // ===========================================

    /**
     * Obtiene todas las categorías
     */
    getCategories() {
        return this.categories;
    }

    /**
     * Obtiene todos los productos
     */
    getProducts() {
        return this.products;
    }

    /**
     * Obtiene una categoría por ID
     */
    getCategoryById(id) {
        return this.categories.find(cat => cat.id === parseInt(id));
    }

    /**
     * Obtiene un producto por ID
     */
    getProductById(id) {
        return this.products.find(prod => prod.id === parseInt(id));
    }

    /**
     * Obtiene productos por categoría
     */
    getProductsByCategory(categoryId) {
        return this.products.filter(prod => prod.category_id === parseInt(categoryId));
    }

    /**
     * Obtiene marcas únicas
     */
    getUniqueBrands() {
        return [...new Set(this.products.map(p => p.brand).filter(b => b))];
    }

    /**
     * Mostrar estadísticas de productos
     */
    getStats() {
        return {
            totalCategories: this.categories.length,
            totalProducts: this.products.length,
            totalBrands: this.getUniqueBrands().length,
            productsInStock: this.products.filter(p => p.in_stock).length,
            productsOutOfStock: this.products.filter(p => !p.in_stock).length
        };
    }

    /**
     * Buscar producto por SKU
     */
    findBySKU(sku) {
        return this.products.find(p => p.sku.toLowerCase() === sku.toLowerCase());
    }

    /**
     * Obtener productos relacionados por categoría
     */
    getRelatedProducts(productId, limit = 4) {
        const product = this.getProductById(productId);
        if (!product) return [];
        
        const relatedProducts = this.getProductsByCategory(product.category_id)
            .filter(p => p.id !== productId)
            .slice(0, limit);
        
        return relatedProducts;
    }

    /**
     * Obtener productos con stock bajo
     */
    getLowStockProducts() {
        return this.products.filter(p => p.stock !== undefined && p.stock <= 5);
    }

    /**
     * Verificar si los datos están cargados
     */
    isDataLoaded() {
        return this.isDataLoaded;
    }
}

// Crear instancia global
window.productManager = new ProductManager();