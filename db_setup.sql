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
