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
  915: ["Operator"],                  // ULD SUNGAI BALI
  917: ["Operator"],                            // ULD KERASIAN
  918: ["Operator"],                     // ULD KERAYAAN
  919: ["Operator"],                   // ULD KERUMPUTAN
  920: ["Operator"],                   // ULD MARABATUAN
}

// =============================================
// CONSTANTS
// =============================================
var PARAMS = [
  { key:'daya_mampu',         label:'Daya Mampu',         unit:'kW',   type:'number' },
  { key:'beban',              label:'Beban',              unit:'kW',   type:'number' },
  { key:'stand_kwh',          label:'Stand KWH',          unit:'kWh',  type:'number' },
  { key:'stand_bbm',          label:'Stand BBM',          unit:'ltr',  type:'number' },
  { key:'phasa_r',            label:'Phasa R',            unit:'A',    type:'number' },
  { key:'phasa_s',            label:'Phasa S',            unit:'A',    type:'number' },
  { key:'phasa_t',            label:'Phasa T',            unit:'A',    type:'number' },
  { key:'tek_oli',            label:'Tek. Oli',           unit:'bar',  type:'number' },
  { key:'temp_air_pendingin', label:'Temp Air Pendingin', unit:'°C',   type:'number' },
  { key:'tegangan',           label:'Tegangan',           unit:'V',    type:'number' },
  { key:'frequency',          label:'Frequency',          unit:'Hz',   type:'number' },
  { key:'cos_phi',            label:'Cos Phi',            unit:'',     type:'number' },
  { key:'jam_kerja_mesin',    label:'Jam Kerja Mesin',    unit:'Jam',  type:'number' },
  { key:'status_mesin',       label:'Status Mesin',       unit:'',     type:'select' },
  { key:'kwh_produksi',       label:'KWH Produksi',       unit:'kWh',  type:'number' },
  { key:'pemakaian_bbm',      label:'Pemakaian BBM',      unit:'ltr',  type:'number' },
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
  var hr = String(today.getHours()).padStart(2,'0') + ':00'
  document.getElementById('sel-jam').value = hr
  // Hapus cache UP3-based lama agar tidak konflik
  try {
    Object.keys(localStorage).forEach(function(k) {
      if (k.startsWith('mm_up3') || k.startsWith('mm_unit_')) localStorage.removeItem(k)
    })
  } catch(e) {}

  // Load semua unit, lalu buka tab OPERASIONAL sebagai landing page
  loadAllUnits().then(function() {
    switchTab('laporan')
  })
})

// =============================================
// SHARED: LOAD SEMUA UNIT (tanpa filter UP3)
// =============================================
async function loadAllUnits() {
  // Tampilkan data statis dulu agar dropdown langsung tersedia
  populateUnitSelect('mon-sel-unit', UNIT_DATA)
  populateUnitSelect('lap-sel-unit', UNIT_DATA)

  // Kemudian fetch dari API untuk update data terbaru di background
  showLoading(true, 'loading-indicator-mesin')
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
    // Data statis sudah tampil, tidak perlu toast error
    console.warn('Gagal update unit dari server:', e.message)
  } finally {
    showLoading(false, 'loading-indicator-mesin')
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
    opt.textContent = u.nama_unit + ' (' + u.kode_unit + ')'
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
    var cachedMesin = lsGet('mesin_' + kodeUnit)
    if (cachedMesin && Array.isArray(cachedMesin) && cachedMesin.length > 0) {
      mesinList = cachedMesin
    } else {
      var res  = await fetch('/api/mesin-unit?kode_unit=' + kodeUnit)
      var json = await res.json()
      if (!json.success) throw new Error(json.error)
      mesinList = json.data
      lsSet('mesin_' + kodeUnit, mesinList)
    }

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
  headHTML += '<th class="th-param" style="min-width:200px;">Mesin</th>'
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

    bodyHTML += '<tr data-mesin="' + m.id_mesin + '">'
    // Kolom pertama: info mesin (sticky)
    bodyHTML += '<td style="text-align:left;">'
    bodyHTML += '<div class="th-mesin-name" style="font-size:0.78rem;color:#1e3a5f;font-weight:700;">' + m.mesin + '</div>'
    bodyHTML += '<div class="th-mesin-meta">'
    bodyHTML += '<span class="th-id">ID: ' + m.id_mesin + '</span>'
    bodyHTML += '<span class="th-sn">S/N: ' + sn + '</span>'
    bodyHTML += '</div>'
    bodyHTML += '</td>'

    // Kolom-kolom parameter
    for (var pi2 = 0; pi2 < PARAMS.length; pi2++) {
      var p2  = PARAMS[pi2]
      var val = (currentData[m.id_mesin] && currentData[m.id_mesin][p2.key] !== undefined && currentData[m.id_mesin][p2.key] !== null)
                ? currentData[m.id_mesin][p2.key] : ''
      if (p2.type === 'select') {
        bodyHTML += '<td><select class="cell-input" onchange="setCellValue(' + m.id_mesin + ',\'' + p2.key + '\',this.value)">'
        for (var si = 0; si < STATUS_OPTIONS.length; si++) {
          var sopt = STATUS_OPTIONS[si]
          var sel  = (val === sopt || (!val && sopt === 'Operasi')) ? ' selected' : ''
          bodyHTML += '<option value="' + sopt + '"' + sel + '>' + sopt + '</option>'
        }
        bodyHTML += '</select></td>'
      } else {
        bodyHTML += '<td><input type="number" step="any" class="cell-input" placeholder="—"'
        bodyHTML += ' value="' + val + '"'
        bodyHTML += ' oninput="setCellValue(' + m.id_mesin + ',\'' + p2.key + '\',this.value)"/></td>'
      }
    }
    bodyHTML += '</tr>'
  }
  tbody.innerHTML = bodyHTML
}

function setCellValue(mesinId, field, value) {
  if (!currentData[mesinId]) currentData[mesinId] = {}
  currentData[mesinId][field] = value === '' ? null : (field === 'status_mesin' ? value : parseFloat(value))
}

async function loadData() {
  var tanggal = document.getElementById('sel-tanggal').value
  var jam     = document.getElementById('sel-jam').value
  if (!tanggal) { showToast('Pilih tanggal terlebih dahulu','info'); return }
  if (!monSelectedUnit) { showToast('Pilih unit terlebih dahulu','info'); return }

  showLoading(true,'loading-indicator')
  try {
    var res  = await fetch('/api/monitoring?tanggal=' + tanggal + '&jam=' + jam + '&kode_unit=' + monSelectedUnit)
    var json = await res.json()
    if (!json.success) throw new Error(json.error)

    // Reset ke default
    for (var i = 0; i < mesinList.length; i++) {
      currentData[mesinList[i].id_mesin] = { status_mesin: 'Operasi' }
    }
    // Isi dari DB
    for (var i = 0; i < json.data.length; i++) {
      var row = json.data[i]
      currentData[row.mesin_id] = {
        daya_mampu: row.daya_mampu, beban: row.beban,
        stand_kwh: row.stand_kwh, stand_bbm: row.stand_bbm,
        phasa_r: row.phasa_r, phasa_s: row.phasa_s, phasa_t: row.phasa_t,
        tek_oli: row.tek_oli, temp_air_pendingin: row.temp_air_pendingin,
        tegangan: row.tegangan, frequency: row.frequency, cos_phi: row.cos_phi,
        jam_kerja_mesin: row.jam_kerja_mesin, status_mesin: row.status_mesin,
        kwh_produksi: row.kwh_produksi, pemakaian_bbm: row.pemakaian_bbm
      }
    }
    renderTable()
    var cnt = json.data.length
    document.getElementById('info-record').textContent = cnt > 0
      ? cnt + ' mesin sudah ada data'
      : 'Belum ada data untuk ' + tanggal + ' ' + jam
  } catch(e) { showToast('Gagal memuat data: ' + e.message,'error') }
  finally { showLoading(false,'loading-indicator') }
}

async function saveAllData() {
  var tanggal = document.getElementById('sel-tanggal').value
  var jam     = document.getElementById('sel-jam').value
  if (!tanggal || !jam) { showToast('Pilih tanggal dan jam','info'); return }
  if (mesinList.length === 0) { showToast('Pilih unit terlebih dahulu','info'); return }

  var records = []
  for (var i = 0; i < mesinList.length; i++) {
    var m = mesinList[i]
    var d = Object.assign({}, currentData[m.id_mesin] || { status_mesin: 'Operasi' })
    d.mesin_id = m.id_mesin
    records.push(d)
  }
  showLoading(true,'loading-indicator')
  try {
    var res  = await fetch('/api/monitoring/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tanggal: tanggal, jam: jam, records: records })
    })
    var json = await res.json()
    if (!json.success) throw new Error(json.error)
    showToast('Data berhasil disimpan! (' + json.saved + ' mesin)','success')
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
  try {
    var res  = await fetch('/api/monitoring/jam?tanggal=' + tanggal)
    var json = await res.json()
    if (json.success && json.data.length > 0) {
      document.getElementById('sel-jam').value = json.data[0].jam
    }
  } catch(e) {}
  await loadData()
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

  // Default oli ke "tidak menggunakan" jika belum ada nilai
  if (currentLapForm.stock_oli_sae40   === undefined || currentLapForm.stock_oli_sae40   === null) currentLapForm.stock_oli_sae40   = 'tidak menggunakan'
  if (currentLapForm.stock_oli_sx      === undefined || currentLapForm.stock_oli_sx      === null) currentLapForm.stock_oli_sx      = 'tidak menggunakan'
  if (currentLapForm.stock_oli_sx_plus === undefined || currentLapForm.stock_oli_sx_plus === null) currentLapForm.stock_oli_sx_plus = 'tidak menggunakan'

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

  // Stock Oli SAE 40
  html += '<div class="lap-field-row">'
  html += '<label class="lap-field-label">Stock Oli SAE 40</label>'
  html += '<span class="lap-field-sep">:</span>'
  html += '<input id="field-stock-oli-sae40" type="text" class="lap-field-input" placeholder="tidak menggunakan" value="' + fldOli('stock_oli_sae40') + '"/>'
  html += '<span class="lap-field-unit">ltr</span>'
  html += '</div>'

  // Stock Oli SX
  html += '<div class="lap-field-row">'
  html += '<label class="lap-field-label">Stock Oli SX</label>'
  html += '<span class="lap-field-sep">:</span>'
  html += '<input id="field-stock-oli-sx" type="text" class="lap-field-input" placeholder="tidak menggunakan" value="' + fldOli('stock_oli_sx') + '"/>'
  html += '<span class="lap-field-unit">ltr</span>'
  html += '</div>'

  // Stock Oli SX Plus
  html += '<div class="lap-field-row">'
  html += '<label class="lap-field-label">Stock Oli SX Plus</label>'
  html += '<span class="lap-field-sep">:</span>'
  html += '<input id="field-stock-oli-sx-plus" type="text" class="lap-field-input" placeholder="tidak menggunakan" value="' + fldOli('stock_oli_sx_plus') + '"/>'
  html += '<span class="lap-field-unit">ltr</span>'
  html += '</div>'

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
  html += '<div class="lap-field-row" style="flex-direction:column;align-items:flex-start;gap:4px;">'
  html += '<label class="lap-field-label" style="min-width:unset;">Upload Dokumen <span style="font-size:0.72rem;color:#94a3b8;">(foto/pdf, maks 10MB)</span></label>'
  html += '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">'
  html += '<input id="field-dokumen" type="file" accept="image/*,.pdf" class="lap-field-input" style="padding:4px;cursor:pointer;flex:1;min-width:200px;"/>'
  html += '<button type="button" id="btn-gdr-login" onclick="gdrForceLogin()" style="font-size:0.75rem;padding:4px 10px;background:#4285f4;color:#fff;border:none;border-radius:5px;cursor:pointer;white-space:nowrap;"><i class="fab fa-google"></i> <span id="gdr-login-label">Login Google</span></button>'
  html += '</div>'
  html += docPreview
  html += '<div id="doc-progress-wrap" style="display:none;margin-top:4px;"><div style="background:#e2e8f0;border-radius:4px;height:8px;overflow:hidden;"><div id="doc-progress-bar" style="height:100%;background:#22c55e;width:0%;transition:width 0.3s;"></div></div><span id="doc-progress-pct" style="font-size:0.72rem;color:#475569;">0%</span></div>'
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
  function attachOliField(id, fieldKey) {
    var el = document.getElementById(id)
    if (!el) return
    el.addEventListener('focus', function() {
      if (this.value === 'tidak menggunakan') this.value = ''
      this.style.borderColor = ''
    })
    el.addEventListener('blur', function() {
      var val = this.value.trim()
      // Kosong → default ke "tidak menggunakan"
      if (val === '') val = 'tidak menggunakan'
      // Bukan angka dan bukan "tidak menggunakan" → paksa ke "tidak menggunakan"
      if (val !== 'tidak menggunakan' && !/^[0-9]+$/.test(val)) val = 'tidak menggunakan'
      this.value = val
      this.style.borderColor = ''
      setLapField(fieldKey, val)
    })
    el.addEventListener('input', function() {
      // Saat mengetik: hanya izinkan angka atau teks "tidak menggunakan" sebagian
      var val = this.value
      // Jika ada huruf selain awalan "tidak menggunakan", batasi ke angka saja
      // (validasi penuh dilakukan di blur)
      setLapField(fieldKey, val)
    })
    el.addEventListener('change', function() {
      setLapField(fieldKey, this.value)
    })
  }

  attachOliField('field-stock-oli-sae40',   'stock_oli_sae40')
  attachOliField('field-stock-oli-sx',      'stock_oli_sx')
  attachOliField('field-stock-oli-sx-plus', 'stock_oli_sx_plus')

  // ── Google Drive OAuth Implicit Upload ──
  var GDRIVE_CLIENT_ID = '96593301579-4knd8i9odmnrgkm411vbeo7rs8hp5iji.apps.googleusercontent.com'
  var GDRIVE_FOLDER_ID = '1lTLoelRorRd9vxN1xZsV1kgJ1bEE5Utx'
  // scope 'drive' = full access (bisa tulis ke folder manapun yang dimiliki user)
  var GDRIVE_SCOPE     = 'https://www.googleapis.com/auth/drive'
  var LS_TOKEN_KEY     = 'gdrive_access_token'
  var LS_TOKEN_EXP     = 'gdrive_token_exp'
  var LS_SCOPE_VER     = 'gdrive_scope_ver'
  var SCOPE_VER        = '2' // increment this when scope changes to force re-auth

  function gdrGetToken() {
    // Force re-auth jika scope berubah (version mismatch)
    if (localStorage.getItem(LS_SCOPE_VER) !== SCOPE_VER) {
      localStorage.removeItem(LS_TOKEN_KEY); localStorage.removeItem(LS_TOKEN_EXP)
      localStorage.setItem(LS_SCOPE_VER, SCOPE_VER)
      return null
    }
    var exp = parseInt(localStorage.getItem(LS_TOKEN_EXP) || '0')
    if (Date.now() < exp - 60000) return localStorage.getItem(LS_TOKEN_KEY)
    localStorage.removeItem(LS_TOKEN_KEY); localStorage.removeItem(LS_TOKEN_EXP)
    return null
  }
  function gdrSetToken(tok, expiresIn) {
    localStorage.setItem(LS_TOKEN_KEY, tok)
    localStorage.setItem(LS_TOKEN_EXP, String(Date.now() + expiresIn * 1000))
    localStorage.setItem(LS_SCOPE_VER, SCOPE_VER)
  }
  function gdrClearToken() {
    localStorage.removeItem(LS_TOKEN_KEY); localStorage.removeItem(LS_TOKEN_EXP)
    localStorage.removeItem(LS_SCOPE_VER)
  }

  // Update button tampilan
  function gdrUpdateBtn() {
    var lbl = document.getElementById('gdr-login-label')
    var btn = document.getElementById('btn-gdr-login')
    if (!lbl || !btn) return
    if (gdrGetToken()) {
      lbl.textContent = '✓ Google Terhubung'
      btn.style.background = '#16a34a'
    } else {
      lbl.textContent = 'Login Google'
      btn.style.background = '#4285f4'
    }
  }

  // Fungsi login Google — dipanggil dari tombol
  window.gdrForceLogin = function() {
    gdrClearToken() // paksa login ulang agar scope baru diterapkan
    var authUrl = 'https://accounts.google.com/o/oauth2/v2/auth' +
      '?client_id=' + GDRIVE_CLIENT_ID +
      '&redirect_uri=' + encodeURIComponent(window.location.origin) +
      '&response_type=token' +
      '&scope=' + encodeURIComponent(GDRIVE_SCOPE) +
      '&prompt=consent' +
      '&access_type=online'
    var popup = window.open(authUrl, 'gdrive_auth', 'width=500,height=600,left=200,top=100')
    if (!popup) { showToast('Izinkan popup browser untuk login Google Drive', 'error'); return }
    var timer = setInterval(function() {
      try {
        if (!popup || popup.closed) { clearInterval(timer); gdrUpdateBtn(); return }
        var hash = popup.location.hash
        if (hash && hash.indexOf('access_token') !== -1) {
          clearInterval(timer); popup.close()
          var params = {}
          hash.replace(/^#/,'').split('&').forEach(function(p){
            var kv = p.split('='); params[kv[0]] = decodeURIComponent(kv[1]||'')
          })
          if (params.access_token) {
            gdrSetToken(params.access_token, parseInt(params.expires_in||'3600'))
            gdrUpdateBtn()
            showToast('Google Drive terhubung ✓', 'success')
          }
        }
      } catch(e) { /* cross-origin, tunggu redirect */ }
    }, 300)
  }

  function gdrDoAuth(callback) {
    var tok = gdrGetToken()
    if (tok) { callback(tok); return }
    // Auto-buka login popup
    var authUrl = 'https://accounts.google.com/o/oauth2/v2/auth' +
      '?client_id=' + GDRIVE_CLIENT_ID +
      '&redirect_uri=' + encodeURIComponent(window.location.origin) +
      '&response_type=token' +
      '&scope=' + encodeURIComponent(GDRIVE_SCOPE) +
      '&prompt=consent' +
      '&access_type=online'
    var popup = window.open(authUrl, 'gdrive_auth', 'width=500,height=600,left=200,top=100')
    if (!popup) { showToast('Izinkan popup browser untuk login Google Drive', 'error'); return }
    var timer = setInterval(function() {
      try {
        if (!popup || popup.closed) { clearInterval(timer); return }
        var hash = popup.location.hash
        if (hash && hash.indexOf('access_token') !== -1) {
          clearInterval(timer); popup.close()
          var params = {}
          hash.replace(/^#/,'').split('&').forEach(function(p){
            var kv = p.split('='); params[kv[0]] = decodeURIComponent(kv[1]||'')
          })
          if (params.access_token) {
            gdrSetToken(params.access_token, parseInt(params.expires_in||'3600'))
            gdrUpdateBtn()
            callback(params.access_token)
          }
        }
      } catch(e) { /* cross-origin */ }
    }, 300)
  }

  function gdrUpload(token, file, statusEl) {
    var tanggal = document.getElementById('lap-tanggal').value
    var fname   = lapSelectedUnit + '_' + tanggal + '_' + file.name
    // Show progress bar
    var pwrap = document.getElementById('doc-progress-wrap')
    var pbar  = document.getElementById('doc-progress-bar')
    var ppct  = document.getElementById('doc-progress-pct')
    if (pwrap) pwrap.style.display = 'block'
    if (pbar)  pbar.style.width = '0%'
    if (ppct)  ppct.textContent = '0%'
    statusEl.textContent = 'Mempersiapkan file...'

    var reader = new FileReader()
    reader.onload = function(ev) {
      var b64      = ev.target.result.split(',')[1]
      var boundary = 'PLTD_UPLOAD_' + Date.now()
      var metadata = JSON.stringify({ name: fname, parents: [GDRIVE_FOLDER_ID] })
      var body     = '--' + boundary + '\r\n' +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        metadata + '\r\n' +
        '--' + boundary + '\r\n' +
        'Content-Type: ' + (file.type || 'application/octet-stream') + '\r\n' +
        'Content-Transfer-Encoding: base64\r\n\r\n' +
        b64 + '\r\n' +
        '--' + boundary + '--'

      var xhr = new XMLHttpRequest()
      xhr.open('POST', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name', true)
      xhr.setRequestHeader('Authorization', 'Bearer ' + token)
      xhr.setRequestHeader('Content-Type', 'multipart/related; boundary=' + boundary)

      xhr.upload.onprogress = function(e) {
        if (e.lengthComputable) {
          var pct = Math.round(e.loaded / e.total * 90) // cap at 90% until done
          if (pbar) pbar.style.width = pct + '%'
          if (ppct) ppct.textContent = pct + '%'
        }
      }

      xhr.onload = function() {
        if (pbar) pbar.style.width = '100%'
        if (ppct) ppct.textContent = '100%'
        var j
        try { j = JSON.parse(xhr.responseText) } catch(e) { j = {} }
        if (!j.id) {
          if (pwrap) pwrap.style.display = 'none'
          if (j.error && j.error.code === 401) {
            gdrClearToken(); gdrUpdateBtn()
            statusEl.textContent = '⚠ Sesi Google habis, klik Login Google lalu pilih file lagi'
          } else {
            var errDetail = j.error ? (j.error.code + ' - ' + JSON.stringify(j.error)) : xhr.responseText
            statusEl.textContent = '⚠ Upload gagal: ' + errDetail
          }
          return
        }
        var fileId  = j.id
        var fileUrl = 'https://drive.google.com/file/d/' + fileId + '/view'
        // Set permission publik (fire & forget)
        fetch('https://www.googleapis.com/drive/v3/files/' + fileId + '/permissions', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'reader', type: 'anyone' })
        }).catch(function(){})
        // Catat ke Sheets via Worker (fire & forget)
        fetch('/api/upload-drive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileId: fileId, fileName: fname, fileUrl: fileUrl,
            kode_unit: lapSelectedKode, tanggal: tanggal, nama_unit: lapSelectedUnit,
            sheetsOnly: true
          })
        }).catch(function(){})
        currentLapForm.dokumen_url  = fileUrl
        currentLapForm.dokumen_nama = file.name
        // Preview
        var wrap = document.getElementById('doc-preview-wrap')
        if (!wrap) {
          wrap = document.createElement('div'); wrap.id = 'doc-preview-wrap'; wrap.style.marginTop = '6px'
          statusEl.parentNode.insertBefore(wrap, statusEl)
        }
        if (file.type.startsWith('image/')) {
          wrap.innerHTML = '<img src="' + fileUrl + '" style="max-width:100%;max-height:180px;border-radius:6px;border:1px solid #e2e8f0;" alt="dokumen"/>'
        } else {
          wrap.innerHTML = '<a href="' + fileUrl + '" target="_blank" rel="noopener" style="color:#1d4ed8;font-size:0.82rem;"><i class="fas fa-file-pdf"></i> ' + file.name + '</a>'
        }
        statusEl.textContent = '✓ ' + file.name + ' berhasil diupload ke Google Drive'
      }
      xhr.onerror = function() {
        if (pwrap) pwrap.style.display = 'none'
        statusEl.textContent = '⚠ Gagal koneksi ke Google Drive'
      }
      xhr.send(body)
      statusEl.textContent = 'Mengupload ke Google Drive...'
    }
    reader.readAsDataURL(file)
  }

  // Init button state saat form render
  gdrUpdateBtn()

  var elFile = document.getElementById('field-dokumen')
  if (elFile) {
    elFile.addEventListener('change', function() {
      var file = this.files[0]
      if (!file) return
      if (file.size > 10 * 1024 * 1024) {
        document.getElementById('doc-upload-status').textContent = '⚠ File terlalu besar (maks 10MB)'
        this.value = ''; return
      }
      var statusEl = document.getElementById('doc-upload-status')
      statusEl.textContent = 'Menghubungkan ke Google...'
      gdrDoAuth(function(token) { gdrUpload(token, file, statusEl) })
    })
  }

  // Recalculate after render so Pemakaian BBM always reflects current values
  setTimeout(calcEstimasiBbm, 0)
}

var OLI_FIELDS = ['stock_oli_sae40', 'stock_oli_sx', 'stock_oli_sx_plus']

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
      // Belum ada data → tampilkan form dengan auto-fill saldo awal
      currentLapForm = {}
      currentLapForm.stock_oli_sae40   = 'tidak menggunakan'
      currentLapForm.stock_oli_sx      = 'tidak menggunakan'
      currentLapForm.stock_oli_sx_plus = 'tidak menggunakan'
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
  if (!validOli(d.stock_oli_sae40))   { errors.push('Stock Oli SAE 40');  highlightError('field-stock-oli-sae40') }
  if (!validOli(d.stock_oli_sx))      { errors.push('Stock Oli SX');       highlightError('field-stock-oli-sx') }
  if (!validOli(d.stock_oli_sx_plus)) { errors.push('Stock Oli SX Plus');  highlightError('field-stock-oli-sx-plus') }
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
    window.open('https://wa.me/6285388709607?text=' + encodeURIComponent(currentTeksLaporan), '_blank')
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
    'Penerimaan BBM : ' + fmtNumPlain(d.penerimaan_bbm) + '\n' +
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
  // Tampilkan dokumen jika ada (dari Google Drive URL)
  if (d.dokumen_url) {
    var isImg = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(d.dokumen_nama||'')
    html += '<div class="review-divider"></div>'
    html += '<div style="padding:12px 20px;">'
    html += '<div style="font-size:0.75rem;font-weight:600;color:#64748b;margin-bottom:8px;">DOKUMEN</div>'
    if (isImg) {
      html += '<img src="' + d.dokumen_url + '" style="max-width:100%;max-height:260px;border-radius:8px;border:1px solid #e2e8f0;" alt="dokumen"/>'
    } else {
      html += '<a href="' + d.dokumen_url + '" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px;color:#1d4ed8;font-size:0.85rem;text-decoration:none;padding:8px 12px;border:1px solid #bfdbfe;border-radius:6px;background:#eff6ff;">'
      html += '<i class="fas fa-file-pdf"></i>' + (d.dokumen_nama||'dokumen') + '</a>'
    }
    html += '</div>'
  }
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

function kirimWhatsApp() {
  var teks = document.getElementById('kirim-preview-text').textContent
  window.open('https://wa.me/6285388709607?text=' + encodeURIComponent(teks), '_blank')
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
  var cols = ['NO','ULD','JALUR','KAPASITAS TANGKI','STOK AWAL BULAN','STOCK AWAL',
              'STOCK MATI','STOCK BERSIH','RATA-RATA PEMAKAIAN HARIAN',
              'DAYA TAMPUNG STORAGE','BBM SIAP KIRIM','SAFETY STOCK',
              'ESTIMASI BBM HABIS','KONDISI STOCK']
  var headHTML = '<tr>'
  for (var i = 0; i < cols.length; i++) {
    var stickyStyle = i < 2 ? 'position:sticky;left:' + (i===0?'0':'24px') + ';z-index:2;' : ''
    var thExtra = i === 0 ? 'width:24px;min-width:24px;max-width:24px;padding:8px 4px;border-right:1px solid rgba(255,255,255,0.2);' : 'padding:8px 10px;'
    var thAlign = i === 1 ? 'text-align:left;' : i === 2 ? 'text-align:left;' : 'text-align:center;'
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
      if (d.kondisi_stock === 'KRITIS')       kondisiColor = '#dc2626'
      else if (d.kondisi_stock === 'MENIPIS') kondisiColor = '#d97706'
      else if (d.kondisi_stock === 'AMAN')    kondisiColor = '#16a34a'
      else if (d.kondisi_stock === 'CUKUP')   kondisiColor = '#2563eb'

      var bgRow = r % 2 === 0 ? '#fff' : '#f8fafc'
      bodyHTML += '<tr style="background:' + bgRow + ';border-bottom:1px solid #e2e8f0;">'
      bodyHTML += '<td style="width:24px;min-width:24px;max-width:24px;padding:4px;text-align:center;font-size:0.7rem;position:sticky;left:0;background:' + bgRow + ';z-index:1;border-right:1px solid #e2e8f0;">' + d.no + '</td>'
      bodyHTML += '<td style="padding:7px 10px;white-space:nowrap;font-size:0.78rem;font-weight:600;color:#1e3a5f;text-align:left;position:sticky;left:24px;background:' + bgRow + ';z-index:1;">' + d.nama_unit + '</td>'
      bodyHTML += '<td style="padding:7px 10px;text-align:left;font-size:0.78rem;min-width:198px;white-space:nowrap;">' + (d.jalur || '—') + '</td>'
      bodyHTML += '<td style="padding:7px 10px;text-align:right;font-size:0.78rem;">' + fmtData(d.kapasitas_tangki) + '</td>'
      bodyHTML += '<td style="padding:7px 10px;text-align:right;font-size:0.78rem;">' + fmtData(d.stok_awal_bulan) + '</td>'
      bodyHTML += '<td style="padding:7px 10px;text-align:right;font-size:0.78rem;">' + fmtData(d.stok_awal) + '</td>'
      bodyHTML += '<td style="padding:7px 10px;text-align:right;font-size:0.78rem;">' + fmtData(d.stock_mati) + '</td>'
      bodyHTML += '<td style="padding:7px 10px;text-align:right;font-size:0.78rem;font-weight:600;">' + fmtData(d.stock_bersih) + '</td>'
      bodyHTML += '<td style="padding:7px 10px;text-align:right;font-size:0.78rem;">' + fmtData(d.rata_rata_harian) + '</td>'
      bodyHTML += '<td style="padding:7px 10px;text-align:right;font-size:0.78rem;">' + fmtData(d.daya_tampung_storage) + '</td>'
      bodyHTML += '<td style="padding:7px 10px;text-align:right;font-size:0.78rem;font-weight:600;">' + fmtData(d.bbm_siap_kirim) + '</td>'
      bodyHTML += '<td style="padding:7px 10px;text-align:right;font-size:0.78rem;">' + fmtData(d.safety_stock) + '</td>'
      bodyHTML += '<td style="padding:7px 10px;text-align:center;font-size:0.78rem;">' + (d.estimasi_bbm_habis || '—') + '</td>'
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
