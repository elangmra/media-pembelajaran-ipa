# Design Spec: Interactive Quiz Leaderboard & Student Responses
**Date:** 2026-04-06  
**Project:** Media Pembelajaran — Sistem Pernapasan  
**Status:** Approved

---

## Overview

Transform the existing static quiz into a dynamic, database-backed experience:
1. PG quiz scores saved to server → public leaderboard with podium
2. Refleksi (Rangkuman screen) and Pendapat (Video screen) forms saved to DB for teacher review
3. Simple admin dashboard for teacher to view all student data

**Style constraint:** All new UI must follow the existing app's visual style — same colors, fonts, card components, wave headers, and animation patterns. No new design language introduced.

---

## Tech Stack

- **Frontend:** Existing HTML/CSS/JS (index.html + app.js)
- **Backend:** PHP (no framework)
- **Database:** MySQL
- **Hosting:** VPS (user-managed)

---

## Database Schema

```sql
CREATE TABLE leaderboard (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  nama       VARCHAR(100) NOT NULL,
  kelas      VARCHAR(20)  NOT NULL,
  skor       INT          NOT NULL,
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE refleksi (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  nama       VARCHAR(100) NOT NULL,
  kelas      VARCHAR(20)  NOT NULL,
  isi        TEXT         NOT NULL,
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pendapat (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  nama       VARCHAR(100) NOT NULL,
  kelas      VARCHAR(20)  NOT NULL,
  video_id   VARCHAR(50)  NOT NULL,
  isi        TEXT         NOT NULL,
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);
```

---

## Backend Files

```
api/
  db.php                  ← koneksi MySQL (require'd oleh semua endpoint)
  submit_score.php        ← POST {nama, kelas, skor} → INSERT leaderboard
  get_leaderboard.php     ← GET → JSON array top 20 scores (ORDER BY skor DESC)
  submit_refleksi.php     ← POST {nama, kelas, isi} → INSERT refleksi
  submit_pendapat.php     ← POST {nama, kelas, video_id, isi} → INSERT pendapat
admin.php                 ← halaman guru (PHP session login)
```

All API endpoints:
- Accept JSON POST body (Content-Type: application/json)
- Return JSON response `{success: true}` or `{success: false, error: "..."}`
- Sanitize inputs with `htmlspecialchars()` / `trim()`
- CORS header: `Access-Control-Allow-Origin: *`

---

## Frontend Changes

### A. Screen Skor (existing — `screen-skor`)
After successful PG quiz completion, before showing the score screen:
- Call `fetch('api/submit_score.php', {method:'POST', body: JSON.stringify({nama, kelas, skor})})`
- Add button "🏆 Lihat Leaderboard" that calls `showScreen('screen-leaderboard')`

### B. Screen Leaderboard (NEW — `screen-leaderboard`)
New screen added to `index.html`, styled with existing wave-header pattern (gradient merah-kuning matching screen-video).

Layout:
- Wave header: "🏆 Leaderboard" title
- **Podium section:** Top 3 with rank 1 in center/tallest, rank 2 left, rank 3 right — nama + kelas + skor
- **Table section:** Rank 4 onwards — kolom: #, Nama, Kelas, Skor, Tanggal
- **Highlight:** Row milik siswa yang sedang login (match by `state.user.nama`) diberi background highlight + border
- Data fetched via `fetch('api/get_leaderboard.php')` saat screen aktif (`showScreen` dipanggil)
- Back button → `showScreen('screen-skor')`

### C. Form Refleksi (existing form in `screen-rangkuman`)
Wire existing form to backend:
- On submit: `fetch('api/submit_refleksi.php', {method:'POST', body: JSON.stringify({nama: state.user.nama, kelas: state.user.kelas, isi: inputValue})})`
- On success: show toast "💭 Refleksi kamu sudah terkirim!", clear textarea, disable submit button
- On error: show toast "❗ Gagal mengirim, coba lagi."

### D. Form Pendapat (existing form in `screen-video`)
Same pattern as Refleksi, but include `video_id` (current video playing in iframe).
- On submit: call `api/submit_pendapat.php` with `{nama, kelas, video_id, isi}`
- On success: toast "🎬 Pendapat kamu sudah terkirim!", disable submit button

---

## Admin Page (`admin.php`)

Separate PHP file, accessed via `/admin.php`.

### Login
- Simple PHP session: username dan password didefinisikan sebagai konstanta di bagian atas `admin.php` (mudah diganti)
  ```php
  define('ADMIN_USER', 'guru');
  define('ADMIN_PASS', 'password_anda_di_sini');
  ```
- Form dengan field username + password, session dimulai jika kredensial cocok
- Redirect ke login jika session tidak valid

### Dashboard (logged in)
Styled as standalone HTML page (not the SPA). Uses same color palette and font (Nunito from Google Fonts) as the main app, but as a regular multi-section page.

**4 stat cards (top):**
- Total Siswa (count from leaderboard)
- Rata-rata Skor (avg from leaderboard)
- Jumlah Refleksi (count from refleksi)
- Jumlah Pendapat (count from pendapat)

**3 detail sections (below cards):**
1. 🏆 Leaderboard — table: Rank, Nama, Kelas, Skor, Waktu. Sortable by skor DESC by default.
2. 💭 Refleksi Siswa — table: Nama, Kelas, Isi Refleksi, Waktu
3. 🎬 Pendapat Video — table: Nama, Kelas, Video ID, Isi, Waktu

Logout button clears session.

---

## Flow Diagrams

### Quiz → Score → Leaderboard
```
Siswa selesai PG quiz
  → submitPG() hitung skor
  → fetch POST /api/submit_score.php
  → showScreen('screen-skor')   (tetap seperti sekarang)
  → tombol "🏆 Lihat Leaderboard"
  → showScreen('screen-leaderboard')
  → fetch GET /api/get_leaderboard.php
  → render podium + tabel
```

### Refleksi / Pendapat
```
Siswa isi textarea → klik Kirim
  → fetch POST /api/submit_refleksi.php (atau submit_pendapat.php)
  → sukses: toast + disable tombol
  → gagal: toast error
```

### Admin
```
Buka /admin.php
  → cek session → redirect login jika belum
  → login → session set → dashboard
  → query DB → tampilkan stat + tabel data
```

---

## Out of Scope
- Real-time score sync (not needed for async model)
- Essay quiz leaderboard (only PG)
- Student ability to delete/edit their submissions
- Email notifications
- Export to CSV (can be added later if needed)
