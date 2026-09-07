# HadangMU — Hadang Scoring System

Platform sistem penilaian (scoring) digital terintegrasi dan realtime untuk olahraga tradisional **Hadang**. Dibangun menggunakan **Next.js 16 (App Router)**, **React 19**, **Supabase (Auth, Postgres, Realtime)**, dan **Vanilla CSS**.

---

## 🌟 Fitur Utama

1. **Dashboard & Ruang Kontrol Admin (`/admin`, `/admin/matches/[id]`)**:
   - **Manajemen Pertandingan**: Buat pertandingan, tentukan tim penyerang (Attack) & tim bertahan (Defense), serta penugasan Scoring 1 & Scoring 2.
   - **Kontrol Status Live**: Mulai (`LIVE`), Jeda (`PAUSED`), Lanjutkan, dan Selesai (`FINISHED`).
   - **Tukar Posisi (Swap Sides)**: Pergantian babak otomatis menukar tim penyerang & bertahan seketika.
   - **Injeksi Poin Darurat**: Tombol manual penambahan poin oleh admin.
   - **Audit Log & Anulir Skor**: Riwayat lengkap kejadian skor dengan tombol pembatalan skor (Admin Override).
   - **Kelola Tim (`/admin/teams`)**: Tambah dan hapus tim peserta turnamen.

2. **Meja Scoring Mobile-First (`/jury`, `/jury/matches/[id]`)**:
   - Khusus scoring pertandingan dengan proteksi otentikasi.
   - **Tombol Sentuh Raksasa "+1 POIN HADANG"**: Memasukkan skor untuk Tim Attack dengan haptic feedback getar (`navigator.vibrate`) dan animasi sentuh.
   - **Tombol "BATALKAN POIN TERAKHIR" (Undo)**: Pembatalan poin jika scoring tidak sengaja menekan tombol.
   - **Kunci Otomatis**: Tombol dinonaktifkan otomatis saat pertandingan dijeda (`PAUSED`) atau selesai.
   - **Sinkronisasi Otomatis**: Menyesuaikan tim penyerang secara otomatis saat admin menukar posisi babak.

3. **TV & Projector Live Scoreboard (`/tv/[id]`)**:
   - Tampilan papan skor layar penuh beresolusi tinggi dengan tipografi raksasa (`tv-score`).
   - Pembaruan skor tanpa jeda dan tanpa reload menggunakan Supabase Realtime.
   - Efek visual glow saat tim mencetak poin.
   - Tombol toggle mode Fullscreen untuk proyektor atau siaran langsung (OBS/streaming).

4. **Portal Publik (`/`)**:
   - Pemantauan pertandingan yang sedang berlangsung secara langsung.
   - Rekap hasil pertandingan dan jadwal pertandingan mendatang.
   - Panduan aturan main Hadang.

---

## 🚀 Panduan Instalasi & Menjalankan

### 1. Salin Environment Variables
Salin file `.env.local.example` menjadi `.env.local`:
```bash
cp .env.local.example .env.local
```
Isi konfigurasi dari dashboard Supabase proyek Anda (**Project Settings > API**):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 2. Jalankan Database Migration
Buka **SQL Editor** pada dashboard Supabase Anda, lalu jalankan seluruh skrip SQL yang ada pada file:
👉 [`schema.sql`](file:///c:/Users/ACER/Downloads/Project-HadangMU/schema.sql)

Skrip ini akan membuat tabel `profiles`, `teams`, `matches`, `score_events`, mengaktifkan Row Level Security (RLS), triggers, serta publikasi Supabase Realtime.

### 3. Membuat Akun Admin & Scoring
1. Daftarkan akun baru melalui halaman login atau Supabase Auth Dashboard.
2. Secara bawaan, akun baru akan memiliki role `JURY`.
3. Untuk mengubah akun menjadi `ADMIN`, jalankan perintah SQL berikut di Supabase SQL Editor:
```sql
UPDATE public.profiles 
SET role = 'ADMIN' 
WHERE id = 'UUID_USER_ANDA';
```

### 4. Menjalankan Server Pengembangan
```bash
npm run dev
```
Buka browser pada [http://localhost:3000](http://localhost:3000).

### 5. Build Produksi
```bash
npm run build
npm start
```

---

## 📁 Struktur Direktori

```text
src/
├── app/
│   ├── admin/               # Panel Admin (Dashboard, Ruang Kontrol, Tim)
│   │   ├── matches/
│   │   │   ├── [id]/        # Control Room (Live Score, Swap, Void Score)
│   │   │   └── create/      # Form Pembuatan Pertandingan
│   │   └── teams/           # Kelola Data Tim
│   ├── jury/                # Antarmuka Scoring (Mobile scoring controller)
│   │   └── matches/[id]/    # Meja Scoring (+1 Poin, Undo)
│   ├── tv/[id]/             # Papan Skor TV Layar Penuh Realtime
│   ├── login/               # Halaman Login Petugas
│   ├── globals.css          # Desain sistem dan token tipografi Hadang
│   └── page.tsx             # Portal Publik Turnamen Hadang
└── lib/
    └── supabase/            # Client, Server, & Middleware Supabase Helpers
```
