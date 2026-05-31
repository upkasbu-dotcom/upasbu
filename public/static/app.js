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
  366: ["Eko Setiawan", "Syamsuri", "Dolarman", "Hasim", "Fahrija Rahman", "Ramadhani", "Randa Yudistira", "Muhammad Kelvin", "Alfianor"],                          // ULD BABAI
  372: ["Ahmat Rida", "Supiansyah", "Fahmi", "Minghuandy", "Nurahman", "Eko Setiawan", "Husliansyah"],                             // ULD GUNUNG PUREI
  373: ["Aryuni", "Muliyarta", "Erwansyah", "Gusti Gustira", "M Arbani", "Sandi", "Suhaimi", "Amriansyah", "Rusdiansyah", "Junika Cucu Andika"],                          // ULD KENAMBUI
  375: ["Alex Sanderia", "Timbun Radiyanto", "Hery Optianus", "Sabriansyah", "Donny Prayogo", "Yosuarius YB", "Anto", "Basilius Yoga"],                       // ULD KUDANGAN
  376: ["Aripin", "Tomi Kuswoyo", "Mujianor", "Didin Wahono", "Zulkifli", "Hendri Purwanto", "Moh Taufiq", "M Ardianor", "Yoga Syahbandi", "Azkia El Murthada", "Rafdianor"],                   // ULD MENDAWAI
  382: ["Hidayat Saputra", "Abdul Haris", "Muhammad Pauzan", "Tedy Heriady", "Murdiansyah", "Ridy", "Megi", "Muhammad Hidayat", "Muhammad Ikhsan"],                         // ULD PAGATAN
  385: ["Muhammad Abidin", "Hendra Prianto", "M Ilham", "Hendri Irawan", "Ahmad Jainudin", "Muhammad Ari Sutarinda", "Alvyus Advent Bagaskara"],                           // ULD RANGGA ILUNG
  390: ["Murjoko", "Adi Rahmad", "Irawan"],                        // ULD TELAGA
  391: ["Eko Prasetyo", "Mulyadi", "Tri Wahyono", "Adi Susanto", "Karnadie", "Didie", "Yesto", "Ahmad Boby Erlangga"],                           // ULD TELAGA PULANG
  395: ["Effendi", "A Rafiq", "Mulyadi", "Supian", "Alpian", "Gusna Nubin", "M Ipan Ali", "Wardani", "Alpianor", "Juljalali Wal Ikram"],                           // ULD TUMBANG MANJUL
  399: ["Naneng Ermadi", "Ahmad Budi Santoso", "Yudi Setiono", "Burhan", "Sutrisman", "Purwanto", "Muhammad Nudie", "Benny Rahmadani", "Dodi Kurniawan"],                              // ULD TUMBANG SENAMANG
  910: ["Deniasyah", "Sukardiono", "Tajudin", "Alvyus Advent Bagaskara", "M Ilman"],                       // ULD MANGKATIP
  911: ["Hendri Aprius", "Kanserto", "Gupinda Ramadan", "M Indra Saputra", "Achrian Noor", "Rizki Permana", "Jihad"],                                 // ULD TELUK BETUNG
  913: ["Herianor", "Yatno Eka Nugraha", "Murjani", "Masrawan", "Yuspida", "Agus Salim", "Lambri", "Budi Hermonika Sosilo"],                    // ULD TUMPUNG LAUNG
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
var STATUS_OPTIONS = ['Operasi','Standby','Pemeliharaan','Gangguan','Rusak']

// POLA per kode_unit (jam operasi sistem per hari)
var POLA_MAP = {
  399: 24, // ULD TUMBANG SENAMANG
  390: 24, // ULD TELAGA
  382: 24, // ULD PAGATAN
  391: 24, // ULD TELAGA PULANG
  376: 24, // ULD MENDAWAI
  373: 24, // ULD KENAMBUI
  395: 24, // ULD TUMBANG MANJUL
  375: 24, // ULD KUDANGAN
  366: 14, // ULD BABAI
  385: 12, // ULD RANGGA ILUNG
  913: 14, // ULD TUMPUNG LAUNG
  372: 12, // ULD GUNUNG PUREI
  910: 14, // ULD MANGKATIP
  911: 24, // ULD TELUK BETUNG
  915: 24, // ULD SUNGAI BALI
  920: 24, // ULD MARABATUAN
  917: 24, // ULD KERASIAN
  918: 24, // ULD KERAYAAN
  919: 24, // ULD KERUMPUTAN
}

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

// Cache daftar operator dari tabel TAD per nama_unit
// { "ULD BABAI": ["Nama1","Nama2",...], ... }
var _tadOpCache      = {}
var _tadOpFetching   = {}  // guard double-fetch per unit

async function prefetchTadOperators(namaUnit) {
  if (!namaUnit) return
  if (_tadOpFetching[namaUnit]) return             // sedang fetch (guard double-fetch)
  // Cache dihapus setiap ganti unit agar selalu fresh dari D1
  _tadOpFetching[namaUnit] = true
  try {
    var res  = await fetch('/api/tad?penempatan=' + encodeURIComponent(namaUnit))
    var json = await res.json()
    if (json.success && Array.isArray(json.data)) {
      _tadOpCache[namaUnit] = json.data.map(function(r) { return r.nama })
    } else {
      _tadOpCache[namaUnit] = []
    }
  } catch(e) {
    _tadOpCache[namaUnit] = []
  } finally {
    _tadOpFetching[namaUnit] = false
  }
}
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
  var pad = function(n){ return String(n).padStart(2,'0') }
  // Gunakan timezone UTC+7 (WIB)
  var nowWIB = new Date(new Date().getTime() + 7 * 60 * 60 * 1000)
  var todayStr = nowWIB.getUTCFullYear() + '-' + pad(nowWIB.getUTCMonth()+1) + '-' + pad(nowWIB.getUTCDate())
  // H-1 WIB
  var yWIB = new Date(nowWIB.getTime() - 24 * 60 * 60 * 1000)
  var yesterdayStr = yWIB.getUTCFullYear() + '-' + pad(yWIB.getUTCMonth()+1) + '-' + pad(yWIB.getUTCDate())

  // Tab BEBAN PUNCAK: default H-1, max = hari ini (besok dan setelahnya disabled)
  var selTglEl = document.getElementById('sel-tanggal')
  selTglEl.value = yesterdayStr
  selTglEl.max   = todayStr
  // Tab OPERASIONAL: default H-1, max = H-1
  var lapTglEl = document.getElementById('lap-tanggal')
  lapTglEl.value = yesterdayStr
  lapTglEl.max   = yesterdayStr
  document.getElementById('data-tanggal').value  = yesterdayStr
  // Auto-set periode: Siang (06-17) atau Malam (18-05)
  var hr = nowWIB.getUTCHours()
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

    // Inisialisasi currentData dengan default
    for (var i = 0; i < mesinList.length; i++) {
      currentData[mesinList[i].id_mesin] = { status_mesin: 'Operasi' }
    }

    updateSummaryBar()

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
  var btns = ['btn-tampilkan','btn-riwayat','btn-simpan-semua','btn-simpan-semua-mobile']
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

  // ── HEADER: kolom pertama = "NO", kolom kedua = "Mesin", lalu satu kolom per parameter ──
  var headHTML = '<tr>'
  headHTML += '<th class="th-param" style="width:1px;white-space:nowrap;text-align:center;font-size:0.75rem;font-weight:700;padding:8px 6px;">NO</th>'
  headHTML += '<th class="th-param" style="min-width:200px;text-align:center;font-size:0.75rem;font-weight:700;">MESIN</th>'
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
    // Kolom NO
    bodyHTML += '<td style="width:1px;white-space:nowrap;text-align:center;font-size:0.75rem;font-weight:600;color:#64748b;padding:4px 6px;background:#fff;">' + (mi + 1) + '</td>'
    // Kolom MESIN (sticky)
    bodyHTML += '<td style="text-align:left;background:#fff;">'

    bodyHTML += '<div class="th-mesin-name" style="font-size:0.75rem;color:#374151;font-weight:700;">' + m.mesin + '</div>'
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
        bodyHTML += '<td style="text-align:center;font-size:0.75rem;color:#374151;font-weight:600;">' + masterVal + '</td>'
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
        var WIDE_KEYS = ['stand_kwh','jam_kerja_mesin','kwh_produksi','pemakaian_bbm']
        var kwh_class = (WIDE_KEYS.indexOf(p2.key) >= 0) ? 'cell-input cell-input-kwh' : 'cell-input'
        bodyHTML += '<td><input type="text" inputmode="numeric" pattern="[0-9]*" class="' + kwh_class + '" placeholder="—"'
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
  // Hapus highlight error saat user mulai mengisi
  var tbody = document.getElementById('table-body')
  if (tbody) {
    var el = tbody.querySelector('[data-mesin-id="' + mesinId + '"][data-key="' + field + '"]')
    if (el) {
      el.classList.remove('cell-error')
      el.parentElement && el.parentElement.classList.remove('td-error')
    }
  }
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
  updateSummaryBar()
}

// =============================================
// SUMMARY BAR — real-time: DM Pasok, Beban Puncak, Padam, Cadangan, Status
// =============================================
async function updateSummaryBar() {
  var el = document.getElementById('info-mesin-count')
  if (!el) return

  if (!mesinList || mesinList.length === 0) return

  var totalDM = 0, totalBeban = 0, maxDM = 0

  for (var i = 0; i < mesinList.length; i++) {
    var mid = mesinList[i].id_mesin
    var d   = currentData[mid] || {}
    var status = d.status_mesin || 'Operasi'
    var dm = parseFloat(d.daya_mampu) || 0
    var bp = parseFloat(d.beban) || 0

    if (status === 'Operasi') {
      totalDM    += dm
      totalBeban += bp
      if (dm > maxDM) maxDM = dm
    } else if (status === 'Standby') {
      totalDM += dm
      if (dm > maxDM) maxDM = dm
    } else {
      // Gangguan/Pemeliharaan/Rusak: tetap hitung beban jika nilai > 0
      if (bp > 0) totalBeban += bp
    }
  }

  var cadangan = totalDM - totalBeban

  // Cek event padam untuk unit+tanggal ini
  var adaPadam = false
  try {
    var tanggal = document.getElementById('sel-tanggal') ? document.getElementById('sel-tanggal').value : ''
    if (monSelectedUnit && tanggal) {
      var epRes  = await fetch('/api/event-padam?kode_unit=' + monSelectedUnit + '&tanggal=' + tanggal)
      var epJson = await epRes.json()
      adaPadam   = epJson.ada_padam === true
    }
  } catch(ep) {}

  var statusSys
  if (adaPadam) {
    statusSys = 'DEFISIT'
  } else if (cadangan >= 0 && cadangan < maxDM) {
    statusSys = 'SIAGA'
  } else if (cadangan >= maxDM) {
    statusSys = 'NORMAL'
  } else {
    statusSys = 'DEFISIT'
  }
  // DEFISIT = ada event padam ATAU cadangan < 0
  // SIAGA   = 0 <= cadangan < maxDM
  // NORMAL  = cadangan >= maxDM

  var padam = cadangan < 0 ? Math.abs(cadangan) : 0
  var cadanganDisplay = cadangan < 0 ? 0 : cadangan

  var statusColor = statusSys === 'DEFISIT' ? 'color:#c0392b;font-weight:bold'
                  : statusSys === 'SIAGA'   ? 'color:#e67e22;font-weight:bold'
                  : 'color:#27ae60;font-weight:bold'

  el.innerHTML =
    'DM Pasok: <b>' + totalDM + '</b> kW &nbsp;|&nbsp; ' +
    'Beban Puncak: <b>' + totalBeban + '</b> kW &nbsp;|&nbsp; ' +
    'Padam: <b>' + padam + '</b> kW &nbsp;|&nbsp; ' +
    'Cadangan: <b>' + cadanganDisplay + '</b> kW &nbsp;|&nbsp; ' +
    'Status: <b style="' + statusColor + '">' + statusSys + '</b>'
}

// =============================================
// ATURAN STATUS → ENABLE/DISABLE KOLOM
// =============================================
// Operasi   : semua wajib diisi, kecuali keterangan (disabled)
// Standby   : daya_mampu, jam_kerja_mesin, kwh_produksi, pemakaian_bbm wajib; sisanya disabled
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

    // Periode SIANG: jam_kerja_mesin, kwh_produksi, pemakaian_bbm selalu disabled
    var periodeEl = document.getElementById('sel-periode')
    var isSiang = periodeEl && periodeEl.value === 'siang'
    var SIANG_DISABLED_KEYS = ['jam_kerja_mesin', 'kwh_produksi', 'pemakaian_bbm']
    if (isSiang && SIANG_DISABLED_KEYS.indexOf(p.key) >= 0) {
      isDisabled = true
      isRequired = false
    } else if (status === 'Operasi') {
      // keterangan: disabled; semua lain: wajib
      if (p.key === 'keterangan') {
        isDisabled = true
      } else {
        isRequired = true
      }
    } else if (status === 'Standby') {
      // daya_mampu, jam_kerja_mesin, kwh_produksi, pemakaian_bbm: wajib; semua lain: disabled
      if (p.key === 'daya_mampu' || p.key === 'jam_kerja_mesin' || p.key === 'kwh_produksi' || p.key === 'pemakaian_bbm') {
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

    if (isDisabled) {
      if (p.key === 'beban') {
        // BEBAN: readonly bukan disabled agar nilai tetap tampil di semua browser/mobile
        el.disabled = false
        el.readOnly = true
        el.setAttribute('tabindex', '-1')
        el.classList.add('cell-disabled')
        el.classList.remove('cell-required')
        td.classList.add('td-disabled')
        td.classList.remove('td-required')
        // Jangan reset nilai — pertahankan untuk fungsi PADAM
      } else {
        // Set value SEBELUM disabled agar berlaku di semua browser (Firefox, Safari, Chrome)
        el.value = '0'
        if (!currentData[mesinId]) currentData[mesinId] = {}
        currentData[mesinId][p.key] = 0
        el.disabled = true
        el.readOnly = true  // tambahan untuk iOS Safari
        el.setAttribute('tabindex', '-1')
        el.classList.add('cell-disabled')
        el.classList.remove('cell-required')
        td.classList.add('td-disabled')
        td.classList.remove('td-required')
      }
    } else {
      el.disabled = false
      el.readOnly = false
      el.removeAttribute('tabindex')
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

async function onResumeDataClick() {
  var tanggal = document.getElementById('data-tanggal').value
  if (!tanggal) { showToast('Pilih tanggal terlebih dahulu', 'info'); return }

  // ── Format tanggal → "Kamis, 12 Maret 2026" ────────────────────────────
  var HARI_ID  = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu']
  var BULAN_ID = ['Januari','Februari','Maret','April','Mei','Juni',
                  'Juli','Agustus','September','Oktober','November','Desember']
  var tglParts = tanggal.split('-')
  var tglObj   = new Date(parseInt(tglParts[0]), parseInt(tglParts[1]) - 1, parseInt(tglParts[2]))
  var hariStr  = HARI_ID[tglObj.getDay()]
  var tglStr   = parseInt(tglParts[2], 10) + ' ' + BULAN_ID[parseInt(tglParts[1], 10) - 1] + ' ' + tglParts[0]
  var tglFull  = hariStr + ', ' + tglStr

  // ── Baca periode (siang/malam) dari selector toolbar monitoring ────────
  var periodeEl  = document.getElementById('sel-periode')
  var isSiang    = periodeEl && periodeEl.value === 'siang'
  var periodeLabel = isSiang ? 'Siang' : 'Malam'

  var btnResume = document.getElementById('btn-resume-data')
  if (btnResume) { btnResume.disabled = true; btnResume.textContent = 'Memuat...' }

  // Hitung tanggal H-1 dari tanggal yang dipilih
  var tglDateObj = new Date(tanggal + 'T00:00:00')
  tglDateObj.setDate(tglDateObj.getDate() - 1)
  var tanggalH1 = tglDateObj.getFullYear() + '-' +
    String(tglDateObj.getMonth() + 1).padStart(2, '0') + '-' +
    String(tglDateObj.getDate()).padStart(2, '0')

  try {
    // ── Fetch 4 API secara paralel ───────────────────────────────────────
    var results = await Promise.all([
      fetch('/api/neraca-daya?tanggal=' + tanggal).then(function(r){ return r.json() }),
      fetch('/api/data-stok?tanggal='   + tanggal).then(function(r){ return r.json() }),
      fetch('/api/stock-oli?tanggal='   + tanggal).then(function(r){ return r.json() }),
      fetch('/api/data-stok?tanggal='   + tanggalH1).then(function(r){ return r.json() })
    ])
    var jsonNeraca = results[0]
    var jsonStok   = results[1]
    var jsonOli    = results[2]
    var jsonStokH1 = results[3]

    // ── Neraca Daya: hitung kondisi tiap unit ───────────────────────────
    var neracaRows  = (jsonNeraca.success && jsonNeraca.data) ? jsonNeraca.data : []
    var totalUnit   = neracaRows.length
    var countNormal = 0, countSiaga  = 0, countDefisit = 0
    var totalDMP    = 0, totalBP     = 0
    var defisitList = []   // unit yang DEFISIT
    var siagaList   = []   // unit yang SIAGA

    for (var ni = 0; ni < neracaRows.length; ni++) {
      var nr      = neracaRows[ni]
      var cadMalam = (nr.dm_pasok != null && nr.beban_puncak_malam != null && nr.beban_puncak_malam > 0)
                     ? (nr.dm_pasok - nr.beban_puncak_malam) : null
      var kondisi
      if (cadMalam === null) {
        kondisi = '-'
      } else if (cadMalam < 0) {
        kondisi = 'DEFISIT'
      } else if (cadMalam >= 0 && cadMalam < (nr.max_dm || 0)) {
        kondisi = 'SIAGA'
      } else {
        kondisi = 'NORMAL'
      }

      if (kondisi === 'NORMAL')  countNormal++
      else if (kondisi === 'SIAGA') {
        countSiaga++
        var bp_siaga  = isSiang ? (nr.beban_puncak_siang || 0) : (nr.beban_puncak_malam || 0)
        var dmn_siaga = nr.dm_pasok || 0
        var cad_siaga = dmn_siaga - bp_siaga
        var padam_siaga = cad_siaga < 0 ? Math.abs(cad_siaga) : 0
        siagaList.push({
          nama  : nr.nama_unit || '-',
          dmn   : dmn_siaga,
          bp    : bp_siaga,
          cad   : cad_siaga,
          padam : padam_siaga
        })
      }
      else if (kondisi === 'DEFISIT') {
        countDefisit++
        var bp_unit  = isSiang ? (nr.beban_puncak_siang || 0) : (nr.beban_puncak_malam || 0)
        var dmn_unit = nr.dm_pasok || 0
        var cad_unit = dmn_unit - bp_unit
        var padam_unit = cad_unit < 0 ? Math.abs(cad_unit) : 0
        defisitList.push({
          nama   : nr.nama_unit || '-',
          dmn    : dmn_unit,
          bp     : bp_unit,
          cad    : cad_unit,
          padam  : padam_unit
        })
      }

      totalDMP += nr.dm_pasok || 0
      totalBP  += (isSiang ? (nr.beban_puncak_siang || 0) : (nr.beban_puncak_malam || 0))
    }
    var totalCAD = totalDMP - totalBP

    // ── HOP BBM rata-rata hari H ─────────────────────────────────────────
    function calcHopBbm(stokData) {
      var totalSB = 0, totalPT = 0, hasS = false
      for (var si = 0; si < stokData.length; si++) {
        if (stokData[si].stock_bersih    != null) { totalSB += stokData[si].stock_bersih;    hasS = true }
        if (stokData[si].rata_rata_harian != null) { totalPT += stokData[si].rata_rata_harian }
      }
      return (hasS && totalPT > 0) ? Math.round(totalSB / totalPT) : null
    }
    var stokRows   = (jsonStok.success   && jsonStok.data)   ? jsonStok.data   : []
    var stokRowsH1 = (jsonStokH1.success && jsonStokH1.data) ? jsonStokH1.data : []
    var hopBbm   = calcHopBbm(stokRows)
    var hopBbmH1 = calcHopBbm(stokRowsH1)
    var hopBbmStr   = hopBbm   !== null ? hopBbm   + ' hari' : '...'
    var hopBbmH1Str = hopBbmH1 !== null ? hopBbmH1 + ' hari' : '...'

    // ── Baris kondisi siaga & defisit ──────────────────────────────────
    function fmtKW(n) {
      if (n == null || isNaN(n)) return '...'
      return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' kW'
    }

    // Siaga
    var siagaSistemLine = ''
    var siagaSubLines   = ''
    if (siagaList.length === 0) {
      siagaSistemLine = '    Tidak ada sistem dalam kondisi siaga'
    } else {
      siagaSistemLine = '    Sistem ' + siagaList.map(function(d){ return d.nama }).join(', ')
      for (var si2 = 0; si2 < siagaList.length; si2++) {
        var hurufS = String.fromCharCode(97 + si2)
        var ds = siagaList[si2]
        siagaSubLines += '\n    ' + hurufS + '. ' + ds.nama +
          '\n       DMN   : ' + fmtKW(ds.dmn) +
          '\n       BP    : ' + fmtKW(ds.bp) +
          '\n       CAD   : ' + fmtKW(ds.cad) +
          '\n       Padam : ' + fmtKW(ds.padam)
      }
    }

    // Defisit
    var defisitSistemLine = ''
    var defisitSubLines   = ''
    if (defisitList.length === 0) {
      defisitSistemLine = '    Tidak ada sistem dalam kondisi defisit'
    } else {
      defisitSistemLine = '    Sistem ' + defisitList.map(function(d){ return d.nama }).join(', ')
      for (var di = 0; di < defisitList.length; di++) {
        var huruf = String.fromCharCode(97 + di)   // a, b, c, ...
        var d = defisitList[di]
        defisitSubLines += '\n    ' + huruf + '. ' + d.nama +
          '\n       DMN   : ' + fmtKW(d.dmn) +
          '\n       BP    : ' + fmtKW(d.bp) +
          '\n       CAD   : ' + fmtKW(d.cad) +
          '\n       Padam : ' + fmtKW(d.padam)
      }
    }

    // ── Format angka MW (pakai titik ribuan) ────────────────────────────
    function fmtMW(n) {
      if (n == null || isNaN(n)) return '...'
      return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' MW'
    }

    // ── Build teks laporan ───────────────────────────────────────────────
    var teks =
'Assalamualaikum Wr. Wb,\n' +
'Yth. Pak DIROP\n' +
'Yth. Pak VP OPHARKIT\n' +
'Yth. Pak VP RENKINKIT\n' +
'\n' +
'Berikut kami laporkan Kondisi Pembangkit BP ' + periodeLabel + '\n' +
'Sistem AMC UP KAL 2\n' +
tglFull + ', sebagai berikut:\n' +
'Kondisi :\n' +
'1. Rekap Kondisi Sistem\n' +
'    Total    : ' + totalUnit   + '\n' +
'    Normal   : ' + countNormal + ' \uD83D\uDFE2\n' +
'    Siaga    : ' + countSiaga  + ' \uD83D\uDFE1\n' +
'    Defisit  : ' + countDefisit + ' \uD83D\uDD34\n' +
'\n' +
'2. Total Realisasi Beban Sistem ' + periodeLabel + '\n' +
'    DMP  : ' + fmtKW(totalDMP) + '\n' +
'    BP   : ' + fmtKW(totalBP)  + '\n' +
'    CAD  : ' + fmtKW(totalCAD) + '\n' +
'\n' +
'3. Kondisi Siaga\n' +
siagaSistemLine + siagaSubLines + '\n' +
'\n' +
'4. Kondisi Defisit\n' +
defisitSistemLine + defisitSubLines + '\n' +
'\n' +
'5. BBM dan Pelumas\n' +
'   HOP BBM Rata-rata        : ' + hopBbmH1Str + '\n' +
'   HOP Pelumas Rata-rata    :        hari\n' +
'\n' +
'Demikian, mohon petunjuk dan arahan \uD83D\uDE4F'

    // ── Copy ke clipboard ────────────────────────────────────────────────
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(teks)
      showToast('Teks laporan berhasil disalin!', 'success')
    } else {
      // Fallback untuk browser lama / iOS Safari tanpa clipboard API
      var ta = document.createElement('textarea')
      ta.value = teks
      ta.style.position = 'fixed'
      ta.style.top = '-9999px'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      try {
        document.execCommand('copy')
        showToast('Teks laporan berhasil disalin!', 'success')
      } catch(e2) {
        showToast('Gagal menyalin: ' + e2.message, 'error')
      }
      document.body.removeChild(ta)
    }

  } catch(e) {
    showToast('Gagal memuat data: ' + e.message, 'error')
  } finally {
    if (btnResume) { btnResume.disabled = false; btnResume.textContent = 'RESUME' }
  }
}

async function onPadamClick() {
  var tanggal = document.getElementById('sel-tanggal').value
  if (!tanggal) { showToast('Pilih tanggal terlebih dahulu', 'info'); return }
  if (!monSelectedUnit) { showToast('Pilih unit terlebih dahulu', 'info'); return }

  // Scan currentData — pisahkan mesin padam dan mesin non-padam
  var STATUS_PADAM = ['Pemeliharaan', 'Gangguan', 'Rusak']
  var padamIds     = []
  var bebanNonPadam = 0

  for (var id in currentData) {
    var status = currentData[id].status_mesin || 'Operasi'
    var beban  = parseFloat(currentData[id].beban) || 0
    if (STATUS_PADAM.indexOf(status) !== -1) {
      padamIds.push(parseInt(id))
    } else {
      // Operasi atau Standby — hitung total beban non-padam hari ini
      bebanNonPadam += beban
    }
  }

  if (padamIds.length === 0) {
    showToast('Tidak ada mesin dengan status Pemeliharaan/Gangguan/Rusak', 'info')
    return
  }

  try {
    var periode = document.getElementById('sel-periode') ? document.getElementById('sel-periode').value : 'malam'
    var jamPadam = periode === 'siang' ? '12' : '18'
    var url = '/api/padam'
      + '?tanggal='         + tanggal
      + '&kode_unit='       + monSelectedUnit
      + '&mesin_ids='       + encodeURIComponent(JSON.stringify(padamIds))
      + '&beban_non_padam=' + bebanNonPadam
      + '&jam='             + jamPadam

    var res  = await fetch(url)
    var json = await res.json()
    if (!json.success) { showToast('Gagal: ' + (json.error || ''), 'error'); return }

    var nilaiPerMesin  = json.nilai_per_mesin  || 0
    var totalBpLast    = json.total_bp_last     || 0
    var tanggalLast    = json.tanggal_last      || '-'
    var mesinEligible  = json.mesin_eligible    || []
    var tbody          = document.getElementById('table-body')

    if (totalBpLast === 0) {
      showToast('Tidak ada data beban puncak di database sebelum tanggal ini', 'info')
      return
    }

    if (mesinEligible.length === 0) {
      showToast('Tidak ada mesin padam yang sebelumnya berstatus Operasi', 'info')
      return
    }

    // Hanya isi ke mesin yang eligible (H-1 Operasi)
    mesinEligible.forEach(function(mesinId) {
      if (!currentData[mesinId]) currentData[mesinId] = {}
      currentData[mesinId]['beban'] = nilaiPerMesin

      if (tbody) {
        var inp = tbody.querySelector('[data-mesin-id="' + mesinId + '"][data-key="beban"]')
        if (inp) {
          inp.readOnly = false
          inp.value    = nilaiPerMesin
          inp.readOnly = true
        }
      }
    })

    // Simpan event padam ke database
    try {
      await fetch('/api/event-padam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kode_unit: monSelectedUnit, tanggal: tanggal })
      })
    } catch(ep) {}

    updateSummaryBar()
    showToast(mesinEligible.length + ' mesin diisi ' + nilaiPerMesin + ' kW (BP terakhir [' + tanggalLast + ']: ' + totalBpLast + ' - non-padam: ' + bebanNonPadam + ') / ' + mesinEligible.length, 'success')
  } catch(e) {
    showToast('Error: ' + e.message, 'error')
  }
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
      // Helper terapkan rows H-1 ke currentData
      function applyH1Rows(rows) {
        for (var hi = 0; hi < rows.length; hi++) {
          var rH1 = rows[hi]
          var mH1 = rH1.mesin_id
          if (!currentData[mH1]) currentData[mH1] = {}
          // Hanya terapkan jika belum dapat status dari fetch sebelumnya
          if (!currentData[mH1]._h1applied) {
            currentData[mH1].status_mesin = rH1.status_mesin || 'Operasi'
            if (rH1.status_mesin && rH1.status_mesin !== 'Operasi' && rH1.status_mesin !== 'Standby' && rH1.keterangan) {
              currentData[mH1].keterangan = rH1.keterangan
            }
            if (rH1.daya_mampu != null && rH1.daya_mampu !== 0) {
              currentData[mH1].daya_mampu_h1 = rH1.daya_mampu
            }
            if (rH1.keterangan != null && rH1.keterangan !== '' && rH1.keterangan !== '0.0'
                && rH1.status_mesin && rH1.status_mesin !== 'Operasi' && rH1.status_mesin !== 'Standby') {
              currentData[mH1].keterangan_h1 = rH1.keterangan
            }
            currentData[mH1]._h1applied = true
          }
        }
      }

      var resH1 = await fetch('/api/monitoring?tanggal=' + tanggalH1 + '&periode=' + periode + '&kode_unit=' + monSelectedUnit)
      var jsonH1 = await resH1.json()
      var rowsH1 = (jsonH1.success && jsonH1.data) ? jsonH1.data : []
      // Fallback tanpa periode jika tidak ada hasil sama sekali
      if (rowsH1.length === 0) {
        var resH1b = await fetch('/api/monitoring?tanggal=' + tanggalH1 + '&kode_unit=' + monSelectedUnit)
        var jsonH1b = await resH1b.json()
        rowsH1 = (jsonH1b.success && jsonH1b.data) ? jsonH1b.data : []
      }
      applyH1Rows(rowsH1)

      // Cek mesin yang belum dapat data H-1 → coba H-2
      var missingIds = mesinList.filter(function(m) {
        return !currentData[m.id_mesin] || !currentData[m.id_mesin]._h1applied
      })
      if (missingIds.length > 0) {
        var tglH2Date = new Date(tglDate.getTime())
        tglH2Date.setDate(tglH2Date.getDate() - 1)
        var tanggalH2 = tglH2Date.getFullYear() + '-'
          + String(tglH2Date.getMonth() + 1).padStart(2, '0') + '-'
          + String(tglH2Date.getDate()).padStart(2, '0')
        var resH2 = await fetch('/api/monitoring?tanggal=' + tanggalH2 + '&periode=' + periode + '&kode_unit=' + monSelectedUnit)
        var jsonH2 = await resH2.json()
        var rowsH2 = (jsonH2.success && jsonH2.data) ? jsonH2.data : []
        if (rowsH2.length === 0) {
          var resH2b = await fetch('/api/monitoring?tanggal=' + tanggalH2 + '&kode_unit=' + monSelectedUnit)
          var jsonH2b = await resH2b.json()
          rowsH2 = (jsonH2b.success && jsonH2b.data) ? jsonH2b.data : []
        }
        applyH1Rows(rowsH2)
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
        // Auto-fill daya_mampu dari H-1 jika belum ada data hari ini
        if (currentData[mid].daya_mampu_h1 != null) {
          currentData[mid].daya_mampu = currentData[mid].daya_mampu_h1
        }
        // Auto-fill keterangan dari H-1 jika belum ada data hari ini
        if (!currentData[mid].keterangan && currentData[mid].keterangan_h1) {
          currentData[mid].keterangan = currentData[mid].keterangan_h1
        }
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
    // Step 4: Untuk mesin yang belum ada data hari ini sama sekali,
    // gunakan status dari H-1 (bukan reset ke Operasi)
    for (var i = 0; i < mesinList.length; i++) {
      var mid2 = mesinList[i].id_mesin
      if (!currentData[mid2]) currentData[mid2] = {}
      // Status: pakai H-1 jika ada, fallback Operasi
      if (!currentData[mid2].status_mesin) {
        currentData[mid2].status_mesin = 'Operasi'
      }
      // Auto-fill daya_mampu dari H-1
      if (!currentData[mid2].daya_mampu && currentData[mid2].daya_mampu_h1 != null) {
        currentData[mid2].daya_mampu = currentData[mid2].daya_mampu_h1
      }
      // Auto-fill keterangan dari H-1
      if (!currentData[mid2].keterangan && currentData[mid2].keterangan_h1) {
        currentData[mid2].keterangan = currentData[mid2].keterangan_h1
      }
    }
    updateTableData()
    updateSummaryBar()
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
  lines.push('id unit: ' + String(kodeUnit).padStart(4, '0'))
  lines.push('tgl : ' + tanggal)
  lines.push('nama operator: ' + namaOperator)
  lines.push('')

  var totalDM = 0, totalBebanOperasi = 0, totalBebanPadam = 0, maxDM = 0

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
    if (status === 'Operasi')      { totalDM += dm; totalBebanOperasi += bp; if (dm > maxDM) maxDM = dm }
    else if (status === 'Standby') { totalDM += dm; if (dm > maxDM) maxDM = dm }
    else { if (bp > 0) totalBebanPadam += bp }

    // Kolom yang di-disable → null → tampilkan 0 di WA
    var v0 = function(val) { return val != null ? val : 0 }
    var vd = function(val) { return val != null ? String(val).replace('.', ',') : '0' }

    lines.push((i + 1) + '. ' + namaMesin)
    lines.push('id mesin: ' + String(r.mesin_id).padStart(6, '0'))
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

  var totalBeban    = totalBebanOperasi + totalBebanPadam
  var cadangan      = totalDM - totalBebanOperasi
  var cadanganDisplay = cadangan < 0 ? 0 : cadangan
  // Cek event padam
  var adaPadam1 = false
  try {
    var ep1 = await fetch('/api/event-padam?kode_unit=' + kodeUnit + '&tanggal=' + tanggal)
    var ej1 = await ep1.json()
    adaPadam1 = ej1.ada_padam === true
  } catch(e) {}
  var statusSys = adaPadam1 ? 'defisit' : (cadangan >= maxDM ? 'normal' : (cadangan >= 0 ? 'siaga' : 'defisit'))

  lines.push('resume')
  lines.push('dm pasok: '     + totalDM)
  lines.push('bp terlayani: ' + totalBebanOperasi)
  lines.push('padam: '        + totalBebanPadam)
  lines.push('cadangan: '     + cadanganDisplay)
  lines.push('status: '       + statusSys)
  lines.push('stok bbm: '     + stokBbm)
  lines.push('hop bbm: '      + hopBbm)

  return lines.join('\n')
}

// kodeUnit: integer, allMesinCache: array semua mesin dari cache, stokMap: map kode_unit->stok, lapMap: map kode_unit->lap
async function buildUnitWAText(tanggal, periode, kodeUnit, records, allMesinCache, stokMap, lapMap) {
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
  lines.push('id unit: ' + String(kodeUnit).padStart(4, '0'))
  lines.push('tgl : ' + tanggal)
  lines.push('nama operator: ' + namaOperator)
  lines.push('')

  var totalDM = 0, totalBebanOperasi = 0, totalBebanPadam = 0, maxDM = 0

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
      totalDM += dm; totalBebanOperasi += bp
      if (dm > maxDM) maxDM = dm
    } else if (status === 'Standby') {
      totalDM += dm
      if (dm > maxDM) maxDM = dm
    } else { if (bp > 0) totalBebanPadam += bp }

    var tekOliStr = (r.tek_oli   != null) ? String(r.tek_oli).replace('.', ',') : '-'
    var tempStr   = (r.temp_air_pendingin != null) ? r.temp_air_pendingin : '-'
    var cosPhiStr = (r.cos_phi   != null) ? String(r.cos_phi).replace('.', ',') : '-'

    lines.push((i + 1) + '. ' + namaMesin)
    lines.push('\u200bid mesin: ' + String(r.mesin_id).padStart(6, '0'))
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

  // Resume — rumus sesuai format LAPORAN BEBAN PUNCAK
  // bp terlayani = beban operasi + beban padam (jika > 0)
  // padam        = total beban mesin Gangguan/Pemeliharaan/Rusak
  // cadangan     = totalDM - totalBebanOperasi (tidak dikurangi beban padam)
  var totalBeban      = totalBebanOperasi + totalBebanPadam
  var cadangan        = totalDM - totalBebanOperasi
  var cadanganDisplay = cadangan < 0 ? 0 : cadangan
  // Cek event padam
  var adaPadam2 = false
  try {
    var ep2 = await fetch('/api/event-padam?kode_unit=' + kodeUnit + '&tanggal=' + tanggal)
    var ej2 = await ep2.json()
    adaPadam2 = ej2.ada_padam === true
  } catch(e) {}
  var statusSys       = adaPadam2 ? 'defisit' : (cadangan >= maxDM ? 'normal' : (cadangan >= 0 ? 'siaga' : 'defisit'))

  // stok bbm = saldo_akhir (stock_akhir) dari tabel DATA H-1
  // hop bbm  = safety_stock dari tabel DATA H-1
  var stokBbm = '-', hopBbm = '-'
  if (stokMap && stokMap[kodeUnit]) {
    stokBbm = stokMap[kodeUnit].stok_awal    != null ? stokMap[kodeUnit].stok_awal    : '-'
    hopBbm  = stokMap[kodeUnit].safety_stock != null ? stokMap[kodeUnit].safety_stock : '-'
  }

  lines.push('\u200bresume')
  lines.push('\u200bdm pasok: ' + totalDM)
  lines.push('\u200bbp terlayani: ' + totalBebanOperasi)
  lines.push('\u200bpadam: ' + totalBebanPadam)
  lines.push('\u200bcadangan: ' + cadanganDisplay)
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

  // 5. Build teks per unit, gabung dengan separator (await semua karena async)
  var partPromises = []
  for (var ui = 0; ui < unitOrder.length; ui++) {
    var ku = unitOrder[ui]
    partPromises.push(buildUnitWAText(tanggal, periode, ku, unitMap[ku], allMesinCache, stokMap, lapMap))
  }
  var parts = await Promise.all(partPromises)

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

  // ── VALIDASI: semua field yang tidak disabled wajib diisi ──
  var tbody = document.getElementById('table-body')
  var validationErrors = []
  for (var vi = 0; vi < mesinList.length; vi++) {
    var vm = mesinList[vi]
    var vRow = tbody ? tbody.querySelector('tr[data-mesin="' + vm.id_mesin + '"]') : null
    if (!vRow) continue
    var mesinNama = vm.mesin || vm.nama_mesin || ('Mesin ' + vm.id_mesin)
    for (var pi = 0; pi < PARAMS.length; pi++) {
      var vp = PARAMS[pi]
      if (vp.type === 'readonly' || vp.type === 'select') continue
      var vel = vRow.querySelector('[data-mesin-id="' + vm.id_mesin + '"][data-key="' + vp.key + '"]')
      if (!vel || vel.disabled) continue  // skip field yang disabled
      // skip beban jika status bukan Operasi (cek currentData DAN elemen DOM)
      var vStatus = (currentData[vm.id_mesin] && currentData[vm.id_mesin].status_mesin) ? currentData[vm.id_mesin].status_mesin : 'Operasi'
      // fallback: cek langsung dari dropdown di DOM
      var vSelEl = vRow.querySelector('[data-mesin-id="' + vm.id_mesin + '"][data-key="status_mesin"]')
      if (vSelEl && vSelEl.value) vStatus = vSelEl.value
      if (vp.key === 'beban' && ['Standby','Pemeliharaan','Gangguan','Rusak'].indexOf(vStatus) !== -1) continue
      var vval = vel.value.trim()
      if (vval === '' || vval === null) {
        // Highlight merah
        vel.classList.add('cell-error')
        vel.parentElement && vel.parentElement.classList.add('td-error')
        validationErrors.push(mesinNama + ' → ' + vp.label)
      } else {
        vel.classList.remove('cell-error')
        vel.parentElement && vel.parentElement.classList.remove('td-error')
      }
    }
  }
  if (validationErrors.length > 0) {
    showToast('Field wajib belum diisi: ' + validationErrors.length + ' kolom kosong. Periksa sel merah.', 'error')
    // Scroll ke baris pertama yang error
    var firstError = tbody ? tbody.querySelector('.cell-error') : null
    if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return
  }

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

    // ── Auto-reset event_padam saat data direvisi ──
    // Setiap kali user SIMPAN, hapus event_padam untuk unit+tanggal ini.
    // Jika padam masih berlaku, user bisa klik tombol PADAM lagi untuk set ulang.
    try {
      await fetch('/api/event-padam?kode_unit=' + monSelectedUnit + '&tanggal=' + tanggal, {
        method: 'DELETE'
      })
      // Refresh summary bar agar status langsung update (NORMAL/SIAGA sesuai data baru)
      await updateSummaryBar()
    } catch(ep) { /* abaikan error, tidak blocking */ }

    // Backup ke Google Sheets — tunggu selesai sebelum redirect WA
    try {
      var namaUnit = ''
      var unitEl = document.getElementById('mon-sel-unit')
      if (unitEl) namaUnit = unitEl.options[unitEl.selectedIndex]?.text || ''
      if (!namaUnit && monSelectedUnit) {
        var ud = UNIT_DATA.find(function(u) { return u.kode_unit == monSelectedUnit })
        if (ud) namaUnit = ud.nama_unit
      }
      // Tambahkan nama_mesin ke setiap record dari mesinList
      var recordsWithNama = records.map(function(r) {
        var m = mesinList.find(function(x) { return x.id_mesin == r.mesin_id }) || {}
        return Object.assign({}, r, { nama_mesin: m.mesin || m.nama_mesin || '' })
      })
      await fetch('/api/monitoring/sync-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tanggal: tanggal, periode: periode,
          kode_unit: monSelectedUnit, nama_unit: namaUnit,
          records: recordsWithNama
        })
      })
    } catch(se) { /* abaikan error sheets, tidak blocking simpan utama */ }

    // Jika unit 366/372/373/375/376/382/385/390/391/395/399/910/911/913/915/917/918/919/920, baca jadwal dari spreadsheet dan simpan ke D1
    if (parseInt(monSelectedUnit) === 919 || parseInt(monSelectedUnit) === 918 || parseInt(monSelectedUnit) === 917 || parseInt(monSelectedUnit) === 920 || parseInt(monSelectedUnit) === 915 || parseInt(monSelectedUnit) === 913 || parseInt(monSelectedUnit) === 911 || parseInt(monSelectedUnit) === 910 || parseInt(monSelectedUnit) === 385 || parseInt(monSelectedUnit) === 390 || parseInt(monSelectedUnit) === 399 || parseInt(monSelectedUnit) === 395 || parseInt(monSelectedUnit) === 391 || parseInt(monSelectedUnit) === 373 || parseInt(monSelectedUnit) === 376 || parseInt(monSelectedUnit) === 382 || parseInt(monSelectedUnit) === 375 || parseInt(monSelectedUnit) === 366 || parseInt(monSelectedUnit) === 372) {
      try {
        fetch('/api/jadwal-wa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kode_unit: parseInt(monSelectedUnit) })
        }).catch(function() {})
      } catch(sj) {}
    }

    // Kirim WA otomatis via Whacenter + salin teks ke clipboard
    var teksMon = await buildWAFromMemory(tanggal, periode, monSelectedUnit, records)
    if (teksMon) {
      // Salin teks ke clipboard otomatis
      try { await navigator.clipboard.writeText(teksMon) } catch(ec) {}

      // Kirim via Whacenter
      try {
        var resWa = await fetch('/api/kirim-wa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: teksMon })
        })
        var jsonWa = await resWa.json()
        if (jsonWa.success) {
          showToast('Data tersimpan, pesan WA terkirim & teks disalin!', 'success')
        } else {
          showToast('Tersimpan & teks disalin, tapi gagal kirim WA: ' + (jsonWa.error || 'unknown'), 'error')
        }
      } catch(ew) {
        showToast('Tersimpan & teks disalin, tapi gagal kirim WA: ' + ew.message, 'error')
      }
    } else {
      showToast('Tidak ada data untuk dikirim ke WA', 'info')
    }
  } catch(e) { showToast('Gagal menyimpan: ' + e.message,'error') }
  finally { showLoading(false,'loading-indicator') }
}

async function showRiwayat() {
  var list = document.getElementById('riwayat-list')
  list.innerHTML = '<div style="text-align:center;padding:16px;color:#e2e8f0"><span class="spinner"></span> Memuat...</div>'
  document.getElementById('modal-riwayat').classList.remove('hidden')
  try {
    var url = '/api/monitoring/tanggal'
    if (monSelectedUnit) url += '?kode_unit=' + monSelectedUnit
    var res  = await fetch(url)
    var json = await res.json()
    if (!json.success) throw new Error(json.error)
    if (json.data.length === 0) {
      list.innerHTML = '<div style="text-align:center;padding:16px;color:#e2e8f0">Belum ada data</div>'
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
  var TABS = ['monitoring','laporan','data','pengaturan']

  // tab content: tambah/hapus class active
  TABS.forEach(function(t) {
    var tabEl    = document.getElementById('tab-' + t)
    var tabBtnEl = document.getElementById('tab-btn-' + t)
    if (tabEl) {
      if (t === tab) tabEl.classList.add('active')
      else           tabEl.classList.remove('active')
    }
    if (tabBtnEl) {
      if (t === tab) tabBtnEl.classList.add('active')
      else           tabBtnEl.classList.remove('active')
    }
  })

  // toolbar: tambah/hapus class hidden
  TABS.forEach(function(t) {
    var el = document.getElementById('toolbar-' + t)
    if (el) {
      if (t === tab) el.classList.remove('hidden')
      else           el.classList.add('hidden')
    }
  })

  // header actions
  var haMonEl  = document.getElementById('header-actions-monitoring')
  var haLapEl  = document.getElementById('header-actions-laporan')
  var haDataEl = document.getElementById('header-actions-data')
  if (haMonEl)  haMonEl.style.display  = (tab === 'monitoring') ? 'flex' : 'none'
  if (haLapEl)  haLapEl.style.display  = (tab === 'laporan')    ? 'flex' : 'none'
  if (haDataEl) haDataEl.style.display = (tab === 'data')       ? 'flex' : 'none'

  if (tab === 'laporan' && !lapSelectedKode) showLapState('empty')
  if (tab === 'data') switchDataView(currentDataView)
  if (tab === 'pengaturan') pengInitPage()
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

  // Hapus cache unit ini agar selalu fetch terbaru dari D1
  if (lapSelectedUnit) delete _tadOpCache[lapSelectedUnit.nama_unit]
  if (lapSelectedUnit) await prefetchTadOperators(lapSelectedUnit.nama_unit)

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
  // Prioritas: data TAD dari D1 → fallback OPERATOR_DATA hardcode
  var _unitNama = lapSelectedUnit ? lapSelectedUnit.nama_unit : ''
  var opList = (_unitNama && _tadOpCache[_unitNama] && _tadOpCache[_unitNama].length > 0)
    ? _tadOpCache[_unitNama]
    : (lapSelectedKode && OPERATOR_DATA[lapSelectedKode]) ? OPERATOR_DATA[lapSelectedKode] : []
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
  html += '<div id="dokumen-field-wrap" class="lap-field-row" style="flex-direction:column;align-items:flex-start;gap:6px;">'
  html += '<label class="lap-field-label" style="min-width:unset;">Upload Dokumen <span style="color:#dc2626;font-weight:700;">*</span> <span style="font-size:0.72rem;color:#94a3b8;">(wajib · maks 32MB)</span></label>'
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
  // Validasi dokumen wajib diupload
  if (!d.dokumen_url) {
    errors.push('Upload Dokumen')
    var dokWrap = document.getElementById('dokumen-field-wrap')
    if (dokWrap) {
      dokWrap.style.outline = '2px solid #dc2626'
      dokWrap.style.borderRadius = '8px'
      dokWrap.style.padding = '6px'
      // Hapus highlight begitu dokumen berhasil diupload
      var observer = new MutationObserver(function() {
        if (currentLapForm.dokumen_url) {
          dokWrap.style.outline = ''
          dokWrap.style.padding = ''
          observer.disconnect()
        }
      })
      observer.observe(dokWrap, { subtree: true, childList: true, characterData: true })
    }
  }
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
    window.open('https://api.whatsapp.com/send?phone=6285285596663&text=' + encodeURIComponent(currentTeksLaporan) + '&_ts=' + ts, '_blank')
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
  window.location.href = 'https://wa.me/6285285596663?text=' + encoded
}

async function showRiwayatLap() {
  var list = document.getElementById('riwayat-lap-list')
  list.innerHTML = '<div style="text-align:center;padding:16px;color:#e2e8f0"><span class="spinner"></span> Memuat...</div>'
  document.getElementById('modal-riwayat-lap').classList.remove('hidden')
  try {
    var res  = await fetch('/api/lap-operasional/tanggal')
    var json = await res.json()
    if (!json.success) throw new Error(json.error)
    if (json.data.length === 0) { list.innerHTML = '<div style="text-align:center;padding:16px;color:#e2e8f0">Belum ada data tersimpan</div>'; return }
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
var currentDataView = 'neraca-daya'  // 'neraca-daya', 'hop-bbm', atau 'stock-oli'
var oliTableInited     = false
var neracaTableInited  = false

function switchDataView(view) {
  currentDataView = view
  // Update active state of sub-tab buttons
  document.getElementById('subtab-btn-neraca-daya').classList.toggle('active', view === 'neraca-daya')
  document.getElementById('subtab-btn-sfc').classList.toggle('active', view === 'sfc')
  document.getElementById('subtab-btn-hop-bbm').classList.toggle('active', view === 'hop-bbm')
  document.getElementById('subtab-btn-stock-oli').classList.toggle('active', view === 'stock-oli')
  // Show/hide wrappers
  document.getElementById('neraca-table-wrap').classList.toggle('hidden', view !== 'neraca-daya')
  document.getElementById('sfc-table-wrap').classList.toggle('hidden', view !== 'sfc')
  document.getElementById('data-table-wrap').classList.toggle('hidden', view !== 'hop-bbm')
  document.getElementById('oli-table-wrap').classList.toggle('hidden', view !== 'stock-oli')
  // Show/hide tombol download Excel (hanya di neraca daya)
  var btnDl = document.getElementById('btn-download-neraca')
  if (btnDl) btnDl.style.display = (view === 'neraca-daya') ? '' : 'none'
  // Show/hide tombol Resume (hanya di neraca daya)
  var btnResume = document.getElementById('btn-resume-data')
  if (btnResume) btnResume.style.display = (view === 'neraca-daya') ? '' : 'none'
  // Show/hide filter ULD (hanya di SFC)
  var sfcFilter = document.getElementById('sfc-filter-wrap')
  if (sfcFilter) sfcFilter.style.display = (view === 'sfc') ? 'flex' : 'none'
  // Show/hide filter grafik BP (hanya di neraca-daya)
  var neracaFilter = document.getElementById('neraca-chart-filter-wrap')
  if (neracaFilter) {
    neracaFilter.style.display = (view === 'neraca-daya') ? 'flex' : 'none'
    // Inisialisasi dropdown ULD jika belum
    if (view === 'neraca-daya') initNeracaChartUldSelect()
  }
  // Show/hide input tanggal
  var dateWrap = document.getElementById('data-subtab-date-wrap')
  dateWrap.style.display = ''
  var tanggal = document.getElementById('data-tanggal').value
  if (view === 'neraca-daya') {
    if (tanggal) loadNeracaDayaTab()
  } else if (view === 'sfc') {
    if (tanggal) loadSfcTab()
  } else if (view === 'hop-bbm') {
    if (tanggal) loadDataTab()
  } else {
    if (tanggal) loadStockOliTab()
  }
}

// ── Download Excel Neraca Daya ────────────────────────────────────────────
// ── Shared: buat workbook neraca (identik untuk download & WA) ───────────────
// Kolom = identik dengan tabel di layar: NO, ULD, OPS, STB, HAR, GGN, RSK,
//   JML, POLA, DTP(kW), DMN(kW), MAKS(kW), BP SIANG(kW), CAD SIANG(kW),
//   BP MALAM(kW), CAD MALAM(kW), N-1(kW), STATUS
function _buildNeracaWorkbook(rows, tanggal) {
  var NERACA_ORDER = [399,390,382,391,376,373,395,375,366,910,911,385,913,915,920,917,918,919,372]
  // Sort sesuai NERACA_ORDER
  var rowMap = {}
  rows.forEach(function(r) { rowMap[r.kode_unit] = r })
  var sorted = []
  NERACA_ORDER.forEach(function(ku) { if (rowMap[ku]) sorted.push(rowMap[ku]) })
  rows.forEach(function(r) { if (NERACA_ORDER.indexOf(r.kode_unit) === -1) sorted.push(r) })

  var tglParts = tanggal.split('-')
  var tglLabel = tglParts[2] + '.' + tglParts[1] + '.' + tglParts[0]

  // ── Sheet 1: Neraca Daya — 1 baris per unit ─────────────────────────────
  var header = ['No','ULD','OPS','STB','HAR','GGN','RSK','JML','POLA',
    'DTP (kW)','DMN (kW)','MAKS (kW)',
    'BP SIANG (kW)','CAD SIANG (kW)',
    'BP MALAM (kW)','CAD MALAM (kW)','N-1 (kW)','STATUS']
  var wsData = [header]

  for (var i = 0; i < sorted.length; i++) {
    var r = sorted[i]
    var cadMalam = (r.dm_pasok != null && r.beban_puncak_malam != null && r.beban_puncak_malam > 0)
      ? (r.dm_pasok - r.beban_puncak_malam) : null
    var cadSiang = (r.dm_pasok != null && r.beban_puncak_siang != null)
      ? (r.dm_pasok - r.beban_puncak_siang) : null
    var n1 = (cadMalam != null && r.max_dm != null) ? (cadMalam - r.max_dm) : null
    var status = '-'
    if (cadMalam !== null) {
      if      (cadMalam < 0)                           status = 'DEFISIT'
      else if (cadMalam >= 0 && cadMalam < (r.max_dm||0)) status = 'SIAGA'
      else                                             status = 'NORMAL'
    }
    var pola = POLA_MAP[r.kode_unit] != null ? POLA_MAP[r.kode_unit] : '-'
    wsData.push([
      i + 1,
      r.nama_unit || '-',
      r.jumlah_operasi      != null ? r.jumlah_operasi      : '-',
      r.jumlah_standby      != null ? r.jumlah_standby      : '-',
      r.jumlah_pemeliharaan != null ? r.jumlah_pemeliharaan : '-',
      r.jumlah_gangguan     != null ? r.jumlah_gangguan     : '-',
      r.jumlah_rusak        != null ? r.jumlah_rusak        : '-',
      r.jumlah_mesin        != null ? r.jumlah_mesin        : '-',
      pola,
      r.dm_terpasang        != null ? r.dm_terpasang        : '-',
      r.dm_pasok            != null ? r.dm_pasok            : '-',
      r.max_dm              != null ? r.max_dm              : '-',
      r.beban_puncak_siang  != null ? r.beban_puncak_siang  : '-',
      cadSiang              != null ? cadSiang              : '-',
      r.beban_puncak_malam  != null ? r.beban_puncak_malam  : '-',
      cadMalam              != null ? cadMalam              : '-',
      n1                    != null ? n1                    : '-',
      status
    ])
  }

  var wb = XLSX.utils.book_new()
  var ws = XLSX.utils.aoa_to_sheet(wsData)
  ws['!cols'] = [
    {wch:4},{wch:26},{wch:5},{wch:5},{wch:5},{wch:5},{wch:5},
    {wch:5},{wch:6},{wch:10},{wch:10},{wch:10},
    {wch:13},{wch:13},{wch:13},{wch:13},{wch:10},{wch:9}
  ]
  XLSX.utils.book_append_sheet(wb, ws, 'Neraca Daya')

  // ── Sheet 2: Kesiapan Pembangkit ─────────────────────────────────────────
  var ksHeader = ['No','ULD','POLA','DTP (kW)','DMN (kW)','MAKS (kW)']
  var ksData   = [ksHeader]
  for (var ki = 0; ki < sorted.length; ki++) {
    var kr = sorted[ki]
    ksData.push([
      ki + 1,
      kr.nama_unit || '-',
      POLA_MAP[kr.kode_unit] != null ? POLA_MAP[kr.kode_unit] : '-',
      kr.dm_terpasang != null ? kr.dm_terpasang : '-',
      kr.dm_pasok     != null ? kr.dm_pasok     : '-',
      kr.max_dm       != null ? kr.max_dm       : '-'
    ])
  }
  var wsKs = XLSX.utils.aoa_to_sheet(ksData)
  wsKs['!cols'] = [{wch:4},{wch:26},{wch:6},{wch:10},{wch:10},{wch:10}]
  XLSX.utils.book_append_sheet(wb, wsKs, 'Kesiapan Pembangkit')

  return { wb: wb, fileName: 'UID KSKT ' + tglLabel + '.xlsx' }
}

async function downloadNeracaExcel() {
  var tanggal = document.getElementById('data-tanggal').value
  if (!tanggal) { showToast('Pilih tanggal terlebih dahulu', 'info'); return }

  var btn = document.getElementById('btn-download-neraca')
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Memuat...' }

  try {
    var res  = await fetch('/api/neraca-daya?tanggal=' + tanggal)
    var json = await res.json()
    if (!json.success) throw new Error(json.error || 'Gagal memuat data')

    var result = _buildNeracaWorkbook(json.data, tanggal)
    XLSX.writeFile(result.wb, result.fileName)
    showToast('File Excel berhasil diunduh!', 'success')

  } catch(e) {
    showToast('Gagal download: ' + e.message, 'error')
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'EXCEL' }
  }
}

// ── Deteksi semua unit neraca daya sudah terisi ──────────────────────────────
// rows = array dari /api/neraca-daya, NERACA_ORDER = 19 unit
function isNeracaAllFilled(rows) {
  var NERACA_ORDER = [399, 390, 382, 391, 376, 373, 395, 375, 366, 910, 911, 385, 913, 915, 920, 917, 918, 919, 372]
  if (!rows || rows.length < NERACA_ORDER.length) return false
  var rowMap = {}
  rows.forEach(function(r) { rowMap[r.kode_unit] = r })
  for (var i = 0; i < NERACA_ORDER.length; i++) {
    var r = rowMap[NERACA_ORDER[i]]
    if (!r) return false
    // Wajib terisi: dm_pasok, beban_puncak_siang, beban_puncak_malam
    if (r.dm_pasok == null || r.beban_puncak_siang == null || r.beban_puncak_malam == null) return false
  }
  return true
}

// ── Generate Excel base64 untuk kirim WA (reuse _buildNeracaWorkbook) ─────────
function buildNeracaExcelBuffer(rows, tanggal) {
  var result = _buildNeracaWorkbook(rows, tanggal)
  // Gunakan type:'base64' langsung dari SheetJS — menghindari btoa(String.fromCharCode)
  // yang corrupt saat ada byte > 127 (karakter non-Latin1)
  var b64 = XLSX.write(result.wb, { bookType: 'xlsx', type: 'base64' })
  return { buffer: b64, fileName: result.fileName }
}

// ── Capture tabel neraca sebagai gambar PNG → kirim WA ───────────────────────
async function captureAndKirimScreenshot(tanggal) {
  // Render tabel ringkas dari data neraca ke div tersembunyi lalu screenshot
  var NERACA_ORDER = [399,390,382,391,376,373,395,375,366,910,911,385,913,915,920,917,918,919,372]

  // Ambil data fresh dari API
  var res  = await fetch('/api/neraca-daya?tanggal=' + tanggal)
  var json = await res.json()
  if (!json.success) throw new Error('Gagal fetch neraca: ' + (json.error||''))
  var rows = json.data

  // Sort sesuai NERACA_ORDER
  var rowMap = {}
  rows.forEach(function(r) { rowMap[r.kode_unit] = r })
  var sorted = []
  NERACA_ORDER.forEach(function(ku) { if (rowMap[ku]) sorted.push(rowMap[ku]) })

  var tglParts = tanggal.split('-')
  var tglLabel = tglParts[2] + '.' + tglParts[1] + '.' + tglParts[0]

  // Build HTML tabel ringkas untuk screenshot
  var html = '<div style="font-family:Arial,sans-serif;background:#fff;padding:16px;width:900px;">'
  html += '<div style="background:#1a3352;color:#fff;padding:10px 16px;border-radius:6px 6px 0 0;margin-bottom:0;">'
  html += '<b style="font-size:15px;">NERACA DAYA HARIAN — ' + tglLabel + '</b>'
  html += '<span style="float:right;font-size:12px;opacity:0.8;">AMC UID KASELTENG</span></div>'
  html += '<table style="width:100%;border-collapse:collapse;font-size:12px;">'
  // Header
  html += '<thead><tr style="background:#2d6a9f;color:#fff;">'
  var cols = ['No','ULD','OPS','STB','HAR','GGN','RSK','JML','DTP','DMN','MAKS','BP SIANG','CAD SIANG','BP MALAM','CAD MALAM','STATUS']
  cols.forEach(function(c, ci) {
    var w = ci === 1 ? 'width:180px;text-align:left;' : 'text-align:center;'
    html += '<th style="padding:6px 8px;border:1px solid #1a4f80;' + w + '">' + c + '</th>'
  })
  html += '</tr></thead><tbody>'

  function fn(v) { return v != null && v !== '-' ? v.toString().replace(/\B(?=(\d{3})+(?!\d))/g,'.') : '-' }

  var totalOps=0,totalStb=0,totalHar=0,totalGgn=0,totalRsk=0,totalJml=0
  var totalDtp=0,totalDmn=0,totalMaks=0,totalBpS=0,totalCadS=0,totalBpM=0,totalCadM=0

  for (var i = 0; i < sorted.length; i++) {
    var r = sorted[i]
    var cadM = (r.dm_pasok != null && r.beban_puncak_malam != null && r.beban_puncak_malam > 0)
               ? (r.dm_pasok - r.beban_puncak_malam) : null
    var cadS = (r.dm_pasok != null && r.beban_puncak_siang != null)
               ? (r.dm_pasok - r.beban_puncak_siang) : null
    var status = '-', statusBg = '#f1f5f9', statusFg = '#64748b'
    if (cadM !== null) {
      if      (cadM < 0)                              { status='DEFISIT'; statusBg='#fee2e2'; statusFg='#991b1b' }
      else if (cadM >= 0 && cadM < (r.max_dm||0))    { status='SIAGA';   statusBg='#fef3c7'; statusFg='#92400e' }
      else                                             { status='NORMAL';  statusBg='#d1fae5'; statusFg='#065f46' }
    }
    var bg = i % 2 === 0 ? '#fff' : '#f8fafc'
    var td = 'style="padding:5px 8px;border:1px solid #e2e8f0;text-align:center;background:' + bg + ';"'
    var tdL = 'style="padding:5px 8px;border:1px solid #e2e8f0;text-align:left;background:' + bg + ';white-space:nowrap;"'
    html += '<tr>'
    html += '<td ' + td + '>' + (i+1) + '</td>'
    html += '<td ' + tdL + '>' + (r.nama_unit||'-') + '</td>'
    html += '<td ' + td + '>' + fn(r.jumlah_operasi) + '</td>'
    html += '<td ' + td + '>' + fn(r.jumlah_standby) + '</td>'
    html += '<td ' + td + '>' + fn(r.jumlah_pemeliharaan) + '</td>'
    html += '<td ' + td + '>' + fn(r.jumlah_gangguan) + '</td>'
    html += '<td ' + td + '>' + fn(r.jumlah_rusak) + '</td>'
    html += '<td ' + td + '><b>' + fn(r.jumlah_mesin) + '</b></td>'
    html += '<td ' + td + '>' + fn(r.dm_terpasang) + '</td>'
    html += '<td ' + td + '>' + fn(r.dm_pasok) + '</td>'
    html += '<td ' + td + '>' + fn(r.max_dm) + '</td>'
    html += '<td ' + td + '>' + fn(r.beban_puncak_siang) + '</td>'
    html += '<td ' + td + '><b>' + fn(cadS) + '</b></td>'
    html += '<td ' + td + '>' + fn(r.beban_puncak_malam) + '</td>'
    html += '<td ' + td + '><b>' + fn(cadM) + '</b></td>'
    html += '<td style="padding:5px 8px;border:1px solid #e2e8f0;text-align:center;background:' + statusBg + ';color:' + statusFg + ';font-weight:bold;">' + status + '</td>'
    html += '</tr>'

    totalOps  += r.jumlah_operasi      || 0
    totalStb  += r.jumlah_standby      || 0
    totalHar  += r.jumlah_pemeliharaan || 0
    totalGgn  += r.jumlah_gangguan     || 0
    totalRsk  += r.jumlah_rusak        || 0
    totalJml  += r.jumlah_mesin        || 0
    totalDtp  += r.dm_terpasang        || 0
    totalDmn  += r.dm_pasok            || 0
    totalMaks += r.max_dm              || 0
    totalBpS  += r.beban_puncak_siang  || 0
    if (cadS != null) totalCadS += cadS
    totalBpM  += r.beban_puncak_malam  || 0
    if (cadM != null) totalCadM += cadM
  }

  // Baris total
  var ttd = 'style="padding:5px 8px;border:1px solid #1a4f80;text-align:center;background:#1a3352;color:#fff;font-weight:bold;"'
  html += '<tr>'
  html += '<td ' + ttd + '></td>'
  html += '<td style="padding:5px 8px;border:1px solid #1a4f80;background:#1a3352;color:#fff;font-weight:bold;">TOTAL</td>'
  html += '<td ' + ttd + '>' + totalOps  + '</td>'
  html += '<td ' + ttd + '>' + totalStb  + '</td>'
  html += '<td ' + ttd + '>' + totalHar  + '</td>'
  html += '<td ' + ttd + '>' + totalGgn  + '</td>'
  html += '<td ' + ttd + '>' + totalRsk  + '</td>'
  html += '<td ' + ttd + '>' + totalJml  + '</td>'
  html += '<td ' + ttd + '>' + fn(totalDtp)  + '</td>'
  html += '<td ' + ttd + '>' + fn(totalDmn)  + '</td>'
  html += '<td ' + ttd + '>' + fn(totalMaks) + '</td>'
  html += '<td ' + ttd + '>' + fn(totalBpS)  + '</td>'
  html += '<td ' + ttd + '>' + fn(Math.round(totalCadS)) + '</td>'
  html += '<td ' + ttd + '>' + fn(totalBpM)  + '</td>'
  html += '<td ' + ttd + '>' + fn(Math.round(totalCadM)) + '</td>'
  html += '<td ' + ttd + '></td>'
  html += '</tr>'

  html += '</tbody></table>'
  html += '<div style="text-align:right;font-size:10px;color:#94a3b8;margin-top:6px;">Generated ' + new Date().toLocaleString('id-ID') + '</div>'
  html += '</div>'

  // Render ke div tersembunyi → html2canvas
  var wrapper = document.createElement('div')
  wrapper.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1;'
  wrapper.innerHTML = html
  document.body.appendChild(wrapper)

  try {
    var canvas = await html2canvas(wrapper.firstElementChild, {
      scale: 2,           // 2x resolusi agar teks tajam
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false
    })
    var pngBase64 = canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '')

    // Kirim ke server → ImgBB → WA
    var ssRes  = await fetch('/api/kirim-wa-screenshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: pngBase64, tanggal: tanggal })
    })
    var ssJson = await ssRes.json()
    if (!ssJson.success) throw new Error(ssJson.error || 'Gagal kirim screenshot')
    return ssJson
  } finally {
    document.body.removeChild(wrapper)
  }
}

// ── Auto kirim Screenshot + Excel Neraca ke WA Group saat semua data terisi ──
var _neracaWaSent = {}  // { 'YYYY-MM-DD': true } agar tidak kirim dua kali per tanggal

async function autoKirimNeracaWA(rows, tanggal) {
  if (_neracaWaSent[tanggal]) return  // sudah dikirim hari ini
  if (!isNeracaAllFilled(rows)) return

  try {
    _neracaWaSent[tanggal] = true
    showToast('Semua data neraca terisi — mengirim ke WA Group...', 'info')

    // 1. Kirim screenshot tabel terlebih dahulu (tampil langsung di WA)
    await captureAndKirimScreenshot(tanggal)

    // 2. Generate Excel → upload → kirim file xlsx
    var result = buildNeracaExcelBuffer(rows, tanggal)
    var upRes  = await fetch('/api/neraca-excel-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: result.fileName, data: result.buffer })
    })
    var upJson = await upRes.json()
    if (!upJson.success) throw new Error('Upload Excel gagal: ' + upJson.error)

    var waRes  = await fetch('/api/kirim-wa-neraca', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileUrl: upJson.url, filename: result.fileName, tanggal: tanggal })
    })
    var waJson = await waRes.json()
    if (!waJson.success) throw new Error(waJson.error)

    showToast('✅ Screenshot + Excel neraca dikirim ke group WA!', 'success')
  } catch(e) {
    _neracaWaSent[tanggal] = false  // reset agar bisa retry
    showToast('Gagal kirim WA: ' + e.message, 'error')
  }
}

function onDataTanggalChange() {
  if (currentDataView === 'neraca-daya') {
    loadNeracaDayaTab()
    // Reload grafik BP jika ada ULD yang dipilih
    var selUld = document.getElementById('neraca-chart-uld')
    if (selUld && selUld.value) loadNeracaChart()
  }
  else if (currentDataView === 'sfc') loadSfcTab()
  else if (currentDataView === 'hop-bbm') loadDataTab()
  else loadStockOliTab()
}

// =============================================
// NERACA DAYA
// =============================================
async function loadNeracaDayaTab() {
  var tanggal = document.getElementById('data-tanggal').value
  if (!tanggal) { showToast('Pilih tanggal terlebih dahulu', 'info'); return }

  // Derive bulan dari tanggal yang dipilih
  var bulan = tanggal.substring(0, 7)
  var parts = bulan.split('-').map(Number)
  var yr = parts[0], mo = parts[1]
  var daysInMonth = new Date(yr, mo, 0).getDate()

  // Gunakan tanggal yang dipilih untuk data detail
  var tanggalDetail = tanggal

  // Kolom tetap
  var fixedCols = ['NO', 'ULD', 'OPS', 'STB', 'HAR', 'GGN', 'RSK',
    'JML', 'POLA', 'DTP', 'DMN', 'MAKS',
    'BP SIANG', 'CAD SIANG',
    'BP MALAM', 'CAD MALAM', 'N-1', 'STATUS']

  // Render header (selalu ulang karena jumlah kolom tanggal bisa berubah tiap bulan)
  var headHTML = '<tr>'
  // Kolom tetap
  for (var i = 0; i < fixedCols.length; i++) {
    var sticky = i === 0 ? 'position:sticky;left:0;z-index:2;' : i === 1 ? 'position:sticky;left:0;z-index:2;' : ''
    var w = i === 0 ? 'width:1px;white-space:nowrap;padding:8px 6px;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;' : 'padding:8px 14px;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;'
    headHTML += '<th style="background:#1a3352;color:#fff;white-space:nowrap;font-size:0.72rem;text-align:center;' + w + sticky + '">' + fixedCols[i] + '</th>'
  }
  // Kolom tanggal 1 – N
  for (var d = 1; d <= daysInMonth; d++) {
    headHTML += '<th style="background:#1a3352;color:#fff;white-space:nowrap;font-size:0.72rem;text-align:center;padding:8px 6px;min-width:28px;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;">' + d + '</th>'
  }
  headHTML += '</tr>'
  document.getElementById('neraca-table-head').innerHTML = headHTML
  neracaTableInited = true

  showLoading(true, 'loading-indicator-data')
  document.getElementById('info-data-record').textContent = ''
  try {
    // Ambil data detail, bulanan, dan event padam bulan ini secara paralel
    var [resDetail, resBulanan, resPadam] = await Promise.all([
      fetch('/api/neraca-daya?tanggal=' + tanggalDetail),
      fetch('/api/neraca-daya-bulanan?bulan=' + bulan),
      fetch('/api/event-padam-bulanan?bulan=' + bulan)
    ])
    var jsonDetail  = await resDetail.json()
    var jsonBulanan = await resBulanan.json()
    var jsonPadam   = resPadam.ok ? await resPadam.json() : { success: false, data: [] }
    if (!jsonDetail.success)  throw new Error(jsonDetail.error  || 'Gagal memuat neraca daya')
    if (!jsonBulanan.success) throw new Error(jsonBulanan.error || 'Gagal memuat data bulanan')

    // Build set padam: "kode_unit_tanggal"
    var padamSetNeraca = new Set()
    if (jsonPadam.success && jsonPadam.data) {
      for (var pi = 0; pi < jsonPadam.data.length; pi++) {
        padamSetNeraca.add(jsonPadam.data[pi].kode_unit + '_' + jsonPadam.data[pi].tanggal)
      }
    }

    var rows    = jsonDetail.data
    var bulanan = jsonBulanan.data  // array: { kode_unit, nama_unit, daily: { 'YYYY-MM-DD': status|null } }

    // Buat map kode_unit → daily status
    var dailyMap = {}
    for (var b = 0; b < bulanan.length; b++) {
      dailyMap[bulanan[b].kode_unit] = bulanan[b].daily || {}
    }

    function fmtN(v) { return v != null ? v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '-' }
    var tbody = ''
    var totalTerpasang = 0, totalPasok = 0, totalBeban = 0
    var totalOps = 0, totalStb = 0, totalHar = 0, totalGgn = 0, totalRsk = 0, totalJml = 0
    var totalMaks = 0, totalBpSiang = 0, totalCadSiang = 0, totalCadMalam = 0
    // Warna status tanggal
    function statusBgColor(s) {
      if (!s) return '#f1f5f9'
      if (s === 'NORMAL')  return '#d1fae5'
      if (s === 'SIAGA')   return '#fef3c7'
      if (s === 'DEFISIT') return '#fee2e2'
      return '#f1f5f9'
    }
    function statusTxtColor(s) {
      if (!s) return '#e2e8f0'
      if (s === 'NORMAL')  return '#065f46'
      if (s === 'SIAGA')   return '#92400e'
      if (s === 'DEFISIT') return '#991b1b'
      return '#e2e8f0'
    }

    for (var i = 0; i < rows.length; i++) {
      var r = rows[i]
      var cadMalam = (r.dm_pasok != null && r.beban_puncak_malam != null && r.beban_puncak_malam > 0) ? (r.dm_pasok - r.beban_puncak_malam) : null
      var isPadam  = padamSetNeraca.has(r.kode_unit + '_' + tanggalDetail)
      // STATUS berdasarkan cadangan malam + event padam
      var statusTxt, statusColor
      if (cadMalam === null) {
        statusTxt = '-'; statusColor = '#64748b'
      } else if (isPadam) {
        statusTxt = 'DEFISIT'; statusColor = '#c0392b'
      } else if (cadMalam >= 0 && cadMalam < (r.max_dm || 0)) {
        statusTxt = 'SIAGA';   statusColor = '#e67e22'
      } else if (cadMalam >= (r.max_dm || 0)) {
        statusTxt = 'NORMAL';  statusColor = '#27ae60'
      } else {
        statusTxt = 'DEFISIT'; statusColor = '#c0392b'
      }
      var cadSiang = (r.dm_pasok != null && r.beban_puncak_siang != null) ? (r.dm_pasok - r.beban_puncak_siang) : null

      totalTerpasang += r.dm_terpasang || 0
      totalPasok     += r.dm_pasok     || 0
      totalBeban     += r.beban_puncak_malam || 0
      totalOps     += r.jumlah_operasi      || 0
      totalStb     += r.jumlah_standby      || 0
      totalHar     += r.jumlah_pemeliharaan || 0
      totalGgn     += r.jumlah_gangguan     || 0
      totalRsk     += r.jumlah_rusak        || 0
      totalJml     += r.jumlah_mesin        || 0
      totalMaks    += r.max_dm              || 0
      totalBpSiang += r.beban_puncak_siang  || 0
      if (cadSiang != null) totalCadSiang += cadSiang
      if (cadMalam != null) totalCadMalam += cadMalam

      var bg = i % 2 === 0 ? '#fff' : '#f5f7fa'
      var stickyStyle0 = 'position:sticky;left:0;z-index:1;background:' + bg + ';width:1px;white-space:nowrap;'
      var stickyStyle1 = 'position:sticky;left:0;z-index:1;background:' + bg + ';'

      tbody += '<tr style="background:' + bg + ';font-size:0.78rem;">'
      tbody += '<td style="' + stickyStyle0 + 'text-align:center;padding:6px 4px;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;">' + (i+1) + '</td>'
      tbody += '<td style="' + stickyStyle1 + 'text-align:left;padding:6px 10px;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;white-space:nowrap;">' + (r.nama_unit || '-') + '</td>'
      tbody += '<td style="text-align:center;padding:6px 14px;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;">' + (r.jumlah_operasi != null ? r.jumlah_operasi : '-') + '</td>'
      tbody += '<td style="text-align:center;padding:6px 14px;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;">' + (r.jumlah_standby != null ? r.jumlah_standby : '-') + '</td>'
      tbody += '<td style="text-align:center;padding:6px 14px;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;">' + (r.jumlah_pemeliharaan != null ? r.jumlah_pemeliharaan : '-') + '</td>'
      tbody += '<td style="text-align:center;padding:6px 14px;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;">' + (r.jumlah_gangguan != null ? r.jumlah_gangguan : '-') + '</td>'
      tbody += '<td style="text-align:center;padding:6px 14px;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;">' + (r.jumlah_rusak != null ? r.jumlah_rusak : '-') + '</td>'
      tbody += '<td style="text-align:center;padding:6px 14px;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;font-weight:600;">' + (r.jumlah_mesin != null ? r.jumlah_mesin : '-') + '</td>'
      var polaVal = POLA_MAP[r.kode_unit] != null ? POLA_MAP[r.kode_unit] : '-'
      tbody += '<td style="text-align:center;padding:6px 14px;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;">' + polaVal + '</td>'
      tbody += '<td style="text-align:center;padding:6px 14px;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;">' + fmtN(r.dm_terpasang) + '</td>'
      tbody += '<td style="text-align:center;padding:6px 14px;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;">' + fmtN(r.dm_pasok) + '</td>'
      tbody += '<td style="text-align:center;padding:6px 14px;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;">' + fmtN(r.max_dm) + '</td>'
      tbody += '<td style="text-align:center;padding:6px 14px;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;">' + fmtN(r.beban_puncak_siang) + '</td>'
      tbody += '<td style="text-align:center;padding:6px 14px;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;font-weight:600;">' + fmtN(cadSiang) + '</td>'
      tbody += '<td style="text-align:center;padding:6px 14px;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;">' + fmtN(r.beban_puncak_malam) + '</td>'
      tbody += '<td style="text-align:center;padding:6px 14px;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;font-weight:600;">' + fmtN(cadMalam) + '</td>'
      var n1 = (cadMalam != null && r.max_dm != null) ? (cadMalam - r.max_dm) : null
      tbody += '<td style="text-align:center;padding:6px 14px;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;font-weight:600;">' + fmtN(n1) + '</td>'
      tbody += '<td style="text-align:center;padding:6px 14px;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;font-weight:bold;color:' + statusColor + ';">' + statusTxt + '</td>'

      // Kolom tanggal harian
      var unitDaily = dailyMap[r.kode_unit] || {}
      for (var d = 1; d <= daysInMonth; d++) {
        var tgl = bulan + '-' + String(d).padStart(2, '0')
        var ds = unitDaily[tgl] || null
        var bgC = statusBgColor(ds)
        var txC = statusTxtColor(ds)
        var lbl = ''  // hanya warna, tanpa teks
        tbody += '<td onclick="showNeracaDetailPopup(' + r.kode_unit + ',\'' + (r.nama_unit||'-').replace(/'/g,"\\'") + '\',\'' + tgl + '\')" style="cursor:pointer;text-align:center;padding:4px 2px;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;background:' + bgC + ';color:' + txC + ';font-size:0.65rem;font-weight:700;min-width:28px;" title="' + (ds||'Tidak ada data') + ' — klik untuk detail">' + lbl + '</td>'
      }
      tbody += '</tr>'
    }

    // Baris total
    var totalCadangan = totalPasok - totalBeban
    var totalStatusTxt, totalStatusColor
    if (totalCadangan < 0) { totalStatusTxt = 'DEFISIT'; totalStatusColor = '#c0392b' }
    else { totalStatusTxt = 'NORMAL'; totalStatusColor = '#27ae60' }
    // Hitung jumlah status per tanggal untuk baris total
    var totalCols = fixedCols.length - 2  // tanpa NO dan ULD
    tbody += '<tr style="background:#1a3352;color:#fff;font-weight:bold;font-size:0.78rem;border-top:none;">'
    tbody += '<td style="position:sticky;left:0;z-index:2;background:#1a3352;text-align:center;width:1px;white-space:nowrap;padding:6px 4px;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;"></td>'
    tbody += '<td style="position:sticky;left:0;z-index:2;background:#1a3352;padding:6px 10px;white-space:nowrap;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;">TOTAL</td>'
    var tdT = 'background:#1a3352;text-align:center;padding:6px 14px;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;'
    tbody += '<td style="' + tdT + '">' + totalOps + '</td>'
    tbody += '<td style="' + tdT + '">' + totalStb + '</td>'
    tbody += '<td style="' + tdT + '">' + totalHar + '</td>'
    tbody += '<td style="' + tdT + '">' + totalGgn + '</td>'
    tbody += '<td style="' + tdT + '">' + totalRsk + '</td>'
    tbody += '<td style="' + tdT + 'font-weight:bold;">' + totalJml + '</td>'
    tbody += '<td style="' + tdT + '"></td>'  // POLA
    tbody += '<td style="' + tdT + '">' + fmtN(totalTerpasang) + '</td>'
    tbody += '<td style="' + tdT + '">' + fmtN(totalPasok) + '</td>'
    tbody += '<td style="' + tdT + '">' + fmtN(totalMaks) + '</td>'
    tbody += '<td style="' + tdT + '">' + fmtN(totalBpSiang) + '</td>'
    tbody += '<td style="' + tdT + 'font-weight:bold;">' + fmtN(totalCadSiang) + '</td>'
    tbody += '<td style="' + tdT + '">' + fmtN(totalBeban) + '</td>'
    tbody += '<td style="' + tdT + 'font-weight:bold;">' + fmtN(totalCadMalam) + '</td>'
    tbody += '<td style="' + tdT + '"></td>'  // N-1
    tbody += '<td style="' + tdT + '"></td>'  // STATUS
    // Kolom tanggal di baris total: kosong
    for (var d2 = 1; d2 <= daysInMonth; d2++) tbody += '<td style="background:#1a3352;padding:4px 2px;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;"></td>'
    tbody += '</tr>'

    document.getElementById('neraca-table-body').innerHTML = tbody
    document.getElementById('info-data-record').textContent = rows.length + ' unit · ' + bulan + ' (' + daysInMonth + ' hari)'

    // Auto kirim Excel ke WA Group jika semua data terisi
    autoKirimNeracaWA(rows, tanggalDetail)

    // Adjust left kolom ULD ikut lebar sebenar kolom NO
    requestAnimationFrame(function() {
      var tbl = document.getElementById('neraca-table')
      if (!tbl) return
      var colNo = tbl.querySelector('th:first-child')
      if (!colNo) return
      var noWidth = colNo.getBoundingClientRect().width
      var ths = tbl.querySelectorAll('th:nth-child(2), td:nth-child(2)')
      ths.forEach(function(el) { el.style.left = noWidth + 'px' })
    })
  } catch(e) {
    showToast('Gagal memuat neraca daya: ' + e.message, 'error')
  } finally {
    showLoading(false, 'loading-indicator-data')
  }
}

// ── Popup detail mesin per ULD ────────────────────────────────────────────
// State edit popup (client-side only, tidak menyentuh database)
var _popupEditMode   = false
var _popupEditedData = []   // copy data dari API, bisa diubah user
var _popupOrigData   = []   // snapshot awal saat popup dibuka (untuk reset)
var _popupOrigBp     = null // BP asli dari neraca (tidak berubah saat edit)
var _popupKodeUnit   = null // kode_unit popup aktif
var _popupAllMesin   = []   // semua mesin unit ini dari mesin_cache
var _allUnitMesin    = []   // semua mesin SEMUA unit dari /api/mesin-cache

function _statusStyle(s) {
  if (s === 'Operasi')      return 'background:#d1fae5;color:#065f46;'
  if (s === 'Standby')      return 'background:#dbeafe;color:#1e40af;'
  if (s === 'Pemeliharaan') return 'background:#fef3c7;color:#92400e;'
  if (s === 'Gangguan')     return 'background:#fee2e2;color:#991b1b;'
  if (s === 'Rusak')        return 'background:#fce7f3;color:#9d174d;'
  return 'background:#f1f5f9;color:#64748b;'
}
function _sfcStyle(sfc) {
  if (sfc === null) return 'color:#94a3b8;'
  if (sfc <= 0.3157) return 'color:#16a34a;font-weight:700;'
  if (sfc <= 0.3188) return 'color:#d97706;font-weight:700;'
  return 'color:#dc2626;font-weight:700;'
}
function _fmtKW(v) { return (v != null && v !== 'null') ? Number(v).toLocaleString('id-ID') + ' kW' : '-' }

// Hitung ulang info bar dari editedData (client-side)
function _recalcInfoBar() {
  var infoBar = document.getElementById('modal-detail-infobar')
  if (!infoBar) return
  // DMN = SUM DM mesin yang bukan Rusak & Gangguan
  var newDmn  = 0
  var newMaks = 0
  for (var i = 0; i < _popupEditedData.length; i++) {
    var m = _popupEditedData[i]
    var st = m.status_mesin || '-'
    if (st !== 'Rusak' && st !== 'Gangguan') {
      var dm = m.daya_mampu != null ? Number(m.daya_mampu) : 0
      newDmn += dm
      if (dm > newMaks) newMaks = dm
    }
  }
  var bp  = _popupOrigBp != null ? Number(_popupOrigBp) : 0
  var cad = newDmn - bp
  var n1  = cad - newMaks
  var newStatusTxt, scBg, scTx
  if (cad < 0)              { newStatusTxt = 'DEFISIT'; scBg = '#fee2e2'; scTx = '#c0392b' }
  else if (cad < newMaks)   { newStatusTxt = 'SIAGA';   scBg = '#fef3c7'; scTx = '#e67e22' }
  else                      { newStatusTxt = 'NORMAL';   scBg = '#dcfce7'; scTx = '#27ae60' }

  var cols = [
    { label: 'DMN',    val: _fmtKW(newDmn) },
    { label: 'BP',     val: _fmtKW(bp) },
    { label: 'CAD',    val: _fmtKW(cad) },
    { label: 'MAKS',   val: _fmtKW(newMaks) },
    { label: 'N-1',    val: _fmtKW(n1) },
    { label: 'STATUS', val: null }
  ]
  var cellStyle     = 'flex:1;text-align:center;padding:6px 4px;border-right:1px solid #e2e8f0;'
  var cellStyleLast = 'flex:1;text-align:center;padding:6px 4px;'
  var row1 = '', row2 = ''
  for (var ci = 0; ci < cols.length; ci++) {
    var cs = ci < cols.length - 1 ? cellStyle : cellStyleLast
    row1 += '<div style="' + cs + 'font-size:0.7rem;font-weight:600;color:#64748b;background:#f1f5f9;">' + cols[ci].label + '</div>'
    if (cols[ci].label === 'STATUS') {
      row2 += '<div style="' + cs + 'font-size:0.78rem;font-weight:700;"><span style="background:' + scBg + ';color:' + scTx + ';padding:2px 10px;border-radius:10px;font-size:0.72rem;">' + newStatusTxt + '</span></div>'
    } else {
      row2 += '<div style="' + cs + 'font-size:0.78rem;font-weight:700;color:#1e3a5f;">' + cols[ci].val + '</div>'
    }
  }
  infoBar.innerHTML =
    '<div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:10px;">'
    + '<div style="display:flex;border-bottom:1px solid #e2e8f0;">' + row1 + '</div>'
    + '<div style="display:flex;">' + row2 + '</div>'
    + '</div>'
}

// Render tabel isi popup (view mode atau edit mode)
function _renderPopupTable() {
  var body = document.getElementById('modal-detail-body')
  if (!body) return
  var em = _popupEditMode
  var inputBase = 'font-size:0.75rem;border:1px solid #93c5fd;border-radius:4px;padding:3px 4px;width:100%;box-sizing:border-box;text-align:center;'
  var statOpts  = ['Operasi','Standby','Pemeliharaan','Gangguan','Rusak']

  // colgroup — tambah kolom Aksi saat edit mode
  var html = '<table style="width:100%;border-collapse:collapse;font-size:0.78rem;table-layout:fixed;">'
  if (em) {
    html += '<colgroup><col style="width:36px"><col><col style="width:103px"><col style="width:81px"><col style="width:90px"><col style="width:90px"><col style="width:90px"><col style="width:73px"><col style="width:73px"><col style="width:44px"></colgroup>'
  } else {
    html += '<colgroup><col style="width:36px"><col><col style="width:103px"><col style="width:81px"><col style="width:90px"><col style="width:90px"><col style="width:90px"><col style="width:73px"><col style="width:73px"></colgroup>'
  }
  html += '<thead><tr style="background:#1e3a5f;color:#fff;">'
  html += '<th style="padding:8px 4px;text-align:center;border-right:1px solid #2d5a8e;font-size:0.78rem;font-weight:600;">No</th>'
  html += '<th style="padding:8px 10px;text-align:center;border-right:1px solid #2d5a8e;font-size:0.78rem;font-weight:600;">Mesin</th>'
  html += '<th style="padding:8px 6px;text-align:center;border-right:1px solid #2d5a8e;font-size:0.78rem;font-weight:600;">Status</th>'
  html += '<th style="padding:8px 6px;text-align:center;border-right:1px solid #2d5a8e;font-size:0.78rem;font-weight:600;">DM (kW)</th>'
  html += '<th style="padding:8px 6px;text-align:center;border-right:1px solid #2d5a8e;font-size:0.78rem;font-weight:600;">Beban (kW)</th>'
  html += '<th style="padding:8px 6px;text-align:center;border-right:1px solid #2d5a8e;font-size:0.78rem;font-weight:600;">BBM (L)</th>'
  html += '<th style="padding:8px 6px;text-align:center;border-right:1px solid #2d5a8e;font-size:0.78rem;font-weight:600;">kWh</th>'
  html += '<th style="padding:8px 6px;text-align:center;border-right:1px solid #2d5a8e;font-size:0.78rem;font-weight:600;">SFC</th>'
  html += '<th style="padding:8px 6px;text-align:center;' + (em ? 'border-right:1px solid #2d5a8e;' : '') + 'font-size:0.78rem;font-weight:600;">Jam Kerja</th>'
  if (em) html += '<th style="padding:8px 4px;text-align:center;font-size:0.78rem;font-weight:600;"></th>'
  html += '</tr></thead><tbody>'

  for (var i = 0; i < _popupEditedData.length; i++) {
    var m  = _popupEditedData[i]
    var bg = i % 2 === 0 ? '#fff' : '#f8fafc'
    var isNew = !!m._isNew  // mesin yang ditambahkan manual
    html += '<tr style="background:' + (isNew ? '#f0fdf4' : bg) + ';' + (isNew ? 'outline:1px solid #86efac;outline-offset:-1px;' : '') + '">'
    html += '<td style="padding:7px 6px;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;text-align:center;">' + (i+1) + '</td>'
    html += '<td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;text-align:left;font-size:0.75rem;">' + (m.nama_mesin || '-') + (isNew ? ' <span style="font-size:0.65rem;background:#bbf7d0;color:#166534;padding:1px 5px;border-radius:8px;font-weight:600;">BARU</span>' : '') + '</td>'

    // Status
    if (em) {
      html += '<td style="padding:4px 6px;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">'
      html += '<select onchange="_onPopupFieldChange(' + i + ',\'status_mesin\',this.value)" style="' + inputBase + 'background:#fff;">'
      for (var si = 0; si < statOpts.length; si++) {
        var sel = (m.status_mesin === statOpts[si]) ? ' selected' : ''
        html += '<option value="' + statOpts[si] + '"' + sel + '>' + statOpts[si] + '</option>'
      }
      html += '</select></td>'
    } else {
      html += '<td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;text-align:center;">'
      html += '<span style="padding:2px 8px;border-radius:10px;font-size:0.72rem;font-weight:600;' + _statusStyle(m.status_mesin) + '">' + (m.status_mesin || '-') + '</span></td>'
    }

    // DM (kW)
    if (em) {
      html += '<td style="padding:4px 6px;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">'
      html += '<input type="number" min="0" value="' + (m.daya_mampu != null ? m.daya_mampu : '') + '" onchange="_onPopupFieldChange(' + i + ',\'daya_mampu\',this.value)" style="' + inputBase + '"/></td>'
    } else {
      html += '<td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;text-align:center;">' + (m.daya_mampu != null ? m.daya_mampu.toLocaleString('id-ID') : '-') + '</td>'
    }

    // Beban, BBM, kWh — read-only
    html += '<td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;text-align:center;">' + (m.beban != null ? m.beban.toLocaleString('id-ID') : '-') + '</td>'
    html += '<td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;text-align:center;">' + (m.pemakaian_bbm != null ? m.pemakaian_bbm.toLocaleString('id-ID') : '-') + '</td>'
    html += '<td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;text-align:center;">' + (m.kwh_produksi != null ? m.kwh_produksi.toLocaleString('id-ID') : '-') + '</td>'
    html += '<td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;text-align:center;' + _sfcStyle(m.sfc) + '">' + (m.sfc != null ? m.sfc.toFixed(4) : '-') + '</td>'
    // Jam Kerja Mesin — read-only
    html += '<td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;' + (em ? 'border-right:1px solid #e2e8f0;' : '') + 'text-align:center;">' + (m.jam_kerja_mesin != null ? m.jam_kerja_mesin.toLocaleString('id-ID') : '-') + '</td>'

    // Kolom Aksi — hanya saat edit mode, hanya mesin _isNew yang bisa dihapus
    if (em) {
      if (isNew) {
        html += '<td style="padding:4px 2px;border-bottom:1px solid #e2e8f0;text-align:center;">'
        html += '<button onclick="_hapusMesinDariPopup(' + i + ')" style="background:#fee2e2;color:#dc2626;border:none;border-radius:4px;padding:3px 7px;font-size:0.72rem;font-weight:700;cursor:pointer;">✕</button></td>'
      } else {
        html += '<td style="border-bottom:1px solid #e2e8f0;"></td>'
      }
    }
    html += '</tr>'
  }
  html += '</tbody></table>'

  // Footer
  html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;flex-wrap:wrap;gap:8px;">'
  html += '<div style="display:flex;gap:12px;font-size:0.7rem;flex-wrap:wrap;">'
  html += '<span style="color:#16a34a;font-weight:600;">● SFC ≤ 0.3157 (KPI)</span>'
  html += '<span style="color:#d97706;font-weight:600;">● 0.3157 &lt; SFC ≤ 0.3188 (SLA)</span>'
  html += '<span style="color:#dc2626;font-weight:600;">● SFC &gt; 0.3188 (Tidak Tercapai)</span>'
  html += '</div>'
  if (em) {
    html += '<button onclick="_showTambahMesinPicker()" style="background:#1e3a5f;color:#fff;border:none;border-radius:6px;padding:5px 14px;font-size:0.78rem;font-weight:600;cursor:pointer;white-space:nowrap;">+ TAMBAH MESIN</button>'
  }
  html += '</div>'
  if (em) {
    html += '<div style="margin-top:8px;padding:6px 10px;background:#fef9c3;border:1px solid #fde68a;border-radius:6px;font-size:0.72rem;color:#92400e;">'
    html += '⚠️ Mode edit aktif — perubahan hanya tampilan, tidak tersimpan ke database.'
    html += '</div>'
  }
  body.innerHTML = html
}

// Tampilkan picker mesin — desain 2 panel: kiri=daftar unit, kanan=daftar mesin
function _showTambahMesinPicker() {
  // ID mesin yang sudah ada di tabel saat ini
  var existingIds = {}
  for (var ei = 0; ei < _popupEditedData.length; ei++) existingIds[_popupEditedData[ei].id_mesin] = true

  var existing = document.getElementById('_popup-mesin-picker')
  if (existing) existing.remove()

  // ── Kelompokkan per unit ──
  var unitMap   = {}
  var unitOrder = []
  for (var mi = 0; mi < _allUnitMesin.length; mi++) {
    var m = _allUnitMesin[mi]
    var ku = m.kode_unit
    if (!unitMap[ku]) {
      unitMap[ku] = { nama_unit: m.nama_unit || ('Unit ' + ku), mesin: [] }
      unitOrder.push(ku)
    }
    unitMap[ku].mesin.push(m)
  }
  unitOrder.sort(function(a, b) {
    if (a === _popupKodeUnit) return -1
    if (b === _popupKodeUnit) return  1
    return unitMap[a].nama_unit.localeCompare(unitMap[b].nama_unit)
  })

  // ── Bangun HTML ──
  // Card: lebar 680px, tinggi 72vh, 2 panel side-by-side
  var card = '<div style="background:#fff;border-radius:10px;width:680px;max-width:96vw;height:72vh;'
           + 'display:flex;flex-direction:column;box-shadow:0 8px 32px rgba(0,0,0,0.25);overflow:hidden;">'

  // ── Header ──
  card += '<div style="display:flex;justify-content:space-between;align-items:center;'
        + 'padding:12px 16px;border-bottom:1px solid #e2e8f0;flex-shrink:0;">'
  card += '<b style="font-size:0.9rem;color:#1e3a5f;">Tambah Mesin ke Tabel</b>'
  card += '<button onclick="document.getElementById(\'_popup-mesin-picker\').remove()" '
        + 'style="background:none;border:none;font-size:1.2rem;cursor:pointer;color:#64748b;line-height:1;padding:0 4px;">✕</button>'
  card += '</div>'

  // ── Info simulasi ──
  card += '<div style="padding:6px 16px;background:#eff6ff;border-bottom:1px solid #bfdbfe;'
        + 'font-size:0.7rem;color:#1e40af;flex-shrink:0;">'
  card += '⚡ Mode simulasi — mesin yang ditambah tidak tersimpan ke database. Perubahan hilang saat popup ditutup.'
  card += '</div>'

  // ── 2 Panel ──
  card += '<div style="display:flex;flex:1;min-height:0;">'

  // Panel KIRI — daftar unit (lebar 200px, scrollable)
  card += '<div style="width:200px;flex-shrink:0;border-right:1px solid #e2e8f0;'
        + 'overflow-y:auto;overflow-x:hidden;background:#f8fafc;">'

  for (var ui = 0; ui < unitOrder.length; ui++) {
    var ku2    = unitOrder[ui]
    var unit   = unitMap[ku2]
    var isSelf = (ku2 === _popupKodeUnit)

    // hitung tersedia
    var availCnt = 0
    for (var ci = 0; ci < unit.mesin.length; ci++) {
      if (!existingIds[unit.mesin[ci].id_mesin]) availCnt++
    }

    var bg     = isSelf ? '#dbeafe' : 'transparent'
    var fw     = isSelf ? '700' : '500'
    var clr    = isSelf ? '#1e3a5f' : '#334155'
    var border = isSelf ? 'border-left:3px solid #3b82f6;' : 'border-left:3px solid transparent;'

    card += '<div id="_punit_' + ku2 + '" onclick="_pickerSelectUnit(' + ku2 + ')" '
          + 'style="padding:9px 10px 9px 9px;cursor:pointer;' + border + 'background:' + bg + ';'
          + 'border-bottom:1px solid #e2e8f0;">'
          + '<div style="font-size:0.75rem;font-weight:' + fw + ';color:' + clr + ';'
          + 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="' + unit.nama_unit + '">'
          + (isSelf ? '★ ' : '') + unit.nama_unit
          + '</div>'
          + '<div style="font-size:0.65rem;color:' + (availCnt > 0 ? '#1e40af' : '#94a3b8') + ';margin-top:2px;font-weight:600;">'
          + (availCnt > 0 ? availCnt + ' tersedia' : 'semua sudah ada')
          + '</div>'
          + '</div>'
  }
  card += '</div>' // end panel kiri

  // Panel KANAN — daftar mesin unit yang dipilih (scrollable)
  card += '<div id="_picker-right" style="flex:1;min-width:0;overflow-y:auto;overflow-x:hidden;padding:10px 12px;">'
  // diisi oleh _pickerSelectUnit()
  card += '</div>'

  card += '</div>' // end 2 panel
  card += '</div>' // end card

  var picker = document.createElement('div')
  picker.id = '_popup-mesin-picker'
  picker.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;'
  picker.innerHTML = card
  picker.addEventListener('click', function(e) { if (e.target === picker) picker.remove() })
  document.body.appendChild(picker)

  // Simpan unitMap di window agar bisa diakses _pickerSelectUnit
  window._pickerUnitMap    = unitMap
  window._pickerUnitOrder  = unitOrder
  window._pickerExistingIds = existingIds

  // Tampilkan unit sendiri di panel kanan by default
  _pickerSelectUnit(_popupKodeUnit)
}

// Render panel kanan berisi mesin dari unit yang dipilih
function _pickerSelectUnit(ku) {
  var unitMap     = window._pickerUnitMap    || {}
  var existingIds = window._pickerExistingIds || {}
  var right = document.getElementById('_picker-right')
  if (!right || !unitMap[ku]) return

  // Highlight unit di panel kiri
  var allUnitOrder = window._pickerUnitOrder || []
  for (var i = 0; i < allUnitOrder.length; i++) {
    var el = document.getElementById('_punit_' + allUnitOrder[i])
    if (!el) continue
    var isSel  = (allUnitOrder[i] === ku)
    var isSelf = (allUnitOrder[i] === _popupKodeUnit)
    el.style.background   = isSel ? '#dbeafe' : 'transparent'
    el.style.borderLeft   = isSel ? '3px solid #3b82f6' : '3px solid transparent'
    var nameEl = el.querySelector('div')
    if (nameEl) {
      nameEl.style.fontWeight = isSel ? '700' : (isSelf ? '700' : '500')
      nameEl.style.color      = isSel ? '#1e3a5f' : (isSelf ? '#1e3a5f' : '#334155')
    }
  }

  var unit   = unitMap[ku]
  var avail  = []
  var inTbl  = []
  for (var mj = 0; mj < unit.mesin.length; mj++) {
    var mm = unit.mesin[mj]
    if (existingIds[mm.id_mesin]) inTbl.push(mm)
    else avail.push(mm)
  }

  var html = ''
  // Label unit
  html += '<div style="font-size:0.72rem;font-weight:700;color:#1e3a5f;margin-bottom:8px;padding-bottom:6px;'
        + 'border-bottom:1px solid #e2e8f0;">' + unit.nama_unit + '</div>'

  if (avail.length === 0 && inTbl.length === 0) {
    html += '<div style="text-align:center;padding:24px;color:#94a3b8;font-size:0.8rem;">Tidak ada mesin</div>'
  }

  // Mesin tersedia (bisa ditambah)
  if (avail.length > 0) {
    html += '<div style="font-size:0.68rem;font-weight:700;color:#64748b;text-transform:uppercase;'
          + 'letter-spacing:0.05em;margin-bottom:6px;">Tersedia (' + avail.length + ')</div>'
    for (var aj = 0; aj < avail.length; aj++) {
      var am = avail[aj]
      html += '<div onclick="_tambahMesinKePopup(' + am.id_mesin + ')" '
            + 'style="padding:8px 10px;margin-bottom:5px;border:1px solid #bfdbfe;border-radius:6px;'
            + 'cursor:pointer;background:#f0f9ff;" '
            + 'onmouseover="this.style.background=\'#dbeafe\';this.style.borderColor=\'#93c5fd\'"  '
            + 'onmouseout="this.style.background=\'#f0f9ff\';this.style.borderColor=\'#bfdbfe\'">'
            + '<div style="font-size:0.78rem;font-weight:600;color:#1e3a5f;">' + (am.nama_mesin || '-') + '</div>'
            + '<div style="font-size:0.68rem;color:#64748b;margin-top:2px;">DM Terpasang: '
            + (am.terpasang != null ? am.terpasang + ' kW' : '-') + '</div>'
            + '</div>'
    }
  }

  // Mesin sudah ada di tabel (disabled)
  if (inTbl.length > 0) {
    html += '<div style="font-size:0.68rem;font-weight:700;color:#94a3b8;text-transform:uppercase;'
          + 'letter-spacing:0.05em;margin-top:10px;margin-bottom:6px;">Sudah di tabel (' + inTbl.length + ')</div>'
    for (var bj = 0; bj < inTbl.length; bj++) {
      var bm = inTbl[bj]
      html += '<div style="padding:8px 10px;margin-bottom:5px;border:1px solid #e2e8f0;border-radius:6px;'
            + 'background:#f8fafc;opacity:0.65;">'
            + '<div style="font-size:0.78rem;font-weight:600;color:#94a3b8;">' + (bm.nama_mesin || '-') + '</div>'
            + '<div style="font-size:0.68rem;color:#94a3b8;margin-top:2px;">DM Terpasang: '
            + (bm.terpasang != null ? bm.terpasang + ' kW' : '-') + ' · Sudah ada di tabel</div>'
            + '</div>'
    }
  }

  right.innerHTML = html
}

// Tambah mesin yang dipilih ke tabel popup
function _tambahMesinKePopup(idMesin) {
  var picker = document.getElementById('_popup-mesin-picker')
  if (picker) picker.remove()
  // Cari dari _allUnitMesin (semua unit) — bukan hanya unit sendiri
  var mesin = null
  for (var i = 0; i < _allUnitMesin.length; i++) {
    if (_allUnitMesin[i].id_mesin === idMesin) { mesin = _allUnitMesin[i]; break }
  }
  if (!mesin) return
  _popupEditedData.push({
    id_mesin:      mesin.id_mesin,
    nama_mesin:    mesin.nama_mesin || mesin.mesin || '-',
    terpasang:     mesin.terpasang,
    status_mesin:  'Standby',
    daya_mampu:    mesin.terpasang != null ? mesin.terpasang : null,
    beban:         null,
    pemakaian_bbm: null,
    kwh_produksi:  null,
    sfc:           null,
    _isNew:        true
  })
  _renderPopupTable()
  _recalcInfoBar()
}

// Hapus mesin (hanya yang _isNew) dari tabel popup
function _hapusMesinDariPopup(idx) {
  _popupEditedData.splice(idx, 1)
  _renderPopupTable()
  _recalcInfoBar()
}

// Dipanggil saat user ubah nilai di input/select
function _onPopupFieldChange(idx, field, val) {
  if (field === 'daya_mampu') {
    _popupEditedData[idx].daya_mampu = val !== '' ? Number(val) : null
  } else if (field === 'status_mesin') {
    _popupEditedData[idx].status_mesin = val
  }
  _recalcInfoBar()
}

// Toggle mode edit / selesai
function togglePopupEditMode() {
  _popupEditMode = !_popupEditMode
  var btn = document.getElementById('btn-popup-edit')
  if (btn) {
    if (_popupEditMode) {
      btn.textContent = 'SELESAI'
      btn.style.background = '#16a34a'
    } else {
      // Klik SELESAI → reset ke data awal (buang semua perubahan simulasi)
      _popupEditedData = _popupOrigData.map(function(m) { return Object.assign({}, m) })
      btn.textContent = 'EDIT'
      btn.style.background = '#1e3a5f'
    }
  }
  _renderPopupTable()
  _recalcInfoBar()
}

async function showNeracaDetailPopup(kodeUnit, namaUnit, tanggal) {
  // Reset state edit setiap kali popup dibuka
  _popupEditMode   = false
  _popupEditedData = []
  _popupOrigData   = []
  _popupOrigBp     = 0

  var modal   = document.getElementById('modal-detail-mesin')
  var title   = document.getElementById('modal-detail-title')
  var sub     = document.getElementById('modal-detail-sub')
  var loading = document.getElementById('modal-detail-loading')
  var body    = document.getElementById('modal-detail-body')
  var infoBar = document.getElementById('modal-detail-infobar')

  // ── Isi filter tanggal & unit ──────────────────────────────
  var fTgl  = document.getElementById('popup-filter-tanggal')
  var fUnit = document.getElementById('popup-filter-unit')

  // Set max tanggal = hari ini (WIB)
  var nowWib   = new Date(new Date().getTime() + 7*60*60*1000)
  var todayStr = nowWib.toISOString().substring(0, 10)
  if (fTgl) { fTgl.max = todayStr; fTgl.value = tanggal }

  // Populate select unit (sekali saja — jika belum terisi)
  if (fUnit && fUnit.options.length <= 1) {
    fUnit.innerHTML = ''
    UNIT_DATA.forEach(function(u) {
      var opt = document.createElement('option')
      opt.value = u.kode_unit
      opt.textContent = u.nama_unit
      fUnit.appendChild(opt)
    })
  }
  if (fUnit) fUnit.value = String(kodeUnit)
  // ───────────────────────────────────────────────────────────

  // Judul & tanggal
  title.textContent = namaUnit
  var tglParts  = tanggal.split('-')
  var tglObj    = new Date(Number(tglParts[0]), Number(tglParts[1]) - 1, Number(tglParts[2]))
  var namaBulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
  sub.textContent = tglObj.getDate() + ' ' + namaBulan[tglObj.getMonth()] + ' ' + tglObj.getFullYear()

  // Tombol Edit — reset ke state awal
  var btnEdit = document.getElementById('btn-popup-edit')
  if (btnEdit) { btnEdit.textContent = 'EDIT'; btnEdit.style.background = '#1e3a5f' }

  // Kosongkan info bar & body, tampilkan loading
  if (infoBar) infoBar.innerHTML = ''
  body.innerHTML = ''
  loading.style.display = 'block'
  modal.classList.remove('hidden')

  try {
    // Fetch 3 sumber paralel: detail-mesin, neraca-daya, semua mesin (untuk picker lintas unit)
    var [resMesin, resNeraca, resSemua] = await Promise.all([
      fetch('/api/detail-mesin?kode_unit=' + kodeUnit + '&tanggal=' + tanggal),
      fetch('/api/neraca-daya?tanggal=' + tanggal),
      _allUnitMesin.length > 0
        ? Promise.resolve(null)   // sudah ada cache, skip fetch
        : fetch('/api/mesin-cache')
    ])
    var jsonMesin  = await resMesin.json()
    var jsonNeraca = await resNeraca.json()
    if (!jsonMesin.success) throw new Error(jsonMesin.error)
    // Cache semua mesin lintas unit (sekali fetch, pakai terus)
    if (resSemua) {
      var jsonSemua = await resSemua.json()
      if (jsonSemua.success) _allUnitMesin = jsonSemua.data || []
    }
    // _popupAllMesin = SEMUA mesin unit ini (termasuk yang belum punya data hari ini)
    _popupKodeUnit = kodeUnit
    _popupAllMesin = jsonMesin.data || []

    // Ambil data neraca unit ini sesuai tanggal diklik
    if (jsonNeraca.success && jsonNeraca.data) {
      var unitNeraca = jsonNeraca.data.find(function(u) { return u.kode_unit === kodeUnit })
      if (unitNeraca) {
        var dmn  = unitNeraca.dm_pasok            != null ? unitNeraca.dm_pasok            : null
        var bp   = unitNeraca.beban_puncak_malam  != null ? unitNeraca.beban_puncak_malam  : null
        var maks = unitNeraca.max_dm              != null ? unitNeraca.max_dm              : null
        var cad  = (dmn != null && bp != null)    ? (dmn - bp)   : null
        var n1   = (cad != null && maks != null)  ? (cad - maks) : null
        var statusTxt, scBg, scTx
        if (cad === null)        { statusTxt = '-';       scBg = '#f1f5f9'; scTx = '#64748b' }
        else if (cad < 0)        { statusTxt = 'DEFISIT'; scBg = '#fee2e2'; scTx = '#c0392b' }
        else if (cad < (maks||0)){ statusTxt = 'SIAGA';   scBg = '#fef3c7'; scTx = '#e67e22' }
        else                     { statusTxt = 'NORMAL';  scBg = '#dcfce7'; scTx = '#27ae60' }
        _popupOrigBp = bp != null ? Number(bp) : 0

        // Hitung SFC rata-rata dari semua mesin unit ini (total_bbm / total_kwh Operasi)
        var allMesinUnit = (jsonMesin.data || []).filter(function(m) { return m.has_data })
        var sumBbm = 0, sumKwh = 0
        for (var mi = 0; mi < allMesinUnit.length; mi++) {
          if (allMesinUnit[mi].pemakaian_bbm != null) sumBbm += allMesinUnit[mi].pemakaian_bbm
          if (allMesinUnit[mi].kwh_produksi  != null) sumKwh += allMesinUnit[mi].kwh_produksi
        }
        var sfcRata = (sumKwh > 0) ? (sumBbm / sumKwh) : null
        var sfcRataStr = sfcRata !== null ? sfcRata.toFixed(4) : '-'

        // Render info bar
        if (infoBar) {
          var cols0 = [
            { label: 'DMN',      val: _fmtKW(dmn) },
            { label: 'BP',       val: _fmtKW(bp) },
            { label: 'CAD',      val: _fmtKW(cad) },
            { label: 'MAKS',     val: _fmtKW(maks) },
            { label: 'N-1',      val: _fmtKW(n1) },
            { label: 'STATUS',   val: null },
            { label: 'SFC RATA', val: sfcRataStr }
          ]
          var cs0 = 'flex:1;text-align:center;padding:6px 4px;border-right:1px solid #e2e8f0;'
          var cs0L = 'flex:1;text-align:center;padding:6px 4px;'
          var r1 = '', r2 = ''
          for (var ci = 0; ci < cols0.length; ci++) {
            var csi = ci < cols0.length - 1 ? cs0 : cs0L
            r1 += '<div style="' + csi + 'font-size:0.7rem;font-weight:600;color:#64748b;background:#f1f5f9;">' + cols0[ci].label + '</div>'
            if (cols0[ci].label === 'STATUS') {
              r2 += '<div style="' + csi + 'font-size:0.78rem;font-weight:700;"><span style="background:' + scBg + ';color:' + scTx + ';padding:2px 10px;border-radius:10px;font-size:0.72rem;">' + statusTxt + '</span></div>'
            } else if (cols0[ci].label === 'SFC RATA') {
              // Warna SFC: hijau ≤0.3157, kuning ≤0.3188, merah >0.3188
              var sfcColor = sfcRata === null ? '#64748b' : sfcRata <= 0.3157 ? '#16a34a' : sfcRata <= 0.3188 ? '#d97706' : '#dc2626'
              r2 += '<div style="' + csi + 'font-size:0.78rem;font-weight:700;color:' + sfcColor + ';">' + sfcRataStr + '</div>'
            } else {
              r2 += '<div style="' + csi + 'font-size:0.78rem;font-weight:700;color:#1e3a5f;">' + cols0[ci].val + '</div>'
            }
          }
          infoBar.innerHTML =
            '<div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:10px;">'
            + '<div style="display:flex;border-bottom:1px solid #e2e8f0;">' + r1 + '</div>'
            + '<div style="display:flex;">' + r2 + '</div>'
            + '</div>'
        }
      }
    }

    // editedData = hanya mesin yang punya data di tanggal ini (has_data=true)
    // _popupAllMesin sudah berisi semua (has_data true & false) untuk picker
    var mesinDenganData = (jsonMesin.data || []).filter(function(m) { return m.has_data })

    if (mesinDenganData.length === 0) {
      body.innerHTML = '<div style="text-align:center;padding:24px;color:#64748b;">Tidak ada data mesin untuk tanggal ini</div>'
      return
    }

    // Simpan deep copy ke editedData (hanya mesin ber-data)
    _popupEditedData = mesinDenganData.map(function(m) {
      return {
        id_mesin:        m.id_mesin,
        nama_mesin:      m.nama_mesin,
        terpasang:       m.terpasang,
        status_mesin:    m.status_mesin,
        daya_mampu:      m.daya_mampu,
        beban:           m.beban,
        pemakaian_bbm:   m.pemakaian_bbm,
        kwh_produksi:    m.kwh_produksi,
        jam_kerja_mesin: m.jam_kerja_mesin,
        sfc:             m.sfc
      }
    })
    // Simpan snapshot awal untuk reset saat SELESAI / tutup popup
    _popupOrigData = _popupEditedData.map(function(m) { return Object.assign({}, m) })

    _renderPopupTable()

  } catch(e) {
    body.innerHTML = '<div style="text-align:center;padding:16px;color:#dc2626;">Gagal memuat: ' + e.message + '</div>'
  } finally {
    loading.style.display = 'none'
  }
}

// =============================================
// Reload popup saat filter tanggal / unit berubah
// =============================================
function reloadNeracaPopup() {
  var fTgl  = document.getElementById('popup-filter-tanggal')
  var fUnit = document.getElementById('popup-filter-unit')
  if (!fTgl || !fUnit) return
  var tgl      = fTgl.value
  var kuStr    = fUnit.value
  if (!tgl || !kuStr) return
  var ku       = parseInt(kuStr, 10)
  var unitObj  = UNIT_DATA.find(function(u) { return u.kode_unit === ku })
  var namaUnit = unitObj ? unitObj.nama_unit : 'ULD ' + ku
  showNeracaDetailPopup(ku, namaUnit, tgl)
}

// =============================================
// =============================================
// NERACA DAYA — Grafik Batang Beban Puncak 1 Bulan per ULD
// =============================================
var neracaBpChartInstance = null  // simpan instance Chart.js agar bisa di-destroy

function initNeracaChartUldSelect() {
  var sel = document.getElementById('neraca-chart-uld')
  if (!sel) return
  // Populate dari UNIT_DATA (sudah tersedia global)
  sel.innerHTML = '<option value="">-- Pilih ULD --</option>'
  UNIT_DATA.forEach(function(u) {
    var opt = document.createElement('option')
    opt.value = u.kode_unit
    opt.textContent = u.nama_unit
    sel.appendChild(opt)
  })
}

async function loadNeracaChart() {
  var tanggal = document.getElementById('data-tanggal').value
  var kodeUnit = document.getElementById('neraca-chart-uld').value
  var periode  = document.getElementById('neraca-chart-periode').value

  var chartWrap  = document.getElementById('neraca-chart-wrap')
  var emptyEl    = document.getElementById('neraca-chart-empty')
  var titleEl    = document.getElementById('neraca-chart-title')

  // Tampilkan panel grafik
  if (chartWrap) chartWrap.style.display = ''

  if (!kodeUnit) {
    // Belum pilih ULD — tampilkan pesan kosong
    if (emptyEl)  emptyEl.style.display  = ''
    var canvas = document.getElementById('neraca-bp-chart')
    if (canvas)   canvas.style.display   = 'none'
    if (titleEl)  titleEl.textContent    = ''
    if (neracaBpChartInstance) { neracaBpChartInstance.destroy(); neracaBpChartInstance = null }
    return
  }

  if (!tanggal) { showToast('Pilih tanggal terlebih dahulu', 'info'); return }

  // Derive bulan dari tanggal
  var bulan = tanggal.substring(0, 7)

  // Cari nama unit
  var unitObj  = UNIT_DATA.find(function(u) { return String(u.kode_unit) === String(kodeUnit) })
  var namaUnit = unitObj ? unitObj.nama_unit : 'ULD ' + kodeUnit

  showLoading(true, 'loading-indicator-data')
  try {
    var res  = await fetch('/api/bp-bulanan?bulan=' + bulan + '&kode_unit=' + kodeUnit + '&periode=' + periode)
    var json = await res.json()
    if (!json.success) throw new Error(json.error || 'Gagal memuat data BP')

    var dates  = json.dates   // array YYYY-MM-DD
    var values = json.values  // array angka | null

    // Label sumbu X: tanggal (DD/MM)
    var labels = dates.map(function(d) {
      var p = d.split('-'); return p[2] + '/' + p[1]
    })

    // Warna bar: biru untuk siang, ungu gelap untuk malam
    var barColor = periode === 'siang' ? 'rgba(37,99,235,0.75)' : 'rgba(109,40,217,0.75)'
    var borderColor = periode === 'siang' ? '#1e40af' : '#5b21b6'

    // Title grafik
    var periodeLbl = periode === 'siang' ? 'SIANG (06:00–17:00)' : 'MALAM (18:00–05:00)'
    var bulanParts = bulan.split('-')
    var BULAN_ID = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
    var bulanLbl = BULAN_ID[parseInt(bulanParts[1])] + ' ' + bulanParts[0]
    if (titleEl) titleEl.textContent = 'Beban Puncak ' + namaUnit + ' — ' + periodeLbl + ' — ' + bulanLbl

    // Sembunyikan pesan kosong, tampilkan canvas
    if (emptyEl) emptyEl.style.display = 'none'
    var canvas = document.getElementById('neraca-bp-chart')
    if (canvas) canvas.style.display = ''

    // Destroy chart lama jika ada
    if (neracaBpChartInstance) { neracaBpChartInstance.destroy(); neracaBpChartInstance = null }

    var ctx = canvas.getContext('2d')
    neracaBpChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Beban Puncak (kW) — ' + (periode === 'siang' ? 'Siang' : 'Malam'),
          data: values,
          backgroundColor: barColor,
          borderColor: borderColor,
          borderWidth: 1,
          borderRadius: 3,
          spanGaps: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(ctx) {
                var v = ctx.parsed.y
                return v != null ? 'BP: ' + v.toLocaleString('id-ID') + ' kW' : 'Tidak ada data'
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 10 }, maxRotation: 0 }
          },
          y: {
            beginAtZero: true,
            title: { display: true, text: 'kW', font: { size: 11 } },
            ticks: {
              font: { size: 10 },
              callback: function(val) { return val.toLocaleString('id-ID') }
            }
          }
        }
      }
    })

    document.getElementById('info-data-record').textContent =
      namaUnit + ' | ' + (periode === 'siang' ? 'Siang' : 'Malam') + ' | ' + bulanLbl

  } catch(e) {
    showToast('Gagal memuat grafik BP: ' + e.message, 'error')
  } finally {
    showLoading(false, 'loading-indicator-data')
  }
}

// SFC — Grafik Garis
// =============================================
var sfcChartInstance = null  // simpan instance Chart.js agar bisa di-destroy
var sfcAllUnits      = []    // simpan semua data unit untuk filter
var sfcAllDates      = []    // simpan semua tanggal

async function loadSfcTab() {
  var tanggal = document.getElementById('data-tanggal').value
  if (!tanggal) { showToast('Pilih tanggal terlebih dahulu', 'info'); return }

  showLoading(true, 'loading-indicator-data')
  document.getElementById('info-data-record').textContent = ''

  try {
    var res  = await fetch('/api/sfc-bulanan?tanggal=' + tanggal)
    var json = await res.json()
    if (!json.success) throw new Error(json.error || 'Gagal memuat data SFC')

    // Simpan ke variabel global untuk dipakai filter
    sfcAllUnits = json.data
    sfcAllDates = json.dates

    // ── Populate dropdown ULD ────────────────────────────────────────────
    var sel = document.getElementById('sfc-sel-uld')
    var prevVal = sel.value  // pertahankan pilihan sebelumnya jika ada
    sel.innerHTML = '<option value="">Semua ULD</option>'
    sfcAllUnits.forEach(function(u) {
      var opt = document.createElement('option')
      opt.value = u.kode_unit
      opt.textContent = u.nama_unit
      if (String(u.kode_unit) === String(prevVal)) opt.selected = true
      sel.appendChild(opt)
    })

    // Render chart sesuai filter
    sfcRenderChart()

    document.getElementById('info-data-record').textContent =
      sfcAllUnits.length + ' unit | 30 hari terakhir'

  } catch(e) {
    showToast('Gagal memuat SFC: ' + e.message, 'error')
  } finally {
    showLoading(false, 'loading-indicator-data')
  }
}

function onSfcUldChange() {
  sfcRenderChart()
}

function sfcRenderChart() {
  var tanggal = document.getElementById('data-tanggal').value
  var selVal  = document.getElementById('sfc-sel-uld').value  // '' = semua

  // Filter unit
  var units = selVal
    ? sfcAllUnits.filter(function(u) { return String(u.kode_unit) === String(selVal) })
    : sfcAllUnits
  var dates = sfcAllDates

  // Label sumbu X: DD/MM
  var labels = dates.map(function(d) {
    var p = d.split('-'); return p[2] + '/' + p[1]
  })

  // Palet warna
  var COLORS = [
    '#2563eb','#dc2626','#16a34a','#d97706','#7c3aed',
    '#0891b2','#be185d','#65a30d','#ea580c','#0f172a',
    '#6366f1','#14b8a6','#f59e0b','#ef4444','#84cc16',
    '#ec4899','#06b6d4','#f97316','#8b5cf6','#10b981'
  ]

  // Bangun datasets
  var datasets = []
  if (selVal && units.length === 1) {
    // Mode per mesin — tampilkan garis tiap mesin dalam ULD terpilih
    var mesinList = units[0].mesin || []
    for (var i = 0; i < mesinList.length; i++) {
      var m     = mesinList[i]
      var color = COLORS[i % COLORS.length]
      var data  = dates.map(function(d) {
        var v = m.daily[d]; return (v != null) ? v : null
      })
      datasets.push({
        label:           m.nama_mesin || ('Mesin ' + (i + 1)),
        data:            data,
        borderColor:     color,
        backgroundColor: color + '22',
        borderWidth:     2,
        pointRadius:     3,
        pointHoverRadius:6,
        spanGaps:        true,
        tension:         0.3
      })
    }
  } else {
    // Mode per ULD — satu garis per ULD
    for (var i = 0; i < units.length; i++) {
      var u     = units[i]
      var color = COLORS[i % COLORS.length]
      var data  = dates.map(function(d) {
        var v = u.daily[d]; return (v != null) ? v : null
      })
      datasets.push({
        label:           u.nama_unit || ('Unit ' + (i + 1)),
        data:            data,
        borderColor:     color,
        backgroundColor: color + '22',
        borderWidth:     2,
        pointRadius:     3,
        pointHoverRadius:6,
        spanGaps:        true,
        tension:         0.3
      })
    }
  }

  // Destroy chart lama
  if (sfcChartInstance) { sfcChartInstance.destroy(); sfcChartInstance = null }

  var canvas = document.getElementById('sfc-chart')
  canvas.style.height = '460px'

  var titleText = (selVal && units.length === 1)
    ? 'SFC per Mesin — ' + (units[0] ? units[0].nama_unit : '') + ' — 30 Hari s/d ' + tanggal
    : 'SFC (L/kWh) — Semua ULD — 30 Hari s/d ' + tanggal

  sfcChartInstance = new Chart(canvas, {
    type: 'line',
    data: { labels: labels, datasets: datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { font: { size: 11 }, boxWidth: 16, padding: 10 }
        },
        title: {
          display: true,
          text: titleText,
          font: { size: 13, weight: 'bold' },
          color: '#1a3352',
          padding: { bottom: 12 }
        },
        tooltip: {
          callbacks: {
            label: function(ctx) {
              var v = ctx.parsed.y
              return ' ' + ctx.dataset.label + ': ' + (v != null ? v.toFixed(3) : '—')
            }
          }
        }
      },
      scales: {
        x: {
          ticks: { font: { size: 10 }, maxRotation: 45, minRotation: 45 },
          grid:  { color: '#e2e8f0' }
        },
        y: {
          title: { display: true, text: 'SFC (L/kWh)', font: { size: 11 } },
          ticks: { font: { size: 10 } },
          grid:  { color: '#e2e8f0' },
          afterDataLimits: function(axis) {
            axis.min = Math.max(0, axis.min - 0.05)
            axis.max = axis.max + 0.05
          }
        }
      }
    },
    plugins: [{
      id: 'sfcRefLines',
      afterDraw: function(chart) {
        var ctx2   = chart.ctx
        var yAxis  = chart.scales.y
        var xLeft  = chart.chartArea.left
        var xRight = chart.chartArea.right
        var refs   = [
          { val: 0.3157, color: '#16a34a', label: 'KPI 0.3157' },
          { val: 0.3188, color: '#d97706', label: 'SLA 0.3188' }
        ]
        refs.forEach(function(ref) {
          var yPos = yAxis.getPixelForValue(ref.val)
          if (yPos < chart.chartArea.top || yPos > chart.chartArea.bottom) return
          ctx2.save()
          ctx2.setLineDash([6, 4])
          ctx2.strokeStyle = ref.color
          ctx2.lineWidth   = 1.5
          ctx2.beginPath()
          ctx2.moveTo(xLeft,  yPos)
          ctx2.lineTo(xRight, yPos)
          ctx2.stroke()
          ctx2.setLineDash([])
          ctx2.fillStyle = ref.color
          ctx2.font      = '10px sans-serif'
          ctx2.fillText(ref.label, xLeft + 4, yPos - 4)
          ctx2.restore()
        })
      }
    }]
  })
}

async function loadStockOliTab() {
  var tanggal = document.getElementById('data-tanggal').value
  if (!tanggal) { showToast('Pilih tanggal terlebih dahulu', 'info'); return }

  // Render header sekali saja
  if (!oliTableInited) {
    var cols = ['NO', 'ULD', 'OLI SAE 40', 'OLI SX', 'OLI SX PLUS']
    var headHTML = '<tr>'
    for (var i = 0; i < cols.length; i++) {
      var sticky = i === 0 ? 'position:sticky;left:0;z-index:2;' : i === 1 ? 'position:sticky;left:0;z-index:2;' : ''
      var align  = i === 1 ? 'text-align:left;' : 'text-align:center;'
      var w      = i === 0 ? 'width:1px;white-space:nowrap;padding:8px 4px;border-right:1px solid #e2e8f0;' : 'padding:8px 14px;'
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
      if (val === '' || val === 'tidak menggunakan') return '<span style="color:#e2e8f0;font-style:italic;">tidak menggunakan</span>'
      if (!isNaN(Number(val))) return Number(val).toLocaleString('id-ID') + ' ltr'
      return val
    }

    var bodyHTML = ''
    for (var r = 0; r < rows.length; r++) {
      var d   = rows[r]
      var bg  = r % 2 === 0 ? '#fff' : '#f8fafc'
      bodyHTML += '<tr style="background:' + bg + ';border-bottom:1px solid #e2e8f0;">'
      bodyHTML += '<td style="width:1px;white-space:nowrap;padding:4px;text-align:center;font-size:0.7rem;position:sticky;left:0;background:' + bg + ';z-index:1;border-right:1px solid #e2e8f0;">' + d.no + '</td>'
      bodyHTML += '<td style="padding:7px 10px;white-space:nowrap;font-size:0.78rem;font-weight:600;color:#1e3a5f;text-align:left;position:sticky;left:0;background:' + bg + ';z-index:1;">' + d.nama_unit + '</td>'
      bodyHTML += '<td style="padding:7px 14px;text-align:center;font-size:0.78rem;">' + fmtOliVal(d.sae40) + '</td>'
      bodyHTML += '<td style="padding:7px 14px;text-align:center;font-size:0.78rem;">' + fmtOliVal(d.sx) + '</td>'
      bodyHTML += '<td style="padding:7px 14px;text-align:center;font-size:0.78rem;">' + fmtOliVal(d.sx_plus) + '</td>'
      bodyHTML += '</tr>'
    }
    document.getElementById('oli-table-body').innerHTML = bodyHTML
    document.getElementById('info-data-record').textContent = rows.length + ' unit'
    requestAnimationFrame(function() {
      var tbl = document.getElementById('oli-table')
      if (!tbl) return
      var colNo = tbl.querySelector('th:first-child')
      if (!colNo) return
      var noWidth = colNo.getBoundingClientRect().width
      tbl.querySelectorAll('th:nth-child(2), td:nth-child(2)').forEach(function(el) { el.style.left = noWidth + 'px' })
    })
  } catch(e) {
    showToast('Gagal memuat data: ' + e.message, 'error')
  } finally {
    showLoading(false, 'loading-indicator-data')
  }
}

function initDataTable() {
  if (dataTableInited) return
  var cols = ['NO','ULD','JALUR','KAPASITAS','SALDO AWAL BULAN','SALDO AKHIR',
              'STOCK MATI','STOCK BERSIH','PEMAKAIAN BBM','PEMAKAIAN RATA-RATA',
              'PEMAKAIAN TERTINGGI','DAYA TAMPUNG','BBM SIAP KIRIM','SAFETY STOCK',
              'ESTIMASI BBM HABIS','KONDISI STOCK',
              'POSISI TERAKHIR','ESTIMASI TIBA',
              'TOTAL PENERIMAAN','TOTAL PEMAKAIAN']
  var headHTML = '<tr>'
  for (var i = 0; i < cols.length; i++) {
    var stickyStyle = i === 0 ? 'position:sticky;left:0;z-index:4;' : i === 1 ? 'position:sticky;left:0;z-index:4;' : 'z-index:3;'
    var thExtra = i === 0 ? 'width:1px;white-space:nowrap;padding:8px 4px;border-right:1px solid #4a7ab5;' : i === 1 ? 'padding:8px 10px;border-right:1px solid #4a7ab5;' : 'padding:8px 10px;'
    var thAlign = 'text-align:center;'
    var thWidth  = i === 2 ? 'min-width:198px;' : i === 18 ? 'min-width:152px;' : i === 19 ? 'min-width:140px;' : ''
    headHTML += '<th style="background:#1e3a5f;color:#fff;white-space:nowrap;font-size:0.72rem;position:sticky;top:0;' + thAlign + thWidth + thExtra + stickyStyle + '">' + cols[i] + '</th>'
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
    var [resStok, resHop] = await Promise.all([
      fetch('/api/data-stok?tanggal=' + tanggal),
      fetch('/api/hop-info')
    ])
    var json    = await resStok.json()
    var jsonHop = resHop.ok ? await resHop.json() : { success: false, data: {} }
    if (!json.success) throw new Error(json.error)
    var rows   = json.data || []
    var hopMap = (jsonHop.success && jsonHop.data) ? jsonHop.data : {}

    var inputStyle    = 'font-size:0.75rem;border:1px solid #cbd5e1;border-radius:4px;padding:3px 5px;box-sizing:border-box;background:#f8fafc;'
    var inputPosSt    = inputStyle + 'width:140px;'
    var inputDateSt   = inputStyle + 'width:128px;cursor:pointer;'
    var bodyHTML = ''
    for (var r = 0; r < rows.length; r++) {
      var d = rows[r]
      var ku = d.kode_unit
      var hopInfo = hopMap[ku] || {}
      var posVal  = hopInfo.posisi_terakhir || ''
      var etaVal  = hopInfo.estimasi_tiba  || ''

      var kondisiColor = '#475569'
      if (d.kondisi_stock === 'KRITIS')      kondisiColor = '#ef4444'
      else if (d.kondisi_stock === 'SIAGA')  kondisiColor = '#eab308'
      else if (d.kondisi_stock === 'AMAN')   kondisiColor = '#22c55e'

      bodyHTML += '<tr style="background:#fff;border-bottom:1px solid #e2e8f0;">'
      bodyHTML += '<td style="width:1px;white-space:nowrap;padding:4px;text-align:center;font-size:0.7rem;position:sticky;left:0;background:#fff;z-index:2;border-right:1px solid #e2e8f0;">' + (r + 1) + '</td>'
      var uldColor = (d.stok_awal === null || d.stok_awal === undefined) ? '#e2e8f0' : '#1e3a5f'
      bodyHTML += '<td style="padding:7px 10px;white-space:nowrap;font-size:0.78rem;font-weight:600;color:' + uldColor + ';text-align:left;position:sticky;left:0;background:#fff;z-index:2;border-right:1px solid #e2e8f0;">' + d.nama_unit + '</td>'
      bodyHTML += '<td style="padding:7px 10px;text-align:left;font-size:0.78rem;min-width:198px;white-space:nowrap;">' + (d.jalur || '—') + '</td>'
      bodyHTML += '<td style="padding:7px 10px;text-align:right;font-size:0.78rem;">' + fmtData(d.kapasitas_tangki) + '</td>'
      bodyHTML += '<td style="padding:7px 10px;text-align:right;font-size:0.78rem;">' + fmtData(d.stok_awal_bulan) + '</td>'
      bodyHTML += '<td style="padding:7px 10px;text-align:right;font-size:0.78rem;">' + fmtData(d.stok_awal) + '</td>'
      bodyHTML += '<td style="padding:7px 10px;text-align:right;font-size:0.78rem;">' + fmtData(d.stock_mati) + '</td>'
      bodyHTML += '<td style="padding:7px 10px;text-align:right;font-size:0.78rem;font-weight:600;">' + fmtData(d.stock_bersih) + '</td>'
      bodyHTML += '<td style="padding:7px 10px;text-align:right;font-size:0.78rem;">' + fmtData(d.pemakaian_bbm) + '</td>'
      bodyHTML += '<td style="padding:7px 10px;text-align:right;font-size:0.78rem;">' + fmtData(d.pemakaian_rata_rata) + '</td>'
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
      // Kolom POSISI TERAKHIR & ESTIMASI TIBA — hanya tampil jika HOP (safety_stock) < 8
      var showHopFields = (d.safety_stock !== null && d.safety_stock !== undefined && d.safety_stock < 8)
      if (showHopFields) {
        bodyHTML += '<td style="padding:4px 6px;white-space:nowrap;">'
        bodyHTML += '<input type="text" value="' + posVal.replace(/"/g,'&quot;') + '" placeholder="Posisi..." '
        bodyHTML += 'data-ku="' + ku + '" data-field="posisi" '
        bodyHTML += 'style="' + inputPosSt + '" '
        bodyHTML += 'onblur="saveHopInfo(this)" onkeydown="if(event.key===\'Enter\')this.blur()"/>'
        bodyHTML += '</td>'
        bodyHTML += '<td style="padding:4px 6px;white-space:nowrap;">'
        bodyHTML += '<input type="date" value="' + etaVal + '" '
        bodyHTML += 'data-ku="' + ku + '" data-field="eta" '
        bodyHTML += 'style="' + inputDateSt + '" '
        bodyHTML += 'onchange="saveHopInfo(this)"/>'
        bodyHTML += '</td>'
      } else {
        bodyHTML += '<td style="padding:7px 10px;text-align:center;font-size:0.78rem;color:#cbd5e1;">—</td>'
        bodyHTML += '<td style="padding:7px 10px;text-align:center;font-size:0.78rem;color:#cbd5e1;">—</td>'
      }
      // Kolom TOTAL PENERIMAAN & TOTAL PEMAKAIAN (setelah ESTIMASI TIBA)
      bodyHTML += '<td style="padding:7px 10px;text-align:right;font-size:0.78rem;">' + fmtData(d.total_penerimaan) + '</td>'
      bodyHTML += '<td style="padding:7px 10px;text-align:right;font-size:0.78rem;">' + fmtData(d.total_pemakaian) + '</td>'
      bodyHTML += '</tr>'
    }
    document.getElementById('data-table-body').innerHTML = bodyHTML
    requestAnimationFrame(function() {
      var tbl = document.getElementById('data-table')
      if (!tbl) return
      var colNo = tbl.querySelector('th:first-child')
      if (!colNo) return
      var noWidth = colNo.getBoundingClientRect().width
      tbl.querySelectorAll('th:nth-child(2), td:nth-child(2)').forEach(function(el) { el.style.left = noWidth + 'px' })
    })

    // HOP rata-rata = Total Stock Bersih / Total Pemakaian Tertinggi
    var totalStockBersih = 0, totalPemakaianTertinggi = 0, hasHop = false
    for (var ri = 0; ri < rows.length; ri++) {
      if (rows[ri].stock_bersih != null)    { totalStockBersih += rows[ri].stock_bersih; hasHop = true }
      if (rows[ri].rata_rata_harian != null) { totalPemakaianTertinggi += rows[ri].rata_rata_harian }
    }
    var hopRataRata = (hasHop && totalPemakaianTertinggi > 0)
      ? Math.round(totalStockBersih / totalPemakaianTertinggi)
      : '-'
    document.getElementById('info-data-record').textContent = 'HOP rata-rata = ' + hopRataRata

  } catch(e) {
    showToast('Gagal memuat data: ' + e.message, 'error')
  } finally {
    showLoading(false, 'loading-indicator-data')
  }
}

// Simpan posisi terakhir / estimasi tiba ke server
function saveHopInfo(inputEl) {
  var ku    = parseInt(inputEl.getAttribute('data-ku'), 10)
  var field = inputEl.getAttribute('data-field')   // 'posisi' | 'eta'
  var val   = inputEl.value.trim()

  // Kumpulkan nilai field lain dari baris yang sama
  var row   = inputEl.closest('tr')
  var posEl = row ? row.querySelector('input[data-field="posisi"]') : null
  var etaEl = row ? row.querySelector('input[data-field="eta"]')    : null
  var posVal = posEl ? posEl.value.trim() : ''
  var etaVal = etaEl ? etaEl.value.trim() : ''

  fetch('/api/hop-info', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kode_unit: ku, posisi_terakhir: posVal, estimasi_tiba: etaVal || null })
  }).then(function(r) { return r.json() }).then(function(j) {
    if (!j.success) showToast('Gagal simpan: ' + (j.error || ''), 'error')
    // visual feedback singkat
    inputEl.style.background = '#dcfce7'
    setTimeout(function() { inputEl.style.background = '#f8fafc' }, 800)
  }).catch(function() { showToast('Gagal simpan', 'error') })
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden')
  // Reset state popup saat modal-detail-mesin ditutup
  if (id === 'modal-detail-mesin') {
    _popupEditMode   = false
    _popupEditedData = _popupOrigData.map(function(m) { return Object.assign({}, m) })
    var btnEdit = document.getElementById('btn-popup-edit')
    if (btnEdit) { btnEdit.textContent = 'EDIT'; btnEdit.style.background = '#1e3a5f' }
    // Tutup picker jika masih terbuka
    var picker = document.getElementById('_popup-mesin-picker')
    if (picker) picker.remove()
  }
}

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

// =============================================
// ===== SLD EDITOR =====
// =============================================

var SLD_IS_ADMIN   = false   // toggle via password
var SLD_ADMIN_PASS = 'admin123'
var sldCurrentUnit = null    // { kode_unit, nama_unit }
var sldMesinList   = []      // daftar mesin untuk unit SLD aktif
var sldElements    = []      // array of element objects
var sldSelected    = null    // id of selected element (single)
var sldMultiSel    = []      // array of id — multi-select untuk grouping
var sldNextId      = 1
var sldGridVisible = true
var sldDragging    = null    // { id, startX, startY, ... }
var sldLineMode    = false
var sldLineTmp     = null
var sldLineTmpEl   = null
var sldModified    = false
// Drag-select (rubber-band)
var sldSelBoxing   = false   // sedang drag selection box
var sldSelBox      = null    // { x0,y0,x1,y1 } koordinat SVG

// ── Undo / Redo ────────────────────────────────────────────────
var sldUndoStack   = []      // array of { elements, nextId }
var sldRedoStack   = []
var SLD_HIST_MAX   = 50      // max history depth

function sldHistoryPush() {
  sldUndoStack.push({ elements: JSON.parse(JSON.stringify(sldElements)), nextId: sldNextId })
  if (sldUndoStack.length > SLD_HIST_MAX) sldUndoStack.shift()
  sldRedoStack = []           // mutasi baru → hapus redo stack
  sldUpdateUndoBtn()
}

function sldUndo() {
  if (!SLD_IS_ADMIN || sldUndoStack.length === 0) return
  sldRedoStack.push({ elements: JSON.parse(JSON.stringify(sldElements)), nextId: sldNextId })
  var snap = sldUndoStack.pop()
  sldElements = snap.elements
  sldNextId   = snap.nextId
  sldSelected = null; sldMultiSel = []
  sldModified = true
  sldRender(); sldHideProps(); sldUpdateGroupBtn(); sldUpdateUndoBtn()
  showToast('Undo', 'info')
}

function sldRedo() {
  if (!SLD_IS_ADMIN || sldRedoStack.length === 0) return
  sldUndoStack.push({ elements: JSON.parse(JSON.stringify(sldElements)), nextId: sldNextId })
  var snap = sldRedoStack.pop()
  sldElements = snap.elements
  sldNextId   = snap.nextId
  sldSelected = null; sldMultiSel = []
  sldModified = true
  sldRender(); sldHideProps(); sldUpdateGroupBtn(); sldUpdateUndoBtn()
  showToast('Redo', 'info')
}

function sldUpdateUndoBtn() {
  var bu = document.getElementById('sld-btn-undo')
  var br = document.getElementById('sld-btn-redo')
  if (bu) { bu.disabled = sldUndoStack.length === 0; bu.style.opacity = sldUndoStack.length === 0 ? '0.4' : '1' }
  if (br) { br.disabled = sldRedoStack.length === 0; br.style.opacity = sldRedoStack.length === 0 ? '0.4' : '1' }
}

// ── Snap ke grid 20px ──────────────────────────────────────────
function sldSnap(v) { return Math.round(v / 20) * 20 }

// ── Init select unit ──────────────────────────────────────────
function sldInitUnitSelect() {
  var sel = document.getElementById('sld-sel-unit')
  if (sel.options.length > 1) return
  UNIT_DATA.forEach(function(u) {
    var opt = document.createElement('option')
    opt.value = u.kode_unit
    opt.textContent = u.nama_unit
    sel.appendChild(opt)
  })
}

// ── Pilih unit → load SLD dari API ───────────────────────────
async function onSldUnitChange(val) {
  if (!val) {
    sldCurrentUnit = null
    document.getElementById('sld-state-empty').style.display = 'flex'
    document.getElementById('sld-wrap').classList.add('hidden')
    return
  }
  var found = UNIT_DATA.find(function(u){ return u.kode_unit == val })
  sldCurrentUnit = { kode_unit: parseInt(val), nama_unit: found ? found.nama_unit : val }

  document.getElementById('sld-state-empty').style.display = 'none'
  document.getElementById('sld-wrap').classList.remove('hidden')

  // Tampilkan tombol aksi admin
  var actEl = document.getElementById('sld-toolbar-actions')
  if (SLD_IS_ADMIN) { actEl.style.display = 'flex' } else { actEl.style.display = 'none' }
  document.getElementById('sld-mode-label').textContent = SLD_IS_ADMIN ? 'Mode: EDIT' : 'Mode: VIEW'

  showLoading(true, 'loading-indicator-sld')
  // Fetch daftar mesin untuk unit ini (dipakai dropdown label generator)
  sldMesinList = []
  try {
    var mRes  = await fetch('/api/mesin-unit?kode_unit=' + val)
    var mJson = await mRes.json()
    if (mJson.success && mJson.data) sldMesinList = mJson.data
  } catch(e) { /* abaikan, dropdown cukup kosong */ }

  try {
    var res  = await fetch('/api/sld/' + val)
    var json = await res.json()
    if (!json.success) throw new Error(json.error)
    sldElements = []
    sldNextId   = 1
    if (json.data && json.data.svg_data && json.data.svg_data.length > 0) {
      // Ada data tersimpan — load langsung
      sldElements = json.data.svg_data
      sldNextId   = Math.max.apply(null, sldElements.map(function(e){ return e.id || 0 })) + 1
      sldSelected = null
      sldModified = false
      sldRender()
      sldHideProps()
    } else {
      // Belum ada SLD → auto-generate Generator dari daftar mesin
      sldSelected = null
      sldModified = false
      await sldAutoGenerate(val)
    }
  } catch(e) {
    showToast('Gagal memuat SLD: ' + e.message, 'error')
  } finally {
    showLoading(false, 'loading-indicator-sld')
  }
}

// ── Auto-generate Generator dari daftar mesin ────────────────
async function sldAutoGenerate(kodeUnit) {
  if (!kodeUnit) kodeUnit = sldCurrentUnit && sldCurrentUnit.kode_unit
  if (!kodeUnit) { showToast('Pilih unit dulu', 'info'); return }

  var btnAg = document.getElementById('sld-btn-autogen')
  if (btnAg) { btnAg.disabled = true; btnAg.textContent = '...' }

  try {
    var res  = await fetch('/api/mesin-unit?kode_unit=' + kodeUnit)
    var json = await res.json()
    if (!json.success || !json.data || json.data.length === 0) {
      showToast('Tidak ada data mesin untuk unit ini', 'info')
      sldRender(); sldHideProps(); return
    }

    var mesinList = json.data
    var GEN_W   = 60    // lebar simbol generator
    var GEN_H   = 60    // tinggi simbol generator
    var CELL_W  = 100   // jarak antar generator — cukup untuk wrap 2 baris ~10 char
    var START_X = 60    // mulai dari x=60
    var START_Y = 100   // mulai dari y=100
    var PER_ROW = 10    // max generator per baris

    // Hapus hanya elemen generator lama, pertahankan elemen lain
    sldElements = sldElements.filter(function(e){ return e.type !== 'generator' })

    mesinList.forEach(function(m, i) {
      var col = i % PER_ROW
      var row = Math.floor(i / PER_ROW)
      var ex  = START_X + col * CELL_W
      var ey  = START_Y + row * 180   // baris berikutnya turun 180px

      // Nama mesin (baris 1) + daya terpasang (baris 2)
      var namaMesin = (m.nama_mesin || m.mesin || ('Mesin ' + (i + 1))).trim()
      var dayaStr   = (m.terpasang != null && m.terpasang > 0)
                      ? '\n' + m.terpasang + ' kW'
                      : ''

      sldElements.push({
        id    : sldNextId++,
        type  : 'generator',
        x     : ex,
        y     : ey,
        w     : GEN_W,
        h     : GEN_H,
        label : namaMesin + dayaStr,
        color : '#1e3a5f'
      })
    })

    sldHistoryPush()
    sldSelected = null
    sldModified = true
    sldRender()
    sldHideProps()
    var wrap = document.getElementById('sld-canvas-wrap')
    if (wrap) { wrap.scrollLeft = 0; wrap.scrollTop = 0 }
    showToast('Auto-generate ' + mesinList.length + ' generator selesai', 'success')
  } catch(e) {
    showToast('Gagal load mesin: ' + e.message, 'error')
  } finally {
    if (btnAg) { btnAg.disabled = false; btnAg.textContent = 'AUTO GEN' }
  }
}

// ── Admin login / logout toggle ───────────────────────────────
// SLD tidak punya password sendiri — ikut login admin PENGATURAN
function sldAdminLogin() {
  showToast('Gunakan tombol MASUK SEBAGAI ADMIN di toolbar untuk login', 'info')
}

// ── Toggle grid ───────────────────────────────────────────────
function sldToggleGrid() {
  sldGridVisible = !sldGridVisible
  var bg = document.getElementById('sld-grid-bg')
  if (bg) bg.setAttribute('fill', sldGridVisible ? 'url(#sld-grid-pattern)' : 'transparent')
  document.getElementById('sld-btn-grid').style.background = sldGridVisible ? '#475569' : '#0f172a'
}

// ── Fit view ──────────────────────────────────────────────────
function sldFitView() {
  if (!sldElements.length) return
  var xs = [], ys = []
  sldElements.forEach(function(el) {
    if (el.type === 'line') {
      xs.push(el.x1, el.x2); ys.push(el.y1, el.y2)
    } else {
      xs.push(el.x); ys.push(el.y)
    }
  })
  var minX = Math.min.apply(null,xs)-40, minY = Math.min.apply(null,ys)-40
  var wrap = document.getElementById('sld-canvas-wrap')
  wrap.scrollLeft = Math.max(0, minX)
  wrap.scrollTop  = Math.max(0, minY)
}

// ── Render semua elemen ke SVG ────────────────────────────────
function sldRender() {
  var compLayer = document.getElementById('sld-components-layer')
  var lineLayer = document.getElementById('sld-lines-layer')
  if (!compLayer || !lineLayer) return
  compLayer.innerHTML = ''
  lineLayer.innerHTML  = ''

  // Render elemen (skip type group — tidak ada visual)
  sldElements.forEach(function(el) {
    if (el.type === 'line') {
      sldRenderLine(lineLayer, el)
    } else if (el.type !== 'group') {
      sldRenderComp(compLayer, el)
    }
  })

  // Highlight single selected
  if (sldSelected !== null) {
    var selEl = document.getElementById('sld-el-' + sldSelected)
    if (selEl) {
      var bb = selEl.getBBox ? selEl.getBBox() : { x:0,y:0,width:60,height:60 }
      var rect = document.createElementNS('http://www.w3.org/2000/svg','rect')
      rect.setAttribute('x', bb.x - 4);       rect.setAttribute('y', bb.y - 4)
      rect.setAttribute('width',  bb.width  + 8)
      rect.setAttribute('height', bb.height + 8)
      rect.setAttribute('fill', 'none')
      rect.setAttribute('stroke', '#f59e0b')
      rect.setAttribute('stroke-width', '2')
      rect.setAttribute('stroke-dasharray', '4 3')
      rect.setAttribute('rx', '4')
      rect.setAttribute('pointer-events', 'none')
      compLayer.appendChild(rect)
    }
    document.getElementById('sld-btn-delete').style.display = 'inline-block'
  } else {
    document.getElementById('sld-btn-delete').style.display = 'none'
  }

  // Highlight multi-select — outline biru per elemen
  sldMultiSel.forEach(function(mid) {
    var mel = document.getElementById('sld-el-' + mid)
    if (!mel) return
    var bb2 = mel.getBBox ? mel.getBBox() : { x:0,y:0,width:60,height:60 }
    var mr = document.createElementNS('http://www.w3.org/2000/svg','rect')
    mr.setAttribute('x', bb2.x - 3);  mr.setAttribute('y', bb2.y - 3)
    mr.setAttribute('width',  bb2.width  + 6)
    mr.setAttribute('height', bb2.height + 6)
    mr.setAttribute('fill', 'rgba(14,165,233,0.10)')
    mr.setAttribute('stroke', '#0ea5e9')
    mr.setAttribute('stroke-width', '1.5')
    mr.setAttribute('rx', '3')
    mr.setAttribute('pointer-events', 'none')
    compLayer.appendChild(mr)
  })

  sldUpdateGroupBtn()
}

// ── Render komponen (generator, trafo, busbar, cb, load, label) ─
function sldRenderComp(layer, el) {
  var g = document.createElementNS('http://www.w3.org/2000/svg','g')
  g.setAttribute('id', 'sld-el-' + el.id)
  g.setAttribute('transform', 'translate(' + el.x + ',' + el.y + ')')
  g.setAttribute('cursor', SLD_IS_ADMIN ? 'grab' : 'default')

  var color  = el.color  || '#1e3a5f'
  var label  = el.label  || ''
  var w = el.w || 60, h = el.h || 60

  if (el.type === 'generator') {
    var c = document.createElementNS('http://www.w3.org/2000/svg','circle')
    c.setAttribute('cx', w/2); c.setAttribute('cy', h/2)
    c.setAttribute('r', Math.min(w,h)/2 - 4)
    c.setAttribute('fill', '#fff'); c.setAttribute('stroke', color); c.setAttribute('stroke-width', '2.5')
    g.appendChild(c)
    var t = document.createElementNS('http://www.w3.org/2000/svg','text')
    t.setAttribute('x', w/2); t.setAttribute('y', h/2 + 5)
    t.setAttribute('text-anchor','middle'); t.setAttribute('font-size','14')
    t.setAttribute('fill', color); t.setAttribute('font-weight','bold')
    t.textContent = 'G'; g.appendChild(t)
    // Konektor atas
    sldConnPoint(g, w/2, 0)
  } else if (el.type === 'trafo') {
    var c1 = document.createElementNS('http://www.w3.org/2000/svg','circle')
    c1.setAttribute('cx', w*0.35); c1.setAttribute('cy', h/2)
    c1.setAttribute('r', Math.min(w,h)*0.28)
    c1.setAttribute('fill','#fff'); c1.setAttribute('stroke',color); c1.setAttribute('stroke-width','2.5')
    g.appendChild(c1)
    var c2 = document.createElementNS('http://www.w3.org/2000/svg','circle')
    c2.setAttribute('cx', w*0.65); c2.setAttribute('cy', h/2)
    c2.setAttribute('r', Math.min(w,h)*0.28)
    c2.setAttribute('fill','#fff'); c2.setAttribute('stroke',color); c2.setAttribute('stroke-width','2.5')
    g.appendChild(c2)
    sldConnPoint(g, w*0.35, 0)
    sldConnPoint(g, w*0.65, h)
  } else if (el.type === 'busbar') {
    var bh = el.bh || 8
    var rect = document.createElementNS('http://www.w3.org/2000/svg','rect')
    rect.setAttribute('x', 0); rect.setAttribute('y', (h-bh)/2)
    rect.setAttribute('width', w); rect.setAttribute('height', bh)
    rect.setAttribute('fill', color); rect.setAttribute('rx','2')
    g.appendChild(rect)
  } else if (el.type === 'cb') {
    var sq = document.createElementNS('http://www.w3.org/2000/svg','rect')
    sq.setAttribute('x', w/2-12); sq.setAttribute('y', h/2-12)
    sq.setAttribute('width','24'); sq.setAttribute('height','24')
    sq.setAttribute('fill','#fff'); sq.setAttribute('stroke',color); sq.setAttribute('stroke-width','2.5')
    g.appendChild(sq)
    var l1 = document.createElementNS('http://www.w3.org/2000/svg','line')
    l1.setAttribute('x1',w/2); l1.setAttribute('y1',0)
    l1.setAttribute('x2',w/2); l1.setAttribute('y2',h/2-12)
    l1.setAttribute('stroke',color); l1.setAttribute('stroke-width','2.5')
    g.appendChild(l1)
    var l2 = document.createElementNS('http://www.w3.org/2000/svg','line')
    l2.setAttribute('x1',w/2); l2.setAttribute('y1',h/2+12)
    l2.setAttribute('x2',w/2); l2.setAttribute('y2',h)
    l2.setAttribute('stroke',color); l2.setAttribute('stroke-width','2.5')
    g.appendChild(l2)
    sldConnPoint(g, w/2, 0)
    sldConnPoint(g, w/2, h)
  } else if (el.type === 'load') {
    var tri = document.createElementNS('http://www.w3.org/2000/svg','polygon')
    var hw = w/2
    tri.setAttribute('points', hw+',6 '+(w-4)+','+(h-6)+' 4,'+(h-6))
    tri.setAttribute('fill','#fff'); tri.setAttribute('stroke',color); tri.setAttribute('stroke-width','2.5')
    g.appendChild(tri)
    var lv = document.createElementNS('http://www.w3.org/2000/svg','line')
    lv.setAttribute('x1',hw); lv.setAttribute('y1',0)
    lv.setAttribute('x2',hw); lv.setAttribute('y2',6)
    lv.setAttribute('stroke',color); lv.setAttribute('stroke-width','2.5')
    g.appendChild(lv)
    sldConnPoint(g, hw, 0)
  } else if (el.type === 'label') {
    var lt = document.createElementNS('http://www.w3.org/2000/svg','text')
    lt.setAttribute('x', 0); lt.setAttribute('y', 0)
    lt.setAttribute('font-size', el.fontSize || 13)
    lt.setAttribute('fill', color)
    lt.setAttribute('font-weight', el.bold ? 'bold' : 'normal')
    lt.textContent = label || 'Label'
    g.appendChild(lt)
  }

  // Label: generator → di bawah (tengah), semua tipe lain → di kanan (rata kiri)
  if (label && el.type !== 'label') {
    var segments  = label.split('\n')
    var namaPart  = segments[0] || ''
    var dayaPart  = segments[1] || ''

    // Word-wrap nama mesin
    var WRAP_CH   = Math.max(10, Math.floor(w / 6.5))
    var words     = namaPart.split(' ')
    var namaLines = []
    var cur       = ''
    words.forEach(function(wd) {
      if (!wd) return
      var test = cur ? cur + ' ' + wd : wd
      if (test.length > WRAP_CH && cur) { namaLines.push(cur); cur = wd }
      else cur = test
    })
    if (cur) namaLines.push(cur)

    var allLines  = namaLines.concat(dayaPart ? [dayaPart] : [])
    var namaCount = namaLines.length
    var lbl = document.createElementNS('http://www.w3.org/2000/svg','text')
    lbl.setAttribute('font-size','10')
    lbl.setAttribute('fill','#374151')
    lbl.setAttribute('font-weight','600')

    if (el.type === 'generator') {
      // Generator: label di bawah, tengah (perilaku lama)
      lbl.setAttribute('x', w/2)
      lbl.setAttribute('y', h + 14)
      lbl.setAttribute('text-anchor','middle')
      allLines.forEach(function(line, li) {
        var ts = document.createElementNS('http://www.w3.org/2000/svg','tspan')
        ts.setAttribute('x', w/2)
        ts.setAttribute('dy', li === 0 ? '0' : '12')
        if (li >= namaCount) { ts.setAttribute('fill','#2563eb'); ts.setAttribute('font-weight','400') }
        ts.textContent = line
        lbl.appendChild(ts)
      })
    } else {
      // Semua tipe lain: label di kanan, vertikal tengah simbol
      // lblX dihitung dari tepi kanan visual aktual (bukan dari w)
      var lblX
      if      (el.type === 'cb')    lblX = w/2 + 12 + 4  // kotak CB: x=w/2-12..w/2+12
      else if (el.type === 'trafo') lblX = w * 0.65 + Math.min(w,h)*0.28 + 4  // lingkaran kanan trafo
      else if (el.type === 'load')  lblX = w - 4 + 4     // tepi kanan segitiga
      else                          lblX = w + 2          // default (busbar dll)
      var lblY = h / 2 - (allLines.length - 1) * 6  // vertikal center
      lbl.setAttribute('x', lblX)
      lbl.setAttribute('y', lblY)
      lbl.setAttribute('text-anchor','start')
      allLines.forEach(function(line, li) {
        var ts = document.createElementNS('http://www.w3.org/2000/svg','tspan')
        ts.setAttribute('x', lblX)
        ts.setAttribute('dy', li === 0 ? '0' : '12')
        if (li >= namaCount) { ts.setAttribute('fill','#2563eb'); ts.setAttribute('font-weight','400') }
        ts.textContent = line
        lbl.appendChild(ts)
      })
    }

    g.appendChild(lbl)
  }

  // Event: klik & drag
  g.addEventListener('mousedown', function(e) { sldOnCompMouseDown(e, el.id) })
  g.addEventListener('touchstart', function(e) { sldOnCompTouchStart(e, el.id) }, { passive:false })
  layer.appendChild(g)
}

// ── Titik konektor kecil ──────────────────────────────────────
function sldConnPoint(g, cx, cy) {
  var c = document.createElementNS('http://www.w3.org/2000/svg','circle')
  c.setAttribute('cx', cx); c.setAttribute('cy', cy)
  c.setAttribute('r', 3); c.setAttribute('fill', '#38bdf8')
  c.setAttribute('pointer-events','none')
  g.appendChild(c)
}

// ── Kumpulkan semua titik konektor dari semua komponen ────────
// Return array of { x, y } dalam koordinat SVG absolut
function sldAllConnectors() {
  var pts = []
  sldElements.forEach(function(el) {
    if (el.type === 'line' || el.type === 'group') return
    var w = el.w || 60, h = el.h || 60
    var ax = el.x, ay = el.y  // translate offset
    if (el.type === 'generator') {
      pts.push({ x: ax + w/2, y: ay })
    } else if (el.type === 'trafo') {
      pts.push({ x: ax + w*0.35, y: ay })
      pts.push({ x: ax + w*0.65, y: ay + h })
    } else if (el.type === 'busbar') {
      // busbar: konektor tiap 20px sepanjang sisi atas dan bawah
      var bh = el.bh || 8
      var cy_top = ay + (h - bh) / 2
      var cy_bot = ay + (h + bh) / 2
      for (var bx = ax; bx <= ax + w; bx += 20) {
        pts.push({ x: bx, y: cy_top })
        pts.push({ x: bx, y: cy_bot })
      }
    } else if (el.type === 'cb') {
      pts.push({ x: ax + w/2, y: ay })
      pts.push({ x: ax + w/2, y: ay + h })
    } else if (el.type === 'load') {
      pts.push({ x: ax + w/2, y: ay })
    }
  })
  return pts
}

// ── Snap endpoint ke konektor terdekat ───────────────────────
var SNAP_R = 30  // radius snap lebih besar agar mudah
function sldSnapToConn(x, y) {
  var best = null, bestD = SNAP_R + 1
  sldAllConnectors().forEach(function(p) {
    var d = Math.sqrt((p.x-x)*(p.x-x) + (p.y-y)*(p.y-y))
    if (d < bestD) { bestD = d; best = p }
  })
  return best ? { x: best.x, y: best.y, snapped: true } : { x: sldSnap(x), y: sldSnap(y), snapped: false }
}

// ── Handle endpoint di overlay layer ─────────────────────────
// Dipanggil dari sldRender() — tulis ke sld-overlay-layer
// agar tidak ikut ter-clear saat drag (handle diupdate langsung)
function sldUpdateEndpointHandles() {
  var ovl = document.getElementById('sld-overlay-layer')
  if (!ovl) return
  ovl.innerHTML = ''  // clear handle lama
  if (!SLD_IS_ADMIN || sldSelected === null) return
  var el = sldElements.find(function(e){ return e.id === sldSelected })
  if (!el || el.type !== 'line') return

  ;[['p1', el.x1, el.y1], ['p2', el.x2, el.y2]].forEach(function(ep) {
    var which = ep[0], hx = ep[1], hy = ep[2]
    var h = document.createElementNS('http://www.w3.org/2000/svg','circle')
    h.setAttribute('cx', hx); h.setAttribute('cy', hy)
    h.setAttribute('r', '8')
    h.setAttribute('fill', '#f97316')
    h.setAttribute('stroke', '#fff')
    h.setAttribute('stroke-width', '2.5')
    h.setAttribute('cursor', 'crosshair')
    h.setAttribute('pointer-events', 'all')
    h.style.filter = 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))'
    h.addEventListener('mousedown', function(e) {
      sldDragEndpoint(e, el.id, which)
    })
    ovl.appendChild(h)
  })
}

// ── Drag endpoint line (p1 atau p2) ──────────────────────────
function sldDragEndpoint(e, elId, which) {
  if (!SLD_IS_ADMIN) return
  e.stopPropagation()
  e.preventDefault()
  sldHistoryPush()  // snapshot sebelum geser endpoint
  var svg = document.getElementById('sld-canvas')
  var ovl = document.getElementById('sld-overlay-layer')
  var el  = sldElements.find(function(e){ return e.id === elId })
  if (!el || !ovl) return

  // Cari handle circle yang sesuai di overlay
  var handles = ovl.querySelectorAll('circle')
  var myHandle = handles[which === 'p1' ? 0 : 1]

  // Indikator snap lingkaran hijau (di overlay, tidak ikut di-clear)
  var snapInd = document.createElementNS('http://www.w3.org/2000/svg','circle')
  snapInd.setAttribute('r', SNAP_R)
  snapInd.setAttribute('fill', 'rgba(34,197,94,0.15)')
  snapInd.setAttribute('stroke', '#22c55e')
  snapInd.setAttribute('stroke-width', '1.5')
  snapInd.setAttribute('stroke-dasharray', '4 3')
  snapInd.setAttribute('pointer-events', 'none')
  snapInd.style.display = 'none'
  ovl.appendChild(snapInd)

  // Update path line secara langsung di DOM — tanpa sldRender() penuh
  var lineG   = document.getElementById('sld-el-' + elId)
  var paths   = lineG ? lineG.querySelectorAll('path') : []

  function updateLinePath() {
    var midX, midY, pathD
    if (el.elbow) {
      if (el.elbowDir === 'V') { midX = el.x1; midY = el.y2 }
      else                    { midX = el.x2; midY = el.y1 }
      pathD = 'M '+el.x1+' '+el.y1+' L '+midX+' '+midY+' L '+el.x2+' '+el.y2
    } else {
      pathD = 'M '+el.x1+' '+el.y1+' L '+el.x2+' '+el.y2
    }
    // Update path visible + hit area
    paths.forEach(function(p) { p.setAttribute('d', pathD) })
  }

  function onMove(ev) {
    var pt = svg.createSVGPoint()
    pt.x = ev.clientX; pt.y = ev.clientY
    var sp  = pt.matrixTransform(svg.getScreenCTM().inverse())
    var res = sldSnapToConn(sp.x, sp.y)

    if (which === 'p1') { el.x1 = res.x; el.y1 = res.y }
    else                { el.x2 = res.x; el.y2 = res.y }

    // Update handle position langsung
    if (myHandle) {
      myHandle.setAttribute('cx', res.x)
      myHandle.setAttribute('cy', res.y)
    }
    // Update path line langsung
    updateLinePath()

    // Indikator snap
    if (res.snapped) {
      snapInd.setAttribute('cx', res.x); snapInd.setAttribute('cy', res.y)
      snapInd.style.display = ''
    } else {
      snapInd.style.display = 'none'
    }
    sldModified = true
  }

  function onUp() {
    if (snapInd.parentNode) snapInd.parentNode.removeChild(snapInd)
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup',   onUp)
    // Full re-render sekali saja di akhir
    sldRender()
    sldShowProps(elId)
  }

  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup',   onUp)
}

// ── Render line ───────────────────────────────────────────────
function sldRenderLine(layer, el) {
  var color = el.color || '#1e3a5f'
  var sw    = el.strokeWidth || 2.5
  var g = document.createElementNS('http://www.w3.org/2000/svg','g')
  g.setAttribute('id', 'sld-el-' + el.id)

  // Hitung path — lurus atau siku
  var midX, midY, pathD
  if (el.elbow) {
    if (el.elbowDir === 'V') {
      // Vertikal dulu, lalu horizontal
      midX = el.x1; midY = el.y2
    } else {
      // Horizontal dulu, lalu vertikal (default)
      midX = el.x2; midY = el.y1
    }
    pathD = 'M ' + el.x1 + ' ' + el.y1 +
            ' L ' + midX + ' ' + midY  +
            ' L ' + el.x2 + ' ' + el.y2
  } else {
    pathD = 'M ' + el.x1 + ' ' + el.y1 + ' L ' + el.x2 + ' ' + el.y2
    midX = (el.x1 + el.x2) / 2
    midY = (el.y1 + el.y2) / 2
  }

  var path = document.createElementNS('http://www.w3.org/2000/svg','path')
  path.setAttribute('d', pathD)
  path.setAttribute('stroke', color)
  path.setAttribute('stroke-width', sw)
  path.setAttribute('stroke-linecap', 'round')
  path.setAttribute('stroke-linejoin', 'round')
  path.setAttribute('fill', 'none')
  g.appendChild(path)

  // Hit area (invisible, untuk klik & drag body line)
  var hit = document.createElementNS('http://www.w3.org/2000/svg','path')
  hit.setAttribute('d', pathD)
  hit.setAttribute('stroke', 'transparent')
  hit.setAttribute('stroke-width', '14')
  hit.setAttribute('fill', 'none')
  hit.setAttribute('cursor', SLD_IS_ADMIN ? 'move' : 'default')
  hit.addEventListener('mousedown', function(e) { sldOnCompMouseDown(e, el.id); e.stopPropagation() })
  g.appendChild(hit)

  if (el.label) {
    var lt = document.createElementNS('http://www.w3.org/2000/svg','text')
    lt.setAttribute('x', midX); lt.setAttribute('y', midY - 6)
    lt.setAttribute('text-anchor', 'middle'); lt.setAttribute('font-size', '11')
    lt.setAttribute('fill', '#374151'); lt.setAttribute('font-weight', '600')
    lt.textContent = el.label
    g.appendChild(lt)
  }

  layer.appendChild(g)
}

// ── Tambah elemen dari palette ────────────────────────────────
function sldAddElement(type) {
  if (!SLD_IS_ADMIN) return
  var wrap  = document.getElementById('sld-canvas-wrap')
  var cx    = sldSnap(wrap.scrollLeft + wrap.clientWidth  / 2)
  var cy    = sldSnap(wrap.scrollTop  + wrap.clientHeight / 2)

  var el = { id: sldNextId++, type: type, label: '', color: '#1e3a5f' }
  if (type === 'line') {
    el.x1 = cx-60; el.y1 = cy; el.x2 = cx+60; el.y2 = cy+80
    el.strokeWidth = 2.5
    el.elbow    = true  // default siku
    el.elbowDir = 'H'   // H = horizontal dulu lalu vertikal
  } else if (type === 'busbar') {
    el.x = cx-80; el.y = cy; el.w = 160; el.h = 20; el.bh = 8
  } else if (type === 'label') {
    el.x = cx; el.y = cy; el.w = 80; el.h = 20
    el.fontSize = 13; el.bold = false; el.label = 'Label'
  } else {
    el.x = cx-30; el.y = cy-30; el.w = 60; el.h = 60
  }
  sldHistoryPush()
  sldElements.push(el)
  sldModified = true
  sldSelected = el.id
  sldRender()
  sldShowProps(el.id)
}

// ── Pilih elemen (single / shift+klik multi) ──────────────────
function sldSelectEl(id, shiftKey) {
  if (!SLD_IS_ADMIN && id !== null) return
  if (id === null) {
    // Klik kosong → clear semua
    sldSelected  = null
    sldMultiSel  = []
    sldRender()
    sldHideProps()
    sldUpdateGroupBtn()
    return
  }
  if (shiftKey) {
    // Shift+klik → toggle ke/dari multiSel
    var idx = sldMultiSel.indexOf(id)
    if (idx === -1) sldMultiSel.push(id)
    else sldMultiSel.splice(idx, 1)
    sldSelected = sldMultiSel.length === 1 ? sldMultiSel[0] : null
    sldRender()
    if (sldMultiSel.length === 1) sldShowProps(sldMultiSel[0])
    else sldHideProps()
    sldUpdateGroupBtn()
    return
  }
  // Klik biasa — langsung pilih elemen (Opsi A: tidak redirect ke group)
  sldSelected = id
  sldMultiSel = []
  sldRender()
  sldShowProps(id)
  sldUpdateGroupBtn()
  sldUpdateEndpointHandles()
}

// ── Update tampilan tombol GROUP/UNGROUP/COPY/PASTE/DUPLIKAT ──
function sldUpdateGroupBtn() {
  var btnGrp   = document.getElementById('sld-btn-group')
  var btnUngrp = document.getElementById('sld-btn-ungroup')
  var btnCopy  = document.getElementById('sld-btn-copy')
  var btnPaste = document.getElementById('sld-btn-paste')
  var btnDup   = document.getElementById('sld-btn-dup')

  var hasSel   = sldSelected !== null || sldMultiSel.length >= 1
  var isGroup  = sldSelected !== null && sldElements.find(function(e){
    return e.id === sldSelected && e.type === 'group'
  })

  if (btnGrp)   btnGrp.style.display   = (sldMultiSel.length >= 2) ? 'inline-block' : 'none'
  if (btnUngrp) btnUngrp.style.display = isGroup ? 'inline-block' : 'none'
  if (btnCopy)  btnCopy.style.display  = hasSel ? 'inline-block' : 'none'
  if (btnDup)   btnDup.style.display   = hasSel ? 'inline-block' : 'none'
  if (btnPaste) btnPaste.style.display = sldClipboard.length ? 'inline-block' : 'none'
}

// ── Buat group dari multi-select ──────────────────────────────
function sldGroupSelected() {
  if (sldMultiSel.length < 2 || !SLD_IS_ADMIN) return
  // Jangan masukkan group ke dalam group lain
  var ids = sldMultiSel.filter(function(id) {
    var el = sldElements.find(function(e){ return e.id === id })
    return el && el.type !== 'group'
  })
  if (ids.length < 2) { showToast('Pilih minimal 2 elemen bukan-group', 'info'); return }
  var grp = {
    id       : sldNextId++,
    type     : 'group',
    label    : 'Group',
    color    : '#0ea5e9',
    childIds : ids.slice()
  }
  sldHistoryPush()
  sldElements.push(grp)
  sldSelected = grp.id
  sldMultiSel = []
  sldModified = true
  sldRender()
  sldShowProps(grp.id)
  sldUpdateGroupBtn()
  showToast('Group dibuat (' + ids.length + ' elemen)', 'success')
}

// ── Lepas group (ungroup) ─────────────────────────────────────
function sldUngroupSelected() {
  if (sldSelected === null || !SLD_IS_ADMIN) return
  var grp = sldElements.find(function(e){ return e.id === sldSelected && e.type === 'group' })
  if (!grp) return
  sldHistoryPush()
  sldElements = sldElements.filter(function(e){ return e.id !== grp.id })
  sldSelected = null
  sldMultiSel = grp.childIds.slice()
  sldModified = true
  sldRender()
  sldHideProps()
  sldUpdateGroupBtn()
  showToast('Group dilepas', 'info')
}

// ── Hitung bounding box dari child elemen group ───────────────
function sldGroupBBox(grp) {
  var PAD = 16
  var xs = [], ys = [], xs2 = [], ys2 = []
  grp.childIds.forEach(function(cid) {
    var el = sldElements.find(function(e){ return e.id === cid })
    if (!el) return
    if (el.type === 'line') {
      xs.push(el.x1, el.x2); ys.push(el.y1, el.y2)
      xs2.push(el.x1, el.x2); ys2.push(el.y1, el.y2)
    } else {
      xs.push(el.x); ys.push(el.y)
      xs2.push(el.x + (el.w || 60)); ys2.push(el.y + (el.h || 60) + 40)
    }
  })
  if (!xs.length) return null
  return {
    x: Math.min.apply(null, xs)  - PAD,
    y: Math.min.apply(null, ys)  - PAD,
    w: Math.max.apply(null, xs2) - Math.min.apply(null, xs)  + PAD * 2,
    h: Math.max.apply(null, ys2) - Math.min.apply(null, ys)  + PAD * 2
  }
}

// ── Copy / Paste / Duplicate ───────────────────────────────────
var sldClipboard = []   // array of deep-copied element objects

function sldCopy() {
  if (!SLD_IS_ADMIN) return
  // Kumpulkan id yang akan di-copy: multiSel kalau ada, atau single selected
  var ids = sldMultiSel.length >= 2 ? sldMultiSel.slice()
          : sldSelected !== null     ? [sldSelected]
          : []
  if (!ids.length) return
  // Deep-copy, sertakan child group kalau ada group
  var toCopy = []
  ids.forEach(function(id) {
    var el = sldElements.find(function(e){ return e.id === id })
    if (!el) return
    toCopy.push(JSON.parse(JSON.stringify(el)))
    if (el.type === 'group' && el.childIds) {
      el.childIds.forEach(function(cid) {
        if (ids.indexOf(cid) === -1) {          // belum ada di list
          var cel = sldElements.find(function(e){ return e.id === cid })
          if (cel) toCopy.push(JSON.parse(JSON.stringify(cel)))
        }
      })
    }
  })
  sldClipboard = toCopy
  showToast('Disalin ' + toCopy.length + ' elemen', 'success')
}

function sldPaste() {
  if (!SLD_IS_ADMIN || !sldClipboard.length) return
  var OFFSET = 20
  // Buat mapping id lama → id baru
  var idMap = {}
  var newEls = sldClipboard.map(function(el) {
    var ne = JSON.parse(JSON.stringify(el))
    var newId = sldNextId++
    idMap[el.id] = newId
    ne.id = newId
    if (ne.type === 'line') {
      ne.x1 += OFFSET; ne.y1 += OFFSET
      ne.x2 += OFFSET; ne.y2 += OFFSET
    } else if (ne.type !== 'group') {
      ne.x += OFFSET; ne.y += OFFSET
    }
    return ne
  })
  // Remap childIds group ke id baru
  newEls.forEach(function(ne) {
    if (ne.type === 'group' && ne.childIds) {
      ne.childIds = ne.childIds.map(function(cid){
        return idMap[cid] !== undefined ? idMap[cid] : cid
      })
    }
  })
  sldHistoryPush()
  newEls.forEach(function(ne){ sldElements.push(ne) })
  // Select semua yang baru di-paste
  var newIds = newEls.filter(function(ne){ return ne.type !== 'group' }).map(function(ne){ return ne.id })
  sldMultiSel = newIds
  sldSelected = newIds.length === 1 ? newIds[0] : null
  sldModified = true
  sldRender()
  if (sldSelected !== null) sldShowProps(sldSelected)
  else sldHideProps()
  sldUpdateGroupBtn()
  showToast('Paste ' + newEls.length + ' elemen', 'success')
}

function sldDuplicate() {
  sldCopy()
  sldPaste()
}

// ── Hapus elemen terpilih (group → hapus group saja, child tetap) ─
function sldDeleteSelected() {
  if (sldSelected === null || !SLD_IS_ADMIN) return
  sldHistoryPush()
  sldElements = sldElements.filter(function(e){ return e.id !== sldSelected })
  sldSelected = null
  sldMultiSel = []
  sldModified = true
  sldRender()
  sldHideProps()
  sldUpdateGroupBtn()
}

// ── Panel properti: tampilkan ─────────────────────────────────
function sldShowProps(id) {
  var el  = sldElements.find(function(e){ return e.id === id })
  if (!el) return
  var panel  = document.getElementById('sld-props-panel')
  var fields = document.getElementById('sld-props-fields')
  if (!panel || !fields) return
  panel.style.display = 'block'
  var html = ''

  // Label
  html += '<div style="display:flex;flex-direction:column;gap:2px;">'
  html += '<label style="font-size:0.68rem;color:#64748b;font-weight:600;">LABEL</label>'
  html += '<input id="prop-label" type="text" value="' + (el.label||'') + '" style="border:1px solid #e2e8f0;border-radius:4px;padding:3px 6px;font-size:0.78rem;" oninput="sldPropChange(\'label\',this.value)"/>'
  html += '</div>'

  // Warna
  html += '<div style="display:flex;align-items:center;gap:6px;">'
  html += '<label style="font-size:0.68rem;color:#64748b;font-weight:600;flex-shrink:0;">WARNA</label>'
  html += '<input id="prop-color" type="color" value="' + (el.color||'#1e3a5f') + '" style="width:36px;height:26px;border:none;cursor:pointer;border-radius:4px;" oninput="sldPropChange(\'color\',this.value)"/>'
  html += '</div>'

  if (el.type === 'group') {
    // Props group: hanya label + warna + info child + tombol ungroup
    html += '<div style="font-size:0.68rem;color:#64748b;">Elemen: <b>' + (el.childIds||[]).length + '</b></div>'
    html += '<button onclick="sldUngroupSelected()" style="background:#0ea5e9;color:#fff;border:none;border-radius:4px;padding:4px 8px;font-size:0.72rem;font-weight:700;cursor:pointer;margin-top:2px;width:100%;">UNGROUP</button>'
    html += '<button onclick="sldDeleteSelected()" style="background:#dc2626;color:#fff;border:none;border-radius:4px;padding:4px 8px;font-size:0.72rem;font-weight:700;cursor:pointer;margin-top:2px;width:100%;">HAPUS GROUP</button>'
    fields.innerHTML = html
    return
  } else if (el.type === 'line') {
    // Toggle siku / lurus
    var elbowChecked = el.elbow ? 'checked' : ''
    var elbowDirLabel = (el.elbowDir === 'V') ? '\u2195 lalu \u2194' : '\u2194 lalu \u2195'
    html += '<div style="display:flex;align-items:center;gap:6px;">'
    html += '<label style="font-size:0.68rem;color:#64748b;font-weight:600;width:58px;">SIKU</label>'
    html += '<input type="checkbox" ' + elbowChecked + ' onchange="sldPropChange(\'elbow\',this.checked)" style="width:16px;height:16px;cursor:pointer;"/>'
    html += '</div>'
    if (el.elbow) {
      html += '<div style="display:flex;align-items:center;gap:4px;">'
      html += '<label style="font-size:0.68rem;color:#64748b;font-weight:600;width:58px;">ARAH</label>'
      html += '<button onclick="sldToggleElbowDir()" style="font-size:0.7rem;padding:2px 8px;border:1px solid #cbd5e1;border-radius:4px;cursor:pointer;background:#f1f5f9;">' + elbowDirLabel + '</button>'
      html += '</div>'
    }
    // Koordinat
    html += sldPropNum('X1','x1',el.x1) + sldPropNum('Y1','y1',el.y1)
    html += sldPropNum('X2','x2',el.x2) + sldPropNum('Y2','y2',el.y2)
    html += sldPropNum('TEBAL','strokeWidth',el.strokeWidth||2.5)
  } else if (el.type === 'busbar') {
    html += sldPropNum('X','x',el.x) + sldPropNum('Y','y',el.y)
    html += sldPropNum('LEBAR','w',el.w) + sldPropNum('TINGGI BUS','bh',el.bh||8)
  } else if (el.type === 'label') {
    html += sldPropNum('X','x',el.x) + sldPropNum('Y','y',el.y)
    html += sldPropNum('FONT SIZE','fontSize',el.fontSize||13)
    html += '<div style="display:flex;align-items:center;gap:6px;">'
    html += '<label style="font-size:0.68rem;color:#64748b;font-weight:600;">BOLD</label>'
    html += '<input type="checkbox" ' + (el.bold?'checked':'') + ' onchange="sldPropChange(\'bold\',this.checked)" style="width:16px;height:16px;cursor:pointer;"/>'
    html += '</div>'
  } else if (el.type === 'generator') {
    html += sldPropNum('X','x',el.x) + sldPropNum('Y','y',el.y)
    html += sldPropNum('LEBAR','w',el.w||60) + sldPropNum('TINGGI','h',el.h||60)
    // Dropdown pilih mesin sebagai label
    var mlist = sldMesinList.length ? sldMesinList : mesinList
    if (mlist && mlist.length > 0) {
      // Cari mesin yang sedang dipakai (cocokkan dari baris pertama label)
      var currentNama = (el.label || '').split('\n')[0].trim()
      html += '<div style="display:flex;flex-direction:column;gap:2px;margin-top:4px;">'
      html += '<label style="font-size:0.68rem;color:#64748b;font-weight:600;">PILIH MESIN</label>'
      html += '<select style="border:1px solid #e2e8f0;border-radius:4px;padding:3px 6px;font-size:0.75rem;cursor:pointer;width:100%;" onchange="sldPickMesin(this.value)">'
      html += '<option value="">— pilih mesin —</option>'
      mlist.forEach(function(m) {
        var nm   = (m.nama_mesin || m.mesin || '').trim()
        var daya = (m.terpasang > 0) ? ' (' + m.terpasang + ' kW)' : ''
        var sel  = nm === currentNama ? ' selected' : ''
        html += '<option value="' + m.id_mesin + '"' + sel + '>' + nm + daya + '</option>'
      })
      html += '</select>'
      html += '</div>'
    }
  } else {
    html += sldPropNum('X','x',el.x) + sldPropNum('Y','y',el.y)
    html += sldPropNum('LEBAR','w',el.w||60) + sldPropNum('TINGGI','h',el.h||60)
  }

  html += '<button onclick="sldDeleteSelected()" style="background:#dc2626;color:#fff;border:none;border-radius:4px;padding:4px 8px;font-size:0.72rem;font-weight:700;cursor:pointer;margin-top:2px;">HAPUS</button>'
  fields.innerHTML = html
}

function sldPropNum(label, key, val) {
  return '<div style="display:flex;align-items:center;gap:4px;">' +
    '<label style="font-size:0.68rem;color:#64748b;font-weight:600;width:58px;flex-shrink:0;">' + label + '</label>' +
    '<input type="number" value="' + val + '" style="border:1px solid #e2e8f0;border-radius:4px;padding:3px 4px;font-size:0.75rem;width:64px;" ' +
    'oninput="sldPropChange(\'' + key + '\',parseFloat(this.value)||0)"/>' +
    '</div>'
}

// ── Pilih mesin dari dropdown → set label generator ───────────
function sldPickMesin(idMesin) {
  var el = sldElements.find(function(e){ return e.id === sldSelected })
  if (!el || el.type !== 'generator') return
  if (!idMesin) return  // pilih "— pilih mesin —"
  var mlist = sldMesinList.length ? sldMesinList : mesinList
  var m = mlist.find(function(x){ return String(x.id_mesin) === String(idMesin) })
  if (!m) return
  sldHistoryPush()
  var nm   = (m.nama_mesin || m.mesin || '').trim()
  var daya = (m.terpasang != null && m.terpasang > 0) ? '\n' + m.terpasang + ' kW' : ''
  el.label = nm + daya
  el.mesinId = m.id_mesin   // simpan referensi id mesin di elemen
  sldModified = true
  sldRender()
  sldShowProps(el.id)
}

// ── Update properti elemen ────────────────────────────────────
function sldPropChange(key, val) {
  var el = sldElements.find(function(e){ return e.id === sldSelected })
  if (!el) return
  sldHistoryPush()
  el[key] = val
  sldModified = true
  sldRender()
  // Re-show props hanya untuk checkbox (supaya tombol ARAH muncul/hilang)
  if (key === 'elbow') sldShowProps(el.id)
}

// ── Toggle arah belok siku (H↔V) ─────────────────────────────
function sldToggleElbowDir() {
  var el = sldElements.find(function(e){ return e.id === sldSelected })
  if (!el || el.type !== 'line') return
  sldHistoryPush()
  el.elbowDir = (el.elbowDir === 'V') ? 'H' : 'V'
  sldModified = true
  sldRender()
  sldShowProps(el.id)
}

function sldHideProps() {
  var p = document.getElementById('sld-props-panel')
  if (p) p.style.display = 'none'
}

// ── Drag group (mouse) — murni drag tanpa mengubah selection ──
// Dipanggil dari sldOnCompMouseDown saat child group di-drag.
// Selection sudah diset oleh sldOnCompMouseDown, fungsi ini
// hanya menangani pergerakan semua child bersama.
function sldOnGroupMouseDown(e, grpId) {
  if (!SLD_IS_ADMIN) return
  sldHistoryPush()  // snapshot sebelum drag group
  // TIDAK memanggil sldSelectEl — selection ditangani pemanggil
  var svg = document.getElementById('sld-canvas')
  var pt  = svg.createSVGPoint()
  pt.x = e.clientX; pt.y = e.clientY
  var svgP = pt.matrixTransform(svg.getScreenCTM().inverse())
  var grp  = sldElements.find(function(g){ return g.id === grpId })
  if (!grp) return

  // Simpan posisi awal semua child
  var origPositions = {}
  grp.childIds.forEach(function(cid) {
    var cel = sldElements.find(function(e){ return e.id === cid })
    if (!cel) return
    if (cel.type === 'line') origPositions[cid] = { x1:cel.x1, y1:cel.y1, x2:cel.x2, y2:cel.y2 }
    else origPositions[cid] = { x:cel.x, y:cel.y }
  })

  function onMove(ev) {
    var pt2 = svg.createSVGPoint()
    pt2.x = ev.clientX; pt2.y = ev.clientY
    var sp = pt2.matrixTransform(svg.getScreenCTM().inverse())
    var dx = sp.x - svgP.x, dy = sp.y - svgP.y
    grp.childIds.forEach(function(cid) {
      var cel = sldElements.find(function(e){ return e.id === cid })
      if (!cel || !origPositions[cid]) return
      if (cel.type === 'line') {
        cel.x1 = sldSnap(origPositions[cid].x1 + dx)
        cel.y1 = sldSnap(origPositions[cid].y1 + dy)
        cel.x2 = sldSnap(origPositions[cid].x2 + dx)
        cel.y2 = sldSnap(origPositions[cid].y2 + dy)
      } else {
        cel.x = sldSnap(origPositions[cid].x + dx)
        cel.y = sldSnap(origPositions[cid].y + dy)
      }
    })
    sldModified = true
    sldRender()
  }
  function onUp() {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup',   onUp)
    // Refresh props panel untuk elemen yang ter-select (bukan group)
    if (sldSelected !== null) sldShowProps(sldSelected)
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup',   onUp)
}

// ── Drag komponen (mouse) ─────────────────────────────────────
function sldOnCompMouseDown(e, id) {
  if (!SLD_IS_ADMIN) { sldSelectEl(null); return }
  e.stopPropagation()
  sldHistoryPush()  // snapshot sebelum drag
  sldSelectEl(id, e.shiftKey)
  var svg  = document.getElementById('sld-canvas')
  var pt   = svg.createSVGPoint()
  pt.x = e.clientX; pt.y = e.clientY
  var svgP = pt.matrixTransform(svg.getScreenCTM().inverse())
  var el   = sldElements.find(function(e){ return e.id === id })
  if (!el) return

  // Cek apakah elemen ini child dari group → drag semua child sekaligus
  var parentGrp = sldElements.find(function(g){
    return g.type === 'group' && g.childIds && g.childIds.indexOf(id) !== -1
  })
  if (parentGrp) {
    // sldSelectEl sudah dipanggil di atas (pilih child, bukan group)
    // Delegasikan drag ke sldOnGroupMouseDown (murni geser, tidak ubah selection)
    sldOnGroupMouseDown(e, parentGrp.id)
    return
  }

  // Simpan posisi awal — line pakai x1/y1/x2/y2, komponen lain pakai x/y
  if (el.type === 'line') {
    sldDragging = { id: id, startX: svgP.x, startY: svgP.y,
                    origX1: el.x1, origY1: el.y1, origX2: el.x2, origY2: el.y2 }
  } else {
    sldDragging = { id: id, startX: svgP.x, startY: svgP.y, origX: el.x, origY: el.y }
  }

  function onMove(ev) {
    if (!sldDragging) return
    var pt2 = svg.createSVGPoint()
    pt2.x = ev.clientX; pt2.y = ev.clientY
    var sp = pt2.matrixTransform(svg.getScreenCTM().inverse())
    var dx = sp.x - sldDragging.startX
    var dy = sp.y - sldDragging.startY
    var target = sldElements.find(function(e){ return e.id === sldDragging.id })
    if (target) {
      if (target.type === 'line') {
        // Geser kedua titik sekaligus
        target.x1 = sldSnap(sldDragging.origX1 + dx)
        target.y1 = sldSnap(sldDragging.origY1 + dy)
        target.x2 = sldSnap(sldDragging.origX2 + dx)
        target.y2 = sldSnap(sldDragging.origY2 + dy)
      } else {
        target.x = sldSnap(sldDragging.origX + dx)
        target.y = sldSnap(sldDragging.origY + dy)
      }
      sldModified = true
      sldRender()
    }
  }
  function onUp() {
    sldDragging = null
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup',  onUp)
    if (sldSelected !== null) sldShowProps(sldSelected)
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup',   onUp)
}

// ── Drag komponen (touch) ─────────────────────────────────────
function sldOnCompTouchStart(e, id) {
  if (!SLD_IS_ADMIN) return
  e.preventDefault()
  sldHistoryPush()  // snapshot sebelum drag touch
  sldSelectEl(id)
  var svg  = document.getElementById('sld-canvas')
  var touch = e.touches[0]
  var pt   = svg.createSVGPoint()
  pt.x = touch.clientX; pt.y = touch.clientY
  var svgP = pt.matrixTransform(svg.getScreenCTM().inverse())
  var el   = sldElements.find(function(e){ return e.id === id })
  if (!el) return

  if (el.type === 'line') {
    sldDragging = { id: id, startX: svgP.x, startY: svgP.y,
                    origX1: el.x1, origY1: el.y1, origX2: el.x2, origY2: el.y2 }
  } else {
    sldDragging = { id: id, startX: svgP.x, startY: svgP.y, origX: el.x, origY: el.y }
  }

  function onMove(ev) {
    if (!sldDragging) return
    var t2 = ev.touches[0]
    var pt2 = svg.createSVGPoint()
    pt2.x = t2.clientX; pt2.y = t2.clientY
    var sp = pt2.matrixTransform(svg.getScreenCTM().inverse())
    var dx = sp.x - sldDragging.startX
    var dy = sp.y - sldDragging.startY
    var target = sldElements.find(function(e){ return e.id === sldDragging.id })
    if (target) {
      if (target.type === 'line') {
        target.x1 = sldSnap(sldDragging.origX1 + dx)
        target.y1 = sldSnap(sldDragging.origY1 + dy)
        target.x2 = sldSnap(sldDragging.origX2 + dx)
        target.y2 = sldSnap(sldDragging.origY2 + dy)
      } else {
        target.x = sldSnap(sldDragging.origX + dx)
        target.y = sldSnap(sldDragging.origY + dy)
      }
      sldModified = true
      sldRender()
    }
  }
  function onEnd() {
    sldDragging = null
    document.removeEventListener('touchmove', onMove)
    document.removeEventListener('touchend',  onEnd)
    if (sldSelected !== null) sldShowProps(sldSelected)
  }
  document.addEventListener('touchmove', onMove, { passive:false })
  document.addEventListener('touchend',  onEnd)
}

// ── Klik canvas kosong → deselect / drag-select ───────────────
document.addEventListener('DOMContentLoaded', function() {
  var canvas = document.getElementById('sld-canvas')
  if (!canvas) return

  canvas.addEventListener('mousedown', function(e) {
    if (e.target !== canvas && e.target.id !== 'sld-grid-bg') return
    if (!SLD_IS_ADMIN) return

    // Mulai drag-select (rubber band)
    var svg = canvas
    var pt  = svg.createSVGPoint()
    pt.x = e.clientX; pt.y = e.clientY
    var sp = pt.matrixTransform(svg.getScreenCTM().inverse())
    sldSelBoxing = true
    sldSelBox    = { x0: sp.x, y0: sp.y, x1: sp.x, y1: sp.y }

    // Buat rect sementara
    var selRect = document.createElementNS('http://www.w3.org/2000/svg','rect')
    selRect.setAttribute('id','sld-sel-rect')
    selRect.setAttribute('fill','rgba(14,165,233,0.08)')
    selRect.setAttribute('stroke','#0ea5e9')
    selRect.setAttribute('stroke-width','1')
    selRect.setAttribute('stroke-dasharray','4 2')
    selRect.setAttribute('pointer-events','none')
    canvas.appendChild(selRect)

    function onMove(ev) {
      if (!sldSelBoxing) return
      var pt2 = svg.createSVGPoint()
      pt2.x = ev.clientX; pt2.y = ev.clientY
      var sp2 = pt2.matrixTransform(svg.getScreenCTM().inverse())
      sldSelBox.x1 = sp2.x; sldSelBox.y1 = sp2.y
      var rx = Math.min(sldSelBox.x0, sldSelBox.x1)
      var ry = Math.min(sldSelBox.y0, sldSelBox.y1)
      var rw = Math.abs(sldSelBox.x1 - sldSelBox.x0)
      var rh = Math.abs(sldSelBox.y1 - sldSelBox.y0)
      selRect.setAttribute('x', rx); selRect.setAttribute('y', ry)
      selRect.setAttribute('width', rw); selRect.setAttribute('height', rh)
    }

    function onUp() {
      sldSelBoxing = false
      var sr = document.getElementById('sld-sel-rect')
      if (sr) sr.parentNode.removeChild(sr)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup',   onUp)

      var rx0 = Math.min(sldSelBox.x0, sldSelBox.x1)
      var ry0 = Math.min(sldSelBox.y0, sldSelBox.y1)
      var rx1 = Math.max(sldSelBox.x0, sldSelBox.x1)
      var ry1 = Math.max(sldSelBox.y0, sldSelBox.y1)
      var size = (rx1-rx0) * (ry1-ry0)

      if (size < 100) {
        // Klik biasa (bukan drag) → deselect
        sldSelectEl(null)
        return
      }

      // Temukan semua elemen di dalam kotak seleksi
      var hit = []
      sldElements.forEach(function(el) {
        if (el.type === 'group') return  // skip group
        var ex, ey
        if (el.type === 'line') {
          ex = Math.min(el.x1, el.x2); ey = Math.min(el.y1, el.y2)
        } else {
          ex = el.x; ey = el.y
        }
        if (ex >= rx0 && ey >= ry0 && ex <= rx1 && ey <= ry1) hit.push(el.id)
      })

      if (hit.length === 0) { sldSelectEl(null); return }
      sldMultiSel = hit
      sldSelected = hit.length === 1 ? hit[0] : null
      sldRender()
      if (hit.length === 1) sldShowProps(hit[0])
      else sldHideProps()
      sldUpdateGroupBtn()
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup',   onUp)
  })
})

// ── Simpan ke API ─────────────────────────────────────────────
async function sldSave() {
  if (!sldCurrentUnit || !SLD_IS_ADMIN) return
  var btnSave = document.getElementById('sld-btn-save')
  if (btnSave) { btnSave.disabled = true; btnSave.textContent = 'Menyimpan...' }
  try {
    var res = await fetch('/api/sld/' + sldCurrentUnit.kode_unit, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama_unit: sldCurrentUnit.nama_unit, svg_data: sldElements })
    })
    var json = await res.json()
    if (!json.success) throw new Error(json.error)
    sldModified = false
    showToast('SLD berhasil disimpan!', 'success')
  } catch(e) {
    showToast('Gagal menyimpan SLD: ' + e.message, 'error')
  } finally {
    if (btnSave) { btnSave.disabled = false; btnSave.textContent = 'SIMPAN' }
  }
}

// ── Pasang event palette drag ke canvas ───────────────────────
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.sld-pal-item').forEach(function(item) {
    item.addEventListener('click', function() {
      if (!SLD_IS_ADMIN) { showToast('Login admin untuk mengedit SLD', 'info'); return }
      if (!sldCurrentUnit) { showToast('Pilih unit terlebih dahulu', 'info'); return }
      sldAddElement(item.getAttribute('data-type'))
    })
  })

  // sld-mode-label sudah pakai onclick="sldAdminLogin()" di HTML — tidak perlu addEventListener lagi
})

// ── Keyboard shortcut SLD: Ctrl+C, Ctrl+V, Ctrl+D, Delete ────
document.addEventListener('keydown', function(e) {
  // Hanya aktif saat SLD admin mode dan fokus bukan di input/textarea
  if (!SLD_IS_ADMIN) return
  var tag = document.activeElement && document.activeElement.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
  // Cek apakah panel SLD sedang tampil
  var sldWrap = document.getElementById('sld-wrap')
  if (!sldWrap || sldWrap.classList.contains('hidden')) return

  var ctrl = e.ctrlKey || e.metaKey
  if (ctrl && e.key === 'z') { e.preventDefault(); sldUndo() }
  else if (ctrl && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); sldRedo() }
  else if (ctrl && e.key === 'c') { e.preventDefault(); sldCopy() }
  else if (ctrl && e.key === 'v') { e.preventDefault(); sldPaste() }
  else if (ctrl && e.key === 'd') { e.preventDefault(); sldDuplicate() }
  else if (e.key === 'Delete' || e.key === 'Backspace') {
    // Backspace hanya kalau bukan di input
    if (e.key === 'Backspace' && document.activeElement !== document.body) return
    e.preventDefault()
    sldDeleteSelected()
  }
})

// =============================================
// ===== TAB PENGATURAN MESIN =====
// =============================================

var _pengIsAdmin       = false   // apakah sudah login admin
var _pengCurrentFilter = ''      // kode_unit filter saat ini
var _pengAllMesin      = []      // cache semua mesin dari API
var ADMIN_PASSWORD     = 'dilan2025'  // password admin pengaturan

// Update tampilan tombol admin di toolbar sesuai status login
function _pengUpdateAdminBtn() {
  var btn = document.getElementById('btn-peng-admin')
  if (!btn) return
  if (_pengIsAdmin) {
    btn.textContent = 'KELUAR ADMIN'
    btn.style.background = '#64748b'
  } else {
    btn.textContent = 'MASUK SEBAGAI ADMIN'
    btn.style.background = '#dc2626'
  }
}

// State sub-tab pengaturan saat ini ('mesin', 'sld', atau 'budgeting')
var _currentPengView = 'mesin'

// Toggle sub-tab di dalam PENGATURAN
function switchPengView(view) {
  // Guard: SLD hanya bisa diakses setelah login admin PENGATURAN
  if (view === 'sld' && !_pengIsAdmin) {
    showToast('Login sebagai admin untuk mengakses SLD', 'error')
    return
  }
  // Guard: TAD hanya bisa diakses setelah login admin PENGATURAN
  if (view === 'tad' && !_pengIsAdmin) {
    showToast('Login sebagai admin untuk mengakses TAD', 'error')
    return
  }
  // Guard: SALDO BBM hanya bisa diakses setelah login admin PENGATURAN
  if (view === 'budgeting' && !_pengIsAdmin) {
    showToast('Login sebagai admin untuk mengakses Saldo BBM', 'error')
    return
  }

  _currentPengView = view

  // Update tombol sub-tab aktif
  document.getElementById('peng-sub-btn-mesin').classList.toggle('active', view === 'mesin')
  document.getElementById('peng-sub-btn-tad').classList.toggle('active', view === 'tad')
  document.getElementById('peng-sub-btn-sld').classList.toggle('active', view === 'sld')
  document.getElementById('peng-sub-btn-budgeting').classList.toggle('active', view === 'budgeting')

  // Toggle konten sub-view
  var viewMesin      = document.getElementById('peng-view-mesin')
  var viewTad        = document.getElementById('peng-view-tad')
  var viewSld        = document.getElementById('peng-view-sld')
  var viewBudgeting  = document.getElementById('peng-view-budgeting')
  if (viewMesin)     viewMesin.style.display     = (view === 'mesin')      ? '' : 'none'
  if (viewTad)       viewTad.style.display       = (view === 'tad')        ? '' : 'none'
  if (viewSld)       viewSld.style.display       = (view === 'sld')        ? '' : 'none'
  if (viewBudgeting) viewBudgeting.style.display = (view === 'budgeting')  ? '' : 'none'

  // Toggle toolbar sub-panel
  var tbMesin     = document.getElementById('peng-toolbar-mesin')
  var tbTad       = document.getElementById('peng-toolbar-tad')
  var tbSld       = document.getElementById('peng-toolbar-sld')
  var tbBudgeting = document.getElementById('peng-toolbar-budgeting')
  if (tbMesin)     tbMesin.style.display     = (view === 'mesin')     ? 'flex' : 'none'
  if (tbTad)       tbTad.style.display       = (view === 'tad')       ? 'flex' : 'none'
  if (tbSld)       tbSld.style.display       = (view === 'sld')       ? 'flex' : 'none'
  if (tbBudgeting) tbBudgeting.style.display = (view === 'budgeting') ? 'flex' : 'none'

  // Inisialisasi SLD unit select saat pertama kali masuk sub-tab SLD
  if (view === 'sld') sldInitUnitSelect()

  // Load data TAD saat pertama kali / setiap kali masuk sub-tab TAD
  if (view === 'tad') loadTadData()

  // Saldo BBM: iframe sudah auto-load saat ditampilkan, tidak perlu init
}

// ===== TAD =====

var _tadEditId = null  // null = tambah baru, number = edit existing

async function loadTadData() {
  var tbody = document.getElementById('tad-table-body')
  var thead = document.getElementById('tad-table-head')
  if (!tbody || !thead) return

  thead.innerHTML = '<tr style="background:#1e3a5f;color:#fff;font-size:0.78rem;">' +
    '<th style="padding:8px 4px;text-align:center;">No</th>' +
    '<th style="padding:8px 10px;text-align:left;white-space:nowrap;">Nama</th>' +
    '<th style="padding:8px 10px;text-align:left;white-space:nowrap;">Jabatan</th>' +
    '<th style="padding:8px 10px;text-align:left;white-space:nowrap;">Penempatan</th>' +
    '<th style="padding:8px 10px;text-align:center;white-space:nowrap;">Aksi</th>' +
    '</tr>'

  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:24px;color:#94a3b8;"><span class="spinner"></span></td></tr>'

  try {
    var res  = await fetch('/api/tad')
    var json = await res.json()
    if (!json.success) throw new Error(json.error)
    var data = json.data || []

    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:32px;color:#94a3b8;">Belum ada data TAD</td></tr>'
      return
    }

    tbody.innerHTML = data.map(function(t, i) {
      var rowBg = i % 2 === 0 ? '#fff' : '#f8fafc'
      return '<tr style="background:' + rowBg + ';font-size:0.82rem;" data-id="' + t.id + '">' +
        '<td style="padding:7px 4px;text-align:center;color:#64748b;">' + (i + 1) + '</td>' +
        '<td style="padding:7px 10px;text-align:left;">' + (t.nama || '-') + '</td>' +
        '<td style="padding:7px 10px;text-align:left;">' + (t.jabatan || '-') + '</td>' +
        '<td style="padding:7px 10px;text-align:left;">' + (t.penempatan || '-') + '</td>' +
        '<td style="padding:5px 10px;text-align:center;white-space:nowrap;">' +
          '<button onclick="tadOpenModal(' + t.id + ')" style="background:#2563eb;color:#fff;border:none;border-radius:4px;padding:3px 10px;font-size:0.75rem;cursor:pointer;margin-right:4px;">Edit</button>' +
          '<button onclick="tadHapus(' + t.id + ')" style="background:#dc2626;color:#fff;border:none;border-radius:4px;padding:3px 10px;font-size:0.75rem;cursor:pointer;">Hapus</button>' +
        '</td>' +
        '</tr>'
    }).join('')
  } catch(e) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:24px;color:#dc2626;">Gagal memuat: ' + e.message + '</td></tr>'
  }
}

var _tadData = []  // cache data untuk isi form edit

function tadOpenModal(id) {
  _tadEditId = id
  var modal   = document.getElementById('modal-tad')
  var titleEl = document.getElementById('modal-tad-title')
  var fNama   = document.getElementById('tad-field-nama')
  var fJab    = document.getElementById('tad-field-jabatan')
  var fPenem  = document.getElementById('tad-field-penempatan')
  if (!modal) return

  if (id === null) {
    // Mode tambah
    titleEl.textContent = 'Tambah TAD'
    fNama.value = ''; fJab.value = ''; fPenem.value = ''
  } else {
    // Mode edit — cari dari DOM (data sudah di TR)
    titleEl.textContent = 'Edit TAD'
    var row = document.querySelector('#tad-table-body tr[data-id="' + id + '"]')
    if (row) {
      var cells = row.querySelectorAll('td')
      fNama.value  = cells[1] ? cells[1].textContent.trim() : ''
      fJab.value   = cells[2] ? cells[2].textContent.trim() : ''
      fPenem.value = cells[3] ? cells[3].textContent.trim() : ''
    }
  }
  modal.classList.remove('hidden')
  setTimeout(function() { fNama.focus() }, 100)
}

function closeTadModal() {
  var modal = document.getElementById('modal-tad')
  if (modal) modal.classList.add('hidden')
  _tadEditId = null
}

async function tadSimpan() {
  var fNama  = document.getElementById('tad-field-nama')
  var fJab   = document.getElementById('tad-field-jabatan')
  var fPenem = document.getElementById('tad-field-penempatan')
  var nama   = fNama.value.trim()
  var jabatan    = fJab.value.trim()
  var penempatan = fPenem.value.trim()

  if (!nama)       { fNama.focus();  showToast('Nama wajib diisi', 'error'); return }
  if (!jabatan)    { fJab.focus();   showToast('Jabatan wajib diisi', 'error'); return }
  if (!penempatan) { fPenem.focus(); showToast('Penempatan wajib diisi', 'error'); return }

  var btn = document.getElementById('btn-tad-simpan')
  if (btn) { btn.disabled = true; btn.textContent = 'Menyimpan...' }

  try {
    var url    = _tadEditId === null ? '/api/tad' : '/api/tad/' + _tadEditId
    var method = _tadEditId === null ? 'POST' : 'PUT'
    var res    = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama: nama, jabatan: jabatan, penempatan: penempatan })
    })
    var json = await res.json()
    if (!json.success) throw new Error(json.error)
    showToast(_tadEditId === null ? 'TAD berhasil ditambahkan' : 'TAD berhasil diperbarui', 'success')
    closeTadModal()
    loadTadData()
  } catch(e) {
    showToast('Gagal: ' + e.message, 'error')
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Simpan' }
  }
}

async function tadHapus(id) {
  if (!confirm('Hapus data TAD ini?')) return
  try {
    var res  = await fetch('/api/tad/' + id, { method: 'DELETE' })
    var json = await res.json()
    if (!json.success) throw new Error(json.error)
    showToast('TAD berhasil dihapus', 'success')
    loadTadData()
  } catch(e) {
    showToast('Gagal menghapus: ' + e.message, 'error')
  }
}

// ===== BUDGETING =====

var _budgetingData = []
var _budgetingInited = false

function budgetingInit() {
  // Populate dropdown unit (sekali saja)
  var selUnit = document.getElementById('budgeting-sel-unit')
  if (selUnit && selUnit.options.length <= 1) {
    UNIT_DATA.forEach(function(u) {
      var opt = document.createElement('option')
      opt.value = u.kode_unit
      opt.textContent = u.nama_unit
      selUnit.appendChild(opt)
    })
  }
  // Populate dropdown tahun (5 tahun ke belakang s/d sekarang)
  var selTahun = document.getElementById('budgeting-sel-tahun')
  if (selTahun && selTahun.options.length === 0) {
    var thisYear = new Date().getFullYear()
    for (var y = thisYear; y >= thisYear - 4; y--) {
      var opt = document.createElement('option')
      opt.value = y
      opt.textContent = y
      selTahun.appendChild(opt)
    }
  }
  loadBudgetingData()
}

function loadBudgetingData() {
  // Render ulang tabel dari _budgetingData sesuai filter
  var unitFilter     = (document.getElementById('budgeting-sel-unit')     || {}).value || ''
  var tahunFilter    = (document.getElementById('budgeting-sel-tahun')    || {}).value || ''
  var katFilter      = (document.getElementById('budgeting-sel-kategori') || {}).value || ''

  var filtered = _budgetingData.filter(function(row) {
    if (unitFilter  && row.unit      !== unitFilter)  return false
    if (tahunFilter && String(row.tahun) !== String(tahunFilter)) return false
    if (katFilter   && row.kategori  !== katFilter)   return false
    return true
  })

  // Hitung summary
  var totalAnggaran  = 0, totalRealisasi = 0
  filtered.forEach(function(r) {
    totalAnggaran  += r.anggaran  || 0
    totalRealisasi += r.realisasi || 0
  })
  var totalSisa = totalAnggaran - totalRealisasi
  var pctSerapan = totalAnggaran > 0 ? Math.round((totalRealisasi / totalAnggaran) * 100) : 0

  function fmtRp(n) {
    return 'Rp ' + Math.abs(n).toLocaleString('id-ID')
  }

  var elTA  = document.getElementById('budget-total-anggaran')
  var elTR  = document.getElementById('budget-total-realisasi')
  var elTS  = document.getElementById('budget-total-sisa')
  var elPct = document.getElementById('budget-pct-serapan')
  if (elTA)  elTA.textContent  = fmtRp(totalAnggaran)
  if (elTR)  elTR.textContent  = fmtRp(totalRealisasi)
  if (elTS)  elTS.textContent  = fmtRp(totalSisa)
  if (elPct) elPct.textContent = pctSerapan + '%'

  // Render tabel
  var tbody = document.getElementById('budgeting-table-body')
  if (!tbody) return
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:40px;color:#94a3b8;font-size:0.85rem;">Belum ada data anggaran</td></tr>'
    return
  }
  tbody.innerHTML = filtered.map(function(row, i) {
    var sisa    = (row.anggaran || 0) - (row.realisasi || 0)
    var pct     = row.anggaran > 0 ? Math.round((row.realisasi / row.anggaran) * 100) : 0
    var pctColor = pct >= 90 ? '#dc2626' : pct >= 70 ? '#ca8a04' : '#16a34a'
    var katLabel = { operasional: 'Operasional', pemeliharaan: 'Pemeliharaan', investasi: 'Investasi' }[row.kategori] || row.kategori
    return '<tr style="border-bottom:1px solid #f1f5f9;">' +
      '<td style="padding:7px 10px;color:#64748b;">' + (i + 1) + '</td>' +
      '<td style="padding:7px 10px;font-weight:600;color:#1e3a5f;">' + (row.unit || '-') + '</td>' +
      '<td style="padding:7px 10px;">' +
        '<span style="background:#e0e7ff;color:#3730a3;padding:2px 7px;border-radius:4px;font-size:0.72rem;font-weight:600;">' + katLabel + '</span>' +
      '</td>' +
      '<td style="padding:7px 10px;">' + (row.uraian || '-') + '</td>' +
      '<td style="padding:7px 10px;text-align:right;">' + fmtRp(row.anggaran) + '</td>' +
      '<td style="padding:7px 10px;text-align:right;">' + fmtRp(row.realisasi) + '</td>' +
      '<td style="padding:7px 10px;text-align:right;color:' + (sisa < 0 ? '#dc2626' : '#15803d') + ';">' + fmtRp(sisa) + '</td>' +
      '<td style="padding:7px 10px;text-align:center;">' +
        '<span style="color:' + pctColor + ';font-weight:700;">' + pct + '%</span>' +
      '</td>' +
      '<td style="padding:7px 10px;text-align:center;">' +
        '<button onclick="editBudgetingRow(' + i + ')" style="background:#1e3a5f;color:#fff;border:none;border-radius:4px;padding:3px 8px;font-size:0.72rem;cursor:pointer;margin-right:4px;">Edit</button>' +
        '<button onclick="deleteBudgetingRow(' + i + ')" style="background:#dc2626;color:#fff;border:none;border-radius:4px;padding:3px 8px;font-size:0.72rem;cursor:pointer;">Hapus</button>' +
      '</td>' +
    '</tr>'
  }).join('')
}

function showBudgetingForm(editIdx) {
  var isEdit  = (editIdx !== undefined && editIdx !== null)
  var rowData = isEdit ? _budgetingData[editIdx] : {}
  var unitOpts = '<option value="">-- Pilih Unit --</option>' +
    UNIT_DATA.map(function(u) {
      return '<option value="' + u.kode_unit + '"' + (rowData.unit === u.kode_unit ? ' selected' : '') + '>' + u.nama_unit + '</option>'
    }).join('')
  var thisYear = new Date().getFullYear()
  var tahunOpts = ''
  for (var y = thisYear; y >= thisYear - 4; y--) {
    tahunOpts += '<option value="' + y + '"' + (String(rowData.tahun) === String(y) ? ' selected' : '') + '>' + y + '</option>'
  }

  var overlay = document.createElement('div')
  overlay.id  = 'budgeting-modal-overlay'
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:9000;display:flex;align-items:center;justify-content:center;'
  overlay.innerHTML =
    '<div style="background:#fff;border-radius:10px;padding:20px 24px;width:min(96vw,440px);box-shadow:0 8px 32px rgba(0,0,0,0.18);">' +
      '<div style="font-size:0.92rem;font-weight:700;color:#1e3a5f;margin-bottom:14px;">' + (isEdit ? 'Edit Anggaran' : 'Tambah Anggaran') + '</div>' +
      '<div style="display:flex;flex-direction:column;gap:10px;">' +
        '<div><label style="font-size:0.75rem;font-weight:600;color:#475569;display:block;margin-bottom:3px;">Unit</label>' +
          '<select id="bf-unit" class="toolbar-select" style="width:100%;">' + unitOpts + '</select></div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
          '<div><label style="font-size:0.75rem;font-weight:600;color:#475569;display:block;margin-bottom:3px;">Tahun</label>' +
            '<select id="bf-tahun" class="toolbar-select" style="width:100%;">' + tahunOpts + '</select></div>' +
          '<div><label style="font-size:0.75rem;font-weight:600;color:#475569;display:block;margin-bottom:3px;">Kategori</label>' +
            '<select id="bf-kategori" class="toolbar-select" style="width:100%;">' +
              '<option value="operasional"'   + (rowData.kategori === 'operasional'   ? ' selected' : '') + '>Operasional</option>' +
              '<option value="pemeliharaan"'  + (rowData.kategori === 'pemeliharaan'  ? ' selected' : '') + '>Pemeliharaan</option>' +
              '<option value="investasi"'     + (rowData.kategori === 'investasi'     ? ' selected' : '') + '>Investasi</option>' +
            '</select></div>' +
        '</div>' +
        '<div><label style="font-size:0.75rem;font-weight:600;color:#475569;display:block;margin-bottom:3px;">Uraian</label>' +
          '<input id="bf-uraian" type="text" placeholder="Deskripsi item anggaran..." value="' + (rowData.uraian || '') + '" ' +
          'style="width:100%;padding:6px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:0.82rem;box-sizing:border-box;"/></div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
          '<div><label style="font-size:0.75rem;font-weight:600;color:#475569;display:block;margin-bottom:3px;">Anggaran (Rp)</label>' +
            '<input id="bf-anggaran" type="number" min="0" value="' + (rowData.anggaran || '') + '" ' +
            'style="width:100%;padding:6px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:0.82rem;box-sizing:border-box;"/></div>' +
          '<div><label style="font-size:0.75rem;font-weight:600;color:#475569;display:block;margin-bottom:3px;">Realisasi (Rp)</label>' +
            '<input id="bf-realisasi" type="number" min="0" value="' + (rowData.realisasi || '') + '" ' +
            'style="width:100%;padding:6px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:0.82rem;box-sizing:border-box;"/></div>' +
        '</div>' +
      '</div>' +
      '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px;">' +
        '<button onclick="closeBudgetingModal()" style="background:#f1f5f9;color:#475569;border:none;border-radius:6px;padding:7px 18px;font-weight:600;font-size:0.8rem;cursor:pointer;">Batal</button>' +
        '<button onclick="saveBudgetingRow(' + (isEdit ? editIdx : 'null') + ')" style="background:#1e3a5f;color:#fff;border:none;border-radius:6px;padding:7px 18px;font-weight:700;font-size:0.8rem;cursor:pointer;">Simpan</button>' +
      '</div>' +
    '</div>'
  document.body.appendChild(overlay)
  // Tutup saat klik luar modal
  overlay.addEventListener('click', function(e) { if (e.target === overlay) closeBudgetingModal() })
}

function closeBudgetingModal() {
  var el = document.getElementById('budgeting-modal-overlay')
  if (el) el.remove()
}

function saveBudgetingRow(editIdx) {
  var unit     = (document.getElementById('bf-unit')      || {}).value || ''
  var tahun    = parseInt((document.getElementById('bf-tahun')     || {}).value) || new Date().getFullYear()
  var kategori = (document.getElementById('bf-kategori')  || {}).value || 'operasional'
  var uraian   = ((document.getElementById('bf-uraian')   || {}).value || '').trim()
  var anggaran = parseFloat((document.getElementById('bf-anggaran')  || {}).value) || 0
  var realisasi= parseFloat((document.getElementById('bf-realisasi') || {}).value) || 0

  if (!unit)   { showToast('Pilih unit terlebih dahulu', 'error'); return }
  if (!uraian) { showToast('Uraian tidak boleh kosong', 'error'); return }

  var row = { unit: unit, tahun: tahun, kategori: kategori, uraian: uraian, anggaran: anggaran, realisasi: realisasi }

  if (editIdx !== null && editIdx !== undefined && editIdx !== 'null') {
    _budgetingData[editIdx] = row
    showToast('Data anggaran berhasil diperbarui', 'success')
  } else {
    _budgetingData.push(row)
    showToast('Data anggaran berhasil ditambahkan', 'success')
  }
  closeBudgetingModal()
  loadBudgetingData()
}

function editBudgetingRow(idx) {
  showBudgetingForm(idx)
}

function deleteBudgetingRow(idx) {
  if (!confirm('Hapus data anggaran ini?')) return
  _budgetingData.splice(idx, 1)
  loadBudgetingData()
  showToast('Data anggaran dihapus', 'success')
}

// ===== END BUDGETING =====

// Inisialisasi halaman Pengaturan saat tab diklik
function pengInitPage() {
  // Populate dropdown filter ULD
  var sel = document.getElementById('peng-sel-unit')
  if (sel && sel.options.length <= 1) {
    UNIT_DATA.forEach(function(u) {
      var opt = document.createElement('option')
      opt.value = u.kode_unit
      opt.textContent = u.nama_unit
      sel.appendChild(opt)
    })
  }
  _pengUpdateAdminBtn()
  // Pastikan tampilan sub-tab sesuai state saat ini
  switchPengView(_currentPengView)
  // Jika view mesin aktif, update konten tabel
  if (_currentPengView === 'mesin') {
    var content = document.getElementById('peng-state-content')
    if (_pengIsAdmin) {
      content.style.display = 'block'
      loadPengaturanMesin(_pengCurrentFilter)
    } else {
      content.style.display = 'none'
    }
  }
}

// Login / logout admin pengaturan
function pengAdminLogin() {
  if (_pengIsAdmin) {
    // Sudah login → logout: reset semua state admin termasuk SLD
    _pengIsAdmin = false
    SLD_IS_ADMIN = false
    // Jika sedang di sub-tab SLD atau BUDGETING, paksa balik ke MESIN
    if (_currentPengView === 'sld' || _currentPengView === 'budgeting') _currentPengView = 'mesin'
    _pengUpdateAdminBtn()
    // Update tampilan mode SLD jika elemen sudah ada
    var modeLbl = document.getElementById('sld-mode-label')
    if (modeLbl) modeLbl.textContent = 'Mode: VIEW'
    var actEl = document.getElementById('sld-toolbar-actions')
    if (actEl) actEl.style.display = 'none'
    // Sembunyikan konten mesin
    var content = document.getElementById('peng-state-content')
    if (content) content.style.display = 'none'
    // Paksa tampil sub-tab MESIN (locked)
    switchPengView('mesin')
    return
  }
  var pw = prompt('Masukkan password admin:')
  if (pw === null) return
  if (pw === ADMIN_PASSWORD) {
    _pengIsAdmin = true
    // Sinkronisasi: login PENGATURAN → SLD otomatis mode EDIT
    SLD_IS_ADMIN = true
    var modeLbl = document.getElementById('sld-mode-label')
    if (modeLbl) modeLbl.textContent = 'Mode: EDIT'
    pengInitPage()
  } else {
    showToast('Password salah!', 'error')
  }
}

// Load daftar mesin ke tabel (filter opsional by kode_unit)
async function loadPengaturanMesin(kodeUnit) {
  _pengCurrentFilter = kodeUnit || ''
  showLoading(true, 'loading-indicator-peng')
  try {
    var res  = await fetch('/api/mesin-cache')
    var json = await res.json()
    if (!json.success) throw new Error(json.error || 'Gagal load data')
    _pengAllMesin = json.data || []

    var filtered = _pengCurrentFilter
      ? _pengAllMesin.filter(function(m) { return String(m.kode_unit) === String(_pengCurrentFilter) })
      : _pengAllMesin

    document.getElementById('info-peng-count').textContent =
      filtered.length + ' mesin' + (_pengCurrentFilter ? '' : ' dari ' + UNIT_DATA.length + ' ULD')

    _renderPengTable(filtered)
  } catch(e) {
    showToast('Gagal memuat data mesin: ' + e.message, 'error')
  } finally {
    showLoading(false, 'loading-indicator-peng')
  }
}

// Render tabel pengaturan mesin
function _renderPengTable(data) {
  var head = document.getElementById('peng-table-head')
  var body = document.getElementById('peng-table-body')

  head.innerHTML = '<tr style="background:#1e3a5f;color:#fff;font-size:0.78rem;">' +
    '<th style="padding:8px 2px;text-align:center;">No</th>' +
    '<th style="padding:8px 6px;text-align:center;white-space:nowrap;">ULD</th>' +
    '<th style="padding:8px 6px;text-align:center;white-space:nowrap;">Nama Mesin</th>' +
    '<th style="padding:8px 6px;text-align:center;white-space:nowrap;">Mesin</th>' +
    '<th style="padding:8px 6px;text-align:center;white-space:nowrap;">Tipe</th>' +
    '<th style="padding:8px 6px;text-align:center;white-space:nowrap;">S/N</th>' +
    '<th style="padding:8px 6px;text-align:center;white-space:nowrap;">DM (kW)</th>' +
    '<th style="padding:8px 6px;text-align:center;white-space:nowrap;">Source</th>' +
    '<th style="padding:8px 6px;text-align:center;white-space:nowrap;">Aksi</th>' +
    '</tr>'

  if (data.length === 0) {
    body.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:24px;color:#94a3b8;">Tidak ada data mesin</td></tr>'
    return
  }

  body.innerHTML = data.map(function(m, i) {
    var isManual = m.is_manual == 1
    var sourceBadge = isManual
      ? '<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:10px;font-size:0.72rem;font-weight:700;">MANUAL</span>'
      : '<span style="background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:10px;font-size:0.72rem;font-weight:700;">SHEETS</span>'
    var aksiBtn = isManual
      ? '<button onclick="_pengEditMesin(' + m.id_mesin + ')" style="background:#2563eb;color:#fff;border:none;border-radius:4px;padding:3px 10px;font-size:0.75rem;cursor:pointer;margin-right:4px;">Edit</button>' +
        '<button onclick="_pengHapusMesin(' + m.id_mesin + ')" style="background:#dc2626;color:#fff;border:none;border-radius:4px;padding:3px 10px;font-size:0.75rem;cursor:pointer;">Hapus</button>'
      : '<span style="color:#94a3b8;font-size:0.75rem;">–</span>'
    var rowBg = i % 2 === 0 ? '#fff' : '#f8fafc'
    return '<tr style="background:' + rowBg + ';font-size:0.8rem;" data-id="' + m.id_mesin + '">' +
      '<td style="padding:6px 2px;text-align:center;color:#64748b;">' + (i+1) + '</td>' +
      '<td style="padding:6px;text-align:left;white-space:nowrap;">' + (m.nama_unit || '-') + '</td>' +
      '<td style="padding:6px;text-align:left;">' + (m.nama_mesin || '-') + '</td>' +
      '<td style="padding:6px;text-align:left;white-space:nowrap;">' + (m.mesin || '-') + '</td>' +
      '<td style="padding:6px;white-space:nowrap;">' + (m.type || '-') + '</td>' +
      '<td style="padding:6px;white-space:nowrap;">' + (m.s_n || '-') + '</td>' +
      '<td style="padding:6px;text-align:center;">' + (m.terpasang !== null && m.terpasang !== undefined ? m.terpasang : '-') + '</td>' +
      '<td style="padding:6px;text-align:center;">' + sourceBadge + '</td>' +
      '<td style="padding:6px;text-align:center;white-space:nowrap;">' + aksiBtn + '</td>' +
      '</tr>'
  }).join('')
}

// Cache UP3 list dari database
var _up3List = []

// Fetch UP3 list dari database, lalu tampilkan modal
async function _pengOpenModal(mesin) {
  try {
    if (_up3List.length === 0) {
      var res  = await fetch('/api/mesin-cache/up3-list')
      var json = await res.json()
      var _up3Exclude = ['UP3 KOTABARU', 'UP3 MUARA TEWEH']
      if (json.success && json.data.length > 0) _up3List = json.data.filter(function(u) { return _up3Exclude.indexOf(u) === -1 })
    }
  } catch(e) { /* gunakan fallback jika fetch gagal */ }
  // Fallback jika database kosong / error
  if (_up3List.length === 0) _up3List = ['PLN UP3 MUARA TEWEH','PLN UP3 PANGKALAN BUN','PLN UP3 TANAH BUMBU']
  _pengShowMesinModal(mesin)
}

// Tampilkan form Tambah Mesin Baru
function showTambahMesinForm() {
  if (!_pengIsAdmin) { showToast('Harap login sebagai admin terlebih dahulu', 'error'); return }
  _pengOpenModal(null)
}

// Edit mesin manual
function _pengEditMesin(idMesin) {
  var m = _pengAllMesin.find(function(x) { return x.id_mesin == idMesin })
  if (!m) { showToast('Mesin tidak ditemukan', 'error'); return }
  if (!m.is_manual) { showToast('Hanya mesin manual yang bisa diedit', 'error'); return }
  _pengOpenModal(m)
}

// Hapus mesin manual
async function _pengHapusMesin(idMesin) {
  var m = _pengAllMesin.find(function(x) { return x.id_mesin == idMesin })
  if (!m) { showToast('Mesin tidak ditemukan', 'error'); return }
  if (!m.is_manual) { showToast('Hanya mesin manual yang bisa dihapus', 'error'); return }
  if (!confirm('Hapus mesin "' + (m.nama_mesin || m.mesin) + '"?\nTindakan ini tidak bisa dibatalkan.')) return
  try {
    var res  = await fetch('/api/mesin-cache/' + idMesin, { method: 'DELETE' })
    var json = await res.json()
    if (!json.success) throw new Error(json.error || 'Gagal hapus')
    showToast('Mesin berhasil dihapus', 'success')
    _allUnitMesin = []  // reset cache picker
    loadPengaturanMesin(_pengCurrentFilter)
  } catch(e) {
    showToast('Gagal hapus mesin: ' + e.message, 'error')
  }
}

// Modal form tambah / edit mesin
function _pengShowMesinModal(mesin) {
  // Hapus modal lama jika ada
  var old = document.getElementById('_peng-mesin-modal')
  if (old) old.remove()

  var isEdit = !!mesin
  var title  = isEdit ? 'Edit Mesin Manual' : 'Tambah Mesin Baru'

  // Hitung id_mesin default (max + 1)
  var maxId = 0
  _pengAllMesin.forEach(function(x) { if (x.id_mesin > maxId) maxId = x.id_mesin })
  var defaultId = isEdit ? mesin.id_mesin : (maxId + 1)

  // Build option UP3 dari database (via _up3List yang sudah di-fetch)
  var curUp3 = isEdit ? (mesin.up3 || '') : (_up3List[0] || '')
  var up3Options = _up3List.map(function(u) {
    return '<option value="' + u + '"' + (u === curUp3 ? ' selected' : '') + '>' + u + '</option>'
  }).join('')

  // Build option ULD
  var unitOptions = UNIT_DATA.map(function(u) {
    var sel = isEdit && mesin.kode_unit == u.kode_unit ? ' selected' : ''
    return '<option value="' + u.kode_unit + '" data-nama="' + u.nama_unit + '"' + sel + '>' + u.nama_unit + '</option>'
  }).join('')

  var modal = document.createElement('div')
  modal.id  = '_peng-mesin-modal'
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px;'
  modal.innerHTML =
    '<div style="background:#fff;border-radius:12px;width:100%;max-width:520px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);">' +
      '<div style="background:#1e3a5f;color:#fff;padding:14px 20px;border-radius:12px 12px 0 0;display:flex;justify-content:space-between;align-items:center;">' +
        '<span style="font-weight:700;font-size:0.95rem;">' + title + '</span>' +
        '<button onclick="document.getElementById(\'_peng-mesin-modal\').remove()" style="background:none;border:none;color:#fff;font-size:1.3rem;cursor:pointer;line-height:1;">&times;</button>' +
      '</div>' +
      '<div style="padding:20px;display:flex;flex-direction:column;gap:14px;">' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
          '<div>' +
            '<label style="font-size:0.78rem;color:#64748b;display:block;margin-bottom:4px;">ID Mesin *</label>' +
            '<input id="_pf-id" type="number" value="' + defaultId + '" ' + (isEdit ? 'readonly style="background:#f1f5f9;"' : '') + ' style="width:100%;border:1px solid #e2e8f0;border-radius:6px;padding:7px 10px;font-size:0.85rem;box-sizing:border-box;"/>' +
          '</div>' +
          '<div>' +
            '<label style="font-size:0.78rem;color:#64748b;display:block;margin-bottom:4px;">UP3 *</label>' +
            '<select id="_pf-up3" style="width:100%;border:1px solid #e2e8f0;border-radius:6px;padding:7px 10px;font-size:0.85rem;box-sizing:border-box;">' + up3Options + '</select>' +
          '</div>' +
        '</div>' +
        '<div>' +
          '<label style="font-size:0.78rem;color:#64748b;display:block;margin-bottom:4px;">Unit (ULD) *</label>' +
          '<select id="_pf-unit" onchange="_pengUnitChange(this)" style="width:100%;border:1px solid #e2e8f0;border-radius:6px;padding:7px 10px;font-size:0.85rem;box-sizing:border-box;">' +
            unitOptions +
          '</select>' +
        '</div>' +
        '<div>' +
          '<label style="font-size:0.78rem;color:#64748b;display:block;margin-bottom:4px;">Nama Mesin *</label>' +
          '<input id="_pf-nama-mesin" type="text" placeholder="Cth: UNIT 1" value="' + (isEdit ? (mesin.nama_mesin || '') : '') + '" style="width:100%;border:1px solid #e2e8f0;border-radius:6px;padding:7px 10px;font-size:0.85rem;box-sizing:border-box;"/>' +
        '</div>' +
        '<div>' +
          '<label style="font-size:0.78rem;color:#64748b;display:block;margin-bottom:4px;">Mesin (Merk/Model) *</label>' +
          '<input id="_pf-mesin" type="text" placeholder="Cth: PERKINS 1006A-70TAG4" value="' + (isEdit ? (mesin.mesin || '') : '') + '" style="width:100%;border:1px solid #e2e8f0;border-radius:6px;padding:7px 10px;font-size:0.85rem;box-sizing:border-box;"/>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
          '<div>' +
            '<label style="font-size:0.78rem;color:#64748b;display:block;margin-bottom:4px;">Tipe</label>' +
            '<input id="_pf-type" type="text" placeholder="Cth: Diesel" value="' + (isEdit ? (mesin.type || '') : '') + '" style="width:100%;border:1px solid #e2e8f0;border-radius:6px;padding:7px 10px;font-size:0.85rem;box-sizing:border-box;"/>' +
          '</div>' +
          '<div>' +
            '<label style="font-size:0.78rem;color:#64748b;display:block;margin-bottom:4px;">Serial Number (S/N)</label>' +
            '<input id="_pf-sn" type="text" placeholder="Cth: PE12345678" value="' + (isEdit ? (mesin.s_n || '') : '') + '" style="width:100%;border:1px solid #e2e8f0;border-radius:6px;padding:7px 10px;font-size:0.85rem;box-sizing:border-box;"/>' +
          '</div>' +
        '</div>' +
        '<div>' +
          '<label style="font-size:0.78rem;color:#64748b;display:block;margin-bottom:4px;">Daya Mampu Terpasang (kW)</label>' +
          '<input id="_pf-terpasang" type="number" placeholder="Cth: 250" value="' + (isEdit && mesin.terpasang !== null && mesin.terpasang !== undefined ? mesin.terpasang : '') + '" style="width:100%;border:1px solid #e2e8f0;border-radius:6px;padding:7px 10px;font-size:0.85rem;box-sizing:border-box;"/>' +
        '</div>' +

        '<div style="display:flex;gap:10px;justify-content:flex-end;padding-top:4px;">' +
          '<button onclick="document.getElementById(\'_peng-mesin-modal\').remove()" style="background:#f1f5f9;color:#475569;border:none;border-radius:6px;padding:9px 20px;font-weight:600;font-size:0.85rem;cursor:pointer;">Batal</button>' +
          '<button onclick="_pengSaveMesin(' + (isEdit ? mesin.id_mesin : 'null') + ')" style="background:#1e3a5f;color:#fff;border:none;border-radius:6px;padding:9px 24px;font-weight:700;font-size:0.85rem;cursor:pointer;">' + (isEdit ? 'Simpan Perubahan' : 'Tambah Mesin') + '</button>' +
        '</div>' +
      '</div>' +
    '</div>'

  document.body.appendChild(modal)
  modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove() })
}

// Handler saat ULD berubah di form (untuk update nama_unit hidden)
function _pengUnitChange(sel) {
  // Tidak perlu tindakan khusus; kita ambil data-nama saat simpan
}

// Simpan mesin (tambah atau edit)
async function _pengSaveMesin(editId) {
  var idEl    = document.getElementById('_pf-id')
  var up3El   = document.getElementById('_pf-up3')
  var unitEl  = document.getElementById('_pf-unit')
  var namaEl  = document.getElementById('_pf-nama-mesin')
  var mesinEl = document.getElementById('_pf-mesin')
  var typeEl  = document.getElementById('_pf-type')
  var snEl    = document.getElementById('_pf-sn')
  var tpEl    = document.getElementById('_pf-terpasang')

  var idMesin   = parseInt(idEl.value) || 0
  var up3       = up3El.value
  var kodeUnit  = parseInt(unitEl.value) || 0
  var namaUnit  = unitEl.options[unitEl.selectedIndex].textContent.trim()
  var namaMesin = namaEl.value.trim()
  var mesin     = mesinEl.value.trim()
  var type      = typeEl.value.trim()
  var sn        = snEl.value.trim()
  var terpasang = tpEl.value !== '' ? parseInt(tpEl.value) : null

  // Validasi
  if (!idMesin)   { showToast('ID Mesin harus diisi', 'error'); idEl.focus(); return }
  if (!kodeUnit)  { showToast('Unit harus dipilih', 'error'); unitEl.focus(); return }
  if (!namaMesin) { showToast('Nama Mesin harus diisi', 'error'); namaEl.focus(); return }
  if (!mesin)     { showToast('Mesin (Merk/Model) harus diisi', 'error'); mesinEl.focus(); return }

  var isEdit = editId !== null && editId !== undefined
  var url    = isEdit ? '/api/mesin-cache/' + editId : '/api/mesin-cache/add'
  var method = isEdit ? 'PUT' : 'POST'

  try {
    var btn = document.querySelector('#_peng-mesin-modal button[onclick*="_pengSaveMesin"]')
    if (btn) { btn.disabled = true; btn.textContent = 'Menyimpan...' }

    var body = { id_mesin: idMesin, up3: up3, kode_unit: kodeUnit, nama_unit: namaUnit,
                 mesin: mesin, type: type || null, s_n: sn || null,
                 nama_mesin: namaMesin, terpasang: terpasang }
    var res  = await fetch(url, { method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    var json = await res.json()
    if (!json.success) throw new Error(json.error || 'Gagal menyimpan')

    document.getElementById('_peng-mesin-modal').remove()
    showToast(isEdit ? 'Mesin berhasil diupdate' : 'Mesin baru berhasil ditambahkan', 'success')
    _allUnitMesin = []  // reset cache picker lintas unit
    loadPengaturanMesin(_pengCurrentFilter)
  } catch(e) {
    showToast('Gagal menyimpan: ' + e.message, 'error')
    var btn2 = document.querySelector('#_peng-mesin-modal button[onclick*="_pengSaveMesin"]')
    if (btn2) { btn2.disabled = false; btn2.textContent = isEdit ? 'Simpan Perubahan' : 'Tambah Mesin' }
  }
}
