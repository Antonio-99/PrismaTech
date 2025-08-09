/**
 * DataStore - Gestión centralizada de datos
 * Versión conectada a API PHP
 */
class DataStore {
    constructor() {
        this.baseURL = '../backend';
        this.categories = [];
        this.products = [];
        this.loadFromAPI();
    }

    /**
     * Hacer petición a la API
     */
    async apiRequest(endpoint, method = 'GET', data = null) {
        try {
            const config = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                }
            };

            if (data) {
                config.body = JSON.stringify(data);
            }

            const response = await fetch(`${this.baseURL}/${endpoint}`, config);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error en API request:', error);
            throw error;
        }
    }

    /**
     * Carga los datos desde la API
     */
    async loadFromAPI() {
        try {
            // Cargar en paralelo para mejor rendimiento
            const [categoriesData, productsData] = await Promise.all([
                this.apiRequest('categorias.php'),
                this.apiRequest('productos.php')
            ]);

            this.categories = categoriesData;
            this.products = productsData;

            // Disparar evento personalizado cuando los datos estén listos
            document.dispatchEvent(new CustomEvent('dataLoaded', {
                detail: { categories: this.categories, products: this.products }
            }));

        } catch (error) {
            console.error('Error al cargar datos desde la API:', error);
            
            // Fallback a datos de ejemplo si la API falla
            this.loadFallbackData();
            
            // Disparar evento con datos de fallback
            document.dispatchEvent(new CustomEvent('dataLoaded', {
                detail: { 
                    categories: this.categories, 
                    products: this.products,
                    fromFallback: true 
                }
            }));
        }
    }

    /**
     * Datos de fallback si la API no está disponible
     */
    loadFallbackData() {
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
                price: 1250.00,
                category_id: 1,
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
                price: 850.00,
                category_id: 2,
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
                price: 1150.00,
                category_id: 3,
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
                price: 450.00,
                category_id: 4,
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
                price: 650.00,
                category_id: 5,
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
                price: 850.00,
                category_id: 6,
                icon: "fas fa-hdd",
                in_stock: true
            }
        ];
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
                (product.brand && product.brand.toLowerCase().includes(searchTerm.toLowerCase()));
            
            const matchesCategory = !categoryId || product.category_id === parseInt(categoryId);
            const matchesBrand = !brand || product.brand === brand;
            
            return matchesSearch && matchesCategory && matchesBrand;
        });
    }

    /**
     * Refrescar datos desde la API
     */
    async refresh() {
        await this.loadFromAPI();
    }

    /**
     * Verificar si los datos están cargados
     */
    isDataLoaded() {
        return this.categories.length > 0 || this.products.length > 0;
    }

    /**
     * Obtener estadísticas básicas
     */
    getStats() {
        return {
            totalCategories: this.categories.length,
            totalProducts: this.products.length,
            totalBrands: this.getUniqueBrands().length,
            productsByCategory: this.categories.map(cat => ({
                category: cat.name,
                count: this.getProductsByCategory(cat.id).length
            }))
        };
    }
}

// Crear instancia global
window.dataStore = new DataStore();