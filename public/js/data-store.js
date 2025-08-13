/**
 * DataStore - Gestión centralizada de datos conectado a APIs
 */
class DataStore {
    constructor() {
        this.baseUrl = '../backend';
        this.categories = [];
        this.products = [];
        this.loading = false;
        this.dataLoaded = false;
        
        // Cargar datos inmediatamente
        this.loadAllData();
    }

    /**
     * Cargar todos los datos desde las APIs
     */
    async loadAllData() {
        if (this.loading) return;
        
        this.loading = true;
        console.log('🔄 Cargando datos desde APIs...');
        
        try {
            // Cargar en paralelo
            const [categoriesResponse, productsResponse] = await Promise.all([
                this.fetchWithFallback(`${this.baseUrl}/categorias.php`),
                this.fetchWithFallback(`${this.baseUrl}/productos.php`)
            ]);

            // Procesar categorías
            if (categoriesResponse.success) {
                this.categories = categoriesResponse.data.map(cat => ({
                    id: cat.id,
                    name: cat.nombre,
                    description: cat.descripcion || '',
                    icon: this.getCategoryIcon(cat.nombre)
                }));
            } else {
                this.categories = this.getFallbackCategories();
            }

            // Procesar productos
            if (productsResponse.success) {
                this.products = productsResponse.data.map(prod => ({
                    id: prod.id,
                    name: prod.nombre,
                    description: prod.descripcion || '',
                    brand: this.extractBrand(prod.nombre),
                    sku: prod.sku,
                    part_number: this.extractPartNumber(prod.descripcion),
                    category_id: prod.categoria_id,
                    price: prod.precio,
                    icon: this.getProductIcon(prod.categoria_id),
                    in_stock: prod.stock > 0
                }));
            } else {
                this.products = this.getFallbackProducts();
            }

            this.dataLoaded = true;
            console.log('✅ Datos cargados:', {
                categories: this.categories.length,
                products: this.products.length,
                fromAPI: categoriesResponse.success && productsResponse.success
            });

            // Emitir evento de datos cargados
            this.dispatchDataLoadedEvent(categoriesResponse.success && productsResponse.success);

        } catch (error) {
            console.error('❌ Error cargando datos:', error);
            this.loadFallbackData();
        } finally {
            this.loading = false;
        }
    }

    /**
     * Fetch con fallback automático
     */
    async fetchWithFallback(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            
            // Verificar si es un error de la API
            if (data.error) {
                throw new Error(data.error);
            }
            
            return { success: true, data };
        } catch (error) {
            console.warn(`⚠️ Error en ${url}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Cargar datos de fallback
     */
    loadFallbackData() {
        console.log('📦 Cargando datos de fallback...');
        this.categories = this.getFallbackCategories();
        this.products = this.getFallbackProducts();
        this.dataLoaded = true;
        this.dispatchDataLoadedEvent(false);
    }

    /**
     * Obtener categorías de fallback
     */
    getFallbackCategories() {
        return [
            { id: 1, name: "Pantallas", description: "Displays LCD, LED, OLED", icon: "fas fa-tv" },
            { id: 2, name: "Teclados", description: "Teclados de reemplazo", icon: "fas fa-keyboard" },
            { id: 3, name: "Baterías", description: "Baterías para laptops", icon: "fas fa-battery-three-quarters" },
            { id: 4, name: "Cargadores", description: "Adaptadores de corriente", icon: "fas fa-plug" },
            { id: 5, name: "Memorias", description: "RAM DDR3, DDR4, DDR5", icon: "fas fa-memory" },
            { id: 6, name: "Almacenamiento", description: "SSD, HDD, M.2 NVMe", icon: "fas fa-hdd" }
        ];
    }

    /**
     * Obtener productos de fallback
     */
    getFallbackProducts() {
        return [
            {
                id: 1,
                name: "Display LCD 15.6\" HP Pavilion",
                description: "Pantalla LCD de 15.6 pulgadas con resolución HD (1366x768) compatible con laptops HP Pavilion.",
                brand: "HP Compatible",
                sku: "LCD-HP-156-001",
                part_number: "HP-156-LCD-001",
                category_id: 1,
                price: 1250.00,
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
                icon: "fas fa-keyboard",
                in_stock: true
            },
            {
                id: 3,
                name: "Batería HP Pavilion dv6",
                description: "Batería original HP de 4400mAh para Pavilion dv6. Tecnología Li-Ion con garantía.",
                brand: "HP",
                sku: "BAT-HP-DV6-4400",
                part_number: "HP-DV6-BAT-4400",
                category_id: 3,
                price: 1150.00,
                icon: "fas fa-battery-three-quarters",
                in_stock: true
            },
            {
                id: 4,
                name: "Cargador Universal 65W",
                description: "Cargador universal de 65W con 8 conectores diferentes. Compatible con múltiples marcas.",
                brand: "Universal",
                sku: "CHG-UNIV-65W",
                part_number: "UNIV-CHG-65W-MULTI",
                category_id: 4,
                price: 450.00,
                icon: "fas fa-plug",
                in_stock: true
            },
            {
                id: 5,
                name: "Memoria RAM DDR4 8GB",
                description: "Módulo de memoria RAM DDR4 de 8GB a 2400MHz formato SO-DIMM.",
                brand: "Kingston",
                sku: "RAM-KING-8GB-DDR4",
                part_number: "KST-8GB-DDR4-2400",
                category_id: 5,
                price: 750.00,
                icon: "fas fa-memory",
                in_stock: true
            },
            {
                id: 6,
                name: "SSD M.2 NVMe 250GB",
                description: "Disco sólido SSD M.2 NVMe de 250GB. Velocidad de lectura hasta 3,500 MB/s.",
                brand: "Western Digital",
                sku: "SSD-WD-250GB-M2",
                part_number: "WD-250GB-M2-NVMe",
                category_id: 6,
                price: 950.00,
                icon: "fas fa-hdd",
                in_stock: true
            }
        ];
    }

    /**
     * Emitir evento de datos cargados
     */
    dispatchDataLoadedEvent(fromAPI) {
        const event = new CustomEvent('dataLoaded', {
            detail: {
                categories: this.categories,
                products: this.products,
                fromAPI: fromAPI,
                fromFallback: !fromAPI
            }
        });
        document.dispatchEvent(event);
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
            'almacenamiento': 'fas fa-hdd'
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
            6: 'fas fa-hdd'        // Almacenamiento
        };
        
        return iconMap[categoryId] || 'fas fa-cube';
    }

    /**
     * Extraer marca del nombre del producto
     */
    extractBrand(productName) {
        const brands = ['HP', 'Lenovo', 'Dell', 'Acer', 'ASUS', 'Toshiba', 'Samsung', 'Kingston', 'Western Digital', 'Seagate'];
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
            /PN:\s*([A-Z0-9\-]+)/i
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
     * Verifica si los datos están cargados
     */
    isDataLoaded() {
        return this.dataLoaded;
    }

    /**
     * Refrescar datos desde la API
     */
    async refresh() {
        this.dataLoaded = false;
        await this.loadAllData();
    }

    /**
     * Obtener estadísticas
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
}

// Crear instancia global
window.dataStore = new DataStore();