<?php
include 'config.php';

// Obtener todos los productos
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $sql = "SELECT p.*, c.nombre AS categoria 
            FROM productos p
            LEFT JOIN categorias c ON p.categoria_id = c.id";
    $result = $conn->query($sql);
    $productos = [];

    while ($row = $result->fetch_assoc()) {
        $productos[] = $row;
    }
    echo json_encode($productos);
}

// Agregar un producto
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    $sql = "INSERT INTO productos (nombre, descripcion, sku, precio, stock, stock_minimo, estado, categoria_id)
            VALUES ('{$data['nombre']}', '{$data['descripcion']}', '{$data['sku']}', '{$data['precio']}', '{$data['stock']}', '{$data['stock_minimo']}', '{$data['estado']}', '{$data['categoria_id']}')";
    if ($conn->query($sql)) {
        echo json_encode(["success" => true]);
    } else {
        echo json_encode(["error" => $conn->error]);
    }
}
?>
