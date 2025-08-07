// pos/js/models/cart-model.js
// ============================================
class CartModel {
    constructor() {
        this.items = new Map();
        this.customer = {
            name: '',
            phone: '',
            email: ''
        };
        this.paymentMethod = 'efectivo';
        this.notes = '';
        this.loadFromStorage();
    }
    
    /**
     * Add product to cart
     */
    addProduct(product, quantity = 1) {
        const validation = this.validateAddProduct(product, quantity);
        if (validation.length > 0) {
            throw new ValidationError('quantity', validation.join(', '));
        }
        
        const existingItem = this.items.get(product.id);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            this.items.set(product.id, {
                product_id: product.id,
                name: product.name,
                sku: product.sku,
                price: product.price,
                cost_price: product.cost_price,
                quantity: quantity,
                stock: product.stock
            });
        }
        
        this.saveToStorage();
        return this.items.get(product.id);
    }
    
    /**
     * Update item quantity
     */
    updateQuantity(productId, quantity) {
        const item = this.items.get(productId);
        if (!item) return false;
        
        if (quantity <= 0) {
            return this.removeProduct(productId);
        }
        
        if (quantity > item.stock) {
            throw new ValidationError('quantity', `Solo hay ${item.stock} unidades disponibles`);
        }
        
        item.quantity = quantity;
        this.saveToStorage();
        return true;
    }
    
    /**
     * Remove product from cart
     */
    removeProduct(productId) {
        const removed = this.items.delete(productId);
        if (removed) {
            this.saveToStorage();
        }
        return removed;
    }
    
    /**
     * Clear entire cart
     */
    clear() {
        this.items.clear();
        this.customer = { name: '', phone: '', email: '' };
        this.paymentMethod = 'efectivo';
        this.notes = '';
        this.saveToStorage();
    }
    
    /**
     * Get cart items as array
     */
    getItems() {
        return Array.from(this.items.values());
    }
    
    /**
     * Get item count
     */
    getItemCount() {
        return Array.from(this.items.values()).reduce((sum, item) => sum + item.quantity, 0);
    }
    
    /**
     * Calculate totals
     */
    getTotals() {
        const subtotal = this.getItems().reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = subtotal * POSConfig.business.taxRate;
        const total = subtotal + tax;
        
        return {
            subtotal: subtotal,
            tax: tax,
            total: total,
            itemCount: this.getItemCount()
        };
    }
    
    /**
     * Validate entire cart for checkout
     */
    validateForCheckout() {
        const errors = [];
        
        if (this.items.size === 0) {
            errors.push('El carrito está vacío');
        }
        
        if (!this.customer.name.trim()) {
            errors.push('El nombre del cliente es requerido');
        }
        
        if (this.customer.email && !POSUtils.validateEmail(this.customer.email)) {
            errors.push('Email inválido');
        }
        
        if (this.customer.phone && !POSUtils.validatePhone(this.customer.phone)) {
            errors.push('Teléfono inválido');
        }
        
        // Validate each item
        this.getItems().forEach(item => {
            if (item.quantity > item.stock) {
                errors.push(`${item.name}: cantidad excede stock disponible`);
            }
        });
        
        return errors;
    }
    
    /**
     * Validate adding product
     */
    validateAddProduct(product, quantity) {
        const errors = [];
        
        if (!product.isAvailable()) {
            errors.push('Producto no disponible');
        }
        
        const currentQuantity = this.items.get(product.id)?.quantity || 0;
        const totalQuantity = currentQuantity + quantity;
        
        const quantityErrors = product.validateQuantity(totalQuantity);
        errors.push(...quantityErrors);
        
        if (this.items.size >= POSConfig.business.maxCartItems) {
            errors.push(`Máximo ${POSConfig.business.maxCartItems} productos en el carrito`);
        }
        
        return errors;
    }
    
    /**
     * Convert to sale data format
     */
    toSaleData() {
        return {
            customer_name: this.customer.name,
            customer_phone: this.customer.phone || null,
            customer_email: this.customer.email || null,
            payment_method: this.paymentMethod,
            notes: this.notes || null,
            items: this.getItems().map(item => ({
                product_id: item.product_id,
                quantity: item.quantity,
                unit_price: item.price
            }))
        };
    }
    
    /**
     * Save to localStorage
     */
    saveToStorage() {
        const data = {
            items: Array.from(this.items.entries()),
            customer: this.customer,
            paymentMethod: this.paymentMethod,
            notes: this.notes
        };
        StorageService.save(POSConfig.storage.cart, data);
    }
    
    /**
     * Load from localStorage
     */
    loadFromStorage() {
        const data = StorageService.load(POSConfig.storage.cart, {});
        
        if (data.items) {
            this.items = new Map(data.items);
        }
        
        if (data.customer) {
            this.customer = { ...this.customer, ...data.customer };
        }
        
        if (data.paymentMethod) {
            this.paymentMethod = data.paymentMethod;
        }
        
        if (data.notes) {
            this.notes = data.notes;
        }
    }
}