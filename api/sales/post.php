<?php
/**
 * ============================================
 * PrismaTech API - Create Sales
 * Endpoint para crear ventas
 * POST /api/sales/post.php
 * ============================================
 */

require_once __DIR__ . '/../config/api_base.php';

class SalesCreateAPI extends ApiBase {
    
    private array $user;
    private float $defaultTaxRate = 0.16; // 16% IVA México
    
    public function __construct() {
        parent::__construct();
        $this->handleRequest();
    }
    
    /**
     * Manejar request según método HTTP
     */
    private function handleRequest(): void {
        switch ($this->method) {
            case 'POST':
                $this->createSale();
                break;
                
            default:
                $this->sendError(405, 'Método no permitido');
        }
    }
    
    /**
     * Crear nueva venta
     */
    private function createSale(): void {
        try {
            // Autenticar usuario
            $this->user = $this->authenticateAdmin();
            $this->checkPermissions($this->user, ['admin', 'manager', 'employee']);
            
            // Rate limiting para creación de ventas
            $this->checkRateLimit('sale_create:' . $this->user['id'], 50, 3600);
            
            // Validar campos requeridos
            $this->validateRequiredFields([
                'customer_name', 'items', 'payment_method'
            ]);
            
            // Sanitizar input
            $input = $this->sanitizeInput($this->input);
            
            // Validar estructura de la venta
            $this->validateSaleStructure($input);
            
            // Validar y procesar items
            $processed_items = $this->processAndValidateItems($input['items']);
            
            // Calcular totales
            $totals = $this->calculateTotals($processed_items, $input);
            
            // Preparar datos de la venta
            $sale_data = $this->prepareSaleData($input, $totals);
            
            // Validar stock disponible
            $this->validateStockAvailability($processed_items);
            
            Database::beginTransaction();
            
            try {
                // Crear venta
                $sale_id = $this->createSaleRecord($sale_