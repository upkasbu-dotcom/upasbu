// =============================================
// DATA UNIT
// =============================================
const UNIT_DATA = [
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
const PARAMS = [
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
const STATUS_OPTIONS = ['Operasi','Standby','Pemeliharaan','Gangguan','Rusak Permanen']

// =============================================
// STATE
// =============================================
let mesinList   = []
let currentData = {}
let lapData     = {}

// =============================================
// INIT
// =============================================
document.addEventListener('DOMContentLoaded', async function() {
  var today = new Date()
  var todayStr = today.toISOString().split('T')[0]
  document.getElementById('sel-tanggal').value = todayStr
  document.getElementById('lap-tanggal').value = todayStr
  var hr = String(today.getHours()).padStart(2,'0') + ':00'
  document.getElementById('sel-jam').value = hr
  document.getElementById('last-update').textContent = 'Update: ' + today.toLocaleString('id-ID')
  await loadMesin()
  renderTable()
  await loadData()
  renderLapCards('')
})

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
    loadLapData()
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

  // Header
  var headHTML = '<tr><th>Parameter</th>'
  for (var i = 0; i < mesinList.length; i++) {
    headHTML += '<th>' + mesinList[i].nama + '</th>'
  }
  headHTML += '</tr>'
  thead.innerHTML = headHTML

  // Body
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
      var m = mesinList[mi]
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
        bodyHTML += ' value="' + (val !== '' ? val : '') + '"'
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
    var d = currentData[m.id] || { status_mesin: 'Operasi' }
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
    showToast('Data berhasil disimpan! (' + json.saved + ' mesin, ' + tanggal + ' ' + jam + ')','success')
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
  list.innerHTML = '<div class="text-sm text-slate-400 text-center py-4"><span class="spinner"></span> Memuat...</div>'
  document.getElementById('modal-riwayat').classList.remove('hidden')
  try {
    var res  = await fetch('/api/monitoring/tanggal')
    var json = await res.json()
    if (!json.success) throw new Error(json.error)
    if (json.data.length === 0) {
      list.innerHTML = '<div class="text-sm text-slate-400 text-center py-4">Belum ada data</div>'
      return
    }
    var html = ''
    for (var i = 0; i < json.data.length; i++) {
      var tgl = json.data[i].tanggal
      html += '<button class="riwayat-btn" onclick="selectRiwayat(\'' + tgl + '\')">'
      html += '<i class="fas fa-calendar-day"></i><span>' + tgl + '</span></button>'
    }
    list.innerHTML = html
  } catch(e) { list.innerHTML = '<div class="text-sm text-red-400 text-center py-4">Gagal memuat</div>' }
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
// ===== LAP. OPERASIONAL =====
// =============================================
function renderLapCards(filter) {
  var container = document.getElementById('lap-cards-container')
  var filtered = filter
    ? UNIT_DATA.filter(function(u) {
        return u.nama_unit.toLowerCase().indexOf(filter.toLowerCase()) >= 0
          || String(u.kode_unit).indexOf(filter) >= 0
      })
    : UNIT_DATA

  if (filtered.length === 0) {
    container.innerHTML = '<div class="text-center py-12 text-slate-400"><i class="fas fa-search text-3xl mb-2"></i><p>Tidak ada unit ditemukan</p></div>'
    return
  }

  // Group by area
  var areas = {}
  for (var i = 0; i < filtered.length; i++) {
    var u = filtered[i]
    if (!areas[u.area]) areas[u.area] = []
    areas[u.area].push(u)
  }

  var tgl = document.getElementById('lap-tanggal') ? document.getElementById('lap-tanggal').value : ''
  var html = ''
  var areaKeys = Object.keys(areas)

  for (var ai = 0; ai < areaKeys.length; ai++) {
    var area = areaKeys[ai]
    var units = areas[area]
    html += '<div class="area-group">'
    html += '<div class="area-label"><i class="fas fa-map-marker-alt"></i>' + area + '</div>'
    html += '<div class="cards-grid">'

    for (var ui = 0; ui < units.length; ui++) {
      var unit = units[ui]
      var kode = unit.kode_unit
      var d = lapData[kode] || {}
      html += '<div class="lap-card" id="card-' + kode + '">'
      // Card header
      html += '<div class="lap-card-header">'
      html += '<div><div class="unit-name">' + unit.nama_unit + '</div>'
      html += '<div class="unit-area">' + unit.area + '</div></div>'
      html += '<div style="display:flex;align-items:center;gap:8px;">'
      html += '<span id="saved-' + kode + '" class="lap-saved"><i class="fas fa-check-circle"></i> Tersimpan</span>'
      html += '<span class="unit-kode">ID: ' + kode + '</span>'
      html += '</div></div>'
      // Info bar
      html += '<div class="lap-info-bar">'
      html += '<span><i class="fas fa-building"></i> UNIT: ' + unit.nama_unit + '</span>'
      html += '<span><i class="fas fa-hashtag"></i> ID: ' + kode + '</span>'
      html += '<span><i class="fas fa-calendar"></i> Tgl: ' + (tgl || '—') + '</span>'
      html += '</div>'
      // Fields grid
      html += '<div class="lap-grid">'
      // Nama Operator (full width)
      var valOp = d.nama_operator || ''
      html += '<div class="lap-field full">'
      html += '<label><i class="fas fa-user"></i> Nama Operator</label>'
      html += '<input type="text" placeholder="Nama operator..." value="' + valOp + '"'
      html += ' oninput="setLapValue(' + kode + ',\'nama_operator\',this.value)"/>'
      html += '</div>'
      // kWh Produksi
      html += '<div class="lap-field">'
      html += '<label><i class="fas fa-bolt"></i> kWh Produksi (kWh)</label>'
      html += '<input type="number" step="any" placeholder="0" value="' + (d.kwh_produksi !== undefined && d.kwh_produksi !== null ? d.kwh_produksi : '') + '"'
      html += ' oninput="setLapValue(' + kode + ',\'kwh_produksi\',this.value)"/>'
      html += '</div>'
      // Saldo Awal
      html += '<div class="lap-field">'
      html += '<label><i class="fas fa-gas-pump" style="color:#d97706"></i> Saldo Awal (ltr)</label>'
      html += '<input type="number" step="any" placeholder="0" value="' + (d.saldo_awal !== undefined && d.saldo_awal !== null ? d.saldo_awal : '') + '"'
      html += ' oninput="setLapValue(' + kode + ',\'saldo_awal\',this.value)"/>'
      html += '</div>'
      // Saldo Akhir
      html += '<div class="lap-field">'
      html += '<label><i class="fas fa-gas-pump" style="color:#16a34a"></i> Saldo Akhir (ltr)</label>'
      html += '<input type="number" step="any" placeholder="0" value="' + (d.saldo_akhir !== undefined && d.saldo_akhir !== null ? d.saldo_akhir : '') + '"'
      html += ' oninput="setLapValue(' + kode + ',\'saldo_akhir\',this.value)"/>'
      html += '</div>'
      // Penerimaan BBM
      html += '<div class="lap-field">'
      html += '<label><i class="fas fa-truck-ramp-box" style="color:#2563eb"></i> Penerimaan BBM (ltr)</label>'
      html += '<input type="number" step="any" placeholder="0" value="' + (d.penerimaan_bbm !== undefined && d.penerimaan_bbm !== null ? d.penerimaan_bbm : '') + '"'
      html += ' oninput="setLapValue(' + kode + ',\'penerimaan_bbm\',this.value)"/>'
      html += '</div>'
      // Estimasi BBM Maks (full width)
      html += '<div class="lap-field full">'
      html += '<label><i class="fas fa-calculator" style="color:#dc2626"></i> Estimasi Pemakaian BBM Maksimal (ltr)</label>'
      html += '<input type="number" step="any" placeholder="0" value="' + (d.estimasi_bbm_max !== undefined && d.estimasi_bbm_max !== null ? d.estimasi_bbm_max : '') + '"'
      html += ' oninput="setLapValue(' + kode + ',\'estimasi_bbm_max\',this.value)"/>'
      html += '</div>'
      html += '</div>' // end lap-grid
      // Footer button
      html += '<div class="lap-card-footer">'
      html += '<button class="btn btn-primary btn-sm" onclick="saveLapSingle(' + kode + ',\'' + unit.nama_unit + '\')">'
      html += '<i class="fas fa-save"></i> Simpan</button>'
      html += '</div>'
      html += '</div>' // end lap-card
    }
    html += '</div></div>' // end cards-grid + area-group
  }
  container.innerHTML = html

  // Restore saved badges
  var keys = Object.keys(lapData)
  for (var ki = 0; ki < keys.length; ki++) {
    var badge = document.getElementById('saved-' + keys[ki])
    if (badge) badge.classList.add('show')
  }
}

function setLapValue(kode, field, value) {
  if (!lapData[kode]) lapData[kode] = {}
  lapData[kode][field] = value === '' ? null : (field === 'nama_operator' ? value : parseFloat(value))
}

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
        nama_operator:  row.nama_operator,
        kwh_produksi:   row.kwh_produksi,
        saldo_awal:     row.saldo_awal,
        saldo_akhir:    row.saldo_akhir,
        penerimaan_bbm: row.penerimaan_bbm,
        estimasi_bbm_max: row.estimasi_bbm_max
      }
    }
    var filterVal = document.getElementById('search-unit') ? document.getElementById('search-unit').value : ''
    renderLapCards(filterVal)
    var cnt = json.data.length
    document.getElementById('info-lap-record').textContent = cnt > 0
      ? cnt + ' unit sudah ada data pada ' + tanggal
      : 'Belum ada data untuk ' + tanggal
    document.getElementById('last-update').textContent = 'LAP. OPERASIONAL — ' + tanggal
  } catch(e) { showToast('Gagal memuat data: ' + e.message,'error') }
  finally { showLoading(false,'loading-indicator-lap') }
}

async function saveLapSingle(kode, namaUnit) {
  var tanggal = document.getElementById('lap-tanggal').value
  if (!tanggal) { showToast('Pilih tanggal terlebih dahulu','info'); return }
  var d = lapData[kode] || {}
  try {
    var payload = { kode_unit: kode, nama_unit: namaUnit, tanggal: tanggal }
    payload.nama_operator   = d.nama_operator   || ''
    payload.kwh_produksi    = d.kwh_produksi    !== undefined ? d.kwh_produksi    : null
    payload.saldo_awal      = d.saldo_awal      !== undefined ? d.saldo_awal      : null
    payload.saldo_akhir     = d.saldo_akhir     !== undefined ? d.saldo_akhir     : null
    payload.penerimaan_bbm  = d.penerimaan_bbm  !== undefined ? d.penerimaan_bbm  : null
    payload.estimasi_bbm_max= d.estimasi_bbm_max!== undefined ? d.estimasi_bbm_max: null

    var res  = await fetch('/api/lap-operasional', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    var json = await res.json()
    if (!json.success) throw new Error(json.error)
    showToast(namaUnit + ' berhasil disimpan','success')
    var badge = document.getElementById('saved-' + kode)
    if (badge) {
      badge.classList.add('show')
      setTimeout(function(){ badge.classList.remove('show') }, 3000)
    }
  } catch(e) { showToast('Gagal: ' + e.message,'error') }
}

async function saveAllLap() {
  var tanggal = document.getElementById('lap-tanggal').value
  if (!tanggal) { showToast('Pilih tanggal terlebih dahulu','info'); return }
  showLoading(true,'loading-indicator-lap')
  var saved = 0, errors = 0
  var promises = []
  for (var i = 0; i < UNIT_DATA.length; i++) {
    (function(unit) {
      var d = lapData[unit.kode_unit] || {}
      var hasData = false
      var vals = Object.values(d)
      for (var vi = 0; vi < vals.length; vi++) {
        if (vals[vi] !== null && vals[vi] !== undefined && vals[vi] !== '') { hasData = true; break }
      }
      if (!hasData) return
      var payload = { kode_unit: unit.kode_unit, nama_unit: unit.nama_unit, tanggal: tanggal }
      payload.nama_operator    = d.nama_operator    || ''
      payload.kwh_produksi     = d.kwh_produksi     !== undefined ? d.kwh_produksi     : null
      payload.saldo_awal       = d.saldo_awal       !== undefined ? d.saldo_awal       : null
      payload.saldo_akhir      = d.saldo_akhir      !== undefined ? d.saldo_akhir      : null
      payload.penerimaan_bbm   = d.penerimaan_bbm   !== undefined ? d.penerimaan_bbm   : null
      payload.estimasi_bbm_max = d.estimasi_bbm_max !== undefined ? d.estimasi_bbm_max : null
      promises.push(
        fetch('/api/lap-operasional', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).then(function(r){ return r.json() }).then(function(j){
          if (j.success) {
            saved++
            var badge = document.getElementById('saved-' + unit.kode_unit)
            if (badge) { badge.classList.add('show'); setTimeout(function(){ badge.classList.remove('show') }, 3000) }
          } else errors++
        }).catch(function(){ errors++ })
      )
    })(UNIT_DATA[i])
  }
  await Promise.all(promises)
  showLoading(false,'loading-indicator-lap')
  if (errors === 0) showToast(saved + ' unit berhasil disimpan','success')
  else showToast(saved + ' disimpan, ' + errors + ' gagal','error')
}

function filterUnit(val) {
  renderLapCards(val)
}

async function showRiwayatLap() {
  var list = document.getElementById('riwayat-lap-list')
  list.innerHTML = '<div class="text-sm text-slate-400 text-center py-4"><span class="spinner"></span> Memuat...</div>'
  document.getElementById('modal-riwayat-lap').classList.remove('hidden')
  try {
    var res  = await fetch('/api/lap-operasional/tanggal')
    var json = await res.json()
    if (!json.success) throw new Error(json.error)
    if (json.data.length === 0) {
      list.innerHTML = '<div class="text-sm text-slate-400 text-center py-4">Belum ada data</div>'
      return
    }
    var html = ''
    for (var i = 0; i < json.data.length; i++) {
      var tgl = json.data[i].tanggal
      html += '<button class="riwayat-btn" onclick="selectRiwayatLap(\'' + tgl + '\')">'
      html += '<i class="fas fa-calendar-day"></i><span>' + tgl + '</span></button>'
    }
    list.innerHTML = html
  } catch(e) { list.innerHTML = '<div class="text-sm text-red-400 text-center py-4">Gagal memuat</div>' }
}

async function selectRiwayatLap(tanggal) {
  document.getElementById('lap-tanggal').value = tanggal
  closeModal('modal-riwayat-lap')
  await loadLapData()
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

// Click outside modal to close
document.addEventListener('click', function(e) {
  var modals = document.querySelectorAll('.modal-overlay')
  modals.forEach(function(modal) {
    if (e.target === modal) modal.classList.add('hidden')
  })
})
