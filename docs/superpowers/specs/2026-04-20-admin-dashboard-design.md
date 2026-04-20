# Admin Dashboard — Media Pembelajaran Sistem Pernapasan

**Date:** 2026-04-20  
**Status:** Approved

## Overview

Upgrade halaman `admin.php` menjadi dashboard guru lengkap dengan 3 tab navigasi: Penilaian, Umpan Balik, dan Rekomendasi Belajar. Semua dalam satu file PHP, tanpa reload halaman saat ganti tab.

---

## 1. Perubahan Database

### Tabel `leaderboard` — tambah kolom
```sql
ALTER TABLE leaderboard ADD COLUMN tipe ENUM('pretest','posttest') NOT NULL DEFAULT 'posttest';
```

### Tabel baru `rekomendasi`
```sql
CREATE TABLE IF NOT EXISTS rekomendasi (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  nama         VARCHAR(100) NOT NULL,
  kelas        VARCHAR(20)  NOT NULL,
  catatan_guru TEXT         NOT NULL,
  skor_ref     INT          DEFAULT NULL,
  created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);
```

---

## 2. Perubahan API

### `api/submit_score.php`
- Terima tambahan field `tipe` (`'pretest'` | `'posttest'`) dari request body
- Default ke `'posttest'` jika tidak dikirim
- Simpan ke kolom `tipe` di tabel `leaderboard`

### `api/submit_rekomendasi.php` (baru)
- POST: terima `nama`, `kelas`, `catatan_guru`, `skor_ref` (opsional)
- Insert ke tabel `rekomendasi`
- Return JSON `{success: true}`

### `api/delete_rekomendasi.php` (baru)
- POST: terima `id`
- Delete baris dari tabel `rekomendasi`
- Return JSON `{success: true}`

---

## 3. Perubahan Frontend (app.js)

- Saat `startPretest()` → set `state.quiz.type = 'pretest'`
- Saat submit skor ke API, kirim `tipe: state.quiz.type` (`'pretest'` atau `'posttest'`)
- Kuis PG reguler (posttest) di `app.js` set `state.quiz.type = 'pg'` → saat submit ke API, jika `state.quiz.type !== 'pretest'` maka kirim `tipe: 'posttest'`

---

## 4. Admin Page — Layout & Tab

### Navigasi
3 tab horizontal di bawah topbar:
- `[📊 Penilaian]` `[💭 Umpan Balik]` `[💡 Rekomendasi Belajar]`
- Tab aktif diberi highlight warna biru, konten lain disembunyikan via CSS (`display:none`)
- State tab disimpan di URL hash (`#penilaian`, `#refleksi`, `#rekomendasi`) agar bisa di-bookmark

### Stat Cards
4 kartu ringkasan di atas tab:
- Total siswa pretest
- Rata-rata skor pretest
- Total siswa posttest
- Rata-rata skor posttest

---

## 5. Tab Penilaian

### Sub-tabel Pretest
Kolom: `#` | `Nama` | `Kelas` | `Skor` | `Predikat` | `Waktu`

### Sub-tabel Posttest
Kolom: `#` | `Nama` | `Kelas` | `Skor` | `Predikat` | `Waktu`

### Predikat Otomatis
| Rentang Skor | Predikat |
|---|---|
| ≥ 85 | Sangat Baik |
| ≥ 70 | Baik |
| ≥ 55 | Cukup |
| < 55 | Perlu Bimbingan |

---

## 6. Tab Umpan Balik (Refleksi)

Tabel refleksi yang sudah ada, dengan tambahan kolom **Sentimen**:
- Deteksi sederhana berbasis kata kunci di `isi`
- Positif: kata seperti "senang", "paham", "suka", "menarik", "bagus"
- Negatif: kata seperti "sulit", "bingung", "susah", "tidak mengerti", "membosankan"
- Netral: selain di atas
- Ditampilkan sebagai badge berwarna (hijau/abu/merah)

Kolom: `Nama` | `Kelas` | `Isi Refleksi` | `Sentimen` | `Waktu`

---

## 7. Tab Rekomendasi Belajar

### Bagian A — Otomatis
Query siswa posttest dengan skor < 70, tampilkan sebagai tabel peringatan:

| Rentang Skor | Rekomendasi Topik |
|---|---|
| 55–69 | Ulang materi proses pernapasan & gangguan pernapasan |
| < 55 | Ulang semua topik: organ, proses, jenis, & gangguan pernapasan |

Kolom: `Nama` | `Kelas` | `Skor` | `Status` | `Topik Disarankan`

### Bagian B — Catatan Guru (Manual)
Form input:
- Nama siswa (text input)
- Kelas (text input)
- Catatan guru (textarea)
- Skor referensi (number input, opsional)
- Tombol "Simpan Catatan"

Tabel catatan tersimpan:
Kolom: `Nama` | `Kelas` | `Catatan` | `Skor Ref` | `Waktu` | `Hapus`

---

## 8. Keamanan & Validasi

- Semua output di-escape dengan `htmlspecialchars()`
- API `submit_rekomendasi.php` dan `delete_rekomendasi.php` wajib cek `$_SESSION['admin'] === true` sebelum proses — memanfaatkan session login yang sudah ada di `admin.php`
- Input nama/kelas di-trim dan di-strip_tags sebelum disimpan
- Delete rekomendasi pakai POST (bukan GET) untuk hindari CSRF

---

## 9. Tidak Termasuk Scope

- Export Excel/CSV
- Filter per kelas
- Notifikasi real-time
- Edit catatan guru yang sudah disimpan
