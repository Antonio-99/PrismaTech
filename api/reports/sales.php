// api/reports/sales.php
class SalesReportsAPI extends ApiBase {
    
    public function __construct() {
        parent::__construct();
        $this->handleRequest();
    }
    
    private function handleRequest(): void {
        switch ($this->method) {
            case 'GET':
                $this->generateSalesReport();
                break;
            default:
                $this->sendError(405, 'Método no permitido');
        }
    }
    
    private function generateSalesReport(): void {
        try {
            // Autenticar usuario
            $user = $this->authenticateAdmin();
            $this->checkPermissions($user, ['admin', 'manager']);
            
            // Rate limiting
            $this->checkRateLimit('sales_report:' . $user['id'], 20, 3600);
            
            $report_type = $this->input['type'] ?? 'summary';
            $date_from = $this->input['date_from'] ?? date('Y-m-01'); // Primer día del mes
            $date_to = $this->input['date_to'] ?? date('Y-m-d'); // Hoy
            
            $report_data = [];
            
            switch ($report_type) {
                case 'summary':
                    $report_data = $this->getSalesSummaryReport($date_from, $date_to);
                    break;
                case 'products':
                    $report_data = $this->getProductsSalesReport($date_from, $date_to);
                    break;
                case 'customers':
                    $report_data = $this->getCustomersSalesReport($date_from, $date_to);
                    break;
                case 'daily':
                    $report_data = $this->getDailySalesReport($date_from, $date_to);
                    break;
                default:
                    $this->sendError(400, 'Tipo de reporte no válido');
            }
            
            $this->sendSuccess([
                'report_type' => $report_type,
                'period' => [
                    'from' => $date_from,
                    'to' => $date_to
                ],
                'data' => $report_data,
                'generated_at' => date('Y-m-d H:i:s'),
                'generated_by' => $user['full_name']
            ], 200, 'Reporte generado exitosamente');
            
        } catch (Exception $e) {
            error_log("[PrismaTech API] Error generating sales report: " . $e->getMessage());
            $this->sendError(500, 'Error interno del servidor');
        }
    }
    
    private function getSalesSummaryReport(string $date_from, string $date_to): array {
        $query = "
            SELECT 
                COUNT(*) as total_sales,
                SUM(total) as total_revenue,
                AVG(total) as avg_sale,
                MIN(total) as min_sale,
                MAX(total) as max_sale,
                COUNT(DISTINCT customer_id) as unique_customers,
                SUM(CASE WHEN payment_method = 'efectivo' THEN total ELSE 0 END) as cash_sales,
                SUM(CASE WHEN payment_method = 'tarjeta_debito' THEN total ELSE 0 END) as debit_sales,
                SUM(CASE WHEN payment_method = 'tarjeta_credito' THEN total ELSE 0 END) as credit_sales,
                SUM(CASE WHEN payment_method = 'transferencia' THEN total ELSE 0 END) as transfer_sales
            FROM sales
            WHERE sale_date BETWEEN :date_from AND :date_to
            AND sale_status = 'completed'
        ";
        
        return Database::fetchOne($query, [
            'date_from' => $date_from . ' 00:00:00',
            'date_to' => $date_to . ' 23:59:59'
        ]) ?: [];
    }
    
    private function getProductsSalesReport(string $date_from, string $date_to): array {
        $query = "
            SELECT 
                si.product_name,
                si.product_sku,
                SUM(si.quantity) as total_quantity,
                SUM(si.subtotal) as total_revenue,
                AVG(si.unit_price) as avg_price,
                COUNT(DISTINCT s.id) as times_sold
            FROM sale_items si
            JOIN sales s ON si.sale_id = s.id
            WHERE s.sale_date BETWEEN :date_from AND :date_to
            AND s.sale_status = 'completed'
            GROUP BY si.product_id, si.product_name, si.product_sku
            ORDER BY total_revenue DESC
            LIMIT 50
        ";
        
        return Database::fetchAll($query, [
            'date_from' => $date_from . ' 00:00:00',
            'date_to' => $date_to . ' 23:59:59'
        ]);
    }
    
    private function getCustomersSalesReport(string $date_from, string $date_to): array {
        $query = "
            SELECT 
                s.customer_name,
                s.customer_email,
                s.customer_phone,
                COUNT(*) as total_orders,
                SUM(s.total) as total_spent,
                AVG(s.total) as avg_order,
                MAX(s.sale_date) as last_purchase
            FROM sales s
            WHERE s.sale_date BETWEEN :date_from AND :date_to
            AND s.sale_status = 'completed'
            GROUP BY s.customer_name, s.customer_email, s.customer_phone
            ORDER BY total_spent DESC
            LIMIT 50
        ";
        
        return Database::fetchAll($query, [
            'date_from' => $date_from . ' 00:00:00',
            'date_to' => $date_to . ' 23:59:59'
        ]);
    }
    
    private function getDailySalesReport(string $date_from, string $date_to): array {
        $query = "
            SELECT 
                DATE(s.sale_date) as sale_date,
                COUNT(*) as sales_count,
                SUM(s.total) as daily_revenue,
                AVG(s.total) as avg_sale,
                COUNT(DISTINCT s.customer_id) as unique_customers
            FROM sales s
            WHERE s.sale_date BETWEEN :date_from AND :date_to
            AND s.sale_status = 'completed'
            GROUP BY DATE(s.sale_date)
            ORDER BY sale_date ASC
        ";
        
        return Database::fetchAll($query, [
            'date_from' => $date_from . ' 00:00:00',
            'date_to' => $date_to . ' 23:59:59'
        ]);
    }
}