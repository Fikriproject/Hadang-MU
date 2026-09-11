import Swal from 'sweetalert2'

/**
 * Prompts user with a theme-aware SweetAlert2 modal to select an undo/cancel reason.
 * Offers 2 direct choices:
 *  1. Kesalahan Teknis (Terpencet)
 *  2. Pelanggaran (Skor tidak sah)
 */
export async function promptUndoScoreReason(): Promise<string | null> {
  const isLight =
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-theme') === 'light'

  const bgColor = isLight ? '#FFFFFF' : '#131E32'
  const textColor = isLight ? '#0F172A' : '#F8FAFC'
  const subtextColor = isLight ? '#64748B' : '#94A3B8'
  const cardBg = isLight ? '#F8FAFC' : '#0B1323'
  const cardBorder = isLight ? '#E2E8F0' : '#1E293B'
  const cancelBg = isLight ? '#E2E8F0' : '#1E293B'
  const cancelText = isLight ? '#475569' : '#94A3B8'

  return new Promise((resolve) => {
    Swal.fire({
      title: '<span style="font-size: 1.3rem; font-weight: 800;">Batalkan Poin Skor</span>',
      html: `
        <p style="color: ${subtextColor}; font-size: 0.875rem; margin-bottom: 1.25rem;">
          Pilih salah satu alasan pembatalan skor di bawah ini:
        </p>
        <div style="display: flex; flex-direction: column; gap: 0.75rem; width: 100%; box-sizing: border-box;">
          <button
            id="swal-opt-1"
            type="button"
            class="swal2-reason-btn"
            style="
              background-color: ${cardBg};
              border: 1.5px solid ${cardBorder};
              color: ${textColor};
            "
          >
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span style="font-size: 1.15rem;">⚠️</span>
              <strong style="font-size: 0.95rem; color: #D97706;">Alasan 1 : Kesalahan Teknis (Terpencet)</strong>
            </div>
            <span style="font-size: 0.8rem; color: ${subtextColor}; margin-left: 1.75rem;">
              Tombol skor tidak sengaja tertekan atau terjadi salah input nilai.
            </span>
          </button>

          <button
            id="swal-opt-2"
            type="button"
            class="swal2-reason-btn"
            style="
              background-color: ${cardBg};
              border: 1.5px solid ${cardBorder};
              color: ${textColor};
            "
          >
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span style="font-size: 1.15rem;">🚫</span>
              <strong style="font-size: 0.95rem; color: #DC2626;">Alasan 2 : Pelanggaran (Skor tidak sah)</strong>
            </div>
            <span style="font-size: 0.8rem; color: ${subtextColor}; margin-left: 1.75rem;">
              Pemain melanggar aturan garis hadang / poin dianulir oleh scoring.
            </span>
          </button>
        </div>
      `,
      showConfirmButton: false,
      showCancelButton: true,
      cancelButtonText: 'Batal',
      background: bgColor,
      color: textColor,
      customClass: {
        popup: 'swal2-hadang-popup',
        cancelButton: 'swal2-hadang-cancel-btn',
      },
      didOpen: () => {
        const cancelBtn = Swal.getCancelButton()
        if (cancelBtn) {
          cancelBtn.style.backgroundColor = cancelBg
          cancelBtn.style.color = cancelText
          cancelBtn.style.border = `1px solid ${cardBorder}`
          cancelBtn.style.fontWeight = '600'
          cancelBtn.style.borderRadius = '8px'
          cancelBtn.style.padding = '0.625rem 1.5rem'
          cancelBtn.style.marginTop = '0.5rem'
        }

        const opt1 = document.getElementById('swal-opt-1')
        const opt2 = document.getElementById('swal-opt-2')

        if (opt1) {
          opt1.onclick = () => {
            Swal.close()
            resolve('Kesalahan Teknis (Terpencet)')
          }
        }
        if (opt2) {
          opt2.onclick = () => {
            Swal.close()
            resolve('Pelanggaran (Skor tidak sah)')
          }
        }
      },
    }).then((result) => {
      if (result.dismiss) {
        resolve(null)
      }
    })
  })
}

/**
 * Prompts user with a theme-aware SweetAlert2 confirmation modal before deleting a team.
 */
export async function promptConfirmDeleteTeam(teamName: string): Promise<boolean> {
  const isLight =
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-theme') === 'light'

  const bgColor = isLight ? '#FFFFFF' : '#131E32'
  const textColor = isLight ? '#0F172A' : '#F8FAFC'

  const result = await Swal.fire({
    title: 'Hapus Tim?',
    text: `Apakah Anda yakin ingin menghapus tim "${teamName}"? Data pertandingan yang menggunakan tim ini mungkin terpengaruh.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#DC2626',
    cancelButtonColor: '#64748B',
    confirmButtonText: 'Ya, Hapus Tim',
    cancelButtonText: 'Batal',
    background: bgColor,
    color: textColor,
    customClass: {
      popup: 'swal2-hadang-popup',
    },
  })

  return result.isConfirmed
}

export function showScoreAlert(title: string, icon: 'success' | 'error' | 'info' = 'success', text?: string) {
  const isLight =
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-theme') === 'light'

  Swal.fire({
    title: `<span style="font-size: 1.15rem; font-weight: 700;">${title}</span>`,
    text,
    icon,
    timer: 2000,
    timerProgressBar: true,
    showConfirmButton: false,
    background: isLight ? '#FFFFFF' : '#131E32',
    color: isLight ? '#0F172A' : '#F8FAFC',
  })
}

/**
 * Prompts user with a theme-aware SweetAlert2 confirmation modal before switching half (Tukar Babak).
 */
export async function promptConfirmTukarBabak(): Promise<boolean> {
  const isLight =
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-theme') === 'light'

  const bgColor = isLight ? '#FFFFFF' : '#131E32'
  const textColor = isLight ? '#0F172A' : '#F8FAFC'
  const subtextColor = isLight ? '#64748B' : '#94A3B8'

  const result = await Swal.fire({
    title: '<span style="font-size: 1.25rem; font-weight: 800;">Tukar ke Babak 2?</span>',
    html: `
      <p style="color: ${subtextColor}; font-size: 0.875rem; margin-top: 0.5rem; line-height: 1.5;">
        Pertandingan akan <strong>dijeda (PAUSED)</strong> untuk persiapan babak berikutnya.<br/>
        <span style="color: var(--primary); font-weight: 700;">Posisi tim penyerang & bertahan tidak akan ditukar.</span>
      </p>
    `,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#2563EB',
    cancelButtonColor: '#64748B',
    confirmButtonText: '🔄 Ya, Tukar ke Babak 2',
    cancelButtonText: 'Batal',
    background: bgColor,
    color: textColor,
    customClass: {
      popup: 'swal2-hadang-popup',
    },
  })

  return result.isConfirmed
}

/**
 * Prompts user with a theme-aware SweetAlert2 confirmation modal before starting Babak 2.
 */
export async function promptConfirmStartBabak2(): Promise<boolean> {
  const isLight =
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-theme') === 'light'

  const bgColor = isLight ? '#FFFFFF' : '#131E32'
  const textColor = isLight ? '#0F172A' : '#F8FAFC'
  const subtextColor = isLight ? '#64748B' : '#94A3B8'

  const result = await Swal.fire({
    title: '<span style="font-size: 1.25rem; font-weight: 800;">Mulai Pertandingan Babak 2?</span>',
    html: `
      <p style="color: ${subtextColor}; font-size: 0.875rem; margin-top: 0.5rem; line-height: 1.5;">
        Pertandingan Babak 2 akan berstatus <strong>LIVE</strong> dan stopwatch Babak 2 akan mulai berjalan.
      </p>
    `,
    icon: 'info',
    showCancelButton: true,
    confirmButtonColor: '#16A34A',
    cancelButtonColor: '#64748B',
    confirmButtonText: '▶ Mulai Babak 2',
    cancelButtonText: 'Batal',
    background: bgColor,
    color: textColor,
    customClass: {
      popup: 'swal2-hadang-popup',
    },
  })

  return result.isConfirmed
}

