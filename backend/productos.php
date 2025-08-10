<?php
// backend/productos.php
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
        $sql = "SELECT p.*, c.nombre AS categoria_nombre, c.icono AS categoria_icono 
                FROM productos p
                LEFT JOIN categorias c ON p.categoria_id = c.id
                ORDER BY p.fecha_creacion DESC";
        $result = $conn->query($sql);
        
        if (!$result) {
            throw new Exception("Error en consulta: " . $conn->error);
        }
        
        $productos = [];
        while ($row = $result->fetch_assoc()) {
            $productos[] = [
                'id' => (int)$row['id'],
                'name' => $row['nombre'],
                'description' => $row['descripcion'],
                'brand' => $row['marca'],
                'sku' => $row['sku'],
                'part_number' => $row['numero_parte'],
                'price' => (float)$row['precio'],
                'stock' => (int)$row['stock'],
                'min_stock' => (int)$row['stock_minimo'],
                'status' => $row['estado'],
                'icon' => $row['icono'] ?: 'fas fa-cube',
                'category_id' => (int)$row['categoria_id'],
                'category_name' => $row['categoria_nombre'],
                'category_icon' => $row['categoria_icono'],
                'in_stock' => $row['estado'] === 'activo' && $row['stock'] > 0,
                'created_at' => $row['fecha_creacion']
            ];
        }
        echo json_encode($productos, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error al obtener productos: ' . $e->getMessage()]);
    }
}

// Agregar un producto
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (empty($data['name']) || empty($data['sku']) || !isset($data['price']) || empty($data['category_id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Faltan campos requeridos']);
            exit;
        }

        $stmt = $conn->prepare("INSERT INTO productos (nombre, descripcion, marca, sku, numero_parte, precio, stock, stock_minimo, estado, icono, categoria_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        
        $stock = isset($data['stock']) ? $data['stock'] : 0;
        $min_stock = isset($data['min_stock']) ? $data['min_stock'] : 5;
        $status = isset($data['status']) ? $data['status'] : 'activo';
        $icon = isset($data['icon']) ? $data['icon'] : 'fas fa-cube';
        
        $stmt->bind_param("sssssdiissi",
            $data['name'],
            $data['description'],
            $data['brand'],
            $data['sku'],
            $data['part_number'],
            $data['price'],
            $stock,
            $min_stock,
            $status,
            $icon,
            $data['category_id']
        );
        
        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'id' => $conn->insert_id]);
        } else {
            throw new Exception($stmt->error);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error al crear producto: ' . $e->getMessage()]);
    }
}

// Actualizar un producto
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (empty($data['id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'ID de producto requerido']);
            exit;
        }

        $stmt = $conn->prepare("UPDATE productos SET nombre=?, descripcion=?, marca=?, sku=?, numero_parte=?, precio=?, stock=?, stock_minimo=?, estado=?, icono=?, categoria_id=? WHERE id=?");
        
        $stmt->bind_param("sssssdiissii",
            $data['name'],
            $data['description'],
            $data['brand'],
            $data['sku'],
            $data['part_number'],
            $data['price'],
            $data['stock'],
            $data['min_stock'],
            $data['status'],
            $data['icon'],
            $data['category_id'],
            $data['id']
        );
        
        if ($stmt->execute()) {
            echo json_encode(['success' => true]);
        } else {
            throw new Exception($stmt->error);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error al actualizar producto: ' . $e->getMessage()]);
    }
}

// Eliminar un producto
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (empty($data['id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'ID de producto requerido']);
            exit;
        }

        $stmt = $conn->prepare("DELETE FROM productos WHERE id = ?");
        $stmt->bind_param("i", $data['id']);
        
        if ($stmt->execute()) {
            echo json_encode(['success' => true]);
        } else {
            throw new Exception($stmt->error);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error al eliminar producto: ' . $e->getMessage()]);
    }
}

$conn->close();
?>