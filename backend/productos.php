<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

include 'config.php';

// Obtener todos los productos
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $sql = "SELECT p.*, c.nombre AS categoria 
                FROM productos p
                LEFT JOIN categorias c ON p.categoria_id = c.id
                ORDER BY p.id DESC";
        $result = $conn->query($sql);
        
        if (!$result) {
            throw new Exception("Error en consulta: " . $conn->error);
        }
        
        $productos = [];
        while ($row = $result->fetch_assoc()) {
            $productos[] = [
                'id' => (int)$row['id'],
                'nombre' => $row['nombre'],
                'descripcion' => $row['descripcion'],
                'sku' => $row['sku'],
                'precio' => (float)$row['precio'],
                'stock' => (int)$row['stock'],
                'stock_minimo' => (int)$row['stock_minimo'],
                'estado' => $row['estado'],
                'categoria_id' => (int)$row['categoria_id'],
                'categoria' => $row['categoria'],
                'fecha_creacion' => $row['fecha_creacion']
            ];
        }
        
        echo json_encode($productos, JSON_UNESCAPED_UNICODE);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
}

// Agregar un producto
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!$data) {
            throw new Exception("Datos inválidos");
        }
        
        // Validar campos requeridos
        $required_fields = ['nombre', 'sku', 'precio', 'categoria_id'];
        foreach ($required_fields as $field) {
            if (!isset($data[$field]) || empty($data[$field])) {
                throw new Exception("Campo requerido: $field");
            }
        }
        
        // Verificar que el SKU no exista
        $check_sku = $conn->prepare("SELECT id FROM productos WHERE sku = ?");
        $check_sku->bind_param("s", $data['sku']);
        $check_sku->execute();
        if ($check_sku->get_result()->num_rows > 0) {
            throw new Exception("El SKU ya existe");
        }
        
        // Preparar consulta
        $stmt = $conn->prepare("INSERT INTO productos (nombre, descripcion, sku, precio, stock, stock_minimo, estado, categoria_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        
        $nombre = $data['nombre'];
        $descripcion = $data['descripcion'] ?? '';
        $sku = $data['sku'];
        $precio = (float)$data['precio'];
        $stock = (int)($data['stock'] ?? 0);
        $stock_minimo = (int)($data['stock_minimo'] ?? 5);
        $estado = $data['estado'] ?? 'active';
        $categoria_id = (int)$data['categoria_id'];
        
        $stmt->bind_param("sssdiiis", $nombre, $descripcion, $sku, $precio, $stock, $stock_minimo, $estado, $categoria_id);
        
        if ($stmt->execute()) {
            echo json_encode([
                'success' => true, 
                'message' => 'Producto creado exitosamente',
                'id' => $conn->insert_id
            ], JSON_UNESCAPED_UNICODE);
        } else {
            throw new Exception("Error al crear producto: " . $stmt->error);
        }
        
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
}

// Actualizar un producto
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!$data || !isset($data['id'])) {
            throw new Exception("ID de producto requerido");
        }
        
        // Verificar que el producto existe
        $check_product = $conn->prepare("SELECT id FROM productos WHERE id = ?");
        $check_product->bind_param("i", $data['id']);
        $check_product->execute();
        if ($check_product->get_result()->num_rows === 0) {
            throw new Exception("Producto no encontrado");
        }
        
        // Verificar que el SKU no esté duplicado (excepto para el mismo producto)
        if (isset($data['sku'])) {
            $check_sku = $conn->prepare("SELECT id FROM productos WHERE sku = ? AND id != ?");
            $check_sku->bind_param("si", $data['sku'], $data['id']);
            $check_sku->execute();
            if ($check_sku->get_result()->num_rows > 0) {
                throw new Exception("El SKU ya existe en otro producto");
            }
        }
        
        // Preparar consulta de actualización
        $stmt = $conn->prepare("UPDATE productos SET nombre = ?, descripcion = ?, sku = ?, precio = ?, stock = ?, stock_minimo = ?, estado = ?, categoria_id = ? WHERE id = ?");
        
        $nombre = $data['nombre'];
        $descripcion = $data['descripcion'] ?? '';
        $sku = $data['sku'];
        $precio = (float)$data['precio'];
        $stock = (int)($data['stock'] ?? 0);
        $stock_minimo = (int)($data['stock_minimo'] ?? 5);
        $estado = $data['estado'] ?? 'active';
        $categoria_id = (int)$data['categoria_id'];
        $id = (int)$data['id'];
        
        $stmt->bind_param("sssdiiisi", $nombre, $descripcion, $sku, $precio, $stock, $stock_minimo, $estado, $categoria_id, $id);
        
        if ($stmt->execute()) {
            echo json_encode([
                'success' => true, 
                'message' => 'Producto actualizado exitosamente'
            ], JSON_UNESCAPED_UNICODE);
        } else {
            throw new Exception("Error al actualizar producto: " . $stmt->error);
        }
        
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
}

// Eliminar un producto
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!$data || !isset($data['id'])) {
            throw new Exception("ID de producto requerido");
        }
        
        $id = (int)$data['id'];
        
        // Verificar que el producto existe
        $check_product = $conn->prepare("SELECT id FROM productos WHERE id = ?");
        $check_product->bind_param("i", $id);
        $check_product->execute();
        if ($check_product->get_result()->num_rows === 0) {
            throw new Exception("Producto no encontrado");
        }
        
        // Verificar si el producto está en alguna venta
        $check_sales = $conn->prepare("SELECT COUNT(*) as count FROM venta_detalle WHERE producto_id = ?");
        $check_sales->bind_param("i", $id);
        $check_sales->execute();
        $sales_result = $check_sales->get_result()->fetch_assoc();
        
        if ($sales_result['count'] > 0) {
            // No eliminar, solo marcar como inactivo
            $stmt = $conn->prepare("UPDATE productos SET estado = 'inactive' WHERE id = ?");
            $stmt->bind_param("i", $id);
            $message = "Producto marcado como inactivo (tiene ventas asociadas)";
        } else {
            // Eliminar completamente
            $stmt = $conn->prepare("DELETE FROM productos WHERE id = ?");
            $stmt->bind_param("i", $id);
            $message = "Producto eliminado exitosamente";
        }
        
        if ($stmt->execute()) {
            echo json_encode([
                'success' => true, 
                'message' => $message
            ], JSON_UNESCAPED_UNICODE);
        } else {
            throw new Exception("Error al eliminar producto: " . $stmt->error);
        }
        
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
}

$conn->close();
?>