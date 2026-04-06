<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

require_once 'db.php';

$data  = json_decode(file_get_contents('php://input'), true);
$nama  = trim(strip_tags($data['nama']  ?? ''));
$kelas = trim(strip_tags($data['kelas'] ?? ''));
$skor  = isset($data['skor']) ? intval($data['skor']) : -1;

if (!$nama || !$kelas || $skor < 0 || $skor > 100) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Data tidak valid']);
    exit;
}

$stmt = $pdo->prepare('INSERT INTO leaderboard (nama, kelas, skor) VALUES (?, ?, ?)');
$stmt->execute([$nama, $kelas, $skor]);

echo json_encode(['success' => true]);
