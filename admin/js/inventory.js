//Gestion de inventario

class InventoryManager {
    constructor() {
        this.products = [];
        this.apiUrl = '/api/products/';
    }

    async createProduct(productData) {
        try {
            const response = await fetch(this.apiUrl + 'post.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(productData)
            });
            return await response.json();
        } catch (error) {
            console.error('Error creating product:', error);
        }
    }
}