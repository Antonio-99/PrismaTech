/**
 * AdminManager - Módulo de gestión del panel de administración
 * Conectado a APIs PHP del backend
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

    loadDashboard() {
        document.getElementById('total-products').textContent = this.products.length;
        document.getElementById('total-categories').textContent = this.categories.length;
        document.getElementById('total-quotes').textContent = this.sales.filter(s => s.estado === 'cotizacion').length;
        document.getElementById('total-customers').textContent = this.customers.length;
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
        
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        const categoryFilterValue = categoryFilter ? categoryFilter.value : '';

        let filteredProducts = this.products.filter(product => {
            const matchesSearch = !searchTerm || 
                product.nombre.toLowerCase().includes(searchTerm) ||
                product.sku.toLowerCase().includes(searchTerm);
            const matchesCategory = !categoryFilterValue || product.categoria_id == categoryFilterValue;
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
            const statusBadge = product.estado === 'active' ? 
                '<span class="badge badge-success">Activo</span>' : 
                '<span class="badge badge-warning">Inactivo</span>';
            
            return `
                <tr>
                    <td>
                        <div><strong>${product.nombre}</strong></div>
                        <small style="color: var(--gray-500);">${product.descripcion || ''}</small>
                    </td>
                    <td>${product.categoria || 'Sin categoría'}</td>
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
            nombre: document.getElementById('product-name').value,
            categoria_id: parseInt(document.getElementById('product-category').value),
            sku: document.getElementById('product-sku').value,
            precio: parseFloat(document.getElementById('product-price').value),
            stock: parseInt(document.getElementById('product-stock').value),
            stock_minimo: parseInt(document.getElementById('product-min-stock').value),
            descripcion: document.getElementById('product-description').value,
            estado: 'active'
        };

        if (!productData.nombre || !productData.categoria_id || !productData.sku || !productData.precio) {
            this.showToast('Por favor completa todos los campos requeridos', 'warning');
            return;
        }

        try {
            let response;
            if (id) {
                // Actualizar producto existente
                productData.id = id;
                response = await fetch(`${this.baseUrl}/productos.php`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(productData)
                });
            } else {
                // Crear nuevo producto
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
                this.loadDashboard();
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
                body: JSON.stringify({ id: id })
            });

            if (!response.ok) throw new Error('Error al eliminar producto');
            
            const result = await response.json();
            if (result.success) {
                this.showToast('Producto eliminado', 'success');
                await this.loadProductsFromAPI();
                this.renderProducts();
                this.loadDashboard();
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
        
        tbody.innerHTML = this.categories.map(category => {
            const productCount = this.products.filter(p => p.categoria_id === category.id).length;
            return `
                <tr>
                    <td><strong>${category.nombre}</strong></td>
                    <td>${category.descripcion || ''}</td>
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
            nombre: document.getElementById('category-name').value,
            descripcion: document.getElementById('category-description').value
        };

        if (!categoryData.nombre) {
            this.showToast('Por favor ingresa el nombre de la categoría', 'warning');
            return;
        }

        try {
            let response;
            if (id) {
                categoryData.id = id;
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
                this.loadDashboard();
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
                body: JSON.stringify({ id: id })
            });

            if (!response.ok) throw new Error('Error al eliminar categoría');
            
            const result = await response.json();
            if (result.success) {
                this.showToast('Categoría eliminada', 'success');
                await this.loadCategoriesFromAPI();
                this.renderCategories();
                this.loadDashboard();
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
        
        tbody.innerHTML = this.customers.map(customer => `
            <tr>
                <td><strong>${customer.nombre}</strong></td>
                <td>${customer.email || ''}</td>
                <td>${customer.telefono || ''}</td>
                <td>-</td>
                <td>-</td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="adminManager.editCustomer(${customer.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="adminManager.deleteCustomer(${customer.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
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
            nombre: document.getElementById('customer-name').value,
            email: document.getElementById('customer-email').value,
            telefono: document.getElementById('customer-phone').value
        };

        if (!customerData.nombre) {
            this.showToast('Por favor ingresa el nombre del cliente', 'warning');
            return;
        }

        try {
            let response;
            if (id) {
                customerData.id = id;
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
                this.loadDashboard();
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
        if (!confirm('¿Estás seguro de que quieres eliminar este cliente?')) return;

        try {
            const response = await fetch(`${this.baseUrl}/clientes.php`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: id })
            });

            if (!response.ok) throw new Error('Error al eliminar cliente');
            
            const result = await response.json();
            if (result.success) {
                this.showToast('Cliente eliminado', 'success');
                await this.loadCustomersFromAPI();
                this.renderCustomers();
                this.loadDashboard();
            }
        } catch (error) {
            console.error('Error eliminando cliente:', error);
            this.showToast('Error al eliminar cliente', 'error');
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
            const statusClass = sale.estado === 'vendido' ? 'badge-success' : 
                              sale.estado === 'entregado' ? 'badge-success' : 'badge-warning';
            
            return `
                <tr>
                    <td>${new Date(sale.fecha).toLocaleDateString('es-MX')}</td>
                    <td><strong>${sale.cliente || 'Cliente no especificado'}</strong></td>
                    <td>-</td>
                    <td>$${parseFloat(sale.total || 0).toLocaleString('es-MX')}</td>
                    <td><span class="badge ${statusClass}">${sale.estado}</span></td>
                    <td>
                        <button class="btn btn-sm btn-info" onclick="adminManager.viewSale(${sale.id})">
                            <i class="fas fa-eye"></i>
                        </button>
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
        if (sale) {
            alert(`Venta ID: ${sale.id}\nCliente: ${sale.cliente}\nTotal: $${sale.total}\nEstado: ${sale.estado}`);
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
                                    <input type="number" class="form-control" id="product-price" step="0.01" required>
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Stock</label>
                                    <input type="number" class="form-control" id="product-stock" value="0">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Stock Mínimo</label>
                                    <input type="number" class="form-control" id="product-min-stock" value="5">
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
                        <p>Función de ventas próximamente disponible</p>
                        <div class="modal-actions">
                            <button type="button" class="btn btn-secondary" onclick="adminManager.closeModal('sale-modal')">
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('modals-container').innerHTML += modalHTML;
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

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : type === 'warning' ? 'exclamation' : 'info'}"></i>
            <span>${message}</span>
        `;

        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 4000);
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

    adjustInventory() {
        this.showToast('Función de ajuste de inventario próximamente', 'info');
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