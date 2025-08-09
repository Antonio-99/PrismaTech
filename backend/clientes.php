<?php
// backend/clientes.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Manejar preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

include 'config.php';

// Obtener todos los clientes
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $sql = "SELECT c.*, 
                COUNT(v.id) as total_compras,
                MAX(v.fecha) as ultima_compra,
                SUM(v.total) as total_gastado
                FROM clientes c 
                LEFT JOIN ventas v ON c.id = v.cliente_id 
                GROUP BY c.id 
                ORDER BY c.fecha_registro DESC";
        $result = $conn->query($sql);
        $clientes = [];

        while ($row = $result->fetch_assoc()) {
            $clientes[] = [
                'id' => (int)$row['id'],
                'name' => $row['nombre'],
                'email' => $row['email'],
                'phone' => $row['telefono'],
                'address' => $row['direccion'],
                'total_purchases' => (int)$row['total_compras'],
                'last_purchase' => $row['ultima_compra'],
                'total_spent' => $row['total_gastado'] ? (float)$row['total_gastado'] : 0,
                'registered_at' => $row['fecha_registro']
            ];
        }
        echo json_encode($clientes);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error al obtener clientes: ' . $e->getMessage()]);
    }
}

// Agregar cliente
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (empty($data['name'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Nombre del cliente requerido']);
            exit;
        }

        $stmt = $conn->prepare("INSERT INTO clientes (nombre, email, telefono, direccion) VALUES (?, ?, ?, ?)");
        
        $stmt->bind_param("ssss",
            $data['name'],
            $data['email'],
            $data['phone'],
            $data['address']
        );
        
        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'id' => $conn->insert_id]);
        } else {
            throw new Exception($stmt->error);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error al crear cliente: ' . $e->getMessage()]);
    }
}

// Actualizar cliente
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (empty($data['id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'ID de cliente requerido']);
            exit;
        }

        $stmt = $conn->prepare("UPDATE clientes SET nombre=?, email=?, telefono=?, direccion=? WHERE id=?");
        
        $stmt->bind_param("ssssi",
            $data['name'],
            $data['email'],
            $data['phone'],
            $data['address'],
            $data['id']
        );
        
        if ($stmt->execute()) {
            echo json_encode(['success' => true]);
        } else {
            throw new Exception($stmt->error);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error al actualizar cliente: ' . $e->getMessage()]);
    }
}

// Eliminar cliente
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (empty($data['id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'ID de cliente requerido']);
            exit;
        }

        // Verificar si el cliente tiene ventas
        $stmt = $conn->prepare("SELECT COUNT(*) as count FROM ventas WHERE cliente_id = ?");
        $stmt->bind_param("i", $data['id']);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        
        if ($row['count'] > 0) {
            http_response_code(400);
            echo json_encode(['error' => 'No se puede eliminar el cliente porque tiene ventas asociadas']);
            exit;
        }

        $stmt = $conn->prepare("DELETE FROM clientes WHERE id = ?");
        $stmt->bind_param("i", $data['id']);
        
        if ($stmt->execute()) {
            echo json_encode(['success' => true]);
        } else {
            throw new Exception($stmt->error);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error al eliminar cliente: ' . $e->getMessage()]);
    }
}

$conn->close();
?>