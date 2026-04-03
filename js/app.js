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
  let muted    = false;  // default: musik NYALA otomatis
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

  function updateBtn() {
    const btn = document.getElementById('btn-audio-toggle');
    if (!btn) return;
    btn.textContent = muted ? '🔇' : '🔊';
    btn.title = muted ? 'Aktifkan Musik' : 'Matikan Musik';
  }

  return { play, toggleMute };
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
const pgQuestions = [
  {
    q: "1. Organ pernapasan yang berfungsi sebagai tempat pertukaran oksigen (O₂) dan karbon dioksida (CO₂) adalah ...",
    options: ["Hidung", "Tenggorokan", "Paru-paru", "Jantung"],
    answer: 2,
    feedback: "✅ Benar! Paru-paru adalah tempat pertukaran gas O₂ dan CO₂ melalui alveolus."
  },
  {
    q: "2. Proses menghirup udara masuk ke dalam paru-paru disebut ...",
    options: ["Ekspirasi", "Inspirasi", "Respirasi", "Oksidasi"],
    answer: 1,
    feedback: "✅ Benar! Inspirasi adalah proses menghirup udara (masuk ke paru-paru)."
  },
  {
    q: "3. Rambut-rambut halus dalam hidung berfungsi untuk ...",
    options: [
      "Menghasilkan suara",
      "Menyerap oksigen",
      "Menyaring debu dan kotoran dalam udara",
      "Memompa darah"
    ],
    answer: 2,
    feedback: "✅ Benar! Rambut halus (silia) di hidung menyaring debu dan kotoran agar tidak masuk ke paru-paru."
  },
  {
    q: "4. Pernapasan yang menggunakan otot diafragma disebut pernapasan ...",
    options: ["Dada", "Perut", "Hidung", "Paru-paru"],
    answer: 1,
    feedback: "✅ Benar! Pernapasan perut menggunakan otot diafragma sebagai penggeraknya."
  },
  {
    q: "5. Kandungan gas yang paling banyak dalam udara yang kita HIRUP adalah ...",
    options: ["Karbon dioksida (CO₂)", "Uap air", "Oksigen (O₂)", "Nitrogen (N₂)"],
    answer: 3,
    feedback: "✅ Tepat! Udara yang kita hirup mengandung sekitar 78% nitrogen, 21% oksigen, dan sisanya gas lain."
  },
  {
    q: "6. Bagian tenggorokan yang berfungsi menghasilkan suara adalah ...",
    options: ["Trakea", "Bronkus", "Laring (kotak suara)", "Alveolus"],
    answer: 2,
    feedback: "✅ Benar! Laring atau kotak suara adalah bagian atas tenggorokan yang menghasilkan suara."
  },
  {
    q: "7. Saat inspirasi (menghirup), apa yang terjadi pada rongga dada?",
    options: [
      "Rongga dada mengecil",
      "Rongga dada membesar",
      "Rongga dada tidak berubah",
      "Rongga dada bergetar"
    ],
    answer: 1,
    feedback: "✅ Benar! Saat inspirasi, rongga dada membesar sehingga tekanan turun dan udara masuk."
  },
  {
    q: "8. Kantung udara kecil dalam paru-paru tempat pertukaran gas disebut ...",
    options: ["Bronkus", "Trakea", "Alveolus", "Laring"],
    answer: 2,
    feedback: "✅ Benar! Alveolus adalah kantung-kantung udara kecil di ujung bronkiolus tempat O₂ dan CO₂ bertukar."
  },
  {
    q: "9. Paru-paru kiri manusia terdiri dari berapa lobus?",
    options: ["1 lobus", "2 lobus", "3 lobus", "4 lobus"],
    answer: 1,
    feedback: "✅ Benar! Paru-paru kiri memiliki 2 lobus, sedikit lebih kecil karena berdampingan dengan jantung."
  },
  {
    q: "10. Berapa kali rata-rata manusia bernapas dalam satu menit?",
    options: ["1–5 kali", "5–10 kali", "12–20 kali", "30–40 kali"],
    answer: 2,
    feedback: "✅ Tepat! Rata-rata manusia bernapas 12–20 kali per menit dalam kondisi normal."
  }
];

const essayQuestions = [
  {
    q: "1. Sebutkan 3 organ pernapasan utama pada manusia!",
    hint: "💡 Petunjuk: Pikirkan jalur udara dari luar sampai ke dalam tubuh...",
    keywords: ["hidung", "tenggorokan", "paru", "trakea", "laring"],
    modelAnswer: "Hidung, tenggorokan (trakea), dan paru-paru."
  },
  {
    q: "2. Jelaskan apa yang dimaksud dengan inspirasi dalam proses pernapasan!",
    hint: "💡 Petunjuk: Inspirasi berhubungan dengan gerakan udara masuk...",
    keywords: ["menghirup", "masuk", "oksigen", "rongga", "membesar", "tekanan turun"],
    modelAnswer: "Inspirasi adalah proses menghirup udara yang mengandung oksigen ke dalam paru-paru. Saat inspirasi, rongga dada membesar dan tekanan udara menurun sehingga udara dari luar masuk ke paru-paru."
  },
  {
    q: "3. Apa perbedaan antara pernapasan dada dan pernapasan perut?",
    hint: "💡 Petunjuk: Perhatikan otot yang berperan di masing-masing jenis pernapasan...",
    keywords: ["dada", "perut", "diafragma", "tulang rusuk", "otot"],
    modelAnswer: "Pernapasan dada menggunakan otot antar tulang rusuk, sedangkan pernapasan perut menggunakan otot diafragma. Pernapasan perut lebih efisien dan menghasilkan volume udara yang lebih banyak."
  },
  {
    q: "4. Mengapa udara perlu dihangatkan oleh hidung sebelum masuk ke paru-paru?",
    hint: "💡 Petunjuk: Pikirkan tentang kondisi alat pernapasan dalam tubuh kita...",
    keywords: ["hangat", "suhu", "tubuh", "rusak", "paru", "selaput"],
    modelAnswer: "Udara perlu dihangatkan agar suhunya sesuai dengan suhu tubuh. Jika udara terlalu dingin langsung masuk ke paru-paru, dapat merusak selaput-selaput halus di dalam paru-paru."
  },
  {
    q: "5. Apa fungsi alveolus dalam sistem pernapasan manusia?",
    hint: "💡 Petunjuk: Alveolus adalah bagian terkecil dari paru-paru...",
    keywords: ["pertukaran", "oksigen", "karbon dioksida", "darah", "serap", "gas"],
    modelAnswer: "Alveolus berfungsi sebagai tempat terjadinya pertukaran gas antara oksigen (O₂) dan karbon dioksida (CO₂). Oksigen diserap ke dalam darah melalui dinding alveolus, sedangkan karbon dioksida dari darah dikeluarkan ke alveolus untuk dibuang saat ekspirasi."
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

  if (type === 'pg') {
    state.quiz.answers = new Array(pgQuestions.length).fill(null);
    showScreen('screen-latihan-pg');
    // Reset
    document.getElementById('pg-nama-step').style.display = 'block';
    document.getElementById('pg-quiz-step').style.display = 'none';
    document.getElementById('pg-nama-input').value = state.user.nama || '';
  } else {
    state.quiz.answers = new Array(essayQuestions.length).fill('');
    showScreen('screen-latihan-essay');
    document.getElementById('essay-nama-step').style.display = 'block';
    document.getElementById('essay-quiz-step').style.display = 'none';
    document.getElementById('essay-nama-input').value = state.user.nama || '';
  }
}

function startPGQuiz() {
  const nama = document.getElementById('pg-nama-input').value.trim();
  if (!nama) { showToast('❗ Tulis namamu dulu ya!'); return; }
  state.quiz.namaTemp = nama;
  document.getElementById('pg-nama-step').style.display = 'none';
  document.getElementById('pg-quiz-step').style.display = 'block';
  renderPGQuestion();
}

function startEssayQuiz() {
  const nama = document.getElementById('essay-nama-input').value.trim();
  if (!nama) { showToast('❗ Tulis namamu dulu ya!'); return; }
  state.quiz.namaTemp = nama;
  document.getElementById('essay-nama-step').style.display = 'none';
  document.getElementById('essay-quiz-step').style.display = 'block';
  renderEssayQuestion();
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

  document.getElementById('pg-btn-prev').disabled = idx === 0;
  document.getElementById('pg-btn-next').textContent = idx === total - 1 ? '📊 Lihat Nilai' : 'Selanjutnya →';
}

function selectPGAnswer(i) {
  state.quiz.answers[state.quiz.currentIndex] = i;
  renderPGQuestion();
}

function pgNext() {
  if (state.quiz.answers[state.quiz.currentIndex] === null) {
    showToast('❗ Pilih jawaban dulu ya!');
    return;
  }
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

// ============================================
// ESSAY QUIZ
// ============================================
function renderEssayQuestion() {
  const idx   = state.quiz.currentIndex;
  const q     = essayQuestions[idx];
  const total = essayQuestions.length;

  document.getElementById('essay-question-num').textContent = `Soal ${idx + 1} dari ${total}`;
  document.getElementById('essay-progress-fill').style.width = `${((idx + 1) / total) * 100}%`;
  document.getElementById('essay-question-text').textContent = q.q;
  document.getElementById('essay-hint').textContent = q.hint;

  const textarea = document.getElementById('essay-answer-input');
  textarea.value = state.quiz.answers[idx] || '';

  document.getElementById('essay-btn-prev').disabled = idx === 0;
  document.getElementById('essay-btn-next').textContent = idx === total - 1 ? '📊 Lihat Nilai' : 'Selanjutnya →';
}

function essayNext() {
  const textarea = document.getElementById('essay-answer-input');
  const val = textarea.value.trim();
  if (!val) {
    showToast('❗ Tulis jawabanmu dulu ya!');
    return;
  }
  state.quiz.answers[state.quiz.currentIndex] = val;

  if (state.quiz.currentIndex < essayQuestions.length - 1) {
    state.quiz.currentIndex++;
    renderEssayQuestion();
  } else {
    submitEssay();
  }
}

function essayPrev() {
  const textarea = document.getElementById('essay-answer-input');
  state.quiz.answers[state.quiz.currentIndex] = textarea.value.trim();
  if (state.quiz.currentIndex > 0) {
    state.quiz.currentIndex--;
    renderEssayQuestion();
  }
}

function submitEssay() {
  let totalScore = 0;
  essayQuestions.forEach((q, i) => {
    const ans = (state.quiz.answers[i] || '').toLowerCase();
    let hit = 0;
    q.keywords.forEach(kw => {
      if (ans.includes(kw.toLowerCase())) hit++;
    });
    const ratio = hit / q.keywords.length;
    // Score per question: 0–20 based on keyword hit ratio
    if (ratio >= 0.6)      totalScore += 20;
    else if (ratio >= 0.4) totalScore += 15;
    else if (ratio >= 0.2) totalScore += 10;
    else if (ratio > 0)    totalScore += 5;
  });

  showScore(totalScore, 'Essay Terbatas', null, essayQuestions.length);
}

// ============================================
// SHOW SCORE
// ============================================
function showScore(score, type, correct, total) {
  showScreen('screen-skor');

  document.getElementById('skor-nama-display').textContent = state.quiz.namaTemp;
  document.getElementById('skor-jenis-display').textContent = 'Jenis: ' + type;

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

  // Tombol mulai dengan ikon 🔊
  setTimeout(() => {
    const btn = document.getElementById('btn-audio-toggle');
    if (btn) { btn.textContent = '🔊'; btn.title = 'Matikan Musik'; }
  }, 100);
});

