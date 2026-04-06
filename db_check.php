<?php
// File ini untuk cek koneksi database. HAPUS setelah selesai debug!

$host   = 'localhost';
$dbname = 'media_pembelajaran';
$user   = 'root';
$pass   = '';

echo "<h2>Cek Koneksi Database</h2>";
echo "<p><b>Host:</b> $host</p>";
echo "<p><b>Database:</b> $dbname</p>";
echo "<p><b>User:</b> $user</p>";
echo "<p><b>PHP Version:</b> " . phpversion() . "</p>";

// Cek PDO tersedia
if (!extension_loaded('pdo_mysql')) {
    echo "<p style='color:red'>❌ PDO MySQL tidak tersedia di server ini.</p>";
    exit;
}
echo "<p style='color:green'>✅ PDO MySQL tersedia</p>";

// Coba koneksi
try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
        $user, $pass,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    echo "<p style='color:green'>✅ Koneksi berhasil!</p>";

    // Cek tabel
    $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    if ($tables) {
        echo "<p>Tabel yang ditemukan: <b>" . implode(', ', $tables) . "</b></p>";
    } else {
        echo "<p style='color:orange'>⚠️ Database kosong — belum ada tabel. Jalankan db_setup.sql dulu.</p>";
    }

} catch (PDOException $e) {
    echo "<p style='color:red'>❌ Koneksi gagal: <b>" . htmlspecialchars($e->getMessage()) . "</b></p>";
    echo "<hr><p><b>Kemungkinan penyebab:</b></p><ul>";
    echo "<li>Password MySQL salah</li>";
    echo "<li>User tidak punya akses ke database <b>$dbname</b></li>";
    echo "<li>Database <b>$dbname</b> belum dibuat</li>";
    echo "<li>Host bukan 'localhost' (coba '127.0.0.1')</li>";
    echo "</ul>";
}
?>
