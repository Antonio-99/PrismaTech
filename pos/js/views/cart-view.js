// pos/js/views/cart-view.js
// ============================================
class CartView {
    constructor() {
        this.container = document.getElementById('cart-panel');
        this.itemsContainer = null;
        this.totalsContainer = null;
        this.customerForm = null;
    }
    
    render(cart) {
        this.container.innerHTML = this.getTemplate();
        this.bindElements();
        this.renderItems(cart);
        this.renderTotals(cart);
        this.renderCustomerForm(cart);
        this.bindEvents();
        
        // Update header cart badge
        document.querySelector('.header-view')?.updateCartBadge(cart.getItemCount());
    }
    
    getTemplate() {
        return `
            <div class="cart-header">
                <div class="cart-title">
                    <span>Carrito de Compras</span>
                    <button class="cart-clear-btn hidden" id="clear-cart-btn" title="Vaciar carrito">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="cart-summary" id="cart-summary"></div>
            </div>
            
            <div class="cart-customer">
                <h3 class="section-title">Información del Cliente</h3>
                <form class="customer-form" id="customer-form">
                    <div class="form-group">
                        <input type="text" 
                               id="customer-name" 
                               class="form-input required"
                               placeholder="Nombre del cliente *" 
                               required>
                        <div class="form-error hidden"></div>
                    </div>
                    
                    <div class="form-group">
                        <input type="tel" 
                               id="customer-phone" 
                               class="form-input"
                               placeholder="Teléfono (opcional)">
                        <div class="form-error hidden"></div>
                    </div>
                    
                    <div class="form-group">
                        <input type="email" 
                               id="customer-email" 
                               class="form-input"
                               placeholder="Email (opcional)">
                        <div class="form-error hidden"></div>
                    </div>
                </form>
            </div>
            
            <div class="cart-items" id="cart-items">
                <div class="cart-empty" id="cart-empty">
                    <div class="empty-icon">
                        <i class="fas fa-shopping-cart"></i>
                    </div>
                    <div class="empty-text">El carrito está vacío</div>
                    <div class="empty-subtext">Selecciona productos para agregar</div>
                </div>
            </div>
            
            <div class="cart-footer hidden" id="cart-footer">
                <div class="cart-totals" id="cart-totals"></div>
                
                <div class="payment-methods">
                    <h3 class="section-title">Método de Pago</h3>
                    <div class="payment-options">
                        <label class="payment-option active">
                            <input type="radio" name="payment-method" value="efectivo" checked>
                            <div class="payment-content">
                                <i class="fas fa-money-bill-wave"></i>
                                <span>Efectivo</span>
                            </div>
                        </label>
                        
                        <label class="payment-option">
                            <input type="radio" name="payment-method" value="tarjeta_debito">
                            <div class="payment-content">
                                <i class="fas fa-credit-card"></i>
                                <span>Tarjeta Débito</span>
                            </div>
                        </label>
                        
                        <label class="payment-option">
                            <input type="radio" name="payment-method" value="tarjeta_credito">
                            <div class="payment-content">
                                <i class="fab fa-cc-visa"></i>
                                <span>Tarjeta Crédito</span>
                            </div>
                        </label>
                        
                        <label class="payment-option">
                            <input type="radio" name="payment-method" value="transferencia">
                            <div class="payment-content">
                                <i class="fas fa-exchange-alt"></i>
                                <span>Transferencia</span>
                            </div>
                        </label>
                    </div>
                </div>
                
                <div class="cart-actions">
                    <button class="btn btn-secondary" id="quote-btn">
                        <i class="fas fa-file-invoice"></i>
                        <span>Cotizar</span>
                    </button>
                    
                    <button class="btn btn-primary" id="checkout-btn" disabled>
                        <i class="fas fa-cash-register"></i>
                        <span>Cobrar</span>
                    </button>
                </div>
            </div>
        `;
    }
    
    bindElements() {
        this.itemsContainer = document.getElementById('cart-items');
        this.totalsContainer = document.getElementById('cart-totals');
        this.customerForm = document.getElementById('customer-form');
        this.cartFooter = document.getElementById('cart-footer');
        this.cartEmpty = document.getElementById('cart-empty');
        this.clearCartBtn = document.getElementById('clear-cart-btn');
    }
    
    renderItems(cart) {
        const items = cart.getItems();
        
        if (items.length === 0) {
            this.showEmptyCart();
            return;
        }
        
        this.showCartContent();
        
        const itemsHTML = items.map(item => this.createCartItem(item)).join('');
        this.itemsContainer.innerHTML = itemsHTML;
        
        // Show clear button
        this.clearCartBtn.classList.remove('hidden');
    }
    
    createCartItem(item) {
        return `
            <div class="cart-item" data-product-id="${item.product_id}">
                <div class="item-info">
                    <div class="item-name">${POSUtils.sanitizeHTML(item.name)}</div>
                    <div class="item-details">
                        <span class="item-sku">SKU: ${item.sku}</span>
                        <span class="item-price">${POSUtils.formatCurrency(item.price)} c/u</span>
                    </div>
                </div>
                
                <div class="item-controls">
                    <div class="quantity-controls">
                        <button class="qty-btn qty-decrease" 
                                data-product-id="${item.product_id}"
                                ${item.quantity <= 1 ? 'disabled' : ''}>
                            <i class="fas fa-minus"></i>
                        </button>
                        
                        <input type="number" 
                               class="qty-input" 
                               value="${item.quantity}"
                               min="1" 
                               max="${item.stock}"
                               data-product-id="${item.product_id}">
                        
                        <button class="qty-btn qty-increase" 
                                data-product-id="${item.product_id}"
                                ${item.quantity >= item.stock ? 'disabled' : ''}>
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                    
                    <button class="item-remove" 
                            data-product-id="${item.product_id}"
                            title="Remover producto">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="item-total">
                    ${POSUtils.formatCurrency(item.price * item.quantity)}
                </div>
            </div>
        `;
    }
    
    renderTotals(cart) {
        const totals = cart.getTotals();
        
        this.totalsContainer.innerHTML = `
            <div class="total-row">
                <span class="total-label">Subtotal:</span>
                <span class="total-value">${POSUtils.formatCurrency(totals.subtotal)}</span>
            </div>
            
            <div class="total-row">
                <span class="total-label">IVA (${(POSConfig.business.taxRate * 100).toFixed(0)}%):</span>
                <span class="total-value">${POSUtils.formatCurrency(totals.tax)}</span>
            </div>
            
            <div class="total-row total-final">
                <span class="total-label">Total:</span>
                <span class="total-value">${POSUtils.formatCurrency(totals.total)}</span>
            </div>
        `;
        
        // Update summary in header
        document.getElementById('cart-summary').innerHTML = `
            <div class="summary-items">${totals.itemCount} productos</div>
            <div class="summary-total">${POSUtils.formatCurrency(totals.total)}</div>
        `;
    }
    
    renderCustomerForm(cart) {
        // Populate form with cart data
        document.getElementById('customer-name').value = cart.customer.name;
        document.getElementById('customer-phone').value = cart.customer.phone;
        document.getElementById('customer-email').value = cart.customer.email;
        
        // Set payment method
        const paymentRadio = document.querySelector(`input[name="payment-method"][value="${cart.paymentMethod}"]`);
        if (paymentRadio) {
            paymentRadio.checked = true;
            this.updatePaymentMethodUI(cart.paymentMethod);
        }
    }
    
    bindEvents() {
        // Cart item controls
        this.itemsContainer.addEventListener('click', (e) => {
            const productId = parseInt(e.target.dataset.productId);
            if (!productId) return;
            
            if (e.target.classList.contains('qty-decrease')) {
                const input = e.target.parentElement.querySelector('.qty-input');
                const newQty = parseInt(input.value) - 1;
                this.updateQuantity(productId, newQty);
            } else if (e.target.classList.contains('qty-increase')) {
                const input = e.target.parentElement.querySelector('.qty-input');
                const newQty = parseInt(input.value) + 1;
                this.updateQuantity(productId, newQty);
            } else if (e.target.classList.contains('item-remove')) {
                this.removeItem(productId);
            }
        });
        
        // Quantity input changes
        this.itemsContainer.addEventListener('change', (e) => {
            if (e.target.classList.contains('qty-input')) {
                const productId = parseInt(e.target.dataset.productId);
                const quantity = parseInt(e.target.value);
                this.updateQuantity(productId, quantity);
            }
        });
        
        // Customer form
        this.customerForm.addEventListener('input', (e) => {
            this.validateAndSaveCustomerData();
        });
        
        // Payment methods
        document.addEventListener('change', (e) => {
            if (e.target.name === 'payment-method') {
                this.updatePaymentMethodUI(e.target.value);
                this.dispatchEvent('pos:payment-method-change', { method: e.target.value });
            }
        });
        
        // Action buttons
        document.getElementById('clear-cart-btn').addEventListener('click', () => {
            this.dispatchEvent('pos:clear-cart');
        });
        
        document.getElementById('quote-btn').addEventListener('click', () => {
            this.dispatchEvent('pos:create-quote');
        });
        
        document.getElementById('checkout-btn').addEventListener('click', () => {
            this.dispatchEvent('pos:checkout');
        });
    }
    
    updateQuantity(productId, quantity) {
        this.dispatchEvent('pos:update-quantity', { productId, quantity });
    }
    
    removeItem(productId) {
        this.dispatchEvent('pos:remove-from-cart', { productId });
    }
    
    validateAndSaveCustomerData() {
        const name = document.getElementById('customer-name').value.trim();
        const phone = document.getElementById('customer-phone').value.trim();
        const email = document.getElementById('customer-email').value.trim();
        
        // Validation
        const nameValid = name.length >= 2;
        const phoneValid = !phone || POSUtils.validatePhone(phone);
        const emailValid = !email || POSUtils.validateEmail(email);
        
        // Update UI
        this.updateFieldValidation('customer-name', nameValid, 'Nombre debe tener al menos 2 caracteres');
        this.updateFieldValidation('customer-phone', phoneValid, 'Formato de teléfono inválido');
        this.updateFieldValidation('customer-email', emailValid, 'Email inválido');
        
        // Enable/disable checkout button
        const checkoutBtn = document.getElementById('checkout-btn');
        checkoutBtn.disabled = !(nameValid && phoneValid && emailValid);
        
        // Save to cart if valid
        if (nameValid && phoneValid && emailValid) {
            this.dispatchEvent('pos:customer-change', { name, phone, email });
        }
    }
    
    updateFieldValidation(fieldId, isValid, errorMessage) {
        const field = document.getElementById(fieldId);
        const errorDiv = field.parentElement.querySelector('.form-error');
        
        if (isValid) {
            field.classList.remove('error');
            errorDiv.classList.add('hidden');
        } else {
            field.classList.add('error');
            errorDiv.textContent = errorMessage;
            errorDiv.classList.remove('hidden');
        }
    }
    
    updatePaymentMethodUI(method) {
        document.querySelectorAll('.payment-option').forEach(option => {
            option.classList.remove('active');
        });
        
        const activeOption = document.querySelector(`input[value="${method}"]`).closest('.payment-option');
        activeOption.classList.add('active');
    }
    
    showEmptyCart() {
        this.cartEmpty.classList.remove('hidden');
        this.cartFooter.classList.add('hidden');
        this.clearCartBtn.classList.add('hidden');
    }
    
    showCartContent() {
        this.cartEmpty.classList.add('hidden');
        this.cartFooter.classList.remove('hidden');
    }
    
    dispatchEvent(type, detail = {}) {
        document.dispatchEvent(new CustomEvent(type, { detail }));
    }
}