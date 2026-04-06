<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once 'db.php';

$stmt = $pdo->query(
    "SELECT nama, kelas, skor,
            DATE_FORMAT(created_at, '%d/%m/%y') AS tanggal
     FROM leaderboard
     ORDER BY skor DESC, created_at ASC
     LIMIT 20"
);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode(['success' => true, 'data' => $rows]);
