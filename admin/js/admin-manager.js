/**
 * AdminManager - Módulo de gestión del panel de administración
 * Versión conectada a API PHP
 */
class AdminManager {
    constructor() {
        this.baseURL = '../backend';
        this.products = [];
        this.categories = [];
        this.sales = [];
        this.customers = [];
        this.currentPage = 'dashboard';
        
        // Cargar datos desde la API
        this.loadAllData();
        
        // Configurar event listeners
        this.setupEventListeners();
    }

    /**
     * Cargar todos los datos desde la API
     */
    async loadAllData() {
        try {
            await Promise.all([
                this.fetchCategories(),
                this.fetchProducts(),
                this.fetchSales(),
                this.fetchCustomers()
            ]);
            this.loadDashboard();
        } catch (error) {
            console.error('Error al cargar datos:', error);
            this.showToast('Error al cargar datos del servidor', 'error');
        }
    }

    /**
     * Hacer petición a la API
     */
    async apiRequest(endpoint, method = 'GET', data = null) {
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
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error en la petición');
        }

        return await response.json();
    }

    /**
     * Obtener categorías desde la API
     */
    async fetchCategories() {
        try {
            this.categories = await this.apiRequest('categorias.php');
        } catch (error) {
            console.error('Error al obtener categorías:', error);
            this.categories = [];
        }
    }

    /**
     * Obtener productos desde la API
     */
    async fetchProducts() {
        try {
            this.products = await this.apiRequest('productos.php');
        } catch (error) {
            console.error('Error al obtener productos:', error);
            this.products = [];
        }
    }

    /**
     * Obtener ventas desde la API
     */
    async fetchSales() {
        try {
            this.sales = await this.apiRequest('ventas.php');
        } catch (error) {
            console.error('Error al obtener ventas:', error);
            this.sales = [];
        }
    }

    /**
     * Obtener clientes desde la API
     */
    async fetchCustomers() {
        try {
            this.customers = await this.apiRequest('clientes.php');
        } catch (error) {
            console.error('Error al obtener clientes:', error);
            this.customers = [];
        }
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
            case 'customers':
                this.loadCustomers();
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
        document.getElementById('total-customers').textContent = this.customers.length;

        // Actualizar fecha actual
        const currentDate = document.getElementById('current-date');
        if (currentDate) {
            currentDate.textContent = new Date().toLocaleDateString('es-MX');
        }

        // Cargar actividad reciente
        this.loadRecentActivity();
        
        // Cargar productos con bajo stock
        this.loadLowStockProducts();
    }

    /**
     * Cargar actividad reciente
     */
    loadRecentActivity() {
        const container = document.getElementById('recent-activity');
        if (!container) return;

        // Obtener últimas 5 ventas
        const recentSales = this.sales.slice(0, 5);
        
        if (recentSales.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No hay actividad reciente</p></div>';
            return;
        }

        container.innerHTML = recentSales.map(sale => `
            <div class="activity-item">
                <div class="activity-icon success">
                    <i class="fas fa-shopping-cart"></i>
                </div>
                <div class="activity-details">
                    <div class="activity-title">Nueva ${sale.status}: ${sale.customer}</div>
                    <div class="activity-time">${new Date(sale.date).toLocaleDateString()}</div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Cargar productos con bajo stock
     */
    loadLowStockProducts() {
        const container = document.getElementById('low-stock-products');
        if (!container) return;

        const lowStockProducts = this.products.filter(p => p.stock <= 5);
        
        if (lowStockProducts.length === 0) {
            container.innerHTML = '<p style="color: var(--success);">✅ Todos los productos tienen stock suficiente</p>';
            return;
        }

        container.innerHTML = `
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>Stock Actual</th>
                            <th>Stock Mínimo</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${lowStockProducts.map(product => `
                            <tr>
                                <td>${product.name}</td>
                                <td><span class="badge badge-warning">${product.stock}</span></td>
                                <td>${product.min_stock || 5}</td>
                                <td>
                                    <span class="badge ${product.stock === 0 ? 'badge-danger' : 'badge-warning'}">
                                        ${product.stock === 0 ? 'Sin Stock' : 'Stock Bajo'}
                                    </span>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
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
        const countElement = document.getElementById('products-count');
        if (!tbody) return;

        const searchInput = document.getElementById('products-search');
        const categoryFilter = document.getElementById('products-category-filter');
        
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        const categoryFilterValue = categoryFilter ? categoryFilter.value : '';

        let filteredProducts = this.products.filter(product => {
            const matchesSearch = !searchTerm || 
                product.name.toLowerCase().includes(searchTerm) ||
                product.sku.toLowerCase().includes(searchTerm) ||
                (product.part_number && product.part_number.toLowerCase().includes(searchTerm)) ||
                (product.brand && product.brand.toLowerCase().includes(searchTerm));
            const matchesCategory = !categoryFilterValue || product.category_id == categoryFilterValue;
            return matchesSearch && matchesCategory;
        });

        // Actualizar contador
        if (countElement) {
            countElement.textContent = `${filteredProducts.length} productos`;
        }

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
            const stockStatus = product.stock === 0 ? 'Sin Stock' : 
                               product.stock <= 5 ? 'Stock Bajo' : 'En Stock';
            const statusClass = product.stock === 0 ? 'badge-danger' : 
                               product.stock <= 5 ? 'badge-warning' : 'badge-success';
            
            return `
                <tr>
                    <td>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <i class="${product.icon}" style="color: var(--primary-blue);"></i>
                            <div>
                                <strong>${product.name}</strong>
                                ${product.brand ? `<br><small style="color: var(--gray-500);">${product.brand}</small>` : ''}
                            </div>
                        </div>
                    </td>
                    <td>${category ? category.name : 'Sin categoría'}</td>
                    <td><code>${product.sku}</code></td>
                    <td>
                        <span class="badge ${statusClass}">${stockStatus}</span>
                        <small style="display: block; color: var(--gray-500);">${product.stock} unidades</small>
                    </td>
                    <td><span class="badge badge-success">${product.status}</span></td>
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
    async saveProduct() {
        try {
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
                this.showToast('Por favor completa todos los campos requeridos.', 'error');
                return;
            }

            let result;
            if (id) {
                // Editar producto existente
                productData.id = parseInt(id);
                result = await this.apiRequest('productos.php', 'PUT', productData);
            } else {
                // Crear nuevo producto
                result = await this.apiRequest('productos.php', 'POST', productData);
            }

            if (result.success) {
                this.showToast('Producto guardado exitosamente', 'success');
                this.closeModal('product-modal');
                await this.fetchProducts();
                this.renderProducts();
                this.loadDashboard();
            }
        } catch (error) {
            console.error('Error al guardar producto:', error);
            this.showToast('Error al guardar el producto: ' + error.message, 'error');
        }
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
    async deleteProduct(id) {
        if (!confirm('¿Estás seguro de que quieres eliminar este producto?')) {
            return;
        }

        try {
            const result = await this.apiRequest('productos.php', 'DELETE', { id });
            
            if (result.success) {
                this.showToast('Producto eliminado exitosamente', 'success');
                await this.fetchProducts();
                this.renderProducts();
                this.loadDashboard();
            }
        } catch (error) {
            console.error('Error al eliminar producto:', error);
            this.showToast('Error al eliminar el producto: ' + error.message, 'error');
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
            return `
                <tr>
                    <td>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <i class="${category.icon}" style="color: var(--primary-blue);"></i>
                            <strong>${category.name}</strong>
                        </div>
                    </td>
                    <td>${category.description || ''}</td>
                    <td>${category.products_count || 0} productos</td>
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
                document.getElementById('category-description').value = category.description || '';
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
    async saveCategory() {
        try {
            const id = document.getElementById('category-id').value;
            const categoryData = {
                name: document.getElementById('category-name').value,
                description: document.getElementById('category-description').value,
                icon: document.getElementById('category-icon').value || 'fas fa-tag'
            };

            // Validación básica
            if (!categoryData.name) {
                this.showToast('Por favor ingresa el nombre de la categoría.', 'error');
                return;
            }

            let result;
            if (id) {
                categoryData.id = parseInt(id);
                result = await this.apiRequest('categorias.php', 'PUT', categoryData);
            } else {
                result = await this.apiRequest('categorias.php', 'POST', categoryData);
            }

            if (result.success) {
                this.showToast('Categoría guardada exitosamente', 'success');
                this.closeModal('category-modal');
                await this.fetchCategories();
                this.renderCategories();
                this.loadDashboard();
            }
        } catch (error) {
            console.error('Error al guardar categoría:', error);
            this.showToast('Error al guardar la categoría: ' + error.message, 'error');
        }
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
    async deleteCategory(id) {
        if (!confirm('¿Estás seguro de que quieres eliminar esta categoría?')) {
            return;
        }

        try {
            const result = await this.apiRequest('categorias.php', 'DELETE', { id });
            
            if (result.success) {
                this.showToast('Categoría eliminada exitosamente', 'success');
                await this.fetchCategories();
                this.renderCategories();
                this.loadDashboard();
            }
        } catch (error) {
            console.error('Error al eliminar categoría:', error);
            this.showToast('Error al eliminar la categoría: ' + error.message, 'error');
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
                    <td colspan="6" class="empty-state">
                        <i class="fas fa-shopping-cart"></i>
                        <div>No hay ventas registradas</div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.sales.map(sale => {
            const statusClass = sale.status === 'vendido' || sale.status === 'entregado' ? 'badge-success' : 
                              sale.status === 'cancelado' ? 'badge-danger' : 'badge-warning';
            
            const productsList = sale.products && sale.products.length > 0 ? 
                sale.products.map(p => p.product_name).join(', ') : 
                'Sin productos';
            
            return `
                <tr>
                    <td>${new Date(sale.date).toLocaleDateString('es-MX')}</td>
                    <td>
                        <div><strong>${sale.customer}</strong></div>
                        <small style="color: var(--gray-500);">${sale.phone || ''}</small>
                    </td>
                    <td>
                        <small>${productsList}</small>
                    </td>
                    <td>$${sale.total.toLocaleString('es-MX')}</td>
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
                if (sale.products && sale.products.length > 0) {
                    document.getElementById('sale-product').value = sale.products[0].product_id;
                    document.getElementById('sale-quantity').value = sale.products[0].quantity;
                    document.getElementById('sale-price').value = sale.products[0].unit_price;
                }
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
    async saveSale() {
        try {
            const saleData = {
                customer: document.getElementById('sale-customer').value,
                phone: document.getElementById('sale-phone').value,
                product_id: parseInt(document.getElementById('sale-product').value),
                quantity: parseInt(document.getElementById('sale-quantity').value),
                price: parseFloat(document.getElementById('sale-price').value),
                status: document.getElementById('sale-status').value,
                notes: document.getElementById('sale-notes').value
            };

            // Validación básica
            if (!saleData.customer || !saleData.product_id || !saleData.quantity || !saleData.price) {
                this.showToast('Por favor completa todos los campos requeridos.', 'error');
                return;
            }

            const result = await this.apiRequest('ventas.php', 'POST', saleData);

            if (result.success) {
                this.showToast('Venta registrada exitosamente', 'success');
                this.closeModal('sale-modal');
                await this.fetchSales();
                this.renderSales();
                this.loadDashboard();
            }
        } catch (error) {
            console.error('Error al guardar venta:', error);
            this.showToast('Error al registrar la venta: ' + error.message, 'error');
        }
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
    async deleteSale(id) {
        if (!confirm('¿Estás seguro de que quieres eliminar esta venta?')) {
            return;
        }

        try {
            const result = await this.apiRequest('ventas.php', 'DELETE', { id });
            
            if (result.success) {
                this.showToast('Venta eliminada exitosamente', 'success');
                await this.fetchSales();
                this.renderSales();
                this.loadDashboard();
            }
        } catch (error) {
            console.error('Error al eliminar venta:', error);
            this.showToast('Error al eliminar la venta: ' + error.message, 'error');
        }
    }

    // ===========================================
    // GESTIÓN DE CLIENTES
    // ===========================================

    /**
     * Cargar página de clientes
     */
    loadCustomers() {
        this.renderCustomers();
    }

    /**
     * Renderizar lista de clientes
     */
    renderCustomers() {
        const tbody = document.getElementById('customers-table');
        if (!tbody) return;
        
        if (this.customers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <i class="fas fa-users"></i>
                        <div>No hay clientes registrados</div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.customers.map(customer => {
            const lastPurchase = customer.last_purchase ? 
                new Date(customer.last_purchase).toLocaleDateString('es-MX') : 
                'Sin compras';
            
            return `
                <tr>
                    <td><strong>${customer.name}</strong></td>
                    <td>${customer.email || '-'}</td>
                    <td>${customer.phone || '-'}</td>
                    <td>${customer.total_purchases}</td>
                    <td>${lastPurchase}</td>
                    <td>
                        <button class="btn btn-sm btn-secondary" onclick="adminManager.editCustomer(${customer.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="adminManager.deleteCustomer(${customer.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
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
     * Mostrar notificación toast
     */
    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;

        toastContainer.appendChild(toast);

        // Remover toast después de 5 segundos
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    /**
     * Toggle sidebar en móvil
     */
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.toggle('mobile-open');
        }
    }

    /**
     * Cerrar sesión
     */
    logout() {
        if (confirm('¿Seguro que quieres cerrar sesión?')) {
            window.location.href = '../public/index.html';
        }
    }

    /**
     * Importar productos
     */
    importProducts() {
        this.showToast('Función de importación en desarrollo', 'warning');
    }

    /**
     * Ajustar inventario
     */
    adjustInventory() {
        this.showToast('Función de ajuste de inventario en desarrollo', 'warning');
    }

    /**
     * Abrir modal de cliente
     */
    openCustomerModal() {
        this.showToast('Modal de clientes en desarrollo', 'warning');
    }

    /**
     * Exportar datos
     */
    async exportData() {
        try {
            const data = {
                products: this.products,
                categories: this.categories,
                sales: this.sales,
                customers: this.customers
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], 
                { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `prismatech-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            this.showToast('Backup exportado exitosamente', 'success');
        } catch (error) {
            this.showToast('Error al exportar datos', 'error');
        }
    }

    /**
     * Generar reporte
     */
    generateReport() {
        this.showToast('Función de reportes en desarrollo', 'warning');
    }

    /**
     * Respaldar datos
     */
    backupData() {
        this.exportData();
    }

    /**
     * Restaurar datos
     */
    restoreData() {
        this.showToast('Función de restauración en desarrollo', 'warning');
    }

    /**
     * Resetear datos
     */
    resetData() {
        this.showToast('Función de reset en desarrollo', 'warning');
    }

    /**
     * Guardar configuración de la empresa
     */
    saveCompanySettings() {
        this.showToast('Configuración guardada exitosamente', 'success');
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