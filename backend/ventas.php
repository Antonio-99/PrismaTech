<?php
include 'config.php';

// Obtener todas las ventas con datos de cliente
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $sql = "SELECT v.*, c.nombre AS cliente 
            FROM ventas v
            LEFT JOIN clientes c ON v.cliente_id = c.id";
    $result = $conn->query($sql);
    $ventas = [];

    while ($row = $result->fetch_assoc()) {
        $ventas[] = $row;
    }
    echo json_encode($ventas);
}

// Registrar nueva venta
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);

    // Insertar venta
    $sql = "INSERT INTO ventas (cliente_id, total, estado) 
            VALUES ('{$data['cliente_id']}', '{$data['total']}', '{$data['estado']}')";
    if ($conn->query($sql)) {
        $venta_id = $conn->insert_id;

        // Insertar detalle de productos
        foreach ($data['productos'] as $prod) {
            $sql_detalle = "INSERT INTO venta_detalle (venta_id, producto_id, cantidad, precio_unitario)
                            VALUES ($venta_id, {$prod['producto_id']}, {$prod['cantidad']}, {$prod['precio_unitario']})";
            $conn->query($sql_detalle);
        }

        echo json_encode(["success" => true, "venta_id" => $venta_id]);
    } else {
        echo json_encode(["error" => $conn->error]);
    }
}
?>
