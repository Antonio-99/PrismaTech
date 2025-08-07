// pos/js/models/product-model.js
// ============================================
class ProductModel {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.sku = data.sku;
        this.price = parseFloat(data.price);
        this.cost_price = parseFloat(data.cost_price || 0);
        this.stock = parseInt(data.stock);
        this.min_stock = parseInt(data.min_stock || 0);
        this.category_id = data.category_id;
        this.category_name = data.category_name;
        this.category_slug = data.category_slug;
        this.brand = data.brand;
        this.description = data.description;
        this.icon = data.icon || 'fas fa-cube';
        this.status = data.status;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }
    
    /**
     * Get stock status
     */
    getStockStatus() {
        if (this.stock === 0) return 'out';
        if (this.stock <= this.min_stock) return 'low';
        return 'normal';
    }
    
    /**
     * Check if product is available for sale
     */
    isAvailable() {
        return this.status === 'active' && this.stock > 0;
    }
    
    /**
     * Get profit margin
     */
    getProfitMargin() {
        if (this.cost_price === 0) return 0;
        return this.price - this.cost_price;
    }
    
    /**
     * Get profit percentage
     */
    getProfitPercentage() {
        if (this.cost_price === 0) return 0;
        return ((this.price - this.cost_price) / this.cost_price) * 100;
    }
    
    /**
     * Validate quantity for cart
     */
    validateQuantity(quantity) {
        const errors = [];
        
        if (quantity <= 0) {
            errors.push('La cantidad debe ser mayor a 0');
        }
        
        if (quantity > this.stock) {
            errors.push(`Solo hay ${this.stock} unidades disponibles`);
        }
        
        if (quantity > POSConfig.business.maxQuantityPerItem) {
            errors.push(`Cantidad máxima: ${POSConfig.business.maxQuantityPerItem}`);
        }
        
        return errors;
    }
    
    /**
     * Convert to plain object
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            sku: this.sku,
            price: this.price,
            cost_price: this.cost_price,
            stock: this.stock,
            min_stock: this.min_stock,
            category_id: this.category_id,
            category_name: this.category_name,
            category_slug: this.category_slug,
            brand: this.brand,
            description: this.description,
            icon: this.icon,
            status: this.status
        };
    }
}