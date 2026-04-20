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

$data     = json_decode(file_get_contents('php://input'), true);
$nama     = trim(strip_tags($data['nama']        ?? ''));
$kelas    = trim(strip_tags($data['kelas']       ?? ''));
$catatan  = trim(strip_tags($data['catatan_guru'] ?? ''));
$skor_ref = isset($data['skor_ref']) && $data['skor_ref'] !== '' ? intval($data['skor_ref']) : null;

if (!$nama || !$kelas || !$catatan) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Nama, kelas, dan catatan wajib diisi']);
    exit;
}

$stmt = $pdo->prepare('INSERT INTO rekomendasi (nama, kelas, catatan_guru, skor_ref) VALUES (?, ?, ?, ?)');
$stmt->execute([$nama, $kelas, $catatan, $skor_ref]);

echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
