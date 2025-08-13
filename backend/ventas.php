<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

include 'config.php';

// Obtener todas las ventas con datos de cliente
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $sql = "SELECT v.*, c.nombre AS cliente_nombre, c.email AS cliente_email, c.telefono AS cliente_telefono
                FROM ventas v
                LEFT JOIN clientes c ON v.cliente_id = c.id
                ORDER BY v.fecha DESC";
        $result = $conn->query($sql);
        
        if (!$result) {
            throw new Exception("Error en consulta: " . $conn->error);
        }
        
        $ventas = [];
        while ($row = $result->fetch_assoc()) {
            // Obtener detalles de productos para esta venta
            $detalle_sql = "SELECT vd.*, p.nombre AS producto_nombre, p.sku AS producto_sku
                           FROM venta_detalle vd
                           LEFT JOIN productos p ON vd.producto_id = p.id
                           WHERE vd.venta_id = ?";
            $detalle_stmt = $conn->prepare($detalle_sql);
            $detalle_stmt->bind_param("i", $row['id']);
            $detalle_stmt->execute();
            $detalle_result = $detalle_stmt->get_result();
            
            $productos = [];
            while ($detalle_row = $detalle_result->fetch_assoc()) {
                $productos[] = [
                    'id' => (int)$detalle_row['id'],
                    'producto_id' => (int)$detalle_row['producto_id'],
                    'producto_nombre' => $detalle_row['producto_nombre'],
                    'producto_sku' => $detalle_row['producto_sku'],
                    'cantidad' => (int)$detalle_row['cantidad'],
                    'precio_unitario' => (float)$detalle_row['precio_unitario'],
                    'subtotal' => (float)($detalle_row['cantidad'] * $detalle_row['precio_unitario'])
                ];
            }
            
            $ventas[] = [
                'id' => (int)$row['id'],
                'cliente_id' => (int)$row['cliente_id'],
                'cliente' => $row['cliente_nombre'],
                'cliente_email' => $row['cliente_email'],
                'cliente_telefono' => $row['cliente_telefono'],
                'fecha' => $row['fecha'],
                'total' => (float)$row['total'],
                'estado' => $row['estado'],
                'productos' => $productos
            ];
        }
        
        echo json_encode($ventas, JSON_UNESCAPED_UNICODE);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
}

// Registrar nueva venta
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!$data) {
            throw new Exception("Datos inválidos");
        }
        
        // Validar campos requeridos
        $required_fields = ['cliente_id', 'total', 'estado'];
        foreach ($required_fields as $field) {
            if (!isset($data[$field])) {
                throw new Exception("Campo requerido: $field");
            }
        }
        
        // Validar que el cliente existe
        $check_client = $conn->prepare("SELECT id FROM clientes WHERE id = ?");
        $check_client->bind_param("i", $data['cliente_id']);
        $check_client->execute();
        if ($check_client->get_result()->num_rows === 0) {
            throw new Exception("Cliente no encontrado");
        }
        
        // Iniciar transacción
        $conn->begin_transaction();
        
        try {
            // Insertar venta
            $stmt = $conn->prepare("INSERT INTO ventas (cliente_id, total, estado) VALUES (?, ?, ?)");
            $cliente_id = (int)$data['cliente_id'];
            $total = (float)$data['total'];
            $estado = $data['estado'];
            
            $stmt->bind_param("ids", $cliente_id, $total, $estado);
            
            if (!$stmt->execute()) {
                throw new Exception("Error al crear venta: " . $stmt->error);
            }
            
            $venta_id = $conn->insert_id;
            
            // Insertar detalle de productos si se proporcionan
            if (isset($data['productos']) && is_array($data['productos'])) {
                $detalle_stmt = $conn->prepare("INSERT INTO venta_detalle (venta_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)");
                
                foreach ($data['productos'] as $producto) {
                    if (!isset($producto['producto_id']) || !isset($producto['cantidad']) || !isset($producto['precio_unitario'])) {
                        throw new Exception("Datos de producto incompletos");
                    }
                    
                    // Verificar que el producto existe
                    $check_product = $conn->prepare("SELECT id FROM productos WHERE id = ?");
                    $check_product->bind_param("i", $producto['producto_id']);
                    $check_product->execute();
                    if ($check_product->get_result()->num_rows === 0) {
                        throw new Exception("Producto no encontrado: " . $producto['producto_id']);
                    }
                    
                    $detalle_stmt->bind_param("iiid", 
                        $venta_id, 
                        $producto['producto_id'], 
                        $producto['cantidad'], 
                        $producto['precio_unitario']
                    );
                    
                    if (!$detalle_stmt->execute()) {
                        throw new Exception("Error al agregar producto al detalle: " . $detalle_stmt->error);
                    }
                    
                    // Actualizar stock del producto si es una venta confirmada
                    if ($estado === 'vendido' || $estado === 'entregado') {
                        $update_stock = $conn->prepare("UPDATE productos SET stock = stock - ? WHERE id = ? AND stock >= ?");
                        $update_stock->bind_param("iii", $producto['cantidad'], $producto['producto_id'], $producto['cantidad']);
                        
                        if (!$update_stock->execute()) {
                            throw new Exception("Error al actualizar stock");
                        }
                        
                        if ($update_stock->affected_rows === 0) {
                            throw new Exception("Stock insuficiente para el producto: " . $producto['producto_id']);
                        }
                    }
                }
            }
            
            // Confirmar transacción
            $conn->commit();
            
            echo json_encode([
                'success' => true,
                'message' => 'Venta creada exitosamente',
                'venta_id' => $venta_id
            ], JSON_UNESCAPED_UNICODE);
            
        } catch (Exception $e) {
            $conn->rollback();
            throw $e;
        }
        
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
}

// Actualizar venta
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!$data || !isset($data['id'])) {
            throw new Exception("ID de venta requerido");
        }
        
        $id = (int)$data['id'];
        
        // Verificar que la venta existe
        $check_sale = $conn->prepare("SELECT estado FROM ventas WHERE id = ?");
        $check_sale->bind_param("i", $id);
        $check_sale->execute();
        $sale_result = $check_sale->get_result();
        
        if ($sale_result->num_rows === 0) {
            throw new Exception("Venta no encontrada");
        }
        
        $current_sale = $sale_result->fetch_assoc();
        
        // Preparar campos a actualizar
        $updates = [];
        $params = [];
        $types = "";
        
        if (isset($data['estado'])) {
            $updates[] = "estado = ?";
            $params[] = $data['estado'];
            $types .= "s";
        }
        
        if (isset($data['total'])) {
            $updates[] = "total = ?";
            $params[] = (float)$data['total'];
            $types .= "d";
        }
        
        if (empty($updates)) {
            throw new Exception("No hay campos para actualizar");
        }
        
        // Agregar ID al final
        $params[] = $id;
        $types .= "i";
        
        // Ejecutar actualización
        $sql = "UPDATE ventas SET " . implode(", ", $updates) . " WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param($types, ...$params);
        
        if ($stmt->execute()) {
            echo json_encode([
                'success' => true,
                'message' => 'Venta actualizada exitosamente'
            ], JSON_UNESCAPED_UNICODE);
        } else {
            throw new Exception("Error al actualizar venta: " . $stmt->error);
        }
        
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
}

// Eliminar venta
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!$data || !isset($data['id'])) {
            throw new Exception("ID de venta requerido");
        }
        
        $id = (int)$data['id'];
        
        // Verificar que la venta existe
        $check_sale = $conn->prepare("SELECT estado FROM ventas WHERE id = ?");
        $check_sale->bind_param("i", $id);
        $check_sale->execute();
        $sale_result = $check_sale->get_result();
        
        if ($sale_result->num_rows === 0) {
            throw new Exception("Venta no encontrada");
        }
        
        $sale_data = $sale_result->fetch_assoc();
        
        // No permitir eliminar ventas entregadas
        if ($sale_data['estado'] === 'entregado') {
            throw new Exception("No se puede eliminar una venta entregada");
        }
        
        // Iniciar transacción
        $conn->begin_transaction();
        
        try {
            // Si la venta estaba vendida, restaurar stock
            if ($sale_data['estado'] === 'vendido') {
                $detalle_sql = "SELECT producto_id, cantidad FROM venta_detalle WHERE venta_id = ?";
                $detalle_stmt = $conn->prepare($detalle_sql);
                $detalle_stmt->bind_param("i", $id);
                $detalle_stmt->execute();
                $detalle_result = $detalle_stmt->get_result();
                
                while ($detalle = $detalle_result->fetch_assoc()) {
                    $restore_stock = $conn->prepare("UPDATE productos SET stock = stock + ? WHERE id = ?");
                    $restore_stock->bind_param("ii", $detalle['cantidad'], $detalle['producto_id']);
                    $restore_stock->execute();
                }
            }
            
            // Eliminar detalle de venta
            $delete_detail = $conn->prepare("DELETE FROM venta_detalle WHERE venta_id = ?");
            $delete_detail->bind_param("i", $id);
            $delete_detail->execute();
            
            // Eliminar venta
            $delete_sale = $conn->prepare("DELETE FROM ventas WHERE id = ?");
            $delete_sale->bind_param("i", $id);
            
            if ($delete_sale->execute()) {
                $conn->commit();
                echo json_encode([
                    'success' => true,
                    'message' => 'Venta eliminada exitosamente'
                ], JSON_UNESCAPED_UNICODE);
            } else {
                throw new Exception("Error al eliminar venta: " . $delete_sale->error);
            }
            
        } catch (Exception $e) {
            $conn->rollback();
            throw $e;
        }
        
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
}

$conn->close();
?>