/**
 * AdminManager - Módulo de gestión del panel de administración
 * Maneja todas las operaciones CRUD y la lógica del panel admin
 */
class AdminManager {
    constructor() {
        this.products = [];
        this.categories = [];
        this.sales = [];
        this.currentPage = 'dashboard';
        
        // Inicializar datos por defecto
        this.initializeDefaultData();
        
        // Cargar datos del localStorage
        this.loadData();
        
        // Configurar event listeners
        this.setupEventListeners();
    }

    /**
     * Inicializar datos por defecto si no existen
     */
    initializeDefaultData() {
        const defaultCategories = [
            { id: 1, name: "Pantallas", description: "Displays LCD, LED, OLED", icon: "fas fa-tv" },
            { id: 2, name: "Teclados", description: "Teclados de reemplazo", icon: "fas fa-keyboard" },
            { id: 3, name: "Baterías", description: "Baterías para laptops", icon: "fas fa-battery-three-quarters" },
            { id: 4, name: "Cargadores", description: "Adaptadores de corriente", icon: "fas fa-plug" },
            { id: 5, name: "Memorias", description: "RAM DDR3, DDR4, DDR5", icon: "fas fa-memory" },
            { id: 6, name: "Almacenamiento", description: "SSD, HDD, M.2 NVMe", icon: "fas fa-hdd" }
        ];

        // Solo inicializar si no hay datos previos
        if (!localStorage.getItem('admin_categories')) {
            localStorage.setItem('admin_categories', JSON.stringify(defaultCategories));
        }
    }

    /**
     * Cargar datos del localStorage
     */
    loadData() {
        this.products = JSON.parse(localStorage.getItem('admin_products')) || [];
        this.categories = JSON.parse(localStorage.getItem('admin_categories')) || [];
        this.sales = JSON.parse(localStorage.getItem('admin_sales')) || [];
    }

    /**
     * Guardar datos en localStorage
     */
    saveData() {
        localStorage.setItem('admin_products', JSON.stringify(this.products));
        localStorage.setItem('admin_categories', JSON.stringify(this.categories));
        localStorage.setItem('admin_sales', JSON.stringify(this.sales));
    }

    /**
     * Configurar event listeners principales
     */
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item[data-page]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.showPage(item.dataset.page);
            });
        });

        // Search functionality
        const productsSearch = document.getElementById('products-search');
        if (productsSearch) {
            productsSearch.addEventListener('input', () => this.renderProducts());
        }

        const productsCategoryFilter = document.getElementById('products-category-filter');
        if (productsCategoryFilter) {
            productsCategoryFilter.addEventListener('change', () => this.renderProducts());
        }

        // Product price auto-fill in sales
        const saleProduct = document.getElementById('sale-product');
        if (saleProduct) {
            saleProduct.addEventListener('change', () => {
                const selectedOption = saleProduct.options[saleProduct.selectedIndex];
                if (selectedOption.dataset.price) {
                    document.getElementById('sale-price').value = selectedOption.dataset.price;
                }
            });
        }

        // Modal close on outside click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                e.target.classList.remove('active');
            }
        });

        // Form submissions
        this.setupFormListeners();
    }

    /**
     * Configurar listeners para formularios
     */
    setupFormListeners() {
        const companyForm = document.getElementById('company-form');
        if (companyForm) {
            companyForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveCompanySettings();
            });
        }
    }

    // ===========================================
    // NAVEGACIÓN Y PÁGINAS
    // ===========================================

    /**
     * Mostrar página específica
     */
    showPage(pageId) {
        // Actualizar navegación
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        const navItem = document.querySelector(`[data-page="${pageId}"]`);
        if (navItem) {
            navItem.classList.add('active');
        }

        // Mostrar contenido de página
        document.querySelectorAll('.page-content').forEach(page => {
            page.classList.remove('active');
        });
        const pageElement = document.getElementById(`${pageId}-page`);
        if (pageElement) {
            pageElement.classList.add('active');
        }

        this.currentPage = pageId;

        // Cargar datos de la página
        this.loadPageData(pageId);
    }

    /**
     * Cargar datos específicos de cada página
     */
    loadPageData(pageId) {
        switch(pageId) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'products':
                this.loadProducts();
                break;
            case 'categories':
                this.loadCategories();
                break;
            case 'sales':
                this.loadSales();
                break;
        }
    }

    // ===========================================
    // DASHBOARD
    // ===========================================

    /**
     * Cargar datos del dashboard
     */
    loadDashboard() {
        document.getElementById('total-products').textContent = this.products.length;
        document.getElementById('total-categories').textContent = this.categories.length;
        document.getElementById('total-sales').textContent = this.sales.length;
    }

    // ===========================================
    // GESTIÓN DE PRODUCTOS
    // ===========================================

    /**
     * Cargar página de productos
     */
    loadProducts() {
        const categoryFilter = document.getElementById('products-category-filter');
        
        // Cargar filtro de categorías
        if (categoryFilter) {
            categoryFilter.innerHTML = '<option value="">Todas las categorías</option>' +
                this.categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
        }

        this.renderProducts();
    }

    /**
     * Renderizar lista de productos
     */
    renderProducts() {
        const tbody = document.getElementById('products-table');
        if (!tbody) return;

        const searchInput = document.getElementById('products-search');
        const categoryFilter = document.getElementById('products-category-filter');
        
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        const categoryFilterValue = categoryFilter ? categoryFilter.value : '';

        let filteredProducts = this.products.filter(product => {
            const matchesSearch = !searchTerm || 
                product.name.toLowerCase().includes(searchTerm) ||
                product.sku.toLowerCase().includes(searchTerm) ||
                (product.part_number && product.part_number.toLowerCase().includes(searchTerm));
            const matchesCategory = !categoryFilterValue || product.category_id == categoryFilterValue;
            return matchesSearch && matchesCategory;
        });

        if (filteredProducts.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <i class="fas fa-box"></i>
                        <div>No hay productos para mostrar</div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filteredProducts.map(product => {
            const category = this.categories.find(c => c.id === product.category_id);
            return `
                <tr>
                    <td>
                        <div><strong>${product.name}</strong></div>
                        <small style="color: var(--gray-500);">${product.brand || ''}</small>
                    </td>
                    <td>${category ? category.name : 'Sin categoría'}</td>
                    <td>$${product.price.toLocaleString()}</td>
                    <td><code>${product.sku}</code></td>
                    <td><span class="badge badge-success">Activo</span></td>
                    <td>
                        <button class="btn btn-sm btn-secondary" onclick="adminManager.editProduct(${product.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="adminManager.deleteProduct(${product.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Abrir modal de producto
     */
    openProductModal(productId = null) {
        const modal = document.getElementById('product-modal');
        const form = document.getElementById('product-form');
        const categorySelect = document.getElementById('product-category');
        
        // Cargar categorías
        if (categorySelect) {
            categorySelect.innerHTML = '<option value="">Seleccionar categoría</option>' +
                this.categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
        }

        if (productId) {
            const product = this.products.find(p => p.id === productId);
            if (product) {
                document.getElementById('product-modal-title').textContent = 'Editar Producto';
                document.getElementById('product-id').value = product.id;
                document.getElementById('product-name').value = product.name;
                document.getElementById('product-category').value = product.category_id;
                document.getElementById('product-brand').value = product.brand || '';
                document.getElementById('product-sku').value = product.sku;
                document.getElementById('product-part-number').value = product.part_number || '';
                document.getElementById('product-price').value = product.price;
                document.getElementById('product-description').value = product.description || '';
                document.getElementById('product-icon').value = product.icon || '';
            }
        } else {
            document.getElementById('product-modal-title').textContent = 'Nuevo Producto';
            if (form) form.reset();
            document.getElementById('product-id').value = '';
        }

        if (modal) {
            modal.classList.add('active');
        }
    }

    /**
     * Guardar producto
     */
    saveProduct() {
        const id = document.getElementById('product-id').value;
        const productData = {
            name: document.getElementById('product-name').value,
            category_id: parseInt(document.getElementById('product-category').value),
            brand: document.getElementById('product-brand').value,
            sku: document.getElementById('product-sku').value,
            part_number: document.getElementById('product-part-number').value,
            price: parseFloat(document.getElementById('product-price').value),
            description: document.getElementById('product-description').value,
            icon: document.getElementById('product-icon').value || 'fas fa-cube'
        };

        // Validación básica
        if (!productData.name || !productData.category_id || !productData.sku || !productData.price) {
            alert('Por favor completa todos los campos requeridos.');
            return;
        }

        if (id) {
            // Editar producto existente
            const index = this.products.findIndex(p => p.id == id);
            if (index !== -1) {
                this.products[index] = { ...this.products[index], ...productData };
            }
        } else {
            // Crear nuevo producto
            productData.id = Date.now();
            this.products.push(productData);
        }

        this.saveData();
        this.closeModal('product-modal');
        this.renderProducts();
        this.loadDashboard();
    }

    /**
     * Editar producto
     */
    editProduct(id) {
        this.openProductModal(id);
    }

    /**
     * Eliminar producto
     */
    deleteProduct(id) {
        if (confirm('¿Estás seguro de que quieres eliminar este producto?')) {
            this.products = this.products.filter(p => p.id !== id);
            this.saveData();
            this.renderProducts();
            this.loadDashboard();
        }
    }

    // ===========================================
    // GESTIÓN DE CATEGORÍAS
    // ===========================================

    /**
     * Cargar página de categorías
     */
    loadCategories() {
        this.renderCategories();
    }

    /**
     * Renderizar lista de categorías
     */
    renderCategories() {
        const tbody = document.getElementById('categories-table');
        if (!tbody) return;
        
        tbody.innerHTML = this.categories.map(category => {
            const productCount = this.products.filter(p => p.category_id === category.id).length;
            return `
                <tr>
                    <td>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <i class="${category.icon}" style="color: var(--primary-blue);"></i>
                            <strong>${category.name}</strong>
                        </div>
                    </td>
                    <td>${category.description}</td>
                    <td>${productCount} productos</td>
                    <td>
                        <button class="btn btn-sm btn-secondary" onclick="adminManager.editCategory(${category.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="adminManager.deleteCategory(${category.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Abrir modal de categoría
     */
    openCategoryModal(categoryId = null) {
        const modal = document.getElementById('category-modal');
        const form = document.getElementById('category-form');
        
        if (categoryId) {
            const category = this.categories.find(c => c.id === categoryId);
            if (category) {
                document.getElementById('category-modal-title').textContent = 'Editar Categoría';
                document.getElementById('category-id').value = category.id;
                document.getElementById('category-name').value = category.name;
                document.getElementById('category-description').value = category.description;
                document.getElementById('category-icon').value = category.icon;
            }
        } else {
            document.getElementById('category-modal-title').textContent = 'Nueva Categoría';
            if (form) form.reset();
            document.getElementById('category-id').value = '';
        }

        if (modal) {
            modal.classList.add('active');
        }
    }

    /**
     * Guardar categoría
     */
    saveCategory() {
        const id = document.getElementById('category-id').value;
        const categoryData = {
            name: document.getElementById('category-name').value,
            description: document.getElementById('category-description').value,
            icon: document.getElementById('category-icon').value || 'fas fa-tag'
        };

        // Validación básica
        if (!categoryData.name) {
            alert('Por favor ingresa el nombre de la categoría.');
            return;
        }

        if (id) {
            const index = this.categories.findIndex(c => c.id == id);
            if (index !== -1) {
                this.categories[index] = { ...this.categories[index], ...categoryData };
            }
        } else {
            categoryData.id = Date.now();
            this.categories.push(categoryData);
        }

        this.saveData();
        this.closeModal('category-modal');
        this.renderCategories();
        this.loadDashboard();
    }

    /**
     * Editar categoría
     */
    editCategory(id) {
        this.openCategoryModal(id);
    }

    /**
     * Eliminar categoría
     */
    deleteCategory(id) {
        const productCount = this.products.filter(p => p.category_id === id).length;
        if (productCount > 0) {
            alert('No se puede eliminar esta categoría porque tiene productos asociados.');
            return;
        }
        
        if (confirm('¿Estás seguro de que quieres eliminar esta categoría?')) {
            this.categories = this.categories.filter(c => c.id !== id);
            this.saveData();
            this.renderCategories();
            this.loadDashboard();
        }
    }

    // ===========================================
    // GESTIÓN DE VENTAS
    // ===========================================

    /**
     * Cargar página de ventas
     */
    loadSales() {
        this.renderSales();
    }

    /**
     * Renderizar lista de ventas
     */
    renderSales() {
        const tbody = document.getElementById('sales-table');
        if (!tbody) return;
        
        if (this.sales.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <i class="fas fa-shopping-cart"></i>
                        <div>No hay ventas registradas</div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.sales.map(sale => {
            const product = this.products.find(p => p.id === sale.product_id);
            const statusClass = sale.status === 'vendido' ? 'badge-success' : 
                              sale.status === 'entregado' ? 'badge-success' : 'badge-warning';
            
            return `
                <tr>
                    <td>${new Date(sale.date).toLocaleDateString()}</td>
                    <td>
                        <div><strong>${sale.customer}</strong></div>
                        <small style="color: var(--gray-500);">${sale.phone || ''}</small>
                    </td>
                    <td>${product ? product.name : 'Producto eliminado'}</td>
                    <td>${sale.quantity}</td>
                    <td>$${(sale.price * sale.quantity).toLocaleString()}</td>
                    <td><span class="badge ${statusClass}">${sale.status}</span></td>
                    <td>
                        <button class="btn btn-sm btn-secondary" onclick="adminManager.editSale(${sale.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="adminManager.deleteSale(${sale.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Abrir modal de venta
     */
    openSaleModal(saleId = null) {
        const modal = document.getElementById('sale-modal');
        const productSelect = document.getElementById('sale-product');
        
        // Cargar productos
        if (productSelect) {
            productSelect.innerHTML = '<option value="">Seleccionar producto</option>' +
                this.products.map(p => `<option value="${p.id}" data-price="${p.price}">${p.name} - $${p.price}</option>`).join('');
        }

        if (saleId) {
            const sale = this.sales.find(s => s.id === saleId);
            if (sale) {
                document.getElementById('sale-customer').value = sale.customer;
                document.getElementById('sale-phone').value = sale.phone || '';
                document.getElementById('sale-product').value = sale.product_id;
                document.getElementById('sale-quantity').value = sale.quantity;
                document.getElementById('sale-price').value = sale.price;
                document.getElementById('sale-status').value = sale.status;
                document.getElementById('sale-notes').value = sale.notes || '';
            }
        } else {
            const form = document.getElementById('sale-form');
            if (form) form.reset();
            document.getElementById('sale-quantity').value = 1;
        }

        if (modal) {
            modal.classList.add('active');
        }
    }

    /**
     * Guardar venta
     */
    saveSale() {
        const saleData = {
            customer: document.getElementById('sale-customer').value,
            phone: document.getElementById('sale-phone').value,
            product_id: parseInt(document.getElementById('sale-product').value),
            quantity: parseInt(document.getElementById('sale-quantity').value),
            price: parseFloat(document.getElementById('sale-price').value),
            status: document.getElementById('sale-status').value,
            notes: document.getElementById('sale-notes').value,
            date: new Date().toISOString()
        };

        // Validación básica
        if (!saleData.customer || !saleData.product_id || !saleData.quantity || !saleData.price) {
            alert('Por favor completa todos los campos requeridos.');
            return;
        }

        saleData.id = Date.now();
        this.sales.push(saleData);

        this.saveData();
        this.closeModal('sale-modal');
        this.renderSales();
        this.loadDashboard();
    }

    /**
     * Editar venta
     */
    editSale(id) {
        this.openSaleModal(id);
    }

    /**
     * Eliminar venta
     */
    deleteSale(id) {
        if (confirm('¿Estás seguro de que quieres eliminar esta venta?')) {
            this.sales = this.sales.filter(s => s.id !== id);
            this.saveData();
            this.renderSales();
            this.loadDashboard();
        }
    }

    // ===========================================
    // CONFIGURACIÓN
    // ===========================================

    /**
     * Guardar configuración de la empresa
     */
    saveCompanySettings() {
        // Aquí se implementaría la lógica para guardar la configuración
        // Por ahora solo mostramos una confirmación
        alert('Configuración guardada exitosamente');
    }

    // ===========================================
    // UTILIDADES Y MODALES
    // ===========================================

    /**
     * Cerrar modal
     */
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    }

    /**
     * Obtener productos para exportación/API
     */
    getProducts() {
        return this.products;
    }

    /**
     * Obtener categorías para exportación/API
     */
    getCategories() {
        return this.categories;
    }

    /**
     * Obtener ventas para exportación/API
     */
    getSales() {
        return this.sales;
    }

    /**
     * Importar datos (útil para migraciones)
     */
    importData(products = null, categories = null, sales = null) {
        if (products) this.products = products;
        if (categories) this.categories = categories;
        if (sales) this.sales = sales;
        
        this.saveData();
        this.loadPageData(this.currentPage);
    }

    /**
     * Limpiar todos los datos
     */
    clearAllData() {
        if (confirm('¿Estás seguro de que quieres eliminar todos los datos? Esta acción no se puede deshacer.')) {
            this.products = [];
            this.categories = [];
            this.sales = [];
            this.saveData();
            this.initializeDefaultData();
            this.loadData();
            this.loadPageData(this.currentPage);
        }
    }
}

// Funciones globales para compatibilidad con el HTML existente
window.showPage = (pageId) => window.adminManager.showPage(pageId);
window.openProductModal = (productId) => window.adminManager.openProductModal(productId);
window.saveProduct = () => window.adminManager.saveProduct();
window.editProduct = (id) => window.adminManager.editProduct(id);
window.deleteProduct = (id) => window.adminManager.deleteProduct(id);
window.openCategoryModal = (categoryId) => window.adminManager.openCategoryModal(categoryId);
window.saveCategory = () => window.adminManager.saveCategory();
window.editCategory = (id) => window.adminManager.editCategory(id);
window.deleteCategory = (id) => window.adminManager.deleteCategory(id);
window.openSaleModal = (saleId) => window.adminManager.openSaleModal(saleId);
window.saveSale = () => window.adminManager.saveSale();
window.editSale = (id) => window.adminManager.editSale(id);
window.deleteSale = (id) => window.adminManager.deleteSale(id);
window.closeModal = (modalId) => window.adminManager.closeModal(modalId);

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    window.adminManager = new AdminManager();
});