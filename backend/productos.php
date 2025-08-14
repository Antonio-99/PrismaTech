<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

include 'config.php';

// Obtener todos los productos con información de categoría
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $sql = "SELECT p.*, c.nombre AS categoria 
                FROM productos p
                LEFT JOIN categorias c ON p.categoria_id = c.id
                WHERE p.estado != 'deleted'
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
                'descripcion' => $row['descripcion'] ?? '',
                'sku' => $row['sku'],
                'precio' => (float)$row['precio'],
                'stock' => (int)$row['stock'],
                'stock_minimo' => (int)$row['stock_minimo'],
                'estado' => $row['estado'],
                'categoria_id' => (int)$row['categoria_id'],
                'categoria' => $row['categoria'] ?? 'Sin categoría',
                'fecha_creacion' => $row['fecha_creacion'],
                'fecha_actualizacion' => $row['fecha_actualizacion'] ?? $row['fecha_creacion']
            ];
        }
        
        echo json_encode($productos, JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'message' => 'Error al obtener productos'
        ], JSON_UNESCAPED_UNICODE);
    }
}

// Agregar un producto
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!$data) {
            throw new Exception("Datos JSON inválidos o vacíos");
        }
        
        // Validar campos requeridos
        $required_fields = ['nombre', 'sku', 'precio', 'categoria_id'];
        foreach ($required_fields as $field) {
            if (!isset($data[$field]) || ($field !== 'precio' && empty(trim($data[$field])))) {
                throw new Exception("Campo requerido faltante o vacío: $field");
            }
        }
        
        // Limpiar y validar datos
        $nombre = trim($data['nombre']);
        $descripcion = isset($data['descripcion']) ? trim($data['descripcion']) : '';
        $sku = strtoupper(trim($data['sku']));
        $precio = (float)$data['precio'];
        $stock = (int)($data['stock'] ?? 0);
        $stock_minimo = (int)($data['stock_minimo'] ?? 5);
        $categoria_id = (int)$data['categoria_id'];
        $estado = isset($data['estado']) ? $data['estado'] : 'active';
        
        // Validaciones adicionales
        if (strlen($nombre) < 3) {
            throw new Exception("El nombre del producto debe tener al menos 3 caracteres");
        }
        
        if (strlen($sku) < 3) {
            throw new Exception("El SKU debe tener al menos 3 caracteres");
        }
        
        if ($precio <= 0) {
            throw new Exception("El precio debe ser mayor a 0");
        }
        
        if ($stock < 0) {
            throw new Exception("El stock no puede ser negativo");
        }
        
        if ($stock_minimo < 0) {
            throw new Exception("El stock mínimo no puede ser negativo");
        }
        
        // Verificar que la categoría existe
        $check_category = $conn->prepare("SELECT id FROM categorias WHERE id = ?");
        $check_category->bind_param("i", $categoria_id);
        $check_category->execute();
        if ($check_category->get_result()->num_rows === 0) {
            throw new Exception("La categoría seleccionada no existe");
        }
        
        // Verificar que el SKU no exista
        $check_sku = $conn->prepare("SELECT id FROM productos WHERE sku = ? AND estado != 'deleted'");
        $check_sku->bind_param("s", $sku);
        $check_sku->execute();
        if ($check_sku->get_result()->num_rows > 0) {
            throw new Exception("El SKU '$sku' ya existe en otro producto");
        }
        
        // Insertar producto
        $stmt = $conn->prepare("INSERT INTO productos (nombre, descripcion, sku, precio, stock, stock_minimo, estado, categoria_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("sssdiiis", $nombre, $descripcion, $sku, $precio, $stock, $stock_minimo, $estado, $categoria_id);
        
        if ($stmt->execute()) {
            $new_id = $conn->insert_id;
            
            // Obtener el producto recién creado con información de categoría
            $get_product = $conn->prepare("SELECT p.*, c.nombre AS categoria FROM productos p LEFT JOIN categorias c ON p.categoria_id = c.id WHERE p.id = ?");
            $get_product->bind_param("i", $new_id);
            $get_product->execute();
            $product_result = $get_product->get_result()->fetch_assoc();
            
            echo json_encode([
                'success' => true,
                'message' => 'Producto creado exitosamente',
                'id' => $new_id,
                'producto' => [
                    'id' => (int)$product_result['id'],
                    'nombre' => $product_result['nombre'],
                    'descripcion' => $product_result['descripcion'],
                    'sku' => $product_result['sku'],
                    'precio' => (float)$product_result['precio'],
                    'stock' => (int)$product_result['stock'],
                    'stock_minimo' => (int)$product_result['stock_minimo'],
                    'estado' => $product_result['estado'],
                    'categoria_id' => (int)$product_result['categoria_id'],
                    'categoria' => $product_result['categoria']
                ]
            ], JSON_UNESCAPED_UNICODE);
        } else {
            throw new Exception("Error al insertar producto en la base de datos: " . $stmt->error);
        }
        
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ], JSON_UNESCAPED_UNICODE);
    }
}

// Actualizar un producto
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!$data || !isset($data['id'])) {
            throw new Exception("ID de producto requerido");
        }
        
        $id = (int)$data['id'];
        
        if ($id <= 0) {
            throw new Exception("ID de producto inválido");
        }
        
        // Verificar que el producto existe
        $check_product = $conn->prepare("SELECT id, sku FROM productos WHERE id = ? AND estado != 'deleted'");
        $check_product->bind_param("i", $id);
        $check_product->execute();
        $existing_product = $check_product->get_result()->fetch_assoc();
        
        if (!$existing_product) {
            throw new Exception("Producto no encontrado o eliminado");
        }
        
        // Validar y limpiar datos
        $nombre = isset($data['nombre']) ? trim($data['nombre']) : null;
        $descripcion = isset($data['descripcion']) ? trim($data['descripcion']) : '';
        $sku = isset($data['sku']) ? strtoupper(trim($data['sku'])) : null;
        $precio = isset($data['precio']) ? (float)$data['precio'] : null;
        $stock = isset($data['stock']) ? (int)$data['stock'] : null;
        $stock_minimo = isset($data['stock_minimo']) ? (int)$data['stock_minimo'] : null;
        $categoria_id = isset($data['categoria_id']) ? (int)$data['categoria_id'] : null;
        $estado = isset($data['estado']) ? $data['estado'] : null;
        
        // Validaciones
        if ($nombre !== null && strlen($nombre) < 3) {
            throw new Exception("El nombre del producto debe tener al menos 3 caracteres");
        }
        
        if ($sku !== null && strlen($sku) < 3) {
            throw new Exception("El SKU debe tener al menos 3 caracteres");
        }
        
        if ($precio !== null && $precio <= 0) {
            throw new Exception("El precio debe ser mayor a 0");
        }
        
        if ($stock !== null && $stock < 0) {
            throw new Exception("El stock no puede ser negativo");
        }
        
        if ($stock_minimo !== null && $stock_minimo < 0) {
            throw new Exception("El stock mínimo no puede ser negativo");
        }
        
        // Verificar categoría si se proporciona
        if ($categoria_id !== null) {
            $check_category = $conn->prepare("SELECT id FROM categorias WHERE id = ?");
            $check_category->bind_param("i", $categoria_id);
            $check_category->execute();
            if ($check_category->get_result()->num_rows === 0) {
                throw new Exception("La categoría seleccionada no existe");
            }
        }
        
        // Verificar SKU único si se cambió
        if ($sku !== null && $sku !== $existing_product['sku']) {
            $check_sku = $conn->prepare("SELECT id FROM productos WHERE sku = ? AND id != ? AND estado != 'deleted'");
            $check_sku->bind_param("si", $sku, $id);
            $check_sku->execute();
            if ($check_sku->get_result()->num_rows > 0) {
                throw new Exception("El SKU '$sku' ya existe en otro producto");
            }
        }
        
        // Construir consulta de actualización dinámicamente
        $updates = [];
        $params = [];
        $types = "";
        
        if ($nombre !== null) {
            $updates[] = "nombre = ?";
            $params[] = $nombre;
            $types .= "s";
        }
        
        if ($descripcion !== null) {
            $updates[] = "descripcion = ?";
            $params[] = $descripcion;
            $types .= "s";
        }
        
        if ($sku !== null) {
            $updates[] = "sku = ?";
            $params[] = $sku;
            $types .= "s";
        }
        
        if ($precio !== null) {
            $updates[] = "precio = ?";
            $params[] = $precio;
            $types .= "d";
        }
        
        if ($stock !== null) {
            $updates[] = "stock = ?";
            $params[] = $stock;
            $types .= "i";
        }
        
        if ($stock_minimo !== null) {
            $updates[] = "stock_minimo = ?";
            $params[] = $stock_minimo;
            $types .= "i";
        }
        
        if ($categoria_id !== null) {
            $updates[] = "categoria_id = ?";
            $params[] = $categoria_id;
            $types .= "i";
        }
        
        if ($estado !== null) {
            $updates[] = "estado = ?";
            $params[] = $estado;
            $types .= "s";
        }
        
        if (empty($updates)) {
            throw new Exception("No hay campos para actualizar");
        }
        
        // Agregar fecha de actualización
        $updates[] = "fecha_actualizacion = CURRENT_TIMESTAMP";
        
        // Agregar ID al final para WHERE
        $params[] = $id;
        $types .= "i";
        
        // Ejecutar actualización
        $sql = "UPDATE productos SET " . implode(", ", $updates) . " WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param($types, ...$params);
        
        if ($stmt->execute()) {
            // Obtener el producto actualizado
            $get_product = $conn->prepare("SELECT p.*, c.nombre AS categoria FROM productos p LEFT JOIN categorias c ON p.categoria_id = c.id WHERE p.id = ?");
            $get_product->bind_param("i", $id);
            $get_product->execute();
            $product_result = $get_product->get_result()->fetch_assoc();
            
            echo json_encode([
                'success' => true,
                'message' => 'Producto actualizado exitosamente',
                'producto' => [
                    'id' => (int)$product_result['id'],
                    'nombre' => $product_result['nombre'],
                    'descripcion' => $product_result['descripcion'],
                    'sku' => $product_result['sku'],
                    'precio' => (float)$product_result['precio'],
                    'stock' => (int)$product_result['stock'],
                    'stock_minimo' => (int)$product_result['stock_minimo'],
                    'estado' => $product_result['estado'],
                    'categoria_id' => (int)$product_result['categoria_id'],
                    'categoria' => $product_result['categoria']
                ]
            ], JSON_UNESCAPED_UNICODE);
        } else {
            throw new Exception("Error al actualizar producto: " . $stmt->error);
        }
        
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ], JSON_UNESCAPED_UNICODE);
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
        
        if ($id <= 0) {
            throw new Exception("ID de producto inválido");
        }
        
        // Verificar que el producto existe
        $check_product = $conn->prepare("SELECT id, nombre FROM productos WHERE id = ? AND estado != 'deleted'");
        $check_product->bind_param("i", $id);
        $check_product->execute();
        $product_result = $check_product->get_result();
        
        if ($product_result->num_rows === 0) {
            throw new Exception("Producto no encontrado o ya eliminado");
        }
        
        $product_data = $product_result->fetch_assoc();
        
        // Verificar si el producto está en alguna venta
        $check_sales = $conn->prepare("SELECT COUNT(*) as count FROM venta_detalle WHERE producto_id = ?");
        $check_sales->bind_param("i", $id);
        $check_sales->execute();
        $sales_result = $check_sales->get_result()->fetch_assoc();
        
        if ($sales_result['count'] > 0) {
            // No eliminar físicamente, solo marcar como eliminado
            $stmt = $conn->prepare("UPDATE productos SET estado = 'deleted', fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = ?");
            $stmt->bind_param("i", $id);
            $message = "Producto marcado como eliminado (tiene ventas asociadas)";
        } else {
            // Permitir eliminación física si no tiene ventas
            $force_delete = isset($data['force']) && $data['force'] === true;
            
            if ($force_delete) {
                $stmt = $conn->prepare("DELETE FROM productos WHERE id = ?");
                $stmt->bind_param("i", $id);
                $message = "Producto eliminado permanentemente";
            } else {
                $stmt = $conn->prepare("UPDATE productos SET estado = 'deleted', fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = ?");
                $stmt->bind_param("i", $id);
                $message = "Producto marcado como eliminado";
            }
        }
        
        if ($stmt->execute()) {
            echo json_encode([
                'success' => true,
                'message' => $message,
                'producto_nombre' => $product_data['nombre']
            ], JSON_UNESCAPED_UNICODE);
        } else {
            throw new Exception("Error al eliminar producto: " . $stmt->error);
        }
        
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ], JSON_UNESCAPED_UNICODE);
    }
}

// Cerrar conexión
if (isset($conn)) {
    $conn->close();
}
?>