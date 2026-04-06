# Interactive Quiz Leaderboard & Student Responses Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add PHP+MySQL backend to store PG quiz scores (public leaderboard with podium), student reflections, and video opinions — plus a teacher admin dashboard.

**Architecture:** PHP REST API files in `api/` handle all DB operations; frontend JS calls them via `fetch()` (fire-and-forget, non-blocking); a standalone `admin.php` provides a password-protected teacher dashboard. All new UI uses the existing wave-header pattern and CSS classes.

**Tech Stack:** PHP 7.4+, MySQL 5.7+, PDO, vanilla JS (existing), no framework

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `db_setup.sql` | SQL to create 3 tables |
| Create | `api/db.php` | PDO connection (required by all endpoints) |
| Create | `api/submit_score.php` | POST: save PG score to leaderboard table |
| Create | `api/get_leaderboard.php` | GET: return top 20 scores as JSON |
| Create | `api/submit_refleksi.php` | POST: save refleksi to refleksi table |
| Create | `api/submit_pendapat.php` | POST: save pendapat to pendapat table |
| Create | `admin.php` | Teacher dashboard (PHP session login) |
| Modify | `index.html:1287-1290` | Add "Lihat Leaderboard" button in `.skor-actions`; add `screen-leaderboard` before `</body>` |
| Modify | `js/app.js:11-20` | Add `currentVideoId` to state |
| Modify | `js/app.js:121-130` | Call `loadLeaderboard()` in `showScreen()` when id is `screen-leaderboard` |
| Modify | `js/app.js:201-209` | Track `state.currentVideoId` in `changeVideo()` |
| Modify | `js/app.js:417-424` | Call `saveScoreToServer()` in `submitPG()` |
| Add | `js/app.js` (end of file) | `saveScoreToServer()`, `loadLeaderboard()`, `renderLeaderboard()`, `submitRefleksi()`, `submitPendapat()` |

---

## Task 1: Database Setup

**Files:**
- Create: `db_setup.sql`
- Create: `api/db.php`

- [ ] **Step 1: Create `db_setup.sql`**

```sql
CREATE DATABASE IF NOT EXISTS media_pembelajaran CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE media_pembelajaran;

CREATE TABLE IF NOT EXISTS leaderboard (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  nama       VARCHAR(100) NOT NULL,
  kelas      VARCHAR(20)  NOT NULL,
  skor       INT          NOT NULL,
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS refleksi (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  nama       VARCHAR(100) NOT NULL,
  kelas      VARCHAR(20)  NOT NULL,
  isi        TEXT         NOT NULL,
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pendapat (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  nama       VARCHAR(100) NOT NULL,
  kelas      VARCHAR(20)  NOT NULL,
  video_id   VARCHAR(50)  NOT NULL,
  isi        TEXT         NOT NULL,
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);
```

- [ ] **Step 2: Run SQL di MySQL lokal (Laragon)**

Buka phpMyAdmin di `http://localhost/phpmyadmin` atau jalankan via terminal Laragon:
```
mysql -u root -p < db_setup.sql
```
Expected: Database `media_pembelajaran` muncul dengan 3 tabel.

- [ ] **Step 3: Buat `api/db.php`**

```php
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
```

- [ ] **Step 4: Verifikasi koneksi**

Buat file sementara `api/test_db.php`:
```php
<?php
require_once 'db.php';
echo 'OK';
```
Buka `http://localhost/media_pembelajaran/api/test_db.php` di browser.
Expected: halaman tampilkan `OK`.
Hapus file ini setelah berhasil.

- [ ] **Step 5: Commit**

```bash
git add db_setup.sql api/db.php
git commit -m "feat: add database schema and PHP connection"
```

---

## Task 2: Submit Score API

**Files:**
- Create: `api/submit_score.php`

- [ ] **Step 1: Buat `api/submit_score.php`**

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

if (!$nama || !$kelas || $skor < 0 || $skor > 100) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Data tidak valid']);
    exit;
}

$stmt = $pdo->prepare('INSERT INTO leaderboard (nama, kelas, skor) VALUES (?, ?, ?)');
$stmt->execute([$nama, $kelas, $skor]);

echo json_encode(['success' => true]);
```

- [ ] **Step 2: Test dengan curl**

```bash
curl -s -X POST http://localhost/media_pembelajaran/api/submit_score.php \
  -H "Content-Type: application/json" \
  -d '{"nama":"Budi","kelas":"5A","skor":90}'
```
Expected output: `{"success":true}`

- [ ] **Step 3: Test validasi — skor tidak valid**

```bash
curl -s -X POST http://localhost/media_pembelajaran/api/submit_score.php \
  -H "Content-Type: application/json" \
  -d '{"nama":"Budi","kelas":"5A","skor":200}'
```
Expected output: `{"success":false,"error":"Data tidak valid"}`

- [ ] **Step 4: Commit**

```bash
git add api/submit_score.php
git commit -m "feat: add submit_score API endpoint"
```

---

## Task 3: Get Leaderboard API

**Files:**
- Create: `api/get_leaderboard.php`

- [ ] **Step 1: Buat `api/get_leaderboard.php`**

```php
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
```

- [ ] **Step 2: Test dengan curl**

```bash
curl -s http://localhost/media_pembelajaran/api/get_leaderboard.php
```
Expected output (contoh): `{"success":true,"data":[{"nama":"Budi","kelas":"5A","skor":"90","tanggal":"06/04/26"}]}`

- [ ] **Step 3: Commit**

```bash
git add api/get_leaderboard.php
git commit -m "feat: add get_leaderboard API endpoint"
```

---

## Task 4: Submit Refleksi & Pendapat APIs

**Files:**
- Create: `api/submit_refleksi.php`
- Create: `api/submit_pendapat.php`

- [ ] **Step 1: Buat `api/submit_refleksi.php`**

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
$isi   = trim(strip_tags($data['isi']   ?? ''));

if (!$nama || !$kelas || !$isi) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Data tidak lengkap']);
    exit;
}

$stmt = $pdo->prepare('INSERT INTO refleksi (nama, kelas, isi) VALUES (?, ?, ?)');
$stmt->execute([$nama, $kelas, $isi]);

echo json_encode(['success' => true]);
```

- [ ] **Step 2: Buat `api/submit_pendapat.php`**

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

$data     = json_decode(file_get_contents('php://input'), true);
$nama     = trim(strip_tags($data['nama']     ?? ''));
$kelas    = trim(strip_tags($data['kelas']    ?? ''));
$video_id = trim(strip_tags($data['video_id'] ?? ''));
$isi      = trim(strip_tags($data['isi']      ?? ''));

if (!$nama || !$kelas || !$isi) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Data tidak lengkap']);
    exit;
}

$stmt = $pdo->prepare('INSERT INTO pendapat (nama, kelas, video_id, isi) VALUES (?, ?, ?, ?)');
$stmt->execute([$nama, $kelas, $video_id ?: 'unknown', $isi]);

echo json_encode(['success' => true]);
```

- [ ] **Step 3: Test submit_refleksi**

```bash
curl -s -X POST http://localhost/media_pembelajaran/api/submit_refleksi.php \
  -H "Content-Type: application/json" \
  -d '{"nama":"Ani","kelas":"5B","isi":"Hari ini saya belajar tentang paru-paru!"}'
```
Expected: `{"success":true}`

- [ ] **Step 4: Test submit_pendapat**

```bash
curl -s -X POST http://localhost/media_pembelajaran/api/submit_pendapat.php \
  -H "Content-Type: application/json" \
  -d '{"nama":"Ani","kelas":"5B","video_id":"mqwj6eqIyuA","isi":"Videonya sangat menarik!"}'
```
Expected: `{"success":true}`

- [ ] **Step 5: Commit**

```bash
git add api/submit_refleksi.php api/submit_pendapat.php
git commit -m "feat: add submit_refleksi and submit_pendapat API endpoints"
```

---

## Task 5: Wire Score Submission + Leaderboard Button

**Files:**
- Modify: `js/app.js:417-424` (fungsi `submitPG`)
- Modify: `index.html:1287-1290` (div `.skor-actions`)

- [ ] **Step 1: Tambah fungsi `saveScoreToServer` di `js/app.js` (sebelum komentar `// INIT`)**

Tambahkan kode berikut tepat sebelum baris `document.addEventListener('DOMContentLoaded', ...` di `app.js`:

```javascript
// ============================================
// API HELPERS
// ============================================
const API_BASE = 'api';

function saveScoreToServer(nama, kelas, skor) {
  fetch(API_BASE + '/submit_score.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nama, kelas, skor })
  }).catch(() => {}); // fire-and-forget, jangan blok UI
}
```

- [ ] **Step 2: Modifikasi `submitPG()` di `js/app.js` (baris 417-424)**

Ganti:
```javascript
function submitPG() {
  let correct = 0;
  pgQuestions.forEach((q, i) => {
    if (state.quiz.answers[i] === q.answer) correct++;
  });
  const score = Math.round((correct / pgQuestions.length) * 100);
  showScore(score, 'Pilihan Ganda', correct, pgQuestions.length);
}
```

Dengan:
```javascript
function submitPG() {
  let correct = 0;
  pgQuestions.forEach((q, i) => {
    if (state.quiz.answers[i] === q.answer) correct++;
  });
  const score = Math.round((correct / pgQuestions.length) * 100);
  showScore(score, 'Pilihan Ganda', correct, pgQuestions.length);
  // Simpan ke server (non-blocking)
  saveScoreToServer(state.quiz.namaTemp, state.user.kelas || '-', score);
}
```

- [ ] **Step 3: Tambah tombol Leaderboard di `index.html` baris 1287-1290**

Ganti:
```html
        <div class="skor-actions">
          <button class="btn-secondary" onclick="retryQuiz()">🔄 Coba Lagi</button>
          <button class="btn-primary" onclick="showScreen('screen-menu')">🏠 Menu Utama</button>
        </div>
```

Dengan:
```html
        <div class="skor-actions">
          <button class="btn-secondary" onclick="retryQuiz()">🔄 Coba Lagi</button>
          <button class="btn-primary" onclick="showScreen('screen-leaderboard')">🏆 Lihat Leaderboard</button>
          <button class="btn-secondary" onclick="showScreen('screen-menu')">🏠 Menu Utama</button>
        </div>
```

- [ ] **Step 4: Test di browser**

1. Buka `http://localhost/media_pembelajaran`
2. Login, masuk ke Latihan Soal → PG
3. Kerjakan semua soal sampai selesai
4. Cek Network tab di DevTools → pastikan ada request POST ke `api/submit_score.php` dengan status 200
5. Tombol "🏆 Lihat Leaderboard" harus muncul di screen hasil skor

- [ ] **Step 5: Commit**

```bash
git add js/app.js index.html
git commit -m "feat: submit PG score to server and add leaderboard button"
```

---

## Task 6: Screen Leaderboard (HTML + JS)

**Files:**
- Modify: `index.html` (tambah screen baru sebelum `</body>`)
- Modify: `js/app.js` (tambah `loadLeaderboard`, `renderLeaderboard`; modifikasi `showScreen`)

- [ ] **Step 1: Tambah screen-leaderboard di `index.html` sebelum tag `</body>`**

```html
  <!-- ===================== SCREEN: LEADERBOARD ===================== -->
  <div id="screen-leaderboard" class="screen content-screen">
    <div class="wave-header" style="background: linear-gradient(135deg, #f6d365 0%, #fda085 100%);">
      <div class="wave-header-deco"><div class="hd-circle hd-c1"></div><div class="hd-circle hd-c2"></div><div class="hd-circle hd-c3"></div></div>
      <div class="wave-header-inner">
        <button class="btn-wave-back" onclick="showScreen('screen-skor')">&#8592; Kembali</button>
        <div class="wave-header-title"><h2>Leaderboard</h2><p>Peringkat nilai kuis pilihan ganda</p></div>
        <div class="wave-header-icon">🏆</div>
      </div>
      <div class="wave-header-wave"><svg viewBox="0 0 1200 50" preserveAspectRatio="none"><path d="M0 30 Q300 0 600 25 Q900 50 1200 20 L1200 50 L0 50Z" fill="#F8FAFF"/></svg></div>
    </div>
    <div class="content-body">
      <div id="leaderboard-loading" style="text-align:center; padding: 2rem; color: #888;">
        ⏳ Memuat data...
      </div>
      <!-- Podium Top 3 -->
      <div id="leaderboard-podium" style="display:none; margin-bottom: 1.5rem;">
        <div style="display:flex; justify-content:center; align-items:flex-end; gap:12px; padding: 0 1rem 1rem;">
          <!-- Rank 2 (kiri) -->
          <div id="podium-2" style="text-align:center; flex:1;">
            <div style="font-size:0.75rem; font-weight:700; margin-bottom:4px; color:#555;" id="podium-2-nama">-</div>
            <div style="font-size:0.7rem; color:#888; margin-bottom:6px;" id="podium-2-kelas">-</div>
            <div style="background: linear-gradient(180deg,#C0C0C0,#A9A9A9); border-radius:8px 8px 0 0; min-height:64px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:white; font-weight:700;">
              <span style="font-size:1.5rem;">🥈</span>
              <span id="podium-2-skor" style="font-size:1.1rem;">-</span>
            </div>
          </div>
          <!-- Rank 1 (tengah, paling tinggi) -->
          <div id="podium-1" style="text-align:center; flex:1;">
            <div style="font-size:0.8rem; font-weight:700; margin-bottom:4px; color:#333;" id="podium-1-nama">-</div>
            <div style="font-size:0.7rem; color:#888; margin-bottom:6px;" id="podium-1-kelas">-</div>
            <div style="background: linear-gradient(180deg,#FFD700,#FFA500); border-radius:8px 8px 0 0; min-height:88px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:white; font-weight:700; box-shadow:0 4px 12px rgba(255,165,0,0.4);">
              <span style="font-size:1.8rem;">🥇</span>
              <span id="podium-1-skor" style="font-size:1.3rem;">-</span>
            </div>
          </div>
          <!-- Rank 3 (kanan) -->
          <div id="podium-3" style="text-align:center; flex:1;">
            <div style="font-size:0.75rem; font-weight:700; margin-bottom:4px; color:#555;" id="podium-3-nama">-</div>
            <div style="font-size:0.7rem; color:#888; margin-bottom:6px;" id="podium-3-kelas">-</div>
            <div style="background: linear-gradient(180deg,#CD7F32,#A0522D); border-radius:8px 8px 0 0; min-height:48px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:white; font-weight:700;">
              <span style="font-size:1.3rem;">🥉</span>
              <span id="podium-3-skor" style="font-size:1rem;">-</span>
            </div>
          </div>
        </div>
      </div>
      <!-- Tabel rank 4+ -->
      <div id="leaderboard-table-wrap" style="display:none;">
        <table style="width:100%; border-collapse:collapse; font-size:0.9rem;">
          <thead>
            <tr style="background: linear-gradient(135deg, #f6d365, #fda085); color:white;">
              <th style="padding:8px 12px; text-align:left; border-radius:8px 0 0 0;">#</th>
              <th style="padding:8px 12px; text-align:left;">Nama</th>
              <th style="padding:8px 12px; text-align:left;">Kelas</th>
              <th style="padding:8px 12px; text-align:center; border-radius:0 8px 0 0;">Skor</th>
            </tr>
          </thead>
          <tbody id="leaderboard-tbody"></tbody>
        </table>
      </div>
      <div id="leaderboard-empty" style="display:none; text-align:center; padding:2rem; color:#888;">
        Belum ada data leaderboard. Jadilah yang pertama! 🚀
      </div>
      <button class="btn-secondary" onclick="showScreen('screen-menu')" style="width:100%; margin-top:1.5rem;">
        🏠 Menu Utama
      </button>
    </div>
  </div>
```

- [ ] **Step 2: Tambah `loadLeaderboard()` dan `renderLeaderboard()` di `js/app.js` (dalam blok API HELPERS)**

Tambahkan setelah `saveScoreToServer`:

```javascript
function loadLeaderboard() {
  const loading = document.getElementById('leaderboard-loading');
  const podium  = document.getElementById('leaderboard-podium');
  const tableWrap = document.getElementById('leaderboard-table-wrap');
  const empty   = document.getElementById('leaderboard-empty');

  if (loading) loading.style.display = 'block';
  if (podium)  podium.style.display  = 'none';
  if (tableWrap) tableWrap.style.display = 'none';
  if (empty)   empty.style.display   = 'none';

  fetch(API_BASE + '/get_leaderboard.php')
    .then(r => r.json())
    .then(res => {
      if (loading) loading.style.display = 'none';
      if (!res.success || !res.data.length) {
        if (empty) empty.style.display = 'block';
        return;
      }
      renderLeaderboard(res.data);
    })
    .catch(() => {
      if (loading) loading.style.display = 'none';
      if (empty)   empty.style.display   = 'block';
    });
}

function renderLeaderboard(data) {
  const myNama = (state.quiz.namaTemp || state.user.nama || '').toLowerCase();

  // Podium top 3
  const podium = document.getElementById('leaderboard-podium');
  [1, 2, 3].forEach(rank => {
    const entry = data[rank - 1];
    if (entry) {
      document.getElementById('podium-' + rank + '-nama').textContent  = entry.nama;
      document.getElementById('podium-' + rank + '-kelas').textContent = entry.kelas;
      document.getElementById('podium-' + rank + '-skor').textContent  = entry.skor;
      // Highlight jika nama cocok
      const col = document.getElementById('podium-' + rank);
      if (col && entry.nama.toLowerCase() === myNama) {
        col.style.outline = '2px solid #4facfe';
        col.style.borderRadius = '8px';
      }
    }
  });
  if (podium) podium.style.display = 'block';

  // Tabel rank 4+
  const tbody = document.getElementById('leaderboard-tbody');
  const tableWrap = document.getElementById('leaderboard-table-wrap');
  tbody.innerHTML = '';
  const rest = data.slice(3);
  if (rest.length) {
    rest.forEach((entry, i) => {
      const rank = i + 4;
      const isMe = entry.nama.toLowerCase() === myNama;
      const tr = document.createElement('tr');
      tr.style.background = isMe ? '#FFF9C4' : (i % 2 === 0 ? '#fff' : '#fafafa');
      if (isMe) tr.style.fontWeight = '600';
      tr.innerHTML = `
        <td style="padding:8px 12px; color:#888;">${rank}</td>
        <td style="padding:8px 12px;">${entry.nama}${isMe ? ' ✨' : ''}</td>
        <td style="padding:8px 12px; color:#666;">${entry.kelas}</td>
        <td style="padding:8px 12px; text-align:center; font-weight:700; color:#f6a623;">${entry.skor}</td>
      `;
      tbody.appendChild(tr);
    });
    tableWrap.style.display = 'block';
  }
}
```

- [ ] **Step 3: Hook `loadLeaderboard()` ke `showScreen()` di `js/app.js`**

Ganti fungsi `showScreen` (baris 121-130):
```javascript
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) {
    target.classList.add('active');
    window.scrollTo(0, 0);
  }
  AudioManager.play(id);
}
```

Dengan:
```javascript
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) {
    target.classList.add('active');
    window.scrollTo(0, 0);
  }
  AudioManager.play(id);
  if (id === 'screen-leaderboard') loadLeaderboard();
}
```

- [ ] **Step 4: Test di browser**

1. Kerjakan quiz PG sampai selesai
2. Klik "🏆 Lihat Leaderboard"
3. Verifikasi:
   - Podium muncul dengan nama siswa yang tadi submit
   - Nama siswa di-highlight (podium outline biru atau baris kuning)
   - Tombol "Menu Utama" berfungsi

- [ ] **Step 5: Commit**

```bash
git add index.html js/app.js
git commit -m "feat: add leaderboard screen with podium and table"
```

---

## Task 7: Wire submitRefleksi() & submitPendapat()

**Files:**
- Modify: `js/app.js` (state object, `changeVideo()`, tambah 2 fungsi)

- [ ] **Step 1: Tambah `currentVideoId` ke state object (baris 11-20)**

Ganti:
```javascript
const state = {
  user: { nama: '', kelas: '' },
  quiz: {
    type: null,
    currentIndex: 0,
    answers: [],
    namaTemp: '',
    submitted: false,
  }
};
```

Dengan:
```javascript
const state = {
  user: { nama: '', kelas: '' },
  currentVideoId: 'mqwj6eqIyuA',
  quiz: {
    type: null,
    currentIndex: 0,
    answers: [],
    namaTemp: '',
    submitted: false,
  }
};
```

- [ ] **Step 2: Update `changeVideo()` di `js/app.js` (baris 201-209) untuk track video ID**

Ganti:
```javascript
function changeVideo(videoId, el) {
  const iframe = document.getElementById('youtube-video');
  const link = document.getElementById('youtube-link');
  if (iframe) iframe.src = 'https://www.youtube.com/embed/' + videoId + '?autoplay=1';
  if (link) link.href = 'https://www.youtube.com/watch?v=' + videoId;

  document.querySelectorAll('.video-item').forEach(v => v.style.background = '');
  if (el) el.style.background = '#EBF8FF';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
```

Dengan:
```javascript
function changeVideo(videoId, el) {
  state.currentVideoId = videoId;
  const iframe = document.getElementById('youtube-video');
  const link = document.getElementById('youtube-link');
  if (iframe) iframe.src = 'https://www.youtube.com/embed/' + videoId + '?autoplay=1';
  if (link) link.href = 'https://www.youtube.com/watch?v=' + videoId;

  document.querySelectorAll('.video-item').forEach(v => v.style.background = '');
  if (el) el.style.background = '#EBF8FF';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
```

- [ ] **Step 3: Tambah `submitRefleksi()` dan `submitPendapat()` di blok API HELPERS**

Tambahkan setelah `renderLeaderboard`:

```javascript
function submitRefleksi() {
  const textarea = document.getElementById('rangkuman-refleksi-input');
  const btn = textarea ? textarea.parentElement.querySelector('button') : null;
  const isi = textarea ? textarea.value.trim() : '';

  if (!isi) { showToast('❗ Tulis refleksimu dulu ya!'); return; }
  if (!state.user.nama) { showToast('❗ Kamu belum login!'); return; }

  fetch(API_BASE + '/submit_refleksi.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nama: state.user.nama, kelas: state.user.kelas, isi })
  })
    .then(r => r.json())
    .then(res => {
      if (res.success) {
        showToast('💭 Refleksi kamu sudah terkirim!');
        textarea.value = '';
        if (btn) { btn.disabled = true; btn.textContent = '✅ Terkirim'; }
      } else {
        showToast('❗ Gagal mengirim, coba lagi.');
      }
    })
    .catch(() => showToast('❗ Gagal mengirim, coba lagi.'));
}

function submitPendapat() {
  const textarea = document.getElementById('video-opinion-input');
  const btn = textarea ? textarea.parentElement.querySelector('button') : null;
  const isi = textarea ? textarea.value.trim() : '';

  if (!isi) { showToast('❗ Tulis pendapatmu dulu ya!'); return; }
  if (!state.user.nama) { showToast('❗ Kamu belum login!'); return; }

  fetch(API_BASE + '/submit_pendapat.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nama: state.user.nama, kelas: state.user.kelas, video_id: state.currentVideoId, isi })
  })
    .then(r => r.json())
    .then(res => {
      if (res.success) {
        showToast('🎬 Pendapat kamu sudah terkirim!');
        textarea.value = '';
        if (btn) { btn.disabled = true; btn.textContent = '✅ Terkirim'; }
      } else {
        showToast('❗ Gagal mengirim, coba lagi.');
      }
    })
    .catch(() => showToast('❗ Gagal mengirim, coba lagi.'));
}
```

- [ ] **Step 4: Test Refleksi di browser**

1. Login dan buka screen Rangkuman
2. Scroll ke bawah sampai form refleksi
3. Isi textarea dan klik "Simpan Refleksi 💡"
4. Verifikasi: toast "💭 Refleksi kamu sudah terkirim!" muncul, textarea kosong, tombol berubah "✅ Terkirim"
5. Cek via curl: `curl -s http://localhost/media_pembelajaran/api/get_leaderboard.php` (untuk verifikasi DB aktif, refleksi ada di tabel `refleksi`)

- [ ] **Step 5: Test Pendapat di browser**

1. Buka screen Video Pembelajaran
2. Scroll ke bawah sampai form pendapat
3. Isi textarea dan klik "Kirim Pendapat 🚀"
4. Verifikasi: toast "🎬 Pendapat kamu sudah terkirim!", textarea kosong, tombol "✅ Terkirim"

- [ ] **Step 6: Commit**

```bash
git add js/app.js
git commit -m "feat: wire submitRefleksi and submitPendapat to backend API"
```

---

## Task 8: Admin Page

**Files:**
- Create: `admin.php`

- [ ] **Step 1: Buat `admin.php`**

```php
<?php
session_start();

// ── Konfigurasi ───────────────────────────────
define('ADMIN_USER', 'guru');
define('ADMIN_PASS', 'ganti_password_ini');  // GANTI sebelum deploy!

// ── Koneksi DB ────────────────────────────────
define('DB_HOST', 'localhost');
define('DB_NAME', 'media_pembelajaran');
define('DB_USER', 'root');
define('DB_PASS', '');  // sesuaikan

function getDB() {
    static $pdo;
    if (!$pdo) {
        $pdo = new PDO('mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
                       DB_USER, DB_PASS,
                       [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    }
    return $pdo;
}

// ── Auth ──────────────────────────────────────
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

// ── Data (hanya jika login) ───────────────────
if ($isLoggedIn) {
    $pdo = getDB();
    $totalSiswa  = $pdo->query('SELECT COUNT(*) FROM leaderboard')->fetchColumn();
    $avgSkor     = $pdo->query('SELECT ROUND(AVG(skor),1) FROM leaderboard')->fetchColumn() ?: 0;
    $totalRef    = $pdo->query('SELECT COUNT(*) FROM refleksi')->fetchColumn();
    $totalPend   = $pdo->query('SELECT COUNT(*) FROM pendapat')->fetchColumn();
    $leaderRows  = $pdo->query('SELECT nama, kelas, skor, created_at FROM leaderboard ORDER BY skor DESC, created_at ASC')->fetchAll(PDO::FETCH_ASSOC);
    $refleksiRows= $pdo->query('SELECT nama, kelas, isi, created_at FROM refleksi ORDER BY created_at DESC')->fetchAll(PDO::FETCH_ASSOC);
    $pendapatRows= $pdo->query('SELECT nama, kelas, video_id, isi, created_at FROM pendapat ORDER BY created_at DESC')->fetchAll(PDO::FETCH_ASSOC);
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
  body { font-family: 'Nunito', sans-serif; background: #F8FAFF; color: #2d3748; }
  .topbar { background: linear-gradient(135deg, #4facfe, #00f2fe); color: white; padding: 1rem 1.5rem; display: flex; justify-content: space-between; align-items: center; }
  .topbar h1 { font-size: 1.1rem; font-weight: 800; }
  .btn { padding: 0.4rem 1rem; border-radius: 8px; border: none; cursor: pointer; font-family: inherit; font-weight: 700; font-size: 0.85rem; }
  .btn-logout { background: rgba(255,255,255,0.2); color: white; }
  .btn-logout:hover { background: rgba(255,255,255,0.35); }
  .container { max-width: 900px; margin: 0 auto; padding: 1.5rem 1rem; }
  /* Login form */
  .login-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; }
  .login-card { background: white; border-radius: 16px; padding: 2rem; width: 100%; max-width: 360px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
  .login-card h2 { text-align: center; margin-bottom: 1.5rem; color: #4facfe; }
  .field { margin-bottom: 1rem; }
  .field label { display: block; font-size: 0.85rem; font-weight: 700; margin-bottom: 0.3rem; color: #555; }
  .field input { width: 100%; padding: 0.6rem 0.8rem; border: 2px solid #e2e8f0; border-radius: 8px; font-family: inherit; font-size: 0.95rem; }
  .field input:focus { outline: none; border-color: #4facfe; }
  .btn-login { width: 100%; padding: 0.7rem; background: linear-gradient(135deg, #4facfe, #00f2fe); color: white; border: none; border-radius: 10px; font-family: inherit; font-weight: 800; font-size: 1rem; cursor: pointer; margin-top: 0.5rem; }
  .error-msg { color: #e53e3e; font-size: 0.85rem; margin-top: 0.5rem; text-align: center; }
  /* Stat cards */
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
  .stat-card { background: white; border-radius: 12px; padding: 1.2rem; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
  .stat-num { font-size: 2rem; font-weight: 800; }
  .stat-label { font-size: 0.8rem; color: #888; margin-top: 0.2rem; }
  /* Sections */
  .section { background: white; border-radius: 12px; margin-bottom: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.06); overflow: hidden; }
  .section-header { padding: 0.9rem 1.2rem; font-weight: 800; font-size: 1rem; cursor: pointer; display: flex; justify-content: space-between; align-items: center; background: #f7fafc; border-bottom: 1px solid #e2e8f0; }
  .section-body { padding: 0; overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
  th { background: #f7fafc; padding: 0.6rem 1rem; text-align: left; font-weight: 700; color: #555; border-bottom: 1px solid #e2e8f0; }
  td { padding: 0.6rem 1rem; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: #f7fafc; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; }
  .badge-score { background: #FFF9C4; color: #b7791f; }
  .empty-msg { padding: 1.5rem; text-align: center; color: #aaa; }
</style>
</head>
<body>

<?php if (!$isLoggedIn): ?>
<div class="login-wrap">
  <div class="login-card">
    <h2>🔐 Admin Login</h2>
    <form method="POST">
      <div class="field">
        <label>Username</label>
        <input type="text" name="username" autocomplete="username" required>
      </div>
      <div class="field">
        <label>Password</label>
        <input type="password" name="password" autocomplete="current-password" required>
      </div>
      <button type="submit" class="btn-login">Masuk →</button>
      <?php if (!empty($loginError)): ?>
        <p class="error-msg"><?= e($loginError) ?></p>
      <?php endif; ?>
    </form>
  </div>
</div>

<?php else: ?>

<div class="topbar">
  <h1>🏫 Admin Panel — Media Pembelajaran</h1>
  <form method="POST" style="margin:0">
    <button type="submit" name="logout" class="btn btn-logout">Logout</button>
  </form>
</div>

<div class="container">
  <!-- Stat Cards -->
  <div class="stats">
    <div class="stat-card">
      <div class="stat-num" style="color:#4facfe"><?= $totalSiswa ?></div>
      <div class="stat-label">Total Pengumpul Skor</div>
    </div>
    <div class="stat-card">
      <div class="stat-num" style="color:#38a169"><?= $avgSkor ?></div>
      <div class="stat-label">Rata-rata Skor PG</div>
    </div>
    <div class="stat-card">
      <div class="stat-num" style="color:#805ad5"><?= $totalRef ?></div>
      <div class="stat-label">Refleksi Masuk</div>
    </div>
    <div class="stat-card">
      <div class="stat-num" style="color:#e53e3e"><?= $totalPend ?></div>
      <div class="stat-label">Pendapat Video</div>
    </div>
  </div>

  <!-- Leaderboard Section -->
  <div class="section">
    <div class="section-header">🏆 Leaderboard PG <span style="color:#aaa;font-size:0.8rem"><?= count($leaderRows) ?> entri</span></div>
    <div class="section-body">
      <?php if ($leaderRows): ?>
      <table>
        <thead><tr><th>#</th><th>Nama</th><th>Kelas</th><th>Skor</th><th>Waktu</th></tr></thead>
        <tbody>
          <?php foreach ($leaderRows as $i => $r): ?>
          <tr>
            <td style="color:#aaa"><?= $i + 1 ?></td>
            <td><?= e($r['nama']) ?></td>
            <td><?= e($r['kelas']) ?></td>
            <td><span class="badge badge-score"><?= (int)$r['skor'] ?></span></td>
            <td style="color:#aaa;font-size:0.8rem"><?= e($r['created_at']) ?></td>
          </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
      <?php else: ?>
        <div class="empty-msg">Belum ada data.</div>
      <?php endif; ?>
    </div>
  </div>

  <!-- Refleksi Section -->
  <div class="section">
    <div class="section-header">💭 Refleksi Siswa <span style="color:#aaa;font-size:0.8rem"><?= count($refleksiRows) ?> entri</span></div>
    <div class="section-body">
      <?php if ($refleksiRows): ?>
      <table>
        <thead><tr><th>Nama</th><th>Kelas</th><th>Isi Refleksi</th><th>Waktu</th></tr></thead>
        <tbody>
          <?php foreach ($refleksiRows as $r): ?>
          <tr>
            <td><?= e($r['nama']) ?></td>
            <td><?= e($r['kelas']) ?></td>
            <td style="max-width:300px"><?= e($r['isi']) ?></td>
            <td style="color:#aaa;font-size:0.8rem;white-space:nowrap"><?= e($r['created_at']) ?></td>
          </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
      <?php else: ?>
        <div class="empty-msg">Belum ada data.</div>
      <?php endif; ?>
    </div>
  </div>

  <!-- Pendapat Section -->
  <div class="section">
    <div class="section-header">🎬 Pendapat Video <span style="color:#aaa;font-size:0.8rem"><?= count($pendapatRows) ?> entri</span></div>
    <div class="section-body">
      <?php if ($pendapatRows): ?>
      <table>
        <thead><tr><th>Nama</th><th>Kelas</th><th>Video ID</th><th>Isi Pendapat</th><th>Waktu</th></tr></thead>
        <tbody>
          <?php foreach ($pendapatRows as $r): ?>
          <tr>
            <td><?= e($r['nama']) ?></td>
            <td><?= e($r['kelas']) ?></td>
            <td style="font-size:0.75rem;color:#888"><?= e($r['video_id']) ?></td>
            <td style="max-width:280px"><?= e($r['isi']) ?></td>
            <td style="color:#aaa;font-size:0.8rem;white-space:nowrap"><?= e($r['created_at']) ?></td>
          </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
      <?php else: ?>
        <div class="empty-msg">Belum ada data.</div>
      <?php endif; ?>
    </div>
  </div>
</div>
<?php endif; ?>
</body>
</html>
```

- [ ] **Step 2: Test admin page di browser**

1. Buka `http://localhost/media_pembelajaran/admin.php`
2. Coba login dengan username salah → verifikasi: pesan "Username atau password salah."
3. Login dengan `guru` / `ganti_password_ini` → verifikasi: dashboard muncul dengan 4 stat card
4. Cek tabel Leaderboard, Refleksi, Pendapat terisi data dari langkah sebelumnya
5. Klik Logout → kembali ke halaman login

- [ ] **Step 3: Commit**

```bash
git add admin.php
git commit -m "feat: add teacher admin dashboard with login and data tables"
```

---

## Task 9: Final Check

- [ ] **Step 1: End-to-end test**

Urutan lengkap:
1. Buka `http://localhost/media_pembelajaran`
2. Login sebagai siswa (nama: "Test Siswa", kelas: "5A")
3. Buka Video Pembelajaran → tulis pendapat → kirim → verifikasi toast
4. Buka Rangkuman → tulis refleksi → kirim → verifikasi toast
5. Buka Latihan Soal → PG → kerjakan → lihat skor → klik "🏆 Lihat Leaderboard"
6. Verifikasi podium menampilkan nama dan skor yang baru saja disubmit
7. Buka `admin.php` → login → verifikasi semua data muncul di 3 tabel

- [ ] **Step 2: Commit final**

```bash
git add .
git commit -m "feat: complete interactive leaderboard and student response system"
```
