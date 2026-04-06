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
    menu:   new Audio('Sunny Steps.mp3'),
    materi: new Audio('Quiet Garden Minds.mp3'),
  };

  // Setup kedua track
  Object.values(tracks).forEach(a => {
    a.loop   = true;
    a.volume = 0;
  });

  let current  = null;   // key: 'menu' | 'materi' | null
  let muted    = true;   // default: musik MATI, tekan tombol untuk menyalakan
  const TARGET_VOL = 0.4;
  const FADE_MS    = 800;

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
    next.play().catch(() => {});
    fadeTo(next, 0, TARGET_VOL);
    current = key;
    updateBtn();
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
      next.play().catch(() => {});
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
    if (!btn) return;
    btn.textContent = muted ? '🔇' : '🔊';
    btn.title = muted ? 'Aktifkan Musik' : 'Matikan Musik';
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
  const nama  = document.getElementById('input-nama').value.trim();
  const kelas = document.getElementById('input-kelas').value.trim();
  if (!nama || !kelas) {
    showToast('❗ Tolong isi nama dan kelas kamu!');
    return;
  }
  state.user.nama  = nama;
  state.user.kelas = kelas;

  document.getElementById('display-nama').textContent  = nama;
  document.getElementById('display-kelas').textContent = 'Kelas ' + kelas;

  showScreen('screen-menu');
  showToast('👋 Selamat datang, ' + nama + '!');
}

function logout() {
  if (confirm('Kamu yakin ingin keluar? Progres latihan soal tidak tersimpan.')) {
    document.getElementById('input-nama').value  = '';
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
  document.getElementById('pg-nama-input').value = state.user.nama || '';
}

function startPGQuiz() {
  const nama = document.getElementById('pg-nama-input').value.trim();
  if (!nama) { showToast('❗ Tulis namamu dulu ya!'); return; }
  state.quiz.namaTemp = nama;
  document.getElementById('pg-nama-step').style.display = 'none';
  document.getElementById('pg-quiz-step').style.display = 'block';
  renderPGQuestion();
}

// ============================================
// PG QUIZ
// ============================================
function renderPGQuestion() {
  const idx = state.quiz.currentIndex;
  const q   = pgQuestions[idx];
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
  state.quiz.lastType  = type;

  // Tembakkan suara hasil saat skor dikalkulasi selesai
  setTimeout(() => {
    AudioManager.playScoreSound(score);
  }, 300);
}

function retryQuiz() {
  const type = state.quiz.type;
  if (type === 'pg')    startQuiz('pg');
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
// REFLEKSI & PENDAPAT
// ============================================
function submitPendapat() {
  const val = document.getElementById('video-opinion-input').value.trim();
  if (!val) {
    showToast('❗ Ketik pendapatmu dulu ya!');
    return;
  }
  showToast('✅ Pendapatmu sudah tersimpan! Keren!');
}

function submitRefleksi() {
  const val = document.getElementById('rangkuman-refleksi-input').value.trim();
  if (!val) {
    showToast('❗ Ketik refleksimu dulu ya!');
    return;
  }
  showToast('✅ Refleksimu sudah tersimpan! Terima kasih!');
}

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  showScreen('screen-intro');

  // Browser butuh interaksi pertama sebelum bisa autoplay
  // → musik langsung mulai begitu user klik apapun untuk pertama kali
  // capture: true agar listener ini jalan sebelum handler tombol lain (mis. tombol mute)
  document.addEventListener('click', () => {
    AudioManager.play(document.querySelector('.screen.active')?.id || 'screen-intro');
  }, { once: true, capture: true });

  // Sound effect untuk tombol
  document.querySelectorAll('button, .video-item, .organ-tab, .proses-tab, .quiz-option, .jenis-card').forEach(el => {
    el.addEventListener('click', () => {
      AudioManager.playClick();
    });
  });
});

