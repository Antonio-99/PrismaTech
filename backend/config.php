<?php
$host = "localhost"; // Cambiar si tu servidor es distinto
$user = "root";      // Usuario de MySQL
$pass = "";          // Contraseña de MySQL
$db   = "prismatech"; // Nombre de la base de datos

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    die("Error de conexión: " . $conn->connect_error);
}

mysqli_set_charset($conn, "utf8");
?>
