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
$isi   = trim(strip_tags($data['isi']   ?? ''));

if (!$nama || !$kelas || !$isi) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Data tidak lengkap']);
    exit;
}

$stmt = $pdo->prepare('INSERT INTO refleksi (nama, kelas, isi) VALUES (?, ?, ?)');
$stmt->execute([$nama, $kelas, $isi]);

echo json_encode(['success' => true]);
