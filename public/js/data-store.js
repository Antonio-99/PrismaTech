/**
 * DataStore - Gestión centralizada de datos
 */
class DataStore {
    constructor() {
        this.categories = [];
        this.products = [];
        this.loadFromLocalStorage();
    }

    /**
     * Carga los datos desde localStorage
     */
    loadFromLocalStorage() {
        // Cargar categorías
        this.categories = JSON.parse(localStorage.getItem('admin_categories')) || [
            { id: 1, name: "Pantallas", description: "Displays LCD, LED, OLED", icon: "fas fa-tv" },
            { id: 2, name: "Teclados", description: "Teclados de reemplazo", icon: "fas fa-keyboard" },
            { id: 3, name: "Baterías", description: "Baterías para laptops", icon: "fas fa-battery-three-quarters" },
            { id: 4, name: "Cargadores", description: "Adaptadores de corriente", icon: "fas fa-plug" },
            { id: 5, name: "Memorias", description: "RAM DDR3, DDR4, DDR5", icon: "fas fa-memory" },
            { id: 6, name: "Almacenamiento", description: "SSD, HDD, M.2 NVMe", icon: "fas fa-hdd" }
        ];

        // Cargar productos
        this.products = JSON.parse(localStorage.getItem('admin_products')) || [];
        
        // Si no hay productos, cargar algunos de ejemplo
        if (this.products.length === 0) {
            this.products = [
                {
                    id: 1,
                    name: "Display LCD 15.6\" HP Pavilion",
                    description: "Pantalla LCD de 15.6 pulgadas con resolución HD (1366x768) compatible con laptops HP Pavilion.",
                    brand: "HP Compatible",
                    sku: "LCD-HP-156-001",
                    part_number: "HP-156-LCD-001",
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
                    category_id: 6,
                    icon: "fas fa-hdd",
                    in_stock: true
                }
            ];
        }
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
}

// Crear instancia global
window.dataStore = new DataStore();