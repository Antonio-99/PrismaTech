/**
 * DataStore - Gestión centralizada de datos
 * Versión final para puerto 8080
 */
class DataStore {
    constructor() {
        this.baseURL = 'http://localhost:8080/prismatech/backend';
        this.categories = [];
        this.products = [];
        this.loadFromAPI();
    }

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

            console.log(`🔄 API Request: ${method} ${this.baseURL}/${endpoint}`);
            const response = await fetch(`${this.baseURL}/${endpoint}`, config);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log(`✅ API Response: ${endpoint}`, result);
            return result;
        } catch (error) {
            console.error(`❌ API Error: ${endpoint}`, error);
            throw error;
        }
    }

    async loadFromAPI() {
        try {
            console.log('🚀 Cargando datos desde API...');
            
            const [categoriesData, productsData] = await Promise.all([
                this.apiRequest('categorias.php'),
                this.apiRequest('productos.php')
            ]);

            this.categories = categoriesData;
            this.products = productsData;

            console.log('✅ Datos cargados:', {
                categories: this.categories.length,
                products: this.products.length
            });

            document.dispatchEvent(new CustomEvent('dataLoaded', {
                detail: { categories: this.categories, products: this.products }
            }));

        } catch (error) {
            console.error('❌ Error cargando desde API:', error);
            console.log('🔄 Usando datos de fallback...');
            
            this.loadFallbackData();
            
            document.dispatchEvent(new CustomEvent('dataLoaded', {
                detail: { 
                    categories: this.categories, 
                    products: this.products,
                    fromFallback: true 
                }
            }));
        }
    }

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
            }
        ];
    }

    getCategories() {
        return this.categories;
    }

    getProducts() {
        return this.products;
    }

    getCategoryById(id) {
        return this.categories.find(cat => cat.id === parseInt(id));
    }

    getProductById(id) {
        return this.products.find(prod => prod.id === parseInt(id));
    }

    getProductsByCategory(categoryId) {
        return this.products.filter(prod => prod.category_id === parseInt(categoryId));
    }

    getUniqueBrands() {
        return [...new Set(this.products.map(p => p.brand).filter(b => b))];
    }

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

    async refresh() {
        await this.loadFromAPI();
    }

    isDataLoaded() {
        return this.categories.length > 0 || this.products.length > 0;
    }

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
console.log('🚀 DataStore inicializado para puerto 8080');