// Blokir karakter non-integer pada input angka (titik, koma, e, E, +, -)
function blockDecimal(e) {
  if (e.key === '.' || e.key === ',' || e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '-') {
    e.preventDefault()
  }
}
// Sanitasi value setelah input (hapus semua selain angka)
function sanitizeInt(el) {
  var v = el.value.replace(/[^0-9]/g, '')
  if (el.value !== v) el.value = v
}
// Blokir paste yang mengandung karakter non-integer
function blockPaste(e) {
  var txt = (e.clipboardData || window.clipboardData).getData('text')
  if (/[^0-9]/.test(txt)) e.preventDefault()
}

// ── Desimal (TEK. OLI, FREQUENCY, COS PHI) ──
// Ijinkan angka + satu tanda koma sebagai pemisah desimal
function blockDecimalField(e) {
  // Blokir titik, e, E, +, - ; tapi IJINKAN koma
  if (e.key === '.' || e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '-') {
    e.preventDefault()
  }
  // Hanya satu koma yang diizinkan
  if (e.key === ',' && e.target.value.indexOf(',') !== -1) {
    e.preventDefault()
  }
}
// Sanitasi: hanya angka dan satu koma, tidak boleh diawali koma
function sanitizeDecimal(el) {
  var v = el.value
  // hapus karakter selain angka dan koma
  v = v.replace(/[^0-9,]/g, '')
  // hapus koma lebih dari satu
  var parts = v.split(',')
  if (parts.length > 2) v = parts[0] + ',' + parts.slice(1).join('')
  if (el.value !== v) el.value = v
}
// Blokir paste desimal yang tidak valid
function blockPasteDecimal(e) {
  var txt = (e.clipboardData || window.clipboardData).getData('text')
  // Ijinkan angka, koma, titik (titik akan dikonversi saat simpan)
  if (/[^0-9,.]/.test(txt)) e.preventDefault()
}

// =============================================
// DATA UNIT STATIS (fallback / seed awal)
// =============================================
var UNIT_DATA = [
  { kode_unit: 366, nama_unit: "ULD BABAI",            area: "AREA KUALA KAPUAS" },
  { kode_unit: 372, nama_unit: "ULD GUNUNG PUREI",     area: "AREA KUALA KAPUAS" },
  { kode_unit: 373, nama_unit: "ULD KENAMBUI",         area: "AREA PANGKALAN BUN" },
  { kode_unit: 375, nama_unit: "ULD KUDANGAN",         area: "AREA PANGKALAN BUN" },
  { kode_unit: 376, nama_unit: "ULD MENDAWAI",         area: "AREA PANGKALAN BUN" },
  { kode_unit: 382, nama_unit: "ULD PAGATAN",          area: "AREA PANGKALAN BUN" },
  { kode_unit: 385, nama_unit: "ULD RANGGA ILUNG",     area: "AREA KUALA KAPUAS" },
  { kode_unit: 390, nama_unit: "ULD TELAGA",           area: "AREA PALANGKARAYA" },
  { kode_unit: 391, nama_unit: "ULD TELAGA PULANG",    area: "AREA PANGKALAN BUN" },
  { kode_unit: 395, nama_unit: "ULD TUMBANG MANJUL",   area: "AREA PANGKALAN BUN" },
  { kode_unit: 399, nama_unit: "ULD TUMBANG SENAMANG", area: "AREA PALANGKARAYA" },
  { kode_unit: 910, nama_unit: "ULD MANGKATIP",        area: "AREA KUALA KAPUAS" },
  { kode_unit: 911, nama_unit: "ULD TELUK BETUNG",     area: "AREA KUALA KAPUAS" },
  { kode_unit: 913, nama_unit: "ULD TUMPUNG LAUNG",    area: "AREA KUALA KAPUAS" },
  { kode_unit: 915, nama_unit: "ULD SUNGAI BALI",      area: "AREA TANAH BUMBU" },
  { kode_unit: 917, nama_unit: "ULD KERASIAN",         area: "AREA TANAH BUMBU" },
  { kode_unit: 918, nama_unit: "ULD KERAYAAN",         area: "AREA TANAH BUMBU" },
  { kode_unit: 919, nama_unit: "ULD KERUMPUTAN",       area: "AREA TANAH BUMBU" },
  { kode_unit: 920, nama_unit: "ULD MARABATUAN",       area: "AREA TANAH BUMBU" },
]

// =============================================
// DATA OPERATOR PER ULD
// =============================================
var OPERATOR_DATA = {
  366: ["Eko Setiawan", "Syamsuri", "Dolarman", "Hasim", "Fahrija Rahman", "Ramadhani", "Randa Yudistira"],                          // ULD BABAI
  372: ["Ahmat Rida", "Supiansyah", "Fahmi", "Minghuandy", "Nurahman", "Eko Setiawan", "Husliansyah"],                             // ULD GUNUNG PUREI
  373: ["Aryuni", "Muliyarta", "Erwansyah", "Gusti Gustira", "M Arbani", "Sandi", "Suhaimi", "Amriansyah", "Rusdiansyah", "Junika Cucu Andika"],                          // ULD KENAMBUI
  375: ["Alex Sanderia", "Timbun Radiyanto", "Hery Optianus", "Sabriansyah", "Donny Prayogo", "Yosuarius YB", "Anto", "Basilius Yoga"],                       // ULD KUDANGAN
  376: ["Aripin", "Tomi Kuswoyo", "Mujianor", "Didin Wahono", "Zulkifli", "Hendri Purwanto", "Moh Taufiq", "M Ardianor", "Yoga Syahbandi", "Azkia El Murthada", "Rafdianor"],                   // ULD MENDAWAI
  382: ["Hidayat Saputra", "Abdul Haris", "Muhammad Pauzan", "Tedy Heriady", "Murdiansyah", "Ridy", "Megi", "Muhammad Hidayat", "Muhammad Ikhsan"],                         // ULD PAGATAN
  385: ["M Ilman", "Muhammad Abidin", "Hendra Prianto", "M Ilham", "Hendri Irawan", "Ahmad Jainudin", "Muhammad Ari Sutarinda", "Alvyus Advent Bagaskara"],                           // ULD RANGGA ILUNG
  390: ["Murjoko", "Adi Rahmad", "Irawan"],                        // ULD TELAGA
  391: ["Eko Prasetyo", "Mulyadi", "Tri Wahyono", "Adi Susanto", "Karnadie", "Didie", "Yesto", "Ahmad Boby Erlangga"],                           // ULD TELAGA PULANG
  395: ["Effendi", "A Rafiq", "Mulyadi", "Supian", "Alpian", "Gusna Nubin", "M Ipan Ali", "Wardani", "Alpianor", "Juljalali Wal Ikram"],                           // ULD TUMBANG MANJUL
  399: ["Naneng Ermadi", "Ahmad Budi Santoso", "Yudi Setiono", "Burhan", "Sutrisman", "Purwanto", "Muhammad Nudie", "Benny Rahmadani", "Dodi Kurniawan"],                              // ULD TUMBANG SENAMANG
  910: ["M Kamawijaya", "Deniasyah", "Sukardiono", "Riduan", "Tajudin"],                       // ULD MANGKATIP
  911: ["Hendri Aprius", "Kanserto", "Gupinda Ramadan", "M Indra Saputra", "Achrian Noor", "Rizki Permana"],                                 // ULD TELUK BETUNG
  913: ["Herianor", "Yatno Eka Nugraha", "Murjani", "Masrawan", "Yuspida", "Agus Salim", "Lambri"],                    // ULD TUMPUNG LAUNG
  915: ["N Hirliyadi", "Husni Mubarak", "Bahrianor", "Muhammad Randi", "Gilang Ramadhan", "Muhammad Noviar Rahman", "Muhammad Riansyah", "Masriansyah"],                  // ULD SUNGAI BALI
  917: ["Arwin", "Darmawi", "Indrayadi", "Padli", "Suaib", "Suhardi"],                            // ULD KERASIAN
  918: ["Agus", "Alwir", "Khabir", "M Said", "Masjoni", "Muhammad Noor", "Roni Marten"],                     // ULD KERAYAAN
  919: ["Abd Sapma", "Fahrudin", "Hidayatullah", "Paesal", "Rasdi", "Safriansyah"],                   // ULD KERUMPUTAN
  920: ["Dedi Yusuf", "Febrianto", "Hamsyah", "Hasdiansyah", "Pardiansyah", "Sri Ekonanto", "Wahyudin"],                   // ULD MARABATUAN
}

// =============================================
// CONSTANTS
// =============================================
var PARAMS = [
  { key:'status_mesin',       label:'STATUS MESIN',       unit:'',     type:'select' },
  { key:'terpasang',          label:'TERPASANG',          unit:'kW',   type:'readonly' },
  { key:'daya_mampu',         label:'DAYA MAMPU',         unit:'kW',   type:'number' },
  { key:'beban',              label:'BEBAN',              unit:'kW',   type:'number' },
  { key:'stand_kwh',          label:'STAND KWH',          unit:'kWh',  type:'number' },
  { key:'stand_bbm',          label:'STAND BBM',          unit:'ltr',  type:'number' },
  { key:'phasa_r',            label:'PHASA R',            unit:'A',    type:'number' },
  { key:'phasa_s',            label:'PHASA S',            unit:'A',    type:'number' },
  { key:'phasa_t',            label:'PHASA T',            unit:'A',    type:'number' },
  { key:'tek_oli',            label:'TEK. OLI',           unit:'bar',  type:'decimal' },
  { key:'temp_air_pendingin', label:'TEMP. AIR', unit:'°C',   type:'number' },
  { key:'tegangan',           label:'TEGANGAN',           unit:'V',    type:'number' },
  { key:'frequency',          label:'FREQUENCY',          unit:'Hz',   type:'decimal' },
  { key:'cos_phi',            label:'COS PHI',            unit:'',     type:'decimal' },
  { key:'jam_kerja_mesin',    label:'JAM KERJA MESIN',    unit:'Jam',  type:'number' },
  { key:'kwh_produksi',       label:'KWH PRODUKSI',       unit:'kWh',  type:'number' },
  { key:'pemakaian_bbm',      label:'PEMAKAIAN BBM',      unit:'ltr',  type:'number' },
  { key:'keterangan',         label:'KETERANGAN',         unit:'',     type:'text' },
]
var STATUS_OPTIONS = ['Operasi','Standby','Pemeliharaan','Gangguan','Rusak Permanen']

// =============================================
// STATE MONITORING
// =============================================
var mesinList       = []      // daftar mesin dari mesin_cache (sesuai unit terpilih)
var currentData     = {}      // { mesin_id: { field: value } }

var monSelectedUnit = null    // kode_unit (integer)

// =============================================
// STATE OPERASIONAL
// =============================================
var lapData          = {}

var lapSelectedKode  = null   // kode_unit (integer)
var lapSelectedUnit  = null   // { kode_unit, nama_unit } object
var currentLapForm   = {}
var lastSavedData    = {}
var currentTeksLaporan = ''



// =============================================
// LOCALSTORAGE CACHE HELPERS (TTL = hari ini)
// =============================================
var LS_PREFIX = 'mm_'
var LS_TODAY  = new Date().toISOString().split('T')[0]  // YYYY-MM-DD

function lsSet(key, data) {
  try { localStorage.setItem(LS_PREFIX + key, JSON.stringify({ d: LS_TODAY, v: data })) } catch(e) {}
}
function lsGet(key) {
  try {
    var raw = localStorage.getItem(LS_PREFIX + key)
    if (!raw) return null
    var obj = JSON.parse(raw)
    if (!obj || obj.d !== LS_TODAY) return null   // kedaluwarsa (beda hari)
    return obj.v
  } catch(e) { return null }
}

// =============================================
// INIT
// =============================================
document.addEventListener('DOMContentLoaded', function() {
  var today   = new Date()
  var todayStr = today.toISOString().split('T')[0]
  // H-1 untuk tab DATA
  var yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  var yesterdayStr = yesterday.toISOString().split('T')[0]

  document.getElementById('sel-tanggal').value   = todayStr
  // Tab OPERASIONAL: default H-1, max = H-1 (tidak boleh pilih hari ini atau setelahnya)
  var lapTglEl = document.getElementById('lap-tanggal')
  lapTglEl.value = yesterdayStr
  lapTglEl.max   = yesterdayStr
  document.getElementById('data-tanggal').value  = yesterdayStr
  // Auto-set periode: Siang (06-17) atau Malam (18-05)
  var hr = today.getHours()
  document.getElementById('sel-periode').value = (hr >= 6 && hr <= 17) ? 'siang' : 'malam'
  // Hapus cache UP3-based lama agar tidak konflik
  try {
    Object.keys(localStorage).forEach(function(k) {
      if (k.startsWith('mm_up3') || k.startsWith('mm_unit_')) localStorage.removeItem(k)
    })
  } catch(e) {}

  // Render tab langsung — tidak tunggu API
  switchTab('laporan')
  // Load unit di background setelah tab sudah tampil
  loadAllUnits()
})

// =============================================
// SHARED: LOAD SEMUA UNIT (tanpa filter UP3)
// =============================================
async function loadAllUnits() {
  // Pakai localStorage cache jika ada (instant)
  var cached = lsGet('all_units')
  if (cached && cached.length > 0) {
    populateUnitSelect('mon-sel-unit', cached)
    populateUnitSelect('lap-sel-unit', cached)
  } else {
    // Fallback ke data statis
    populateUnitSelect('mon-sel-unit', UNIT_DATA)
    populateUnitSelect('lap-sel-unit', UNIT_DATA)
  }

  // Fetch dari API di background untuk refresh data terbaru
  try {
    var res  = await fetch('/api/unit')
    if (!res.ok) throw new Error('HTTP ' + res.status)
    var json = await res.json()
    if (!json.success) throw new Error(json.error || 'Gagal memuat unit')
    var units = json.data || []
    if (units.length > 0) {
      lsSet('all_units', units)
      populateUnitSelect('mon-sel-unit', units)
      populateUnitSelect('lap-sel-unit', units)
    }
  } catch(e) {
    console.warn('Gagal update unit dari server:', e.message)
  }
}

function populateUnitSelect(id, units) {
  var sel = document.getElementById(id)
  if (!sel) return
  sel.innerHTML = '<option value="">-- Pilih Unit --</option>'
  for (var i = 0; i < units.length; i++) {
    var u = units[i]
    var opt = document.createElement('option')
    opt.value = u.kode_unit
    opt.textContent = u.nama_unit
    sel.appendChild(opt)
  }
}

// =============================================
// ===== LOG SHEET HARIAN =====
// =============================================



// Unit berubah → load mesin & render tabel
async function onMonUnitChange(kodeUnit) {
  monSelectedUnit = kodeUnit ? parseInt(kodeUnit) : null
  currentData     = {}
  mesinList       = []

  setBtnMonEnabled(false)
  document.getElementById('info-mesin-count').textContent = ''
  document.getElementById('mon-state-empty').classList.remove('hidden')
  document.getElementById('mon-table-wrap').classList.add('hidden')

  if (!kodeUnit) return

  showLoading(true, 'loading-indicator-mesin')
  try {
    // Selalu fetch fresh agar data master (terpasang, dll) selalu terkini
    var res  = await fetch('/api/mesin-unit?kode_unit=' + kodeUnit)
    var json = await res.json()
    if (!json.success) throw new Error(json.error)
    mesinList = json.data

    if (mesinList.length === 0) {
      document.getElementById('info-mesin-count').textContent = 'Tidak ada mesin untuk unit ini'
      return
    }

    document.getElementById('info-mesin-count').textContent = mesinList.length + ' mesin ditemukan'

    // Inisialisasi currentData dengan default
    for (var i = 0; i < mesinList.length; i++) {
      currentData[mesinList[i].id_mesin] = { status_mesin: 'Operasi' }
    }

    renderTable()
    setBtnMonEnabled(true)
    document.getElementById('mon-state-empty').classList.add('hidden')
    document.getElementById('mon-table-wrap').classList.remove('hidden')

    // Auto load data hari ini
    await loadData()

  } catch(e) {
    showToast('Gagal memuat mesin: ' + e.message, 'error')
  } finally {
    showLoading(false, 'loading-indicator-mesin')
  }
}

function setBtnMonEnabled(enabled) {
  var btns = ['btn-tampilkan','btn-riwayat','btn-simpan-semua']
  btns.forEach(function(id) {
    var el = document.getElementById(id)
    if (!el) return
    el.disabled = !enabled
    el.style.opacity  = enabled ? '1' : '0.5'
    el.style.cursor   = enabled ? 'pointer' : 'not-allowed'
  })
}

function renderTable() {
  var thead = document.getElementById('table-head')
  var tbody = document.getElementById('table-body')

  // ── HEADER: kolom pertama = "Mesin", lalu satu kolom per parameter ──
  var headHTML = '<tr>'
  headHTML += '<th class="th-param" style="min-width:200px;text-align:center;">MESIN</th>'
  for (var pi = 0; pi < PARAMS.length; pi++) {
    var p = PARAMS[pi]
    headHTML += '<th class="th-mesin">'
    headHTML += '<div class="th-mesin-name" style="font-size:0.72rem;">' + p.label + '</div>'
    if (p.unit) headHTML += '<div style="font-size:0.65rem;color:#93c5fd;font-weight:400;">(' + p.unit + ')</div>'
    headHTML += '</th>'
  }
  headHTML += '</tr>'
  thead.innerHTML = headHTML

  // ── BODY: satu baris per mesin ──
  var bodyHTML = ''
  for (var mi = 0; mi < mesinList.length; mi++) {
    var m = mesinList[mi]
    var sn = m.s_n ? String(m.s_n) : '-'

    bodyHTML += '<tr style="background:#fff;" data-mesin="' + m.id_mesin + '">'
    // Kolom pertama: info mesin (sticky)
    bodyHTML += '<td style="text-align:left;background:#fff;">'
    bodyHTML += '<div class="th-mesin-name" style="font-size:0.78rem;color:#374151;font-weight:700;">' + m.mesin + '</div>'
    bodyHTML += '<div class="th-mesin-meta">'
    bodyHTML += '<span class="th-sn">S/N: ' + sn + '</span>'
    bodyHTML += '</div>'
    bodyHTML += '</td>'

    // Kolom-kolom parameter
    for (var pi2 = 0; pi2 < PARAMS.length; pi2++) {
      var p2  = PARAMS[pi2]
      if (p2.type === 'readonly') {
        // Nilai tetap dari master mesin, tidak bisa diubah
        var masterVal = (m[p2.key] !== undefined && m[p2.key] !== null) ? m[p2.key] : '—'
        bodyHTML += '<td style="text-align:center;font-size:0.8rem;color:#374151;font-weight:600;">' + masterVal + '</td>'
        continue
      }
      var val = (currentData[m.id_mesin] && currentData[m.id_mesin][p2.key] !== undefined && currentData[m.id_mesin][p2.key] !== null)
                ? currentData[m.id_mesin][p2.key] : ''
      if (p2.type === 'select') {
        bodyHTML += '<td><select class="cell-input" data-mesin-id="' + m.id_mesin + '" data-key="' + p2.key + '" onchange="setCellValue(' + m.id_mesin + ',\'' + p2.key + '\',this.value)">'
        for (var si = 0; si < STATUS_OPTIONS.length; si++) {
          var sopt = STATUS_OPTIONS[si]
          var sel  = (val === sopt || (!val && sopt === 'Operasi')) ? ' selected' : ''
          bodyHTML += '<option value="' + sopt + '"' + sel + '>' + sopt + '</option>'
        }
        bodyHTML += '</select></td>'
      } else if (p2.type === 'decimal') {
        // Input desimal: koma sebagai pemisah, keyboard desimal di mobile
        var dispVal = (val !== null && val !== undefined && val !== '') ? String(val).replace('.', ',') : ''
        bodyHTML += '<td><input type="text" inputmode="decimal" class="cell-input" placeholder="—"'
        bodyHTML += ' data-mesin-id="' + m.id_mesin + '" data-key="' + p2.key + '"'
        bodyHTML += ' autocomplete="off" autocorrect="off" spellcheck="false"'
        bodyHTML += ' value="' + dispVal + '"'
        bodyHTML += ' onkeydown="blockDecimalField(event)"'
        bodyHTML += ' onpaste="blockPasteDecimal(event)"'
        bodyHTML += ' oninput="sanitizeDecimal(this);setCellValue(' + m.id_mesin + ',\'' + p2.key + '\',this.value)"/></td>'
      } else if (p2.type === 'text') {
        bodyHTML += '<td><input type="text" class="cell-input cell-input-text" placeholder="—"'
        bodyHTML += ' data-mesin-id="' + m.id_mesin + '" data-key="' + p2.key + '"'
        bodyHTML += ' autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false"'
        bodyHTML += ' value="' + (val !== null && val !== undefined ? String(val).replace(/"/g,'&quot;') : '') + '"'
        bodyHTML += ' oninput="setCellValue(' + m.id_mesin + ',\'' + p2.key + '\',this.value)"/></td>'
      } else {
        // Gunakan type="text" + inputmode="numeric" agar keyboard angka muncul di mobile
        // dan kita bisa blokir titik secara penuh (type=number di iOS masih bisa input ".")
        bodyHTML += '<td><input type="text" inputmode="numeric" pattern="[0-9]*" class="cell-input" placeholder="—"'
        bodyHTML += ' data-mesin-id="' + m.id_mesin + '" data-key="' + p2.key + '"'
        bodyHTML += ' autocomplete="off" autocorrect="off" spellcheck="false"'
        bodyHTML += ' value="' + val + '"'
        bodyHTML += ' onkeydown="blockDecimal(event)"'
        bodyHTML += ' onpaste="blockPaste(event)"'
        bodyHTML += ' oninput="sanitizeInt(this);setCellValue(' + m.id_mesin + ',\'' + p2.key + '\',this.value)"/></td>'
      }
    }
    bodyHTML += '</tr>'
  }
  tbody.innerHTML = bodyHTML
  // Terapkan aturan enable/disable setelah render
  applyAllStatusRules()
}

// Cek apakah field bertipe decimal
var DECIMAL_FIELDS = { tek_oli: true, frequency: true, cos_phi: true }

// Auto-fill keterangan dari H-1 saat status berubah ke non Operasi/Standby
async function autoFillKeteranganH1(mesinId) {
  // Hanya fill jika keterangan masih kosong
  var ketNow = currentData[mesinId] ? currentData[mesinId].keterangan : null
  if (ketNow && String(ketNow).trim() !== '') return  // sudah ada keterangan, skip

  var tanggal = document.getElementById('sel-tanggal').value
  var periode  = document.getElementById('sel-periode').value
  if (!tanggal) return

  // Hitung H-1
  var parts = tanggal.split('-')
  var d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
  d.setDate(d.getDate() - 1)
  var tanggalH1 = d.getFullYear() + '-'
    + String(d.getMonth() + 1).padStart(2, '0') + '-'
    + String(d.getDate()).padStart(2, '0')

  try {
    // Coba dengan periode dulu
    var res = await fetch('/api/monitoring?tanggal=' + tanggalH1 + '&periode=' + periode + '&kode_unit=' + monSelectedUnit)
    var js  = await res.json()
    var rows = (js.success && js.data) ? js.data : []

    // Jika tidak ada hasil dengan periode, coba tanpa periode
    if (rows.length === 0) {
      var res2 = await fetch('/api/monitoring?tanggal=' + tanggalH1 + '&kode_unit=' + monSelectedUnit)
      var js2  = await res2.json()
      rows = (js2.success && js2.data) ? js2.data : []
    }

    for (var i = 0; i < rows.length; i++) {
      if (rows[i].mesin_id === mesinId && rows[i].keterangan) {
        // Isi keterangan di currentData
        if (!currentData[mesinId]) currentData[mesinId] = {}
        currentData[mesinId].keterangan = rows[i].keterangan
        // Isi juga di input element
        var tbody = document.getElementById('table-body')
        if (tbody) {
          var el = tbody.querySelector('[data-mesin-id="' + mesinId + '"][data-key="keterangan"]')
          if (el) el.value = rows[i].keterangan
        }
        break
      }
    }
  } catch(e) { /* abaikan jika gagal */ }
}

function setCellValue(mesinId, field, value) {
  if (!currentData[mesinId]) currentData[mesinId] = {}
  if (field === 'status_mesin' || field === 'keterangan') {
    currentData[mesinId][field] = value === '' ? null : value
    // Terapkan rule enable/disable saat status berubah
    if (field === 'status_mesin') {
      applyStatusRule(mesinId, value || 'Operasi')
      // Auto-fill keterangan dari H-1 jika status != Operasi/Standby dan keterangan kosong
      if (value !== 'Operasi' && value !== 'Standby') {
        autoFillKeteranganH1(mesinId)
      }
    }
  } else if (DECIMAL_FIELDS[field]) {
    // Konversi koma → titik untuk disimpan sebagai float
    var norm = String(value).replace(',', '.')
    currentData[mesinId][field] = norm === '' || norm === '.' ? null : parseFloat(norm)
  } else {
    var cleaned = String(value).replace(/[^0-9]/g, '')
    currentData[mesinId][field] = cleaned === '' ? null : parseInt(cleaned, 10)
  }
}

// =============================================
// ATURAN STATUS → ENABLE/DISABLE KOLOM
// =============================================
// Operasi   : semua wajib diisi, kecuali keterangan (disabled)
// Standby   : hanya daya_mampu wajib, sisanya disabled (kecuali keterangan disabled juga)
// Lainnya   : semua disabled kecuali keterangan (wajib)

function applyStatusRule(mesinId, status) {
  var tbody = document.getElementById('table-body')
  if (!tbody) return
  var row = tbody.querySelector('tr[data-mesin="' + mesinId + '"]')
  if (!row) return

  for (var pi = 0; pi < PARAMS.length; pi++) {
    var p = PARAMS[pi]
    if (p.type === 'readonly' || p.type === 'select') continue  // kolom mesin & status tidak disentuh

    var el = row.querySelector('[data-mesin-id="' + mesinId + '"][data-key="' + p.key + '"]')
    if (!el) continue

    var td = el.parentElement

    var isDisabled = false
    var isRequired = false

    if (status === 'Operasi') {
      // keterangan: disabled; semua lain: wajib
      if (p.key === 'keterangan') {
        isDisabled = true
      } else {
        isRequired = true
      }
    } else if (status === 'Standby') {
      // daya_mampu, kwh_produksi, pemakaian_bbm: wajib; semua lain: disabled
      if (p.key === 'daya_mampu' || p.key === 'kwh_produksi' || p.key === 'pemakaian_bbm') {
        isRequired = true
      } else {
        isDisabled = true
      }
    } else {
      // Pemeliharaan / Gangguan / Rusak Permanen
      // keterangan: wajib; semua lain: disabled
      if (p.key === 'keterangan') {
        isRequired = true
      } else {
        isDisabled = true
      }
    }

    el.disabled = isDisabled
    if (isDisabled) {
      el.classList.add('cell-disabled')
      el.classList.remove('cell-required')
      td.classList.add('td-disabled')
      td.classList.remove('td-required')
      // Isi 0 dan simpan ke currentData saat di-disable
      el.value = '0'
      if (!currentData[mesinId]) currentData[mesinId] = {}
      currentData[mesinId][p.key] = 0
    } else {
      el.classList.remove('cell-disabled')
      td.classList.remove('td-disabled')
      if (isRequired) {
        el.classList.add('cell-required')
        td.classList.add('td-required')
      } else {
        el.classList.remove('cell-required')
        td.classList.remove('td-required')
      }
    }
  }
}

// Terapkan rule ke semua baris sekaligus (setelah render/updateTable)
function applyAllStatusRules() {
  for (var mi = 0; mi < mesinList.length; mi++) {
    var m = mesinList[mi]
    var status = (currentData[m.id_mesin] && currentData[m.id_mesin].status_mesin)
                 ? currentData[m.id_mesin].status_mesin : 'Operasi'
    applyStatusRule(m.id_mesin, status)
  }
}

// Update hanya nilai input tanpa re-render seluruh tabel
function updateTableData() {
  var tbody = document.getElementById('table-body')
  if (!tbody || tbody.innerHTML === '') { renderTable(); return }
  for (var mi = 0; mi < mesinList.length; mi++) {
    var m   = mesinList[mi]
    var row = tbody.querySelector('tr[data-mesin="' + m.id_mesin + '"]')
    if (!row) { renderTable(); return }
    for (var pi = 0; pi < PARAMS.length; pi++) {
      var p   = PARAMS[pi]
      if (p.type === 'readonly') continue  // nilai tetap dari master, skip
      var val = (currentData[m.id_mesin] && currentData[m.id_mesin][p.key] !== undefined && currentData[m.id_mesin][p.key] !== null)
                ? currentData[m.id_mesin][p.key] : ''
      var el  = row.querySelector('[data-mesin-id="' + m.id_mesin + '"][data-key="' + p.key + '"]')
      if (!el) continue
      if (p.type === 'select') {
        el.value = val || 'Operasi'
      } else if (p.type === 'text') {
        el.value = val !== null && val !== undefined ? String(val) : ''
      } else if (p.type === 'decimal') {
        // Tampilkan dengan koma sebagai pemisah desimal
        el.value = val !== null && val !== undefined && val !== '' ? String(val).replace('.', ',') : ''
      } else {
        el.value = val
      }
    }
    // Warna nama mesin konsisten (sama dengan cell input lain)
  }
  // Terapkan aturan enable/disable setelah update nilai
  applyAllStatusRules()
}

async function loadData() {
  var tanggal = document.getElementById('sel-tanggal').value
  var periode = document.getElementById('sel-periode').value
  if (!tanggal) { showToast('Pilih tanggal terlebih dahulu','info'); return }
  if (!monSelectedUnit) { showToast('Pilih unit terlebih dahulu','info'); return }

  showLoading(true,'loading-indicator')
  try {
    var res  = await fetch('/api/monitoring?tanggal=' + tanggal + '&periode=' + periode + '&kode_unit=' + monSelectedUnit)
    var json = await res.json()
    if (!json.success) throw new Error(json.error)

    // Hitung tanggal H-1
    var tglParts = tanggal.split('-')
    var tglDate = new Date(parseInt(tglParts[0]), parseInt(tglParts[1]) - 1, parseInt(tglParts[2]))
    tglDate.setDate(tglDate.getDate() - 1)
    var tanggalH1 = tglDate.getFullYear() + '-'
      + String(tglDate.getMonth() + 1).padStart(2, '0') + '-'
      + String(tglDate.getDate()).padStart(2, '0')

    // Step 1: Reset semua mesin ke default Operasi
    for (var i = 0; i < mesinList.length; i++) {
      currentData[mesinList[i].id_mesin] = { status_mesin: 'Operasi' }
    }

    // Step 2: Fetch H-1 dan terapkan status + keterangan ke semua mesin
    try {
      var resH1 = await fetch('/api/monitoring?tanggal=' + tanggalH1 + '&periode=' + periode + '&kode_unit=' + monSelectedUnit)
      var jsonH1 = await resH1.json()
      var rowsH1 = (jsonH1.success && jsonH1.data) ? jsonH1.data : []
      // Fallback tanpa periode jika tidak ada hasil
      if (rowsH1.length === 0) {
        var resH1b = await fetch('/api/monitoring?tanggal=' + tanggalH1 + '&kode_unit=' + monSelectedUnit)
        var jsonH1b = await resH1b.json()
        rowsH1 = (jsonH1b.success && jsonH1b.data) ? jsonH1b.data : []
      }
      for (var hi = 0; hi < rowsH1.length; hi++) {
        var rH1 = rowsH1[hi]
        var mH1 = rH1.mesin_id
        if (!currentData[mH1]) currentData[mH1] = {}
        // Terapkan status dari H-1 sebagai default awal
        currentData[mH1].status_mesin = rH1.status_mesin || 'Operasi'
        // Terapkan keterangan dari H-1 jika non Operasi/Standby
        if (rH1.status_mesin && rH1.status_mesin !== 'Operasi' && rH1.status_mesin !== 'Standby' && rH1.keterangan) {
          currentData[mH1].keterangan = rH1.keterangan
        }
      }
    } catch(e) { /* abaikan jika gagal */ }

    // Step 3: Timpa dengan data hari ini dari DB
    // Jika data hari ini status='Operasi' dan semua field = 0/null (belum diisi manual),
    // pertahankan status dari H-1; jika sudah ada nilai isi → pakai data hari ini sepenuhnya
    for (var i = 0; i < json.data.length; i++) {
      var row = json.data[i]
      var mid = row.mesin_id
      // Deteksi apakah data hari ini "belum diisi" (semua 0 atau null, status Operasi)
      var isDefaultData = (row.status_mesin === 'Operasi')
        && !row.daya_mampu && !row.beban && !row.stand_kwh && !row.stand_bbm
        && !row.phasa_r && !row.phasa_s && !row.phasa_t
        && !row.tek_oli && !row.temp_air_pendingin && !row.tegangan
        && !row.frequency && !row.cos_phi && !row.jam_kerja_mesin
        && !row.kwh_produksi && !row.pemakaian_bbm && !row.keterangan
      if (isDefaultData) {
        // Data hari ini belum diisi → pertahankan status dari H-1, abaikan data hari ini
        if (!currentData[mid]) currentData[mid] = {}
        currentData[mid].terpasang = row.terpasang
      } else {
        // Data hari ini sudah diisi manual → pakai sepenuhnya
        currentData[mid] = {
          terpasang: row.terpasang,
          daya_mampu: row.daya_mampu, beban: row.beban,
          stand_kwh: row.stand_kwh, stand_bbm: row.stand_bbm,
          phasa_r: row.phasa_r, phasa_s: row.phasa_s, phasa_t: row.phasa_t,
          tek_oli: row.tek_oli, temp_air_pendingin: row.temp_air_pendingin,
          tegangan: row.tegangan, frequency: row.frequency, cos_phi: row.cos_phi,
          jam_kerja_mesin: row.jam_kerja_mesin, status_mesin: row.status_mesin,
          kwh_produksi: row.kwh_produksi, pemakaian_bbm: row.pemakaian_bbm,
          keterangan: row.keterangan
        }
      }
    }
    updateTableData()
    var cnt = json.data.length
    document.getElementById('info-record').textContent = cnt > 0
      ? cnt + ' mesin sudah ada data'
      : 'Belum ada data untuk ' + tanggal + ' (' + periode + ')'
    // Jika popup WA sedang terbuka, rebuild teks sesuai filter baru
    await refreshPopupWA()
  } catch(e) { showToast('Gagal memuat data: ' + e.message,'error') }
  finally { showLoading(false,'loading-indicator') }
}

// Rebuild teks WA di popup jika sedang terbuka — dipanggil setiap kali filter/data berubah
async function refreshPopupWA() {
  var modalKirim = document.getElementById('modal-kirim')
  if (!modalKirim || modalKirim.classList.contains('hidden')) return  // popup tidak terbuka, skip
  var tanggal = document.getElementById('sel-tanggal').value
  var periode = document.getElementById('sel-periode').value
  if (!tanggal || !periode || !monSelectedUnit || mesinList.length === 0) return
  // Bangun records dari currentData (data yang sudah ada di memori)
  var records = []
  for (var i = 0; i < mesinList.length; i++) {
    var m = mesinList[i]
    var d = Object.assign({}, currentData[m.id_mesin] || { status_mesin: 'Operasi' })
    d.mesin_id  = m.id_mesin
    d.terpasang = m.terpasang !== undefined ? m.terpasang : null
    records.push(d)
  }
  var teksMon = await buildWAFromMemory(tanggal, periode, monSelectedUnit, records)
  if (teksMon) {
    currentTeksLaporan = teksMon
    document.getElementById('kirim-preview-text').textContent = teksMon
  }
}

// Bangun teks WA format LAPORAN BEBAN PUNCAK PLTD
// Build teks WA untuk SATU unit
// Build WA dari data memori lokal (records sudah ada, tidak perlu fetch DB lagi)
async function buildWAFromMemory(tanggal, periode, kodeUnit, records) {
  if (!records || records.length === 0) return null

  // H-1
  var tglDate = new Date(tanggal)
  tglDate.setDate(tglDate.getDate() - 1)
  var tanggalH1 = tglDate.toISOString().split('T')[0]

  // Fetch nama_operator dari lap-operasional H-1 unit ini
  var namaOperator = '-'
  try {
    var rL = await fetch('/api/lap-operasional?tanggal=' + tanggalH1 + '&kode_unit=' + kodeUnit)
    var jL = await rL.json()
    if (jL.success && jL.data && jL.data.length > 0) namaOperator = jL.data[0].nama_operator || '-'
  } catch(e) {}

  // Fetch stok BBM H-1 untuk unit ini
  var stokBbm = '-', hopBbm = '-'
  try {
    var rS = await fetch('/api/data-stok?tanggal=' + tanggalH1)
    var jS = await rS.json()
    if (jS.success && jS.data) {
      for (var si = 0; si < jS.data.length; si++) {
        // paksa integer untuk perbandingan
        if (parseInt(jS.data[si].kode_unit) === parseInt(kodeUnit)) {
          stokBbm = jS.data[si].stok_awal    != null ? jS.data[si].stok_awal    : '-'
          hopBbm  = jS.data[si].safety_stock != null ? jS.data[si].safety_stock : '-'
          break
        }
      }
    }
  } catch(e) {}

  // Nama unit
  var namaUnit = String(kodeUnit)
  for (var ui = 0; ui < UNIT_DATA.length; ui++) {
    if (UNIT_DATA[ui].kode_unit === parseInt(kodeUnit)) { namaUnit = UNIT_DATA[ui].nama_unit; break }
  }

  var periodeLabel = periode === 'siang' ? 'siang' : 'malam'
  var lines = []
  lines.push('LAPORAN BEBAN PUNCAK PLTD')
  lines.push(periodeLabel)
  lines.push(namaUnit)
  lines.push('id unit: ' + kodeUnit)
  lines.push('tgl : ' + tanggal)
  lines.push('nama operator: ' + namaOperator)
  lines.push('')

  var totalDM = 0, totalBeban = 0, maxDM = 0

  for (var i = 0; i < records.length; i++) {
    var r = records[i]
    // cari dari mesinList di memori
    var m = null
    for (var mi = 0; mi < mesinList.length; mi++) {
      if (parseInt(mesinList[mi].id_mesin) === parseInt(r.mesin_id)) { m = mesinList[mi]; break }
    }
    var namaMesin = m ? m.mesin : String(r.mesin_id)
    var snMesin   = m ? (m.s_n || '-') : '-'
    var dtMesin   = (m && m.terpasang != null) ? m.terpasang : (r.terpasang != null ? r.terpasang : '-')
    var status    = r.status_mesin || 'Operasi'

    var dm = r.daya_mampu != null ? parseFloat(r.daya_mampu) : 0
    var bp = r.beban      != null ? parseFloat(r.beban)      : 0
    if (status === 'Operasi')      { totalDM += dm; totalBeban += bp; if (dm > maxDM) maxDM = dm }
    else if (status === 'Standby') { totalDM += dm; if (dm > maxDM) maxDM = dm }

    // Kolom yang di-disable → null → tampilkan 0 di WA
    var v0 = function(val) { return val != null ? val : 0 }
    var vd = function(val) { return val != null ? String(val).replace('.', ',') : '0' }

    lines.push((i + 1) + '. ' + namaMesin)
    lines.push('id mesin: ' + r.mesin_id)
    lines.push('sn: ' + snMesin)
    lines.push('dt: ' + dtMesin)
    lines.push('dm: ' + v0(r.daya_mampu))
    lines.push('bp: ' + v0(r.beban))
    lines.push('br: 0')
    lines.push('phasa r: '    + v0(r.phasa_r))
    lines.push('phasa s: '    + v0(r.phasa_s))
    lines.push('phasa t: '    + v0(r.phasa_t))
    lines.push('tek oli: '    + vd(r.tek_oli))
    lines.push('temp mesin: ' + v0(r.temp_air_pendingin))
    lines.push('cos phi: '    + vd(r.cos_phi))
    lines.push('jam start: 0')
    lines.push('jam stop: 0')
    lines.push('status mesin: ' + status.toLowerCase())
    lines.push('penyebab: '    + (r.keterangan || ''))
    lines.push('')
  }

  var cadangan  = totalDM - totalBeban
  var padam     = cadangan < 0 ? Math.abs(cadangan) : 0
  var statusSys = cadangan < 0 ? 'defisit' : (maxDM > 0 && cadangan < maxDM ? 'siaga' : 'normal')

  lines.push('resume')
  lines.push('dm pasok: '     + totalDM)
  lines.push('bp terlayani: ' + totalBeban)
  lines.push('padam: '        + padam)
  lines.push('cadangan: '     + cadangan)
  lines.push('status: '       + statusSys)
  lines.push('stok bbm: '     + stokBbm)
  lines.push('hop bbm: '      + hopBbm)

  return lines.join('\n')
}

// kodeUnit: integer, allMesinCache: array semua mesin dari cache, stokMap: map kode_unit->stok, lapMap: map kode_unit->lap
function buildUnitWAText(tanggal, periode, kodeUnit, records, allMesinCache, stokMap, lapMap) {
  var namaUnit = ''
  for (var ui = 0; ui < UNIT_DATA.length; ui++) {
    if (UNIT_DATA[ui].kode_unit === kodeUnit) { namaUnit = UNIT_DATA[ui].nama_unit; break }
  }
  var periodeLabel = periode === 'siang' ? 'siang' : 'malam'

  // Nama operator dari laporan operasional H-1
  var namaOperator = (lapMap && lapMap[kodeUnit] && lapMap[kodeUnit].nama_operator)
    ? lapMap[kodeUnit].nama_operator : '-'

  var lines = []
  lines.push('LAPORAN BEBAN PUNCAK PLTD')
  lines.push('\u200B' + periodeLabel)
  lines.push('\u200B' + (namaUnit || String(kodeUnit)))
  lines.push('id unit: ' + kodeUnit)
  lines.push('tgl : ' + tanggal)
  lines.push('nama operator: ' + namaOperator)
  lines.push('')

  var totalDM = 0, totalBeban = 0, maxDM = 0

  for (var i = 0; i < records.length; i++) {
    var r = records[i]
    // Cari mesin dari allMesinCache (semua unit)
    var m = null
    for (var mi = 0; mi < allMesinCache.length; mi++) {
      if (allMesinCache[mi].id_mesin === r.mesin_id) { m = allMesinCache[mi]; break }
    }
    var namaMesin = m ? m.mesin : String(r.mesin_id)
    var snMesin   = m ? (m.s_n || '-') : '-'
    var dtMesin   = m ? (m.terpasang != null ? m.terpasang : (r.terpasang != null ? r.terpasang : '-')) : (r.terpasang != null ? r.terpasang : '-')
    var status    = r.status_mesin || 'Operasi'

    var dm = (r.daya_mampu != null) ? parseFloat(r.daya_mampu) : 0
    var bp = (r.beban      != null) ? parseFloat(r.beban)      : 0
    if (status === 'Operasi') {
      totalDM += dm; totalBeban += bp
      if (dm > maxDM) maxDM = dm
    } else if (status === 'Standby') {
      totalDM += dm
      if (dm > maxDM) maxDM = dm
    }

    var tekOliStr = (r.tek_oli   != null) ? String(r.tek_oli).replace('.', ',') : '-'
    var tempStr   = (r.temp_air_pendingin != null) ? r.temp_air_pendingin : '-'
    var cosPhiStr = (r.cos_phi   != null) ? String(r.cos_phi).replace('.', ',') : '-'

    lines.push((i + 1) + '. ' + namaMesin)
    lines.push('\u200bid mesin: ' + r.mesin_id)
    lines.push('\u200bsn: ' + snMesin)
    lines.push('\u200bdt: ' + dtMesin)
    lines.push('\u200bdm: ' + (r.daya_mampu != null ? r.daya_mampu : '-'))
    lines.push('\u200bbp: ' + (r.beban != null ? r.beban : '-'))
    lines.push('\u200bbr: 0')
    lines.push('\u200bphasa r: ' + (r.phasa_r != null ? r.phasa_r : '-'))
    lines.push('\u200bphasa s: ' + (r.phasa_s != null ? r.phasa_s : '-'))
    lines.push('\u200bphasa t: ' + (r.phasa_t != null ? r.phasa_t : '-'))
    lines.push('\u200btek oli: ' + tekOliStr)
    lines.push('\u200btemp mesin: ' + tempStr)
    lines.push('\u200bcos phi: ' + cosPhiStr)
    lines.push('\u200bjam start: 0')
    lines.push('\u200bjam stop: 0')
    lines.push('\u200bstatus mesin: ' + status.toLowerCase())
    lines.push('\u200bpenyebab: ' + (r.keterangan || ''))
    lines.push('')
  }

  // Resume
  var cadangan  = totalDM - totalBeban
  var padam     = cadangan < 0 ? Math.abs(cadangan) : 0
  var statusSys = cadangan < 0 ? 'defisit' : (maxDM > 0 && cadangan < maxDM ? 'siaga' : 'normal')

  // stok bbm = saldo_akhir (stock_akhir) dari tabel DATA H-1
  // hop bbm  = safety_stock dari tabel DATA H-1
  var stokBbm = '-', hopBbm = '-'
  if (stokMap && stokMap[kodeUnit]) {
    stokBbm = stokMap[kodeUnit].stok_awal    != null ? stokMap[kodeUnit].stok_awal    : '-'
    hopBbm  = stokMap[kodeUnit].safety_stock != null ? stokMap[kodeUnit].safety_stock : '-'
  }

  lines.push('\u200bresume')
  lines.push('\u200bdm pasok: ' + totalDM)
  lines.push('\u200bbp terlayani: ' + totalBeban)
  lines.push('\u200bpadam: ' + padam)
  lines.push('\u200bcadangan: ' + cadangan)
  lines.push('\u200bstatus: ' + statusSys)
  lines.push('\u200bstok bbm: ' + stokBbm)
  lines.push('\u200bhop bbm: ' + hopBbm)

  return lines.join('\n')
}

// Build teks WA: hanya untuk unit+tanggal+periode yang sedang aktif
// filterKodeUnit: kode_unit integer (wajib)
async function buildMonitoringWAText(tanggal, periode, filterKodeUnit) {
  // 1. Fetch data monitoring untuk tanggal+jam+kode_unit yang dipilih
  var jamPeriode = periode === 'siang' ? '12' : '18'
  var url = '/api/monitoring?tanggal=' + tanggal + '&jam=' + jamPeriode
  if (filterKodeUnit) url += '&kode_unit=' + filterKodeUnit
  var resData  = await fetch(url)
  var jsonData = await resData.json()
  if (!jsonData.success || !jsonData.data || jsonData.data.length === 0) return null

  // 2. Fetch semua mesin cache (semua unit) untuk lookup nama/sn/dt
  var resMesin  = await fetch('/api/mesin-cache')
  var jsonMesin = await resMesin.json()
  var allMesinCache = (jsonMesin.success && jsonMesin.data) ? jsonMesin.data : []

  // 3. Hitung tanggal H-1
  var tglDate = new Date(tanggal)
  tglDate.setDate(tglDate.getDate() - 1)
  var tanggalH1 = tglDate.toISOString().split('T')[0]

  // 4. Fetch lap-operasional H-1 → nama_operator + saldo_akhir per unit
  var lapMap = {}
  try {
    var resLap  = await fetch('/api/lap-operasional?tanggal=' + tanggalH1)
    var jsonLap = await resLap.json()
    if (jsonLap.success && jsonLap.data) {
      for (var li = 0; li < jsonLap.data.length; li++) {
        lapMap[jsonLap.data[li].kode_unit] = jsonLap.data[li]
      }
    }
  } catch(e) { /* lanjut tanpa lap */ }

  // 5. Fetch data-stok H-1 → stok_akhir (saldo_akhir) + safety_stock per unit
  var stokMap = {}
  try {
    var resStok  = await fetch('/api/data-stok?tanggal=' + tanggalH1)
    var jsonStok = await resStok.json()
    if (jsonStok.success && jsonStok.data) {
      for (var si = 0; si < jsonStok.data.length; si++) {
        stokMap[jsonStok.data[si].kode_unit] = jsonStok.data[si]
      }
    }
  } catch(e) { /* lanjut tanpa stok */ }

  // 4. Group records per kode_unit (mesin_id → kode_unit via allMesinCache)
  var unitMap = {}   // kode_unit -> [records]
  var unitOrder = [] // urutan unit muncul
  for (var i = 0; i < jsonData.data.length; i++) {
    var r = jsonData.data[i]
    var kodeUnit = null
    for (var mi = 0; mi < allMesinCache.length; mi++) {
      if (allMesinCache[mi].id_mesin === r.mesin_id) { kodeUnit = allMesinCache[mi].kode_unit; break }
    }
    if (kodeUnit === null) kodeUnit = 0
    if (!unitMap[kodeUnit]) { unitMap[kodeUnit] = []; unitOrder.push(kodeUnit) }
    unitMap[kodeUnit].push(r)
  }

  // 5. Build teks per unit, gabung dengan separator
  var parts = []
  for (var ui = 0; ui < unitOrder.length; ui++) {
    var ku = unitOrder[ui]
    parts.push(buildUnitWAText(tanggal, periode, ku, unitMap[ku], allMesinCache, stokMap, lapMap))
  }

  return parts.join('\n\n---\n\n')
}

// Ambil jam sekarang (untuk disimpan ke DB per record)
function getJamByPeriode(periode) {
  return periode === 'siang' ? '12' : '18'
}

async function saveAllData() {
  var tanggal = document.getElementById('sel-tanggal').value
  var periode = document.getElementById('sel-periode').value
  if (!tanggal || !periode) { showToast('Pilih tanggal dan periode','info'); return }
  if (mesinList.length === 0) { showToast('Pilih unit terlebih dahulu','info'); return }

  var records = []
  for (var i = 0; i < mesinList.length; i++) {
    var m = mesinList[i]
    var d = Object.assign({}, currentData[m.id_mesin] || { status_mesin: 'Operasi' })
    d.mesin_id  = m.id_mesin
    d.terpasang = m.terpasang !== undefined ? m.terpasang : null  // selalu dari master
    records.push(d)
  }
  showLoading(true,'loading-indicator')
  try {
    var res  = await fetch('/api/monitoring/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tanggal: tanggal, jam: getJamByPeriode(periode), records: records })
    })
    var json = await res.json()
    if (!json.success) throw new Error(json.error)
    showToast('Data berhasil disimpan! (' + json.saved + ' mesin)','success')
    // Langsung buka WA tanpa popup
    var teksMon = await buildWAFromMemory(tanggal, periode, monSelectedUnit, records)
    if (teksMon) {
      window.location.href = 'https://wa.me/6282252147896?text=' + encodeURIComponent(teksMon)
    } else {
      showToast('Tidak ada data untuk dikirim ke WA','info')
    }
  } catch(e) { showToast('Gagal menyimpan: ' + e.message,'error') }
  finally { showLoading(false,'loading-indicator') }
}

async function showRiwayat() {
  var list = document.getElementById('riwayat-list')
  list.innerHTML = '<div style="text-align:center;padding:16px;color:#94a3b8"><span class="spinner"></span> Memuat...</div>'
  document.getElementById('modal-riwayat').classList.remove('hidden')
  try {
    var url = '/api/monitoring/tanggal'
    if (monSelectedUnit) url += '?kode_unit=' + monSelectedUnit
    var res  = await fetch(url)
    var json = await res.json()
    if (!json.success) throw new Error(json.error)
    if (json.data.length === 0) {
      list.innerHTML = '<div style="text-align:center;padding:16px;color:#94a3b8">Belum ada data</div>'
      return
    }
    var html = ''
    for (var i = 0; i < json.data.length; i++) {
      var tgl = json.data[i].tanggal
      html += '<button class="riwayat-btn" onclick="selectRiwayat(\'' + tgl + '\')">'
      html += '<i class="fas fa-calendar-day"></i><span>' + tgl + '</span></button>'
    }
    list.innerHTML = html
  } catch(e) { list.innerHTML = '<div style="text-align:center;padding:16px;color:#dc2626">Gagal memuat</div>' }
}

async function selectRiwayat(tanggal) {
  document.getElementById('sel-tanggal').value = tanggal
  closeModal('modal-riwayat')
  // Periode tetap sesuai pilihan user, tidak perlu auto-detect dari riwayat
  await loadData()
}

// =============================================
// KAMERA MODAL (getUserMedia)
// =============================================
var _kameraStream = null

function bukaModalKamera() {
  // Buat modal jika belum ada
  var modal = document.getElementById('kamera-modal')
  if (!modal) {
    modal = document.createElement('div')
    modal.id = 'kamera-modal'
    modal.className = 'kamera-modal-overlay'
    modal.innerHTML = [
      '<div class="kamera-modal-box">',
        '<div class="kamera-modal-header">',
          '<span>Ambil Foto</span>',
          '<button type="button" class="kamera-close-btn" onclick="tutupModalKamera()">&#10005;</button>',
        '</div>',
        '<video id="kamera-video" class="kamera-video" autoplay playsinline muted></video>',
        '<canvas id="kamera-canvas" style="display:none;"></canvas>',
        '<div class="kamera-modal-footer">',
          '<button type="button" class="btn-capture" onclick="captureKamera()">&#9679; Ambil Foto</button>',
        '</div>',
        '<div id="kamera-error" class="kamera-error" style="display:none;"></div>',
      '</div>'
    ].join('')
    document.body.appendChild(modal)
  }
  modal.style.display = 'flex'

  // Mulai stream kamera belakang
  var constraints = { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false }
  navigator.mediaDevices.getUserMedia(constraints)
    .then(function(stream) {
      _kameraStream = stream
      var video = document.getElementById('kamera-video')
      if (video) { video.srcObject = stream; video.play() }
      var errEl = document.getElementById('kamera-error')
      if (errEl) errEl.style.display = 'none'
    })
    .catch(function(err) {
      var errEl = document.getElementById('kamera-error')
      if (errEl) { errEl.style.display = ''; errEl.textContent = 'Kamera tidak dapat diakses: ' + (err.message || err) }
    })
}

function tutupModalKamera() {
  if (_kameraStream) { _kameraStream.getTracks().forEach(function(t){ t.stop() }); _kameraStream = null }
  var modal = document.getElementById('kamera-modal')
  if (modal) modal.style.display = 'none'
}

function captureKamera() {
  var video  = document.getElementById('kamera-video')
  var canvas = document.getElementById('kamera-canvas')
  if (!video || !canvas) return
  canvas.width  = video.videoWidth  || 1280
  canvas.height = video.videoHeight || 720
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
  canvas.toBlob(function(blob) {
    if (!blob) return
    var fileName = 'foto_' + Date.now() + '.jpg'
    var file = new File([blob], fileName, { type: 'image/jpeg' })
    tutupModalKamera()
    handleFileUpload(file)
  }, 'image/jpeg', 0.92)
}

// =============================================
// TAB SWITCHING
// =============================================
function switchTab(tab) {
  ['monitoring','laporan','data'].forEach(function(t) {
    document.getElementById('tab-' + t).classList.toggle('active', tab === t)
    document.getElementById('tab-btn-' + t).classList.toggle('active', tab === t)
  })
  document.getElementById('toolbar-monitoring').classList.toggle('hidden', tab !== 'monitoring')
  document.getElementById('toolbar-laporan').classList.toggle('hidden', tab !== 'laporan')
  document.getElementById('toolbar-data').classList.toggle('hidden', tab !== 'data')
  document.getElementById('header-actions-monitoring').style.display = (tab === 'monitoring') ? 'flex' : 'none'
  document.getElementById('header-actions-laporan').style.display   = (tab === 'laporan')    ? 'flex' : 'none'
  document.getElementById('header-actions-data').style.display      = (tab === 'data')       ? 'flex' : 'none'

  if (tab === 'laporan' && !lapSelectedKode) showLapState('empty')
  if (tab === 'data') {
    // Sync sub-tab button active state
    switchDataView(currentDataView)
  }
}

// =============================================
// ===== OPERASIONAL =====
// =============================================



// Unit berubah untuk laporan
async function onLapUnitChange(kode) {
  if (!kode) {
    lapSelectedKode = null
    lapSelectedUnit = null
    currentLapForm  = {}
    lastSavedData   = {}
    document.getElementById('lap-form-container').classList.add('hidden')
    document.getElementById('lap-review-container').classList.add('hidden')
    setBtnLapEnabled(false)
    showLapState('pick-unit')
    return
  }

  lapSelectedKode = parseInt(kode)
  // Cari nama_unit dari option yang dipilih
  var sel = document.getElementById('lap-sel-unit')
  var selectedOpt = sel.options[sel.selectedIndex]
  var optText = selectedOpt ? selectedOpt.textContent : ''
  var namaUnit = optText.replace(/\s*\(\d+\)\s*$/, '').trim()
  lapSelectedUnit = { kode_unit: lapSelectedKode, nama_unit: namaUnit }

  currentLapForm = lapData[lapSelectedKode] ? JSON.parse(JSON.stringify(lapData[lapSelectedKode])) : {}
  lastSavedData  = {}

  // Default penerimaan_bbm = 0 jika belum ada nilai
  if (currentLapForm.penerimaan_bbm === undefined || currentLapForm.penerimaan_bbm === null) currentLapForm.penerimaan_bbm = 0
  // Default oli: null agar user wajib isi angka atau pilih tidak menggunakan
  if (currentLapForm.stock_oli_sae40   === undefined) currentLapForm.stock_oli_sae40   = null
  if (currentLapForm.stock_oli_sx      === undefined) currentLapForm.stock_oli_sx      = null
  if (currentLapForm.stock_oli_sx_plus === undefined) currentLapForm.stock_oli_sx_plus = null

  var tglTerpilih = document.getElementById('lap-tanggal').value
  if (tglTerpilih) {
    // Gunakan onLapTanggalChange untuk fetch + tampilkan review/form sesuai kondisi data
    await onLapTanggalChange()
  } else {
    renderLapForm()
    setBtnLapEnabled(true)
    showLapState('form')
  }
}

function setBtnLapEnabled(enabled) {
  var btnSave = document.getElementById('btn-save-lap')
  var btnTampilkan = document.getElementById('btn-tampilkan-lap')
  if (btnSave) {
    btnSave.disabled = !enabled
    btnSave.style.opacity  = enabled ? '1' : '0.5'
    btnSave.style.cursor   = enabled ? 'pointer' : 'not-allowed'
  }
  if (btnTampilkan) {
    btnTampilkan.disabled = !enabled
    btnTampilkan.style.opacity  = enabled ? '1' : '0.5'
    btnTampilkan.style.cursor   = enabled ? 'pointer' : 'not-allowed'
  }
}

function showLapState(state) {
  // empty state
  var elEmpty = document.getElementById('lap-state-empty')
  elEmpty.style.display = (state === 'empty') ? 'flex' : 'none'
  // pick-unit state
  var elPick = document.getElementById('lap-state-pick-unit')
  elPick.style.display = (state === 'pick-unit') ? 'flex' : 'none'
  // form & review
  document.getElementById('lap-form-container').classList.toggle('hidden', state !== 'form')
  document.getElementById('lap-review-container').classList.toggle('hidden', state !== 'review')
  var btnSave = document.getElementById('btn-save-lap')
  var btnEdit = document.getElementById('btn-edit-lap')
  if (btnEdit) btnEdit.style.display = (state === 'review') ? 'inline-flex' : 'none'
  if (btnSave) {
    btnSave.style.display = (state === 'review') ? 'none' : 'inline-flex'
    if (state === 'form') { btnSave.disabled = false; btnSave.style.opacity = '1'; btnSave.style.cursor = 'pointer' }
  }
  // Sembunyikan tombol Tampilkan & Riwayat saat review
  var btnTampilkan = document.getElementById('btn-tampilkan-lap')
  var btnRiwayatLap = document.querySelector('#toolbar-laporan .btn-outline[onclick="showRiwayatLap()"]')
  if (btnTampilkan) btnTampilkan.style.display = (state === 'review') ? 'none' : ''
  if (btnRiwayatLap) btnRiwayatLap.style.display = (state === 'review') ? 'none' : ''
}

function renderLapForm() {
  if (!lapSelectedKode || !lapSelectedUnit) return
  var unit = lapSelectedUnit
  var tgl  = document.getElementById('lap-tanggal').value || '—'
  var d    = currentLapForm
  var alreadySaved  = !!lapData[lapSelectedKode]
  var kodeFormatted = String(unit.kode_unit).padStart(4, '0')

  function fldNum(key) {
    if (key === 'penerimaan_bbm') return (d[key] !== undefined && d[key] !== null) ? d[key] : '0'
    return (d[key] !== undefined && d[key] !== null) ? d[key] : ''
  }
  function fldOli(key) {
    if (d[key] === undefined || d[key] === null || d[key] === '') return 'tidak menggunakan'
    return d[key]
  }

  var html = '<div class="lap-single-card">'

  // ── KOP LAPORAN ──
  html += '<div class="lap-kop">'
  html += '<div class="lap-kop-title">LAPORAN OPERASIONAL PLTD</div>'
  html += '<div class="lap-kop-unit">' + unit.nama_unit + '</div>'
  html += '<div class="lap-kop-meta">'
  if (alreadySaved) html += '<span class="badge-saved"><i class="fas fa-check-circle"></i> Tersimpan</span>'
  html += '</div></div>'

  // ── FORM FIELDS ──
  html += '<div class="lap-single-body">'

  // Nama Operator — input + dropdown pilih operator
  var opList = (lapSelectedKode && OPERATOR_DATA[lapSelectedKode]) ? OPERATOR_DATA[lapSelectedKode] : []
  html += '<div class="lap-field-row" style="flex-wrap:wrap;gap:4px;">'
  html += '<label class="lap-field-label">Nama Operator</label>'
  html += '<span class="lap-field-sep">:</span>'
  html += '<div class="op-input-wrap" id="op-input-wrap">'
  html += '<input id="field-nama-operator" type="text" class="lap-field-input" placeholder="Ketik atau pilih..." value="' + (d.nama_operator || '') + '" oninput="setLapField(\'nama_operator\', this.value);filterOpDropdown(this.value)" onfocus="showOpDropdown()" autocomplete="off"/>'
  if (opList.length > 0) {
    // Nama operator yg sudah dipilih (bisa lebih dari 1, dipisah ", ")
    var selectedOps = (d.nama_operator || '').split(',').map(function(s){ return s.trim() }).filter(Boolean)
    html += '<div class="op-dropdown hidden" id="op-dropdown">'
    for (var oi = 0; oi < opList.length; oi++) {
      var opName = opList[oi]
      var opChecked = selectedOps.indexOf(opName) !== -1 ? 'checked' : ''
      html += '<label class="op-item">'
      html += '<input type="checkbox" name="op-check" value="' + opName + '" ' + opChecked + ' onchange="toggleOperator(\'' + opName.replace(/'/g,"\\'") + '\', this.checked)">'
      html += '<span>' + opName + '</span>'
      html += '</label>'
    }
    html += '</div>'
  }
  html += '</div>'
  html += '</div>'

  // kWh Produksi
  html += '<div class="lap-field-row">'
  html += '<label class="lap-field-label">kWh Produksi</label>'
  html += '<span class="lap-field-sep">:</span>'
  html += '<input id="field-kwh-produksi" type="text" inputmode="numeric" pattern="[0-9]*" class="lap-field-input" placeholder="0" value="' + fldNum('kwh_produksi') + '"/>'
  html += '<span class="lap-field-unit">kWh</span>'
  html += '</div>'

  // Saldo Awal
  html += '<div class="lap-field-row">'
  html += '<label class="lap-field-label">Saldo Awal</label>'
  html += '<span class="lap-field-sep">:</span>'
  html += '<input id="field-saldo-awal" type="text" inputmode="numeric" pattern="[0-9]*" class="lap-field-input" placeholder="0" value="' + fldNum('saldo_awal') + '"/>'
  html += '<span class="lap-field-unit">ltr</span>'
  html += '</div>'

  // Saldo Akhir
  html += '<div class="lap-field-row">'
  html += '<label class="lap-field-label">Saldo Akhir</label>'
  html += '<span class="lap-field-sep">:</span>'
  html += '<input id="field-saldo-akhir" type="text" inputmode="numeric" pattern="[1-9][0-9]*" class="lap-field-input" placeholder="—" value="' + fldNum('saldo_akhir') + '"/>'
  html += '<span class="lap-field-unit">ltr</span>'
  html += '</div>'

  // Penerimaan BBM
  html += '<div class="lap-field-row">'
  html += '<label class="lap-field-label">Penerimaan BBM</label>'
  html += '<span class="lap-field-sep">:</span>'
  html += '<input id="field-penerimaan-bbm" type="text" inputmode="numeric" pattern="[0-9]*" class="lap-field-input" placeholder="0" value="' + fldNum('penerimaan_bbm') + '"/>'
  html += '<span class="lap-field-unit">ltr</span>'
  html += '</div>'

  // Pemakaian BBM
  html += '<div class="lap-field-row">'
  html += '<label class="lap-field-label">Pemakaian BBM</label>'
  html += '<span class="lap-field-sep">:</span>'
  html += '<input id="field-estimasi-bbm" type="text" inputmode="numeric" pattern="[0-9]*" class="lap-field-input" placeholder="auto" value="' + fldNum('estimasi_bbm_max') + '"/>'
  html += '<span class="lap-field-unit">ltr</span>'
  html += '</div>'

  // Helper render field oli: input angka + tombol silang
  function renderOliField(labelText, selectId, inputId, fieldKey) {
    var val      = currentLapForm[fieldKey]
    var isTM     = (val === 'tidak menggunakan')
    var hasAngka = (!isTM && val !== null && val !== undefined && val !== '')
    var angkaVal = hasAngka ? val : ''
    var html2    = ''
    html2 += '<div class="lap-field-row">'
    html2 += '<label class="lap-field-label">' + labelText + '</label>'
    html2 += '<span class="lap-field-sep">:</span>'
    // Input angka — tampil saat bukan TM
    html2 += '<input id="' + inputId + '" type="text" inputmode="numeric" pattern="[0-9]*" class="lap-field-input oli-angka-input" placeholder="0" value="' + angkaVal + '" style="' + (isTM ? 'display:none;' : '') + '"/>'
    html2 += '<span class="lap-field-unit" id="unit-' + inputId + '" style="' + (isTM ? 'display:none;' : '') + '">ltr</span>'
    // Tombol silang ✕ — tampil saat field kosong (bukan TM, bukan ada angka)
    html2 += '<button type="button" id="btn-tm-' + inputId + '" class="oli-x-btn" style="' + (isTM || hasAngka ? 'display:none;' : '') + '" onclick="oliSetTM(\'' + inputId + '\',\'' + fieldKey + '\')" title="Tidak Menggunakan">&#10005;</button>'
    // Label TM + tombol kembali — tampil saat TM
    html2 += '<span id="lbl-tm-' + inputId + '" class="oli-tm-label" style="' + (!isTM ? 'display:none;' : '') + '">Tidak Menggunakan <button type="button" class="oli-reset-btn" onclick="oliResetAngka(\'' + inputId + '\',\'' + fieldKey + '\')">&#8635;</button></span>'
    html2 += '<span id="hint-' + inputId + '" style="display:none;"></span>'
    html2 += '</div>'
    return html2
  }

  html += renderOliField('Stock Oli SAE 40',  'sel-stock-oli-sae40',   'field-stock-oli-sae40',   'stock_oli_sae40')
  html += renderOliField('Stock Oli SX',      'sel-stock-oli-sx',      'field-stock-oli-sx',      'stock_oli_sx')
  html += renderOliField('Stock Oli SX Plus', 'sel-stock-oli-sx-plus', 'field-stock-oli-sx-plus', 'stock_oli_sx_plus')

  // ── UPLOAD DOKUMEN ──
  var docPreview = ''
  if (currentLapForm.dokumen_url) {
    var isImg = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(currentLapForm.dokumen_nama||'')
    if (isImg) {
      docPreview = '<div id="doc-preview-wrap" style="margin-top:6px;"><img src="' + currentLapForm.dokumen_url + '" style="max-width:100%;max-height:180px;border-radius:6px;border:1px solid #e2e8f0;" alt="dokumen"/></div>'
    } else {
      docPreview = '<div id="doc-preview-wrap" style="margin-top:6px;"><a href="' + currentLapForm.dokumen_url + '" target="_blank" rel="noopener" style="color:#1d4ed8;font-size:0.82rem;"><i class="fas fa-file-pdf"></i> ' + (currentLapForm.dokumen_nama||'dokumen') + '</a></div>'
    }
  }
  html += '<div class="lap-field-row" style="flex-direction:column;align-items:flex-start;gap:6px;">'
  html += '<label class="lap-field-label" style="min-width:unset;">Upload Dokumen <span style="font-size:0.72rem;color:#94a3b8;">(maks 32MB)</span></label>'
  html += '<div style="display:flex;gap:8px;flex-wrap:wrap;">'
  // Tombol galeri — input file tanpa capture
  html += '<label class="btn-upload-opt" for="field-dokumen-galeri"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> Galeri</label>'
  html += '<input id="field-dokumen-galeri" type="file" accept="image/*" style="display:none;"/>'
  // Tombol kamera — buka modal kamera via getUserMedia
  html += '<button type="button" class="btn-upload-opt btn-upload-kamera" onclick="bukaModalKamera()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg> Kamera</button>'
  html += '</div>'
  html += docPreview
  html += '<div id="doc-progress-wrap" style="display:none;margin-top:4px;width:100%;"><div style="background:#e2e8f0;border-radius:4px;height:8px;overflow:hidden;"><div id="doc-progress-bar" style="height:100%;background:#22c55e;width:0%;transition:width 0.3s;"></div></div><span id="doc-progress-pct" style="font-size:0.72rem;color:#475569;">0%</span></div>'
  html += '<span id="doc-upload-status" style="font-size:0.75rem;color:#64748b;"></span>'
  html += '</div>'

  html += '</div>'

  // ── FOOTER ──
  html += '<div class="lap-single-footer"><span id="lap-save-status"></span>'
  html += '<button class="btn btn-success" onclick="saveLapCurrent()">Simpan Data</button></div>'
  html += '</div>'

  document.getElementById('lap-form-container').innerHTML = html

  // Attach event listeners via addEventListener (mobile-safe, tidak bergantung inline oninput)
  function attachNumericField(id, fieldKey, extraFn) {
    var el = document.getElementById(id)
    if (!el) return
    el.addEventListener('input', function() {
      this.value = this.value.replace(/[^0-9]/g, '')
      if (fieldKey === 'saldo_akhir' && this.value === '0') this.value = ''
      setLapField(fieldKey, this.value)
      if (extraFn) extraFn()
    })
    // 'change' event tambahan untuk beberapa browser HP yang hanya fire change
    el.addEventListener('change', function() {
      this.value = this.value.replace(/[^0-9]/g, '')
      if (fieldKey === 'saldo_akhir' && this.value === '0') this.value = ''
      setLapField(fieldKey, this.value)
      if (extraFn) extraFn()
    })
  }

  attachNumericField('field-saldo-awal',     'saldo_awal',      calcEstimasiBbm)
  attachNumericField('field-saldo-akhir',    'saldo_akhir',     calcEstimasiBbm)
  attachNumericField('field-penerimaan-bbm', 'penerimaan_bbm',  calcEstimasiBbm)
  attachNumericField('field-kwh-produksi',   'kwh_produksi',    null)
  attachNumericField('field-estimasi-bbm',   'estimasi_bbm_max',null)

  // Oil fields — harus angka atau "tidak menggunakan"
  // Attach input angka oli
  function attachOliInput(id, fieldKey) {
    var el = document.getElementById(id)
    if (!el) return
    el.addEventListener('input', function() {
      var v = this.value.replace(/[^0-9]/g, '')
      this.value = v
      var btnX = document.getElementById('btn-tm-' + id)
      if (v !== '') {
        setLapField(fieldKey, v)
        if (btnX) { btnX.style.display = 'none'; btnX.classList.remove('oli-x-btn-error') }
        this.classList.remove('input-error')
      } else {
        setLapField(fieldKey, null)
        if (btnX) btnX.style.display = ''
      }
    })
    el.addEventListener('focus', function() {
      this.classList.remove('input-error')
      var btnX = document.getElementById('btn-tm-' + id)
      if (btnX) btnX.classList.remove('oli-x-btn-error')
    })
  }

  attachOliInput('field-stock-oli-sae40',   'stock_oli_sae40')
  attachOliInput('field-stock-oli-sx',      'stock_oli_sx')
  attachOliInput('field-stock-oli-sx-plus', 'stock_oli_sx_plus')


  // ── Upload gambar langsung ke ImgBB dari browser ──
  var IMGBB_KEY = 'bb2f97ad9b31b5ae4967eeead61e03de'
  window._IMGBB_KEY = IMGBB_KEY

  window.handleFileUpload = function(file) {
      if (!file) return

      if (file.size > 32 * 1024 * 1024) {
        document.getElementById('doc-upload-status').textContent = '⚠ File terlalu besar (maks 32MB)'
        return
      }

      var statusEl = document.getElementById('doc-upload-status')
      var pwrap    = document.getElementById('doc-progress-wrap')
      var pbar     = document.getElementById('doc-progress-bar')
      var ppct     = document.getElementById('doc-progress-pct')

      statusEl.textContent = 'Membaca file...'
      if (pwrap) pwrap.style.display = 'block'
      if (pbar)  pbar.style.width = '10%'
      if (ppct)  ppct.textContent = '10%'

      var tanggal = document.getElementById('lap-tanggal').value
      var reader  = new FileReader()

      reader.onload = function(ev) {
        if (pbar) pbar.style.width = '30%'
        if (ppct) ppct.textContent = '30%'
        statusEl.textContent = 'Mengupload gambar...'

        var b64 = ev.target.result.split(',')[1]
        var fd  = new FormData()
        fd.append('key', IMGBB_KEY)
        fd.append('image', b64)
        fd.append('name', lapSelectedUnit + '_' + tanggal + '_' + file.name)

        var xhr = new XMLHttpRequest()
        xhr.open('POST', 'https://api.imgbb.com/1/upload', true)

        xhr.upload.onprogress = function(e) {
          if (e.lengthComputable) {
            var pct = 30 + Math.round(e.loaded / e.total * 60)
            if (pbar) pbar.style.width = pct + '%'
            if (ppct) ppct.textContent = pct + '%'
          }
        }

        xhr.onload = function() {
          if (pbar) pbar.style.width = '100%'
          if (ppct) ppct.textContent = '100%'
          var j
          try { j = JSON.parse(xhr.responseText) } catch(e2) { j = {} }

          if (!j.success) {
            if (pwrap) pwrap.style.display = 'none'
            statusEl.textContent = '⚠ Gagal upload: ' + (j.error && j.error.message || JSON.stringify(j.error || j))
            return
          }

          // Ambil ID dari j.data.url_viewer atau j.data.url lalu bentuk https://ibb.co.com/ID
          var _rawUrl = j.data.url_viewer || j.data.url || ''
          var _match  = _rawUrl.match(/ibb\.co(?:\.com)?\/([^\/\s]+)/)
          var imgUrl  = _match ? 'https://ibb.co.com/' + _match[1] : _rawUrl
          var imgName = j.data.title || file.name

          currentLapForm.dokumen_url  = imgUrl
          currentLapForm.dokumen_nama = imgName

          // Simpan URL + data form ke database via Worker
          fetch('/api/lap-operasional/dokumen', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              kode_unit:         lapSelectedKode,
              nama_unit:         lapSelectedUnit && lapSelectedUnit.nama_unit ? lapSelectedUnit.nama_unit : String(lapSelectedUnit || ''),
              tanggal:           tanggal,
              dokumen_url:       imgUrl,
              dokumen_nama:      imgName,
              nama_operator:     currentLapForm.nama_operator     || null,
              kwh_produksi:      currentLapForm.kwh_produksi      != null ? currentLapForm.kwh_produksi      : null,
              saldo_awal:        currentLapForm.saldo_awal        != null ? currentLapForm.saldo_awal        : null,
              saldo_akhir:       currentLapForm.saldo_akhir       != null ? currentLapForm.saldo_akhir       : null,
              penerimaan_bbm:    currentLapForm.penerimaan_bbm    != null ? currentLapForm.penerimaan_bbm    : null,
              estimasi_bbm_max:  currentLapForm.estimasi_bbm_max  != null ? currentLapForm.estimasi_bbm_max  : null,
              stock_oli_sae40:   currentLapForm.stock_oli_sae40   != null ? currentLapForm.stock_oli_sae40   : null,
              stock_oli_sx:      currentLapForm.stock_oli_sx      != null ? currentLapForm.stock_oli_sx      : null,
              stock_oli_sx_plus: currentLapForm.stock_oli_sx_plus != null ? currentLapForm.stock_oli_sx_plus : null
            })
          }).catch(function(){})

          // Catat ke Google Sheets via Worker
          fetch('/api/log-sheets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              kode_unit: lapSelectedKode,
              nama_unit: lapSelectedUnit && lapSelectedUnit.nama_unit ? lapSelectedUnit.nama_unit : String(lapSelectedUnit || ''),
              tanggal:   tanggal,
              fileName:  imgName,
              imgUrl:    imgUrl
            })
          }).catch(function(){})

          // Preview
          var wrap = document.getElementById('doc-preview-wrap')
          if (!wrap) {
            wrap = document.createElement('div'); wrap.id = 'doc-preview-wrap'; wrap.style.marginTop = '6px'
            statusEl.parentNode.insertBefore(wrap, statusEl)
          }
          wrap.innerHTML = '<img src="' + imgUrl + '" style="max-width:100%;max-height:200px;border-radius:8px;border:1px solid #e2e8f0;" alt="dokumen"/>'
          statusEl.innerHTML = '✓ <a href="' + imgUrl + '" target="_blank" style="color:#1d4ed8;">' + imgName + '</a> berhasil diupload'
        }
        xhr.onerror = function() {
          if (pwrap) pwrap.style.display = 'none'
          statusEl.textContent = '⚠ Gagal koneksi ke ImgBB'
        }
        xhr.send(fd)
      }
      reader.onerror = function() { statusEl.textContent = '⚠ Gagal membaca file' }
      reader.readAsDataURL(file)
  }

  // Attach galeri input
  var elGaleri = document.getElementById('field-dokumen-galeri')
  if (elGaleri) elGaleri.addEventListener('change', function() { handleFileUpload(this.files[0]); this.value = '' })

  // Recalculate after render so Pemakaian BBM always reflects current values
  setTimeout(calcEstimasiBbm, 0)
}

var OLI_FIELDS = ['stock_oli_sae40', 'stock_oli_sx', 'stock_oli_sx_plus']

// Klik ✕ → sembunyikan input, tampilkan label TM
function oliSetTM(inputId, fieldKey) {
  var inputEl = document.getElementById(inputId)
  var unitEl  = document.getElementById('unit-' + inputId)
  var btnX    = document.getElementById('btn-tm-' + inputId)
  var lblTM   = document.getElementById('lbl-tm-' + inputId)
  var hintEl  = document.getElementById('hint-' + inputId)
  if (inputEl) { inputEl.style.display = 'none'; inputEl.value = ''; inputEl.classList.remove('input-error') }
  if (unitEl)  unitEl.style.display = 'none'
  if (btnX)    { btnX.style.display = 'none'; btnX.classList.remove('oli-x-btn-error') }
  if (lblTM)   lblTM.style.display  = ''
  if (hintEl)  hintEl.style.display = 'none'
  setLapField(fieldKey, 'tidak menggunakan')
}

// Klik ↺ di label TM → kembali ke mode input angka
function oliResetAngka(inputId, fieldKey) {
  var inputEl = document.getElementById(inputId)
  var unitEl  = document.getElementById('unit-' + inputId)
  var btnX    = document.getElementById('btn-tm-' + inputId)
  var lblTM   = document.getElementById('lbl-tm-' + inputId)
  if (inputEl) { inputEl.style.display = ''; inputEl.value = ''; inputEl.focus() }
  if (unitEl)  unitEl.style.display = ''
  if (btnX)    btnX.style.display   = ''    // field kosong → tampilkan ✕
  if (lblTM)   lblTM.style.display  = 'none'
  setLapField(fieldKey, null)
}

function setLapField(field, value) {
  if (OLI_FIELDS.indexOf(field) !== -1) {
    // Kosong → simpan "tidak menggunakan", ada isi → simpan apa adanya
    currentLapForm[field] = (value === '' || value === null || value === undefined) ? 'tidak menggunakan' : value
  } else if (field === 'nama_operator') {
    currentLapForm[field] = value === '' ? null : value
  } else {
    var clean = value.replace(/[^0-9]/g, '')
    currentLapForm[field] = clean === '' ? null : parseInt(clean, 10)
  }
}

// Tampilkan dropdown operator
function showOpDropdown() {
  var dd = document.getElementById('op-dropdown')
  if (dd) dd.classList.remove('hidden')
}

// Filter item dropdown saat user mengetik
function filterOpDropdown(val) {
  var dd = document.getElementById('op-dropdown')
  if (!dd) return
  dd.classList.remove('hidden')
  var items = dd.querySelectorAll('.op-item')
  // Cari berdasarkan teks terakhir (setelah koma terakhir)
  var parts = val.split(',')
  var q = parts[parts.length - 1].trim().toLowerCase()
  items.forEach(function(item) {
    var name = item.querySelector('span').textContent.toLowerCase()
    item.style.display = (q === '' || name.includes(q)) ? '' : 'none'
  })
}

// Toggle pilih/batal operator (multi-select checkbox)
function toggleOperator(nama, checked) {
  var el = document.getElementById('field-nama-operator')
  if (!el) return
  var current = el.value.split(',').map(function(s){ return s.trim() }).filter(Boolean)
  if (checked) {
    if (current.indexOf(nama) === -1) current.push(nama)
  } else {
    current = current.filter(function(n){ return n !== nama })
  }
  var joined = current.join(', ')
  el.value = joined
  setLapField('nama_operator', joined)
}

// Hitung Pemakaian BBM:
// Jika Penerimaan BBM terisi → Saldo Awal + Penerimaan BBM - Saldo Akhir
// Jika tidak              → Saldo Awal - Saldo Akhir
function calcEstimasiBbm() {
  var awal       = parseInt(document.getElementById('field-saldo-awal')?.value       || '', 10)
  var akhir      = parseInt(document.getElementById('field-saldo-akhir')?.value      || '', 10)
  var penerimaan = parseInt(document.getElementById('field-penerimaan-bbm')?.value   || '', 10)
  // Butuh minimal saldo_awal dan saldo_akhir agar bisa hitung
  if (!isNaN(awal) && !isNaN(akhir)) {
    var pen    = isNaN(penerimaan) ? 0 : penerimaan
    // Jika Penerimaan BBM terisi: Pemakaian = Saldo Awal + Penerimaan - Saldo Akhir
    // Jika tidak: Pemakaian = Saldo Awal - Saldo Akhir
    var hasil  = Math.max(0, awal + pen - akhir)
    var elEstimasi = document.getElementById('field-estimasi-bbm')
    if (elEstimasi) elEstimasi.value = hasil
    currentLapForm.estimasi_bbm_max = hasil
  }
}

// Auto-fill Saldo Awal dari STOCK AWAL tab HOP BBM tanggal H-1
async function autoFillSaldoAwal(tanggal) {
  if (!lapSelectedKode || !tanggal) return
  try {
    var tglH1 = new Date(tanggal)
    tglH1.setDate(tglH1.getDate() - 1)
    var tanggalH1 = tglH1.toISOString().split('T')[0]
    var resStok = await fetch('/api/data-stok?tanggal=' + tanggalH1)
    var jsonStok = await resStok.json()
    if (jsonStok.success && jsonStok.data) {
      var unitRow = jsonStok.data.find(function(r) { return r.kode_unit === lapSelectedKode })
      if (unitRow && unitRow.stok_awal !== null && unitRow.stok_awal !== undefined) {
        currentLapForm.saldo_awal = unitRow.stok_awal
        // Update field jika form sudah dirender
        var el = document.getElementById('field-saldo-awal')
        if (el) el.value = unitRow.stok_awal
      }
    }
  } catch(e2) { /* gagal fetch, biarkan kosong */ }
}

// Saat tanggal berubah: fetch data → jika sudah ada tampilkan review, jika belum tampilkan form
async function onLapTanggalChange() {
  var tanggal = document.getElementById('lap-tanggal').value
  if (!lapSelectedKode || !tanggal) return
  showLoading(true, 'loading-indicator-lap')
  try {
    var res  = await fetch('/api/lap-operasional?tanggal=' + tanggal + '&kode_unit=' + lapSelectedKode)
    var json = await res.json()
    if (!json.success) throw new Error(json.error)
    lapData = {}
    for (var i = 0; i < json.data.length; i++) {
      var row = json.data[i]
      lapData[row.kode_unit] = {
        nama_operator: row.nama_operator,
        kwh_produksi: row.kwh_produksi,
        saldo_awal: row.saldo_awal,
        saldo_akhir: row.saldo_akhir,
        penerimaan_bbm: row.penerimaan_bbm,
        estimasi_bbm_max: row.estimasi_bbm_max,
        stock_oli_sae40: row.stock_oli_sae40,
        stock_oli_sx: row.stock_oli_sx,
        stock_oli_sx_plus: row.stock_oli_sx_plus,
        dokumen_url:  row.dokumen_url  || null,
        dokumen_nama: row.dokumen_nama || null
      }
    }
    if (lapData[lapSelectedKode]) {
      // Data sudah ada → tampilkan review langsung
      currentLapForm = JSON.parse(JSON.stringify(lapData[lapSelectedKode]))
      lastSavedData  = JSON.parse(JSON.stringify(currentLapForm))
      renderReview(lapSelectedUnit, tanggal, currentLapForm)
      showLapState('review')
    } else {
      // Belum ada data → tampilkan form kosong, user wajib isi oli
      currentLapForm = {}
      currentLapForm.stock_oli_sae40   = null
      currentLapForm.stock_oli_sx      = null
      currentLapForm.stock_oli_sx_plus = null
      currentLapForm.saldo_awal = null
      await autoFillSaldoAwal(tanggal)
      renderLapForm()
      showLapState('form')
    }
  } catch(e) {
    showToast('Gagal memuat data: ' + e.message, 'error')
  } finally {
    showLoading(false, 'loading-indicator-lap')
  }
}

async function loadLapData() {
  if (!lapSelectedKode) { showToast('Pilih unit terlebih dahulu','info'); return }
  var tanggal = document.getElementById('lap-tanggal').value
  if (!tanggal) { showToast('Pilih tanggal terlebih dahulu','info'); return }
  showLoading(true,'loading-indicator-lap')
  try {
    var res  = await fetch('/api/lap-operasional?tanggal=' + tanggal + '&kode_unit=' + lapSelectedKode)
    var json = await res.json()
    if (!json.success) throw new Error(json.error)
    lapData = {}
    for (var i = 0; i < json.data.length; i++) {
      var row = json.data[i]
      lapData[row.kode_unit] = {
        nama_operator: row.nama_operator,
        kwh_produksi: row.kwh_produksi,
        saldo_awal: row.saldo_awal,
        saldo_akhir: row.saldo_akhir,
        penerimaan_bbm: row.penerimaan_bbm,
        estimasi_bbm_max: row.estimasi_bbm_max,
        stock_oli_sae40: row.stock_oli_sae40,
        stock_oli_sx: row.stock_oli_sx,
        stock_oli_sx_plus: row.stock_oli_sx_plus,
        dokumen_url:  row.dokumen_url  || null,
        dokumen_nama: row.dokumen_nama || null
      }
    }
    var cnt = json.data.length
    document.getElementById('info-lap-record').textContent = cnt > 0 ? cnt + ' unit sudah ada data' : 'Belum ada data untuk ' + tanggal
    if (lapSelectedKode) {
      currentLapForm = lapData[lapSelectedKode] ? JSON.parse(JSON.stringify(lapData[lapSelectedKode])) : {}

      // Jika saldo_awal belum ada (form kosong), auto-isi dari STOCK AWAL HOP BBM tanggal H-1
      if (currentLapForm.saldo_awal === undefined || currentLapForm.saldo_awal === null) {
        await autoFillSaldoAwal(tanggal)
      }

      renderLapForm()
    }
    showToast('Data ' + tanggal + ' dimuat','info')
  } catch(e) { showToast('Gagal memuat data: ' + e.message,'error') }
  finally { showLoading(false,'loading-indicator-lap') }
}

function validateLapForm() {
  var d = currentLapForm
  var errors = []
  if (!d.nama_operator || d.nama_operator.trim() === '') { errors.push('Nama Operator'); highlightError('field-nama-operator') }
  if (d.saldo_awal === null || d.saldo_awal === undefined || d.saldo_awal === '') { errors.push('Saldo Awal'); highlightError('field-saldo-awal') }
  if (d.kwh_produksi === null || d.kwh_produksi === undefined || d.kwh_produksi === '') { errors.push('kWh Produksi'); highlightError('field-kwh-produksi') }
  if (d.saldo_akhir === null || d.saldo_akhir === undefined || d.saldo_akhir === '') { errors.push('Saldo Akhir'); highlightError('field-saldo-akhir') }
  if (d.estimasi_bbm_max === null || d.estimasi_bbm_max === undefined || d.estimasi_bbm_max === '') { errors.push('Pemakaian BBM'); highlightError('field-estimasi-bbm') }
  // Validasi oli: wajib diisi angka atau "tidak menggunakan"
  function validOli(val) {
    if (val === null || val === undefined || val === '') return false
    if (val === 'tidak menggunakan') return true
    if (/^[0-9]+$/.test(String(val))) return true
    return false
  }
  function highlightOliError(inputId) {
    // highlight border merah di input angka
    var el = document.getElementById(inputId)
    if (el && el.style.display !== 'none') el.classList.add('input-error')
    // highlight tombol ✕ jadi merah terang + shake
    var btnX = document.getElementById('btn-tm-' + inputId)
    if (btnX && btnX.style.display !== 'none') btnX.classList.add('oli-x-btn-error')
  }
  if (!validOli(d.stock_oli_sae40))   { errors.push('Stock Oli SAE 40');  highlightOliError('field-stock-oli-sae40') }
  if (!validOli(d.stock_oli_sx))      { errors.push('Stock Oli SX');       highlightOliError('field-stock-oli-sx') }
  if (!validOli(d.stock_oli_sx_plus)) { errors.push('Stock Oli SX Plus');  highlightOliError('field-stock-oli-sx-plus') }
  return errors
}

function highlightError(fieldId) {
  var el = document.getElementById(fieldId)
  if (!el) return
  el.classList.add('input-error')
  el.addEventListener('input', function() { el.classList.remove('input-error') }, { once: true })
}

async function saveLapCurrent() {
  if (!lapSelectedKode || !lapSelectedUnit) { showToast('Pilih unit terlebih dahulu','info'); return }
  var tanggal = document.getElementById('lap-tanggal').value
  if (!tanggal) { showToast('Pilih tanggal terlebih dahulu','info'); return }
  var errors = validateLapForm()
  if (errors.length > 0) { showToast('Wajib diisi: ' + errors.join(', '),'error'); return }

  var unit = lapSelectedUnit

  var btnSave = document.getElementById('btn-save-lap')
  if (btnSave) { btnSave.disabled = true; btnSave.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...' }
  var footerBtn = document.querySelector('#lap-form-container .lap-single-footer .btn-success')
  if (footerBtn) { footerBtn.disabled = true; footerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...' }

  var d = currentLapForm
  var payload = {
    kode_unit: unit.kode_unit,
    nama_unit: unit.nama_unit,
    tanggal: tanggal,
    nama_operator: d.nama_operator || '',
    kwh_produksi: d.kwh_produksi !== undefined ? d.kwh_produksi : null,
    saldo_awal: d.saldo_awal !== undefined ? d.saldo_awal : null,
    saldo_akhir: d.saldo_akhir !== undefined ? d.saldo_akhir : null,
    penerimaan_bbm: d.penerimaan_bbm !== undefined ? d.penerimaan_bbm : null,
    estimasi_bbm_max: d.estimasi_bbm_max !== undefined ? d.estimasi_bbm_max : null,
    stock_oli_sae40: (d.stock_oli_sae40 !== undefined && d.stock_oli_sae40 !== null && d.stock_oli_sae40 !== '') ? d.stock_oli_sae40 : 'tidak menggunakan',
    stock_oli_sx: (d.stock_oli_sx !== undefined && d.stock_oli_sx !== null && d.stock_oli_sx !== '') ? d.stock_oli_sx : 'tidak menggunakan',
    stock_oli_sx_plus: (d.stock_oli_sx_plus !== undefined && d.stock_oli_sx_plus !== null && d.stock_oli_sx_plus !== '') ? d.stock_oli_sx_plus : 'tidak menggunakan'
  }

  try {
    var res  = await fetch('/api/lap-operasional', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
    var json = await res.json()
    if (!json.success) throw new Error(json.error)
    // Simpan URL dokumen Drive ke DB (jika sudah diupload ke GAS)
    if (currentLapForm.dokumen_url) {
      try {
        await fetch('/api/lap-operasional/dokumen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kode_unit:    unit.kode_unit,
            tanggal:      tanggal,
            dokumen_url:  currentLapForm.dokumen_url,
            dokumen_nama: currentLapForm.dokumen_nama
          })
        })
      } catch(e2) { /* gagal simpan url dokumen, abaikan */ }
    }
    lapData[lapSelectedKode] = JSON.parse(JSON.stringify(currentLapForm))
    lastSavedData = JSON.parse(JSON.stringify(currentLapForm))
    showToast(unit.nama_unit + ' berhasil disimpan!','success')
    renderReview(unit, tanggal, d)
    showLapState('review')
    // Langsung buka URL WA setelah simpan berhasil
    var ts = Date.now()
    window.open('https://api.whatsapp.com/send?phone=6282252147896&text=' + encodeURIComponent(currentTeksLaporan) + '&_ts=' + ts, '_blank')
  } catch(e) {
    showToast('Gagal menyimpan: ' + e.message,'error')
    if (btnSave) { btnSave.disabled = false; btnSave.innerHTML = '<i class="fas fa-save"></i> Simpan Data' }
    if (footerBtn) { footerBtn.disabled = false; footerBtn.innerHTML = '<i class="fas fa-save"></i> Simpan Data' }
  }
}

function renderReview(unit, tanggal, d) {
  var tglParts      = tanggal.split('-')
  var tglDate       = new Date(tglParts[0], tglParts[1] - 1, tglParts[2])
  var tglFormatted  = tglDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
  var kodeFormatted = String(unit.kode_unit).padStart(4,'0')

  function fmtNum(val) {
    if (val === null || val === undefined || val === '') return '-'
    return Number(val).toLocaleString('id-ID')
  }
  function fmtNumPlain(val) {
    if (val === null || val === undefined || val === '') return '-'
    return String(Number(val))
  }
  function fmtStr(val) { return (!val || val.trim() === '') ? '-' : val }
  function fmtOli(val) {
    if (!val || val === '') return 'tidak menggunakan'
    // Jika nilai angka, tambahkan satuan ltr
    return isNaN(val) ? val : val + ' ltr'
  }

  // Baca nilai penerimaan_bbm: DOM input > currentLapForm > default 0
  var elPenBbm = document.getElementById('field-penerimaan-bbm')
  var penBbmRaw = elPenBbm ? elPenBbm.value.trim() : (d.penerimaan_bbm != null ? String(d.penerimaan_bbm) : '')
  var penBbmTeks = (penBbmRaw !== '' && !isNaN(penBbmRaw)) ? String(Number(penBbmRaw)) : '0'

  var savedAt = new Date().toLocaleString('id-ID', { dateStyle:'long', timeStyle:'short' })
  var teksLaporan =
    'LAPORAN OPERASIONAL PLTD\n' +
    unit.nama_unit + '\n' +
    'ID Unit: ' + kodeFormatted + '\n' +
    'Tgl : ' + tanggal + '\n' +
    'Nama Operator: ' + fmtStr(d.nama_operator) + '\n\n' +
    'kWh Produksi : ' + fmtNumPlain(d.kwh_produksi) + '\n' +
    'Saldo Awal : ' + fmtNumPlain(d.saldo_awal) + '\n' +
    'Saldo Akhir : ' + fmtNumPlain(d.saldo_akhir) + '\n' +
    'Penerimaan BBM : ' + penBbmTeks + '\n' +
    'Estimasi Pemakaian BBM Maksimal : ' + fmtNumPlain(d.estimasi_bbm_max)

  var html = '<div class="review-wrap">'
  html += '<div class="review-kop"><div class="review-kop-left">'
  html += '<div><div class="review-kop-title">LAPORAN OPERASIONAL PLTD</div></div></div>'
  html += '</div>'
  html += '<div class="review-divider"></div>'
  html += '<div class="review-identity"><div class="review-unit-name">' + unit.nama_unit + '</div>'
  html += '<table class="review-id-table">'
  html += '<tr><td class="rid-label">ID Unit</td><td class="rid-val">' + kodeFormatted + '</td></tr>'
  html += '<tr><td class="rid-label">Tanggal</td><td class="rid-val">' + tglFormatted + '</td></tr>'
  html += '<tr><td class="rid-label">Nama Operator</td><td class="rid-val">' + fmtStr(d.nama_operator) + '</td></tr>'
  html += '</table></div>'
  html += '<div class="review-divider"></div>'
  html += '<div class="review-data-section">'
  html += '<table class="review-data-table">'
  html += '<tr><td class="rdt-label">kWh Produksi</td><td class="rdt-val">' + fmtNum(d.kwh_produksi) + ' <span class="rdt-unit">kWh</span></td></tr>'
  html += '<tr><td class="rdt-label">Saldo Awal</td><td class="rdt-val">' + fmtNum(d.saldo_awal) + ' <span class="rdt-unit">ltr</span></td></tr>'
  html += '<tr><td class="rdt-label">Saldo Akhir</td><td class="rdt-val">' + fmtNum(d.saldo_akhir) + ' <span class="rdt-unit">ltr</span></td></tr>'
  html += '<tr><td class="rdt-label">Penerimaan BBM</td><td class="rdt-val">' + fmtNum(d.penerimaan_bbm) + ' <span class="rdt-unit">ltr</span></td></tr>'
  html += '<tr><td class="rdt-label">Pemakaian BBM</td><td class="rdt-val">' + fmtNum(d.estimasi_bbm_max) + ' <span class="rdt-unit">ltr</span></td></tr>'
  html += '<tr><td class="rdt-label">Stock Oli SAE 40</td><td class="rdt-val">' + fmtOli(d.stock_oli_sae40) + '</td></tr>'
  html += '<tr><td class="rdt-label">Stock Oli SX</td><td class="rdt-val">' + fmtOli(d.stock_oli_sx) + '</td></tr>'
  html += '<tr class="rdt-last"><td class="rdt-label">Stock Oli SX Plus</td><td class="rdt-val">' + fmtOli(d.stock_oli_sx_plus) + '</td></tr>'
  html += '</table></div>'

  html += '<div class="review-divider"></div>'
  html += '<div class="review-footer"><div class="review-save-info"><i class="fas fa-clock"></i> Disimpan: ' + savedAt + '</div>'
  html += '<div class="review-actions">'
  html += '<button class="btn btn-outline-dark" onclick="backToForm()"><i class="fas fa-pen"></i> Edit</button>'
  currentTeksLaporan = teksLaporan

  html += '</div></div></div>'

  document.getElementById('lap-review-container').innerHTML = html
}

function backToForm() { showLapState('form'); renderLapForm() }

function kirimLaporan() {
  document.getElementById('kirim-preview-text').textContent = currentTeksLaporan
  document.getElementById('modal-kirim').classList.remove('hidden')
}

function copyKirimText() {
  var teks = document.getElementById('kirim-preview-text').textContent
  if (navigator.clipboard) {
    navigator.clipboard.writeText(teks).then(function() { showToast('Teks berhasil disalin!','success') }).catch(function() { fallbackCopy(teks) })
  } else { fallbackCopy(teks) }
}

function fallbackCopy(teks) {
  var ta = document.createElement('textarea')
  ta.value = teks; ta.style.position='fixed'; ta.style.opacity='0'
  document.body.appendChild(ta); ta.select(); document.execCommand('copy')
  document.body.removeChild(ta); showToast('Teks berhasil disalin!','success')
}

async function kirimWhatsApp() {
  // Rebuild teks fresh dari state aktif saat tombol diklik
  var tanggal = document.getElementById('sel-tanggal').value
  var periode = document.getElementById('sel-periode').value
  if (!tanggal || !periode || !monSelectedUnit || mesinList.length === 0) {
    showToast('Tidak ada data','info'); return
  }
  var records = []
  for (var i = 0; i < mesinList.length; i++) {
    var m = mesinList[i]
    var d = Object.assign({}, currentData[m.id_mesin] || { status_mesin: 'Operasi' })
    d.mesin_id  = m.id_mesin
    d.terpasang = m.terpasang !== undefined ? m.terpasang : null
    records.push(d)
  }
  var teks = await buildWAFromMemory(tanggal, periode, monSelectedUnit, records)
  if (!teks) { showToast('Tidak ada data','info'); return }
  // Update popup supaya sesuai
  document.getElementById('kirim-preview-text').textContent = teks
  // Buka WA app via wa.me — official deep link yang support pre-filled text
  // Gunakan window.location.href agar OS langsung intercept dan buka WA app
  // tanpa melalui tab browser baru yang bisa di-cache
  var encoded = encodeURIComponent(teks)
  window.location.href = 'https://wa.me/6282252147896?text=' + encoded
}

async function showRiwayatLap() {
  var list = document.getElementById('riwayat-lap-list')
  list.innerHTML = '<div style="text-align:center;padding:16px;color:#94a3b8"><span class="spinner"></span> Memuat...</div>'
  document.getElementById('modal-riwayat-lap').classList.remove('hidden')
  try {
    var res  = await fetch('/api/lap-operasional/tanggal')
    var json = await res.json()
    if (!json.success) throw new Error(json.error)
    if (json.data.length === 0) { list.innerHTML = '<div style="text-align:center;padding:16px;color:#94a3b8">Belum ada data tersimpan</div>'; return }
    var html = ''
    for (var i = 0; i < json.data.length; i++) {
      var tgl = json.data[i].tanggal
      html += '<button class="riwayat-btn" onclick="selectRiwayatLap(\'' + tgl + '\')"><i class="fas fa-calendar-day"></i><span>' + tgl + '</span></button>'
    }
    list.innerHTML = html
  } catch(e) { list.innerHTML = '<div style="text-align:center;padding:16px;color:#dc2626">Gagal memuat</div>' }
}

async function selectRiwayatLap(tanggal) {
  document.getElementById('lap-tanggal').value = tanggal
  closeModal('modal-riwayat-lap')
  await loadLapData()
}

// =============================================
// UTILS
// =============================================
// =============================================
// ===== TAB: DATA =====
// =============================================

var dataTableInited = false
var currentDataView = 'hop-bbm'  // 'hop-bbm' atau 'stock-oli'
var oliTableInited  = false

function switchDataView(view) {
  currentDataView = view
  // Update active state of sub-tab buttons
  document.getElementById('subtab-btn-hop-bbm').classList.toggle('active', view === 'hop-bbm')
  document.getElementById('subtab-btn-stock-oli').classList.toggle('active', view === 'stock-oli')
  var tanggal = document.getElementById('data-tanggal').value
  if (view === 'hop-bbm') {
    document.getElementById('data-table-wrap').classList.remove('hidden')
    document.getElementById('oli-table-wrap').classList.add('hidden')
    if (tanggal) loadDataTab()
  } else {
    document.getElementById('data-table-wrap').classList.add('hidden')
    document.getElementById('oli-table-wrap').classList.remove('hidden')
    if (tanggal) loadStockOliTab()
  }
}

function onDataTanggalChange() {
  if (currentDataView === 'hop-bbm') loadDataTab()
  else loadStockOliTab()
}

async function loadStockOliTab() {
  var tanggal = document.getElementById('data-tanggal').value
  if (!tanggal) { showToast('Pilih tanggal terlebih dahulu', 'info'); return }

  // Render header sekali saja
  if (!oliTableInited) {
    var cols = ['NO', 'ULD', 'OLI SAE 40', 'OLI SX', 'OLI SX PLUS']
    var headHTML = '<tr>'
    for (var i = 0; i < cols.length; i++) {
      var sticky = i < 2 ? 'position:sticky;left:' + (i===0?'0':'24px') + ';z-index:2;' : ''
      var align  = i === 1 ? 'text-align:left;' : 'text-align:center;'
      var w      = i === 0 ? 'width:24px;min-width:24px;max-width:24px;padding:8px 4px;border-right:1px solid rgba(255,255,255,0.2);' : 'padding:8px 14px;'
      headHTML += '<th style="background:#1e3a5f;color:#fff;white-space:nowrap;font-size:0.72rem;' + align + w + sticky + '">' + cols[i] + '</th>'
    }
    headHTML += '</tr>'
    document.getElementById('oli-table-head').innerHTML = headHTML
    document.getElementById('data-state-empty').style.display = 'none'
    document.getElementById('oli-table-wrap').classList.remove('hidden')
    oliTableInited = true
  }

  showLoading(true, 'loading-indicator-data')
  try {
    var res  = await fetch('/api/stock-oli?tanggal=' + tanggal)
    var json = await res.json()
    if (!json.success) throw new Error(json.error)
    var rows = json.data || []

    function fmtOliVal(val) {
      if (val === null || val === undefined) return '<span style="color:#cbd5e1">\u2014</span>'
      if (val === '' || val === 'tidak menggunakan') return '<span style="color:#94a3b8;font-style:italic;">tidak menggunakan</span>'
      if (!isNaN(Number(val))) return Number(val).toLocaleString('id-ID') + ' ltr'
      return val
    }

    var bodyHTML = ''
    for (var r = 0; r < rows.length; r++) {
      var d   = rows[r]
      var bg  = r % 2 === 0 ? '#fff' : '#f8fafc'
      bodyHTML += '<tr style="background:' + bg + ';border-bottom:1px solid #e2e8f0;">'
      bodyHTML += '<td style="width:24px;min-width:24px;max-width:24px;padding:4px;text-align:center;font-size:0.7rem;position:sticky;left:0;background:' + bg + ';z-index:1;border-right:1px solid #e2e8f0;">' + d.no + '</td>'
      bodyHTML += '<td style="padding:7px 10px;white-space:nowrap;font-size:0.78rem;font-weight:600;color:#1e3a5f;text-align:left;position:sticky;left:24px;background:' + bg + ';z-index:1;">' + d.nama_unit + '</td>'
      bodyHTML += '<td style="padding:7px 14px;text-align:center;font-size:0.78rem;">' + fmtOliVal(d.sae40) + '</td>'
      bodyHTML += '<td style="padding:7px 14px;text-align:center;font-size:0.78rem;">' + fmtOliVal(d.sx) + '</td>'
      bodyHTML += '<td style="padding:7px 14px;text-align:center;font-size:0.78rem;">' + fmtOliVal(d.sx_plus) + '</td>'
      bodyHTML += '</tr>'
    }
    document.getElementById('oli-table-body').innerHTML = bodyHTML
    document.getElementById('info-data-record').textContent = rows.length + ' unit'
  } catch(e) {
    showToast('Gagal memuat data: ' + e.message, 'error')
  } finally {
    showLoading(false, 'loading-indicator-data')
  }
}

function initDataTable() {
  if (dataTableInited) return
  var cols = ['NO','ULD','JALUR','KAPASITAS','SALDO AWAL BULAN','SALDO AKHIR',
              'STOCK MATI','STOCK BERSIH','PEMAKAIAN TERTINGGI',
              'DAYA TAMPUNG','BBM SIAP KIRIM','SAFETY STOCK',
              'ESTIMASI BBM HABIS','KONDISI STOCK']
  var headHTML = '<tr>'
  for (var i = 0; i < cols.length; i++) {
    var stickyStyle = i < 2 ? 'position:sticky;left:' + (i===0?'0':'24px') + ';z-index:2;' : ''
    var thExtra = i === 0 ? 'width:24px;min-width:24px;max-width:24px;padding:8px 4px;border-right:1px solid rgba(255,255,255,0.2);' : 'padding:8px 10px;'
    var thAlign = 'text-align:center;'
    var thWidth  = i === 2 ? 'min-width:198px;' : ''
    headHTML += '<th style="background:#1e3a5f;color:#fff;white-space:nowrap;font-size:0.72rem;' + thAlign + thWidth + thExtra + stickyStyle + '">' + cols[i] + '</th>'
  }
  headHTML += '</tr>'
  document.getElementById('data-table-head').innerHTML = headHTML
  document.getElementById('data-state-empty').style.display = 'none'
  document.getElementById('data-table-wrap').classList.remove('hidden')
  dataTableInited = true
}

function fmtData(val) {
  if (val === null || val === undefined) return '<span style="color:#cbd5e1">—</span>'
  return Number(val).toLocaleString('id-ID')
}

async function loadDataTab() {
  var tanggal = document.getElementById('data-tanggal').value
  if (!tanggal) { showToast('Pilih tanggal terlebih dahulu', 'info'); return }

  // Render header hanya sekali, body saja yang diupdate
  initDataTable()
  showLoading(true, 'loading-indicator-data')

  try {
    var res  = await fetch('/api/data-stok?tanggal=' + tanggal)
    var json = await res.json()
    if (!json.success) throw new Error(json.error)
    var rows = json.data || []

    var bodyHTML = ''
    for (var r = 0; r < rows.length; r++) {
      var d = rows[r]
      var kondisiColor = '#475569'
      if (d.kondisi_stock === 'KRITIS')      kondisiColor = '#ef4444'
      else if (d.kondisi_stock === 'SIAGA')  kondisiColor = '#eab308'
      else if (d.kondisi_stock === 'AMAN')   kondisiColor = '#22c55e'

      bodyHTML += '<tr style="background:#fff;border-bottom:1px solid #e2e8f0;">'
      bodyHTML += '<td style="width:24px;min-width:24px;max-width:24px;padding:4px;text-align:center;font-size:0.7rem;position:sticky;left:0;background:#fff;z-index:1;border-right:1px solid #e2e8f0;">' + (r + 1) + '</td>'
      var uldColor = (d.stok_awal === null || d.stok_awal === undefined) ? '#94a3b8' : '#1e3a5f'
      bodyHTML += '<td style="padding:7px 10px;white-space:nowrap;font-size:0.78rem;font-weight:600;color:' + uldColor + ';text-align:left;position:sticky;left:24px;background:#fff;z-index:1;">' + d.nama_unit + '</td>'
      bodyHTML += '<td style="padding:7px 10px;text-align:left;font-size:0.78rem;min-width:198px;white-space:nowrap;">' + (d.jalur || '—') + '</td>'
      bodyHTML += '<td style="padding:7px 10px;text-align:right;font-size:0.78rem;">' + fmtData(d.kapasitas_tangki) + '</td>'
      bodyHTML += '<td style="padding:7px 10px;text-align:right;font-size:0.78rem;">' + fmtData(d.stok_awal_bulan) + '</td>'
      bodyHTML += '<td style="padding:7px 10px;text-align:right;font-size:0.78rem;">' + fmtData(d.stok_awal) + '</td>'
      bodyHTML += '<td style="padding:7px 10px;text-align:right;font-size:0.78rem;">' + fmtData(d.stock_mati) + '</td>'
      bodyHTML += '<td style="padding:7px 10px;text-align:right;font-size:0.78rem;font-weight:600;">' + fmtData(d.stock_bersih) + '</td>'
      bodyHTML += '<td style="padding:7px 10px;text-align:right;font-size:0.78rem;">' + fmtData(d.rata_rata_harian) + '</td>'
      bodyHTML += '<td style="padding:7px 10px;text-align:right;font-size:0.78rem;">' + (d.daya_tampung_storage !== null && d.daya_tampung_storage !== undefined ? Math.round(d.daya_tampung_storage * 100) + '%' : '<span style="color:#cbd5e1">—</span>') + '</td>'
      bodyHTML += '<td style="padding:7px 10px;text-align:right;font-size:0.78rem;font-weight:600;">' + fmtData(d.bbm_siap_kirim) + '</td>'
      var ssBg = ''
      if (d.safety_stock !== null && d.safety_stock !== undefined) {
        if (d.safety_stock < 5)                              ssBg = 'background:#ef4444;color:#fff;'
        else if (d.safety_stock >= 5 && d.safety_stock <= 7) ssBg = 'background:#eab308;color:#fff;'
        else                                                  ssBg = 'background:#22c55e;color:#fff;'
      }
      bodyHTML += '<td style="padding:7px 10px;text-align:right;font-size:0.78rem;font-weight:600;' + ssBg + '">' + fmtData(d.safety_stock) + '</td>'
      var fmtEst = '—'
      if (d.estimasi_bbm_habis) {
        var eParts = d.estimasi_bbm_habis.split('-')
        var BULAN_ID = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
        fmtEst = parseInt(eParts[2],10) + ' ' + BULAN_ID[parseInt(eParts[1],10)-1] + ' ' + eParts[0]
      }
      bodyHTML += '<td style="padding:7px 10px;text-align:center;font-size:0.78rem;">' + fmtEst + '</td>'
      bodyHTML += '<td style="padding:7px 10px;text-align:center;font-size:0.78rem;font-weight:700;color:' + kondisiColor + ';">' + d.kondisi_stock + '</td>'
      bodyHTML += '</tr>'
    }
    document.getElementById('data-table-body').innerHTML = bodyHTML
    document.getElementById('info-data-record').textContent = rows.length + ' unit'

  } catch(e) {
    showToast('Gagal memuat data: ' + e.message, 'error')
  } finally {
    showLoading(false, 'loading-indicator-data')
  }
}

function closeModal(id) { document.getElementById(id).classList.add('hidden') }

function showLoading(show, id) {
  var el = document.getElementById(id)
  if (el) el.classList.toggle('hidden', !show)
}

function showToast(msg, type) {
  type = type || 'info'
  var container = document.getElementById('toast')
  var el = document.createElement('div')
  el.className = 'toast-item toast-' + type
  var icon = type === 'success' ? 'check-circle' : type === 'error' ? 'circle-xmark' : 'info-circle'
  el.innerHTML = '<i class="fas fa-' + icon + '"></i> ' + msg
  container.appendChild(el)
  setTimeout(function(){ el.remove() }, 3500)
}

document.addEventListener('click', function(e) {
  // Tutup modal jika klik di luar
  var modals = document.querySelectorAll('.modal-overlay')
  modals.forEach(function(modal) {
    if (e.target === modal) modal.classList.add('hidden')
  })
  // Tutup dropdown operator jika klik di luar op-input-wrap
  var wrap = document.getElementById('op-input-wrap')
  var dd   = document.getElementById('op-dropdown')
  if (dd && wrap && !wrap.contains(e.target)) {
    dd.classList.add('hidden')
  }
})
