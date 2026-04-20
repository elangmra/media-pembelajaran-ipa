<?php
header('Content-Type: application/json');
session_start();

if (empty($_SESSION['admin'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

require_once 'db.php';

$data = json_decode(file_get_contents('php://input'), true);
$id   = isset($data['id']) ? intval($data['id']) : 0;

if ($id <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'ID tidak valid']);
    exit;
}

$stmt = $pdo->prepare('DELETE FROM rekomendasi WHERE id = ?');
$stmt->execute([$id]);

echo json_encode(['success' => true]);
