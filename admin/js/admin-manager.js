/**
 * AdminManager - Módulo de gestión del panel de administración
 * Conectado directamente a APIs PHP del backend
 */
class AdminManager {
    constructor() {
        this.baseUrl = '../backend';
        this.products = [];
        this.categories = [];
        this.sales = [];
        this.customers = [];
        this.currentPage = 'dashboard';
        
        // Configurar event listeners
        this.setupEventListeners();
        
        // Cargar datos iniciales
        this.loadAllData();
    }

    /**
     * Cargar todos los datos desde las APIs
     */
    async loadAllData() {
        try {
            await Promise.all([
                this.loadCategoriesFromAPI(),
                this.loadProductsFromAPI(),
                this.loadCustomersFromAPI(),
                this.loadSalesFromAPI()
            ]);
            console.log('✅ Datos cargados desde APIs');
            this.updateDashboardStats();
        } catch (error) {
            console.error('❌ Error cargando datos:', error);
            this.showToast('Error cargando datos del servidor', 'error');
        }
    }

    /**
     * Cargar categorías desde API
     */
    async loadCategoriesFromAPI() {
        try {
            const response = await fetch(`${this.baseUrl}/categorias.php`);
            if (!response.ok) throw new Error('Error en API categorías');
            this.categories = await response.json();
            console.log('✅ Categorías cargadas:', this.categories.length);
        } catch (error) {
            console.error('Error cargando categorías:', error);
            this.categories = [];
        }
    }

    /**
     * Cargar productos desde API
     */
    async loadProductsFromAPI() {
        try {
            const response = await fetch(`${this.baseUrl}/productos.php`);
            if (!response.ok) throw new Error('Error en API productos');
            this.products = await response.json();
            console.log('✅ Productos cargados:', this.products.length);
        } catch (error) {
            console.error('Error cargando productos:', error);
            this.products = [];
        }
    }

    /**
     * Cargar clientes desde API
     */
    async loadCustomersFromAPI() {
        try {
            const response = await fetch(`${this.baseUrl}/clientes.php`);
            if (!response.ok) throw new Error('Error en API clientes');
            this.customers = await response.json();
            console.log('✅ Clientes cargados:', this.customers.length);
        } catch (error) {
            console.error('Error cargando clientes:', error);
            this.customers = [];
        }
    }

    /**
     * Cargar ventas desde API
     */
    async loadSalesFromAPI() {
        try {
            const response = await fetch(`${this.baseUrl}/ventas.php`);
            if (!response.ok) throw new Error('Error en API ventas');
            this.sales = await response.json();
            console.log('✅ Ventas cargadas:', this.sales.length);
        } catch (error) {
            console.error('Error cargando ventas:', error);
            this.sales = [];
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

        const productsStatusFilter = document.getElementById('products-status-filter');
        if (productsStatusFilter) {
            productsStatusFilter.addEventListener('change', () => this.renderProducts());
        }

        // Modal close functionality
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                e.target.classList.remove('active');
            }
        });

        // Date display
        this.updateCurrentDate();
    }

    /**
     * Actualizar fecha actual
     */
    updateCurrentDate() {
        const dateElement = document.getElementById('current-date');
        if (dateElement) {
            dateElement.textContent = new Date().toLocaleDateString('es-MX');
        }
    }

    /**
     * Actualizar estadísticas del dashboard
     */
    updateDashboardStats() {
        const totalProducts = document.getElementById('total-products');
        const totalCategories = document.getElementById('total-categories');
        const totalQuotes = document.getElementById('total-quotes');
        const totalCustomers = document.getElementById('total-customers');

        if (totalProducts) totalProducts.textContent = this.products.length;
        if (totalCategories) totalCategories.textContent = this.categories.length;
        if (totalQuotes) totalQuotes.textContent = this.sales.filter(s => s.estado === 'cotizacion').length;
        if (totalCustomers) totalCustomers.textContent = this.customers.length;
    }

    // ===========================================
    // NAVEGACIÓN Y PÁGINAS
    // ===========================================

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
        this.loadPageData(pageId);
    }

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
            case 'inventory':
                this.loadInventory();
                break;
        }
    }

    // ===========================================
    // DASHBOARD
    // ===========================================

    loadDashboard() {
        this.updateDashboardStats();
        
        // Actualizar productos con stock bajo
        const lowStockProducts = this.products.filter(p => p.stock <= p.stock_minimo);
        const lowStockContainer = document.getElementById('low-stock-products');
        
        if (lowStockContainer) {
            if (lowStockProducts.length === 0) {
                lowStockContainer.innerHTML = '<p class="text-muted">No hay productos con stock bajo</p>';
            } else {
                lowStockContainer.innerHTML = lowStockProducts.map(product => `
                    <div style="padding: 10px; background: #fff3cd; border-radius: 5px; margin-bottom: 10px;">
                        <strong>${product.nombre}</strong> (${product.sku})<br>
                        <small>Stock actual: ${product.stock} / Mínimo: ${product.stock_minimo}</small>
                    </div>
                `).join('');
            }
        }
    }

    // ===========================================
    // GESTIÓN DE PRODUCTOS
    // ===========================================

    loadProducts() {
        const categoryFilter = document.getElementById('products-category-filter');
        
        if (categoryFilter) {
            categoryFilter.innerHTML = '<option value="">Todas las categorías</option>' +
                this.categories.map(cat => `<option value="${cat.id}">${cat.nombre}</option>`).join('');
        }

        this.renderProducts();
    }

    renderProducts() {
        const tbody = document.getElementById('products-table');
        if (!tbody) return;

        const searchInput = document.getElementById('products-search');
        const categoryFilter = document.getElementById('products-category-filter');
        const statusFilter = document.getElementById('products-status-filter');
        
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        const categoryFilterValue = categoryFilter ? categoryFilter.value : '';
        const statusFilterValue = statusFilter ? statusFilter.value : '';

        let filteredProducts = this.products.filter(product => {
            const matchesSearch = !searchTerm || 
                product.nombre.toLowerCase().includes(searchTerm) ||
                product.sku.toLowerCase().includes(searchTerm) ||
                (product.descripcion && product.descripcion.toLowerCase().includes(searchTerm));
            
            const matchesCategory = !categoryFilterValue || product.categoria_id == categoryFilterValue;
            
            let matchesStatus = true;
            if (statusFilterValue) {
                if (statusFilterValue === 'out_of_stock') {
                    matchesStatus = product.stock <= 0;
                } else {
                    matchesStatus = product.estado === statusFilterValue;
                }
            }
            
            return matchesSearch && matchesCategory && matchesStatus;
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
            let statusBadge;
            if (product.stock <= 0) {
                statusBadge = '<span class="badge badge-danger">Sin Stock</span>';
            } else if (product.estado === 'active') {
                statusBadge = '<span class="badge badge-success">Activo</span>';
            } else {
                statusBadge = '<span class="badge badge-warning">Inactivo</span>';
            }
            
            const categoryName = this.categories.find(c => c.id === product.categoria_id)?.nombre || 'Sin categoría';
            
            return `
                <tr>
                    <td>
                        <div><strong>${product.nombre}</strong></div>
                        <small style="color: var(--gray-500);">${product.descripcion || 'Sin descripción'}</small>
                    </td>
                    <td>${categoryName}</td>
                    <td><code>${product.sku}</code></td>
                    <td>${product.stock || 0}</td>
                    <td>${statusBadge}</td>
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

        // Actualizar contador
        const countElement = document.getElementById('products-count');
        if (countElement) {
            countElement.textContent = `${filteredProducts.length} productos`;
        }
    }

    openProductModal(productId = null) {
        this.createProductModal();
        const modal = document.getElementById('product-modal');
        const categorySelect = document.getElementById('product-category');
        
        // Cargar categorías
        if (categorySelect) {
            categorySelect.innerHTML = '<option value="">Seleccionar categoría</option>' +
                this.categories.map(cat => `<option value="${cat.id}">${cat.nombre}</option>`).join('');
        }

        if (productId) {
            const product = this.products.find(p => p.id === productId);
            if (product) {
                document.getElementById('product-modal-title').textContent = 'Editar Producto';
                document.getElementById('product-id').value = product.id;
                document.getElementById('product-name').value = product.nombre;
                document.getElementById('product-category').value = product.categoria_id;
                document.getElementById('product-sku').value = product.sku;
                document.getElementById('product-price').value = product.precio;
                document.getElementById('product-stock').value = product.stock;
                document.getElementById('product-min-stock').value = product.stock_minimo;
                document.getElementById('product-description').value = product.descripcion || '';
            }
        } else {
            document.getElementById('product-modal-title').textContent = 'Nuevo Producto';
            document.getElementById('product-form').reset();
            document.getElementById('product-id').value = '';
        }

        modal.classList.add('active');
    }

    async saveProduct() {
        const id = document.getElementById('product-id').value;
        const productData = {
            nombre: document.getElementById('product-name').value.trim(),
            categoria_id: parseInt(document.getElementById('product-category').value),
            sku: document.getElementById('product-sku').value.trim(),
            precio: parseFloat(document.getElementById('product-price').value),
            stock: parseInt(document.getElementById('product-stock').value) || 0,
            stock_minimo: parseInt(document.getElementById('product-min-stock').value) || 5,
            descripcion: document.getElementById('product-description').value.trim(),
            estado: 'active'
        };

        // Validaciones
        if (!productData.nombre) {
            this.showToast('El nombre del producto es requerido', 'warning');
            return;
        }
        if (!productData.categoria_id) {
            this.showToast('Debe seleccionar una categoría', 'warning');
            return;
        }
        if (!productData.sku) {
            this.showToast('El SKU es requerido', 'warning');
            return;
        }
        if (!productData.precio || productData.precio <= 0) {
            this.showToast('El precio debe ser mayor a 0', 'warning');
            return;
        }

        try {
            let response;
            if (id) {
                productData.id = parseInt(id);
                response = await fetch(`${this.baseUrl}/productos.php`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(productData)
                });
            } else {
                response = await fetch(`${this.baseUrl}/productos.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(productData)
                });
            }

            if (!response.ok) throw new Error('Error al guardar producto');
            
            const result = await response.json();
            if (result.success) {
                this.showToast(id ? 'Producto actualizado' : 'Producto creado', 'success');
                this.closeModal('product-modal');
                await this.loadProductsFromAPI();
                this.renderProducts();
                this.updateDashboardStats();
            } else {
                this.showToast(result.error || 'Error al guardar producto', 'error');
            }
        } catch (error) {
            console.error('Error guardando producto:', error);
            this.showToast('Error al guardar producto', 'error');
        }
    }

    editProduct(id) {
        this.openProductModal(id);
    }

    async deleteProduct(id) {
        if (!confirm('¿Estás seguro de que quieres eliminar este producto?')) return;

        try {
            const response = await fetch(`${this.baseUrl}/productos.php`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: parseInt(id) })
            });

            if (!response.ok) throw new Error('Error al eliminar producto');
            
            const result = await response.json();
            if (result.success) {
                this.showToast('Producto eliminado', 'success');
                await this.loadProductsFromAPI();
                this.renderProducts();
                this.updateDashboardStats();
            } else {
                this.showToast(result.error || 'Error al eliminar producto', 'error');
            }
        } catch (error) {
            console.error('Error eliminando producto:', error);
            this.showToast('Error al eliminar producto', 'error');
        }
    }

    // ===========================================
    // GESTIÓN DE CATEGORÍAS
    // ===========================================

    loadCategories() {
        this.renderCategories();
    }

    renderCategories() {
        const tbody = document.getElementById('categories-table');
        if (!tbody) return;
        
        if (this.categories.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="empty-state">
                        <i class="fas fa-tags"></i>
                        <div>No hay categorías disponibles</div>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = this.categories.map(category => {
            const productCount = this.products.filter(p => p.categoria_id === category.id).length;
            return `
                <tr>
                    <td><strong>${category.nombre}</strong></td>
                    <td>${category.descripcion || 'Sin descripción'}</td>
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

    openCategoryModal(categoryId = null) {
        this.createCategoryModal();
        const modal = document.getElementById('category-modal');
        
        if (categoryId) {
            const category = this.categories.find(c => c.id === categoryId);
            if (category) {
                document.getElementById('category-modal-title').textContent = 'Editar Categoría';
                document.getElementById('category-id').value = category.id;
                document.getElementById('category-name').value = category.nombre;
                document.getElementById('category-description').value = category.descripcion || '';
            }
        } else {
            document.getElementById('category-modal-title').textContent = 'Nueva Categoría';
            document.getElementById('category-form').reset();
            document.getElementById('category-id').value = '';
        }

        modal.classList.add('active');
    }

    async saveCategory() {
        const id = document.getElementById('category-id').value;
        const categoryData = {
            nombre: document.getElementById('category-name').value.trim(),
            descripcion: document.getElementById('category-description').value.trim()
        };

        if (!categoryData.nombre) {
            this.showToast('El nombre de la categoría es requerido', 'warning');
            return;
        }

        try {
            let response;
            if (id) {
                categoryData.id = parseInt(id);
                response = await fetch(`${this.baseUrl}/categorias.php`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(categoryData)
                });
            } else {
                response = await fetch(`${this.baseUrl}/categorias.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(categoryData)
                });
            }

            if (!response.ok) throw new Error('Error al guardar categoría');
            
            const result = await response.json();
            if (result.success) {
                this.showToast(id ? 'Categoría actualizada' : 'Categoría creada', 'success');
                this.closeModal('category-modal');
                await this.loadCategoriesFromAPI();
                this.renderCategories();
                this.updateDashboardStats();
            } else {
                this.showToast(result.error || 'Error al guardar categoría', 'error');
            }
        } catch (error) {
            console.error('Error guardando categoría:', error);
            this.showToast('Error al guardar categoría', 'error');
        }
    }

    editCategory(id) {
        this.openCategoryModal(id);
    }

    async deleteCategory(id) {
        const productCount = this.products.filter(p => p.categoria_id === id).length;
        if (productCount > 0) {
            this.showToast('No se puede eliminar esta categoría porque tiene productos asociados', 'warning');
            return;
        }
        
        if (!confirm('¿Estás seguro de que quieres eliminar esta categoría?')) return;

        try {
            const response = await fetch(`${this.baseUrl}/categorias.php`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: parseInt(id) })
            });

            if (!response.ok) throw new Error('Error al eliminar categoría');
            
            const result = await response.json();
            if (result.success) {
                this.showToast('Categoría eliminada', 'success');
                await this.loadCategoriesFromAPI();
                this.renderCategories();
                this.updateDashboardStats();
            } else {
                this.showToast(result.error || 'Error al eliminar categoría', 'error');
            }
        } catch (error) {
            console.error('Error eliminando categoría:', error);
            this.showToast('Error al eliminar categoría', 'error');
        }
    }

    // ===========================================
    // GESTIÓN DE CLIENTES
    // ===========================================

    loadCustomers() {
        this.renderCustomers();
    }

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
            const salesCount = this.sales.filter(s => s.cliente_id === customer.id).length;
            const lastSale = this.sales
                .filter(s => s.cliente_id === customer.id)
                .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0];
            
            return `
                <tr>
                    <td><strong>${customer.nombre}</strong></td>
                    <td>${customer.email || 'No especificado'}</td>
                    <td>${customer.telefono || 'No especificado'}</td>
                    <td>${salesCount}</td>
                    <td>${lastSale ? new Date(lastSale.fecha).toLocaleDateString('es-MX') : 'Nunca'}</td>
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

    openCustomerModal(customerId = null) {
        this.createCustomerModal();
        const modal = document.getElementById('customer-modal');
        
        if (customerId) {
            const customer = this.customers.find(c => c.id === customerId);
            if (customer) {
                document.getElementById('customer-modal-title').textContent = 'Editar Cliente';
                document.getElementById('customer-id').value = customer.id;
                document.getElementById('customer-name').value = customer.nombre;
                document.getElementById('customer-email').value = customer.email || '';
                document.getElementById('customer-phone').value = customer.telefono || '';
                document.getElementById('customer-address').value = customer.direccion || '';
            }
        } else {
            document.getElementById('customer-modal-title').textContent = 'Nuevo Cliente';
            document.getElementById('customer-form').reset();
            document.getElementById('customer-id').value = '';
        }

        modal.classList.add('active');
    }

    async saveCustomer() {
        const id = document.getElementById('customer-id').value;
        const customerData = {
            nombre: document.getElementById('customer-name').value.trim(),
            email: document.getElementById('customer-email').value.trim(),
            telefono: document.getElementById('customer-phone').value.trim(),
            direccion: document.getElementById('customer-address').value.trim()
        };

        if (!customerData.nombre) {
            this.showToast('El nombre del cliente es requerido', 'warning');
            return;
        }

        // Validar email si se proporciona
        if (customerData.email && !this.validateEmail(customerData.email)) {
            this.showToast('El formato del email no es válido', 'warning');
            return;
        }

        try {
            let response;
            if (id) {
                customerData.id = parseInt(id);
                response = await fetch(`${this.baseUrl}/clientes.php`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(customerData)
                });
            } else {
                response = await fetch(`${this.baseUrl}/clientes.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(customerData)
                });
            }

            if (!response.ok) throw new Error('Error al guardar cliente');
            
            const result = await response.json();
            if (result.success) {
                this.showToast(id ? 'Cliente actualizado' : 'Cliente creado', 'success');
                this.closeModal('customer-modal');
                await this.loadCustomersFromAPI();
                this.renderCustomers();
                this.updateDashboardStats();
            } else {
                this.showToast(result.error || 'Error al guardar cliente', 'error');
            }
        } catch (error) {
            console.error('Error guardando cliente:', error);
            this.showToast('Error al guardar cliente', 'error');
        }
    }

    editCustomer(id) {
        this.openCustomerModal(id);
    }

    async deleteCustomer(id) {
        const salesCount = this.sales.filter(s => s.cliente_id === id).length;
        if (salesCount > 0) {
            this.showToast('No se puede eliminar este cliente porque tiene ventas asociadas', 'warning');
            return;
        }
        
        if (!confirm('¿Estás seguro de que quieres eliminar este cliente?')) return;

        try {
            const response = await fetch(`${this.baseUrl}/clientes.php`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: parseInt(id) })
            });

            if (!response.ok) throw new Error('Error al eliminar cliente');
            
            const result = await response.json();
            if (result.success) {
                this.showToast('Cliente eliminado', 'success');
                await this.loadCustomersFromAPI();
                this.renderCustomers();
                this.updateDashboardStats();
            } else {
                this.showToast(result.error || 'Error al eliminar cliente', 'error');
            }
        } catch (error) {
            console.error('Error eliminando cliente:', error);
            this.showToast('Error al eliminar cliente', 'error');
        }
    }

    // ===========================================
    // GESTIÓN DE INVENTARIO
    // ===========================================

    loadInventory() {
        this.renderInventory();
    }

    renderInventory() {
        const tbody = document.getElementById('inventory-table');
        if (!tbody) return;
        
        tbody.innerHTML = this.products.map(product => {
            const category = this.categories.find(c => c.id === product.categoria_id);
            let statusBadge;
            
            if (product.stock <= 0) {
                statusBadge = '<span class="badge badge-danger">Sin Stock</span>';
            } else if (product.stock <= product.stock_minimo) {
                statusBadge = '<span class="badge badge-warning">Stock Bajo</span>';
            } else {
                statusBadge = '<span class="badge badge-success">Disponible</span>';
            }
            
            return `
                <tr>
                    <td>
                        <strong>${product.nombre}</strong><br>
                        <small>${category ? category.nombre : 'Sin categoría'}</small>
                    </td>
                    <td><code>${product.sku}</code></td>
                    <td><strong>${product.stock}</strong></td>
                    <td>${product.stock_minimo}</td>
                    <td>Almacén Principal</td>
                    <td>${statusBadge}</td>
                    <td>
                        <button class="btn btn-sm btn-info" onclick="adminManager.adjustStock(${product.id})">
                            <i class="fas fa-edit"></i> Ajustar
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    adjustStock(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;
        
        const newStock = prompt(`Ajustar stock para ${product.nombre}\nStock actual: ${product.stock}\nNuevo stock:`, product.stock);
        if (newStock === null) return;
        
        const stockNumber = parseInt(newStock);
        if (isNaN(stockNumber) || stockNumber < 0) {
            this.showToast('El stock debe ser un número mayor o igual a 0', 'warning');
            return;
        }
        
        this.updateProductStock(productId, stockNumber);
    }

    async updateProductStock(productId, newStock) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;
        
        const updatedProduct = { ...product, stock: newStock };
        
        try {
            const response = await fetch(`${this.baseUrl}/productos.php`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedProduct)
            });

            if (!response.ok) throw new Error('Error al actualizar stock');
            
            const result = await response.json();
            if (result.success) {
                this.showToast('Stock actualizado correctamente', 'success');
                await this.loadProductsFromAPI();
                this.renderInventory();
                this.updateDashboardStats();
            } else {
                this.showToast(result.error || 'Error al actualizar stock', 'error');
            }
        } catch (error) {
            console.error('Error actualizando stock:', error);
            this.showToast('Error al actualizar stock', 'error');
        }
    }

    // ===========================================
    // GESTIÓN DE VENTAS
    // ===========================================

    loadSales() {
        this.renderSales();
    }

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
            const customer = this.customers.find(c => c.id === sale.cliente_id);
            const customerName = customer ? customer.nombre : 'Cliente no especificado';
            
            let statusClass;
            switch(sale.estado) {
                case 'vendido':
                case 'entregado':
                    statusClass = 'badge-success';
                    break;
                case 'cancelado':
                    statusClass = 'badge-danger';
                    break;
                default:
                    statusClass = 'badge-warning';
            }
            
            const productsText = sale.productos ? `${sale.productos.length} producto(s)` : 'Ver detalles';
            
            return `
                <tr>
                    <td>${new Date(sale.fecha).toLocaleDateString('es-MX')}</td>
                    <td><strong>${customerName}</strong></td>
                    <td>${productsText}</td>
                    <td>$${parseFloat(sale.total || 0).toLocaleString('es-MX')}</td>
                    <td><span class="badge ${statusClass}">${sale.estado}</span></td>
                    <td>
                        <button class="btn btn-sm btn-info" onclick="adminManager.viewSale(${sale.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${sale.estado !== 'entregado' ? `
                            <button class="btn btn-sm btn-warning" onclick="adminManager.editSale(${sale.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                        ` : ''}
                    </td>
                </tr>
            `;
        }).join('');
    }

    openSaleModal() {
        this.createSaleModal();
        const modal = document.getElementById('sale-modal');
        modal.classList.add('active');
    }

    viewSale(id) {
        const sale = this.sales.find(s => s.id === id);
        if (!sale) return;
        
        const customer = this.customers.find(c => c.id === sale.cliente_id);
        const customerName = customer ? customer.nombre : 'Cliente no especificado';
        
        let productsList = '';
        if (sale.productos && sale.productos.length > 0) {
            productsList = sale.productos.map(p => 
                `• ${p.producto_nombre} (SKU: ${p.producto_sku}) - Cantidad: ${p.cantidad} - $${p.precio_unitario.toLocaleString('es-MX')}`
            ).join('\n');
        } else {
            productsList = 'No hay productos especificados';
        }
        
        alert(`Detalles de la Venta #${sale.id}
        
Cliente: ${customerName}
Fecha: ${new Date(sale.fecha).toLocaleDateString('es-MX')}
Estado: ${sale.estado}
Total: $${parseFloat(sale.total).toLocaleString('es-MX')}

Productos:
${productsList}

${sale.notas ? `Notas: ${sale.notas}` : ''}`);
    }

    editSale(id) {
        const sale = this.sales.find(s => s.id === id);
        if (!sale) return;
        
        const newStatus = prompt(`Cambiar estado de la venta #${id}
Estado actual: ${sale.estado}

Opciones:
- cotizacion
- vendido  
- entregado
- cancelado

Nuevo estado:`, sale.estado);
        
        if (!newStatus || newStatus === sale.estado) return;
        
        const validStatuses = ['cotizacion', 'vendido', 'entregado', 'cancelado'];
        if (!validStatuses.includes(newStatus)) {
            this.showToast('Estado no válido', 'warning');
            return;
        }
        
        this.updateSaleStatus(id, newStatus);
    }

    async updateSaleStatus(saleId, newStatus) {
        try {
            const response = await fetch(`${this.baseUrl}/ventas.php`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    id: parseInt(saleId), 
                    estado: newStatus 
                })
            });

            if (!response.ok) throw new Error('Error al actualizar venta');
            
            const result = await response.json();
            if (result.success) {
                this.showToast('Estado de venta actualizado', 'success');
                await this.loadSalesFromAPI();
                this.renderSales();
                this.updateDashboardStats();
            } else {
                this.showToast(result.error || 'Error al actualizar venta', 'error');
            }
        } catch (error) {
            console.error('Error actualizando venta:', error);
            this.showToast('Error al actualizar venta', 'error');
        }
    }

    // ===========================================
    // MODALES
    // ===========================================

    createProductModal() {
        if (document.getElementById('product-modal')) return;
        
        const modalHTML = `
            <div class="modal-overlay" id="product-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 id="product-modal-title">Nuevo Producto</h2>
                        <button class="modal-close" onclick="adminManager.closeModal('product-modal')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form id="product-form" onsubmit="event.preventDefault(); adminManager.saveProduct();">
                            <input type="hidden" id="product-id">
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Nombre del Producto *</label>
                                    <input type="text" class="form-control" id="product-name" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Categoría *</label>
                                    <select class="form-control" id="product-category" required>
                                        <option value="">Seleccionar categoría</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">SKU *</label>
                                    <input type="text" class="form-control" id="product-sku" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Precio *</label>
                                    <input type="number" class="form-control" id="product-price" step="0.01" min="0" required>
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Stock</label>
                                    <input type="number" class="form-control" id="product-stock" min="0" value="0">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Stock Mínimo</label>
                                    <input type="number" class="form-control" id="product-min-stock" min="0" value="5">
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Descripción</label>
                                <textarea class="form-control" id="product-description" rows="3"></textarea>
                            </div>
                            <div class="modal-actions">
                                <button type="button" class="btn btn-secondary" onclick="adminManager.closeModal('product-modal')">
                                    Cancelar
                                </button>
                                <button type="submit" class="btn btn-primary">
                                    <i class="fas fa-save"></i> Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('modals-container').innerHTML += modalHTML;
    }

    createCategoryModal() {
        if (document.getElementById('category-modal')) return;
        
        const modalHTML = `
            <div class="modal-overlay" id="category-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 id="category-modal-title">Nueva Categoría</h2>
                        <button class="modal-close" onclick="adminManager.closeModal('category-modal')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form id="category-form" onsubmit="event.preventDefault(); adminManager.saveCategory();">
                            <input type="hidden" id="category-id">
                            <div class="form-group">
                                <label class="form-label">Nombre de la Categoría *</label>
                                <input type="text" class="form-control" id="category-name" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Descripción</label>
                                <textarea class="form-control" id="category-description" rows="3"></textarea>
                            </div>
                            <div class="modal-actions">
                                <button type="button" class="btn btn-secondary" onclick="adminManager.closeModal('category-modal')">
                                    Cancelar
                                </button>
                                <button type="submit" class="btn btn-primary">
                                    <i class="fas fa-save"></i> Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('modals-container').innerHTML += modalHTML;
    }

    createCustomerModal() {
        if (document.getElementById('customer-modal')) return;
        
        const modalHTML = `
            <div class="modal-overlay" id="customer-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 id="customer-modal-title">Nuevo Cliente</h2>
                        <button class="modal-close" onclick="adminManager.closeModal('customer-modal')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form id="customer-form" onsubmit="event.preventDefault(); adminManager.saveCustomer();">
                            <input type="hidden" id="customer-id">
                            <div class="form-group">
                                <label class="form-label">Nombre del Cliente *</label>
                                <input type="text" class="form-control" id="customer-name" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Email</label>
                                <input type="email" class="form-control" id="customer-email">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Teléfono</label>
                                <input type="text" class="form-control" id="customer-phone">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Dirección</label>
                                <textarea class="form-control" id="customer-address" rows="2"></textarea>
                            </div>
                            <div class="modal-actions">
                                <button type="button" class="btn btn-secondary" onclick="adminManager.closeModal('customer-modal')">
                                    Cancelar
                                </button>
                                <button type="submit" class="btn btn-primary">
                                    <i class="fas fa-save"></i> Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('modals-container').innerHTML += modalHTML;
    }

    createSaleModal() {
        if (document.getElementById('sale-modal')) return;
        
        const modalHTML = `
            <div class="modal-overlay" id="sale-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Nueva Venta/Cotización</h2>
                        <button class="modal-close" onclick="adminManager.closeModal('sale-modal')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form id="sale-form" onsubmit="event.preventDefault(); adminManager.saveSale();">
                            <div class="form-group">
                                <label class="form-label">Cliente *</label>
                                <select class="form-control" id="sale-customer" required>
                                    <option value="">Seleccionar cliente</option>
                                    ${this.customers.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Estado</label>
                                <select class="form-control" id="sale-status">
                                    <option value="cotizacion">Cotización</option>
                                    <option value="vendido">Vendido</option>
                                    <option value="entregado">Entregado</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Total</label>
                                <input type="number" class="form-control" id="sale-total" step="0.01" min="0" value="0">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Notas</label>
                                <textarea class="form-control" id="sale-notes" rows="3"></textarea>
                            </div>
                            <div class="modal-actions">
                                <button type="button" class="btn btn-secondary" onclick="adminManager.closeModal('sale-modal')">
                                    Cancelar
                                </button>
                                <button type="submit" class="btn btn-primary">
                                    <i class="fas fa-save"></i> Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('modals-container').innerHTML += modalHTML;
    }

    async saveSale() {
        const saleData = {
            cliente_id: parseInt(document.getElementById('sale-customer').value),
            estado: document.getElementById('sale-status').value,
            total: parseFloat(document.getElementById('sale-total').value) || 0,
            notas: document.getElementById('sale-notes').value.trim()
        };

        if (!saleData.cliente_id) {
            this.showToast('Debe seleccionar un cliente', 'warning');
            return;
        }

        try {
            const response = await fetch(`${this.baseUrl}/ventas.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(saleData)
            });

            if (!response.ok) throw new Error('Error al guardar venta');
            
            const result = await response.json();
            if (result.success) {
                this.showToast('Venta creada exitosamente', 'success');
                this.closeModal('sale-modal');
                await this.loadSalesFromAPI();
                this.renderSales();
                this.updateDashboardStats();
            } else {
                this.showToast(result.error || 'Error al guardar venta', 'error');
            }
        } catch (error) {
            console.error('Error guardando venta:', error);
            this.showToast('Error al guardar venta', 'error');
        }
    }

    // ===========================================
    // UTILIDADES
    // ===========================================

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;

        const iconMap = {
            'success': 'check',
            'error': 'times',
            'warning': 'exclamation',
            'info': 'info'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${iconMap[type]}"></i>
            <span>${message}</span>
        `;

        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 4000);
    }

    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('mobile-open');
    }

    logout() {
        if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
            window.location.href = '../public/index.html';
        }
    }

    exportData() {
        this.showToast('Función de exportación próximamente', 'info');
    }

    importProducts() {
        this.showToast('Función de importación próximamente', 'info');
    }

    generateReport() {
        this.showToast('Función de reportes próximamente', 'info');
    }

    backupData() {
        this.showToast('Función de respaldo próximamente', 'info');
    }

    restoreData() {
        this.showToast('Función de restauración próximamente', 'info');
    }

    resetData() {
        this.showToast('Función de restablecimiento próximamente', 'info');
    }
}

// Funciones globales para compatibilidad
window.showPage = (pageId) => window.adminManager.showPage(pageId);
window.openProductModal = (productId) => window.adminManager.openProductModal(productId);
window.saveProduct = () => window.adminManager.saveProduct();
window.editProduct = (id) => window.adminManager.editProduct(id);
window.deleteProduct = (id) => window.adminManager.deleteProduct(id);
window.openCategoryModal = (categoryId) => window.adminManager.openCategoryModal(categoryId);
window.saveCategory = () => window.adminManager.saveCategory();
window.editCategory = (id) => window.adminManager.editCategory(id);
window.deleteCategory = (id) => window.adminManager.deleteCategory(id);
window.openCustomerModal = (customerId) => window.adminManager.openCustomerModal(customerId);
window.saveCustomer = () => window.adminManager.saveCustomer();
window.editCustomer = (id) => window.adminManager.editCustomer(id);
window.deleteCustomer = (id) => window.adminManager.deleteCustomer(id);
window.openSaleModal = () => window.adminManager.openSaleModal();
window.closeModal = (modalId) => window.adminManager.closeModal(modalId);

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    window.adminManager = new AdminManager();
});