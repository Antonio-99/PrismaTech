/**
 * Inicialización del panel de administración
 */

// Verificar que todos los scripts necesarios estén cargados
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando panel de administración...');
    
    // Verificar dependencias
    if (typeof AdminManager === 'undefined') {
        console.error('❌ AdminManager no está disponible');
        showErrorMessage('Error: No se pudo cargar el sistema de administración');
        return;
    }
    
    try {
        // La instancia se crea automáticamente en admin-manager.js
        console.log('✅ Panel de administración iniciado correctamente');
        
        // Configuraciones adicionales
        setupGlobalErrorHandling();
        setupKeyboardShortcuts();
        setupAutoSave();
        
    } catch (error) {
        console.error('❌ Error al inicializar:', error);
        showErrorMessage('Error al inicializar el panel de administración');
    }
});

/**
 * Configurar manejo global de errores
 */
function setupGlobalErrorHandling() {
    window.addEventListener('error', function(event) {
        console.error('Error global:', event.error);
        
        if (window.adminManager) {
            window.adminManager.showToast('Se produjo un error inesperado', 'error');
        }
    });
    
    window.addEventListener('unhandledrejection', function(event) {
        console.error('Promise rechazada:', event.reason);
        
        if (window.adminManager) {
            window.adminManager.showToast('Error en operación asíncrona', 'error');
        }
    });
}

/**
 * Configurar atajos de teclado
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(event) {
        // Ctrl/Cmd + S para guardar
        if ((event.ctrlKey || event.metaKey) && event.key === 's') {
            event.preventDefault();
            
            // Buscar formulario activo y guardarlo
            const activeModal = document.querySelector('.modal-overlay.active');
            if (activeModal) {
                const form = activeModal.querySelector('form');
                if (form) {
                    form.dispatchEvent(new Event('submit'));
                }
            }
        }
        
        // Escape para cerrar modales
        if (event.key === 'Escape') {
            const activeModal = document.querySelector('.modal-overlay.active');
            if (activeModal) {
                activeModal.classList.remove('active');
            }
        }
        
        // Ctrl/Cmd + N para nuevo
        if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
            event.preventDefault();
            
            const currentPage = window.adminManager?.currentPage;
            switch (currentPage) {
                case 'products':
                    window.adminManager.openProductModal();
                    break;
                case 'categories':
                    window.adminManager.openCategoryModal();
                    break;
                case 'customers':
                    window.adminManager.openCustomerModal();
                    break;
                case 'sales':
                    window.adminManager.openSaleModal();
                    break;
            }
        }
    });
}

/**
 * Configurar autoguardado
 */
function setupAutoSave() {
    // Autoguardar configuración de empresa cada 30 segundos si hay cambios
    let configChanged = false;
    
    const configInputs = document.querySelectorAll('#company-form input, #company-form textarea, #system-form input, #system-form select');
    configInputs.forEach(input => {
        input.addEventListener('change', () => {
            configChanged = true;
        });
    });
    
    setInterval(() => {
        if (configChanged && window.adminManager) {
            // Solo mostrar indicador de autoguardado, no guardar automáticamente
            // para evitar sobrescribir cambios no deseados
            console.log('💾 Configuración modificada (autoguardado disponible)');
            configChanged = false;
        }
    }, 30000);
}

/**
 * Mostrar mensaje de error
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
    `;
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

/**
 * Utilidades adicionales para el admin
 */
window.adminUtils = {
    /**
     * Formatear fecha para inputs
     */
    formatDateForInput: function(date) {
        if (!(date instanceof Date)) {
            date = new Date(date);
        }
        return date.toISOString().split('T')[0];
    },
    
    /**
     * Formatear fecha para mostrar
     */
    formatDateForDisplay: function(date) {
        if (!(date instanceof Date)) {
            date = new Date(date);
        }
        return date.toLocaleDateString('es-MX');
    },
    
    /**
     * Formatear moneda
     */
    formatCurrency: function(amount) {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        }).format(amount);
    },
    
    /**
     * Validar email
     */
    validateEmail: function(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },
    
    /**
     * Generar SKU automático
     */
    generateSKU: function(categoryName, productName) {
        const catPrefix = categoryName.substring(0, 3).toUpperCase();
        const prodPrefix = productName.substring(0, 3).toUpperCase();
        const timestamp = Date.now().toString().slice(-4);
        return `${catPrefix}-${prodPrefix}-${timestamp}`;
    },
    
    /**
     * Confirmar acción destructiva
     */
    confirmDelete: function(itemName, callback) {
        if (confirm(`¿Estás seguro de que quieres eliminar "${itemName}"?\n\nEsta acción no se puede deshacer.`)) {
            callback();
        }
    },
    
    /**
     * Exportar datos a CSV
     */
    exportToCSV: function(data, filename) {
        if (!data || data.length === 0) {
            alert('No hay datos para exportar');
            return;
        }
        
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => {
                const value = row[header] || '';
                return `"${value.toString().replace(/"/g, '""')}"`;
            }).join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

console.log('📋 Utilidades del admin cargadas');