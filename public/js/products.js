//Gestión de productos
class ProductManager {
    constructor() {
        this.products = [];
        this.apiUrl = '/api/products/';
    }

    async loadProducts() {
        try {
            const response = await fetch(this.apiUrl + 'get.php');
            this.products = await response.json();
            this.renderProducts();
        } catch (error) {
            console.error('Error loading products:', error);
        }
    }

    renderProducts() {
        // Lógica de renderizado
    }
}