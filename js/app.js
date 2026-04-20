/* ==========================================
   MEDIA PEMBELAJARAN - SISTEM PERNAPASAN
   Application Logic
   ========================================== */

"use strict";

// ============================================
// STATE
// ============================================
const state = {
  user: { nama: '', kelas: '' },
  currentVideoId: 'mqwj6eqIyuA',
  quiz: {
    type: null,        // 'pg' | 'essay'
    currentIndex: 0,
    answers: [],
    namaTemp: '',
    submitted: false,
  }
};

// ============================================
// AUDIO MANAGER
// ============================================
const AudioManager = (() => {
  // Screens yang pakai musik MENU
  const MENU_SCREENS = ['screen-intro', 'screen-login', 'screen-menu'];
  // Screens yang pakai musik MATERI (semua sisanya)
  // Screens quiz/skor pakai materi juga

  const tracks = {
    menu: new Audio('Sunny Steps.mp3'),
    materi: new Audio('Quiet Garden Minds.mp3'),
  };

  // Setup kedua track
  Object.values(tracks).forEach(a => {
    a.loop = true;
    a.volume = 0;
  });

  let current = null;   // key: 'menu' | 'materi' | null
  let muted = true;     // default: muted, nyala setelah user klik
  const TARGET_VOL = 0.4;
  const FADE_MS = 800;

  /** Fade volume dari `from` ke `to` pada audio `a` */
  function fadeTo(a, from, to, onDone) {
    clearInterval(a._fadeTimer);
    const steps = 30;
    const stepTime = FADE_MS / steps;
    const delta = (to - from) / steps;
    let vol = from;
    a.volume = Math.max(0, Math.min(1, vol));
    a._fadeTimer = setInterval(() => {
      vol += delta;
      a.volume = Math.max(0, Math.min(1, vol));
      if ((delta > 0 && vol >= to) || (delta < 0 && vol <= to)) {
        a.volume = Math.max(0, Math.min(1, to));
        clearInterval(a._fadeTimer);
        if (onDone) onDone();
      }
    }, stepTime);
  }

  /** Main function — panggil ketika pindah screen */
  function play(screenId) {
    if (muted) return;
    const key = MENU_SCREENS.includes(screenId) ? 'menu' : 'materi';
    if (key === current) return;   // sudah main track yang sama

    const next = tracks[key];
    const prev = current ? tracks[current] : null;

    if (prev) {
      // Fade out track lama, lalu pause
      fadeTo(prev, prev.volume, 0, () => { prev.pause(); prev.currentTime = 0; });
    }

    // Fade in track baru
    next.currentTime = 0;
    current = key;
    updateBtn();
    const pp = next.play();
    fadeTo(next, 0, TARGET_VOL);
    if (pp !== undefined) {
      pp.catch(() => {
        // Browser blokir autoplay — reset agar bisa dicoba ulang setelah interaksi
        current = null;
        clearInterval(next._fadeTimer);
        next.volume = 0;
        next.pause();
      });
    }
  }

  function toggleMute() {
    muted = !muted;
    if (muted) {
      // Matikan semua musik dengan fade out
      Object.values(tracks).forEach(a => fadeTo(a, a.volume, 0, () => { a.pause(); }));
      current = null;
    } else {
      // Nyalakan musik sesuai screen yang aktif sekarang
      const activeId = document.querySelector('.screen.active')?.id || 'screen-intro';
      const key = MENU_SCREENS.includes(activeId) ? 'menu' : 'materi';
      const next = tracks[key];
      current = key;
      next.currentTime = 0;
      next.play().catch(() => { });
      fadeTo(next, 0, TARGET_VOL);
    }
    updateBtn();
  }

  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  function playClick() {
    if (muted) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.1);
  }

  function updateBtn() {
    const btn = document.getElementById('btn-audio-toggle');
    if (btn) {
      btn.textContent = muted ? '🔇' : '🔊';
      btn.title = muted ? 'Aktifkan Musik' : 'Matikan Musik';
    }
  }

  function playScoreSound(score) {
    if (muted) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    if (score >= 60) {
      // Happy fanfare
      osc.type = 'square';
      osc.frequency.setValueAtTime(400, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.1);
      osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.2);
    } else {
      // Sad trombone
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.3);
    }

    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.4);
  }

  return { play, toggleMute, playClick, playScoreSound };
})();


// ============================================
// SCREEN NAVIGATION
// ============================================
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) {
    target.classList.add('active');
    window.scrollTo(0, 0);
  }
  // Trigger audio berdasarkan screen
  AudioManager.play(id);
  if (id === 'screen-leaderboard') loadLeaderboard();
}


// ============================================
// INTRO → BREATHING ANIMATION
// ============================================
let breathPhase = true;
function toggleBreathing() {
  const label = document.getElementById('breathing-text');
  if (label) {
    breathPhase = !breathPhase;
    label.textContent = breathPhase ? 'Menghirup... 😮‍💨' : 'Menghembuskan... 💨';
  }
}
setInterval(toggleBreathing, 2000);

// ============================================
// LOGIN
// ============================================
function handleLogin(e) {
  e.preventDefault();
  const nama = document.getElementById('input-nama').value.trim();
  const kelas = document.getElementById('input-kelas').value || '5'; // selalu Kelas 5
  if (!nama) {
    showToast('❗ Tolong isi namamu dulu!');
    return;
  }
  state.user.nama = nama;
  state.user.kelas = kelas;

  document.getElementById('display-nama').textContent = nama;
  document.getElementById('display-kelas').textContent = 'Kelas ' + kelas;

  showScreen('screen-menu');
  showToast('👋 Selamat datang, ' + nama + '!');
}

function logout() {
  if (confirm('Kamu yakin ingin keluar? Progres latihan soal tidak tersimpan.')) {
    document.getElementById('input-nama').value = '';
    document.getElementById('input-kelas').value = '';
    state.user = { nama: '', kelas: '' };
    showScreen('screen-login');
  }
}

// ============================================
// ORGAN TABS
// ============================================
function showOrgan(id, btn) {
  document.querySelectorAll('.organ-content').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('.organ-tab').forEach(t => t.classList.remove('active'));
  const el = document.getElementById('organ-' + id);
  if (el) el.classList.add('active');
  if (btn) btn.classList.add('active');
}

// ============================================
// PROSES TABS
// ============================================
function showProses(id, btn) {
  document.querySelectorAll('.proses-content').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('.proses-tab').forEach(t => t.classList.remove('active'));
  const el = document.getElementById('proses-' + id);
  if (el) el.classList.add('active');
  if (btn) btn.classList.add('active');
}

// ============================================
// VIDEO
// ============================================
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

// ============================================
// QUIZ DATA
// ============================================
let pretestDone = false;
function checkPretest() {
  if (pretestDone) {
    showScreen('screen-materi');
  } else {
    showScreen('screen-pretest-intro');
  }
}

const pretestQuestions = [
  { q: "1. Organ utama dalam sistem pernapasan manusia adalah ...", options: ["Jantung", "Paru-paru", "Hati", "Ginjal"], answer: 1 },
  { q: "2. Udara pertama kali masuk ke dalam tubuh melalui ...", options: ["Paru-paru", "Hidung", "Bronkus", "Trakea"], answer: 1 },
  { q: "3. Fungsi hidung dalam proses pernapasan adalah ...", options: ["Mengedarkan darah", "Menyaring udara yang masuk", "Memompa oksigen", "Menyerap sari makanan"], answer: 1 },
  { q: "4. Saluran yang menghubungkan hidung dengan paru-paru disebut ...", options: ["Kerongkongan", "Trakea", "Usus", "Lambung"], answer: 1 },
  { q: "5. Proses masuknya udara ke dalam paru-paru disebut ...", options: ["Ekspirasi", "Inspirasi", "Difusi", "Sirkulasi"], answer: 1 },
  { q: "6. Proses keluarnya udara dari paru-paru disebut ...", options: ["Inspirasi", "Ekspirasi", "Respirasi", "Transpirasi"], answer: 1 },
  { q: "7. Tempat terjadinya pertukaran oksigen dan karbon dioksida adalah ...", options: ["Bronkus", "Trakea", "Alveolus", "Hidung"], answer: 2 },
  { q: "8. Gas yang dibutuhkan tubuh saat bernapas adalah ...", options: ["Karbon dioksida", "Nitrogen", "Oksigen", "Uap air"], answer: 2 },
  { q: "9. Otot yang berperan penting dalam proses pernapasan adalah ...", options: ["Otot tangan", "Otot kaki", "Diafragma", "Otot perut"], answer: 2 },
  { q: "10. Salah satu cara menjaga kesehatan sistem pernapasan adalah ...", options: ["Menghirup asap kendaraan", "Merokok", "Berolahraga secara teratur", "Tidur larut malam setiap hari"], answer: 2 }
];

function setPretestAnswer(optIdx) {
  state.quiz.answers[state.quiz.currentIndex] = optIdx;
  document.querySelectorAll('#pretest-options .quiz-option').forEach((btn, i) => {
    btn.classList.toggle('selected', i === optIdx);
  });
  document.getElementById('pretest-btn-next').disabled = false;
  AudioManager.playClick();
}

function renderPretestQuestion() {
  const idx = state.quiz.currentIndex;
  const q = pretestQuestions[idx];
  const total = pretestQuestions.length;

  document.getElementById('pretest-question-num').textContent = `Soal ${idx + 1} dari ${total}`;
  document.getElementById('pretest-progress-fill').style.width = `${((idx + 1) / total) * 100}%`;
  document.getElementById('pretest-question-text').textContent = q.q;

  const container = document.getElementById('pretest-options');
  container.innerHTML = '';
  const labels = ['a', 'b', 'c', 'd'];
  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'quiz-option';
    btn.innerHTML = `<span class="option-label">${labels[i]}.</span> ${opt}`;
    if (state.quiz.answers[idx] === i) btn.classList.add('selected');
    btn.onclick = () => setPretestAnswer(i);
    container.appendChild(btn);
  });

  document.getElementById('pretest-btn-prev').disabled = idx === 0;
  document.getElementById('pretest-btn-next').textContent = (idx === total - 1) ? 'Selesai & Kumpulkan' : 'Selanjutnya →';
  document.getElementById('pretest-btn-next').disabled = state.quiz.answers[idx] === undefined;
}

function startPretest() {
  const nama = document.getElementById('pretest-nama-input').value.trim();
  if (!nama) { showToast('❗ Tulis namamu dulu ya!'); return; }
  state.quiz.namaTemp = nama;
  state.quiz.type = 'pretest';
  state.quiz.currentIndex = 0;
  state.quiz.answers = new Array(pretestQuestions.length);
  document.getElementById('pretest-nama-step').style.display = 'none';
  document.getElementById('pretest-quiz-step').style.display = 'block';
  renderPretestQuestion();
}

function pretestPrev() {
  if (state.quiz.currentIndex > 0) {
    state.quiz.currentIndex--;
    renderPretestQuestion();
    AudioManager.playClick();
  }
}

function pretestNext() {
  AudioManager.playClick();
  if (state.quiz.currentIndex < pretestQuestions.length - 1) {
    state.quiz.currentIndex++;
    renderPretestQuestion();
  } else {
    // Finish
    let correct = 0;
    pretestQuestions.forEach((q, i) => {
      if (state.quiz.answers[i] === q.answer) correct++;
    });
    pretestDone = true;
    const score = Math.round((correct / pretestQuestions.length) * 100);
    saveScoreToServer(state.quiz.namaTemp, state.user.kelas || '-', score, 'pretest');
    showScore(score, 'PreTest IPA', correct, pretestQuestions.length);
  }
}

const pgQuestions = [
  {
    q: "1. Organ utama tempat pertukaran oksigen dan karbon dioksida adalah ...",
    options: ["Jantung", "Paru-paru", "Hidung", "Lambung"],
    answer: 1,
    feedback: "✅ Benar! Paru-paru adalah organ utama pertukaran gas."
  },
  {
    q: "2. Bagian yang menghubungkan trakea dengan paru-paru disebut ...",
    options: ["Bronkus", "Alveolus", "Diafragma", "Laring"],
    answer: 0,
    feedback: "✅ Benar! Bronkus merupakan cabang batang tenggorokan (trakea) yang menuju paru-paru."
  },
  {
    q: "3. Proses menghirup udara disebut ...",
    options: ["Ekspirasi", "Inspirasi", "Respirasi", "Transpirasi"],
    answer: 1,
    feedback: "✅ Benar! Inspirasi adalah proses masuknya udara ke dalam paru-paru (menghirup udara)."
  },
  {
    q: "4. Bagian paru-paru yang berbentuk gelembung kecil tempat pertukaran gas adalah ...",
    options: ["Bronkus", "Alveolus", "Trakea", "Diafragma"],
    answer: 1,
    feedback: "✅ Benar! Alveolus adalah gelembung halus tempat pertukaran oksigen dan karbon dioksida."
  },
  {
    q: "5. Otot yang membantu proses pernapasan dengan bergerak naik turun adalah ...",
    options: ["Otot lengan", "Otot perut", "Diafragma", "Otot jantung"],
    answer: 2,
    feedback: "✅ Tepat sekali! Diafragma adalah otot utama penyekat rongga dada dan perut."
  },
  {
    q: "6. Gas yang dikeluarkan tubuh saat bernapas adalah ...",
    options: ["Oksigen", "Karbon dioksida", "Nitrogen", "Hidrogen"],
    answer: 1,
    feedback: "✅ Benar! Sisa pertukaran gas yang kita buang (hembuskan) adalah Karbon Dioksida."
  },
  {
    q: "7. Salah satu gangguan pada organ pernapasan yang disebabkan oleh alergi debu adalah ...",
    options: ["Asma", "Bronkitis", "Influenza", "Tuberkulosis"],
    answer: 0,
    feedback: "✅ Benar! Asma merupakan penyempitan saluran pernapasan akibat alergi (misalnya debu)."
  },
  {
    q: "8. Cara memelihara kesehatan organ pernapasan adalah ...",
    options: ["Menghirup asap rokok", "Berolahraga secara teratur", "Menghirup udara kotor", "Tidur terlalu lama"],
    answer: 1,
    feedback: "✅ Tepat! Berolahraga teratur sangat baik untuk menjaga pernapasan."
  },
  {
    q: "9. Penyakit yang menyerang paru-paru akibat bakteri Mycobacterium tuberculosis adalah ...",
    options: ["Asma", "Tuberkulosis", "Bronkitis", "Influenza"],
    answer: 1,
    feedback: "✅ Benar! TBC/Tuberkulosis disebabkan oleh bakteri Mycobacterium tuberculosis."
  },
  {
    q: "10. Mengapa kita dianjurkan bernapas melalui hidung?",
    options: ["Agar udara lebih cepat masuk", "Agar udara disaring dan dihangatkan", "Agar tidak membuka mulut", "Agar paru-paru bekerja lebih keras"],
    answer: 1,
    feedback: "✅ Benar! Hidung dilengkapi dengan rambut-rambut dan selaput lendir untuk menyaring debu serta menghangatkan udara."
  }
];

// ============================================
// QUIZ START
// ============================================
function startQuiz(type) {
  state.quiz.type = type;
  state.quiz.currentIndex = 0;
  state.quiz.answers = [];
  state.quiz.submitted = false;

  state.quiz.answers = new Array(pgQuestions.length).fill(null);
  showScreen('screen-latihan-pg');
  // Reset
  document.getElementById('pg-nama-step').style.display = 'block';
  document.getElementById('pg-quiz-step').style.display = 'none';
  // Isi badge nama dari state
  const displayEl = document.getElementById('pg-nama-display');
  if (displayEl) displayEl.textContent = state.user.nama || '-';
  // Langsung tampilkan soal, skip step nama
  document.getElementById('pg-nama-step').style.display = 'none';
  document.getElementById('pg-quiz-step').style.display = 'block';
  state.quiz.namaTemp = state.user.nama;
  state.quiz.currentIndex = 0;
  state.quiz.answers = new Array(pgQuestions.length).fill(null);
  renderPGQuestion();
}

function startPGQuiz() {
  // Sudah otomatis dari state — tombol di badge langsung mulai
  showScreen('screen-latihan-pg');
}

// ============================================
// PG QUIZ
// ============================================
function renderPGQuestion() {
  const idx = state.quiz.currentIndex;
  const q = pgQuestions[idx];
  const total = pgQuestions.length;

  document.getElementById('pg-question-num').textContent = `Soal ${idx + 1} dari ${total}`;
  document.getElementById('pg-progress-fill').style.width = `${((idx + 1) / total) * 100}%`;
  document.getElementById('pg-question-text').textContent = q.q;

  const container = document.getElementById('pg-options');
  container.innerHTML = '';
  const labels = ['A', 'B', 'C', 'D'];
  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'quiz-option';
    btn.innerHTML = `<span class="option-label">${labels[i]}</span>${opt}`;
    if (state.quiz.answers[idx] === i) btn.classList.add('selected');
    btn.onclick = () => selectPGAnswer(i);
    container.appendChild(btn);
  });

  // Buttons dihapus untuk Quizziz UI style
}

function selectPGAnswer(i) {
  // Cegah jawaban ganda
  if (state.quiz.answers[state.quiz.currentIndex] !== null) return;

  state.quiz.answers[state.quiz.currentIndex] = i;
  const q = pgQuestions[state.quiz.currentIndex];

  const container = document.getElementById('pg-options');
  const buttons = container.querySelectorAll('.quiz-option');
  const optLabel = container.querySelectorAll('.option-label');

  // Interactive Quizizz Style
  if (i === q.answer) {
    AudioManager.playClick();
    buttons[i].classList.add('correct');
    buttons[i].style.background = '#4CAF50';
    buttons[i].style.color = '#fff';
    buttons[i].style.borderColor = '#4CAF50';
    optLabel[i].style.background = '#fff';
    optLabel[i].style.color = '#4CAF50';
    optLabel[i].style.borderColor = '#4CAF50';
    showToast('🎉 Benar!');
  } else {
    AudioManager.playClick();
    buttons[i].style.background = '#F44336';
    buttons[i].style.color = '#fff';
    buttons[i].style.borderColor = '#F44336';
    optLabel[i].style.background = '#fff';
    optLabel[i].style.color = '#F44336';
    optLabel[i].style.borderColor = '#F44336';
    // Highlight jawaban yang benar
    if (buttons[q.answer]) {
      buttons[q.answer].style.background = '#4CAF50';
      buttons[q.answer].style.color = '#fff';
      buttons[q.answer].style.borderColor = '#4CAF50';
      optLabel[q.answer].style.background = '#fff';
      optLabel[q.answer].style.color = '#4CAF50';
      optLabel[q.answer].style.borderColor = '#4CAF50';
    }
    showToast('😅 Ups, kurang tepat!');
  }

  // Tunda sejenak agar siswa melihat feedback, lalu lanjut
  setTimeout(() => {
    pgNext();
  }, 1800);
}

function pgNext() {
  if (state.quiz.currentIndex < pgQuestions.length - 1) {
    state.quiz.currentIndex++;
    renderPGQuestion();
  } else {
    submitPG();
  }
}

function pgPrev() {
  if (state.quiz.currentIndex > 0) {
    state.quiz.currentIndex--;
    renderPGQuestion();
  }
}

function submitPG() {
  let correct = 0;
  pgQuestions.forEach((q, i) => {
    if (state.quiz.answers[i] === q.answer) correct++;
  });
  const score = Math.round((correct / pgQuestions.length) * 100);
  showScore(score, 'Pilihan Ganda', correct, pgQuestions.length);
  // Simpan ke server (non-blocking)
  saveScoreToServer(state.quiz.namaTemp, state.user.kelas || '-', score, 'posttest');
}

// ESSAY CODE DIBUANG

// ============================================
// SHOW SCORE
// ============================================
function showScore(score, type, correct, total) {
  showScreen('screen-skor');

  document.getElementById('skor-nama-display').textContent = state.quiz.namaTemp;
  document.getElementById('skor-jenis-display').textContent = 'Jenis: ' + type;

  // Render actions based on type
  const actionsDiv = document.querySelector('.skor-actions');
  if (actionsDiv) {
    if (type === 'PreTest IPA') {
      actionsDiv.innerHTML = `<button class="btn-primary" style="width:100%; background: linear-gradient(135deg, #FF8A65, #E64A19);" onclick="showScreen('screen-materi')">Lanjut ke Materi →</button>`;
    } else {
      actionsDiv.innerHTML = `
        <button class="btn-secondary" onclick="retryQuiz()">🔄 Coba Lagi</button>
        <button class="btn-primary" onclick="showScreen('screen-menu')">🏠 Menu Utama</button>
      `;
    }
  }

  // Animate count-up
  let count = 0;
  const el = document.getElementById('skor-value');
  const timer = setInterval(() => {
    count += 2;
    if (count >= score) {
      count = score;
      clearInterval(timer);
    }
    el.textContent = count;
  }, 20);

  // Grade
  let emoji, predikat, pesan, circleColor;
  if (score >= 90) {
    emoji = '🏆'; predikat = 'SEMPURNA!';
    pesan = 'Luar biasa! Kamu memahami materi dengan sangat baik. Pertahankan prestasimu!';
    circleColor = 'linear-gradient(135deg, #FFD700, #FFA500)';
  } else if (score >= 75) {
    emoji = '⭐'; predikat = 'BAGUS SEKALI!';
    pesan = 'Kerja bagus! Kamu sudah memahami sebagian besar materi. Tetap semangat belajar!';
    circleColor = 'linear-gradient(135deg, #4facfe, #00f2fe)';
  } else if (score >= 60) {
    emoji = '😊'; predikat = 'CUKUP BAIK';
    pesan = 'Kamu sudah cukup baik! Pelajari lagi bagian yang belum dipahami ya 📖';
    circleColor = 'linear-gradient(135deg, #43e97b, #38f9d7)';
  } else {
    emoji = '💪'; predikat = 'SEMANGAT!';
    pesan = 'Jangan menyerah! Pelajari lagi materinya dan coba lagi. Kamu pasti bisa! 💪';
    circleColor = 'linear-gradient(135deg, #f093fb, #f5576c)';
  }

  document.getElementById('skor-emoji').textContent = emoji;
  document.getElementById('skor-predikat').textContent = predikat;
  document.getElementById('skor-pesan').textContent = pesan;
  document.getElementById('skor-circle').style.background = circleColor;

  let detailText = '';
  if (correct !== null) {
    detailText = `✅ Benar: ${correct} soal   ❌ Salah: ${total - correct} soal`;
  } else {
    detailText = `📝 Total ${total} soal yang dikerjakan`;
  }
  document.getElementById('skor-detail').innerHTML = detailText;

  // Store last quiz info for retry
  state.quiz.lastScore = score;
  state.quiz.lastType = type;

  // Render umpan balik + pembahasan only for PG
  if (type === 'Pilihan Ganda') {
    renderFeedbackAndPembahasan(score, correct, total);
  } else {
    const fbSection = document.getElementById('skor-feedback-section');
    if (fbSection) fbSection.style.display = 'none';
  }

  // Tembakkan suara hasil saat skor dikalkulasi selesai
  setTimeout(() => {
    AudioManager.playScoreSound(score);
  }, 300);
}

function renderFeedbackAndPembahasan(score, correct, total) {
  const fbSection = document.getElementById('skor-feedback-section');
  if (!fbSection) return;
  fbSection.style.display = 'block';

  // --- Rekomendasi belajar berdasarkan skor ---
  const rekEl = document.getElementById('skor-rekomendasi');
  const rekListEl = document.getElementById('skor-rekomendasi-list');

  let rekTeks, rekItems;
  if (score >= 90) {
    rekTeks = '🌟 Luar biasa! Kamu menguasai materi Sistem Pernapasan dengan sangat baik. Terus pertahankan semangat belajarmu!';
    rekItems = ['✅ Coba tantang dirimu dengan soal tingkat lebih sulit.', '✅ Bantu teman-temanku yang masih kesulitan!', '✅ Baca buku referensi tambahan tentang pernapasan hewan.'];
  } else if (score >= 75) {
    rekTeks = '⭐ Bagus sekali! Kamu sudah memahami sebagian besar materi. Masih ada sedikit bagian yang perlu diperkuat.';
    rekItems = ['📖 Pelajari ulang bagian soal yang kamu jawab salah.', '🎬 Tonton kembali Video Pembelajaran untuk pemahaman lebih dalam.', '📝 Baca Rangkuman Materi sekali lagi sebelum mencoba lagi.'];
  } else if (score >= 60) {
    rekTeks = '😊 Sudah cukup baik! Tapi masihbanyak konsep yang perlu dipelajari lagi. Jangan menyerah ya!';
    rekItems = ['📖 Buka menu Materi Belajar dan baca ulang dari awal.', '🗺️ Lihat Peta Konsep untuk memahami alur materi secara keseluruhan.', '💡 Gunakan Tips Belajar untuk strategi belajar yang lebih efektif.', '🔄 Coba kerjakan latihan soal lagi setelah belajar ulang.'];
  } else {
    rekTeks = '💪 Semangat! Kamu masih perlu banyak latihan. Pelajari materi dari awal secara bertahap.';
    rekItems = ['📖 Mulai dari menu Materi Belajar — baca bagian Pembukaan dulu.', '🎬 Tonton video pembelajaran agar konsep lebih mudah dipahami.', '🗺️ Gunakan Peta Konsep untuk melihat gambaran besar materi.', '💡 Baca Tips Belajar sebelum mengerjakan soal lagi.', '🔄 Jangan malu mencoba lagi — setiap usaha adalah kemajuan!'];
  }

  rekEl.textContent = rekTeks;
  rekListEl.innerHTML = rekItems.map(item =>
    `<div style="display:flex; align-items:flex-start; gap:0.5rem; margin-bottom:0.5rem; font-size:0.9rem; color:#333;">${item}</div>`
  ).join('');

  // --- Pembahasan per soal ---
  const pembahasanEl = document.getElementById('skor-pembahasan-list');
  if (!pembahasanEl) return;
  const userAnswers = state.quiz.answers;
  let html = '';
  pgQuestions.forEach((q, i) => {
    const userAns = userAnswers[i];
    const isCorrect = userAns === q.answer;
    const bgColor = isCorrect ? '#E8F5E9' : '#FFF3E0';
    const borderColor = isCorrect ? '#66BB6A' : '#FFA726';
    const icon = isCorrect ? '✅' : '❌';
    const userLabel = userAns !== null ? q.options[userAns] : '(tidak dijawab)';
    const correctLabel = q.options[q.answer];
    // Strip prefix emoji + "Benar!" / "Tepat!" agar penjelasan tampil netral
    const explanation = (q.feedback || '').replace(/^[\u{1F3AF}\u{1F44D}\u2705\u{1F31F}]?\s*(Benar!|Tepat!|Tepat sekali!|Benar sekali!)\s*/u, '💡 ').trim();
    html += `
      <div style="background:${bgColor}; border-left: 4px solid ${borderColor}; border-radius:12px; padding:1rem; margin-bottom:1rem;">
        <p style="font-weight:800; color:#333; margin-bottom:0.4rem; font-size:0.9rem;">${icon} Soal ${i+1}: ${q.q}</p>
        <p style="font-size:0.85rem; color:#555; margin:0.2rem 0;">Jawabanmu: <strong style="color:${isCorrect?'#388E3C':'#E65100'}">${userLabel}</strong></p>
        ${!isCorrect ? `<p style="font-size:0.85rem; color:#555; margin:0.2rem 0;">Jawaban benar: <strong style="color:#388E3C">${correctLabel}</strong></p>` : ''}
        <p style="font-size:0.85rem; color:#1565C0; margin-top:0.5rem; font-style:italic;">${explanation}</p>
      </div>
    `;
  });
  pembahasanEl.innerHTML = html;
}

function retryQuiz() {
  const type = state.quiz.type;
  if (type === 'pg') startQuiz('pg');
  else if (type === 'essay') startQuiz('essay');
}

// ============================================
// CONFIRM BACK FROM QUIZ
// ============================================
function confirmBack() {
  if (confirm('Yakin ingin kembali? Jawabanmu tidak akan tersimpan.')) {
    showScreen('screen-latihan-menu');
  }
}

// ============================================
// TOAST
// ============================================
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ============================================
// API HELPERS
// ============================================
const API_BASE = 'api';

function saveScoreToServer(nama, kelas, skor, tipe = 'posttest') {
  fetch(API_BASE + '/submit_score.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nama, kelas, skor, tipe })
  }).catch(() => { });
}

function loadLeaderboard() {
  const loading = document.getElementById('leaderboard-loading');
  const podium = document.getElementById('leaderboard-podium');
  const tableWrap = document.getElementById('leaderboard-table-wrap');
  const empty = document.getElementById('leaderboard-empty');

  if (loading) loading.style.display = 'block';
  if (podium) podium.style.display = 'none';
  if (tableWrap) tableWrap.style.display = 'none';
  if (empty) empty.style.display = 'none';

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
      if (empty) empty.style.display = 'block';
    });
}

function renderLeaderboard(data) {
  const myNama = (state.quiz.namaTemp || state.user.nama || '').toLowerCase();

  // Podium top 3
  const podium = document.getElementById('leaderboard-podium');
  [1, 2, 3].forEach(rank => {
    const entry = data[rank - 1];
    if (entry) {
      document.getElementById('podium-' + rank + '-nama').textContent = entry.nama;
      document.getElementById('podium-' + rank + '-kelas').textContent = entry.kelas;
      document.getElementById('podium-' + rank + '-skor').textContent = entry.skor;
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

// ============================================
// REFLEKSI & PENDAPAT
// ============================================
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

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  showScreen('screen-intro');


  // Sound effect untuk tombol
  document.querySelectorAll('button, .video-item, .organ-tab, .proses-tab, .quiz-option, .jenis-card').forEach(el => {
    el.addEventListener('click', () => {
      AudioManager.playClick();
    });
  });
});

