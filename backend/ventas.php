<?php
// backend/ventas.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Manejar preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

include 'config.php';

// Obtener todas las ventas
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $sql = "SELECT v.*, c.nombre AS cliente_nombre_bd
                FROM ventas v
                LEFT JOIN clientes c ON v.cliente_id = c.id
                ORDER BY v.fecha DESC";
        $result = $conn->query($sql);
        $ventas = [];

        while ($row = $result->fetch_assoc()) {
            // Obtener detalles de productos para esta venta
            $detalle_sql = "SELECT vd.*, p.nombre AS producto_nombre 
                           FROM venta_detalle vd 
                           LEFT JOIN productos p ON vd.producto_id = p.id 
                           WHERE vd.venta_id = " . $row['id'];
            $detalle_result = $conn->query($detalle_sql);
            $productos = [];
            
            while ($detalle = $detalle_result->fetch_assoc()) {
                $productos[] = [
                    'product_id' => (int)$detalle['producto_id'],
                    'product_name' => $detalle['producto_nombre'],
                    'quantity' => (int)$detalle['cantidad'],
                    'unit_price' => (float)$detalle['precio_unitario']
                ];
            }

            $ventas[] = [
                'id' => (int)$row['id'],
                'customer_id' => $row['cliente_id'] ? (int)$row['cliente_id'] : null,
                'customer' => $row['cliente_nombre'] ?: $row['cliente_nombre_bd'],
                'phone' => $row['cliente_telefono'],
                'date' => $row['fecha'],
                'total' => (float)$row['total'],
                'status' => $row['estado'],
                'notes' => $row['notas'],
                'products' => $productos
            ];
        }
        echo json_encode($ventas);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error al obtener ventas: ' . $e->getMessage()]);
    }
}

// Registrar nueva venta
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        
        // Validar datos requeridos
        if (empty($data['customer']) || empty($data['product_id']) || !isset($data['quantity']) || !isset($data['price'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Faltan campos requeridos']);
            exit;
        }

        $conn->begin_transaction();

        // Insertar venta
        $stmt = $conn->prepare("INSERT INTO ventas (cliente_nombre, cliente_telefono, total, estado, notas) VALUES (?, ?, ?, ?, ?)");
        
        $total = $data['price'] * $data['quantity'];
        $status = isset($data['status']) ? $data['status'] : 'cotizacion';
        
        $stmt->bind_param("ssdss",
            $data['customer'],
            $data['phone'],
            $total,
            $status,
            $data['notes']
        );
        
        if (!$stmt->execute()) {
            throw new Exception($stmt->error);
        }
        
        $venta_id = $conn->insert_id;

        // Insertar detalle de la venta
        $stmt_detalle = $conn->prepare("INSERT INTO venta_detalle (venta_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)");
        $stmt_detalle->bind_param("iiid",
            $venta_id,
            $data['product_id'],
            $data['quantity'],
            $data['price']
        );
        
        if (!$stmt_detalle->execute()) {
            throw new Exception($stmt_detalle->error);
        }

        $conn->commit();
        echo json_encode(['success' => true, 'id' => $venta_id]);
        
    } catch (Exception $e) {
        $conn->rollback();
        http_response_code(500);
        echo json_encode(['error' => 'Error al crear venta: ' . $e->getMessage()]);
    }
}

// Actualizar venta
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (empty($data['id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'ID de venta requerido']);
            exit;
        }

        $stmt = $conn->prepare("UPDATE ventas SET cliente_nombre=?, cliente_telefono=?, total=?, estado=?, notas=? WHERE id=?");
        
        $stmt->bind_param("ssdssi",
            $data['customer'],
            $data['phone'],
            $data['total'],
            $data['status'],
            $data['notes'],
            $data['id']
        );
        
        if ($stmt->execute()) {
            echo json_encode(['success' => true]);
        } else {
            throw new Exception($stmt->error);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error al actualizar venta: ' . $e->getMessage()]);
    }
}

// Eliminar venta
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (empty($data['id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'ID de venta requerido']);
            exit;
        }

        $conn->begin_transaction();

        // Eliminar detalles primero
        $stmt = $conn->prepare("DELETE FROM venta_detalle WHERE venta_id = ?");
        $stmt->bind_param("i", $data['id']);
        $stmt->execute();

        // Eliminar venta
        $stmt = $conn->prepare("DELETE FROM ventas WHERE id = ?");
        $stmt->bind_param("i", $data['id']);
        
        if ($stmt->execute()) {
            $conn->commit();
            echo json_encode(['success' => true]);
        } else {
            throw new Exception($stmt->error);
        }
    } catch (Exception $e) {
        $conn->rollback();
        http_response_code(500);
        echo json_encode(['error' => 'Error al eliminar venta: ' . $e->getMessage()]);
    }
}

$conn->close();
?>