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
  document.getElementById('sel-tanggal').value  = todayStr
  document.getElementById('lap-tanggal').value  = todayStr
  var hr = String(today.getHours()).padStart(2,'0') + ':00'
  document.getElementById('sel-jam').value = hr
  // Hapus cache UP3-based lama agar tidak konflik
  try {
    Object.keys(localStorage).forEach(function(k) {
      if (k.startsWith('mm_up3') || k.startsWith('mm_unit_')) localStorage.removeItem(k)
    })
  } catch(e) {}

  // Load semua unit untuk kedua tab
  loadAllUnits()
})

// =============================================
// SHARED: LOAD SEMUA UNIT (tanpa filter UP3)
// =============================================
async function loadAllUnits() {
  showLoading(true, 'loading-indicator-mesin')
  try {
    // Selalu fetch dari server — tidak pakai cache untuk memastikan data terbaru
    var res  = await fetch('/api/unit')
    if (!res.ok) throw new Error('HTTP ' + res.status)
    var json = await res.json()
    if (!json.success) throw new Error(json.error || 'Gagal memuat unit')
    var units = json.data || []
    if (units.length === 0) throw new Error('Data unit kosong')
    lsSet('all_units', units)
    populateUnitSelect('mon-sel-unit', units)
    populateUnitSelect('lap-sel-unit', units)
  } catch(e) {
    showToast('Gagal memuat unit: ' + e.message, 'error')
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
  document.getElementById('tab-monitoring').classList.toggle('active', tab === 'monitoring')
  document.getElementById('tab-laporan').classList.toggle('active', tab === 'laporan')
  document.getElementById('tab-btn-monitoring').classList.toggle('active', tab === 'monitoring')
  document.getElementById('tab-btn-laporan').classList.toggle('active', tab === 'laporan')
  document.getElementById('toolbar-monitoring').classList.toggle('hidden', tab !== 'monitoring')
  document.getElementById('toolbar-laporan').classList.toggle('hidden', tab !== 'laporan')
  // header-actions: pakai display langsung (bukan Tailwind hidden)
  document.getElementById('header-actions-monitoring').style.display = (tab === 'monitoring') ? 'flex' : 'none'
  document.getElementById('header-actions-laporan').style.display   = (tab === 'laporan')    ? 'flex' : 'none'

  if (tab === 'laporan') {
    if (!lapSelectedKode) showLapState('empty')
  } else {
  }
}

// =============================================
// ===== OPERASIONAL =====
// =============================================



// Unit berubah untuk laporan
function onLapUnitChange(kode) {
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
  // Ambil nama_unit dari teks option (format: "nama_unit (kode)")
  var namaUnit = optText.replace(/\s*\(\d+\)\s*$/, '').trim()
  lapSelectedUnit = { kode_unit: lapSelectedKode, nama_unit: namaUnit }

  currentLapForm = lapData[lapSelectedKode] ? JSON.parse(JSON.stringify(lapData[lapSelectedKode])) : {}
  lastSavedData  = {}
  renderLapForm()
  setBtnLapEnabled(true)
  showLapState('form')
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
}

function renderLapForm() {
  if (!lapSelectedKode || !lapSelectedUnit) return
  var unit = lapSelectedUnit
  var tgl  = document.getElementById('lap-tanggal').value || '—'
  var d    = currentLapForm
  var alreadySaved  = !!lapData[lapSelectedKode]
  var kodeFormatted = String(unit.kode_unit).padStart(4, '0')
  var tglDisplay    = tgl
  if (tgl && tgl !== '—') {
    var parts = tgl.split('-')
    tglDisplay = parts[2] + '/' + parts[1] + '/' + parts[0]
  }

  var html = '<div class="lap-single-card">'
  html += '<div class="lap-single-header"><div>'
  html += '<div class="lap-single-title">' + unit.nama_unit + '</div>'
  html += '</div><div style="display:flex;gap:8px;align-items:center;">'
  if (alreadySaved) html += '<span class="badge-saved"><i class="fas fa-check-circle"></i> Data Tersimpan</span>'
  html += '<span class="lap-kode-badge">ID: ' + kodeFormatted + '</span>'
  html += '</div></div>'
  html += '<div class="lap-single-infobar">'
  html += '<div class="info-item"><span class="info-label">UNIT</span><span class="info-val">' + unit.nama_unit + '</span></div>'
  html += '<div class="info-item"><span class="info-label">ID UNIT</span><span class="info-val">' + kodeFormatted + '</span></div>'
  html += '<div class="info-item"><span class="info-label">TANGGAL</span><span class="info-val">' + tglDisplay + '</span></div>'
  html += '</div>'
  html += '<div class="lap-single-body">'

  // Nama Operator
  html += '<div class="form-group full"><label class="form-label"><i class="fas fa-user-tie"></i> Nama Operator <span class="wajib">*</span></label>'
  html += '<input id="field-nama-operator" type="text" class="form-input" placeholder="Masukkan nama operator..." value="' + (d.nama_operator || '') + '" oninput="setLapField(\'nama_operator\', this.value)"/></div>'

  // Saldo Awal + kWh Produksi (sejajar)
  html += '<div class="form-row">'
  html += '<div class="form-group"><label class="form-label"><i class="fas fa-gas-pump" style="color:#d97706"></i> Saldo Awal <span class="wajib">*</span></label>'
  html += '<div class="input-unit-wrap"><input id="field-saldo-awal" type="number" step="any" class="form-input" placeholder="0" value="' + (d.saldo_awal !== undefined && d.saldo_awal !== null ? d.saldo_awal : '') + '" oninput="setLapField(\'saldo_awal\', this.value)"/><span class="input-unit-label">ltr</span></div></div>'
  html += '<div class="form-group"><label class="form-label"><i class="fas fa-bolt" style="color:#f59e0b"></i> kWh Produksi <span class="wajib">*</span></label>'
  html += '<div class="input-unit-wrap"><input id="field-kwh-produksi" type="number" step="any" class="form-input" placeholder="0" value="' + (d.kwh_produksi !== undefined && d.kwh_produksi !== null ? d.kwh_produksi : '') + '" oninput="setLapField(\'kwh_produksi\', this.value)"/><span class="input-unit-label">kWh</span></div></div>'
  html += '</div>'

  // Saldo Akhir + Penerimaan BBM (sejajar)
  html += '<div class="form-row">'
  html += '<div class="form-group"><label class="form-label"><i class="fas fa-gas-pump" style="color:#16a34a"></i> Saldo Akhir <span class="wajib">*</span></label>'
  html += '<div class="input-unit-wrap"><input id="field-saldo-akhir" type="number" step="any" class="form-input" placeholder="0" value="' + (d.saldo_akhir !== undefined && d.saldo_akhir !== null ? d.saldo_akhir : '') + '" oninput="setLapField(\'saldo_akhir\', this.value)"/><span class="input-unit-label">ltr</span></div></div>'
  html += '<div class="form-group"><label class="form-label"><i class="fas fa-truck-ramp-box" style="color:#2563eb"></i> Penerimaan BBM <span class="opsional">(opsional)</span></label>'
  html += '<div class="input-unit-wrap"><input id="field-penerimaan-bbm" type="number" step="any" class="form-input" placeholder="0" value="' + (d.penerimaan_bbm !== undefined && d.penerimaan_bbm !== null ? d.penerimaan_bbm : '') + '" oninput="setLapField(\'penerimaan_bbm\', this.value)"/><span class="input-unit-label">ltr</span></div></div>'
  html += '</div>'

  // Estimasi BBM Maks (full width)
  html += '<div class="form-group full"><label class="form-label"><i class="fas fa-calculator" style="color:#dc2626"></i> Estimasi Pemakaian BBM Maksimal <span class="wajib">*</span></label>'
  html += '<div class="input-unit-wrap"><input id="field-estimasi-bbm" type="number" step="any" class="form-input" placeholder="0" value="' + (d.estimasi_bbm_max !== undefined && d.estimasi_bbm_max !== null ? d.estimasi_bbm_max : '') + '" oninput="setLapField(\'estimasi_bbm_max\', this.value)"/><span class="input-unit-label">ltr</span></div></div>'

  html += '</div>'
  html += '<div class="lap-single-footer"><span class="text-xs text-slate-400" id="lap-save-status"></span>'
  html += '<button class="btn btn-success" onclick="saveLapCurrent()"><i class="fas fa-save"></i> Simpan Data</button></div>'
  html += '</div>'

  document.getElementById('lap-form-container').innerHTML = html
}

function setLapField(field, value) {
  if (field === 'nama_operator') currentLapForm[field] = value
  else currentLapForm[field] = value === '' ? null : parseFloat(value)
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
        estimasi_bbm_max: row.estimasi_bbm_max
      }
    }
    var cnt = json.data.length
    document.getElementById('info-lap-record').textContent = cnt > 0 ? cnt + ' unit sudah ada data' : 'Belum ada data untuk ' + tanggal
    if (lapSelectedKode) {
      currentLapForm = lapData[lapSelectedKode] ? JSON.parse(JSON.stringify(lapData[lapSelectedKode])) : {}
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
  if (d.estimasi_bbm_max === null || d.estimasi_bbm_max === undefined || d.estimasi_bbm_max === '') { errors.push('Estimasi Pemakaian BBM Maksimal'); highlightError('field-estimasi-bbm') }
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
    estimasi_bbm_max: d.estimasi_bbm_max !== undefined ? d.estimasi_bbm_max : null
  }

  try {
    var res  = await fetch('/api/lap-operasional', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
    var json = await res.json()
    if (!json.success) throw new Error(json.error)
    lapData[lapSelectedKode] = JSON.parse(JSON.stringify(currentLapForm))
    lastSavedData = JSON.parse(JSON.stringify(currentLapForm))
    showToast(unit.nama_unit + ' berhasil disimpan!','success')
    renderReview(unit, tanggal, d)
    showLapState('review')
  } catch(e) {
    showToast('Gagal menyimpan: ' + e.message,'error')
    if (btnSave) { btnSave.disabled = false; btnSave.innerHTML = '<i class="fas fa-save"></i> Simpan Data' }
    if (footerBtn) { footerBtn.disabled = false; footerBtn.innerHTML = '<i class="fas fa-save"></i> Simpan Data' }
  }
}

function renderReview(unit, tanggal, d) {
  var tglParts      = tanggal.split('-')
  var tglFormatted  = tglParts[2] + '/' + tglParts[1] + '/' + tglParts[0]
  var kodeFormatted = String(unit.kode_unit).padStart(4,'0')

  function fmtNum(val) {
    if (val === null || val === undefined || val === '') return '-'
    return Number(val).toLocaleString('id-ID')
  }
  function fmtStr(val) { return (!val || val.trim() === '') ? '-' : val }

  var savedAt = new Date().toLocaleString('id-ID', { dateStyle:'long', timeStyle:'short' })
  var teksLaporan =
    'LAPORAN OPERASIONAL PLTD\n' + unit.nama_unit + '\n' +
    'ID Unit  : ' + kodeFormatted + '\n' +
    'Tgl      : ' + tglFormatted + '\n\n' +
    'Nama Operator          : ' + fmtStr(d.nama_operator) + '\n' +
    'kWh Produksi           : ' + fmtNum(d.kwh_produksi) + ' kWh\n' +
    'Saldo Awal             : ' + fmtNum(d.saldo_awal) + ' ltr\n' +
    'Saldo Akhir            : ' + fmtNum(d.saldo_akhir) + ' ltr\n' +
    'Penerimaan BBM         : ' + fmtNum(d.penerimaan_bbm) + ' ltr\n' +
    'Estimasi Pemakaian BBM : ' + fmtNum(d.estimasi_bbm_max) + ' ltr'

  var html = '<div class="review-wrap">'
  html += '<div class="review-kop"><div class="review-kop-left"><div class="review-kop-icon"><i class="fas fa-file-invoice"></i></div>'
  html += '<div><div class="review-kop-title">LAPORAN OPERASIONAL PLTD</div><div class="review-kop-sub">Dokumen Operasional Harian</div></div></div>'
  html += '<div class="review-kop-stamp"><i class="fas fa-check-circle"></i><br/>TERSIMPAN</div></div>'
  html += '<div class="review-divider"></div>'
  html += '<div class="review-identity"><div class="review-unit-name">' + unit.nama_unit + '</div>'
  html += '<table class="review-id-table">'
  html += '<tr><td class="rid-label">ID Unit</td><td class="rid-sep">:</td><td class="rid-val">' + kodeFormatted + '</td></tr>'
  html += '<tr><td class="rid-label">Tgl</td><td class="rid-sep">:</td><td class="rid-val">' + tglFormatted + '</td></tr>'
  html += '<tr><td class="rid-label">Nama Operator</td><td class="rid-sep">:</td><td class="rid-val">' + fmtStr(d.nama_operator) + '</td></tr>'
  html += '</table></div>'
  html += '<div class="review-divider"></div>'
  html += '<div class="review-data-section"><div class="review-section-label"><i class="fas fa-table-list"></i> Data Operasional</div>'
  html += '<table class="review-data-table">'
  html += '<tr><td class="rdt-label">kWh Produksi</td><td class="rdt-sep">:</td><td class="rdt-val"><strong>' + fmtNum(d.kwh_produksi) + '</strong> <span class="rdt-unit">kWh</span></td></tr>'
  html += '<tr><td class="rdt-label">Saldo Awal</td><td class="rdt-sep">:</td><td class="rdt-val"><strong>' + fmtNum(d.saldo_awal) + '</strong> <span class="rdt-unit">ltr</span></td></tr>'
  html += '<tr><td class="rdt-label">Saldo Akhir</td><td class="rdt-sep">:</td><td class="rdt-val"><strong>' + fmtNum(d.saldo_akhir) + '</strong> <span class="rdt-unit">ltr</span></td></tr>'
  html += '<tr><td class="rdt-label">Penerimaan BBM</td><td class="rdt-sep">:</td><td class="rdt-val"><strong>' + fmtNum(d.penerimaan_bbm) + '</strong> <span class="rdt-unit">ltr</span></td></tr>'
  html += '<tr class="rdt-last"><td class="rdt-label">Estimasi Pemakaian BBM Maks</td><td class="rdt-sep">:</td><td class="rdt-val"><strong>' + fmtNum(d.estimasi_bbm_max) + '</strong> <span class="rdt-unit">ltr</span></td></tr>'
  html += '</table></div>'
  html += '<div class="review-divider"></div>'
  html += '<div class="review-footer"><div class="review-save-info"><i class="fas fa-clock"></i> Disimpan: ' + savedAt + '</div>'
  html += '<div class="review-actions">'
  html += '<button class="btn btn-outline-dark" onclick="backToForm()"><i class="fas fa-pen"></i> Edit</button>'
  html += '<button class="btn btn-kirim" onclick="kirimLaporan(\'' + encodeURIComponent(teksLaporan) + '\')"><i class="fas fa-paper-plane"></i> Kirim</button>'
  html += '</div></div></div>'

  document.getElementById('lap-review-container').innerHTML = html
}

function backToForm() { showLapState('form'); renderLapForm() }

function kirimLaporan(encodedTeks) {
  var teks = decodeURIComponent(encodedTeks)
  document.getElementById('kirim-preview-text').textContent = teks
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
  window.open('https://wa.me/?text=' + encodeURIComponent(teks), '_blank')
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
  var modals = document.querySelectorAll('.modal-overlay')
  modals.forEach(function(modal) {
    if (e.target === modal) modal.classList.add('hidden')
  })
})
