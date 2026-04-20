
CREATE TABLE IF NOT EXISTS leaderboard (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  nama       VARCHAR(100) NOT NULL,
  kelas      VARCHAR(20)  NOT NULL,
  skor       INT          NOT NULL,
  tipe       ENUM('pretest','posttest') NOT NULL DEFAULT 'posttest',
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

CREATE TABLE IF NOT EXISTS rekomendasi (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  nama         VARCHAR(100) NOT NULL,
  kelas        VARCHAR(20)  NOT NULL,
  catatan_guru TEXT         NOT NULL,
  skor_ref     INT          DEFAULT NULL,
  created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);
