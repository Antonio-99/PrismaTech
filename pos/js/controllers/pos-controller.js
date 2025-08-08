// pos/js/controllers/pos-controller.js
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
        document.addEventListener('pos:customer-change', (e) => this.updateCustomerInfo(e.detail));
        document.addEventListener('pos:payment-method-change', (e) => this.