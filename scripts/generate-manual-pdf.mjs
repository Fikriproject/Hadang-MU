import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Buku Panduan Penggunaan Lengkap - HadangMU</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700&display=swap');

    @page {
      size: A4 portrait;
      margin: 18mm 16mm 20mm 16mm;
      @bottom-right {
        content: "Halaman " counter(page);
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-size: 8pt;
        color: #64748b;
      }
      @bottom-left {
        content: "HadangMU — Sistem Skor Digital & Manajemen Turnamen Hadang";
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-size: 8pt;
        color: #64748b;
      }
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 10pt;
      line-height: 1.55;
      color: #1e293b;
      background-color: #ffffff;
      margin: 0;
      padding: 0;
    }

    /* Page Breaks */
    .page-break {
      page-break-before: always;
    }
    .avoid-break {
      page-break-inside: avoid;
    }

    /* Cover Page Styling */
    .cover-page {
      height: 100vh;
      min-height: 250mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 25mm 15mm 15mm 15mm;
      background: linear-gradient(145deg, #0f172a 0%, #1e293b 60%, #0b1329 100%);
      color: #ffffff;
      border-radius: 8px;
      position: relative;
      overflow: hidden;
      page-break-after: always;
    }

    .cover-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(37, 99, 235, 0.25);
      border: 1px solid rgba(96, 165, 250, 0.4);
      color: #93c5fd;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 9pt;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 20px;
    }

    .cover-title {
      font-size: 34pt;
      font-weight: 900;
      line-height: 1.15;
      letter-spacing: -0.02em;
      margin: 0 0 12px 0;
      color: #ffffff;
    }

    .cover-title span {
      background: linear-gradient(90deg, #60a5fa, #38bdf8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .cover-subtitle {
      font-size: 13pt;
      font-weight: 500;
      line-height: 1.5;
      color: #94a3b8;
      max-width: 580px;
      margin: 0 0 30px 0;
    }

    .cover-meta-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 16px 20px;
      max-width: 550px;
    }

    .cover-meta-item {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .cover-meta-label {
      font-size: 7.5pt;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #64748b;
      font-weight: 700;
    }

    .cover-meta-val {
      font-size: 9.5pt;
      color: #f8fafc;
      font-weight: 600;
    }

    .cover-footer {
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding-top: 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8.5pt;
      color: #64748b;
    }

    /* Headings */
    h1.chapter-title {
      font-size: 18pt;
      font-weight: 900;
      color: #0f172a;
      border-bottom: 2.5px solid #2563eb;
      padding-bottom: 6px;
      margin-top: 0;
      margin-bottom: 16px;
      letter-spacing: -0.01em;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    h1.chapter-title .ch-num {
      background: #2563eb;
      color: white;
      font-size: 11pt;
      padding: 3px 10px;
      border-radius: 6px;
      font-weight: 800;
    }

    h2.section-title {
      font-size: 13pt;
      font-weight: 800;
      color: #1e293b;
      margin-top: 18px;
      margin-bottom: 8px;
      padding-left: 10px;
      border-left: 3.5px solid #2563eb;
    }

    h3.subsection-title {
      font-size: 11pt;
      font-weight: 700;
      color: #334155;
      margin-top: 14px;
      margin-bottom: 6px;
    }

    p {
      margin: 0 0 10px 0;
      text-align: justify;
    }

    ul, ol {
      margin: 0 0 12px 0;
      padding-left: 20px;
    }

    li {
      margin-bottom: 4px;
    }

    /* Tables */
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0 16px 0;
      font-size: 8.5pt;
      background-color: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      overflow: hidden;
    }

    table.data-table th {
      background-color: #f1f5f9;
      color: #0f172a;
      font-weight: 700;
      text-align: left;
      padding: 7px 10px;
      border: 1px solid #cbd5e1;
    }

    table.data-table td {
      padding: 6.5px 10px;
      border: 1px solid #e2e8f0;
      color: #334155;
      vertical-align: top;
    }

    table.data-table tr:nth-child(even) {
      background-color: #f8fafc;
    }

    /* Callouts & Alert Boxes */
    .callout {
      padding: 10px 14px;
      border-radius: 8px;
      margin: 12px 0;
      font-size: 9pt;
      display: flex;
      gap: 10px;
      align-items: flex-start;
      border: 1px solid transparent;
    }

    .callout-icon {
      font-size: 14pt;
      line-height: 1;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .callout-body {
      flex: 1;
    }

    .callout-title {
      font-weight: 800;
      margin-bottom: 3px;
    }

    .callout-info {
      background-color: #eff6ff;
      border-color: #bfdbfe;
      color: #1e40af;
    }
    .callout-info .callout-title { color: #1d4ed8; }

    .callout-warning {
      background-color: #fffbeb;
      border-color: #fde68a;
      color: #92400e;
    }
    .callout-warning .callout-title { color: #b45309; }

    .callout-danger {
      background-color: #fef2f2;
      border-color: #fecaca;
      color: #991b1b;
    }
    .callout-danger .callout-title { color: #dc2626; }

    .callout-success {
      background-color: #f0fdf4;
      border-color: #bbf7d0;
      color: #166534;
    }
    .callout-success .callout-title { color: #15803d; }

    /* Card Panels */
    .card-panel {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 14px;
      margin: 10px 0;
    }

    .card-panel-title {
      font-weight: 700;
      font-size: 9.5pt;
      color: #0f172a;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* Badges */
    .badge {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 7.5pt;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .badge-primary { background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }
    .badge-success { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
    .badge-warning { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
    .badge-danger { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
    .badge-purple { background: #f3e8ff; color: #6b21a8; border: 1px solid #e9d5ff; }

    /* Keybind / Button representation */
    .ui-btn {
      display: inline-block;
      background-color: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 2px 8px;
      border-radius: 4px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 8pt;
      font-weight: 700;
      color: #334155;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    .ui-btn-blue {
      background-color: #2563eb;
      color: white;
      border-color: #1d4ed8;
    }
    .ui-btn-green {
      background-color: #16a34a;
      color: white;
      border-color: #15803d;
    }
    .ui-btn-amber {
      background-color: #d97706;
      color: white;
      border-color: #b45309;
    }
    .ui-btn-red {
      background-color: #dc2626;
      color: white;
      border-color: #b91c1c;
    }

    /* Step numbers */
    .step-list {
      counter-reset: step-counter;
      list-style: none;
      padding-left: 0;
      margin: 10px 0;
    }

    .step-item {
      counter-increment: step-counter;
      display: flex;
      gap: 12px;
      margin-bottom: 10px;
      align-items: flex-start;
    }

    .step-bubble {
      background-color: #2563eb;
      color: white;
      font-weight: 800;
      font-size: 8pt;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .step-content {
      flex: 1;
    }

    .step-title {
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 2px;
    }

    /* Workflow Diagram Box */
    .flow-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      padding: 10px;
      border-radius: 8px;
      margin: 12px 0;
    }

    .flow-box {
      flex: 1;
      background: white;
      border: 1px solid #94a3b8;
      border-radius: 6px;
      padding: 8px 6px;
      text-align: center;
      font-size: 8pt;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .flow-box strong {
      display: block;
      color: #0f172a;
      font-size: 8.5pt;
      margin-bottom: 2px;
    }

    .flow-arrow {
      color: #64748b;
      font-weight: 800;
      font-size: 11pt;
    }

    /* Grid 2 Column Layout */
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin: 10px 0;
    }

    /* Mock Screen Box */
    .mock-screen {
      background-color: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 12px;
      color: white;
      font-family: 'JetBrains Mono', monospace;
      font-size: 7.5pt;
      margin: 10px 0;
    }

    .mock-screen-header {
      border-bottom: 1px solid #334155;
      padding-bottom: 6px;
      margin-bottom: 8px;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>

  <!-- ==================== HALAMAN 1: COVER ==================== -->
  <div class="cover-page">
    <div>
      <div class="cover-badge">
        <span>⚡ PANDUAN PENGGUNA RESMI SISTEM (MANUAL BOOK)</span>
      </div>
      <h1 class="cover-title">
        BUKU PANDUAN LENGKAP<br>
        <span>HADANG-MU</span>
      </h1>
      <p class="cover-subtitle">
        Pedoman Pengoperasian Lengkap Sistem Digital Scoring, Bagan Turnamen Sistem Gugur Otomatis, dan Papan Skor TV Realtime untuk Olahraga Tradisional Hadang (Gobak Sodor).
      </p>

      <div class="cover-meta-grid">
        <div class="cover-meta-item">
          <span class="cover-meta-label">Nama Aplikasi</span>
          <span class="cover-meta-val">HadangMU Tournament System</span>
        </div>
        <div class="cover-meta-item">
          <span class="cover-meta-label">Versi Dokumen</span>
          <span class="cover-meta-val">v2.0 (Edisi Standar Turnamen)</span>
        </div>
        <div class="cover-meta-item">
          <span class="cover-meta-label">Cakupan Role</span>
          <span class="cover-meta-val">Admin, Scoring 1 & 2, Operator TV, Publik</span>
        </div>
        <div class="cover-meta-item">
          <span class="cover-meta-label">Standar Pertandingan</span>
          <span class="cover-meta-val">Modul Resmi Olahraga Tradisional Nasional</span>
        </div>
      </div>
    </div>

    <div>
      <div class="callout callout-info" style="background: rgba(37,99,235,0.15); border-color: rgba(96,165,250,0.3); color: #bfdbfe; margin-bottom: 20px;">
        <div class="callout-icon">💡</div>
        <div class="callout-body">
          <div class="callout-title" style="color: #60a5fa;">Tujuan Penerbitan Panduan</div>
          Buku manual ini disusun secara menyeluruh dan sangat mendetail guna menjadi acuan teknis operasional bagi Panitia Pelaksana, Technical Delegate (Admin), Dewan Hakim / Juri Meja Scoring, Operator Siaran/TV, dan Tim Peserta Turnamen Hadang agar seluruh penyelenggaraan pertandingan berlangsung tertib, transparan, dan bebas kendala.
        </div>
      </div>

      <div class="cover-footer">
        <span>&copy; HadangMU — Sistem Digital Penilaian Olahraga Tradisional Indonesia</span>
        <span>Dokumen Terverifikasi Resmi • Distribusi Panitia</span>
      </div>
    </div>
  </div>

  <!-- ==================== HALAMAN 2: DAFTAR ISI ==================== -->
  <div class="page-break"></div>
  <h1 class="chapter-title"><span class="ch-num">DAFTAR ISI</span> Struktur Isi Panduan Lengkap</h1>

  <table class="data-table" style="font-size: 9pt;">
    <thead>
      <tr style="background: #e2e8f0;">
        <th style="width: 15%;">Bagian</th>
        <th style="width: 70%;">Judul Bab & Rincian Topik Pembahasan</th>
        <th style="width: 15%; text-align: right;">Topik</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>BAB 1</strong></td>
        <td><strong>Pengenalan & Arsitektur Sistem HadangMU</strong><br>
          <small>Latar belakang, keunggulan sistem digital, arsitektur sinkronisasi WebSocket Supabase, dan prinsip tampilan posisi deterministik.</small>
        </td>
        <td style="text-align: right;">Hal 3</td>
      </tr>
      <tr>
        <td><strong>BAB 2</strong></td>
        <td><strong>Hak Akses & Manajemen Akun (Role-Based Access Control)</strong><br>
          <small>Matriks peran (Admin vs Juri vs Publik), hak akses modul, mekanisme login, dan keamanan Row Level Security (RLS).</small>
        </td>
        <td style="text-align: right;">Hal 4</td>
      </tr>
      <tr>
        <td><strong>BAB 3</strong></td>
        <td><strong>Panduan Lengkap Role Admin (Panitia Utama / TD)</strong><br>
          <small>Kelola tim peserta (Putra/Putri), pembuatan match, bagan turnamen sistem gugur otomatis (2 s/d 32 tim, slot BYE, lock bracket), ruang kontrol admin, pergantian babak, dan audit log pembatalan skor.</small>
        </td>
        <td style="text-align: right;">Hal 5 - 8</td>
      </tr>
      <tr>
        <td><strong>BAB 4</strong></td>
        <td><strong>Panduan Lengkap Role Jury (Petugas Meja Scoring)</strong><br>
          <small>Pembagian tugas Scoring 1 (Depan) vs Scoring 2 (Belakang), kontroler mobile, input +1 poin instan, haptic getar, pembatalan poin (Undo), turnover penyerang, dan proteksi kunci otomatis.</small>
        </td>
        <td style="text-align: right;">Hal 9 - 11</td>
      </tr>
      <tr>
        <td><strong>BAB 5</strong></td>
        <td><strong>Panduan Operator TV & Proyektor (Live Scoreboard)</strong><br>
          <small>Pengaturan layar penuh, auto-hide mouse, efek glow dinamis pencetak poin, arena timer tengah, dan indikator realtime status.</small>
        </td>
        <td style="text-align: right;">Hal 12</td>
      </tr>
      <tr>
        <td><strong>BAB 6</strong></td>
        <td><strong>Panduan Portal Publik & Bagan Penonton</strong><br>
          <small>Pemantauan skor langsung, jadwal pertandingan siap tanding, riwayat hasil selesai, dan bagan sistem gugur interaktif.</small>
        </td>
        <td style="text-align: right;">Hal 13</td>
      </tr>
      <tr>
        <td><strong>BAB 7</strong></td>
        <td><strong>Regulasi Resmi Pertandingan & Logika Skor Hadang</strong><br>
          <small>Standar penilaian (garis depan/belakang/kartu merah), durasi 2x15 menit, alih giliran penjaga, dan penentuan pemenang jika seri (Tie-Break skor depan).</small>
        </td>
        <td style="text-align: right;">Hal 14</td>
      </tr>
      <tr>
        <td><strong>BAB 8</strong></td>
        <td><strong>SOP Pelaksanaan Turnamen & Panduan Pemecahan Masalah (Troubleshooting)</strong><br>
          <small>Checklist pra-laga, checklist selama laga, checklist pasca-laga, penanganan koneksi drop, sinkronisasi darurat, dan pembersihan data.</small>
        </td>
        <td style="text-align: right;">Hal 15 - 16</td>
      </tr>
    </tbody>
  </table>

  <div class="callout callout-warning">
    <div class="callout-icon">⚠️</div>
    <div class="callout-body">
      <div class="callout-title">Penting Bagi Seluruh Petugas Pertandingan</div>
      Sebelum pertandingan resmi dimulai, seluruh panitia pelaksana (Admin, Petugas Meja Scoring 1 & 2, serta Operator TV) diwajibkan membaca Bab 3, 4, dan 5 sesuai peran penugasan masing-masing serta memahami SOP pada Bab 8.
    </div>
  </div>

  <!-- ==================== HALAMAN 3: BAB 1 ==================== -->
  <div class="page-break"></div>
  <h1 class="chapter-title"><span class="ch-num">BAB 1</span> Pengenalan & Arsitektur Sistem HadangMU</h1>

  <h2 class="section-title">1.1 Latar Belakang & Filosofi Aplikasi</h2>
  <p>
    Olahraga tradisional <strong>Hadang</strong> (dikenal luas di berbagai daerah sebagai <em>Gobak Sodor</em>, <em>Galah Asin</em>, atau <em>Galasin</em>) adalah permainan ketangkasan beregu asli Indonesia yang menuntut kecepatan, kelincahan, dan strategi koordinasi formasi garis pertahanan dan penyerangan. Seiring dengan standardisasi kejuaraan olahraga tradisional di tingkat daerah, nasional (KORMI/FORMAS), maupun kejuaraan pendidikan/umum, pencatatan skor manual dengan kertas atau papan tulis sering menghadapi kendala:
  </p>
  <ul>
    <li>Keterlambatan pembaruan skor kepada penonton dan ofisial tim.</li>
    <li>Risiko kesalahan rekapitulasi poin antara juri garis depan dan juri garis belakang.</li>
    <li>Perdebatan hasil pertandingan ketika terjadi skor seri (tie-break) di akhir babak kedua.</li>
    <li>Kesulitan mengelola bagan turnamen sistem gugur secara cepat dan transparan tanpa jeda waktu lama antar ronde.</li>
  </ul>
  <p>
    <strong>HadangMU</strong> hadir sebagai solusi digital terintegrasi modern yang menggabungkan kemudahan operasional juri berbasis smartphone, ruang kendali pengawas pertandingan berbasis web, bagan kejuaraan otomatis, serta papan skor beresolusi tinggi untuk layar TV atau proyektor panggung.
  </p>

  <h2 class="section-title">1.2 Fitur Unggulan Sistem</h2>
  <div class="grid-2">
    <div class="card-panel">
      <div class="card-panel-title">📱 Meja Scoring Mobile-First</div>
      Dirancang khusus untuk dioperasikan dengan satu tangan melalui smartphone juri. Tombol sentuh ekstra besar, responsif tanpa jeda (0ms optimistic latency), getaran sentuh (haptic feedback), dan fitur pembatalan instan (undo).
    </div>
    <div class="card-panel">
      <div class="card-panel-title">🎛️ Ruang Kontrol Admin (Control Room)</div>
      Pusat kendali pertandingan terpusat untuk mengatur status laga (Draft, Ready, Live, Paused, Finished), pergantian babak resmi, penukaran posisi penyerang, injeksi skor darurat, dan audit pembatalan skor.
    </div>
    <div class="card-panel">
      <div class="card-panel-title">🏆 Bagan Turnamen Otomatis (Bracket)</div>
      Mendukung bagan sistem gugur 2 hingga 32 tim, pemisahan otomatis kategori Putra dan Putri, penempatan slot BYE yang seimbang di sudut terluar, mode acak (Roll Random), dan auto-advance pemenang.
    </div>
    <div class="card-panel">
      <div class="card-panel-title">📺 Papan Skor TV Realtime Fullscreen</div>
      Tampilan proyektor/TV berdefinisi tinggi dengan tipografi jumbo, efek visual glow saat skor tercipta, arena timer yang sinkron, dan auto-hide kursor saat mode layar penuh untuk siaran langsung (OBS/Streaming).
    </div>
  </div>

  <h2 class="section-title">1.3 Paradigma Sinkronisasi Realtime & Posisi Deterministik</h2>
  <p>
    Salah satu inovasi terpenting pada HadangMU adalah <strong>Prinsip Posisi Deterministik (Deterministic Team Positioning)</strong>. Pada sistem skor olahraga konvensional, saat babak bertukar, seringkali nama tim di layar TV ikut berputar/bertukar sisi kiri ke kanan yang membingungkan pandangan penonton dan juru kamera.
  </p>
  <div class="callout callout-info">
    <div class="callout-icon">📌</div>
    <div class="callout-body">
      <div class="callout-title">Aturan Baku Tampilan HadangMU</div>
      <strong>Posisi Tim Kiri dan Tim Kanan tidak pernah bertukar tempat di layar HP juri, ruang kontrol admin, maupun layar TV proyektor.</strong> Yang bertukar statusnya hanyalah label peran: <em>[⚡ PENYERANG]</em> (Hijau menyala) atau <em>[BERTAHAN]</em> (Abu-abu netral). Dengan demikian, baik juri maupun penonton memiliki titik pandang spasial yang konsisten sepanjang 2 babak penuh!
    </div>
  </div>

  <!-- ==================== HALAMAN 4: BAB 2 ==================== -->
  <div class="page-break"></div>
  <h1 class="chapter-title"><span class="ch-num">BAB 2</span> Hak Akses & Manajemen Peran Pengguna</h1>

  <h2 class="section-title">2.1 Matriks Peran Pengguna (Role-Based Access Control)</h2>
  <p>
    Sistem HadangMU menerapkan otentikasi berbasis token JWT terenkripsi dengan proteksi <em>Row Level Security (RLS)</em> pada tingkat basis data Supabase. Terdapat 3 kategori pengguna dengan hak akses sebagai berikut:
  </p>

  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 20%;">Peran (Role)</th>
        <th style="width: 35%;">Deskripsi & Tanggung Jawab</th>
        <th style="width: 25%;">Halaman Akses Utama</th>
        <th style="width: 20%;">Hak Akses Tindakan</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          <span class="badge badge-primary">ADMIN</span><br>
          <strong>Panitia Utama / Technical Delegate</strong>
        </td>
        <td>Pengawas tertinggi turnamen. Bertanggung jawab atas kelola tim, susunan bagan turnamen, penetapan juri, status live pertandingan, audit skor, dan hasil akhir.</td>
        <td>
          <code>/admin</code><br>
          <code>/admin/teams</code><br>
          <code>/admin/bracket</code><br>
          <code>/admin/matches/[id]</code>
        </td>
        <td><strong>Akses Penuh (Full Control):</strong> Buat/Hapus Tim, Buat Match, Kunci Bagan, Start/Pause/Finish, Tukar Babak, Injeksi Skor, Anulir Skor.</td>
      </tr>
      <tr>
        <td>
          <span class="badge badge-success">JURY</span><br>
          <strong>Petugas Meja Scoring (Scoring 1 & 2)</strong>
        </td>
        <td>Dewan juri meja pertandingan. Terbagi menjadi <strong>Scoring 1 (Area Depan)</strong> dan <strong>Scoring 2 (Area Belakang)</strong> sesuai penugasan match.</td>
        <td>
          <code>/jury</code><br>
          <code>/jury/matches/[id]</code><br>
          <code>/jury/bracket</code>
        </td>
        <td><strong>Akses Scoring:</strong> Memasukkan skor (+1 poin), membatalkan poin miliknya (Undo), menukar giliran penyerang (turnover), tukar babak.</td>
      </tr>
      <tr>
        <td>
          <span class="badge badge-warning">OPERATOR / PUBLIK</span><br>
          <strong>Penonton, Atlet, Operator TV Layar</strong>
        </td>
        <td>Masyarakat umum, ofisial tim peserta, penonton daring/luring, serta operator perangkat display TV/proyektor arena.</td>
        <td>
          <code>/</code> (Portal Utama)<br>
          <code>/bracket</code> (Bagan)<br>
          <code>/tv/[id]</code> (Papan Skor TV)
        </td>
        <td><strong>Hanya Baca (Read-Only):</strong> Memantau papan skor live, melihat jadwal, hasil rekapitulasi akhir, dan bagan turnamen.</td>
      </tr>
    </tbody>
  </table>

  <h2 class="section-title">2.2 Alur Otentikasi & Proteksi Keamanan</h2>
  <div class="flow-container">
    <div class="flow-box">
      <strong>1. Pengguna Buka URL</strong>
      Akses <code>/admin</code> atau <code>/jury</code>
    </div>
    <div class="flow-arrow">➔</div>
    <div class="flow-box">
      <strong>2. Verifikasi Middleware</strong>
      Periksa sesi token login aktif
    </div>
    <div class="flow-arrow">➔</div>
    <div class="flow-box">
      <strong>3. Pengecekan Profil</strong>
      Verifikasi kolom <code>role</code> di tabel profiles
    </div>
    <div class="flow-arrow">➔</div>
    <div class="flow-box">
      <strong>4. Routing Adaptif</strong>
      Admin ke <code>/admin</code>, Juri ke <code>/jury</code>
    </div>
  </div>

  <h2 class="section-title">2.3 Keamanan Database Row Level Security (RLS)</h2>
  <p>
    Keamanan pencatatan skor dilindungi secara ketat langsung pada level database PostgreSQL:
  </p>
  <ul>
    <li><strong>Isolasi Penugasan Juri:</strong> Juri <em>hanya diizinkan</em> menyisipkan data skor (INSERT score_event) pada pertandingan di mana UUID juri tersebut tercatat sebagai <code>jury_1_id</code> atau <code>jury_2_id</code> dan pertandingan sedang dalam status <code>LIVE</code>.</li>
    <li><strong>Hak Anulir Terbatas:</strong> Juri hanya dapat mengubah status skor miliknya sendiri (status: CANCELLED). Juri tidak bisa menghapus atau mengubah skor yang dicatat oleh juri pasangannya.</li>
    <li><strong>Admin Super-Privilege:</strong> Hanya Admin yang memiliki wewenang untuk menganulir skor dari juri manapun dan melakukan injeksi skor darurat.</li>
  </ul>

  <!-- ==================== HALAMAN 5: BAB 3 (BAGIAN 1) ==================== -->
  <div class="page-break"></div>
  <h1 class="chapter-title"><span class="ch-num">BAB 3</span> Panduan Lengkap Role Admin (Bagian 1: Persiapan)</h1>

  <h2 class="section-title">3.1 Masuk ke Dashboard Admin</h2>
  <ol class="step-list">
    <li class="step-item">
      <div class="step-bubble">1</div>
      <div class="step-content">
        <div class="step-title">Buka Halaman Login</div>
        Arahkan peramban ke <code>http://[domain-aplikasi]/login</code>. Masukkan alamat email dan kata sandi akun Admin yang telah terdaftar.
      </div>
    </li>
    <li class="step-item">
      <div class="step-bubble">2</div>
      <div class="step-content">
        <div class="step-title">Dashboard Utama Admin (/admin)</div>
        Setelah berhasil masuk, Anda akan langsung berada di <strong>Dashboard Manajemen Pertandingan</strong>. Di halaman ini Anda dapat melihat rekapitulasi semua pertandingan yang sedang berlangsung (Live), siap bertanding (Ready), jeda (Paused), maupun selesai (Finished).
      </div>
    </li>
  </ol>

  <h2 class="section-title">3.2 Manajemen Tim Peserta (/admin/teams)</h2>
  <p>
    Sebelum membuat jadwal atau bagan kejuaraan, seluruh tim yang telah mendaftar wajib diinput ke dalam sistem melalui menu <strong>Kelola Tim</strong>:
  </p>
  <div class="card-panel">
    <div class="card-panel-title">Langkah Pendaftaran Tim Baru:</div>
    <ol style="margin-bottom: 0;">
      <li>Klik tombol <span class="ui-btn ui-btn-blue">👥 Kelola Tim</span> pada bilah navigasi atas.</li>
      <li>Pada formulir <em>"Tambah Tim Baru"</em>, masukkan <strong>Nama Tim</strong> (Contoh: <em>Rajawali Merah</em>, <em>Srikandi Jaya</em>).</li>
      <li>Pilih <strong>Kategori Tim</strong> secara tepat: <span class="badge badge-primary">PUTRA</span> atau <span class="badge badge-purple">PUTRI</span>. Pemisahan kategori ini sangat krusial untuk mencegah pertandingan silang antar gender.</li>
      <li>Klik tombol <span class="ui-btn ui-btn-green">+ Daftarkan Tim</span>. Tim akan langsung muncul pada tabel daftar tim sesuai kategorinya.</li>
      <li>Untuk menghapus tim yang batal berpartisipasi, klik tombol merah bertanda <span class="ui-btn ui-btn-red">Hapus</span> di baris tim terkait.</li>
    </ol>
  </div>

  <h2 class="section-title">3.3 Manajemen Bagan Turnamen Sistem Gugur (/admin/bracket)</h2>
  <p>
    HadangMU dilengkapi mesin bagan turnamen sistem gugur (knockout bracket engine) canggih yang mampu mengelola <strong>2 hingga 32 tim</strong> secara dinamis.
  </p>

  <h3 class="subsection-title">A. Memilih Kategori Bagan (Putra vs Putri)</h3>
  <p>
    Terdapat dua tab terpisah di bagian atas halaman bagan: <strong>Kategori Putra</strong> dan <strong>Kategori Putri</strong>. Setiap kategori memiliki struktur bagan independen dan penyimpanan tersendiri.
  </p>

  <h3 class="subsection-title">B. Penentuan Kapasitas Bagan & Logika Slot BYE Otomatis</h3>
  <p>
    Ukuran bagan turnamen sistem gugur selalu mengikuti kelipatan pangkat 2 terdekat: <strong>2, 4, 8, 16, atau 32 slot</strong>. Apabila jumlah tim peserta tidak tepat kelipatan pangkat dua (misal: 6 tim atau 12 tim), sistem secara otomatis menghasilkan slot <strong>BYE (Lolos Otomatis)</strong>:
  </p>

  <table class="data-table">
    <thead>
      <tr>
        <th>Jumlah Tim Terdaftar</th>
        <th>Kapasitas Bagan Terdekat</th>
        <th>Jumlah Slot BYE (Lolos Otomatis)</th>
        <th>Ronde Awal Pertandingan</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>2 Tim</strong></td>
        <td>2 Slot</td>
        <td>0 BYE</td>
        <td>Langsung Babak Final</td>
      </tr>
      <tr>
        <td><strong>3 - 4 Tim</strong></td>
        <td>4 Slot</td>
        <td>0 s/d 1 BYE</td>
        <td>Semifinal ➔ Final</td>
      </tr>
      <tr>
        <td><strong>5 - 8 Tim</strong></td>
        <td>8 Slot</td>
        <td>0 s/d 3 BYE</td>
        <td>Perempat Final ➔ Semifinal ➔ Final</td>
      </tr>
      <tr>
        <td><strong>9 - 16 Tim</strong></td>
        <td>16 Slot</td>
        <td>0 s/d 7 BYE</td>
        <td>Babak 16 Besar ➔ 8 Besar ➔ Semifinal ➔ Final</td>
      </tr>
      <tr>
        <td><strong>17 - 32 Tim</strong></td>
        <td>32 Slot</td>
        <td>0 s/d 15 BYE</td>
        <td>Babak 32 Besar ➔ 16 Besar ➔ 8 Besar ➔ Semifinal ➔ Final</td>
      </tr>
    </tbody>
  </table>

  <div class="callout callout-success">
    <div class="callout-icon">⭐</div>
    <div class="callout-body">
      <div class="callout-title">Keunggulan Distribusi Slot BYE HadangMU</div>
      Sistem HadangMU menempatkan slot BYE secara matematis di <strong>sudut-sudut terluar bagan</strong> (Tier 1: Atas Kiri, Bawah Kanan, Bawah Kiri, Atas Kanan) agar tim yang memperoleh bye tersebar merata dan tidak terjadi tumpukan bye pada salah satu bagan pool. Tim yang mendapatkan lawan BYE otomatis berstatus <span class="badge badge-success">FINISHED</span> dan melaju ke ronde berikutnya!
    </div>
  </div>

  <!-- ==================== HALAMAN 6: BAB 3 (BAGIAN 2) ==================== -->
  <div class="page-break"></div>
  <h1 class="chapter-title"><span class="ch-num">BAB 3</span> Panduan Lengkap Role Admin (Bagian 2: Bagan & Match)</h1>

  <h3 class="subsection-title">C. Dua Opsi Pembuatan Bagan (Roll Random vs Manual)</h3>
  <div class="grid-2">
    <div class="card-panel">
      <div class="card-panel-title">🎲 1. Acak Otomatis (Roll Random)</div>
      <p style="font-size: 8.5pt;">
        Cocok untuk turnamen yang mengundi pool secara acak terbuka di hadapan perwakilan ofisial tim (Technical Meeting).
      </p>
      <ol style="font-size: 8.5pt; padding-left: 16px;">
        <li>Tentukan jumlah tim yang akan diikutsertakan.</li>
        <li>Aktifkan/Nonaktifkan opsi <em>"Sertakan Perebutan Juara 3"</em>.</li>
        <li>Pilih mode layout: <code>CENTER_SPLIT</code> (Rekomendasi TV) atau <code>LEFT_TO_RIGHT</code>.</li>
        <li>Klik tombol <span class="ui-btn ui-btn-amber">🎲 Undi / Acak Bagan Otomatis</span>. Sistem akan mengacak seluruh tim dengan algoritma Fisher-Yates shuffle dan memplot ke slot tanding.</li>
      </ol>
    </div>

    <div class="card-panel">
      <div class="card-panel-title">✏️ 2. Pembuatan Manual (Manual Slot)</div>
      <p style="font-size: 8.5pt;">
        Cocok apabila panitia telah memiliki skema unggulan (seeded teams) atau hasil undian manual menggunakan kertas bola lotere.
      </p>
      <ol style="font-size: 8.5pt; padding-left: 16px;">
        <li>Klik tombol <span class="ui-btn">Bagan Manual Kosong</span>.</li>
        <li>Bagan akan tercipta dengan slot <em>[Pilih Tim]</em>.</li>
        <li>Klik pada masing-masing slot tim, lalu pilih nama tim dari daftar dropdown yang tersedia.</li>
        <li>Lakukan pengisian hingga seluruh slot babak penyisihan pertama terisi sempurna.</li>
      </ol>
    </div>
  </div>

  <h3 class="subsection-title">D. Penguncian Bagan (Lock / Unlock Bracket)</h3>
  <p>
    Setelah susunan pertandingan pada bagan disepakati seluruh tim:
  </p>
  <ul>
    <li>Klik tombol <span class="ui-btn ui-btn-blue">🔒 Kunci Bagan Turnamen</span>.</li>
    <li>Ketika bagan terkunci, slot tim tidak dapat diubah-ubah secara tidak sengaja oleh panitia.</li>
    <li>Apabila ada perubahan mendesak (misal: diskualifikasi tim sebelum turnamen jalan), Admin dapat membuka kunci dengan menekan tombol <span class="ui-btn">🔓 Buka Kunci (Mode Edit)</span>.</li>
  </ul>

  <h3 class="subsection-title">E. Menghasilkan Pertandingan Nyata dari Bagan (Generate Match)</h3>
  <p>
    Setiap kotak pertandingan pada bagan yang telah memiliki dua tim siap tanding akan memiliki status <span class="badge badge-primary">READY</span>.
  </p>
  <ol class="step-list">
    <li class="step-item">
      <div class="step-bubble">1</div>
      <div class="step-content">
        <div class="step-title">Klik Tombol "Mulai Tanding" pada Kotak Bagan</div>
        Admin cukup mengklik tombol tanding pada match yang ingin diselenggarakan.
      </div>
    </li>
    <li class="step-item">
      <div class="step-bubble">2</div>
      <div class="step-content">
        <div class="step-title">Modal Penugasan Scoring 1 & Scoring 2</div>
        Akan muncul dialog pop-up konfirmasi. Admin wajib memilih petugas <strong>Scoring 1 (Area Depan)</strong> dan <strong>Scoring 2 (Area Belakang)</strong>. Sistem memvalidasi agar Scoring 1 dan Scoring 2 <em>tidak boleh akun yang sama</em>.
      </div>
    </li>
    <li class="step-item">
      <div class="step-bubble">3</div>
      <div class="step-content">
        <div class="step-title">Proteksi Idempotensi (Mencegah Pertandingan Ganda)</div>
        Sistem dilengkapi <em>concurrency lock</em>. Jika tombol diklik berulang kali secara cepat, sistem memastikan hanya tepat 1 pertandingan Supabase yang dibuat tanpa risiko data kembar.
      </div>
    </li>
    <li class="step-item">
      <div class="step-bubble">4</div>
      <div class="step-content">
        <div class="step-title">Lompat Langsung ke Ruang Kontrol</div>
        Setelah match dibuat, sistem langsung membuka tautan Ruang Kontrol Admin (<code>/admin/matches/[id]</code>) untuk match tersebut.
      </div>
    </li>
  </ol>

  <h2 class="section-title">3.4 Pembuatan Pertandingan Mandiri Non-Bagan (/admin/matches/create)</h2>
  <p>
    Jika panitia ingin membuat laga eksibisi, persahabatan, atau laga luar turnamen bagan:
  </p>
  <ul>
    <li>Buka menu <code>/admin/matches/create</code>.</li>
    <li>Isi Nama Pertandingan (atau biarkan kosong untuk penomoran otomatis).</li>
    <li>Pilih Tim 1 dan Tim 2 (Sistem akan memvalidasi agar kedua tim berada dalam satu kategori gender yang sama).</li>
    <li>Pilih <strong>Penyerang Awal (First Attacker)</strong>: Tim 1 atau Tim 2 (berdasarkan hasil lempar koin wasit).</li>
    <li>Tugaskan petugas Scoring 1 dan Scoring 2.</li>
    <li>Tentukan Tanggal & Jam Jadwal Pertandingan.</li>
    <li>Klik <span class="ui-btn ui-btn-blue">Buat Pertandingan</span>.</li>
  </ul>

  <!-- ==================== HALAMAN 7: BAB 3 (BAGIAN 3) ==================== -->
  <div class="page-break"></div>
  <h1 class="chapter-title"><span class="ch-num">BAB 3</span> Panduan Lengkap Role Admin (Bagian 3: Ruang Kontrol)</h1>

  <h2 class="section-title">3.5 Operasional Ruang Kontrol Pertandingan (Control Room)</h2>
  <p>
    Halaman <strong>Ruang Kontrol Admin (<code>/admin/matches/[id]</code>)</strong> adalah pusat syaraf utama jalannya pertandingan Hadang. Di layar ini Admin memiliki wewenang penuh atas jalannya pertandingan:
  </p>

  <div class="card-panel" style="border-left: 4px solid #2563eb;">
    <div class="card-panel-title">Fitur-Fitur Utama di Ruang Kontrol:</div>
    <ul style="margin: 0; padding-left: 18px; font-size: 8.5pt;">
      <li><strong>Banner Status Pertandingan:</strong> Menampilkan badge status (READY, LIVE, PAUSED, FINISHED) dan Babak aktif (Babak 1 atau Babak 2).</li>
      <li><strong>Arena Skor Live:</strong> Menampilkan skor realtime Tim Kiri dan Tim Kanan yang diperbarui secara instan lewat Supabase Realtime WebSocket.</li>
      <li><strong>Stopwatch Waktu Bersih:</strong> Menghitung durasi laga otomatis saat status LIVE, dan otomatis berhenti (freeze) saat status PAUSED.</li>
      <li><strong>Indikator Peran Tim:</strong> Menampilkan tim mana yang sedang bertindak sebagai PENYERANG (Hijau) dan BERTAHAN (Abu-abu).</li>
      <li><strong>Pemberitahuan Poin Per Juri:</strong> Memantau akumulasi poin yang dicetak oleh Juri 1 (Depan) dan Juri 2 (Belakang).</li>
    </ul>
  </div>

  <h2 class="section-title">3.6 Alur Transisi Status Pertandingan (Status Flow)</h2>
  <p>
    Admin wajib menjalankan tahapan pertandingan sesuai urutan standar berikut:
  </p>

  <div class="flow-container">
    <div class="flow-box">
      <strong>1. READY</strong>
      Tim & Juri Masuk Lapangan
    </div>
    <div class="flow-arrow">➔</div>
    <div class="flow-box" style="border-color: #16a34a; background: #f0fdf4;">
      <strong style="color: #16a34a;">2. LIVE (Babak 1)</strong>
      Waktu Berjalan, Skor Dibuka
    </div>
    <div class="flow-arrow">➔</div>
    <div class="flow-box" style="border-color: #d97706; background: #fffbeb;">
      <strong style="color: #d97706;">3. PAUSED (Jeda)</strong>
      Istirahat / Tukar Babak
    </div>
    <div class="flow-arrow">➔</div>
    <div class="flow-box" style="border-color: #16a34a; background: #f0fdf4;">
      <strong style="color: #16a34a;">4. LIVE (Babak 2)</strong>
      Babak Kedua Tanding
    </div>
    <div class="flow-arrow">➔</div>
    <div class="flow-box" style="border-color: #dc2626; background: #fef2f2;">
      <strong style="color: #dc2626;">5. FINISHED</strong>
      Skor Final & Juara Sah
    </div>
  </div>

  <h3 class="subsection-title">Aturan Khusus: Eksklusivitas Pertandingan Berjalan (Single Live Match Lock)</h3>
  <div class="callout callout-danger">
    <div class="callout-icon">⛔</div>
    <div class="callout-body">
      <div class="callout-title">Proteksi Tabrakan Pertandingan</div>
      Sistem HadangMU menerapkan aturan ketat: <strong>Hanya ada maksimal 1 (satu) pertandingan yang boleh berstatus LIVE atau PAUSED di seluruh sistem dalam satu waktu.</strong> Apabila ada match lain yang belum diselesaikan (FINISHED), Admin tidak dapat memulai pertandingan baru dan sistem akan menampilkan pesan peringatan: <em>"Pertandingan [Nama Match] sedang berlangsung. Selesaikan pertandingan tersebut terlebih dahulu."</em>
    </div>
  </div>

  <h2 class="section-title">3.7 Tata Cara Pergantian Babak (Babak 1 ke Babak 2)</h2>
  <ol class="step-list">
    <li class="step-item">
      <div class="step-bubble">1</div>
      <div class="step-content">
        <div class="step-title">Mengakhiri Babak 1 (Tekan Tombol "Tukar Babak")</div>
        Saat waktu Babak 1 (15 menit) selesai dan wasit meniup peluit, Admin menekan tombol <span class="ui-btn ui-btn-amber">🔄 Tukar Babak</span>. Muncul dialog konfirmasi SweetAlert2.
      </div>
    </li>
    <li class="step-item">
      <div class="step-bubble">2</div>
      <div class="step-content">
        <div class="step-title">Penyimpanan Snapshot Rangkuman Babak 1</div>
        Sistem secara otomatis mengunci dan menyimpan skor kedua tim di Babak 1 beserta durasinya (Format: <code>::B1[scoreLeft,scoreRight,duration,endedAt]</code>) ke dalam database, lalu mengubah status pertandingan menjadi <span class="badge badge-warning">PAUSED</span>.
      </div>
    </li>
    <li class="step-item">
      <div class="step-bubble">3</div>
      <div class="step-content">
        <div class="step-title">Masa Istirahat Antar Babak (5 Menit)</div>
        Selama status PAUSED, tombol skor pada HP juri otomatis terkunci. Atlet dan ofisial dapat memanfaatkan waktu jeda 5 menit untuk minum dan evaluasi taktik.
      </div>
    </li>
    <li class="step-item">
      <div class="step-bubble">4</div>
      <div class="step-content">
        <div class="step-title">Memulai Babak 2 (Tekan Tombol "Mulai Babak 2")</div>
        Setelah kedua tim siap di lapangan pada posisi yang telah bertukar lapangan fisik, Admin menekan tombol hijau <span class="ui-btn ui-btn-green">▶ Mulai Babak 2</span>. Sistem mereset stopwatch babak 2 ke <code>00:00</code>, mengaktifkan kembali meja scoring juri, dan menyiarkan status <code>BABAK 2 (LIVE)</code> ke seluruh layar monitor TV.
      </div>
    </li>
  </ol>

  <!-- ==================== HALAMAN 8: BAB 3 (BAGIAN 4) ==================== -->
  <div class="page-break"></div>
  <h1 class="chapter-title"><span class="ch-num">BAB 3</span> Panduan Lengkap Role Admin (Bagian 4: Audit & Rekap)</h1>

  <h2 class="section-title">3.8 Pengawasan, Injeksi Poin Darurat, & Anulir Skor</h2>

  <h3 class="subsection-title">A. Injeksi Poin Darurat (Emergency Override)</h3>
  <p>
    Pada kondisi khusus di mana smartphone juri kehabisan daya baterai atau mengalami gangguan layar sentuh sementara, Admin dapat mengambil alih pencatatan skor manual melalui panel <strong>"Injeksi Poin Manual"</strong>:
  </p>
  <ul>
    <li>Tombol <span class="ui-btn ui-btn-green">+1 Poin Tim Kiri</span>: Menambahkan 1 poin untuk tim di sisi kiri.</li>
    <li>Tombol <span class="ui-btn ui-btn-blue">+1 Poin Tim Kanan</span>: Menambahkan 1 poin untuk tim di sisi kanan.</li>
    <li>Poin yang diinjeksi admin akan tercatat di database dengan label <code>MANUAL_ATTACK_POINT</code> / <code>MANUAL_DEFENSE_POINT</code> dan langsung tampil di TV.</li>
  </ul>

  <h3 class="subsection-title">B. Log Audit Riwayat Skor & Pembatalan (Anulir Skor)</h3>
  <p>
    Seluruh peristiwa penambahan poin dari awal hingga akhir pertandingan tersimpan dalam <strong>Audit Log Kronologis</strong>:
  </p>
  <table class="data-table">
    <thead>
      <tr>
        <th>Waktu (Timestamp)</th>
        <th>Tim Penerima</th>
        <th>Petugas Pencatat</th>
        <th>Jenis Kejadian</th>
        <th>Status</th>
        <th>Aksi Admin</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>14:22:10 WIB</td>
        <td><strong>Tim Rajawali</strong></td>
        <td>Budi Santoso (Scoring 1)</td>
        <td>ATTACK_POINT (+1)</td>
        <td><span class="badge badge-success">ACTIVE</span></td>
        <td><span class="ui-btn ui-btn-red">Anulir Skor</span></td>
      </tr>
      <tr>
        <td>14:23:45 WIB</td>
        <td><strong>Tim Garuda</strong></td>
        <td>Ahmad Rifai (Scoring 2)</td>
        <td>ATTACK_POINT (+1)</td>
        <td><span class="badge badge-danger">CANCELLED</span></td>
        <td><em>Dibatalkan (Salah Pencet)</em></td>
      </tr>
    </tbody>
  </table>

  <div class="callout callout-warning">
    <div class="callout-icon">🛡️</div>
    <div class="callout-body">
      <div class="callout-title">Prosedur Resmi Anulir Skor oleh Admin</div>
      Jika wasit utama memutuskan bahwa poin tidak sah (misal: pemain menginjak garis samping sebelum lolos), Admin mencari baris poin tersebut di Audit Log, lalu mengklik tombol <span class="ui-btn ui-btn-red">Anulir Skor</span>. Sistem akan meminta konfirmasi dan input alasan pembatalan. Skor akan langsung berkurang seketika di TV dan meja scoring!
    </div>
  </div>

  <h2 class="section-title">3.9 Tabel Rekapitulasi Rinci Per Babak & Penentuan Pemenang</h2>
  <p>
    Di bagian bawah Ruang Kontrol, sistem menyajikan <strong>Tabel Rekapitulasi Skor Rinci</strong> yang membedah perolehan nilai setiap tim secara transparan:
  </p>

  <table class="data-table" style="text-align: center;">
    <thead>
      <tr style="background: #0f172a; color: white;">
        <th rowspan="2" style="text-align: left; vertical-align: middle;">Nama Tim Peserta</th>
        <th colspan="3" style="background: #1e3a8a;">BABAK 1</th>
        <th colspan="3" style="background: #15803d;">BABAK 2</th>
        <th rowspan="2" style="vertical-align: middle; background: #b45309;">TOTAL AKHIR</th>
      </tr>
      <tr style="background: #f1f5f9; color: #0f172a;">
        <th>Depan (J1)</th>
        <th>Belakang (J2)</th>
        <th>Subtotal B1</th>
        <th>Depan (J1)</th>
        <th>Belakang (J2)</th>
        <th>Subtotal B2</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="text-align: left;"><strong>Tim A (Rajawali)</strong></td>
        <td><strong>4</strong></td>
        <td>3</td>
        <td>7</td>
        <td><strong>5</strong></td>
        <td>4</td>
        <td>9</td>
        <td style="font-size: 11pt; font-weight: 900; color: #1e40af;">16</td>
      </tr>
      <tr>
        <td style="text-align: left;"><strong>Tim B (Garuda)</strong></td>
        <td><strong>2</strong></td>
        <td>4</td>
        <td>6</td>
        <td><strong>3</strong></td>
        <td>5</td>
        <td>8</td>
        <td style="font-size: 11pt; font-weight: 900; color: #1e40af;">14</td>
      </tr>
    </tbody>
  </table>

  <h3 class="subsection-title">Logika Penentuan Pemenang Skor Seri (Tie-Break Engine)</h3>
  <p>
    Apabila total skor kedua tim sama kuat (misal: 15 - 15), sistem HadangMU secara otomatis menerapkan regulasi resmi turnamen Hadang nasional:
  </p>
  <div class="card-panel" style="background: #fffbeb; border-color: #fde68a;">
    <strong>Rumus Tie-Break Otomatis:</strong>
    <ol style="margin-bottom: 0; padding-left: 20px;">
      <li><strong>Prioritas 1:</strong> Tim dengan perolehan akumulasi <strong>Skor Garis Depan (Scoring 1) tertinggi</strong> dinyatakan sebagai PEMENANG.</li>
      <li><strong>Prioritas 2:</strong> Jika total skor depan kedua tim masih sama persis, pemenang ditentukan dari tim yang bertindak sebagai <strong>Penyerang Awal di Babak Pertama</strong>.</li>
    </ol>
  </div>

  <h2 class="section-title">3.10 Menyelesaikan Pertandingan & Pembaruan Bagan</h2>
  <p>
    Setelah pertandingan berakhir:
  </p>
  <ol>
    <li>Admin menekan tombol merah <span class="ui-btn ui-btn-red">🏁 Selesaikan Pertandingan</span>.</li>
    <li>Muncul konfirmasi nama tim pemenang, skor akhir, dan catatan tie-break jika ada.</li>
    <li>Status pertandingan berubah menjadi <span class="badge badge-danger">FINISHED</span>.</li>
    <li><strong>Auto-Advance Bagan:</strong> Jika pertandingan ini merupakan bagian dari bagan kejuaraan (bracket), tim pemenang secara otomatis dipromosikan ke slot pertandingan di babak berikutnya, dan jika ini adalah laga Final, tim juara langsung dinobatkan sebagai <em>CHAMPION</em>!</li>
  </ol>

  <!-- ==================== HALAMAN 9: BAB 4 (BAGIAN 1) ==================== -->
  <div class="page-break"></div>
  <h1 class="chapter-title"><span class="ch-num">BAB 4</span> Panduan Lengkap Role Jury (Bagian 1: Konsep & Dashboard)</h1>

  <h2 class="section-title">4.1 Definisi & Pembagian Wilayah Tugas Scoring</h2>
  <p>
    Pada kejuaraan Hadang resmi, terdapat 2 (dua) orang juri meja penilaian digital yang mendampingi Wasit I dan Wasit II di tepi arena pertandingan:
  </p>

  <div class="grid-2">
    <div class="card-panel" style="border-top: 4px solid #2563eb;">
      <div class="card-panel-title">Scoring 1 — Area Depan (Petak 1 & Garis Depan)</div>
      <p style="font-size: 8.5pt;">
        <strong>Posisi Fisik:</strong> Berada di meja dekat garis awal penyerangan (Base / Garis Depan).
      </p>
      <ul style="font-size: 8pt; padding-left: 16px;">
        <li>Bertanggung jawab memvalidasi dan menginput poin ketika pemain penyerang berhasil menuntaskan lintasan dari garis belakang kembali tembus ke garis depan.</li>
        <li>Menjadi faktor penentu krusial pada saat terjadi kondisi nilai seri (tie-break).</li>
        <li>Nama akun juri wajib dipilih pada dropdown <strong>Scoring 1</strong> saat pembuatan match.</li>
      </ul>
    </div>

    <div class="card-panel" style="border-top: 4px solid #16a34a;">
      <div class="card-panel-title">Scoring 2 — Area Belakang (Petak Akhir & Garis Belakang)</div>
      <p style="font-size: 8.5pt;">
        <strong>Posisi Fisik:</strong> Berada di meja dekat garis batas belakang arena (Garis Belakang).
      </p>
      <ul style="font-size: 8pt; padding-left: 16px;">
        <li>Bertanggung jawab memvalidasi dan menginput poin ketika pemain penyerang berhasil menembus seluruh petak dari garis depan sampai lolos ke garis belakang.</li>
        <li>Mengamati kaki penyerang yang menginjak garis batas belakang tanpa tersentuh penjaga.</li>
        <li>Nama akun juri wajib dipilih pada dropdown <strong>Scoring 2</strong> saat pembuatan match.</li>
      </ul>
    </div>
  </div>

  <h2 class="section-title">4.2 Masuk ke Dashboard Meja Scoring (/jury)</h2>
  <ol class="step-list">
    <li class="step-item">
      <div class="step-bubble">1</div>
      <div class="step-content">
        <div class="step-title">Login Melalui Smartphone</div>
        Buka browser di smartphone (Google Chrome atau Safari), ketikkan alamat <code>http://[domain-aplikasi]/login</code>. Masukkan email dan kata sandi akun Juri Anda.
      </div>
    </li>
    <li class="step-item">
      <div class="step-bubble">2</div>
      <div class="step-content">
        <div class="step-title">Tampilan Daftar Penugasan (/jury)</div>
        Sistem secara otomatis menampilkan seluruh pertandingan yang menugaskan akun Anda, terurut dari yang sedang aktif:
        <ul>
          <li>Pertandingan berstatus <span class="badge badge-success">LIVE</span> atau <span class="badge badge-warning">PAUSED</span> berada di urutan paling atas.</li>
          <li>Pertandingan <span class="badge badge-primary">READY</span> (siap tanding berikutnya).</li>
          <li>Pertandingan yang telah <span class="badge badge-danger">FINISHED</span> di bagian bawah.</li>
        </ul>
      </div>
    </li>
    <li class="step-item">
      <div class="step-bubble">3</div>
      <div class="step-content">
        <div class="step-title">Memilih Pertandingan</div>
        Periksa label penugasan Anda pada kartu pertandingan: <em>"Scoring 1 (Area Depan)"</em> atau <em>"Scoring 2 (Area Belakang)"</em>. Klik tombol hijau <span class="ui-btn ui-btn-green">Masuk Meja Scoring →</span> untuk membuka kontroler skor.
      </div>
    </li>
  </ol>

  <!-- ==================== HALAMAN 10: BAB 4 (BAGIAN 2) ==================== -->
  <div class="page-break"></div>
  <h1 class="chapter-title"><span class="ch-num">BAB 4</span> Panduan Lengkap Role Jury (Bagian 2: Kontroler HP)</h1>

  <h2 class="section-title">4.3 Anatomi Layar Meja Scoring Mobile</h2>
  <p>
    Tampilan <strong>Meja Scoring Mobile (<code>/jury/matches/[id]</code>)</strong> dirancang khusus dengan ergonomi tinggi agar juri tidak perlu mengalihkan pandangan lama dari lapangan pertandingan:
  </p>

  <div class="mock-screen">
    <div class="mock-screen-header">
      <span>[← Meja Skor] Match 1 Putra</span>
      <span>⏱ 07:42 | ● LIVE</span>
    </div>
    <div style="text-align: center; margin: 10px 0;">
      <div style="font-size: 8pt; color: #94a3b8;">★ POIN JURI 1 (ANDA): <strong>6</strong> | POIN JURI 2: <strong>5</strong></div>
    </div>
    <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 10px; align-items: center; background: #1e293b; padding: 8px; border-radius: 6px; text-align: center;">
      <div>
        <span style="color: #22c55e; font-weight: bold; font-size: 7.5pt;">⚡ PENYERANG</span>
        <div style="font-size: 9pt; font-weight: bold;">RAJAWALI</div>
        <div style="font-size: 16pt; font-weight: 900; color: #22c55e;">7</div>
      </div>
      <div style="font-weight: bold; color: #64748b;">VS</div>
      <div>
        <span style="color: #94a3b8; font-size: 7.5pt;">BERTAHAN</span>
        <div style="font-size: 9pt; font-weight: bold;">GARUDA</div>
        <div style="font-size: 16pt; font-weight: 900; color: white;">4</div>
      </div>
    </div>
    <div style="margin: 15px 0; text-align: center;">
      <div style="background: #16a34a; color: white; padding: 22px; border-radius: 12px; font-weight: 900; font-size: 14pt; box-shadow: 0 4px 15px rgba(22,163,74,0.4);">
        +1 POIN HADANG<br>
        <span style="font-size: 8pt; font-weight: normal; opacity: 0.9;">Untuk Tim Penyerang (Rajawali)</span>
      </div>
    </div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
      <div style="background: #334155; padding: 8px; border-radius: 6px; text-align: center; font-size: 7.5pt;">
        🔄 Alih Penyerang (Foul)
      </div>
      <div style="background: #7f1d1d; color: #fca5a5; padding: 8px; border-radius: 6px; text-align: center; font-size: 7.5pt;">
        ↩ Batalkan Poin (Undo)
      </div>
    </div>
  </div>

  <h2 class="section-title">4.4 Panduan Langkah Demi Langkah Mengoperasikan Meja Skor</h2>

  <h3 class="subsection-title">1. Memasukkan Skor (+1 Poin Hadang)</h3>
  <ul>
    <li>Ketika pemain penyerang berhasil melewati lintasan di area Anda (misal lolos dari belakang ke depan untuk Juri 1), Wasit akan memberikan isyarat poin sah.</li>
    <li>Tekan <strong>Tombol Hijau Raksasa "+1 POIN HADANG"</strong>.</li>
    <li><strong>Haptic Feedback (Getar HP):</strong> Smartphone akan bergetar singkat (50ms) sebagai konfirmasi fisik bahwa sentuhan Anda berhasil terdaftar tanpa Anda perlu menatap layar.</li>
    <li><strong>Zero-Latency Optimistic Update:</strong> Angka skor di layar HP Anda langsung naik dalam 0 milidetik dan pesan konfirmasi hijau muncul: <em>"+1 Poin untuk [Nama Tim Penyerang]!"</em>.</li>
  </ul>

  <h3 class="subsection-title">2. Membatalkan Poin Terakhir (Tombol Undo)</h3>
  <ul>
    <li>Jika Anda tidak sengaja menekan tombol (terpencet) atau wasit menganulir poin yang baru saja terjadi:</li>
    <li>Tekan tombol merah <span class="ui-btn ui-btn-red">↩ Batalkan Poin Terakhir (Undo)</span>.</li>
    <li>Akan muncul dialog pilihan alasan pembatalan (misal: <em>"Kesalahan Teknis / Terpencet"</em>, <em>"Dianulir Wasit"</em>, dll).</li>
    <li>Pilih alasan lalu klik konfirmasi. Skor Anda akan langsung ditarik mundur 1 poin.</li>
  </ul>

  <div class="callout callout-danger">
    <div class="callout-icon">🔒</div>
    <div class="callout-body">
      <div class="callout-title">Aturan Otoritas Undo Juri</div>
      Tombol Undo pada HP Juri hanya dapat membatalkan poin yang <strong>dimasukkan oleh akun juri tersebut</strong>. Juri 1 tidak dapat menghapus poin milik Juri 2, dan sebaliknya. Hal ini mencegah kekacauan data antar kedua meja juri.
    </div>
  </div>

  <!-- ==================== HALAMAN 11: BAB 4 (BAGIAN 3) ==================== -->
  <div class="page-break"></div>
  <h1 class="chapter-title"><span class="ch-num">BAB 4</span> Panduan Lengkap Role Jury (Bagian 3: Alih Peran & Kunci)</h1>

  <h3 class="subsection-title">3. Mengalihkan Giliran Penyerang (Turnover / Foul)</h3>
  <p>
    Dalam olahraga Hadang, regu penyerang bertukar menjadi regu penjaga jika terjadi salah satu kondisi berikut:
  </p>
  <ul>
    <li>Pemain penyerang tersentuh oleh tangan/badan pemain bertahan yang sah (berada di garis lintasan).</li>
    <li>Kaki pemain penyerang keluar dari garis samping arena pertandingan.</li>
    <li>Pemain penyerang menarik kembali kakinya ke petak sebelumnya (mundur).</li>
    <li>Regu penyerang terkunci / tidak melakukan pergerakan maju selama 2 menit.</li>
  </ul>
  <div class="card-panel">
    <div class="card-panel-title">Tindakan Juri saat Terjadi Alih Giliran:</div>
    <ol style="margin-bottom: 0;">
      <li>Wasit lapangan meniup peluit dan meneriakkan tanda alih peran (mati/tukar).</li>
      <li>Juri menekan tombol <span class="ui-btn ui-btn-amber">🔄 Alih Penyerang (Foul / Turnover)</span>.</li>
      <li>HP akan bergetar 3 kali (ritme pendek) dan label penyerang <em>[⚡ PENYERANG]</em> langsung berpindah ke tim lawan.</li>
      <li>Tombol raksasa "+1 Poin Hadang" kini otomatis menargetkan tim lawan yang baru menjadi penyerang.</li>
    </ol>
  </div>

  <h3 class="subsection-title">4. Sistem Kunci Otomatis (Disabled Lock Protection)</h3>
  <p>
    Untuk menjamin integritas pertandingan dan mencegah kecurangan atau salah sentuh saat pertandingan tidak aktif, tombol skor pada layar HP juri memiliki proteksi kunci otomatis:
  </p>
  <table class="data-table">
    <thead>
      <tr>
        <th>Status Pertandingan</th>
        <th>Kondisi Tombol Skor (+1)</th>
        <th>Keterangan / Pesan di Layar</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><span class="badge badge-primary">READY</span></td>
        <td>🔒 <strong>Terkunci (Disabled)</strong></td>
        <td><em>Pertandingan belum dimulai oleh Admin. Tunggu peluit wasit.</em></td>
      </tr>
      <tr>
        <td><span class="badge badge-success">LIVE</span></td>
        <td>🟢 <strong>Aktif Penuh</strong></td>
        <td>Tombol menyala hijau terang, siap menerima input skor.</td>
      </tr>
      <tr>
        <td><span class="badge badge-warning">PAUSED</span></td>
        <td>🔒 <strong>Terkunci (Disabled)</strong></td>
        <td><em>Pertandingan sedang dijeda / Istirahat babak. Tombol dinonaktifkan.</em></td>
      </tr>
      <tr>
        <td><span class="badge badge-danger">FINISHED</span></td>
        <td>🔒 <strong>Terkunci Permanen</strong></td>
        <td><em>Pertandingan telah selesai. Hasil akhir telah dikunci.</em></td>
      </tr>
    </tbody>
  </table>

  <h3 class="subsection-title">5. Pengingat Keluar dari Meja Skor (Anti-Accidental Exit)</h3>
  <p>
    Jika seorang juri tanpa sengaja menekan tombol kembali (Back) atau tautan navigasi saat pertandingan masih berstatus <code>LIVE</code>, sistem akan memunculkan dialog peringatan browser:
  </p>
  <div class="callout callout-warning">
    <div class="callout-icon">⚠️</div>
    <div class="callout-body">
      <div class="callout-title">Peringatan Navigasi Keluar</div>
      <em>"⚠️ PERINGATAN: Pertandingan masih berlangsung (LIVE)! Apakah Anda yakin ingin keluar dari Meja Scoring? Waktu dan pencatatan skor akan terus berjalan."</em> Juri dapat memilih Batal (Cancel) untuk tetap berada di meja skor.
    </div>
  </div>

  <!-- ==================== HALAMAN 12: BAB 5 ==================== -->
  <div class="page-break"></div>
  <h1 class="chapter-title"><span class="ch-num">BAB 5</span> Panduan Operator TV & Proyektor (Live Scoreboard)</h1>

  <h2 class="section-title">5.1 Pengaturan Perangkat Display Arena</h2>
  <p>
    Layar papan skor TV (<code>/tv/[id]</code>) didesain khusus untuk ditampilkan pada layar monitor TV besar (55-85 inch) atau proyektor panggung yang menghadap ke arah penonton dan bangku cadangan tim:
  </p>
  <ol class="step-list">
    <li class="step-item">
      <div class="step-bubble">1</div>
      <div class="step-content">
        <div class="step-title">Hubungkan Laptop Operator ke Display Arena</div>
        Hubungkan laptop ke TV atau proyektor menggunakan kabel HDMI atau jaringan nirkabel. Buka browser Google Chrome dan atur display ke mode <em>Extended Desktop</em> atau <em>Duplicate</em>.
      </div>
    </li>
    <li class="step-item">
      <div class="step-bubble">2</div>
      <div class="step-content">
        <div class="step-title">Buka URL Papan Skor TV</div>
        Arahkan peramban ke tautan pertandingan: <code>http://[domain-aplikasi]/tv/[id-pertandingan]</code>. Tautan ini juga dapat diakses dengan mengklik tombol TV dari Dashboard Admin atau Portal Publik.
      </div>
    </li>
    <li class="step-item">
      <div class="step-bubble">3</div>
      <div class="step-content">
        <div class="step-title">Aktifkan Mode Layar Penuh (Fullscreen)</div>
        Klik tombol <span class="ui-btn">⤢ Layar Penuh</span> di pojok kanan atas atau tekan tombol keyboard <code>F11</code>. Layar akan menyatu memenuhi seluruh monitor tanpa bilah navigasi browser.
      </div>
    </li>
  </ol>

  <h2 class="section-title">5.2 Fitur Auto-Hide Cursor & Kontrol Bersih</h2>
  <p>
    Saat layar dalam mode Fullscreen, apabila mouse tidak digerakkan selama <strong>3,5 detik</strong>, seluruh tombol kontrol, pemilih tema, dan kursor mouse akan <strong>menghilang secara otomatis (fade out)</strong>. Hal ini menghasilkan tampilan display arena yang sangat bersih, profesional, dan siap dijadikan sumber tangkapan video (video capture source) untuk siaran langsung (OBS / vMix live streaming).
  </p>

  <h2 class="section-title">5.3 Membaca Indikator Arena Pada Layar TV</h2>
  <div class="grid-2">
    <div class="card-panel">
      <div class="card-panel-title">⏱️ 1. Arena Timer Tengah Atas</div>
      Terletak di tengah atas layar, menampilkan waktu bersih pertandingan yang berjalan sinkron dengan stopwatch wasit dan admin. Angka berwarna hijau menyala saat LIVE dan kuning saat PAUSED.
    </div>
    <div class="card-panel">
      <div class="card-panel-title">⚡ 2. Kartu Skor & Efek Visual Glow</div>
      Angka skor berukuran raksasa (<code>tv-score</code>). Saat juri memasukkan poin, kartu tim yang mencetak skor akan membesar sejenak (scale up) dan memancarkan efek cahaya hijau neon (glow animation) selama 1,5 detik!
    </div>
    <div class="card-panel">
      <div class="card-panel-title">🛡️ 3. Badge Peran Penyerang / Bertahan</div>
      Badge hijau <span class="badge badge-success">PENYERANG</span> menyala di atas nama tim yang memegang hak serang. Tim lawan menampilkan badge abu-abu <span class="badge">BERTAHAN</span>.
    </div>
    <div class="card-panel">
      <div class="card-panel-title">📡 4. Ticker Bawah & Status Realtime</div>
      Bilah bawah menampilkan nama petugas Scoring 1 & 2, indikator koneksi hijau <code>● Realtime Live Connected</code>, serta banner notifikasi tim pencetak skor terakhir.
    </div>
  </div>

  <!-- ==================== HALAMAN 13: BAB 6 ==================== -->
  <div class="page-break"></div>
  <h1 class="chapter-title"><span class="ch-num">BAB 6</span> Panduan Portal Publik & Bagan Penonton</h1>

  <h2 class="section-title">6.1 Akses Portal Publik (Beranda Utama /)</h2>
  <p>
    Seluruh penonton, ofisial tim, atlet, dan awak media dapat mengakses portal turnamen secara terbuka tanpa memerlukan akun login melalui URL utama: <code>http://[domain-aplikasi]/</code>.
  </p>

  <h3 class="subsection-title">Bagian-Bagian Portal Publik:</h3>
  <ol>
    <li><strong>Seksi Pertandingan Berjalan (Live Matches):</strong> Menampilkan kotak pertandingan yang sedang LIVE dengan skor yang terbarui secara otomatis. Penonton dapat mengklik tautan <em>"📺 Buka Papan Skor TV"</em> untuk menyaksikan papan skor besar dari smartphone masing-masing.</li>
    <li><strong>Banner Promosi Bagan Turnamen:</strong> Tautan cepat berwarna emas yang mengarahkan pengunjung langsung ke bagan turnamen sistem gugur Putra & Putri.</li>
    <li><strong>Jadwal Pertandingan Siap Tanding (Upcoming):</strong> Daftar laga yang siap bertanding lengkap dengan tanggal dan jam tanding berstandar Waktu Indonesia Barat (WIB).</li>
    <li><strong>Hasil Pertandingan Selesai (Past Results):</strong> Rekapitulasi hasil pertandingan final yang telah selesai beserta skor akhir kedua tim.</li>
    <li><strong>Panduan Regulasi Hadang:</strong> Rangkuman ketentuan skor, penentuan pemenang, dan pergantian regu bagi masyarakat yang baru mengenal olahraga Hadang.</li>
  </ol>

  <h2 class="section-title">6.2 Melihat Bagan Turnamen Sistem Gugur Interaktif (/bracket)</h2>
  <p>
    Halaman <code>/bracket</code> merupakan etalase transparansi kejuaraan. Penonton dapat beralih antara kategori <strong>Putra</strong> dan <strong>Putri</strong>:
  </p>
  <ul>
    <li>Melihat susunan pool pertandingan dari babak penyisihan pertama hingga partai final.</li>
    <li>Melihat skor real-time pertandingan bagan yang sedang berlangsung (ditandai dengan badge berkedip LIVE).</li>
    <li>Melihat podium penobatan juara: <strong>Juara 1 (Champion)</strong>, <strong>Juara 2 (Runner-Up)</strong>, dan <strong>Juara 3 (Bronze Winner)</strong> yang terisi otomatis setelah partai final dan partai perebutan juara 3 tuntas dilaksanakan.</li>
  </ul>

  <div class="callout callout-info">
    <div class="callout-icon">📱</div>
    <div class="callout-body">
      <div class="callout-title">Dukungan Mode Gelap / Terang (Theme Toggle)</div>
      Portal publik dan seluruh modul HadangMU dilengkapi tombol toggle tema siang/malam (Sun/Moon icon) di pojok kanan atas. Penonton dapat menyesuaikan kenyamanan visual sesuai kondisi pencahayaan di tribun lapangan terbuka maupun di dalam gedung (indoor).
    </div>
  </div>

  <!-- ==================== HALAMAN 14: BAB 7 ==================== -->
  <div class="page-break"></div>
  <h1 class="chapter-title"><span class="ch-num">BAB 7</span> Regulasi Resmi Pertandingan & Logika Skor Hadang</h1>

  <h2 class="section-title">7.1 Pedoman Teknis Permainan Hadang</h2>
  <p>
    Sistem HadangMU dirancang mengacu pada <strong>Buku Pedoman Resmi Olahraga Tradisional Hadang</strong> (Kemenpora / KORMI Nasional):
  </p>

  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 25%;">Parameter Pertandingan</th>
        <th style="width: 75%;">Ketentuan Baku</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Ukuran Lapangan</strong></td>
        <td>Panjang 15 meter, Lebar 9 meter, dibagi menjadi 6 petak (masing-masing 4,5 m x 5 m) dengan garis batas 5 cm.</td>
      </tr>
      <tr>
        <td><strong>Komposisi Tim</strong></td>
        <td>Tiap regu terdiri dari 8 orang (5 pemain inti di lapangan dan 3 pemain cadangan).</td>
      </tr>
      <tr>
        <td><strong>Durasi Pertandingan</strong></td>
        <td><strong>2 x 15 menit waktu bersih</strong>. Waktu istirahat antar babak adalah <strong>5 menit</strong>. Masing-masing regu berhak atas <strong>1 kali time-out (1 menit)</strong> per babak.</td>
      </tr>
      <tr>
        <td><strong>Pembagian Peran Juri</strong></td>
        <td>
          <strong>Wasit I & II:</strong> Pemimpin lapangan pengambil keputusan sah/tidaknya sentuhan.<br>
          <strong>Scoring 1:</strong> Bertanggung jawab atas nilai tembus ke Garis Depan.<br>
          <strong>Scoring 2:</strong> Bertanggung jawab atas nilai tembus ke Garis Belakang.
        </td>
      </tr>
    </tbody>
  </table>

  <h2 class="section-title">7.2 Rincian Ketentuan Nilai (Skor)</h2>
  <div class="grid-2">
    <div class="card-panel">
      <div class="card-panel-title">🎯 +1 Nilai (Depan ke Belakang)</div>
      Diberikan apabila pemain penyerang berhasil melewati rintangan seluruh penjaga dari garis start (depan) hingga lolos menginjakkan kedua kaki di garis batas belakang tanpa tersentuh. <em>(Dicatat oleh Scoring 2)</em>.
    </div>
    <div class="card-panel">
      <div class="card-panel-title">🎯 +1 Nilai (Belakang ke Depan)</div>
      Diberikan apabila pemain penyerang berhasil kembali menembus rintangan dari garis belakang hingga lolos keluar dari garis depan arena pertandingan tanpa tersentuh. <em>(Dicatat oleh Scoring 1)</em>.
    </div>
  </div>

  <h2 class="section-title">7.3 Ketentuan Alih Giliran Jaga (Turnover) & Pelanggaran</h2>
  <p>
    Regu penyerang seketika kehilangan hak serang dan bertukar posisi menjadi regu bertahan jika:
  </p>
  <ul>
    <li>Salah seorang pemain penyerang tersentuh oleh tangan/badan pemain bertahan yang sah (berada di atas garis batas petak).</li>
    <li>Pemain penyerang melangkah keluar dari garis batas samping lapangan (baik disengaja maupun terdorong keluar).</li>
    <li>Pemain penyerang menarik mundur kakinya ke petak sebelumnya yang telah dilewati.</li>
    <li>Regu penyerang terdiam atau tidak melakukan pergerakan maju selama 2 (dua) menit penuh (Kunci Waktu 2 Menit).</li>
  </ul>

  <!-- ==================== HALAMAN 15: BAB 8 (BAGIAN 1) ==================== -->
  <div class="page-break"></div>
  <h1 class="chapter-title"><span class="ch-num">BAB 8</span> SOP Pelaksanaan Turnamen & Troubleshooting (Bagian 1)</h1>

  <h2 class="section-title">8.1 Checklist Pra-Pertandingan (Pre-Match Runbook)</h2>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 10%; text-align: center;">No</th>
        <th style="width: 30%;">Item Verifikasi</th>
        <th style="width: 45%;">Prosedur Pelaksanaan</th>
        <th style="width: 15%; text-align: center;">Penanggung Jawab</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="text-align: center;">1</td>
        <td>Koneksi Internet & WiFi</td>
        <td>Pastikan laptop Admin, HP Juri 1 & 2, dan Laptop TV terhubung ke jaringan WiFi lokal berkecepatan stabil minimal 5 Mbps.</td>
        <td style="text-align: center;"><span class="badge badge-primary">Admin / IT</span></td>
      </tr>
      <tr>
        <td style="text-align: center;">2</td>
        <td>Display TV & Proyektor</td>
        <td>Buka URL <code>/tv/[id]</code> di layar arena, tekan tombol Fullscreen (F11), pastikan angka skor dan timer tampil jelas.</td>
        <td style="text-align: center;"><span class="badge badge-warning">Operator TV</span></td>
      </tr>
      <tr>
        <td style="text-align: center;">3</td>
        <td>Login Juri & Baterai HP</td>
        <td>Juri 1 dan Juri 2 login di smartphone masing-masing, pastikan daya baterai minimal 60% dan getaran (vibrate) aktif.</td>
        <td style="text-align: center;"><span class="badge badge-success">Juri 1 & 2</span></td>
      </tr>
      <tr>
        <td style="text-align: center;">4</td>
        <td>Verifikasi Penugasan Juri</td>
        <td>Pastikan Scoring 1 ditugaskan ke Juri Depan dan Scoring 2 ditugaskan ke Juri Belakang.</td>
        <td style="text-align: center;"><span class="badge badge-primary">Admin / TD</span></td>
      </tr>
      <tr>
        <td style="text-align: center;">5</td>
        <td>Hasil Undian Lempar Koin</td>
        <td>Wasit melempar koin untuk menentukan tim penyerang awal. Admin mengatur <em>First Attacker</em> di Ruang Kontrol.</td>
        <td style="text-align: center;"><span class="badge badge-primary">Wasit & Admin</span></td>
      </tr>
    </tbody>
  </table>

  <h2 class="section-title">8.2 Checklist Selama Pertandingan Berlangsung (Live Match SOP)</h2>
  <ol class="step-list">
    <li class="step-item">
      <div class="step-bubble">1</div>
      <div class="step-content">
        <div class="step-title">Mulai Babak 1</div>
        Wasit meniup peluit tanda laga dimulai ➔ Admin mengklik tombol hijau <span class="ui-btn ui-btn-green">▶ Mulai Pertandingan (LIVE)</span>.
      </div>
    </li>
    <li class="step-item">
      <div class="step-bubble">2</div>
      <div class="step-content">
        <div class="step-title">Pencatatan Poin & Alih Giliran</div>
        Juri 1 dan Juri 2 fokus mengamati garis masing-masing. Tekan tombol "+1 POIN HADANG" saat tembus sah. Jika terjadi sentuhan mati, tekan tombol "🔄 Alih Penyerang".
      </div>
    </li>
    <li class="step-item">
      <div class="step-bubble">3</div>
      <div class="step-content">
        <div class="step-title">Jeda Babak (Menit ke-15)</div>
        Wasit meniup peluit akhir babak pertama ➔ Admin mengklik tombol <span class="ui-btn ui-btn-amber">🔄 Tukar Babak</span> ➔ Skor tersimpan, status PAUSED, jeda istirahat 5 menit.
      </div>
    </li>
    <li class="step-item">
      <div class="step-bubble">4</div>
      <div class="step-content">
        <div class="step-title">Mulai Babak 2</div>
        Kedua tim telah bertukar sisi lapangan fisik ➔ Admin mengklik tombol <span class="ui-btn ui-btn-green">▶ Mulai Babak 2</span> ➔ Stopwatch babak 2 berjalan 15 menit.
      </div>
    </li>
    <li class="step-item">
      <div class="step-bubble">5</div>
      <div class="step-content">
        <div class="step-title">Peluit Panjang Selesai</div>
        Wasit meniup peluit panjang akhir laga ➔ Admin mengklik <span class="ui-btn ui-btn-red">🏁 Selesaikan Pertandingan (FINISHED)</span>. Hasil akhir terkunci sah!
      </div>
    </li>
  </ol>

  <!-- ==================== HALAMAN 16: BAB 8 (BAGIAN 2) ==================== -->
  <div class="page-break"></div>
  <h1 class="chapter-title"><span class="ch-num">BAB 8</span> SOP Pelaksanaan Turnamen & Troubleshooting (Bagian 2)</h1>

  <h2 class="section-title">8.3 Panduan Mengatasi Kendala Teknis (Troubleshooting Guide)</h2>

  <div class="card-panel">
    <div class="card-panel-title">1. Layar TV Papan Skor Tidak Memperbarui Skor (Stuck / Lag)</div>
    <p style="font-size: 8.5pt;">
      <strong>Penyebab:</strong> Koneksi WebSocket Supabase di laptop TV sempat terputus akibat gangguan sinyal WiFi sesaat.
    </p>
    <div class="callout callout-info" style="margin: 4px 0 0 0; padding: 6px 10px;">
      <strong>Solusi Cepat:</strong>
      <ol style="margin: 0; padding-left: 18px; font-size: 8pt;">
        <li>Di Ruang Kontrol Admin, klik tombol biru <strong>"🔄 Sinkronkan Skor ke TV"</strong> (fungsi <code>syncTvScoreboard</code>). Tombol ini akan memaksa TV mengambil ulang seluruh data snapshot terbaru dari server.</li>
        <li>Atau di laptop TV, tekan tombol keyboard <code>F5</code> / <code>Ctrl + R</code> untuk memuat ulang halaman. Skor akan langsung kembali sinkron sempurna!</li>
      </ol>
    </div>
  </div>

  <div class="card-panel">
    <div class="card-panel-title">2. Smartphone Juri Terpencet / Salah Masukkan Poin</div>
    <p style="font-size: 8.5pt;">
      <strong>Penyebab:</strong> Juri tidak sengaja menekan tombol saat pemain belum sepenuhnya lolos dari garis.
    </p>
    <div class="callout callout-warning" style="margin: 4px 0 0 0; padding: 6px 10px;">
      <strong>Solusi Cepat:</strong>
      <ol style="margin: 0; padding-left: 18px; font-size: 8pt;">
        <li>Juri yang bersangkutan cukup menekan tombol <strong>"↩ Batalkan Poin Terakhir (Undo)"</strong> di layar HP-nya, pilih alasan <em>"Kesalahan Teknis"</em>, dan konfirmasi.</li>
        <li>Jika juri terlambat menekan Undo, <strong>Admin di Ruang Kontrol</strong> dapat membuka tabel <em>Audit Log</em>, mencari baris poin tersebut, lalu menekan tombol merah <strong>"Anulir Skor"</strong>.</li>
      </ol>
    </div>
  </div>

  <div class="card-panel">
    <div class="card-panel-title">3. Smartphone Juri Mati Mendadak / Low-Battery di Tengah Laga</div>
    <p style="font-size: 8.5pt;">
      <strong>Penyebab:</strong> Baterai smartphone juri habis atau peramban tertutup.
    </p>
    <div class="callout callout-danger" style="margin: 4px 0 0 0; padding: 6px 10px;">
      <strong>Solusi Cepat:</strong>
      <ol style="margin: 0; padding-left: 18px; font-size: 8pt;">
        <li>Pertandingan tidak perlu dihentikan. Juri memberikan tanda verbal/isyarat tangan kepada Admin di meja pengawas.</li>
        <li>Admin langsung menggunakan tombol <strong>"Injeksi Poin Manual (+1 Poin)"</strong> di Ruang Kontrol Admin untuk mencatat skor tim terkait.</li>
        <li>Juri dapat meminjam smartphone cadangan panitia, login kembali, dan otomatis masuk ke meja skor yang sedang berjalan tanpa kehilangan data.</li>
      </ol>
    </div>
  </div>

  <div class="card-panel">
    <div class="card-panel-title">4. Prosedur Reset Total Turnamen (Mereset Seluruh Data Pertandingan)</div>
    <p style="font-size: 8.5pt;">
      Jika kejuaraan telah usai atau panitia ingin memulai turnamen baru dari lembaran bersih (menghapus seluruh score events, matches, teams, dan mereset file bagan turnamen):
    </p>
    <div class="mock-screen" style="margin: 4px 0 0 0; padding: 8px;">
      <span style="color: #94a3b8;"># Jalankan skrip reset database & bagan via terminal panitia:</span><br>
      <span style="color: #60a5fa;">node scripts/clear-all.mjs</span><br>
      <span style="color: #22c55e;">[OK] score_events berhasil dihapus.</span><br>
      <span style="color: #22c55e;">[OK] matches berhasil dihapus.</span><br>
      <span style="color: #22c55e;">[OK] teams berhasil dihapus.</span><br>
      <span style="color: #22c55e;">[OK] brackets.json berhasil direset ke PUTRA: null, PUTRI: null.</span>
    </div>
  </div>

  <div style="margin-top: 25px; padding: 12px; background: #f1f5f9; border-radius: 8px; text-align: center; border: 1px solid #cbd5e1;">
    <strong style="color: #0f172a; font-size: 9.5pt;">HADANG-MU TOURNAMENT SCORING SYSTEM</strong><br>
    <span style="font-size: 8pt; color: #64748b;">
      Sistem Digital Penilaian Olahraga Tradisional Hadang • Memadukan Tradisi Budaya Luhur Nusantara dengan Kecanggihan Teknologi Digital Modern.
    </span>
  </div>

</body>
</html>
`

const htmlPath = path.join(process.cwd(), 'temp_manual_book.html')
const pdfPath = path.join(process.cwd(), 'PANDUAN_PENGGUNAAN_HADANGMU.pdf')

fs.writeFileSync(htmlPath, htmlContent, 'utf-8')
console.log('HTML manual generated at:', htmlPath)

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const cmd = `"${chromePath}" --headless=new --disable-gpu --run-all-compositor-stages-before-draw --print-to-pdf="${pdfPath}" --no-pdf-header-footer "${htmlPath}"`

console.log('Generating PDF via Chrome headless...')
try {
  execSync(cmd, { stdio: 'inherit' })
  console.log('PDF generated successfully at:', pdfPath)
  // Clean up html
  fs.unlinkSync(htmlPath)
  console.log('Temporary HTML file removed.')
} catch (err) {
  console.error('Error generating PDF:', err)
}
