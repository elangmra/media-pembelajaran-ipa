# Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade admin.php menjadi dashboard guru dengan 3 tab: Penilaian (pretest/posttest), Umpan Balik (refleksi+sentimen), dan Rekomendasi Belajar (otomatis+manual).

**Architecture:** Single-file admin.php dengan tab navigation via CSS display toggle + URL hash. Database ditambah kolom `tipe` di `leaderboard` dan tabel baru `rekomendasi`. Dua API baru untuk CRUD rekomendasi guru.

**Tech Stack:** PHP 8+, PDO MySQL, vanilla JS (no framework), CSS3

---

## File Map

| File | Action | Tanggung Jawab |
|------|--------|----------------|
| `db_setup.sql` | Modify | Tambah ALTER TABLE + CREATE TABLE rekomendasi |
| `api/submit_score.php` | Modify | Terima field `tipe` dan simpan ke DB |
| `api/submit_rekomendasi.php` | Create | Insert catatan guru ke tabel rekomendasi |
| `api/delete_rekomendasi.php` | Create | Hapus catatan guru by id |
| `js/app.js` | Modify | Kirim `tipe` saat save score; save pretest ke server |
| `admin.php` | Rewrite | Dashboard 3-tab lengkap |

---

## Task 1: Update Database Schema

**Files:**
- Modify: `db_setup.sql`

- [ ] **Step 1: Tambah migrasi di db_setup.sql**

Buka `db_setup.sql` dan tambahkan di bagian bawah file (setelah CREATE TABLE pendapat):

```sql
ALTER TABLE leaderboard
  ADD COLUMN IF NOT EXISTS tipe ENUM('pretest','posttest') NOT NULL DEFAULT 'posttest';

CREATE TABLE IF NOT EXISTS rekomendasi (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  nama         VARCHAR(100) NOT NULL,
  kelas        VARCHAR(20)  NOT NULL,
  catatan_guru TEXT         NOT NULL,
  skor_ref     INT          DEFAULT NULL,
  created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);
```

- [ ] **Step 2: Jalankan SQL di database**

Buka phpMyAdmin (http://localhost/phpmyadmin) atau jalankan via terminal:
```bash
mysql -u root media_pembelajaran -e "
  ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS tipe ENUM('pretest','posttest') NOT NULL DEFAULT 'posttest';
  CREATE TABLE IF NOT EXISTS rekomendasi (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    kelas VARCHAR(20) NOT NULL,
    catatan_guru TEXT NOT NULL,
    skor_ref INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
"
```

Verifikasi:
```bash
mysql -u root media_pembelajaran -e "DESCRIBE leaderboard; DESCRIBE rekomendasi;"
```
Expected: kolom `tipe` muncul di leaderboard, tabel `rekomendasi` terbentuk.

- [ ] **Step 3: Commit**

```bash
git add db_setup.sql
git commit -m "feat: add tipe column to leaderboard and rekomendasi table"
```

---

## Task 2: Update API submit_score.php

**Files:**
- Modify: `api/submit_score.php`

- [ ] **Step 1: Tambah field `tipe` di submit_score.php**

Ganti seluruh isi `api/submit_score.php` dengan:

```php
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
$tipe  = ($data['tipe'] ?? '') === 'pretest' ? 'pretest' : 'posttest';

if (!$nama || !$kelas || $skor < 0 || $skor > 100) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Data tidak valid']);
    exit;
}

$stmt = $pdo->prepare('INSERT INTO leaderboard (nama, kelas, skor, tipe) VALUES (?, ?, ?, ?)');
$stmt->execute([$nama, $kelas, $skor, $tipe]);

echo json_encode(['success' => true]);
```

- [ ] **Step 2: Test API via curl**

```bash
curl -s -X POST http://localhost/media_pembelajaran/api/submit_score.php \
  -H "Content-Type: application/json" \
  -d '{"nama":"Test Siswa","kelas":"5A","skor":80,"tipe":"pretest"}'
```
Expected: `{"success":true}`

```bash
curl -s -X POST http://localhost/media_pembelajaran/api/submit_score.php \
  -H "Content-Type: application/json" \
  -d '{"nama":"Test Siswa","kelas":"5A","skor":90,"tipe":"posttest"}'
```
Expected: `{"success":true}`

Verifikasi di DB:
```bash
mysql -u root media_pembelajaran -e "SELECT nama, kelas, skor, tipe FROM leaderboard ORDER BY id DESC LIMIT 2;"
```
Expected: dua baris dengan tipe berbeda.

- [ ] **Step 3: Commit**

```bash
git add api/submit_score.php
git commit -m "feat: submit_score API now accepts and stores tipe field"
```

---

## Task 3: Buat API submit_rekomendasi.php

**Files:**
- Create: `api/submit_rekomendasi.php`

- [ ] **Step 1: Buat file api/submit_rekomendasi.php**

```php
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

$data        = json_decode(file_get_contents('php://input'), true);
$nama        = trim(strip_tags($data['nama']        ?? ''));
$kelas       = trim(strip_tags($data['kelas']       ?? ''));
$catatan     = trim(strip_tags($data['catatan_guru'] ?? ''));
$skor_ref    = isset($data['skor_ref']) && $data['skor_ref'] !== '' ? intval($data['skor_ref']) : null;

if (!$nama || !$kelas || !$catatan) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Nama, kelas, dan catatan wajib diisi']);
    exit;
}

$stmt = $pdo->prepare('INSERT INTO rekomendasi (nama, kelas, catatan_guru, skor_ref) VALUES (?, ?, ?, ?)');
$stmt->execute([$nama, $kelas, $catatan, $skor_ref]);

echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
```

- [ ] **Step 2: Commit**

```bash
git add api/submit_rekomendasi.php
git commit -m "feat: add submit_rekomendasi API endpoint"
```

---

## Task 4: Buat API delete_rekomendasi.php

**Files:**
- Create: `api/delete_rekomendasi.php`

- [ ] **Step 1: Buat file api/delete_rekomendasi.php**

```php
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
```

- [ ] **Step 2: Commit**

```bash
git add api/delete_rekomendasi.php
git commit -m "feat: add delete_rekomendasi API endpoint"
```

---

## Task 5: Update app.js — kirim tipe saat simpan skor

**Files:**
- Modify: `js/app.js` (baris sekitar 735 dan 551–559)

- [ ] **Step 1: Update fungsi saveScoreToServer agar terima parameter tipe**

Cari fungsi di baris ~735:
```js
function saveScoreToServer(nama, kelas, skor) {
  fetch(API_BASE + '/submit_score.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nama, kelas, skor })
  }).catch(() => { }); // fire-and-forget, jangan blok UI
}
```

Ganti dengan:
```js
function saveScoreToServer(nama, kelas, skor, tipe = 'posttest') {
  fetch(API_BASE + '/submit_score.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nama, kelas, skor, tipe })
  }).catch(() => { });
}
```

- [ ] **Step 2: Update submitPG() agar kirim tipe 'posttest' secara eksplisit**

Cari di baris ~559:
```js
  saveScoreToServer(state.quiz.namaTemp, state.user.kelas || '-', score);
```

Ganti dengan:
```js
  saveScoreToServer(state.quiz.namaTemp, state.user.kelas || '-', score, 'posttest');
```

- [ ] **Step 3: Tambahkan saveScoreToServer di pretestNext() sebelum showScore**

Cari di baris ~360–362:
```js
    pretestDone = true;
    const score = Math.round((correct / pretestQuestions.length) * 100);
    showScore(score, 'PreTest IPA', correct, pretestQuestions.length);
```

Ganti dengan:
```js
    pretestDone = true;
    const score = Math.round((correct / pretestQuestions.length) * 100);
    saveScoreToServer(state.quiz.namaTemp, state.user.kelas || '-', score, 'pretest');
    showScore(score, 'PreTest IPA', correct, pretestQuestions.length);
```

- [ ] **Step 4: Commit**

```bash
git add js/app.js
git commit -m "feat: send tipe (pretest/posttest) when saving score to server"
```

---

## Task 6: Rewrite admin.php — Dashboard 3 Tab

**Files:**
- Rewrite: `admin.php`

- [ ] **Step 1: Ganti seluruh isi admin.php**

Ganti seluruh isi `admin.php` dengan kode berikut:

```php
<?php
session_start();

define('ADMIN_USER', 'guru');
define('ADMIN_PASS', 'ganti_password_ini');

define('DB_HOST', 'localhost');
define('DB_NAME', 'media_pembelajaran');
define('DB_USER', 'root');
define('DB_PASS', '');

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

function predikat(int $skor): string {
    if ($skor >= 85) return 'Sangat Baik';
    if ($skor >= 70) return 'Baik';
    if ($skor >= 55) return 'Cukup';
    return 'Perlu Bimbingan';
}

function predikatClass(int $skor): string {
    if ($skor >= 85) return 'pred-a';
    if ($skor >= 70) return 'pred-b';
    if ($skor >= 55) return 'pred-c';
    return 'pred-d';
}

function sentimen(string $teks): string {
    $lower = mb_strtolower($teks);
    $pos = ['senang','paham','suka','menarik','bagus','keren','mudah','jelas','mantap','hebat','seru'];
    $neg = ['sulit','bingung','susah','tidak mengerti','membosankan','kurang','tidak paham','susah','capek','lelah'];
    foreach ($neg as $k) { if (str_contains($lower, $k)) return 'negatif'; }
    foreach ($pos as $k) { if (str_contains($lower, $k)) return 'positif'; }
    return 'netral';
}

function rekomendasiTopik(int $skor): string {
    if ($skor < 55) return 'Ulang semua topik: organ, proses, jenis, &amp; gangguan pernapasan';
    return 'Ulang materi proses pernapasan &amp; gangguan pernapasan';
}

if ($isLoggedIn) {
    $pdo = getDB();

    $pretestRows  = $pdo->query("SELECT nama, kelas, skor, created_at FROM leaderboard WHERE tipe='pretest'  ORDER BY created_at DESC")->fetchAll(PDO::FETCH_ASSOC);
    $posttestRows = $pdo->query("SELECT nama, kelas, skor, created_at FROM leaderboard WHERE tipe='posttest' ORDER BY skor DESC, created_at ASC")->fetchAll(PDO::FETCH_ASSOC);
    $refleksiRows = $pdo->query("SELECT nama, kelas, isi, created_at FROM refleksi ORDER BY created_at DESC")->fetchAll(PDO::FETCH_ASSOC);
    $rekomendasiAuto = $pdo->query("SELECT nama, kelas, skor FROM leaderboard WHERE tipe='posttest' AND skor < 70 ORDER BY skor ASC")->fetchAll(PDO::FETCH_ASSOC);
    $rekomendasiManual = $pdo->query("SELECT id, nama, kelas, catatan_guru, skor_ref, created_at FROM rekomendasi ORDER BY created_at DESC")->fetchAll(PDO::FETCH_ASSOC);

    $avgPretest  = count($pretestRows)  ? round(array_sum(array_column($pretestRows,  'skor')) / count($pretestRows),  1) : 0;
    $avgPosttest = count($posttestRows) ? round(array_sum(array_column($posttestRows, 'skor')) / count($posttestRows), 1) : 0;
}

function e($s) { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); }
?>
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Dashboard Guru – Media Pembelajaran</title>
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Nunito', sans-serif; background: #F0F4FF; color: #2d3748; min-height: 100vh; }

/* ── Topbar ── */
.topbar {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white; padding: 1rem 1.5rem;
  display: flex; justify-content: space-between; align-items: center;
  box-shadow: 0 2px 12px rgba(79,172,254,0.3);
  position: sticky; top: 0; z-index: 100;
}
.topbar h1 { font-size: 1rem; font-weight: 800; }
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
  width: 100%; max-width: 380px; box-shadow: 0 8px 32px rgba(0,0,0,0.1);
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

/* ── Layout ── */
.container { max-width: 1000px; margin: 0 auto; padding: 1.5rem 1rem 3rem; }

/* ── Stat Cards ── */
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.8rem; }
.stat-card {
  background: white; border-radius: 14px; padding: 1.3rem; text-align: center;
  box-shadow: 0 2px 10px rgba(0,0,0,0.06);
}
.stat-num { font-size: 2.2rem; font-weight: 800; line-height: 1; }
.stat-label { font-size: 0.78rem; color: #888; margin-top: 0.3rem; font-weight: 600; }

/* ── Tab Nav ── */
.tab-nav {
  display: flex; gap: 0.5rem; margin-bottom: 1.5rem;
  background: white; border-radius: 14px; padding: 0.5rem;
  box-shadow: 0 2px 10px rgba(0,0,0,0.06);
}
.tab-btn {
  flex: 1; padding: 0.65rem 1rem; border: none; border-radius: 10px;
  background: transparent; font-family: inherit; font-size: 0.9rem;
  font-weight: 700; color: #888; cursor: pointer; transition: all .2s;
}
.tab-btn:hover { background: #f0f4ff; color: #4facfe; }
.tab-btn.active { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; }
@media (max-width: 520px) { .tab-btn { font-size: 0.78rem; padding: 0.55rem 0.4rem; } }

/* ── Tab Content ── */
.tab-pane { display: none; }
.tab-pane.active { display: block; }

/* ── Section Card ── */
.section { background: white; border-radius: 14px; margin-bottom: 1.5rem; box-shadow: 0 2px 10px rgba(0,0,0,0.06); overflow: hidden; }
.section-title {
  padding: 1rem 1.2rem; font-weight: 800; font-size: 1rem;
  background: #f7fafc; border-bottom: 1px solid #e2e8f0;
  display: flex; justify-content: space-between; align-items: center;
}
.section-count { font-size: 0.78rem; color: #aaa; font-weight: 600; }

/* ── Table ── */
table { width: 100%; border-collapse: collapse; font-size: 0.87rem; }
th { background: #f7fafc; padding: 0.65rem 1rem; text-align: left; font-weight: 700; color: #555; border-bottom: 1px solid #e2e8f0; }
td { padding: 0.6rem 1rem; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
tr:last-child td { border-bottom: none; }
tr:hover td { background: #fafbff; }
.empty-msg { padding: 1.5rem; text-align: center; color: #bbb; font-style: italic; }
.text-muted { color: #aaa; font-size: 0.8rem; }
.isi-cell { max-width: 260px; word-break: break-word; }

/* ── Predikat Badges ── */
.pred {
  display: inline-block; padding: 2px 10px; border-radius: 20px;
  font-weight: 700; font-size: 0.78rem; white-space: nowrap;
}
.pred-a { background: #C6F6D5; color: #276749; }
.pred-b { background: #BEE3F8; color: #2a69ac; }
.pred-c { background: #FEFCBF; color: #975a16; }
.pred-d { background: #FED7D7; color: #9b2c2c; }

/* ── Sentimen Badges ── */
.sent {
  display: inline-block; padding: 2px 10px; border-radius: 20px;
  font-weight: 700; font-size: 0.78rem; white-space: nowrap;
}
.sent-positif { background: #C6F6D5; color: #276749; }
.sent-netral  { background: #EDF2F7; color: #4a5568; }
.sent-negatif { background: #FED7D7; color: #9b2c2c; }

/* ── Rekomendasi Form ── */
.reko-form {
  padding: 1.2rem;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}
.reko-form .full { grid-column: 1 / -1; }
.reko-form label { display: block; font-size: 0.82rem; font-weight: 700; color: #555; margin-bottom: 0.3rem; }
.reko-form input, .reko-form textarea {
  width: 100%; padding: 0.6rem 0.8rem;
  border: 2px solid #e2e8f0; border-radius: 10px;
  font-family: inherit; font-size: 0.9rem; transition: border-color .2s;
}
.reko-form input:focus, .reko-form textarea:focus { outline: none; border-color: #4facfe; }
.reko-form textarea { min-height: 80px; resize: vertical; }
.btn-save {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white; border: none; border-radius: 10px;
  padding: 0.65rem 1.5rem; font-family: inherit;
  font-weight: 800; font-size: 0.9rem; cursor: pointer; transition: opacity .2s;
}
.btn-save:hover { opacity: 0.85; }
.btn-hapus {
  background: #FED7D7; color: #c53030; border: none;
  border-radius: 8px; padding: 3px 12px; font-family: inherit;
  font-weight: 700; font-size: 0.8rem; cursor: pointer;
}
.btn-hapus:hover { background: #fc8181; color: white; }
@media (max-width: 520px) {
  .reko-form { grid-template-columns: 1fr; }
}

/* ── Alert strip ── */
.alert-strip {
  background: #FFF5F5; border-left: 4px solid #fc8181;
  padding: 0.75rem 1.2rem; font-size: 0.85rem; color: #742a2a;
  margin: 0 1.2rem 1rem; border-radius: 0 8px 8px 0;
}

/* ── Toast ── */
#admin-toast {
  position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%);
  background: #2d3748; color: white; padding: 0.65rem 1.4rem;
  border-radius: 12px; font-weight: 700; font-size: 0.9rem;
  opacity: 0; transition: opacity .3s; pointer-events: none; z-index: 999;
}
#admin-toast.show { opacity: 1; }
</style>
</head>
<body>

<?php if (!$isLoggedIn): ?>
<!-- LOGIN -->
<div class="login-wrap">
  <div class="login-card">
    <div class="login-logo">🏫</div>
    <h2>Dashboard Guru</h2>
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
<!-- DASHBOARD -->
<div class="topbar">
  <h1>🏫 Dashboard Guru — Sistem Pernapasan</h1>
  <form method="POST" style="margin:0">
    <button type="submit" name="logout" value="1" class="btn-logout">Logout</button>
  </form>
</div>

<div class="container">

  <!-- Stat Cards -->
  <div class="stats">
    <div class="stat-card">
      <div class="stat-num" style="color:#FF8A65"><?= count($pretestRows) ?></div>
      <div class="stat-label">Siswa PreTest</div>
    </div>
    <div class="stat-card">
      <div class="stat-num" style="color:#e64a19"><?= $avgPretest ?></div>
      <div class="stat-label">Rata-rata Skor PreTest</div>
    </div>
    <div class="stat-card">
      <div class="stat-num" style="color:#4facfe"><?= count($posttestRows) ?></div>
      <div class="stat-label">Siswa PostTest</div>
    </div>
    <div class="stat-card">
      <div class="stat-num" style="color:#38a169"><?= $avgPosttest ?></div>
      <div class="stat-label">Rata-rata Skor PostTest</div>
    </div>
  </div>

  <!-- Tab Nav -->
  <div class="tab-nav">
    <button class="tab-btn" data-tab="penilaian" onclick="switchTab('penilaian')">📊 Penilaian</button>
    <button class="tab-btn" data-tab="refleksi" onclick="switchTab('refleksi')">💭 Umpan Balik</button>
    <button class="tab-btn" data-tab="rekomendasi" onclick="switchTab('rekomendasi')">💡 Rekomendasi</button>
  </div>

  <!-- ═══ TAB: PENILAIAN ═══ -->
  <div id="tab-penilaian" class="tab-pane">

    <!-- PreTest -->
    <div class="section">
      <div class="section-title">
        🟠 Rekap PreTest
        <span class="section-count"><?= count($pretestRows) ?> siswa</span>
      </div>
      <?php if ($pretestRows): ?>
      <div style="overflow-x:auto">
        <table>
          <thead><tr><th>#</th><th>Nama</th><th>Kelas</th><th>Skor</th><th>Predikat</th><th>Waktu</th></tr></thead>
          <tbody>
            <?php foreach ($pretestRows as $i => $r): $s = (int)$r['skor']; ?>
            <tr>
              <td class="text-muted"><?= $i+1 ?></td>
              <td><?= e($r['nama']) ?></td>
              <td><?= e($r['kelas']) ?></td>
              <td><strong><?= $s ?></strong></td>
              <td><span class="pred <?= predikatClass($s) ?>"><?= predikat($s) ?></span></td>
              <td class="text-muted" style="white-space:nowrap"><?= e($r['created_at']) ?></td>
            </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      </div>
      <?php else: ?><div class="empty-msg">Belum ada data PreTest.</div><?php endif; ?>
    </div>

    <!-- PostTest -->
    <div class="section">
      <div class="section-title">
        🔵 Rekap PostTest
        <span class="section-count"><?= count($posttestRows) ?> siswa</span>
      </div>
      <?php if ($posttestRows): ?>
      <div style="overflow-x:auto">
        <table>
          <thead><tr><th>#</th><th>Nama</th><th>Kelas</th><th>Skor</th><th>Predikat</th><th>Waktu</th></tr></thead>
          <tbody>
            <?php foreach ($posttestRows as $i => $r): $s = (int)$r['skor']; ?>
            <tr>
              <td class="text-muted"><?= $i+1 ?></td>
              <td><?= e($r['nama']) ?></td>
              <td><?= e($r['kelas']) ?></td>
              <td><strong><?= $s ?></strong></td>
              <td><span class="pred <?= predikatClass($s) ?>"><?= predikat($s) ?></span></td>
              <td class="text-muted" style="white-space:nowrap"><?= e($r['created_at']) ?></td>
            </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      </div>
      <?php else: ?><div class="empty-msg">Belum ada data PostTest.</div><?php endif; ?>
    </div>

  </div><!-- /tab-penilaian -->

  <!-- ═══ TAB: REFLEKSI ═══ -->
  <div id="tab-refleksi" class="tab-pane">
    <div class="section">
      <div class="section-title">
        💭 Umpan Balik Siswa (Refleksi)
        <span class="section-count"><?= count($refleksiRows) ?> entri</span>
      </div>
      <?php if ($refleksiRows): ?>
      <div style="overflow-x:auto">
        <table>
          <thead><tr><th>Nama</th><th>Kelas</th><th>Isi Refleksi</th><th>Sentimen</th><th>Waktu</th></tr></thead>
          <tbody>
            <?php foreach ($refleksiRows as $r):
              $sent = sentimen($r['isi']);
            ?>
            <tr>
              <td><?= e($r['nama']) ?></td>
              <td><?= e($r['kelas']) ?></td>
              <td class="isi-cell"><?= e($r['isi']) ?></td>
              <td><span class="sent sent-<?= $sent ?>"><?= ucfirst($sent) ?></span></td>
              <td class="text-muted" style="white-space:nowrap"><?= e($r['created_at']) ?></td>
            </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      </div>
      <?php else: ?><div class="empty-msg">Belum ada refleksi masuk.</div><?php endif; ?>
    </div>
  </div><!-- /tab-refleksi -->

  <!-- ═══ TAB: REKOMENDASI ═══ -->
  <div id="tab-rekomendasi" class="tab-pane">

    <!-- Otomatis -->
    <div class="section">
      <div class="section-title">
        ⚠️ Siswa Perlu Bimbingan (PostTest &lt; 70)
        <span class="section-count"><?= count($rekomendasiAuto) ?> siswa</span>
      </div>
      <?php if ($rekomendasiAuto): ?>
      <?php if (count($rekomendasiAuto) > 0): ?>
        <div class="alert-strip">Terdapat <?= count($rekomendasiAuto) ?> siswa dengan nilai posttest di bawah 70. Pertimbangkan untuk memberikan bimbingan tambahan.</div>
      <?php endif; ?>
      <div style="overflow-x:auto">
        <table>
          <thead><tr><th>Nama</th><th>Kelas</th><th>Skor</th><th>Status</th><th>Topik Disarankan</th></tr></thead>
          <tbody>
            <?php foreach ($rekomendasiAuto as $r): $s = (int)$r['skor']; ?>
            <tr>
              <td><?= e($r['nama']) ?></td>
              <td><?= e($r['kelas']) ?></td>
              <td><strong style="color:#e53e3e"><?= $s ?></strong></td>
              <td><span class="pred pred-d">Perlu Bimbingan</span></td>
              <td style="font-size:0.82rem; color:#555"><?= rekomendasiTopik($s) ?></td>
            </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      </div>
      <?php else: ?><div class="empty-msg">Semua siswa sudah mencapai nilai minimal 70.</div><?php endif; ?>
    </div>

    <!-- Manual: Form Input -->
    <div class="section">
      <div class="section-title">✏️ Catatan Guru (Manual)</div>
      <form class="reko-form" id="form-reko" onsubmit="submitReko(event)">
        <div>
          <label>Nama Siswa</label>
          <input type="text" id="reko-nama" placeholder="Nama siswa..." required>
        </div>
        <div>
          <label>Kelas</label>
          <input type="text" id="reko-kelas" placeholder="Contoh: 5A" required>
        </div>
        <div>
          <label>Skor Referensi <small style="font-weight:400;color:#aaa">(opsional)</small></label>
          <input type="number" id="reko-skor" min="0" max="100" placeholder="0–100">
        </div>
        <div></div>
        <div class="full">
          <label>Catatan / Rekomendasi</label>
          <textarea id="reko-catatan" placeholder="Tuliskan catatan atau rekomendasi belajar untuk siswa ini..." required></textarea>
        </div>
        <div class="full" style="display:flex;justify-content:flex-end">
          <button type="submit" class="btn-save">💾 Simpan Catatan</button>
        </div>
      </form>
    </div>

    <!-- Manual: Tabel Tersimpan -->
    <div class="section">
      <div class="section-title">
        📋 Daftar Catatan Tersimpan
        <span class="section-count" id="reko-count"><?= count($rekomendasiManual) ?> catatan</span>
      </div>
      <div id="reko-table-wrap">
      <?php if ($rekomendasiManual): ?>
      <div style="overflow-x:auto">
        <table id="reko-table">
          <thead><tr><th>Nama</th><th>Kelas</th><th>Catatan</th><th>Skor Ref</th><th>Waktu</th><th></th></tr></thead>
          <tbody id="reko-tbody">
            <?php foreach ($rekomendasiManual as $r): ?>
            <tr id="reko-row-<?= (int)$r['id'] ?>">
              <td><?= e($r['nama']) ?></td>
              <td><?= e($r['kelas']) ?></td>
              <td class="isi-cell"><?= e($r['catatan_guru']) ?></td>
              <td class="text-muted"><?= $r['skor_ref'] !== null ? (int)$r['skor_ref'] : '—' ?></td>
              <td class="text-muted" style="white-space:nowrap"><?= e($r['created_at']) ?></td>
              <td><button class="btn-hapus" onclick="hapusReko(<?= (int)$r['id'] ?>)">Hapus</button></td>
            </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      </div>
      <?php else: ?>
        <div class="empty-msg" id="reko-empty">Belum ada catatan tersimpan.</div>
      <?php endif; ?>
      </div>
    </div>

  </div><!-- /tab-rekomendasi -->

</div><!-- /container -->

<div id="admin-toast"></div>

<script>
// ── Tab switching ──
function switchTab(name) {
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  document.querySelector('[data-tab="' + name + '"]').classList.add('active');
  location.hash = name;
}

// Restore tab from hash
(function() {
  const hash = location.hash.replace('#', '');
  const valid = ['penilaian', 'refleksi', 'rekomendasi'];
  switchTab(valid.includes(hash) ? hash : 'penilaian');
})();

// ── Toast ──
function showToast(msg) {
  const t = document.getElementById('admin-toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

// ── Submit Rekomendasi ──
let rekoCount = <?= count($rekomendasiManual) ?>;

function submitReko(e) {
  e.preventDefault();
  const nama    = document.getElementById('reko-nama').value.trim();
  const kelas   = document.getElementById('reko-kelas').value.trim();
  const catatan = document.getElementById('reko-catatan').value.trim();
  const skor    = document.getElementById('reko-skor').value;

  fetch('api/submit_rekomendasi.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nama, kelas, catatan_guru: catatan, skor_ref: skor })
  })
  .then(r => r.json())
  .then(data => {
    if (!data.success) { showToast('❌ Gagal menyimpan: ' + (data.error || '')); return; }

    // Tambah baris ke tabel
    const tbody = document.getElementById('reko-tbody');
    const empty = document.getElementById('reko-empty');
    if (empty) empty.remove();

    let table = document.getElementById('reko-table');
    if (!table) {
      const wrap = document.getElementById('reko-table-wrap');
      wrap.innerHTML = '<div style="overflow-x:auto"><table id="reko-table"><thead><tr><th>Nama</th><th>Kelas</th><th>Catatan</th><th>Skor Ref</th><th>Waktu</th><th></th></tr></thead><tbody id="reko-tbody"></tbody></table></div>';
      table = document.getElementById('reko-table');
    }

    const tr = document.createElement('tr');
    tr.id = 'reko-row-' + data.id;
    tr.innerHTML = `
      <td>${escH(nama)}</td>
      <td>${escH(kelas)}</td>
      <td class="isi-cell">${escH(catatan)}</td>
      <td class="text-muted">${skor !== '' ? parseInt(skor) : '—'}</td>
      <td class="text-muted">Baru saja</td>
      <td><button class="btn-hapus" onclick="hapusReko(${data.id})">Hapus</button></td>
    `;
    document.getElementById('reko-tbody').prepend(tr);

    rekoCount++;
    document.getElementById('reko-count').textContent = rekoCount + ' catatan';
    document.getElementById('form-reko').reset();
    showToast('✅ Catatan berhasil disimpan!');
  })
  .catch(() => showToast('❌ Gagal terhubung ke server.'));
}

// ── Hapus Rekomendasi ──
function hapusReko(id) {
  if (!confirm('Hapus catatan ini?')) return;
  fetch('api/delete_rekomendasi.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  })
  .then(r => r.json())
  .then(data => {
    if (!data.success) { showToast('❌ Gagal menghapus.'); return; }
    const row = document.getElementById('reko-row-' + id);
    if (row) row.remove();
    rekoCount = Math.max(0, rekoCount - 1);
    document.getElementById('reko-count').textContent = rekoCount + ' catatan';
    if (rekoCount === 0) {
      const wrap = document.getElementById('reko-table-wrap');
      wrap.innerHTML = '<div class="empty-msg" id="reko-empty">Belum ada catatan tersimpan.</div>';
    }
    showToast('🗑️ Catatan dihapus.');
  })
  .catch(() => showToast('❌ Gagal terhubung ke server.'));
}

function escH(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
</script>

<?php endif; ?>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add admin.php
git commit -m "feat: rewrite admin dashboard with 3-tab navigation (penilaian, refleksi, rekomendasi)"
```

---

## Self-Review Checklist

- [x] Spec §1 Database → Task 1
- [x] Spec §2 API submit_score → Task 2
- [x] Spec §2 API submit_rekomendasi → Task 3
- [x] Spec §2 API delete_rekomendasi → Task 4
- [x] Spec §3 app.js tipe → Task 5
- [x] Spec §4 Tab nav + stat cards → Task 6 (admin.php)
- [x] Spec §5 Penilaian pretest/posttest + predikat → Task 6
- [x] Spec §6 Refleksi + sentimen → Task 6
- [x] Spec §7 Rekomendasi otomatis + manual form → Task 6
- [x] Spec §8 Security (session check, escaping, POST delete) → Task 3, 4, 6
