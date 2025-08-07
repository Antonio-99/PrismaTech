// ============================================
// admin/js/services/export-service.js - Servicio de Exportación
// ============================================

class ExportService {
    constructor() {
        this.supportedFormats = ['csv', 'excel', 'pdf', 'json'];
    }

    // Exportar a CSV
    exportToCSV(data, filename = 'export.csv') {
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('No hay datos para exportar');
        }

        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => 
                headers.map(field => 
                    JSON.stringify(row[field] || '')
                ).join(',')
            )
        ].join('\n');

        this.downloadFile(csvContent, filename, 'text/csv');
    }

    // Exportar a JSON
    exportToJSON(data, filename = 'export.json') {
        const jsonContent = JSON.stringify(data, null, 2);
        this.downloadFile(jsonContent, filename, 'application/json');
    }

    // Exportar tabla HTML a CSV
    exportTableToCSV(tableId, filename = 'table.csv') {
        const table = document.getElementById(tableId);
        if (!table) {
            throw new Error('Tabla no encontrada');
        }

        const rows = Array.from(table.querySelectorAll('tr'));
        const csvContent = rows.map(row => {
            const cells = Array.from(row.querySelectorAll('td, th'));
            return cells.map(cell => 
                JSON.stringify(cell.textContent.trim())
            ).join(',');
        }).join('\n');

        this.downloadFile(csvContent, filename, 'text/csv');
    }

    // Crear archivo de descarga
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        window.URL.revokeObjectURL(url);
    }

    // Generar reporte PDF
    async generatePDFReport(data, template = 'default') {
        // Esta función requeriría una librería como jsPDF
        console.log('PDF generation would be implemented here');
        throw new Error('Generación de PDF no implementada aún');
    }

    // Formatear datos para exportación
    formatDataForExport(data, config = {}) {
        if (!Array.isArray(data)) {
            return data;
        }

        return data.map(item => {
            const formattedItem = {};
            
            Object.keys(item).forEach(key => {
                const value = item[key];
                
                // Aplicar formateo según el tipo
                if (config.dateFields && config.dateFields.includes(key)) {
                    formattedItem[key] = new Date(value).toLocaleDateString('es-MX');
                } else if (config.currencyFields && config.currencyFields.includes(key)) {
                    formattedItem[key] = `$${parseFloat(value).toFixed(2)}`;
                } else if (config.percentageFields && config.percentageFields.includes(key)) {
                    formattedItem[key] = `${(parseFloat(value) * 100).toFixed(2)}%`;
                } else {
                    formattedItem[key] = value;
                }
            });
            
            return formattedItem;
        });
    }
}

// Export all services
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ValidationService,
        StorageService,
        AuthService,
        FileService,
        ExportService
    };
}