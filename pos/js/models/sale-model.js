// pos/js/models/sale-model.js
// ============================================
class SaleModel {
    constructor(data) {
        this.id = data.id;
        this.sale_number = data.sale_number;
        this.customer_name = data.customer_name;
        this.customer_phone = data.customer_phone;
        this.customer_email = data.customer_email;
        this.subtotal = parseFloat(data.subtotal);
        this.tax_amount = parseFloat(data.tax_amount);
        this.total = parseFloat(data.total);
        this.payment_method = data.payment_method;
        this.sale_date = new Date(data.sale_date);
        this.items = data.items || [];
    }
    
    /**
     * Generate receipt data
     */
    generateReceiptData() {
        return {
            company: {
                name: 'PrismaTech',
                address: 'Teziutlán, Puebla, México',
                phone: '(238) 123-4567',
                email: 'info@prismatech.mx'
            },
            sale: {
                number: this.sale_number,
                date: POSUtils.formatDate(this.sale_date),
                customer: this.customer_name,
                phone: this.customer_phone,
                email: this.customer_email
            },
            items: this.items.map(item => ({
                name: item.product_name,
                quantity: item.quantity,
                price: item.unit_price,
                total: item.subtotal
            })),
            totals: {
                subtotal: this.subtotal,
                tax: this.tax_amount,
                total: this.total
            },
            payment: {
                method: this.getPaymentMethodName(),
                amount: this.total
            }
        };
    }
    
    getPaymentMethodName() {
        const methods = {
            'efectivo': 'Efectivo',
            'tarjeta_debito': 'Tarjeta Débito',
            'tarjeta_credito': 'Tarjeta Crédito',
            'transferencia': 'Transferencia',
            'cheque': 'Cheque'
        };
        return methods[this.payment_method] || this.payment_method;
    }
}