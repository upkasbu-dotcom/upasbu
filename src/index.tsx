import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/api/*', cors())

// ============================================================
// INIT DATABASE (create tables if not exist)
// ============================================================
async function initDB(db: D1Database) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS mesin (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT NOT NULL UNIQUE,
    urutan INTEGER DEFAULT 0,
    aktif INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`).run()

  await db.prepare(`CREATE TABLE IF NOT EXISTS data_monitoring (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mesin_id INTEGER NOT NULL,
    tanggal TEXT NOT NULL,
    jam TEXT NOT NULL,
    daya_mampu REAL,
    beban REAL,
    stand_kwh REAL,
    stand_bbm REAL,
    phasa_r REAL,
    phasa_s REAL,
    phasa_t REAL,
    tek_oli REAL,
    temp_air_pendingin REAL,
    tegangan REAL,
    frequency REAL,
    cos_phi REAL,
    jam_kerja_mesin REAL,
    status_mesin TEXT DEFAULT 'Operasi',
    kwh_produksi REAL,
    pemakaian_bbm REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mesin_id) REFERENCES mesin(id)
  )`).run()

  await db.prepare(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_mesin_jam ON data_monitoring(mesin_id, tanggal, jam)`
  ).run()

  // seed default mesin if empty
  const count = await db.prepare('SELECT COUNT(*) as c FROM mesin').first<{ c: number }>()
  if (count && count.c === 0) {
    await db.batch([
      db.prepare(`INSERT OR IGNORE INTO mesin (nama, urutan) VALUES ('Mesin 1', 1)`),
      db.prepare(`INSERT OR IGNORE INTO mesin (nama, urutan) VALUES ('Mesin 2', 2)`),
      db.prepare(`INSERT OR IGNORE INTO mesin (nama, urutan) VALUES ('Mesin 3', 3)`),
    ])
  }
}

// ============================================================
// API: GET semua mesin
// ============================================================
app.get('/api/mesin', async (c) => {
  try {
    await initDB(c.env.DB)
    const result = await c.env.DB.prepare('SELECT * FROM mesin WHERE aktif=1 ORDER BY urutan, nama').all()
    return c.json({ success: true, data: result.results })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

// API: Tambah mesin
app.post('/api/mesin', async (c) => {
  try {
    const { nama } = await c.req.json()
    if (!nama) return c.json({ success: false, error: 'Nama mesin wajib diisi' }, 400)
    const maxUrutan = await c.env.DB.prepare('SELECT MAX(urutan) as m FROM mesin').first<{ m: number }>()
    const urutan = (maxUrutan?.m || 0) + 1
    const result = await c.env.DB.prepare('INSERT INTO mesin (nama, urutan) VALUES (?, ?)').bind(nama, urutan).run()
    return c.json({ success: true, id: result.meta.last_row_id })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

// API: Hapus mesin (soft delete)
app.delete('/api/mesin/:id', async (c) => {
  try {
    const id = c.req.param('id')
    await c.env.DB.prepare('UPDATE mesin SET aktif=0 WHERE id=?').bind(id).run()
    return c.json({ success: true })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

// ============================================================
// API: GET data monitoring berdasarkan tanggal
// ============================================================
app.get('/api/monitoring', async (c) => {
  try {
    await initDB(c.env.DB)
    const tanggal = c.req.query('tanggal') || new Date().toISOString().split('T')[0]
    const jam = c.req.query('jam') || null

    let query = `
      SELECT dm.*, m.nama as nama_mesin
      FROM data_monitoring dm
      JOIN mesin m ON dm.mesin_id = m.id
      WHERE dm.tanggal = ?
    `
    const params: any[] = [tanggal]

    if (jam) {
      query += ' AND dm.jam = ?'
      params.push(jam)
    }

    query += ' ORDER BY dm.jam, m.urutan'
    const result = await c.env.DB.prepare(query).bind(...params).all()
    return c.json({ success: true, data: result.results })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

// API: GET daftar tanggal yang ada datanya (untuk riwayat)
app.get('/api/monitoring/tanggal', async (c) => {
  try {
    const result = await c.env.DB.prepare(
      'SELECT DISTINCT tanggal FROM data_monitoring ORDER BY tanggal DESC LIMIT 90'
    ).all()
    return c.json({ success: true, data: result.results })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

// API: GET daftar jam yang ada datanya pada tanggal tertentu
app.get('/api/monitoring/jam', async (c) => {
  try {
    const tanggal = c.req.query('tanggal') || new Date().toISOString().split('T')[0]
    const result = await c.env.DB.prepare(
      'SELECT DISTINCT jam FROM data_monitoring WHERE tanggal=? ORDER BY jam'
    ).bind(tanggal).all()
    return c.json({ success: true, data: result.results })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

// API: UPSERT data monitoring (insert or update)
app.post('/api/monitoring', async (c) => {
  try {
    const body = await c.req.json()
    const {
      mesin_id, tanggal, jam,
      daya_mampu, beban, stand_kwh, stand_bbm,
      phasa_r, phasa_s, phasa_t, tek_oli,
      temp_air_pendingin, tegangan, frequency, cos_phi,
      jam_kerja_mesin, status_mesin, kwh_produksi, pemakaian_bbm
    } = body

    if (!mesin_id || !tanggal || !jam) {
      return c.json({ success: false, error: 'mesin_id, tanggal, jam wajib diisi' }, 400)
    }

    await c.env.DB.prepare(`
      INSERT INTO data_monitoring 
        (mesin_id, tanggal, jam, daya_mampu, beban, stand_kwh, stand_bbm,
         phasa_r, phasa_s, phasa_t, tek_oli, temp_air_pendingin, tegangan,
         frequency, cos_phi, jam_kerja_mesin, status_mesin, kwh_produksi, pemakaian_bbm, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, CURRENT_TIMESTAMP)
      ON CONFLICT(mesin_id, tanggal, jam) DO UPDATE SET
        daya_mampu=excluded.daya_mampu,
        beban=excluded.beban,
        stand_kwh=excluded.stand_kwh,
        stand_bbm=excluded.stand_bbm,
        phasa_r=excluded.phasa_r,
        phasa_s=excluded.phasa_s,
        phasa_t=excluded.phasa_t,
        tek_oli=excluded.tek_oli,
        temp_air_pendingin=excluded.temp_air_pendingin,
        tegangan=excluded.tegangan,
        frequency=excluded.frequency,
        cos_phi=excluded.cos_phi,
        jam_kerja_mesin=excluded.jam_kerja_mesin,
        status_mesin=excluded.status_mesin,
        kwh_produksi=excluded.kwh_produksi,
        pemakaian_bbm=excluded.pemakaian_bbm,
        updated_at=CURRENT_TIMESTAMP
    `).bind(
      mesin_id, tanggal, jam,
      daya_mampu ?? null, beban ?? null, stand_kwh ?? null, stand_bbm ?? null,
      phasa_r ?? null, phasa_s ?? null, phasa_t ?? null, tek_oli ?? null,
      temp_air_pendingin ?? null, tegangan ?? null, frequency ?? null,
      cos_phi ?? null, jam_kerja_mesin ?? null,
      status_mesin || 'Operasi', kwh_produksi ?? null, pemakaian_bbm ?? null
    ).run()

    return c.json({ success: true })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

// API: Batch save multiple mesin data at once
app.post('/api/monitoring/batch', async (c) => {
  try {
    const { tanggal, jam, records } = await c.req.json()
    if (!tanggal || !jam || !records || !Array.isArray(records)) {
      return c.json({ success: false, error: 'tanggal, jam, records wajib diisi' }, 400)
    }

    const stmts = records.map((r: any) =>
      c.env.DB.prepare(`
        INSERT INTO data_monitoring 
          (mesin_id, tanggal, jam, daya_mampu, beban, stand_kwh, stand_bbm,
           phasa_r, phasa_s, phasa_t, tek_oli, temp_air_pendingin, tegangan,
           frequency, cos_phi, jam_kerja_mesin, status_mesin, kwh_produksi, pemakaian_bbm, updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, CURRENT_TIMESTAMP)
        ON CONFLICT(mesin_id, tanggal, jam) DO UPDATE SET
          daya_mampu=excluded.daya_mampu, beban=excluded.beban,
          stand_kwh=excluded.stand_kwh, stand_bbm=excluded.stand_bbm,
          phasa_r=excluded.phasa_r, phasa_s=excluded.phasa_s, phasa_t=excluded.phasa_t,
          tek_oli=excluded.tek_oli, temp_air_pendingin=excluded.temp_air_pendingin,
          tegangan=excluded.tegangan, frequency=excluded.frequency, cos_phi=excluded.cos_phi,
          jam_kerja_mesin=excluded.jam_kerja_mesin, status_mesin=excluded.status_mesin,
          kwh_produksi=excluded.kwh_produksi, pemakaian_bbm=excluded.pemakaian_bbm,
          updated_at=CURRENT_TIMESTAMP
      `).bind(
        r.mesin_id, tanggal, jam,
        r.daya_mampu ?? null, r.beban ?? null, r.stand_kwh ?? null, r.stand_bbm ?? null,
        r.phasa_r ?? null, r.phasa_s ?? null, r.phasa_t ?? null, r.tek_oli ?? null,
        r.temp_air_pendingin ?? null, r.tegangan ?? null, r.frequency ?? null,
        r.cos_phi ?? null, r.jam_kerja_mesin ?? null,
        r.status_mesin || 'Operasi', r.kwh_produksi ?? null, r.pemakaian_bbm ?? null
      )
    )

    await c.env.DB.batch(stmts)
    return c.json({ success: true, saved: records.length })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

// ============================================================
// SERVE MAIN PAGE
// ============================================================
app.get('/', (c) => {
  return c.html(getHTML())
})

function getHTML(): string {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Monitor Mesin</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet"/>
  <style>
    /* ===== STICKY HEADER ===== */
    .table-wrap {
      overflow: auto;
      max-height: calc(100vh - 220px);
      border-radius: 0.5rem;
      border: 1px solid #e5e7eb;
      box-shadow: 0 2px 8px rgba(0,0,0,0.07);
    }
    table { border-collapse: collapse; width: 100%; }
    thead th {
      position: sticky;
      top: 0;
      z-index: 20;
      background: #1e3a5f;
      color: #fff;
      font-size: 0.75rem;
      font-weight: 600;
      white-space: nowrap;
      padding: 10px 12px;
      border-right: 1px solid #2d5382;
      text-align: center;
    }
    thead th:first-child {
      position: sticky;
      left: 0;
      z-index: 30;
      background: #152d4a;
      min-width: 170px;
    }
    tbody td:first-child {
      position: sticky;
      left: 0;
      z-index: 10;
      background: #f0f4fa;
      font-weight: 600;
      font-size: 0.78rem;
      color: #1e3a5f;
      padding: 8px 12px;
      border-right: 2px solid #c9d8ea;
      border-bottom: 1px solid #e2e8f0;
      white-space: nowrap;
    }
    tbody tr:hover td:first-child { background: #dbeafe; }
    tbody td {
      padding: 4px 6px;
      border-right: 1px solid #e2e8f0;
      border-bottom: 1px solid #e2e8f0;
      text-align: center;
      font-size: 0.82rem;
      background: #fff;
    }
    tbody tr:hover td { background: #f0f7ff; }
    tbody tr:hover td:first-child { background: #dbeafe; }

    /* Input cell style */
    .cell-input {
      width: 90px;
      padding: 4px 6px;
      border: 1px solid transparent;
      border-radius: 4px;
      text-align: center;
      font-size: 0.82rem;
      background: transparent;
      transition: all 0.15s;
    }
    .cell-input:focus {
      outline: none;
      border-color: #3b82f6;
      background: #eff6ff;
      box-shadow: 0 0 0 2px #bfdbfe;
    }
    .cell-input:not(:focus):not(:placeholder-shown) {
      color: #1e3a5f;
      font-weight: 500;
    }
    select.cell-input {
      width: 110px;
      cursor: pointer;
    }
    select.cell-input option[value="Operasi"]           { color: #16a34a; }
    select.cell-input option[value="Standby"]           { color: #d97706; }
    select.cell-input option[value="Pemeliharaan"]      { color: #2563eb; }
    select.cell-input option[value="Gangguan"]          { color: #dc2626; }
    select.cell-input option[value="Rusak Permanen"]    { color: #7f1d1d; }

    /* Badge status */
    .badge { display:inline-block; padding:2px 9px; border-radius:999px; font-size:0.7rem; font-weight:600; }
    .badge-operasi        { background:#dcfce7; color:#15803d; }
    .badge-standby        { background:#fef9c3; color:#b45309; }
    .badge-pemeliharaan   { background:#dbeafe; color:#1d4ed8; }
    .badge-gangguan       { background:#fee2e2; color:#b91c1c; }
    .badge-rusak          { background:#fce7f3; color:#9d174d; }

    /* Toolbar */
    .toolbar { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
    .btn { padding:7px 16px; border-radius:6px; font-size:0.82rem; font-weight:600; cursor:pointer; border:none; display:inline-flex; align-items:center; gap:6px; transition:all 0.15s; }
    .btn-primary { background:#1e3a5f; color:#fff; }
    .btn-primary:hover { background:#2563eb; }
    .btn-success { background:#16a34a; color:#fff; }
    .btn-success:hover { background:#15803d; }
    .btn-danger  { background:#dc2626; color:#fff; }
    .btn-danger:hover  { background:#b91c1c; }
    .btn-outline { background:#fff; color:#1e3a5f; border:1px solid #1e3a5f; }
    .btn-outline:hover { background:#eff6ff; }
    .btn-sm { padding:4px 10px; font-size:0.75rem; }

    /* Toast */
    #toast { position:fixed; bottom:24px; right:24px; z-index:9999; display:flex; flex-direction:column; gap:8px; }
    .toast-item { padding:10px 18px; border-radius:8px; color:#fff; font-size:0.85rem; font-weight:500; box-shadow:0 4px 16px rgba(0,0,0,0.18); animation:slideIn 0.3s ease; }
    .toast-success { background:#16a34a; }
    .toast-error   { background:#dc2626; }
    .toast-info    { background:#2563eb; }
    @keyframes slideIn { from{transform:translateX(120%);opacity:0} to{transform:translateX(0);opacity:1} }

    /* Modal */
    .modal-overlay { position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:1000;display:flex;align-items:center;justify-content:center; }
    .modal-box { background:#fff;border-radius:12px;padding:28px;width:360px;max-width:95vw;box-shadow:0 8px 32px rgba(0,0,0,0.22); }
    .modal-title { font-size:1.1rem;font-weight:700;color:#1e3a5f;margin-bottom:16px; }

    /* Loading spinner */
    .spinner { display:inline-block;width:18px;height:18px;border:3px solid #bfdbfe;border-top:3px solid #2563eb;border-radius:50%;animation:spin 0.7s linear infinite; }
    @keyframes spin { to{transform:rotate(360deg)} }

    /* Divider label row */
    .row-section td { background:#f8fafc !important; font-size:0.7rem; color:#64748b; font-style:italic; padding:2px 12px !important; }
  </style>
</head>
<body class="bg-slate-100 min-h-screen">

<!-- HEADER -->
<header class="bg-[#1e3a5f] text-white px-6 py-3 flex items-center gap-4 shadow-lg">
  <i class="fas fa-gauge-high text-2xl text-blue-300"></i>
  <div>
    <h1 class="text-lg font-bold tracking-wide">MONITORING MESIN</h1>
    <p class="text-xs text-blue-200" id="last-update">—</p>
  </div>
  <div class="ml-auto flex gap-2 items-center flex-wrap">
    <button class="btn btn-outline text-white border-blue-300" onclick="showAddMesinModal()">
      <i class="fas fa-plus"></i> Tambah Mesin
    </button>
    <button class="btn btn-success" onclick="saveAllData()">
      <i class="fas fa-save"></i> Simpan Semua
    </button>
  </div>
</header>

<!-- TOOLBAR -->
<div class="px-6 py-3 bg-white shadow-sm border-b border-slate-200">
  <div class="toolbar">
    <div class="flex items-center gap-2">
      <label class="text-sm font-semibold text-slate-600"><i class="fas fa-calendar mr-1"></i>Tanggal:</label>
      <input type="date" id="sel-tanggal" class="border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
    </div>
    <div class="flex items-center gap-2">
      <label class="text-sm font-semibold text-slate-600"><i class="fas fa-clock mr-1"></i>Jam:</label>
      <select id="sel-jam" class="border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
        ${Array.from({length:24}, (_,i) => `<option value="${String(i).padStart(2,'0')}:00">${String(i).padStart(2,'0')}:00</option>`).join('')}
      </select>
    </div>
    <button class="btn btn-primary" onclick="loadData()">
      <i class="fas fa-search"></i> Tampilkan
    </button>
    <button class="btn btn-outline" onclick="showRiwayat()">
      <i class="fas fa-history"></i> Riwayat
    </button>
    <div id="loading-indicator" class="hidden"><span class="spinner"></span></div>
    <div class="ml-auto text-xs text-slate-400" id="info-record"></div>
  </div>
</div>

<!-- TABLE WRAPPER -->
<div class="px-4 py-3">
  <div class="table-wrap" id="table-container">
    <table id="main-table">
      <thead id="table-head"></thead>
      <tbody id="table-body"></tbody>
    </table>
  </div>
</div>

<!-- TOAST CONTAINER -->
<div id="toast"></div>

<!-- MODAL TAMBAH MESIN -->
<div id="modal-mesin" class="modal-overlay hidden">
  <div class="modal-box">
    <div class="modal-title"><i class="fas fa-cog mr-2"></i>Tambah Mesin Baru</div>
    <input type="text" id="input-nama-mesin" placeholder="Nama mesin (contoh: Mesin 4)"
      class="w-full border border-slate-300 rounded px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400" />
    <div class="flex gap-2 justify-end">
      <button class="btn btn-outline" onclick="closeModal('modal-mesin')">Batal</button>
      <button class="btn btn-primary" onclick="addMesin()"><i class="fas fa-plus"></i> Tambah</button>
    </div>
  </div>
</div>

<!-- MODAL RIWAYAT -->
<div id="modal-riwayat" class="modal-overlay hidden">
  <div class="modal-box" style="width:420px">
    <div class="modal-title"><i class="fas fa-history mr-2"></i>Riwayat Data</div>
    <p class="text-sm text-slate-500 mb-3">Pilih tanggal dan jam untuk melihat data:</p>
    <div id="riwayat-list" class="max-h-64 overflow-y-auto flex flex-col gap-1"></div>
    <div class="flex justify-end mt-4">
      <button class="btn btn-outline" onclick="closeModal('modal-riwayat')">Tutup</button>
    </div>
  </div>
</div>

<script>
// =============================================
// STATE
// =============================================
let mesinList = []
let currentData = {}  // { mesin_id: { field: value } }
const PARAMS = [
  { key:'daya_mampu',         label:'Daya Mampu',          unit:'kW',   type:'number' },
  { key:'beban',              label:'Beban',               unit:'kW',   type:'number' },
  { key:'stand_kwh',          label:'Stand KWH',           unit:'kWh',  type:'number' },
  { key:'stand_bbm',          label:'Stand BBM',           unit:'ltr',  type:'number' },
  { key:'phasa_r',            label:'Phasa R',             unit:'A',    type:'number' },
  { key:'phasa_s',            label:'Phasa S',             unit:'A',    type:'number' },
  { key:'phasa_t',            label:'Phasa T',             unit:'A',    type:'number' },
  { key:'tek_oli',            label:'Tek. Oli',            unit:'bar',  type:'number' },
  { key:'temp_air_pendingin', label:'Temp Air Pendingin',  unit:'°C',   type:'number' },
  { key:'tegangan',           label:'Tegangan',            unit:'V',    type:'number' },
  { key:'frequency',          label:'Frequency',           unit:'Hz',   type:'number' },
  { key:'cos_phi',            label:'Cos Phi',             unit:'',     type:'number' },
  { key:'jam_kerja_mesin',    label:'Jam Kerja Mesin',     unit:'Jam',  type:'number' },
  { key:'status_mesin',       label:'Status Mesin',        unit:'',     type:'select' },
  { key:'kwh_produksi',       label:'KWH Produksi',        unit:'kWh',  type:'number' },
  { key:'pemakaian_bbm',      label:'Pemakaian BBM',       unit:'ltr',  type:'number' },
]
const STATUS_OPTIONS = ['Operasi','Standby','Pemeliharaan','Gangguan','Rusak Permanen']

// =============================================
// INIT
// =============================================
document.addEventListener('DOMContentLoaded', async () => {
  // Set today's date
  const today = new Date()
  document.getElementById('sel-tanggal').value = today.toISOString().split('T')[0]
  // Set current hour
  const hr = String(today.getHours()).padStart(2,'0') + ':00'
  document.getElementById('sel-jam').value = hr
  // Update header timestamp
  document.getElementById('last-update').textContent = 'Update: ' + today.toLocaleString('id-ID')
  // Load mesin
  await loadMesin()
  // Render empty table
  renderTable()
  // Load data for current period
  await loadData()
})

// =============================================
// LOAD MESIN
// =============================================
async function loadMesin() {
  try {
    const res = await fetch('/api/mesin')
    const json = await res.json()
    if (json.success) mesinList = json.data
  } catch(e) { showToast('Gagal memuat daftar mesin', 'error') }
}

// =============================================
// RENDER TABLE
// =============================================
function renderTable() {
  const thead = document.getElementById('table-head')
  const tbody = document.getElementById('table-body')

  // HEADER ROW
  let headHTML = '<tr><th>Parameter</th>'
  mesinList.forEach(m => {
    headHTML += \`<th>\${m.nama}</th>\`
  })
  headHTML += '</tr>'
  thead.innerHTML = headHTML

  // BODY ROWS
  let bodyHTML = ''
  PARAMS.forEach((p, idx) => {
    // section divider
    if (idx === 13) {
      bodyHTML += '<tr class="row-section"><td colspan="' + (mesinList.length+1) + '">— Produksi —</td></tr>'
    }
    bodyHTML += \`<tr data-param="\${p.key}">\`
    // First column: parameter label
    bodyHTML += \`<td>
      <span class="text-slate-700">\${p.label}</span>
      \${p.unit ? '<span class="ml-1 text-slate-400 text-xs font-normal">(' + p.unit + ')</span>' : ''}
    </td>\`
    // Input cells per mesin
    mesinList.forEach(m => {
      const val = currentData[m.id]?.[p.key] ?? ''
      if (p.type === 'select') {
        bodyHTML += \`<td>
          <select class="cell-input" data-mesin="\${m.id}" data-field="\${p.key}" onchange="setCellValue(\${m.id},'\${p.key}',this.value)">\`
        STATUS_OPTIONS.forEach(opt => {
          bodyHTML += \`<option value="\${opt}" \${val===opt||(!val&&opt==='Operasi')?'selected':''}>\${opt}</option>\`
        })
        bodyHTML += '</select></td>'
      } else {
        bodyHTML += \`<td>
          <input type="number" step="any" class="cell-input" placeholder="—"
            data-mesin="\${m.id}" data-field="\${p.key}"
            value="\${val !== '' && val !== null ? val : ''}"
            oninput="setCellValue(\${m.id},'\${p.key}',this.value)" />
        </td>\`
      }
    })
    bodyHTML += '</tr>'
  })
  tbody.innerHTML = bodyHTML
}

// =============================================
// SET CELL VALUE IN STATE
// =============================================
function setCellValue(mesinId, field, value) {
  if (!currentData[mesinId]) currentData[mesinId] = {}
  currentData[mesinId][field] = value === '' ? null : (field === 'status_mesin' ? value : parseFloat(value))
}

// =============================================
// LOAD DATA FROM API
// =============================================
async function loadData() {
  const tanggal = document.getElementById('sel-tanggal').value
  const jam     = document.getElementById('sel-jam').value
  if (!tanggal) { showToast('Pilih tanggal terlebih dahulu', 'info'); return }

  showLoading(true)
  try {
    const res  = await fetch(\`/api/monitoring?tanggal=\${tanggal}&jam=\${jam}\`)
    const json = await res.json()
    if (!json.success) throw new Error(json.error)

    // Reset currentData
    currentData = {}
    // Initialize all mesin with defaults
    mesinList.forEach(m => { currentData[m.id] = { status_mesin: 'Operasi' } })

    // Fill from API
    json.data.forEach(row => {
      currentData[row.mesin_id] = {
        daya_mampu:         row.daya_mampu,
        beban:              row.beban,
        stand_kwh:          row.stand_kwh,
        stand_bbm:          row.stand_bbm,
        phasa_r:            row.phasa_r,
        phasa_s:            row.phasa_s,
        phasa_t:            row.phasa_t,
        tek_oli:            row.tek_oli,
        temp_air_pendingin: row.temp_air_pendingin,
        tegangan:           row.tegangan,
        frequency:          row.frequency,
        cos_phi:            row.cos_phi,
        jam_kerja_mesin:    row.jam_kerja_mesin,
        status_mesin:       row.status_mesin,
        kwh_produksi:       row.kwh_produksi,
        pemakaian_bbm:      row.pemakaian_bbm,
      }
    })

    renderTable()
    const cnt = json.data.length
    document.getElementById('info-record').textContent = cnt > 0
      ? \`\${cnt} mesin sudah ada data pada \${tanggal} \${jam}\`
      : \`Belum ada data untuk \${tanggal} \${jam}\`
    document.getElementById('last-update').textContent = 'Ditampilkan: ' + tanggal + ' Jam ' + jam
  } catch(e) {
    showToast('Gagal memuat data: ' + e.message, 'error')
  } finally {
    showLoading(false)
  }
}

// =============================================
// SAVE ALL DATA
// =============================================
async function saveAllData() {
  const tanggal = document.getElementById('sel-tanggal').value
  const jam     = document.getElementById('sel-jam').value
  if (!tanggal || !jam) { showToast('Pilih tanggal dan jam terlebih dahulu', 'info'); return }

  const records = mesinList.map(m => ({
    mesin_id: m.id,
    ...(currentData[m.id] || { status_mesin: 'Operasi' })
  }))

  showLoading(true)
  try {
    const res  = await fetch('/api/monitoring/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tanggal, jam, records })
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.error)
    showToast(\`Data berhasil disimpan! (\${json.saved} mesin, \${tanggal} \${jam})\`, 'success')
    document.getElementById('last-update').textContent = 'Disimpan: ' + new Date().toLocaleString('id-ID')
  } catch(e) {
    showToast('Gagal menyimpan: ' + e.message, 'error')
  } finally {
    showLoading(false)
  }
}

// =============================================
// TAMBAH MESIN
// =============================================
function showAddMesinModal() {
  document.getElementById('input-nama-mesin').value = ''
  document.getElementById('modal-mesin').classList.remove('hidden')
  setTimeout(() => document.getElementById('input-nama-mesin').focus(), 100)
}

async function addMesin() {
  const nama = document.getElementById('input-nama-mesin').value.trim()
  if (!nama) { showToast('Nama mesin tidak boleh kosong', 'error'); return }
  try {
    const res  = await fetch('/api/mesin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama })
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.error)
    closeModal('modal-mesin')
    showToast(\`Mesin "\${nama}" berhasil ditambahkan\`, 'success')
    await loadMesin()
    renderTable()
  } catch(e) {
    showToast('Gagal menambah mesin: ' + e.message, 'error')
  }
}

// Enter key on input
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !document.getElementById('modal-mesin').classList.contains('hidden')) {
    addMesin()
  }
})

// =============================================
// RIWAYAT
// =============================================
async function showRiwayat() {
  const modal = document.getElementById('modal-riwayat')
  const list  = document.getElementById('riwayat-list')
  list.innerHTML = '<div class="text-sm text-slate-400 text-center py-4"><span class="spinner"></span> Memuat...</div>'
  modal.classList.remove('hidden')
  try {
    const res  = await fetch('/api/monitoring/tanggal')
    const json = await res.json()
    if (!json.success) throw new Error(json.error)
    if (json.data.length === 0) {
      list.innerHTML = '<div class="text-sm text-slate-400 text-center py-4">Belum ada data tersimpan</div>'
      return
    }
    list.innerHTML = json.data.map(row => \`
      <button class="w-full text-left px-3 py-2 rounded hover:bg-blue-50 border border-slate-200 text-sm flex items-center gap-2"
        onclick="selectRiwayat('\${row.tanggal}')">
        <i class="fas fa-calendar-day text-blue-400"></i>
        <span class="font-medium text-slate-700">\${row.tanggal}</span>
      </button>
    \`).join('')
  } catch(e) {
    list.innerHTML = '<div class="text-sm text-red-400 text-center py-4">Gagal memuat riwayat</div>'
  }
}

async function selectRiwayat(tanggal) {
  document.getElementById('sel-tanggal').value = tanggal
  closeModal('modal-riwayat')
  // Also fetch available jam for that date
  try {
    const res  = await fetch(\`/api/monitoring/jam?tanggal=\${tanggal}\`)
    const json = await res.json()
    if (json.success && json.data.length > 0) {
      document.getElementById('sel-jam').value = json.data[0].jam
    }
  } catch(e) {}
  await loadData()
}

// =============================================
// UTILS
// =============================================
function closeModal(id) { document.getElementById(id).classList.add('hidden') }

function showLoading(show) {
  document.getElementById('loading-indicator').classList.toggle('hidden', !show)
}

function showToast(msg, type='info') {
  const container = document.getElementById('toast')
  const el = document.createElement('div')
  el.className = \`toast-item toast-\${type}\`
  el.innerHTML = \`<i class="fas fa-\${type==='success'?'check-circle':type==='error'?'circle-xmark':'info-circle'} mr-2"></i>\${msg}\`
  container.appendChild(el)
  setTimeout(() => el.remove(), 3500)
}

// Click outside modal to close
document.querySelectorAll('.modal-overlay').forEach(el => {
  el.addEventListener('click', (e) => { if (e.target === el) el.classList.add('hidden') })
})
</script>
</body>
</html>`
}

export default app
