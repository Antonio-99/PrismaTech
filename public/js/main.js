// public/js/main.js

/**
 * Archivo principal de inicialización
 */
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar la aplicación
    initializeApp();
});

/**
 * Inicializa todos los componentes de la aplicación
 */
function initializeApp() {
    try {
        // Cargar categorías
        productManager.loadCategories();
        
        // Cargar productos
        productManager.loadProducts();
        
        // Configurar búsqueda en tiempo real
        productManager.setupRealtimeSearch();
        
        // Configurar otros event listeners
        setupEventListeners();
        
        console.log('✅ Aplicación inicializada correctamente');
    } catch (error) {
        console.error('❌ Error al inicializar la aplicación:', error);
        showErrorMessage();
    }
}

/**
 * Configura los event listeners generales
 */
function setupEventListeners() {
    // Smooth scroll para anchors
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Animación del botón de WhatsApp al hacer scroll
    let scrollTimeout;
    window.addEventListener('scroll', () => {
        const whatsappFloat = document.querySelector('.whatsapp-float');
        if (whatsappFloat) {
            whatsappFloat.style.transform = 'scale(0.9)';
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                whatsappFloat.style.transform = '';
            }, 150);
        }
    });
}

/**
 * Muestra un mensaje de error si algo falla
 */
function showErrorMessage() {
    const productsGrid = document.getElementById('products-grid');
    if (productsGrid) {
        productsGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error al cargar los productos</h3>
                <p>Por favor, recarga la página o contacta al administrador</p>
                <button class="btn btn-whatsapp" onclick="location.reload()">
                    <i class="fas fa-redo"></i> Recargar página
                </button>
            </div>
        `;
    }
}

/**
 * Utilidad para formatear números como moneda
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(amount);
}

/**
 * Utilidad para obtener parámetros de URL
 */
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Exponer algunas utilidades globalmente si es necesario
window.appUtils = {
    formatCurrency,
    getUrlParameter
};