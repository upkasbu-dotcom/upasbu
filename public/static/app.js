// =============================================
// DATA UNIT
// =============================================
var UNIT_DATA = [
  { kode_unit: 366, nama_unit: "ULD BABAI",             area: "AREA KUALA KAPUAS" },
  { kode_unit: 372, nama_unit: "ULD GUNUNG PUREI",      area: "AREA KUALA KAPUAS" },
  { kode_unit: 373, nama_unit: "ULD KENAMBUI",          area: "AREA PANGKALAN BUN" },
  { kode_unit: 375, nama_unit: "ULD KUDANGAN",          area: "AREA PANGKALAN BUN" },
  { kode_unit: 376, nama_unit: "ULD MENDAWAI",          area: "AREA PANGKALAN BUN" },
  { kode_unit: 382, nama_unit: "ULD PAGATAN",           area: "AREA PANGKALAN BUN" },
  { kode_unit: 385, nama_unit: "ULD RANGGA ILUNG",      area: "AREA KUALA KAPUAS" },
  { kode_unit: 390, nama_unit: "ULD TELAGA",            area: "AREA PALANGKARAYA" },
  { kode_unit: 391, nama_unit: "ULD TELAGA PULANG",     area: "AREA PANGKALAN BUN" },
  { kode_unit: 395, nama_unit: "ULD TUMBANG MANJUL",    area: "AREA PANGKALAN BUN" },
  { kode_unit: 399, nama_unit: "ULD TUMBANG SENAMANG",  area: "AREA PALANGKARAYA" },
  { kode_unit: 910, nama_unit: "ULD MANGKATIP",         area: "AREA KUALA KAPUAS" },
  { kode_unit: 911, nama_unit: "ULD TELUK BETUNG",      area: "AREA KUALA KAPUAS" },
  { kode_unit: 913, nama_unit: "ULD TUMPUNG LAUNG",     area: "AREA KUALA KAPUAS" },
  { kode_unit: 915, nama_unit: "ULD SUNGAI BALI",       area: "AREA TANAH BUMBU" },
  { kode_unit: 917, nama_unit: "ULD KERASIAN",          area: "AREA TANAH BUMBU" },
  { kode_unit: 918, nama_unit: "ULD KERAYAAN",          area: "AREA TANAH BUMBU" },
  { kode_unit: 919, nama_unit: "ULD KERUMPUTAN",        area: "AREA TANAH BUMBU" },
  { kode_unit: 920, nama_unit: "ULD MARABATUAN",        area: "AREA TANAH BUMBU" },
]

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
// STATE
// =============================================
var mesinList      = []
var currentData    = {}
var lapData        = {}      // { kode_unit: { ...fields } }
var selectedArea   = ''
var selectedKode   = null    // kode_unit yang sedang aktif
var currentLapForm = {}      // data form yang sedang diedit
var lastSavedData  = {}      // data yang sudah berhasil disimpan (untuk review)

// =============================================
// INIT
// =============================================
document.addEventListener('DOMContentLoaded', function() {
  var today = new Date()
  var todayStr = today.toISOString().split('T')[0]
  document.getElementById('sel-tanggal').value = todayStr
  document.getElementById('lap-tanggal').value = todayStr
  var hr = String(today.getHours()).padStart(2,'0') + ':00'
  document.getElementById('sel-jam').value = hr
  document.getElementById('last-update').textContent = 'Update: ' + today.toLocaleString('id-ID')

  // Populate Area dropdown
  buildAreaDropdown()

  // Load monitoring
  loadMesin().then(function() {
    renderTable()
    loadData()
  })
})

// =============================================
// BUILD AREA DROPDOWN
// =============================================
function buildAreaDropdown() {
  var areas = []
  for (var i = 0; i < UNIT_DATA.length; i++) {
    if (areas.indexOf(UNIT_DATA[i].area) === -1) areas.push(UNIT_DATA[i].area)
  }
  var sel = document.getElementById('sel-area')
  sel.innerHTML = '<option value="">-- Pilih Area --</option>'
  for (var i = 0; i < areas.length; i++) {
    sel.innerHTML += '<option value="' + areas[i] + '">' + areas[i] + '</option>'
  }
}

// =============================================
// AREA CHANGE → populate ULD dropdown
// =============================================
function onAreaChange(area) {
  selectedArea = area
  selectedKode = null
  currentLapForm = {}
  lastSavedData  = {}

  var selUnit = document.getElementById('sel-unit')
  selUnit.innerHTML = '<option value="">-- Pilih Unit --</option>'

  // Reset form
  document.getElementById('lap-form-container').classList.add('hidden')
  document.getElementById('lap-form-container').innerHTML = ''
  document.getElementById('lap-review-container').classList.add('hidden')
  document.getElementById('lap-review-container').innerHTML = ''

  // Reset save button
  var btnSave = document.getElementById('btn-save-lap')
  btnSave.disabled = true
  btnSave.style.opacity = '0.5'
  btnSave.style.cursor = 'not-allowed'

  if (!area) {
    selUnit.disabled = true
    showLapState('empty')
    return
  }

  // Filter units by area
  var units = UNIT_DATA.filter(function(u) { return u.area === area })
  for (var i = 0; i < units.length; i++) {
    var opt = document.createElement('option')
    opt.value = units[i].kode_unit
    opt.textContent = units[i].nama_unit + ' (' + units[i].kode_unit + ')'
    selUnit.appendChild(opt)
  }
  selUnit.disabled = false
  showLapState('pick-unit')
}

// =============================================
// UNIT CHANGE → tampilkan form
// =============================================
function onUnitChange(kode) {
  if (!kode) {
    selectedKode = null
    currentLapForm = {}
    lastSavedData  = {}
    document.getElementById('lap-form-container').classList.add('hidden')
    document.getElementById('lap-review-container').classList.add('hidden')
    var btnSave = document.getElementById('btn-save-lap')
    btnSave.disabled = true
    btnSave.style.opacity = '0.5'
    btnSave.style.cursor = 'not-allowed'
    showLapState('pick-unit')
    return
  }

  selectedKode = parseInt(kode)
  // Ambil data dari cache jika ada
  currentLapForm = lapData[selectedKode] ? JSON.parse(JSON.stringify(lapData[selectedKode])) : {}
  lastSavedData  = {}

  renderLapForm()

  // Enable save button
  var btnSave = document.getElementById('btn-save-lap')
  btnSave.disabled = false
  btnSave.style.opacity = '1'
  btnSave.style.cursor = 'pointer'
  showLapState('form')
}

// =============================================
// SHOW LAP STATE
// =============================================
function showLapState(state) {
  document.getElementById('lap-state-empty').classList.toggle('hidden', state !== 'empty')
  document.getElementById('lap-state-pick-unit').classList.toggle('hidden', state !== 'pick-unit')
  document.getElementById('lap-form-container').classList.toggle('hidden', state !== 'form')
  document.getElementById('lap-review-container').classList.toggle('hidden', state !== 'review')

  // Header button visibility
  var btnSave = document.getElementById('btn-save-lap')
  var btnEdit = document.getElementById('btn-edit-lap')
  if (btnEdit) btnEdit.style.display = (state === 'review') ? 'inline-flex' : 'none'
  if (btnSave) {
    btnSave.style.display = (state === 'review') ? 'none' : 'inline-flex'
    if (state === 'form') {
      btnSave.disabled = false
      btnSave.style.opacity = '1'
      btnSave.style.cursor = 'pointer'
    }
  }
}

// =============================================
// RENDER FORM SINGLE UNIT
// =============================================
function renderLapForm() {
  if (!selectedKode) return

  var unit = null
  for (var i = 0; i < UNIT_DATA.length; i++) {
    if (UNIT_DATA[i].kode_unit === selectedKode) { unit = UNIT_DATA[i]; break }
  }
  if (!unit) return

  var tgl = document.getElementById('lap-tanggal').value || '—'
  var d   = currentLapForm

  var alreadySaved = !!lapData[selectedKode]

  var kodeFormatted = String(unit.kode_unit).padStart(4, '0')

  // Format tgl untuk display
  var tglDisplay = tgl
  if (tgl && tgl !== '—') {
    var parts = tgl.split('-')
    tglDisplay = parts[2] + '/' + parts[1] + '/' + parts[0]
  }

  var html = ''
  html += '<div class="lap-single-card">'

  // Card header
  html += '<div class="lap-single-header">'
  html += '<div>'
  html += '<div class="lap-single-title">' + unit.nama_unit + '</div>'
  html += '<div class="lap-single-sub">' + unit.area + '</div>'
  html += '</div>'
  html += '<div style="display:flex;gap:8px;align-items:center;">'
  if (alreadySaved) {
    html += '<span class="badge-saved"><i class="fas fa-check-circle"></i> Data Tersimpan</span>'
  }
  html += '<span class="lap-kode-badge">ID: ' + kodeFormatted + '</span>'
  html += '</div>'
  html += '</div>'

  // Info bar
  html += '<div class="lap-single-infobar">'
  html += '<div class="info-item"><span class="info-label">UNIT</span><span class="info-val">' + unit.nama_unit + '</span></div>'
  html += '<div class="info-item"><span class="info-label">ID UNIT</span><span class="info-val">' + kodeFormatted + '</span></div>'
  html += '<div class="info-item"><span class="info-label">TANGGAL</span><span class="info-val">' + tglDisplay + '</span></div>'
  html += '</div>'

  // Form body
  html += '<div class="lap-single-body">'

  // Nama Operator (full)
  html += '<div class="form-group full">'
  html += '<label class="form-label"><i class="fas fa-user-tie"></i> Nama Operator</label>'
  html += '<input type="text" class="form-input" placeholder="Masukkan nama operator..."'
  html += ' value="' + (d.nama_operator || '') + '"'
  html += ' oninput="setLapField(\'nama_operator\', this.value)"/>'
  html += '</div>'

  // Row: kWh + Saldo Awal
  html += '<div class="form-row">'
  html += '<div class="form-group">'
  html += '<label class="form-label"><i class="fas fa-bolt" style="color:#f59e0b"></i> kWh Produksi</label>'
  html += '<div class="input-unit-wrap">'
  html += '<input type="number" step="any" class="form-input" placeholder="0"'
  html += ' value="' + (d.kwh_produksi !== undefined && d.kwh_produksi !== null ? d.kwh_produksi : '') + '"'
  html += ' oninput="setLapField(\'kwh_produksi\', this.value)"/>'
  html += '<span class="input-unit-label">kWh</span>'
  html += '</div></div>'

  html += '<div class="form-group">'
  html += '<label class="form-label"><i class="fas fa-gas-pump" style="color:#d97706"></i> Saldo Awal</label>'
  html += '<div class="input-unit-wrap">'
  html += '<input type="number" step="any" class="form-input" placeholder="0"'
  html += ' value="' + (d.saldo_awal !== undefined && d.saldo_awal !== null ? d.saldo_awal : '') + '"'
  html += ' oninput="setLapField(\'saldo_awal\', this.value)"/>'
  html += '<span class="input-unit-label">ltr</span>'
  html += '</div></div>'
  html += '</div>'

  // Row: Saldo Akhir + Penerimaan BBM
  html += '<div class="form-row">'
  html += '<div class="form-group">'
  html += '<label class="form-label"><i class="fas fa-gas-pump" style="color:#16a34a"></i> Saldo Akhir</label>'
  html += '<div class="input-unit-wrap">'
  html += '<input type="number" step="any" class="form-input" placeholder="0"'
  html += ' value="' + (d.saldo_akhir !== undefined && d.saldo_akhir !== null ? d.saldo_akhir : '') + '"'
  html += ' oninput="setLapField(\'saldo_akhir\', this.value)"/>'
  html += '<span class="input-unit-label">ltr</span>'
  html += '</div></div>'

  html += '<div class="form-group">'
  html += '<label class="form-label"><i class="fas fa-truck-ramp-box" style="color:#2563eb"></i> Penerimaan BBM</label>'
  html += '<div class="input-unit-wrap">'
  html += '<input type="number" step="any" class="form-input" placeholder="0"'
  html += ' value="' + (d.penerimaan_bbm !== undefined && d.penerimaan_bbm !== null ? d.penerimaan_bbm : '') + '"'
  html += ' oninput="setLapField(\'penerimaan_bbm\', this.value)"/>'
  html += '<span class="input-unit-label">ltr</span>'
  html += '</div></div>'
  html += '</div>'

  // Estimasi BBM Maks (full)
  html += '<div class="form-group full">'
  html += '<label class="form-label"><i class="fas fa-calculator" style="color:#dc2626"></i> Estimasi Pemakaian BBM Maksimal</label>'
  html += '<div class="input-unit-wrap">'
  html += '<input type="number" step="any" class="form-input" placeholder="0"'
  html += ' value="' + (d.estimasi_bbm_max !== undefined && d.estimasi_bbm_max !== null ? d.estimasi_bbm_max : '') + '"'
  html += ' oninput="setLapField(\'estimasi_bbm_max\', this.value)"/>'
  html += '<span class="input-unit-label">ltr</span>'
  html += '</div></div>'

  html += '</div>' // end lap-single-body

  // Footer
  html += '<div class="lap-single-footer">'
  html += '<span class="text-xs text-slate-400" id="lap-save-status"></span>'
  html += '<button class="btn btn-success" onclick="saveLapCurrent()">'
  html += '<i class="fas fa-save"></i> Simpan Data</button>'
  html += '</div>'

  html += '</div>' // end lap-single-card

  document.getElementById('lap-form-container').innerHTML = html
}

// =============================================
// SET FIELD VALUE
// =============================================
function setLapField(field, value) {
  if (field === 'nama_operator') {
    currentLapForm[field] = value
  } else {
    currentLapForm[field] = value === '' ? null : parseFloat(value)
  }
}

// =============================================
// LOAD LAP DATA (untuk tanggal tertentu)
// =============================================
async function loadLapData() {
  var tanggal = document.getElementById('lap-tanggal').value
  if (!tanggal) { showToast('Pilih tanggal terlebih dahulu','info'); return }

  showLoading(true,'loading-indicator-lap')
  try {
    var res  = await fetch('/api/lap-operasional?tanggal=' + tanggal)
    var json = await res.json()
    if (!json.success) throw new Error(json.error)

    lapData = {}
    for (var i = 0; i < json.data.length; i++) {
      var row = json.data[i]
      lapData[row.kode_unit] = {
        nama_operator:    row.nama_operator,
        kwh_produksi:     row.kwh_produksi,
        saldo_awal:       row.saldo_awal,
        saldo_akhir:      row.saldo_akhir,
        penerimaan_bbm:   row.penerimaan_bbm,
        estimasi_bbm_max: row.estimasi_bbm_max
      }
    }

    var cnt = json.data.length
    document.getElementById('info-lap-record').textContent = cnt > 0
      ? cnt + ' unit sudah ada data'
      : 'Belum ada data untuk ' + tanggal

    // Jika unit sudah dipilih, refresh form-nya
    if (selectedKode) {
      currentLapForm = lapData[selectedKode] ? JSON.parse(JSON.stringify(lapData[selectedKode])) : {}
      renderLapForm()
    }

    document.getElementById('last-update').textContent = 'LAP. OPERASIONAL — ' + tanggal
    showToast('Data ' + tanggal + ' dimuat (' + cnt + ' unit)','info')
  } catch(e) { showToast('Gagal memuat data: ' + e.message,'error') }
  finally { showLoading(false,'loading-indicator-lap') }
}

// =============================================
// SAVE CURRENT UNIT → lalu tampilkan REVIEW
// =============================================
async function saveLapCurrent() {
  if (!selectedKode) { showToast('Pilih unit terlebih dahulu','info'); return }
  var tanggal = document.getElementById('lap-tanggal').value
  if (!tanggal) { showToast('Pilih tanggal terlebih dahulu','info'); return }

  var unit = null
  for (var i = 0; i < UNIT_DATA.length; i++) {
    if (UNIT_DATA[i].kode_unit === selectedKode) { unit = UNIT_DATA[i]; break }
  }
  if (!unit) return

  // Disable tombol sementara
  var btnSave = document.getElementById('btn-save-lap')
  if (btnSave) { btnSave.disabled = true; btnSave.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...' }

  // Juga disable footer button dalam form
  var footerBtn = document.querySelector('#lap-form-container .lap-single-footer .btn-success')
  if (footerBtn) { footerBtn.disabled = true; footerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...' }

  var d = currentLapForm
  var payload = {
    kode_unit:        unit.kode_unit,
    nama_unit:        unit.nama_unit,
    tanggal:          tanggal,
    nama_operator:    d.nama_operator    || '',
    kwh_produksi:     d.kwh_produksi     !== undefined ? d.kwh_produksi     : null,
    saldo_awal:       d.saldo_awal       !== undefined ? d.saldo_awal       : null,
    saldo_akhir:      d.saldo_akhir      !== undefined ? d.saldo_akhir      : null,
    penerimaan_bbm:   d.penerimaan_bbm   !== undefined ? d.penerimaan_bbm   : null,
    estimasi_bbm_max: d.estimasi_bbm_max !== undefined ? d.estimasi_bbm_max : null
  }

  try {
    var res  = await fetch('/api/lap-operasional', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload)
    })
    var json = await res.json()
    if (!json.success) throw new Error(json.error)

    // Update cache
    lapData[selectedKode] = JSON.parse(JSON.stringify(currentLapForm))
    lastSavedData = JSON.parse(JSON.stringify(currentLapForm))

    showToast(unit.nama_unit + ' berhasil disimpan!', 'success')

    // Tampilkan halaman REVIEW
    renderReview(unit, tanggal, d)
    showLapState('review')

  } catch(e) {
    showToast('Gagal menyimpan: ' + e.message,'error')
    if (btnSave) {
      btnSave.disabled = false
      btnSave.innerHTML = '<i class="fas fa-save"></i> Simpan Data'
    }
    if (footerBtn) {
      footerBtn.disabled = false
      footerBtn.innerHTML = '<i class="fas fa-save"></i> Simpan Data'
    }
  }
}

// =============================================
// RENDER HALAMAN REVIEW (FORMAT LAPORAN)
// =============================================
function renderReview(unit, tanggal, d) {
  // Format tanggal ke DD/MM/YYYY
  var tglParts = tanggal.split('-')
  var tglFormatted = tglParts[2] + '/' + tglParts[1] + '/' + tglParts[0]

  // Format kode unit 4 digit
  var kodeFormatted = String(unit.kode_unit).padStart(4, '0')

  // Format nilai angka
  function fmtNum(val) {
    if (val === null || val === undefined || val === '') return '-'
    return Number(val).toLocaleString('id-ID')
  }
  function fmtStr(val) {
    if (!val || val.trim() === '') return '-'
    return val
  }

  var savedAt = new Date().toLocaleString('id-ID', { dateStyle:'long', timeStyle:'short' })

  // ===== TEKS LAPORAN (format asli mirip dokumen) =====
  var teksLaporan =
    'LAPORAN OPERASIONAL PLTD\n' +
    unit.nama_unit + '\n' +
    'ID Unit  : ' + kodeFormatted + '\n' +
    'Tgl      : ' + tglFormatted + '\n\n' +
    'Nama Operator          : ' + fmtStr(d.nama_operator) + '\n' +
    'kWh Produksi           : ' + fmtNum(d.kwh_produksi) + ' kWh\n' +
    'Saldo Awal             : ' + fmtNum(d.saldo_awal) + ' ltr\n' +
    'Saldo Akhir            : ' + fmtNum(d.saldo_akhir) + ' ltr\n' +
    'Penerimaan BBM         : ' + fmtNum(d.penerimaan_bbm) + ' ltr\n' +
    'Estimasi Pemakaian BBM : ' + fmtNum(d.estimasi_bbm_max) + ' ltr'

  var html = ''
  html += '<div class="review-wrap">'

  // ===== KOP LAPORAN =====
  html += '<div class="review-kop">'
  html += '<div class="review-kop-left">'
  html += '<div class="review-kop-icon"><i class="fas fa-file-invoice"></i></div>'
  html += '<div>'
  html += '<div class="review-kop-title">LAPORAN OPERASIONAL PLTD</div>'
  html += '<div class="review-kop-sub">Dokumen Operasional Harian</div>'
  html += '</div>'
  html += '</div>'
  html += '<div class="review-kop-stamp"><i class="fas fa-check-circle"></i><br/>TERSIMPAN</div>'
  html += '</div>'

  html += '<div class="review-divider"></div>'

  // ===== IDENTITAS UNIT =====
  html += '<div class="review-identity">'
  html += '<div class="review-unit-name">' + unit.nama_unit + '</div>'
  html += '<table class="review-id-table">'
  html += '<tr><td class="rid-label">ID Unit</td><td class="rid-sep">:</td><td class="rid-val">' + kodeFormatted + '</td></tr>'
  html += '<tr><td class="rid-label">Tgl</td><td class="rid-sep">:</td><td class="rid-val">' + tglFormatted + '</td></tr>'
  html += '<tr><td class="rid-label">Nama Operator</td><td class="rid-sep">:</td><td class="rid-val">' + fmtStr(d.nama_operator) + '</td></tr>'
  html += '</table>'
  html += '</div>'

  html += '<div class="review-divider"></div>'

  // ===== DATA OPERASIONAL =====
  html += '<div class="review-data-section">'
  html += '<div class="review-section-label"><i class="fas fa-table-list"></i> Data Operasional</div>'
  html += '<table class="review-data-table">'
  html += '<tr><td class="rdt-label">kWh Produksi</td><td class="rdt-sep">:</td><td class="rdt-val"><strong>' + fmtNum(d.kwh_produksi) + '</strong> <span class="rdt-unit">kWh</span></td></tr>'
  html += '<tr><td class="rdt-label">Saldo Awal</td><td class="rdt-sep">:</td><td class="rdt-val"><strong>' + fmtNum(d.saldo_awal) + '</strong> <span class="rdt-unit">ltr</span></td></tr>'
  html += '<tr><td class="rdt-label">Saldo Akhir</td><td class="rdt-sep">:</td><td class="rdt-val"><strong>' + fmtNum(d.saldo_akhir) + '</strong> <span class="rdt-unit">ltr</span></td></tr>'
  html += '<tr><td class="rdt-label">Penerimaan BBM</td><td class="rdt-sep">:</td><td class="rdt-val"><strong>' + fmtNum(d.penerimaan_bbm) + '</strong> <span class="rdt-unit">ltr</span></td></tr>'
  html += '<tr class="rdt-last"><td class="rdt-label">Estimasi Pemakaian BBM Maks</td><td class="rdt-sep">:</td><td class="rdt-val"><strong>' + fmtNum(d.estimasi_bbm_max) + '</strong> <span class="rdt-unit">ltr</span></td></tr>'
  html += '</table>'
  html += '</div>'

  html += '<div class="review-divider"></div>'

  // ===== FOOTER: TOMBOL AKSI =====
  html += '<div class="review-footer">'
  html += '<div class="review-save-info"><i class="fas fa-clock"></i> Disimpan: ' + savedAt + '</div>'
  html += '<div class="review-actions">'
  html += '<button class="btn btn-outline-dark" onclick="backToForm()">'
  html += '<i class="fas fa-pen"></i> Edit</button>'
  html += '<button class="btn btn-kirim" onclick="kirimLaporan(\'' + encodeURIComponent(teksLaporan) + '\')">'
  html += '<i class="fas fa-paper-plane"></i> Kirim</button>'
  html += '</div>'
  html += '</div>'

  html += '</div>' // end review-wrap

  document.getElementById('lap-review-container').innerHTML = html
}

// =============================================
// BACK TO FORM (dari review)
// =============================================
function backToForm() {
  showLapState('form')
  renderLapForm()
}

// =============================================
// KIRIM LAPORAN → tampilkan modal preview
// =============================================
function kirimLaporan(encodedTeks) {
  var teks = decodeURIComponent(encodedTeks)
  document.getElementById('kirim-preview-text').textContent = teks
  document.getElementById('modal-kirim').classList.remove('hidden')
}

// Salin teks ke clipboard
function copyKirimText() {
  var el = document.getElementById('kirim-preview-text')
  var teks = el.textContent
  if (navigator.clipboard) {
    navigator.clipboard.writeText(teks).then(function() {
      showToast('Teks berhasil disalin!', 'success')
    }).catch(function() {
      fallbackCopy(teks)
    })
  } else {
    fallbackCopy(teks)
  }
}

function fallbackCopy(teks) {
  var ta = document.createElement('textarea')
  ta.value = teks
  ta.style.position = 'fixed'
  ta.style.opacity  = '0'
  document.body.appendChild(ta)
  ta.select()
  document.execCommand('copy')
  document.body.removeChild(ta)
  showToast('Teks berhasil disalin!', 'success')
}

// Kirim via WhatsApp
function kirimWhatsApp() {
  var teks = document.getElementById('kirim-preview-text').textContent
  var url  = 'https://wa.me/?text=' + encodeURIComponent(teks)
  window.open(url, '_blank')
}

// =============================================
// RIWAYAT LAP OPERASIONAL
// =============================================
async function showRiwayatLap() {
  var list = document.getElementById('riwayat-lap-list')
  list.innerHTML = '<div style="text-align:center;padding:16px;color:#94a3b8"><span class="spinner"></span> Memuat...</div>'
  document.getElementById('modal-riwayat-lap').classList.remove('hidden')
  try {
    var res  = await fetch('/api/lap-operasional/tanggal')
    var json = await res.json()
    if (!json.success) throw new Error(json.error)
    if (json.data.length === 0) {
      list.innerHTML = '<div style="text-align:center;padding:16px;color:#94a3b8">Belum ada data tersimpan</div>'
      return
    }
    var html = ''
    for (var i = 0; i < json.data.length; i++) {
      var tgl = json.data[i].tanggal
      html += '<button class="riwayat-btn" onclick="selectRiwayatLap(\'' + tgl + '\')">'
      html += '<i class="fas fa-calendar-day"></i><span>' + tgl + '</span></button>'
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
// TAB SWITCHING
// =============================================
function switchTab(tab) {
  document.getElementById('tab-monitoring').classList.toggle('active', tab === 'monitoring')
  document.getElementById('tab-laporan').classList.toggle('active', tab === 'laporan')
  document.getElementById('tab-btn-monitoring').classList.toggle('active', tab === 'monitoring')
  document.getElementById('tab-btn-laporan').classList.toggle('active', tab === 'laporan')
  document.getElementById('toolbar-monitoring').classList.toggle('hidden', tab !== 'monitoring')
  document.getElementById('toolbar-laporan').classList.toggle('hidden', tab !== 'laporan')
  document.getElementById('header-actions-monitoring').classList.toggle('hidden', tab !== 'monitoring')
  document.getElementById('header-actions-laporan').classList.toggle('hidden', tab !== 'laporan')

  if (tab === 'laporan') {
    document.getElementById('last-update').textContent = 'LAP. OPERASIONAL'
    // Tampilkan state awal jika belum pilih
    if (!selectedKode) {
      if (!selectedArea) showLapState('empty')
      else showLapState('pick-unit')
    }
  } else {
    document.getElementById('last-update').textContent = 'MONITORING MESIN'
  }
}

// =============================================
// ===== MONITORING MESIN =====
// =============================================
async function loadMesin() {
  try {
    var res  = await fetch('/api/mesin')
    var json = await res.json()
    if (json.success) mesinList = json.data
  } catch(e) { showToast('Gagal memuat daftar mesin','error') }
}

function renderTable() {
  var thead = document.getElementById('table-head')
  var tbody = document.getElementById('table-body')

  var headHTML = '<tr><th>Parameter</th>'
  for (var i = 0; i < mesinList.length; i++) {
    headHTML += '<th>' + mesinList[i].nama + '</th>'
  }
  headHTML += '</tr>'
  thead.innerHTML = headHTML

  var bodyHTML = ''
  for (var pi = 0; pi < PARAMS.length; pi++) {
    var p = PARAMS[pi]
    if (pi === 13) {
      bodyHTML += '<tr class="row-section"><td colspan="' + (mesinList.length+1) + '">— Produksi —</td></tr>'
    }
    bodyHTML += '<tr data-param="' + p.key + '">'
    bodyHTML += '<td><span class="param-label">' + p.label + '</span>'
    if (p.unit) bodyHTML += '<span class="param-unit">(' + p.unit + ')</span>'
    bodyHTML += '</td>'

    for (var mi = 0; mi < mesinList.length; mi++) {
      var m   = mesinList[mi]
      var val = (currentData[m.id] && currentData[m.id][p.key] !== undefined && currentData[m.id][p.key] !== null)
                ? currentData[m.id][p.key] : ''
      if (p.type === 'select') {
        bodyHTML += '<td><select class="cell-input" onchange="setCellValue(' + m.id + ',\'' + p.key + '\',this.value)">'
        for (var si = 0; si < STATUS_OPTIONS.length; si++) {
          var opt = STATUS_OPTIONS[si]
          var sel = (val === opt || (!val && opt === 'Operasi')) ? ' selected' : ''
          bodyHTML += '<option value="' + opt + '"' + sel + '>' + opt + '</option>'
        }
        bodyHTML += '</select></td>'
      } else {
        bodyHTML += '<td><input type="number" step="any" class="cell-input" placeholder="—"'
        bodyHTML += ' value="' + val + '"'
        bodyHTML += ' oninput="setCellValue(' + m.id + ',\'' + p.key + '\',this.value)"/></td>'
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
  showLoading(true,'loading-indicator')
  try {
    var res  = await fetch('/api/monitoring?tanggal=' + tanggal + '&jam=' + jam)
    var json = await res.json()
    if (!json.success) throw new Error(json.error)
    currentData = {}
    for (var i = 0; i < mesinList.length; i++) {
      currentData[mesinList[i].id] = { status_mesin: 'Operasi' }
    }
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
    document.getElementById('last-update').textContent = 'Ditampilkan: ' + tanggal + ' Jam ' + jam
  } catch(e) { showToast('Gagal memuat data: ' + e.message,'error') }
  finally { showLoading(false,'loading-indicator') }
}

async function saveAllData() {
  var tanggal = document.getElementById('sel-tanggal').value
  var jam     = document.getElementById('sel-jam').value
  if (!tanggal || !jam) { showToast('Pilih tanggal dan jam','info'); return }
  var records = []
  for (var i = 0; i < mesinList.length; i++) {
    var m = mesinList[i]
    var d = Object.assign({}, currentData[m.id] || { status_mesin: 'Operasi' })
    d.mesin_id = m.id
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
    document.getElementById('last-update').textContent = 'Disimpan: ' + new Date().toLocaleString('id-ID')
  } catch(e) { showToast('Gagal menyimpan: ' + e.message,'error') }
  finally { showLoading(false,'loading-indicator') }
}

function showAddMesinModal() {
  document.getElementById('input-nama-mesin').value = ''
  document.getElementById('modal-mesin').classList.remove('hidden')
  setTimeout(function(){ document.getElementById('input-nama-mesin').focus() }, 100)
}

async function addMesin() {
  var nama = document.getElementById('input-nama-mesin').value.trim()
  if (!nama) { showToast('Nama mesin tidak boleh kosong','error'); return }
  try {
    var res  = await fetch('/api/mesin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama: nama })
    })
    var json = await res.json()
    if (!json.success) throw new Error(json.error)
    closeModal('modal-mesin')
    showToast('Mesin "' + nama + '" berhasil ditambahkan','success')
    await loadMesin()
    renderTable()
  } catch(e) { showToast('Gagal menambah mesin: ' + e.message,'error') }
}

async function showRiwayat() {
  var list = document.getElementById('riwayat-list')
  list.innerHTML = '<div style="text-align:center;padding:16px;color:#94a3b8"><span class="spinner"></span> Memuat...</div>'
  document.getElementById('modal-riwayat').classList.remove('hidden')
  try {
    var res  = await fetch('/api/monitoring/tanggal')
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
// UTILS
// =============================================
document.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && !document.getElementById('modal-mesin').classList.contains('hidden')) addMesin()
})

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
