/ pos/js/controllers/pos-controller.js
// ============================================
class POSController {
    constructor() {
        this.apiService = new APIService();
        this.audioService = new AudioService();
        this.cart = new CartModel();
        this.products = [];
        this.categories = [];
        this.currentCategory = 'all';
        this.searchTerm = '';
        
        this.views = {
            header: new HeaderView(),
            products: new ProductsView(),
            cart: new CartView()
        };
        
        this.initializeEventListeners();
        this.loadInitialData();
    }
    
    async loadInitialData() {
        try {
            this.showLoading(true);
            
            // Load products and categories in parallel
            const [productsResponse, categoriesResponse] = await Promise.all([
                this.apiService.get(POSConfig.api.endpoints.products, { limit: 200, status: 'active' }),
                this.apiService.get(POSConfig.api.endpoints.categories, { status: 'active' })
            ]);
            
            this.products = productsResponse.data.data.map(p => new ProductModel(p));
            this.categories = categoriesResponse.data.data;
            
            this.renderAll();
            
        } catch (error) {
            console.error('Failed to load initial data:', error);
            POSUtils.showToast('Error al cargar datos iniciales', 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    initializeEventListeners() {
        // Debounced search
        const debouncedSearch = POSUtils.debounce((term) => {
            this.searchTerm = term;
            this.filterAndRenderProducts();
        }, POSConfig.ui.searchDelay);
        
        // Global event listeners
        document.addEventListener('pos:search', (e) => debouncedSearch(e.detail.term));
        document.addEventListener('pos:category-change', (e) => this.selectCategory(e.detail.category));
        document.addEventListener('pos:add-to-cart', (e) => this.addToCart(e.detail.productId, e.detail.quantity));
        document.addEventListener('pos:remove-from-cart', (e) => this.removeFromCart(e.detail.productId));
        document.addEventListener('pos:update-quantity', (e) => this.updateQuantity(e.detail.productId, e.detail.quantity));
        document.addEventListener('pos:clear-cart', () => this.clearCart());
        document.addEventListener('pos:checkout', () => this.processCheckout());
        document.addEventListener('pos:create-quote', () => this.createQuote());
    }
    
    renderAll() {
        this.views.header.render();
        this.views.products.render(this.getFilteredProducts(), this.categories);
        this.views.cart.render(this.cart);
    }
    
    selectCategory(category) {
        this.currentCategory = category;
        this.filterAndRenderProducts();
    }
    
    filterAndRenderProducts() {
        const filteredProducts = this.getFilteredProducts();
        this.views.products.render(filteredProducts, this.categories);
    }
    
    getFilteredProducts() {
        let filtered = [...this.products];
        
        // Category filter
        if (this.currentCategory !== 'all') {
            filtered = filtered.filter(p => p.category_slug === this.currentCategory);
        }
        
        // Search filter
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            filtered = filtered.filter(p => 
                p.name.toLowerCase().includes(term) ||
                p.sku.toLowerCase().includes(term) ||
                (p.brand && p.brand.toLowerCase().includes(term))
            );
        }
        
        return filtered;
    }
    
    addToCart(productId, quantity = 1) {
        try {
            const product = this.products.find(p => p.id === productId);
            if (!product) {
                throw new Error('Producto no encontrado');
            }
            
            this.cart.addProduct(product, quantity);
            this.views.cart.render(this.cart);
            this.audioService.play('addToCart');
            POSUtils.showToast(`${product.name} agregado al carrito`, 'success');
            
        } catch (error) {
            console.error('Add to cart error:', error);
            POSUtils.showToast(error.message, 'error');
            this.audioService.play('error');
        }
    }
    
    removeFromCart(productId) {
        try {
            const item = this.cart.items.get(productId);
            if (item && this.cart.removeProduct(productId)) {
                this.views.cart.render(this.cart);
                this.audioService.play('removeFromCart');
                POSUtils.showToast(`${item.name} removido del carrito`, 'info');
            }
        } catch (error) {
            console.error('Remove from cart error:', error);
            POSUtils.showToast('Error al remover producto', 'error');
        }
    }
    
    updateQuantity(productId, quantity) {
        try {
            this.cart.updateQuantity(productId, quantity);
            this.views.cart.render(this.cart);
        } catch (error) {
            console.error('Update quantity error:', error);
            POSUtils.showToast(error.message, 'error');
            this.views.cart.render(this.cart); // Re-render to reset input
        }
    }
    
    clearCart() {
        if (this.cart.getItemCount() === 0) return;
        
        if (confirm('¿Estás seguro de vaciar el carrito?')) {
            this.cart.clear();
            this.views.cart.render(this.cart);
            POSUtils.showToast('Carrito vaciado', 'info');
        }
    }
    
    async processCheckout() {
        try {
            const validationErrors = this.cart.validateForCheckout();
            if (validationErrors.length > 0) {
                POSUtils.showToast(validationErrors[0], 'error');
                return;
            }
            
            this.showLoading(true);
            
            const saleData = this.cart.toSaleData();
            const response = await this.apiService.post(POSConfig.api.endpoints.sales, saleData);
            
            const sale = new SaleModel(response.data.sale);
            this.showSaleSuccess(sale);
            this.cart.clear();
            this.views.cart.render(this.cart);
            this.audioService.play('sale');
            
            // Refresh products to update stock
            await this.loadInitialData();
            
        } catch (error) {
            console.error('Checkout error:', error);
            POSUtils.showToast('Error al procesar la venta: ' + error.message, 'error');
            this.audioService.play('error');
        } finally {
            this.showLoading(false);
        }
    }
    
    async createQuote() {
        try {
            const validationErrors = this.cart.validateForCheckout();
            if (validationErrors.length > 0) {
                POSUtils.showToast(validationErrors[0], 'error');
                return;
            }
            
            this.showLoading(true);
            
            const quoteData = this.cart.toSaleData();
            const response = await this.apiService.post(POSConfig.api.endpoints.quotes, quoteData);
            
            POSUtils.showToast(`Cotización creada: ${response.data.quote_number}`, 'success');
            this.cart.clear();
            this.views.cart.render(this.cart);
            
        } catch (error) {
            console.error('Quote error:', error);
            POSUtils.showToast('Error al crear cotización: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    showSaleSuccess(sale) {
        // Implementation would show success modal with receipt
        console.log('Sale completed:', sale);
    }
    
    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        if (show) {
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }
}
