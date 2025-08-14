// public/js/main.js

/**
 * Archivo principal de inicialización - Conectado directamente a APIs
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando aplicación PrismaTech...');
    
    // Inicializar la aplicación
    initializeApp();
});

/**
 * Inicializa todos los componentes de la aplicación
 */
function initializeApp() {
    try {
        // Mostrar mensaje de carga inicial
        showInitialLoading();
        
        // Configurar otros event listeners globales
        setupGlobalEventListeners();
        
        // Configurar características de accesibilidad
        setupAccessibility();
        
        // Configurar efectos visuales
        setupVisualEffects();
        
        console.log('✅ Aplicación inicializada correctamente');
        
        // Ocultar mensaje de carga después de un momento
        setTimeout(hideInitialLoading, 1000);
        
    } catch (error) {
        console.error('❌ Error al inicializar la aplicación:', error);
        showErrorMessage('Error al inicializar la aplicación. Por favor, recarga la página.');
    }
}

/**
 * Mostrar loading inicial
 */
function showInitialLoading() {
    const productsGrid = document.getElementById('products-grid');
    const categoriesGrid = document.getElementById('categories-grid');
    
    if (productsGrid) {
        productsGrid.innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
                <p>Cargando productos desde la base de datos...</p>
            </div>
        `;
    }
    
    if (categoriesGrid) {
        categoriesGrid.innerHTML = `
            <div class="loading" style="grid-column: 1 / -1;">
                <div class="loading-spinner"></div>
                <p>Cargando categorías...</p>
            </div>
        `;
    }
}

/**
 * Ocultar loading inicial
 */
function hideInitialLoading() {
    // El ProductManager se encargará de mostrar los datos reales
    console.log('🎯 Loading inicial completado');
}

/**
 * Configura los event listeners globales
 */
function setupGlobalEventListeners() {
    // Smooth scroll para anchors internos
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
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
    
    // Detectar cambios en la conectividad
    window.addEventListener('online', () => {
        console.log('🟢 Conexión restaurada');
        showTemporaryMessage('Conexión restaurada', 'success');
        
        // Intentar recargar datos si el ProductManager está disponible
        if (window.productManager) {
            window.productManager.refresh();
        }
    });
    
    window.addEventListener('offline', () => {
        console.log('🔴 Conexión perdida');
        showTemporaryMessage('Conexión perdida - usando datos en cache', 'warning');
    });
    
    // Manejar errores de JavaScript no capturados
    window.addEventListener('error', (event) => {
        console.error('Error global:', event.error);
        showTemporaryMessage('Se produjo un error inesperado', 'error');
    });
    
    // Manejar promesas rechazadas
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Promise rechazada:', event.reason);
        // No mostrar mensaje al usuario para promesas rechazadas menores
    });
}

/**
 * Configurar características de accesibilidad
 */
function setupAccessibility() {
    // Navegación con teclado para las tarjetas de categorías
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            const focused = document.activeElement;
            if (focused.classList.contains('category-card')) {
                e.preventDefault();
                focused.click();
            }
        }
    });
    
    // Añadir etiquetas ARIA donde sea necesario
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.setAttribute('aria-label', 'Buscar productos por nombre, SKU o número de parte');
    }
    
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) {
        categoryFilter.setAttribute('aria-label', 'Filtrar productos por categoría');
    }
    
    const brandFilter = document.getElementById('brand-filter');
    if (brandFilter) {
        brandFilter.setAttribute('aria-label', 'Filtrar productos por marca');
    }
    
    console.log('♿ Características de accesibilidad configuradas');
}

/**
 * Configurar efectos visuales
 */
function setupVisualEffects() {
    // Intersection Observer para animaciones al hacer scroll
    if ('IntersectionObserver' in window) {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);
        
        // Observar elementos que deben animarse
        setTimeout(() => {
            document.querySelectorAll('.product-card, .category-card').forEach(card => {
                card.style.opacity = '0';
                card.style.transform = 'translateY(20px)';
                card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                observer.observe(card);
            });
        }, 500);
    }
    
    // Efecto de ripple en botones
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn') || e.target.closest('.btn')) {
            const button = e.target.classList.contains('btn') ? e.target : e.target.closest('.btn');
            const ripple = document.createElement('span');
            const rect = button.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                transform: scale(0);
                animation: ripple 0.6s linear;
                pointer-events: none;
            `;
            
            button.style.position = 'relative';
            button.style.overflow = 'hidden';
            button.appendChild(ripple);
            
            setTimeout(() => ripple.remove(), 600);
        }
    });
    
    // Añadir CSS de animación de ripple si no existe
    if (!document.querySelector('#ripple-animation')) {
        const style = document.createElement('style');
        style.id = 'ripple-animation';
        style.textContent = `
            @keyframes ripple {
                to {
                    transform: scale(4);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    console.log('✨ Efectos visuales configurados');
}

/**
 * Muestra un mensaje de error si algo falla
 */
function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #ef4444;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        z-index: 9999;
        font-weight: 600;
        box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
        max-width: 90%;
        text-align: center;
    `;
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle" style="margin-right: 8px;"></i>
        ${message}
        <button onclick="this.parentElement.remove()" 
                style="background: none; border: none; color: white; margin-left: 10px; cursor: pointer; font-size: 16px;">
            ✕
        </button>
    `;
    
    document.body.appendChild(errorDiv);
    
    // Auto-remover después de 8 segundos
    setTimeout(() => {
        if (errorDiv.parentElement) {
            errorDiv.remove();
        }
    }, 8000);
}

/**
 * Mostrar mensaje temporal
 */
function showTemporaryMessage(message, type = 'info') {
    const colors = {
        'success': '#10b981',
        'warning': '#f59e0b',
        'error': '#ef4444',
        'info': '#3b82f6'
    };
    
    const icons = {
        'success': 'check-circle',
        'warning': 'exclamation-triangle',
        'error': 'times-circle',
        'info': 'info-circle'
    };
    
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${colors[type]};
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        z-index: 1000;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        transform: translateX(100%);
        transition: transform 0.3s ease;
        max-width: 300px;
    `;
    
    messageDiv.innerHTML = `
        <i class="fas fa-${icons[type]}" style="margin-right: 8px;"></i>
        ${message}
    `;
    
    document.body.appendChild(messageDiv);
    
    // Mostrar con animación
    setTimeout(() => messageDiv.style.transform = 'translateX(0)', 100);
    
    // Ocultar después de 4 segundos
    setTimeout(() => {
        messageDiv.style.transform = 'translateX(100%)';
        setTimeout(() => messageDiv.remove(), 300);
    }, 4000);
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

/**
 * Utilidad para detectar dispositivo móvil
 */
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Utilidad para copiar texto al portapapeles
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showTemporaryMessage('Copiado al portapapeles', 'success');
        return true;
    } catch (err) {
        console.error('Error al copiar:', err);
        showTemporaryMessage('Error al copiar', 'error');
        return false;
    }
}

/**
 * Utilidad para validar email
 */
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

/**
 * Utilidad para formatear fechas
 */
function formatDate(date, options = {}) {
    const defaultOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    
    return new Date(date).toLocaleDateString('es-MX', { ...defaultOptions, ...options });
}

/**
 * Monitoreo de rendimiento
 */
function setupPerformanceMonitoring() {
    if ('performance' in window) {
        window.addEventListener('load', () => {
            setTimeout(() => {
                const navigation = performance.getEntriesByType('navigation')[0];
                const loadTime = navigation.loadEventEnd - navigation.fetchStart;
                
                console.log(`⚡ Tiempo de carga: ${Math.round(loadTime)}ms`);
                
                // Si la carga es muy lenta, mostrar sugerencia
                if (loadTime > 3000) {
                    console.warn('🐌 Carga lenta detectada');
                }
            }, 0);
        });
    }
}

// Inicializar monitoreo de rendimiento
setupPerformanceMonitoring();

// Exponer utilidades globalmente
window.appUtils = {
    formatCurrency,
    getUrlParameter,
    isMobileDevice,
    copyToClipboard,
    validateEmail,
    formatDate,
    showTemporaryMessage,
    showErrorMessage
};

// Debug: Exponer productManager en consola para desarrollo
if (typeof console !== 'undefined') {
    console.log('🔧 Para debug: window.productManager disponible en consola');
    console.log('📊 Estadísticas: productManager.getStats()');
    console.log('🔍 Buscar por SKU: productManager.findBySKU("SKU-123")');
    console.log('🔄 Refrescar datos: productManager.refresh()');
}