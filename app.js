/* ============ Qada Lah — app logic ============ */
(() => {
  'use strict';

  // Refuse to run inside someone else's frame (clickjacking protection —
  // GitHub Pages can't send X-Frame-Options, so we do it here).
  if (window.top !== window.self) {
    try { window.top.location.replace(window.self.location.href); } catch (e) { /* cross-origin */ }
    document.documentElement.hidden = true;
    return;
  }

  // ---------- Constants ----------
  const STORAGE_KEY = 'qada-lah:v1';
  const MAX_BACKUP_CHARS = 2 * 1024 * 1024; // real backups are a few KB
  const DAY_MS = 86400000;

  const PRAYERS = [
    { id: 'subuh',   name: 'Subuh',   ar: 'الصبح',  rakaat: 2, emoji: '🌅' },
    { id: 'zohor',   name: 'Zohor',   ar: 'الظهر',  rakaat: 4, emoji: '☀️' },
    { id: 'asar',    name: 'Asar',    ar: 'العصر',  rakaat: 4, emoji: '🌤️' },
    { id: 'maghrib', name: 'Maghrib', ar: 'المغرب', rakaat: 3, emoji: '🌇' },
    { id: 'isyak',   name: 'Isyak',   ar: 'العشاء', rakaat: 4, emoji: '🌙' },
  ];
  const IDS = PRAYERS.map((p) => p.id);
  const byId = Object.fromEntries(PRAYERS.map((p) => [p.id, p]));

  const BADGES = [
    { id: 'first',    emoji: '🌱', test: (s) => s.done >= 1 },
    { id: 'day1',     emoji: '☀️', test: (s) => s.days >= 1 },
    { id: 'hundred',  emoji: '💯', test: (s) => s.done >= 100 },
    { id: 'streak3',  emoji: '🔥', test: (s) => s.streak >= 3 },
    { id: 'week',     emoji: '📅', test: (s) => s.days >= 7 },
    { id: 'streak7',  emoji: '⚡', test: (s) => s.streak >= 7 },
    { id: 'p10',      emoji: '🎯', test: (s) => s.pct >= 10 },
    { id: 'p25',      emoji: '🥉', test: (s) => s.pct >= 25 },
    { id: 'month',    emoji: '🌙', test: (s) => s.days >= 30 },
    { id: 'p50',      emoji: '🥈', test: (s) => s.pct >= 50 },
    { id: 'thousand', emoji: '🌟', test: (s) => s.done >= 1000 },
    { id: 'p75',      emoji: '🥇', test: (s) => s.pct >= 75 },
    { id: 'p100',     emoji: '🏆', test: (s) => s.pct >= 100 },
    { id: 'backup',   emoji: '🛡️', test: (s) => !!s.lastBackup },
  ];

  // ---------- Translations ----------
  const I18N = {
    ms: {
      tagline: 'Langsaikan hutang solat, satu demi satu.',
      tabCalc: 'Kira', tabTrack: 'Jejak', tabBackup: 'Simpan',
      calcTitle: 'Berapa banyak solat yang perlu diqada?',
      calcIntro: 'Pilih tempoh anda tidak menunaikan solat. Kami kira jumlahnya — anda cuma perlu mula.',
      step1: 'Tempoh solat ditinggalkan', fromDate: 'Dari tarikh', toDate: 'Hingga tarikh',
      untilToday: 'Hingga hari ini', oneYear: '1 tahun', fiveYears: '5 tahun', tenYears: '10 tahun',
      advanced: 'Tetapan lanjutan (pilihan)',
      excludeLabel: 'Hari dikecualikan sebulan (purata)',
      excludeHint: 'Contoh: hari haid/nifas bagi wanita, yang tidak perlu diqada. Biarkan 0 jika tidak berkaitan.',
      step2: 'Custom: solat yang anda yakin sudah tunaikan',
      step2Intro: 'Secara asas, kami anggap kesemua 5 waktu ditinggalkan setiap hari. Tandakan waktu yang anda yakin sentiasa ditunaikan dalam tempoh itu — ia tidak akan dikira.',
      step3: 'Keputusan', resultEmpty: 'Masukkan tarikh untuk melihat jumlah solat qada anda.',
      totalPrayers: 'Jumlah solat perlu diqada', totalRakaat: 'Jumlah rakaat',
      startTracking: 'Mula jejak sekarang', addToPlan: 'Tambah ke pelan sedia ada',
      disclaimer: 'Kiraan ini adalah anggaran untuk membantu anda. Untuk hukum yang lebih terperinci, sila rujuk ustaz atau pejabat agama Islam negeri anda.',
      noPlanTitle: 'Belum ada pelan qada',
      noPlanText: 'Kira dahulu jumlah solat qada anda, kemudian mula jejak kemajuan di sini.',
      goCalc: 'Pergi ke kalkulator', haveBackup: 'Saya ada fail backup',
      completed: 'selesai', prayersWord: 'solat', remaining: 'Berbaki', today: 'Hari ini',
      streak: 'Hari berturut 🔥', daysCleared: 'Hari dilangsaikan',
      checklistTitle: 'Senarai semak qada',
      checklistIntro: 'Tandakan setiap solat qada sebaik selesai ditunaikan. Lengkapkan kelima-lima untuk langsaikan satu hari.',
      targetTitle: 'Sasaran harian', targetIntro: 'Berapa solat qada yang anda mahu tunaikan setiap hari?', perDay: 'sehari',
      perPrayerTitle: 'Kemajuan setiap waktu', activityTitle: 'Aktiviti 20 minggu', less: 'Kurang', more: 'Lebih',
      badgesTitle: 'Pencapaian', backupNow: 'Backup sekarang',
      backupTitle: 'Simpan & pulihkan kemajuan',
      backupIntro: 'Kemajuan anda disimpan dalam pelayar peranti ini sahaja. Muat turun fail backup secara berkala supaya anda boleh pulihkan atau sambung di peranti lain.',
      downloadTitle: 'Muat turun backup',
      downloadText: 'Simpan fail .json ke telefon, Google Drive atau e-mel kepada diri sendiri.',
      downloadBtn: 'Muat turun fail', copyCodeBtn: 'Salin kod backup',
      uploadTitle: 'Pulihkan dari backup', uploadText: 'Muat naik fail backup Qada Lah untuk sambung kemajuan anda.',
      uploadBtn: 'Pilih fail backup', pasteSummary: 'Atau tampal kod backup', pastePlaceholder: 'Tampal kod di sini…', restoreBtn: 'Pulihkan',
      resetTitle: 'Padam semua data', resetText: 'Buang pelan dan kemajuan dari peranti ini. Pastikan anda sudah backup dahulu.', resetBtn: 'Padam data',
      footer: 'Dibina untuk umat Islam Malaysia. Data anda kekal dalam peranti anda.',
      // dynamic
      year: 'tahun', years: 'tahun', month: 'bulan', months: 'bulan', day: 'hari', days: 'hari',
      durationTotal: '{dur} · {days} hari',
      errOrder: 'Tarikh mula mesti sebelum atau sama dengan tarikh akhir.',
      errFuture: 'Tarikh akhir tidak boleh melebihi hari ini.',
      chipNeed: 'Perlu qada', chipDone: 'Sudah tunai ✓', rakaatN: '{n} rakaat',
      resSub: '{days} hari × {n} waktu', resExcluded: ' ({n} hari dikecualikan)',
      bdSub: '{n} rakaat', bdSkipped: 'Sudah ditunaikan',
      estimate: 'Jika anda qada <b>{t} solat sehari</b>, anda boleh langsaikan semuanya dalam <b>{dur}</b> — sekitar <b>{date}</b>.',
      estimateZero: 'Tiada solat perlu diqada untuk pilihan ini. Alhamdulillah!',
      confirmReplaceTitle: 'Ganti pelan sedia ada?',
      confirmReplaceText: 'Pelan baru akan menggantikan pelan semasa dan kemajuan akan bermula semula. Pilih "Tambah ke pelan sedia ada" jika anda mahu menggabungkannya.',
      replace: 'Ganti', cancel: 'Batal', save: 'Simpan', ok: 'Amin', del: 'Padam', restore: 'Pulihkan',
      planCreated: 'Pelan dicipta! Jom mula 💪', planAdded: 'Ditambah ke pelan anda ✓',
      mot0: 'Bismillah — langkah pertama paling bermakna.',
      mot1: 'Permulaan yang baik! Teruskan.',
      mot2: 'Sedikit demi sedikit, lama-lama jadi bukit.',
      mot3: 'Hebat! Anda semakin hampir separuh jalan.',
      mot4: 'Lebih separuh sudah! MasyaAllah.',
      mot5: 'Hampir sampai — jangan berhenti sekarang!',
      mot6: 'Alhamdulillah! Semua qada telah dilangsaikan. 🎉',
      roundTag: '{n}/{m} ditanda', roundDone: 'Alhamdulillah! Satu hari qada selesai ✨',
      allDone: 'Semua solat qada telah selesai. Alhamdulillah!',
      ciSub: '{r} rakaat · baki {left}',
      targetProgress: 'Hari ini: {n} / {t} solat', targetMet: 'Sasaran hari ini tercapai! 🎉',
      finishAt: 'Pada kadar {t} sehari, anda dijangka selesai dalam <b>{dur}</b> (<b>{date}</b>).',
      pace: ' Purata 14 hari lepas: {p} sehari.',
      finishDone: 'Tiada baki — semuanya selesai! 🏆',
      pcardCount: '<b>{d}</b> / {t} · baki {left}', pcSkipped: 'Tidak perlu diqada (custom).', pcDone: 'SELESAI ✓',
      setBtn: 'Tetap', setCountTitle: 'Tetapkan jumlah {p} yang sudah diqada',
      setCountText: 'Masukkan jumlah (0 – {t}). Berguna jika anda sudah mula qada sebelum guna Qada Lah.',
      badgeEarned: 'Pencapaian baru: {name} {emoji}',
      completeTitle: 'Alhamdulillah!',
      completeText: 'Anda telah melangsaikan kesemua solat qada. Semoga Allah menerima segala amalan anda.',
      stNoData: 'Tiada data untuk disimpan lagi', stNoDataText: 'Cipta pelan qada dahulu di tab Kira.',
      stNever: 'Anda belum pernah backup', stNeverText: 'Muat turun fail backup supaya kemajuan anda selamat.',
      stLast: 'Backup terakhir: {date}', stChanged: 'Ada kemajuan baru sejak backup terakhir — backup lagi.',
      stUpToDate: 'Semua kemajuan sudah dibackup. 👍',
      nudgeNever: 'Anda belum backup kemajuan anda. Jangan sampai hilang!',
      nudgeOld: 'Backup terakhir {n} hari lalu. Masa untuk backup baru?',
      downloaded: 'Fail backup dimuat turun ✓', copied: 'Kod backup disalin ✓', copyFail: 'Gagal menyalin. Cuba muat turun fail.',
      invalidFile: 'Ini bukan backup Qada Lah yang sah.', noPlanBackup: 'Tiada pelan untuk dibackup lagi.',
      restoreTitle: 'Pulihkan backup?',
      restoreText: 'Backup bertarikh {date}: {d} / {t} solat selesai. Data semasa di peranti ini akan diganti.',
      restored: 'Kemajuan dipulihkan ✓',
      resetConfirmTitle: 'Padam semua data?', resetConfirmText: 'Tindakan ini tidak boleh dibatalkan. Muat turun backup dahulu jika perlu.',
      resetDone: 'Semua data dipadam.',
      b_first: 'Langkah pertama', b_day1: '1 hari selesai', b_hundred: '100 solat', b_streak3: '3 hari berturut',
      b_week: '7 hari selesai', b_streak7: '7 hari berturut', b_p10: '10% selesai', b_p25: 'Suku jalan',
      b_month: '30 hari selesai', b_p50: 'Separuh jalan', b_thousand: '1,000 solat', b_p75: '75% selesai',
      b_p100: 'Lunas!', b_backup: 'Data selamat',
    },
    en: {
      tagline: 'Settle your missed prayers, one at a time.',
      tabCalc: 'Calculate', tabTrack: 'Track', tabBackup: 'Backup',
      calcTitle: 'How many prayers do you need to make up?',
      calcIntro: 'Pick the period when you missed your prayers. We do the counting — you just need to start.',
      step1: 'Period of missed prayers', fromDate: 'From date', toDate: 'To date',
      untilToday: 'Until today', oneYear: '1 year', fiveYears: '5 years', tenYears: '10 years',
      advanced: 'Advanced settings (optional)',
      excludeLabel: 'Excluded days per month (average)',
      excludeHint: 'E.g. haid/nifas days for women, which do not need to be made up. Leave 0 if not relevant.',
      step2: 'Custom: prayers you are sure you performed',
      step2Intro: 'By default we assume all 5 daily prayers were missed every day. Tick any prayer you are sure you always performed during that period — it will not be counted.',
      step3: 'Result', resultEmpty: 'Enter your dates to see how many qada prayers you have.',
      totalPrayers: 'Total prayers to make up', totalRakaat: 'Total rakaat',
      startTracking: 'Start tracking now', addToPlan: 'Add to existing plan',
      disclaimer: 'This calculation is an estimate to help you. For detailed rulings, please consult an ustaz or your state Islamic religious office.',
      noPlanTitle: 'No qada plan yet',
      noPlanText: 'Calculate your qada prayers first, then track your progress here.',
      goCalc: 'Go to calculator', haveBackup: 'I have a backup file',
      completed: 'done', prayersWord: 'prayers', remaining: 'Remaining', today: 'Today',
      streak: 'Day streak 🔥', daysCleared: 'Days cleared',
      checklistTitle: 'Qada checklist',
      checklistIntro: 'Tick each qada prayer once you have performed it. Complete all five to clear one full day.',
      targetTitle: 'Daily target', targetIntro: 'How many qada prayers do you want to perform each day?', perDay: 'per day',
      perPrayerTitle: 'Progress per prayer', activityTitle: '20-week activity', less: 'Less', more: 'More',
      badgesTitle: 'Achievements', backupNow: 'Back up now',
      backupTitle: 'Save & restore progress',
      backupIntro: 'Your progress is stored in this device\'s browser only. Download a backup file regularly so you can restore it or continue on another device.',
      downloadTitle: 'Download backup',
      downloadText: 'Save the .json file to your phone, Google Drive, or email it to yourself.',
      downloadBtn: 'Download file', copyCodeBtn: 'Copy backup code',
      uploadTitle: 'Restore from backup', uploadText: 'Upload a Qada Lah backup file to continue your progress.',
      uploadBtn: 'Choose backup file', pasteSummary: 'Or paste a backup code', pastePlaceholder: 'Paste code here…', restoreBtn: 'Restore',
      resetTitle: 'Delete all data', resetText: 'Remove your plan and progress from this device. Make sure you have a backup first.', resetBtn: 'Delete data',
      footer: 'Built for Malaysian Muslims. Your data stays on your device.',
      year: 'year', years: 'years', month: 'month', months: 'months', day: 'day', days: 'days',
      durationTotal: '{dur} · {days} days',
      errOrder: 'Start date must be on or before the end date.',
      errFuture: 'End date cannot be later than today.',
      chipNeed: 'To make up', chipDone: 'Performed ✓', rakaatN: '{n} rakaat',
      resSub: '{days} days × {n} prayers', resExcluded: ' ({n} days excluded)',
      bdSub: '{n} rakaat', bdSkipped: 'Already performed',
      estimate: 'If you make up <b>{t} prayers a day</b>, you can settle everything in <b>{dur}</b> — around <b>{date}</b>.',
      estimateZero: 'No prayers to make up for this selection. Alhamdulillah!',
      confirmReplaceTitle: 'Replace existing plan?',
      confirmReplaceText: 'The new plan will replace your current plan and progress will start over. Choose "Add to existing plan" if you want to combine them.',
      replace: 'Replace', cancel: 'Cancel', save: 'Save', ok: 'Ameen', del: 'Delete', restore: 'Restore',
      planCreated: 'Plan created! Let\'s begin 💪', planAdded: 'Added to your plan ✓',
      mot0: 'Bismillah — the first step matters most.',
      mot1: 'Great start! Keep going.',
      mot2: 'Little by little, it all adds up.',
      mot3: 'Amazing! You\'re getting close to halfway.',
      mot4: 'More than halfway there! MasyaAllah.',
      mot5: 'Almost there — don\'t stop now!',
      mot6: 'Alhamdulillah! All qada prayers are settled. 🎉',
      roundTag: '{n}/{m} ticked', roundDone: 'Alhamdulillah! One full day of qada done ✨',
      allDone: 'All qada prayers are complete. Alhamdulillah!',
      ciSub: '{r} rakaat · {left} left',
      targetProgress: 'Today: {n} / {t} prayers', targetMet: 'Today\'s target reached! 🎉',
      finishAt: 'At {t} a day, you\'re expected to finish in <b>{dur}</b> (<b>{date}</b>).',
      pace: ' Your 14-day average: {p} a day.',
      finishDone: 'Nothing left — all done! 🏆',
      pcardCount: '<b>{d}</b> / {t} · {left} left', pcSkipped: 'Not required (custom).', pcDone: 'DONE ✓',
      setBtn: 'Set', setCountTitle: 'Set how many {p} you have made up',
      setCountText: 'Enter a number (0 – {t}). Useful if you started qada before using Qada Lah.',
      badgeEarned: 'New achievement: {name} {emoji}',
      completeTitle: 'Alhamdulillah!',
      completeText: 'You have made up all your qada prayers. May Allah accept all your deeds.',
      stNoData: 'Nothing to back up yet', stNoDataText: 'Create a qada plan first in the Calculate tab.',
      stNever: 'You have never backed up', stNeverText: 'Download a backup file to keep your progress safe.',
      stLast: 'Last backup: {date}', stChanged: 'New progress since your last backup — back up again.',
      stUpToDate: 'All progress is backed up. 👍',
      nudgeNever: 'You haven\'t backed up your progress yet. Don\'t lose it!',
      nudgeOld: 'Last backup was {n} days ago. Time for a fresh one?',
      downloaded: 'Backup file downloaded ✓', copied: 'Backup code copied ✓', copyFail: 'Could not copy. Try downloading the file instead.',
      invalidFile: 'This is not a valid Qada Lah backup.', noPlanBackup: 'No plan to back up yet.',
      restoreTitle: 'Restore backup?',
      restoreText: 'Backup from {date}: {d} / {t} prayers done. Current data on this device will be replaced.',
      restored: 'Progress restored ✓',
      resetConfirmTitle: 'Delete all data?', resetConfirmText: 'This cannot be undone. Download a backup first if needed.',
      resetDone: 'All data deleted.',
      b_first: 'First step', b_day1: '1 day cleared', b_hundred: '100 prayers', b_streak3: '3-day streak',
      b_week: '7 days cleared', b_streak7: '7-day streak', b_p10: '10% done', b_p25: 'Quarter way',
      b_month: '30 days cleared', b_p50: 'Halfway', b_thousand: '1,000 prayers', b_p75: '75% done',
      b_p100: 'All settled!', b_backup: 'Data safe',
    },
  };

  // ---------- State ----------
  const freshState = () => ({
    v: 1,
    plan: null, // { totals: {id:n}, periods: [...], created }
    done: Object.fromEntries(IDS.map((id) => [id, 0])),
    activity: {}, // 'YYYY-MM-DD' -> prayers made up that day
    round: Object.fromEntries(IDS.map((id) => [id, false])),
    badges: [],
    lastBackup: null,
    updated: null,
    settings: { lang: 'ms', theme: null, target: 5 },
    draft: { start: '', end: '', exclude: 0, skip: [] },
  });

  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return normalize(JSON.parse(raw)) || freshState();
    } catch (e) { /* storage blocked or corrupt */ }
    return freshState();
  }

  function save(touch = true) {
    if (touch) state.updated = new Date().toISOString();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  const int = (v, min = 0, max = 1e9) => {
    const n = Math.floor(Number(v));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
  };
  const isDateStr = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
  // Only accept real ISO timestamps (anything else from a backup file is dropped)
  const isoOrNull = (s) => (typeof s === 'string' && s.length <= 30 && /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(s) && !isNaN(Date.parse(s)) ? s : null);
  const MAX_PER_PRAYER = 100000; // ~270 years of one prayer: generous but bounded
  const MAX_ACTIVITY_DAYS = 20000;

  // Keep only the known fields of a calculation period, all type-checked
  const cleanPeriod = (p) => (p && typeof p === 'object' ? {
    start: isDateStr(p.start) ? p.start : '',
    end: isDateStr(p.end) ? p.end : '',
    days: int(p.days, 0, MAX_PER_PRAYER),
    effDays: int(p.effDays, 0, MAX_PER_PRAYER),
    exclude: int(p.exclude, 0, 20),
    skip: Array.isArray(p.skip) ? p.skip.filter((id) => IDS.includes(id)) : [],
    total: int(p.total, 0, MAX_PER_PRAYER * IDS.length),
  } : null);

  // Turn any parsed object into a well-formed state (or null if unusable).
  function normalize(obj) {
    if (!obj || typeof obj !== 'object') return null;
    const s = freshState();
    if (obj.plan && obj.plan.totals) {
      const totals = Object.fromEntries(IDS.map((id) => [id, int(obj.plan.totals[id], 0, MAX_PER_PRAYER)]));
      s.plan = {
        totals,
        periods: Array.isArray(obj.plan.periods) ? obj.plan.periods.slice(0, 100).map(cleanPeriod).filter(Boolean) : [],
        created: isoOrNull(obj.plan.created),
      };
      IDS.forEach((id) => { s.done[id] = int(obj.done && obj.done[id], 0, totals[id]); });
    }
    if (obj.activity && typeof obj.activity === 'object') {
      Object.keys(obj.activity).filter(isDateStr).sort().slice(-MAX_ACTIVITY_DAYS).forEach((k) => {
        const n = int(obj.activity[k], 0, MAX_PER_PRAYER);
        if (n) s.activity[k] = n;
      });
    }
    if (obj.round) IDS.forEach((id) => { s.round[id] = !!obj.round[id]; });
    if (Array.isArray(obj.badges)) s.badges = [...new Set(obj.badges.filter((b) => BADGES.some((x) => x.id === b)))];
    s.lastBackup = isoOrNull(obj.lastBackup);
    s.updated = isoOrNull(obj.updated);
    if (obj.settings) {
      s.settings.lang = obj.settings.lang === 'en' ? 'en' : 'ms';
      s.settings.theme = ['light', 'dark'].includes(obj.settings.theme) ? obj.settings.theme : null;
      s.settings.target = int(obj.settings.target, 1, 50) || 5;
    }
    if (obj.draft) {
      s.draft.start = isDateStr(obj.draft.start) ? obj.draft.start : '';
      s.draft.end = isDateStr(obj.draft.end) ? obj.draft.end : '';
      s.draft.exclude = int(obj.draft.exclude, 0, 20);
      s.draft.skip = Array.isArray(obj.draft.skip) ? obj.draft.skip.filter((id) => IDS.includes(id)) : [];
    }
    return s;
  }

  // ---------- Helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  function t(key, vars) {
    const dict = I18N[state.settings.lang] || I18N.ms;
    let s = dict[key] ?? I18N.ms[key] ?? key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
    return s;
  }
  const locale = () => (state.settings.lang === 'en' ? 'en-MY' : 'ms-MY');
  const fmt = (n) => Number(n).toLocaleString(locale());

  const pad = (n) => String(n).padStart(2, '0');
  const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const todayKey = () => toKey(new Date());
  // Date strings → UTC midnight ms (avoids timezone / DST drift)
  const parseUTC = (s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  const keyToLocal = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (date, n) => { const d = new Date(date); d.setDate(d.getDate() + n); return d; };
  const fmtDate = (d) => d.toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' });
  const shiftYears = (key, years) => {
    const d = keyToLocal(key); d.setFullYear(d.getFullYear() - years); d.setDate(d.getDate() + 1); return toKey(d);
  };

  function unit(n, one, many) { return `${fmt(n)} ${t(n === 1 ? one : many)}`; }

  // Calendar difference between two date strings (end inclusive).
  function ymd(startKey, endKey) {
    const a = keyToLocal(startKey);
    const b = addDays(keyToLocal(endKey), 1);
    let y = b.getFullYear() - a.getFullYear();
    let m = b.getMonth() - a.getMonth();
    let d = b.getDate() - a.getDate();
    if (d < 0) { m -= 1; d += new Date(b.getFullYear(), b.getMonth(), 0).getDate(); }
    if (m < 0) { y -= 1; m += 12; }
    return { y, m, d };
  }
  function ymdText({ y, m, d }) {
    const parts = [];
    if (y) parts.push(unit(y, 'year', 'years'));
    if (m) parts.push(unit(m, 'month', 'months'));
    if (d || !parts.length) parts.push(unit(d, 'day', 'days'));
    return parts.join(', ');
  }
  // Human-friendly length for a number of days
  function humanDays(n) {
    if (n < 60) return unit(n, 'day', 'days');
    const months = Math.round(n / 30.44);
    if (months < 24) return unit(months, 'month', 'months');
    const y = Math.floor(months / 12), m = months % 12;
    return m ? `${unit(y, 'year', 'years')} ${unit(m, 'month', 'months')}` : unit(y, 'year', 'years');
  }

  // ---------- Toast / modal / confetti ----------
  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  // Returns a promise resolving to true/false (or the input value when `input` is set)
  function modal({ emoji = '', title, text, ok, cancel, danger = false, input = null }) {
    return new Promise((resolve) => {
      const m = $('#modal');
      $('#modalEmoji').textContent = emoji;
      $('#modalTitle').textContent = title;
      $('#modalText').textContent = text || '';
      const okBtn = $('#modalOk');
      const cancelBtn = $('#modalCancel');
      okBtn.textContent = ok || t('ok');
      okBtn.className = `btn ${danger ? 'btn-danger' : 'btn-primary'}`;
      cancelBtn.textContent = cancel || t('cancel');
      cancelBtn.hidden = cancel === false;

      let field = null;
      $('#modalInputWrap')?.remove();
      if (input) {
        const wrap = document.createElement('label');
        wrap.className = 'field';
        wrap.id = 'modalInputWrap';
        wrap.style.marginTop = '16px';
        field = document.createElement('input');
        Object.assign(field, { type: 'number', inputMode: 'numeric', min: input.min, max: input.max, value: input.value });
        wrap.appendChild(field);
        $('#modalText').after(wrap);
      }

      const close = (val) => {
        m.hidden = true;
        okBtn.onclick = cancelBtn.onclick = m.onclick = document.onkeydown = null;
        resolve(val);
      };
      okBtn.onclick = () => close(input ? field.value : true);
      cancelBtn.onclick = () => close(input ? null : false);
      m.onclick = (e) => { if (e.target === m) close(input ? null : false); };
      document.onkeydown = (e) => {
        if (e.key === 'Escape') close(input ? null : false);
        if (e.key === 'Enter' && input) close(field.value);
      };
      m.hidden = false;
      (field || okBtn).focus();
      if (field) field.select();
    });
  }

  const confetti = (() => {
    const canvas = $('#confetti');
    const ctx = canvas.getContext('2d');
    let parts = [];
    let raf = null;
    const colors = ['#14a37f', '#e3a92b', '#5b7cfa', '#f06f3a', '#c2459c', '#f1c45b'];
    function resize() { canvas.width = innerWidth * devicePixelRatio; canvas.height = innerHeight * devicePixelRatio; }
    function tick() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      parts = parts.filter((p) => p.life > 0);
      parts.forEach((p) => {
        p.vy += 0.25 * devicePixelRatio; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= 1;
        ctx.save();
        ctx.globalAlpha = Math.min(1, p.life / 40);
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        ctx.restore();
      });
      raf = parts.length ? requestAnimationFrame(tick) : (ctx.clearRect(0, 0, canvas.width, canvas.height), null);
    }
    return function fire(amount = 120) {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      resize();
      const dpr = devicePixelRatio;
      for (let i = 0; i < amount; i++) {
        parts.push({
          x: canvas.width * (0.2 + Math.random() * 0.6), y: canvas.height * 0.35,
          vx: (Math.random() - 0.5) * 16 * dpr, vy: (-Math.random() * 14 - 4) * dpr,
          rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
          s: (6 + Math.random() * 8) * dpr, c: colors[i % colors.length], life: 110 + Math.random() * 60,
        });
      }
      if (!raf) raf = requestAnimationFrame(tick);
    };
  })();

  // ---------- Theme & language ----------
  function applyTheme() {
    const theme = state.settings.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = theme;
    $('meta[name="theme-color"]').content = theme === 'dark' ? '#0d1714' : '#0f5c4a';
  }

  function applyLang() {
    const lang = state.settings.lang;
    document.documentElement.lang = lang;
    $$('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    $$('[data-i18n-placeholder]').forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder); });
    $('#langToggle').textContent = lang === 'ms' ? 'EN' : 'BM';
    document.title = lang === 'ms' ? 'Qada Lah — Penjejak Solat Qada' : 'Qada Lah — Qada Prayer Tracker';
  }

  // ---------- Tabs ----------
  function showTab(name) {
    $$('.tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
    $$('.view').forEach((v) => v.classList.toggle('active', v.id === `view-${name}`));
    if (name === 'track') renderTracker();
    if (name === 'backup') renderBackup();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // =========================================================
  // CALCULATOR
  // =========================================================
  function renderCustomChips() {
    const wrap = $('#customChips');
    wrap.innerHTML = '';
    PRAYERS.forEach((p) => {
      const on = state.draft.skip.includes(p.id);
      const label = document.createElement('label');
      label.className = `prayer-chip p-${p.id}${on ? ' on' : ''}`;
      label.innerHTML = `
        <input type="checkbox" value="${p.id}" ${on ? 'checked' : ''}>
        <span class="dot">${p.emoji}</span>
        <span><span class="pc-name">${p.name}</span><br><span class="pc-sub">${t('rakaatN', { n: p.rakaat })}</span></span>
        <span class="pc-status">${on ? t('chipDone') : t('chipNeed')}</span>`;
      label.querySelector('input').addEventListener('change', (e) => {
        const set = new Set(state.draft.skip);
        e.target.checked ? set.add(p.id) : set.delete(p.id);
        state.draft.skip = IDS.filter((id) => set.has(id));
        save(false);
        renderCustomChips();
        renderResult();
      });
      wrap.appendChild(label);
    });
  }

  // Core calculation: returns null when inputs are incomplete, {error} when invalid.
  function calculate() {
    const { start, end, exclude, skip } = state.draft;
    if (!start || !end) return null;
    if (start > end) return { error: t('errOrder') };
    if (end > todayKey()) return { error: t('errFuture') };
    const days = Math.round((parseUTC(end) - parseUTC(start)) / DAY_MS) + 1;
    const months = days / 30.4375;
    const excluded = Math.min(days, Math.round(months * exclude));
    const effDays = days - excluded;
    const counts = Object.fromEntries(IDS.map((id) => [id, skip.includes(id) ? 0 : effDays]));
    const total = IDS.reduce((a, id) => a + counts[id], 0);
    const rakaat = IDS.reduce((a, id) => a + counts[id] * byId[id].rakaat, 0);
    return { start, end, days, excluded, effDays, counts, total, rakaat, active: IDS.length - skip.length, exclude, skip: [...skip] };
  }

  function renderResult() {
    const r = calculate();
    const dur = $('#durationText');
    dur.classList.remove('error');
    if (!r) {
      dur.textContent = '';
    } else if (r.error) {
      dur.textContent = r.error;
      dur.classList.add('error');
    } else {
      dur.textContent = `🗓️ ${t('durationTotal', { dur: ymdText(ymd(r.start, r.end)), days: fmt(r.days) })}`;
    }

    const ok = r && !r.error;
    $('#resultEmpty').hidden = ok;
    $('#resultBody').hidden = !ok;
    if (!ok) return;

    animateNumber($('#resTotal'), r.total);
    $('#resRakaat').textContent = fmt(r.rakaat);
    $('#resSub').textContent = t('resSub', { days: fmt(r.effDays), n: r.active }) +
      (r.excluded ? t('resExcluded', { n: fmt(r.excluded) }) : '');

    $('#resBreakdown').innerHTML = PRAYERS.map((p) => {
      const skipped = r.counts[p.id] === 0 && r.skip.includes(p.id);
      return `<div class="bd p-${p.id}${skipped ? ' skipped' : ''}">
        <div class="bd-name">${p.emoji} ${p.name}</div>
        <div class="bd-count">${skipped ? '—' : fmt(r.counts[p.id])}</div>
        <div class="bd-sub">${skipped ? t('bdSkipped') : t('bdSub', { n: fmt(r.counts[p.id] * p.rakaat) })}</div>
      </div>`;
    }).join('');

    const target = state.settings.target;
    if (r.total > 0) {
      const needDays = Math.ceil(r.total / target);
      $('#resEstimate').innerHTML = `<span>💡</span><span>${t('estimate', {
        t: target, dur: humanDays(needDays), date: fmtDate(addDays(new Date(), needDays)),
      })}</span>`;
    } else {
      $('#resEstimate').innerHTML = `<span>🤲</span><span>${t('estimateZero')}</span>`;
    }
    $('#startTracking').disabled = r.total === 0;
    $('#addToPlan').hidden = !state.plan || r.total === 0;
  }

  function animateNumber(el, to) {
    const from = Number(el.dataset.val || 0);
    el.dataset.val = to;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || from === to) { el.textContent = fmt(to); return; }
    const start = performance.now();
    const dur = 600;
    const step = (now) => {
      const k = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(Math.round(from + (to - from) * e));
      if (k < 1 && el.dataset.val == to) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function periodFrom(r) {
    return { start: r.start, end: r.end, days: r.days, effDays: r.effDays, exclude: r.exclude, skip: r.skip, total: r.total };
  }

  async function startTracking() {
    const r = calculate();
    if (!r || r.error || !r.total) return;
    const hasProgress = state.plan && IDS.some((id) => state.done[id] > 0);
    if (hasProgress) {
      const yes = await modal({ emoji: '⚠️', title: t('confirmReplaceTitle'), text: t('confirmReplaceText'), ok: t('replace'), danger: true });
      if (!yes) return;
    }
    state.plan = { totals: { ...r.counts }, periods: [periodFrom(r)], created: new Date().toISOString() };
    state.done = Object.fromEntries(IDS.map((id) => [id, 0]));
    state.round = Object.fromEntries(IDS.map((id) => [id, false]));
    state.badges = state.badges.filter((b) => b === 'backup');
    save();
    toast(t('planCreated'));
    showTab('track');
  }

  function addToPlan() {
    const r = calculate();
    if (!r || r.error || !r.total || !state.plan) return;
    IDS.forEach((id) => { state.plan.totals[id] += r.counts[id]; });
    state.plan.periods.push(periodFrom(r));
    save();
    toast(t('planAdded'));
    showTab('track');
  }

  // =========================================================
  // TRACKER
  // =========================================================
  const totalOf = () => (state.plan ? IDS.reduce((a, id) => a + state.plan.totals[id], 0) : 0);
  const doneOf = () => IDS.reduce((a, id) => a + state.done[id], 0);
  const activeIds = () => (state.plan ? IDS.filter((id) => state.plan.totals[id] > 0) : []);

  function streak() {
    let d = new Date();
    if (!state.activity[toKey(d)]) d = addDays(d, -1);
    let n = 0;
    while (state.activity[toKey(d)] > 0) { n++; d = addDays(d, -1); }
    return n;
  }
  const daysCleared = () => {
    const ids = activeIds();
    return ids.length ? Math.min(...ids.map((id) => state.done[id])) : 0;
  };
  function summary() {
    const total = totalOf();
    const done = doneOf();
    return {
      total, done,
      pct: total ? (done / total) * 100 : 0,
      days: daysCleared(),
      streak: streak(),
      lastBackup: state.lastBackup,
    };
  }

  // Apply a change to a prayer's done count; returns the amount actually applied.
  // `log` = false for manual corrections, so they don't count as today's activity.
  function addDone(id, delta, log = true) {
    if (!state.plan) return 0;
    const before = state.done[id];
    const after = Math.min(state.plan.totals[id], Math.max(0, before + delta));
    const applied = after - before;
    if (!applied) return 0;
    state.done[id] = after;
    if (!log) { save(); return applied; }
    const k = todayKey();
    state.activity[k] = Math.max(0, (state.activity[k] || 0) + applied);
    if (!state.activity[k]) delete state.activity[k];
    save();
    return applied;
  }

  function afterChange() {
    renderTracker();
    checkBadges();
  }

  function renderTracker() {
    const has = !!state.plan;
    $('#trackEmpty').hidden = has;
    $('#trackBody').hidden = !has;
    if (!has) return;

    const s = summary();
    const pct = s.pct;
    const pctShown = pct >= 100 ? 100 : pct > 0 && pct < 1 ? Math.round(pct * 10) / 10 : Math.floor(pct);

    // Ring
    const C = 2 * Math.PI * 86;
    const ring = $('#ringFg');
    ring.style.strokeDasharray = C;
    ring.style.strokeDashoffset = C * (1 - Math.min(1, pct / 100));
    $('#ringPct').textContent = `${pctShown.toLocaleString(locale())}%`;

    // Journey bar
    $('#journeyFill').style.width = `${Math.min(100, pct)}%`;
    $('#journeyWalker').style.left = `${Math.min(100, pct)}%`;

    const motIdx = pct >= 100 ? 6 : pct >= 75 ? 5 : pct >= 50 ? 4 : pct >= 25 ? 3 : pct >= 10 ? 2 : pct > 0 ? 1 : 0;
    $('#motivation').textContent = t(`mot${motIdx}`);
    $('#ovDone').textContent = fmt(s.done);
    $('#ovTotal').textContent = fmt(s.total);
    $('#stRemaining').textContent = fmt(s.total - s.done);
    $('#stToday').textContent = fmt(state.activity[todayKey()] || 0);
    $('#stStreak').textContent = fmt(s.streak);
    $('#stDays').textContent = fmt(s.days);

    renderChecklist();
    renderTarget(s);
    renderPrayerCards();
    renderHeatmap();
    renderBadges();
    renderNudge(s);
  }

  function renderChecklist() {
    const list = $('#checklist');
    const ids = activeIds().filter((id) => state.done[id] < state.plan.totals[id] || state.round[id]);
    list.innerHTML = '';
    if (!ids.length) {
      list.innerHTML = `<li class="empty-state">🏆 ${t('allDone')}</li>`;
      $('#roundTag').textContent = '';
      return;
    }
    const ticked = ids.filter((id) => state.round[id]).length;
    $('#roundTag').textContent = t('roundTag', { n: ticked, m: ids.length });

    ids.forEach((id) => {
      const p = byId[id];
      const left = state.plan.totals[id] - state.done[id];
      const li = document.createElement('li');
      li.className = `check-item p-${p.id}`;
      li.innerHTML = `
        <input type="checkbox" id="ck-${id}" ${state.round[id] ? 'checked' : ''}>
        <label for="ck-${id}">
          <span class="check-box"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          <span>${p.emoji}</span>
          <span class="ci-name">${p.name}</span>
          <span class="ci-sub">${t('ciSub', { r: p.rakaat, left: fmt(left) })}</span>
        </label>`;
      li.querySelector('input').addEventListener('change', (e) => onTick(id, e.target.checked));
      list.appendChild(li);
    });
  }

  let roundTimer;
  function onTick(id, checked) {
    const applied = addDone(id, checked ? 1 : -1);
    state.round[id] = checked && applied !== 0;
    save(false);

    const ids = activeIds().filter((x) => state.done[x] < state.plan.totals[x] || state.round[x]);
    const complete = ids.length > 0 && ids.every((x) => state.round[x]);
    afterChange();
    if (complete) {
      confetti(90);
      toast(t('roundDone'));
      clearTimeout(roundTimer);
      roundTimer = setTimeout(() => {
        IDS.forEach((x) => { state.round[x] = false; });
        save(false);
        renderTracker();
      }, 1400);
    }
  }

  function renderTarget(s) {
    const target = state.settings.target;
    const todayN = state.activity[todayKey()] || 0;
    $('#targetVal').textContent = target;
    $('#targetFill').style.width = `${Math.min(100, (todayN / target) * 100)}%`;
    $('#targetProgress').textContent = todayN >= target ? t('targetMet') : t('targetProgress', { n: fmt(todayN), t: target });

    const remaining = s.total - s.done;
    if (remaining <= 0) { $('#finishText').innerHTML = `🏆 ${t('finishDone')}`; return; }
    const needDays = Math.ceil(remaining / target);
    let html = `🏁 ${t('finishAt', { t: target, dur: humanDays(needDays), date: fmtDate(addDays(new Date(), needDays)) })}`;
    let sum14 = 0;
    for (let i = 0; i < 14; i++) sum14 += state.activity[toKey(addDays(new Date(), -i))] || 0;
    if (sum14 > 0) html += t('pace', { p: (Math.round((sum14 / 14) * 10) / 10).toLocaleString(locale()) });
    $('#finishText').innerHTML = html;
  }

  function renderPrayerCards() {
    const wrap = $('#prayerCards');
    wrap.innerHTML = '';
    PRAYERS.forEach((p) => {
      const total = state.plan.totals[p.id];
      const done = state.done[p.id];
      const card = document.createElement('div');
      const head = `
        <div class="pcard-top">
          <span class="dot">${p.emoji}</span>
          <div><div class="pcard-name">${p.name}</div><div class="pcard-ar" lang="ar">${p.ar}</div></div>
          ${total ? `<span class="pcard-pct">${Math.floor((done / total) * 100)}%</span>` : ''}
        </div>`;
      if (!total) {
        card.className = `pcard p-${p.id} skipped`;
        card.innerHTML = `${head}<p class="skip-note">${t('pcSkipped')}</p>`;
        wrap.appendChild(card);
        return;
      }
      const complete = done >= total;
      card.className = `pcard p-${p.id}${complete ? ' done' : ''}`;
      card.innerHTML = `${head}
        <div class="pbar"><div class="pbar-fill"></div></div>
        <div class="pcard-count">${complete ? `<span class="done-ribbon">${t('pcDone')}</span> · ` : ''}${t('pcardCount', { d: fmt(done), t: fmt(total), left: fmt(total - done) })}</div>
        <div class="pcard-actions">
          <button type="button" data-act="minus" ${done <= 0 ? 'disabled' : ''} aria-label="-1 ${p.name}">−1</button>
          <button type="button" data-act="set">${t('setBtn')}</button>
          <button type="button" class="plus" data-act="plus" ${complete ? 'disabled' : ''} aria-label="+1 ${p.name}">+1</button>
        </div>`;
      card.querySelector('.pbar-fill').style.width = `${(done / total) * 100}%`;
      card.querySelector('[data-act="minus"]').onclick = () => { addDone(p.id, -1); afterChange(); };
      card.querySelector('[data-act="plus"]').onclick = () => { if (addDone(p.id, 1)) toastMaybeDone(p.id); afterChange(); };
      card.querySelector('[data-act="set"]').onclick = async () => {
        const val = await modal({
          emoji: p.emoji, title: t('setCountTitle', { p: p.name }), text: t('setCountText', { t: fmt(total) }),
          ok: t('save'), input: { min: 0, max: total, value: done },
        });
        if (val === null || val === '') return;
        addDone(p.id, int(val, 0, total) - state.done[p.id], false);
        afterChange();
      };
      wrap.appendChild(card);
    });
  }

  function toastMaybeDone(id) {
    if (state.done[id] >= state.plan.totals[id]) { confetti(60); toast(`${byId[id].emoji} ${byId[id].name} — ${t('pcDone')}`); }
  }

  function renderHeatmap() {
    const el = $('#heatmap');
    const target = state.settings.target;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Start on the Monday 19 weeks before this week's Monday
    const dow = (today.getDay() + 6) % 7; // 0 = Monday
    const start = addDays(today, -dow - 19 * 7);
    const cells = [];
    for (let i = 0; i < 20 * 7; i++) {
      const d = addDays(start, i);
      const key = toKey(d);
      const n = state.activity[key] || 0;
      let lvl = 0;
      if (n > 0) lvl = n >= target ? 4 : n >= (target * 2) / 3 ? 3 : n >= target / 3 ? 2 : 1;
      const cls = [`l${lvl}`];
      if (d > today) cls.push('future');
      if (key === toKey(today)) cls.push('today');
      cells.push(`<i class="${cls.join(' ')}" title="${fmtDate(d)}: ${fmt(n)}"></i>`);
    }
    el.innerHTML = cells.join('');
  }

  function renderBadges() {
    const earned = new Set(state.badges);
    $('#badges').innerHTML = BADGES.map((b) => `
      <div class="badge${earned.has(b.id) ? ' earned' : ''}" title="${t(`b_${b.id}`)}">
        <span class="b-emoji">${b.emoji}</span><span class="b-name">${t(`b_${b.id}`)}</span>
      </div>`).join('');
    $('#badgeCount').textContent = `${earned.size}/${BADGES.length}`;
  }

  function checkBadges() {
    if (!state.plan) return;
    const s = summary();
    const fresh = BADGES.filter((b) => !state.badges.includes(b.id) && b.test(s));
    if (!fresh.length) return;
    state.badges.push(...fresh.map((b) => b.id));
    save(false);
    renderBadges();
    if (fresh.some((b) => b.id === 'p100')) {
      confetti(220);
      modal({ emoji: '🏆', title: t('completeTitle'), text: t('completeText'), ok: t('ok'), cancel: false });
      return;
    }
    const b = fresh[fresh.length - 1];
    confetti(70);
    toast(t('badgeEarned', { name: t(`b_${b.id}`), emoji: b.emoji }));
  }

  const daysSince = (iso) => Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS);

  function renderNudge(s) {
    const n = $('#backupNudge');
    let msg = '';
    if (s.done > 0) {
      if (!state.lastBackup) msg = t('nudgeNever');
      else if (daysSince(state.lastBackup) >= 7 && state.updated > state.lastBackup) msg = t('nudgeOld', { n: daysSince(state.lastBackup) });
    }
    n.hidden = !msg;
    $('#backupNudgeText').textContent = `🛡️ ${msg}`;
  }

  // =========================================================
  // BACKUP
  // =========================================================
  function renderBackup() {
    const card = $('.status-card');
    card.classList.remove('warn');
    let icon = '💾', title, text;
    if (!state.plan) {
      title = t('stNoData'); text = t('stNoDataText'); icon = '📭';
    } else if (!state.lastBackup) {
      title = t('stNever'); text = t('stNeverText'); icon = '⚠️'; card.classList.add('warn');
    } else {
      title = t('stLast', { date: fmtDate(new Date(state.lastBackup)) });
      const changed = state.updated && state.updated > state.lastBackup;
      text = changed ? t('stChanged') : t('stUpToDate');
      icon = changed ? '🔄' : '✅';
      if (changed) card.classList.add('warn');
    }
    $('#backupStatusIcon').textContent = icon;
    $('#backupStatusTitle').textContent = title;
    $('#backupStatusText').textContent = text;
  }

  function exportPayload() {
    const now = new Date().toISOString();
    state.lastBackup = now;
    state.updated = now; // the backup now reflects everything
    save(false);
    return { app: 'qada-lah', v: 1, exportedAt: now, data: state };
  }

  function toB64(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  const fromB64 = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));

  function afterBackup() {
    checkBadges();
    renderBackup();
  }

  function downloadBackup() {
    if (!state.plan) { toast(t('noPlanBackup')); return; }
    const payload = exportPayload();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `qada-lah-backup-${todayKey()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast(t('downloaded'));
    afterBackup();
  }

  async function copyCode() {
    if (!state.plan) { toast(t('noPlanBackup')); return; }
    const code = toB64(JSON.stringify(exportPayload()));
    try {
      await navigator.clipboard.writeText(code);
      toast(t('copied'));
    } catch (e) {
      // Fallback: drop the code into the paste box so the user can copy it manually
      const ta = $('#pasteCode');
      ta.closest('details').open = true;
      ta.value = code;
      ta.select();
      try { document.execCommand('copy') ? toast(t('copied')) : toast(t('copyFail')); } catch (_) { toast(t('copyFail')); }
    }
    afterBackup();
  }

  function parseBackup(text) {
    text = String(text || '').trim();
    if (!text || text.length > MAX_BACKUP_CHARS) return null;
    let obj;
    try { obj = JSON.parse(text); } catch (e) {
      try { obj = JSON.parse(fromB64(text.replace(/\s+/g, ''))); } catch (_) { return null; }
    }
    if (!obj || typeof obj !== 'object' || obj.app !== 'qada-lah' || !obj.data) return null;
    const s = normalize(obj.data);
    if (!s || !s.plan) return null;
    return { state: s, exportedAt: isoOrNull(obj.exportedAt) };
  }

  async function restoreFrom(text) {
    const parsed = parseBackup(text);
    if (!parsed) { toast(t('invalidFile')); return false; }
    const s = parsed.state;
    const total = IDS.reduce((a, id) => a + s.plan.totals[id], 0);
    const done = IDS.reduce((a, id) => a + s.done[id], 0);
    const when = parsed.exportedAt ? fmtDate(new Date(parsed.exportedAt)) : '—';
    const yes = await modal({
      emoji: '📥', title: t('restoreTitle'),
      text: t('restoreText', { date: when, d: fmt(done), t: fmt(total) }), ok: t('restore'),
    });
    if (!yes) return false;
    // Keep this device's display preferences
    s.settings.lang = state.settings.lang;
    s.settings.theme = state.settings.theme;
    state = s;
    save(false);
    applyLang();
    applyTheme();
    syncCalcInputs();
    renderCustomChips();
    renderResult();
    toast(t('restored'));
    confetti(80);
    showTab('track');
    return true;
  }

  async function resetAll() {
    const yes = await modal({ emoji: '🗑️', title: t('resetConfirmTitle'), text: t('resetConfirmText'), ok: t('del'), danger: true });
    if (!yes) return;
    const { lang, theme } = state.settings;
    state = freshState();
    state.settings.lang = lang;
    state.settings.theme = theme;
    save(false);
    syncCalcInputs();
    renderCustomChips();
    renderResult();
    renderBackup();
    toast(t('resetDone'));
  }

  // =========================================================
  // Wiring
  // =========================================================
  function syncCalcInputs() {
    $('#startDate').value = state.draft.start;
    $('#endDate').value = state.draft.end;
    $('#excludePerMonth').value = state.draft.exclude;
    $('#startDate').max = $('#endDate').max = todayKey();
  }

  function bind() {
    $$('.tab').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));
    $$('[data-goto]').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.goto)));

    $('#langToggle').addEventListener('click', () => {
      state.settings.lang = state.settings.lang === 'ms' ? 'en' : 'ms';
      save(false);
      applyLang();
      renderCustomChips();
      renderResult();
      renderTracker();
      renderBackup();
    });
    $('#themeToggle').addEventListener('click', () => {
      state.settings.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      save(false);
      applyTheme();
    });

    const onDate = () => {
      state.draft.start = $('#startDate').value;
      state.draft.end = $('#endDate').value;
      save(false);
      renderResult();
    };
    $('#startDate').addEventListener('change', onDate);
    $('#endDate').addEventListener('change', onDate);
    $('#excludePerMonth').addEventListener('input', (e) => {
      state.draft.exclude = int(e.target.value, 0, 20);
      save(false);
      renderResult();
    });
    $('#untilToday').addEventListener('click', () => { $('#endDate').value = todayKey(); onDate(); });
    $$('[data-years]').forEach((b) => b.addEventListener('click', () => {
      const end = $('#endDate').value || todayKey();
      $('#endDate').value = end;
      $('#startDate').value = shiftYears(end, Number(b.dataset.years));
      onDate();
    }));

    $('#startTracking').addEventListener('click', startTracking);
    $('#addToPlan').addEventListener('click', addToPlan);

    const setTarget = (d) => {
      state.settings.target = int(state.settings.target + d, 1, 50);
      save(false);
      renderTracker();
    };
    $('#targetMinus').addEventListener('click', () => setTarget(-1));
    $('#targetPlus').addEventListener('click', () => setTarget(1));

    $('#downloadBackup').addEventListener('click', downloadBackup);
    $('#copyCode').addEventListener('click', copyCode);
    $('#uploadBackup').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
      if (file.size > MAX_BACKUP_CHARS) { toast(t('invalidFile')); return; }
      restoreFrom(await file.text());
    });
    $('#restoreCode').addEventListener('click', async () => {
      if (await restoreFrom($('#pasteCode').value)) $('#pasteCode').value = '';
    });
    $('#resetAll').addEventListener('click', resetAll);

    // Re-render when returning to the tab (e.g. the date rolled over)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) { syncCalcInputs(); renderTracker(); }
    });
  }

  function init() {
    applyTheme();
    applyLang();
    syncCalcInputs();
    renderCustomChips();
    renderResult();
    bind();
    showTab(state.plan ? 'track' : 'calc');
    checkBadges();

    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  init();
})();
