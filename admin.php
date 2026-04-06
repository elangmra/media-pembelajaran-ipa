<?php
session_start();

// ── Konfigurasi ───────────────────────────────────────────────────────────────
define('ADMIN_USER', 'guru');
define('ADMIN_PASS', 'ganti_password_ini');  // GANTI sebelum deploy ke VPS!

// ── Koneksi DB ────────────────────────────────────────────────────────────────
define('DB_HOST', 'localhost');
define('DB_NAME', 'media_pembelajaran');
define('DB_USER', 'root');
define('DB_PASS', '');  // sesuaikan dengan password MySQL di VPS

function getDB() {
    static $pdo;
    if (!$pdo) {
        $pdo = new PDO(
            'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
            DB_USER, DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );
    }
    return $pdo;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
if (isset($_POST['logout'])) {
    session_destroy();
    header('Location: admin.php');
    exit;
}

if (isset($_POST['username'])) {
    if ($_POST['username'] === ADMIN_USER && $_POST['password'] === ADMIN_PASS) {
        $_SESSION['admin'] = true;
        header('Location: admin.php');
        exit;
    }
    $loginError = 'Username atau password salah.';
}

$isLoggedIn = !empty($_SESSION['admin']);

// ── Data (hanya jika login) ───────────────────────────────────────────────────
if ($isLoggedIn) {
    $pdo = getDB();
    $totalSiswa   = $pdo->query('SELECT COUNT(*) FROM leaderboard')->fetchColumn();
    $avgSkor      = $pdo->query('SELECT ROUND(AVG(skor),1) FROM leaderboard')->fetchColumn() ?: 0;
    $totalRef     = $pdo->query('SELECT COUNT(*) FROM refleksi')->fetchColumn();
    $totalPend    = $pdo->query('SELECT COUNT(*) FROM pendapat')->fetchColumn();
    $leaderRows   = $pdo->query('SELECT nama, kelas, skor, created_at FROM leaderboard ORDER BY skor DESC, created_at ASC')->fetchAll(PDO::FETCH_ASSOC);
    $refleksiRows = $pdo->query('SELECT nama, kelas, isi, created_at FROM refleksi ORDER BY created_at DESC')->fetchAll(PDO::FETCH_ASSOC);
    $pendapatRows = $pdo->query('SELECT nama, kelas, video_id, isi, created_at FROM pendapat ORDER BY created_at DESC')->fetchAll(PDO::FETCH_ASSOC);
}

function e($s) { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); }
?>
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Admin Panel – Media Pembelajaran</title>
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Nunito', sans-serif; background: #F8FAFF; color: #2d3748; min-height: 100vh; }

  /* ── Topbar ── */
  .topbar {
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    color: white; padding: 1rem 1.5rem;
    display: flex; justify-content: space-between; align-items: center;
    box-shadow: 0 2px 12px rgba(79,172,254,0.3);
  }
  .topbar h1 { font-size: 1.05rem; font-weight: 800; }
  .btn-logout {
    background: rgba(255,255,255,0.2); color: white; border: none;
    padding: 0.4rem 1rem; border-radius: 8px; cursor: pointer;
    font-family: inherit; font-weight: 700; font-size: 0.85rem;
  }
  .btn-logout:hover { background: rgba(255,255,255,0.35); }

  /* ── Login ── */
  .login-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1rem; }
  .login-card {
    background: white; border-radius: 20px; padding: 2.5rem;
    width: 100%; max-width: 380px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.1);
  }
  .login-logo { text-align: center; font-size: 2.5rem; margin-bottom: 0.5rem; }
  .login-card h2 { text-align: center; color: #4facfe; margin-bottom: 1.8rem; font-size: 1.3rem; }
  .field { margin-bottom: 1.1rem; }
  .field label { display: block; font-size: 0.85rem; font-weight: 700; color: #555; margin-bottom: 0.35rem; }
  .field input {
    width: 100%; padding: 0.65rem 0.9rem;
    border: 2px solid #e2e8f0; border-radius: 10px;
    font-family: inherit; font-size: 0.95rem; transition: border-color .2s;
  }
  .field input:focus { outline: none; border-color: #4facfe; }
  .btn-login {
    width: 100%; padding: 0.75rem;
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    color: white; border: none; border-radius: 12px;
    font-family: inherit; font-weight: 800; font-size: 1rem;
    cursor: pointer; margin-top: 0.5rem; transition: opacity .2s;
  }
  .btn-login:hover { opacity: 0.9; }
  .error-msg { color: #e53e3e; font-size: 0.85rem; margin-top: 0.75rem; text-align: center; }

  /* ── Dashboard ── */
  .container { max-width: 960px; margin: 0 auto; padding: 1.5rem 1rem; }

  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
  .stat-card {
    background: white; border-radius: 14px; padding: 1.3rem; text-align: center;
    box-shadow: 0 2px 10px rgba(0,0,0,0.06);
  }
  .stat-num { font-size: 2.2rem; font-weight: 800; line-height: 1; }
  .stat-label { font-size: 0.78rem; color: #888; margin-top: 0.3rem; }

  .section { background: white; border-radius: 14px; margin-bottom: 1.5rem; box-shadow: 0 2px 10px rgba(0,0,0,0.06); overflow: hidden; }
  .section-title {
    padding: 1rem 1.2rem; font-weight: 800; font-size: 1rem;
    background: #f7fafc; border-bottom: 1px solid #e2e8f0;
    display: flex; justify-content: space-between; align-items: center;
  }
  .section-count { font-size: 0.78rem; color: #aaa; font-weight: 600; }

  table { width: 100%; border-collapse: collapse; font-size: 0.87rem; }
  th { background: #f7fafc; padding: 0.65rem 1rem; text-align: left; font-weight: 700; color: #555; border-bottom: 1px solid #e2e8f0; }
  td { padding: 0.6rem 1rem; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: #fafafa; }
  .empty-msg { padding: 1.5rem; text-align: center; color: #bbb; font-style: italic; }

  .badge-skor {
    display: inline-block; padding: 2px 10px; border-radius: 20px;
    background: #FFF9C4; color: #b7791f; font-weight: 700; font-size: 0.82rem;
  }
  .text-muted { color: #aaa; font-size: 0.8rem; }
  .isi-cell { max-width: 280px; word-break: break-word; }
</style>
</head>
<body>

<?php if (!$isLoggedIn): ?>
<!-- ═══ LOGIN ═══════════════════════════════════════════════════════════════ -->
<div class="login-wrap">
  <div class="login-card">
    <div class="login-logo">🏫</div>
    <h2>Admin Panel</h2>
    <form method="POST">
      <div class="field">
        <label for="username">Username</label>
        <input type="text" id="username" name="username" autocomplete="username" required>
      </div>
      <div class="field">
        <label for="password">Password</label>
        <input type="password" id="password" name="password" autocomplete="current-password" required>
      </div>
      <button type="submit" class="btn-login">Masuk →</button>
      <?php if (!empty($loginError)): ?>
        <p class="error-msg"><?= e($loginError) ?></p>
      <?php endif; ?>
    </form>
  </div>
</div>

<?php else: ?>
<!-- ═══ DASHBOARD ════════════════════════════════════════════════════════════ -->
<div class="topbar">
  <h1>🏫 Admin Panel — Media Pembelajaran Sistem Pernapasan</h1>
  <form method="POST" style="margin:0">
    <button type="submit" name="logout" value="1" class="btn-logout">Logout</button>
  </form>
</div>

<div class="container">

  <!-- Stat Cards -->
  <div class="stats">
    <div class="stat-card">
      <div class="stat-num" style="color:#4facfe"><?= (int)$totalSiswa ?></div>
      <div class="stat-label">Total Pengumpul Skor</div>
    </div>
    <div class="stat-card">
      <div class="stat-num" style="color:#38a169"><?= $avgSkor ?></div>
      <div class="stat-label">Rata-rata Skor PG</div>
    </div>
    <div class="stat-card">
      <div class="stat-num" style="color:#805ad5"><?= (int)$totalRef ?></div>
      <div class="stat-label">Refleksi Masuk</div>
    </div>
    <div class="stat-card">
      <div class="stat-num" style="color:#e53e3e"><?= (int)$totalPend ?></div>
      <div class="stat-label">Pendapat Video</div>
    </div>
  </div>

  <!-- Leaderboard -->
  <div class="section">
    <div class="section-title">
      🏆 Leaderboard PG
      <span class="section-count"><?= count($leaderRows) ?> entri</span>
    </div>
    <?php if ($leaderRows): ?>
    <div style="overflow-x:auto">
      <table>
        <thead>
          <tr><th>#</th><th>Nama</th><th>Kelas</th><th>Skor</th><th>Waktu</th></tr>
        </thead>
        <tbody>
          <?php foreach ($leaderRows as $i => $r): ?>
          <tr>
            <td class="text-muted"><?= $i + 1 ?></td>
            <td><?= e($r['nama']) ?></td>
            <td><?= e($r['kelas']) ?></td>
            <td><span class="badge-skor"><?= (int)$r['skor'] ?></span></td>
            <td class="text-muted"><?= e($r['created_at']) ?></td>
          </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
    <?php else: ?>
      <div class="empty-msg">Belum ada data.</div>
    <?php endif; ?>
  </div>

  <!-- Refleksi -->
  <div class="section">
    <div class="section-title">
      💭 Refleksi Siswa
      <span class="section-count"><?= count($refleksiRows) ?> entri</span>
    </div>
    <?php if ($refleksiRows): ?>
    <div style="overflow-x:auto">
      <table>
        <thead>
          <tr><th>Nama</th><th>Kelas</th><th>Isi Refleksi</th><th>Waktu</th></tr>
        </thead>
        <tbody>
          <?php foreach ($refleksiRows as $r): ?>
          <tr>
            <td><?= e($r['nama']) ?></td>
            <td><?= e($r['kelas']) ?></td>
            <td class="isi-cell"><?= e($r['isi']) ?></td>
            <td class="text-muted" style="white-space:nowrap"><?= e($r['created_at']) ?></td>
          </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
    <?php else: ?>
      <div class="empty-msg">Belum ada data.</div>
    <?php endif; ?>
  </div>

  <!-- Pendapat Video -->
  <div class="section">
    <div class="section-title">
      🎬 Pendapat Video
      <span class="section-count"><?= count($pendapatRows) ?> entri</span>
    </div>
    <?php if ($pendapatRows): ?>
    <div style="overflow-x:auto">
      <table>
        <thead>
          <tr><th>Nama</th><th>Kelas</th><th>Video ID</th><th>Isi Pendapat</th><th>Waktu</th></tr>
        </thead>
        <tbody>
          <?php foreach ($pendapatRows as $r): ?>
          <tr>
            <td><?= e($r['nama']) ?></td>
            <td><?= e($r['kelas']) ?></td>
            <td class="text-muted" style="font-size:0.75rem"><?= e($r['video_id']) ?></td>
            <td class="isi-cell"><?= e($r['isi']) ?></td>
            <td class="text-muted" style="white-space:nowrap"><?= e($r['created_at']) ?></td>
          </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
    <?php else: ?>
      <div class="empty-msg">Belum ada data.</div>
    <?php endif; ?>
  </div>

</div>
<?php endif; ?>
</body>
</html>
