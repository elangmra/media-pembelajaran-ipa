<?php
define('DB_HOST', 'localhost');
define('DB_NAME', 'media_pembelajaran');
define('DB_USER', 'root');
define('DB_PASS', '');  // ganti sesuai password MySQL di VPS

try {
    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER,
        DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (PDOException $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'error' => 'Database connection failed']);
    exit;
}
