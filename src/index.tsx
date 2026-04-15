import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()
app.use('/api/*', cors())

// ============================================================
// DATA UNIT (dari JSON)
// ============================================================
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

// ============================================================
// INIT DATABASE
// ============================================================
async function initDB(db: D1Database) {
  // Tabel mesin
  await db.prepare(`CREATE TABLE IF NOT EXISTS mesin (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT NOT NULL UNIQUE,
    urutan INTEGER DEFAULT 0,
    aktif INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`).run()

  // Tabel data monitoring
  await db.prepare(`CREATE TABLE IF NOT EXISTS data_monitoring (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mesin_id INTEGER NOT NULL,
    tanggal TEXT NOT NULL,
    jam TEXT NOT NULL,
    daya_mampu REAL, beban REAL, stand_kwh REAL, stand_bbm REAL,
    phasa_r REAL, phasa_s REAL, phasa_t REAL, tek_oli REAL,
    temp_air_pendingin REAL, tegangan REAL, frequency REAL, cos_phi REAL,
    jam_kerja_mesin REAL, status_mesin TEXT DEFAULT 'Operasi',
    kwh_produksi REAL, pemakaian_bbm REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mesin_id) REFERENCES mesin(id)
  )`).run()

  await db.prepare(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_mesin_jam ON data_monitoring(mesin_id, tanggal, jam)`
  ).run()

  // Tabel lap operasional
  await db.prepare(`CREATE TABLE IF NOT EXISTS lap_operasional (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kode_unit INTEGER NOT NULL,
    nama_unit TEXT NOT NULL,
    tanggal TEXT NOT NULL,
    nama_operator TEXT,
    kwh_produksi REAL,
    saldo_awal REAL,
    saldo_akhir REAL,
    penerimaan_bbm REAL,
    estimasi_bbm_max REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`).run()

  await db.prepare(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_lap_ops ON lap_operasional(kode_unit, tanggal)`
  ).run()

  // Seed mesin default
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
// API: MESIN
// ============================================================
app.get('/api/mesin', async (c) => {
  try {
    await initDB(c.env.DB)
    const result = await c.env.DB.prepare('SELECT * FROM mesin WHERE aktif=1 ORDER BY urutan, nama').all()
    return c.json({ success: true, data: result.results })
  } catch (e: any) { return c.json({ success: false, error: e.message }, 500) }
})

app.post('/api/mesin', async (c) => {
  try {
    const { nama } = await c.req.json()
    if (!nama) return c.json({ success: false, error: 'Nama mesin wajib diisi' }, 400)
    const maxUrutan = await c.env.DB.prepare('SELECT MAX(urutan) as m FROM mesin').first<{ m: number }>()
    const urutan = (maxUrutan?.m || 0) + 1
    const result = await c.env.DB.prepare('INSERT INTO mesin (nama, urutan) VALUES (?, ?)').bind(nama, urutan).run()
    return c.json({ success: true, id: result.meta.last_row_id })
  } catch (e: any) { return c.json({ success: false, error: e.message }, 500) }
})

app.delete('/api/mesin/:id', async (c) => {
  try {
    const id = c.req.param('id')
    await c.env.DB.prepare('UPDATE mesin SET aktif=0 WHERE id=?').bind(id).run()
    return c.json({ success: true })
  } catch (e: any) { return c.json({ success: false, error: e.message }, 500) }
})

// ============================================================
// API: MONITORING
// ============================================================
app.get('/api/monitoring', async (c) => {
  try {
    await initDB(c.env.DB)
    const tanggal = c.req.query('tanggal') || new Date().toISOString().split('T')[0]
    const jam = c.req.query('jam') || null
    let query = `SELECT dm.*, m.nama as nama_mesin FROM data_monitoring dm JOIN mesin m ON dm.mesin_id = m.id WHERE dm.tanggal = ?`
    const params: any[] = [tanggal]
    if (jam) { query += ' AND dm.jam = ?'; params.push(jam) }
    query += ' ORDER BY dm.jam, m.urutan'
    const result = await c.env.DB.prepare(query).bind(...params).all()
    return c.json({ success: true, data: result.results })
  } catch (e: any) { return c.json({ success: false, error: e.message }, 500) }
})

app.get('/api/monitoring/tanggal', async (c) => {
  try {
    const result = await c.env.DB.prepare('SELECT DISTINCT tanggal FROM data_monitoring ORDER BY tanggal DESC LIMIT 90').all()
    return c.json({ success: true, data: result.results })
  } catch (e: any) { return c.json({ success: false, error: e.message }, 500) }
})

app.get('/api/monitoring/jam', async (c) => {
  try {
    const tanggal = c.req.query('tanggal') || new Date().toISOString().split('T')[0]
    const result = await c.env.DB.prepare('SELECT DISTINCT jam FROM data_monitoring WHERE tanggal=? ORDER BY jam').bind(tanggal).all()
    return c.json({ success: true, data: result.results })
  } catch (e: any) { return c.json({ success: false, error: e.message }, 500) }
})

app.post('/api/monitoring/batch', async (c) => {
  try {
    const { tanggal, jam, records } = await c.req.json()
    if (!tanggal || !jam || !records || !Array.isArray(records))
      return c.json({ success: false, error: 'tanggal, jam, records wajib diisi' }, 400)
    const stmts = records.map((r: any) =>
      c.env.DB.prepare(`
        INSERT INTO data_monitoring
          (mesin_id,tanggal,jam,daya_mampu,beban,stand_kwh,stand_bbm,phasa_r,phasa_s,phasa_t,tek_oli,
           temp_air_pendingin,tegangan,frequency,cos_phi,jam_kerja_mesin,status_mesin,kwh_produksi,pemakaian_bbm,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
        ON CONFLICT(mesin_id,tanggal,jam) DO UPDATE SET
          daya_mampu=excluded.daya_mampu,beban=excluded.beban,stand_kwh=excluded.stand_kwh,stand_bbm=excluded.stand_bbm,
          phasa_r=excluded.phasa_r,phasa_s=excluded.phasa_s,phasa_t=excluded.phasa_t,tek_oli=excluded.tek_oli,
          temp_air_pendingin=excluded.temp_air_pendingin,tegangan=excluded.tegangan,frequency=excluded.frequency,
          cos_phi=excluded.cos_phi,jam_kerja_mesin=excluded.jam_kerja_mesin,status_mesin=excluded.status_mesin,
          kwh_produksi=excluded.kwh_produksi,pemakaian_bbm=excluded.pemakaian_bbm,updated_at=CURRENT_TIMESTAMP
      `).bind(
        r.mesin_id, tanggal, jam,
        r.daya_mampu??null, r.beban??null, r.stand_kwh??null, r.stand_bbm??null,
        r.phasa_r??null, r.phasa_s??null, r.phasa_t??null, r.tek_oli??null,
        r.temp_air_pendingin??null, r.tegangan??null, r.frequency??null,
        r.cos_phi??null, r.jam_kerja_mesin??null,
        r.status_mesin||'Operasi', r.kwh_produksi??null, r.pemakaian_bbm??null
      )
    )
    await c.env.DB.batch(stmts)
    return c.json({ success: true, saved: records.length })
  } catch (e: any) { return c.json({ success: false, error: e.message }, 500) }
})

// ============================================================
// API: LAP. OPERASIONAL
// ============================================================
app.get('/api/units', (c) => {
  return c.json({ success: true, data: UNIT_DATA })
})

app.get('/api/lap-operasional', async (c) => {
  try {
    await initDB(c.env.DB)
    const tanggal   = c.req.query('tanggal') || new Date().toISOString().split('T')[0]
    const kode_unit = c.req.query('kode_unit') || null
    let query = `SELECT * FROM lap_operasional WHERE tanggal = ?`
    const params: any[] = [tanggal]
    if (kode_unit) { query += ' AND kode_unit = ?'; params.push(kode_unit) }
    query += ' ORDER BY kode_unit'
    const result = await c.env.DB.prepare(query).bind(...params).all()
    return c.json({ success: true, data: result.results })
  } catch (e: any) { return c.json({ success: false, error: e.message }, 500) }
})

app.get('/api/lap-operasional/tanggal', async (c) => {
  try {
    const result = await c.env.DB.prepare(
      'SELECT DISTINCT tanggal FROM lap_operasional ORDER BY tanggal DESC LIMIT 90'
    ).all()
    return c.json({ success: true, data: result.results })
  } catch (e: any) { return c.json({ success: false, error: e.message }, 500) }
})

app.post('/api/lap-operasional', async (c) => {
  try {
    await initDB(c.env.DB)
    const body = await c.req.json()
    const { kode_unit, nama_unit, tanggal, nama_operator, kwh_produksi, saldo_awal, saldo_akhir, penerimaan_bbm, estimasi_bbm_max } = body
    if (!kode_unit || !tanggal) return c.json({ success: false, error: 'kode_unit dan tanggal wajib diisi' }, 400)
    await c.env.DB.prepare(`
      INSERT INTO lap_operasional (kode_unit,nama_unit,tanggal,nama_operator,kwh_produksi,saldo_awal,saldo_akhir,penerimaan_bbm,estimasi_bbm_max,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
      ON CONFLICT(kode_unit,tanggal) DO UPDATE SET
        nama_unit=excluded.nama_unit, nama_operator=excluded.nama_operator,
        kwh_produksi=excluded.kwh_produksi, saldo_awal=excluded.saldo_awal,
        saldo_akhir=excluded.saldo_akhir, penerimaan_bbm=excluded.penerimaan_bbm,
        estimasi_bbm_max=excluded.estimasi_bbm_max, updated_at=CURRENT_TIMESTAMP
    `).bind(
      kode_unit, nama_unit||'', tanggal, nama_operator||'',
      kwh_produksi??null, saldo_awal??null, saldo_akhir??null,
      penerimaan_bbm??null, estimasi_bbm_max??null
    ).run()
    return c.json({ success: true })
  } catch (e: any) { return c.json({ success: false, error: e.message }, 500) }
})

// ============================================================
// SERVE MAIN PAGE
// ============================================================
app.get('/', (c) => c.html(getHTML()))

function getHTML(): string {
  const unitJson = JSON.stringify(UNIT_DATA)
  const jamOptions = Array.from({length:24}, (_,i) =>
    `<option value="${String(i).padStart(2,'0')}:00">${String(i).padStart(2,'0')}:00</option>`
  ).join('')

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Sistem Operasional</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet"/>
  <style>
    /* ===== STICKY TABLE HEADER ===== */
    .table-wrap { overflow:auto; max-height:calc(100vh - 230px); border-radius:0.5rem; border:1px solid #e5e7eb; box-shadow:0 2px 8px rgba(0,0,0,0.07); }
    table { border-collapse:collapse; width:100%; }
    thead th { position:sticky; top:0; z-index:20; background:#1e3a5f; color:#fff; font-size:0.75rem; font-weight:600; white-space:nowrap; padding:10px 12px; border-right:1px solid #2d5382; text-align:center; }
    thead th:first-child { position:sticky; left:0; z-index:30; background:#152d4a; min-width:175px; }
    tbody td:first-child { position:sticky; left:0; z-index:10; background:#f0f4fa; font-weight:600; font-size:0.78rem; color:#1e3a5f; padding:8px 12px; border-right:2px solid #c9d8ea; border-bottom:1px solid #e2e8f0; white-space:nowrap; }
    tbody tr:hover td:first-child { background:#dbeafe; }
    tbody td { padding:4px 6px; border-right:1px solid #e2e8f0; border-bottom:1px solid #e2e8f0; text-align:center; font-size:0.82rem; background:#fff; }
    tbody tr:hover td { background:#f0f7ff; }
    .cell-input { width:90px; padding:4px 6px; border:1px solid transparent; border-radius:4px; text-align:center; font-size:0.82rem; background:transparent; transition:all 0.15s; }
    .cell-input:focus { outline:none; border-color:#3b82f6; background:#eff6ff; box-shadow:0 0 0 2px #bfdbfe; }
    .cell-input:not(:focus):not(:placeholder-shown) { color:#1e3a5f; font-weight:500; }
    select.cell-input { width:115px; cursor:pointer; }
    .row-section td { background:#f8fafc !important; font-size:0.7rem; color:#64748b; font-style:italic; padding:2px 12px !important; }

    /* ===== TAB ===== */
    .tab-btn { padding:9px 22px; border-radius:8px 8px 0 0; font-size:0.82rem; font-weight:700; cursor:pointer; border:none; border-bottom:3px solid transparent; transition:all 0.18s; color:#64748b; background:#f1f5f9; letter-spacing:0.03em; }
    .tab-btn.active { background:#1e3a5f; color:#fff; border-bottom:3px solid #38bdf8; }
    .tab-btn:not(.active):hover { background:#e2e8f0; color:#1e3a5f; }
    .tab-content { display:none; }
    .tab-content.active { display:block; }

    /* ===== LAP OPERASIONAL FORM ===== */
    .lap-form-wrap { overflow:auto; max-height:calc(100vh - 230px); }
    .lap-card { background:#fff; border-radius:10px; border:1px solid #e2e8f0; box-shadow:0 1px 4px rgba(0,0,0,0.06); overflow:hidden; margin-bottom:12px; }
    .lap-card-header { background:#1e3a5f; color:#fff; padding:10px 16px; display:flex; align-items:center; justify-content:space-between; }
    .lap-card-header .unit-name { font-size:0.92rem; font-weight:700; }
    .lap-card-header .unit-area { font-size:0.72rem; color:#93c5fd; }
    .lap-card-header .unit-kode { font-size:0.72rem; background:rgba(255,255,255,0.15); border-radius:4px; padding:2px 8px; }
    .lap-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; padding:14px 16px; }
    .lap-field label { font-size:0.72rem; font-weight:600; color:#64748b; display:block; margin-bottom:3px; }
    .lap-field input { width:100%; padding:6px 10px; border:1px solid #e2e8f0; border-radius:6px; font-size:0.82rem; color:#1e3a5f; transition:all 0.15s; }
    .lap-field input:focus { outline:none; border-color:#3b82f6; box-shadow:0 0 0 2px #bfdbfe; }
    .lap-field.full { grid-column:1/-1; }
    .lap-saved { font-size:0.7rem; color:#16a34a; display:none; }
    .lap-saved.show { display:inline-flex; align-items:center; gap:4px; }

    /* ===== BTN ===== */
    .btn { padding:7px 16px; border-radius:6px; font-size:0.82rem; font-weight:600; cursor:pointer; border:none; display:inline-flex; align-items:center; gap:6px; transition:all 0.15s; }
    .btn-primary { background:#1e3a5f; color:#fff; } .btn-primary:hover { background:#2563eb; }
    .btn-success { background:#16a34a; color:#fff; } .btn-success:hover { background:#15803d; }
    .btn-outline { background:#fff; color:#1e3a5f; border:1px solid #1e3a5f; } .btn-outline:hover { background:#eff6ff; }
    .toolbar { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }

    /* ===== TOAST ===== */
    #toast { position:fixed; bottom:24px; right:24px; z-index:9999; display:flex; flex-direction:column; gap:8px; }
    .toast-item { padding:10px 18px; border-radius:8px; color:#fff; font-size:0.85rem; font-weight:500; box-shadow:0 4px 16px rgba(0,0,0,0.18); animation:slideIn 0.3s ease; }
    .toast-success { background:#16a34a; } .toast-error { background:#dc2626; } .toast-info { background:#2563eb; }
    @keyframes slideIn { from{transform:translateX(120%);opacity:0} to{transform:translateX(0);opacity:1} }

    /* ===== MODAL ===== */
    .modal-overlay { position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:1000;display:flex;align-items:center;justify-content:center; }
    .modal-box { background:#fff;border-radius:12px;padding:28px;width:360px;max-width:95vw;box-shadow:0 8px 32px rgba(0,0,0,0.22); }
    .modal-title { font-size:1.1rem;font-weight:700;color:#1e3a5f;margin-bottom:16px; }
    .spinner { display:inline-block;width:18px;height:18px;border:3px solid #bfdbfe;border-top:3px solid #2563eb;border-radius:50%;animation:spin 0.7s linear infinite; }
    @keyframes spin { to{transform:rotate(360deg)} }

    /* ===== SEARCH BOX ===== */
    .search-unit { padding:7px 12px; border:1px solid #e2e8f0; border-radius:6px; font-size:0.82rem; width:220px; }
    .search-unit:focus { outline:none; border-color:#3b82f6; box-shadow:0 0 0 2px #bfdbfe; }
  </style>
</head>
<body class="bg-slate-100 min-h-screen">

<!-- ===== HEADER ===== -->
<header class="bg-[#1e3a5f] text-white px-6 py-3 flex items-center gap-4 shadow-lg">
  <i class="fas fa-gauge-high text-2xl text-blue-300"></i>
  <div>
    <div class="flex items-center gap-3">
      <!-- TAB BUTTONS di header -->
      <button id="tab-btn-monitoring" class="tab-btn active" onclick="switchTab('monitoring')">
        <i class="fas fa-table-cells mr-1"></i>MONITORING MESIN
      </button>
      <button id="tab-btn-laporan" class="tab-btn" onclick="switchTab('laporan')">
        <i class="fas fa-file-lines mr-1"></i>LAP. OPERASIONAL
      </button>
    </div>
    <p class="text-xs text-blue-200 mt-0.5" id="last-update">—</p>
  </div>
  <!-- Tombol konteks per tab -->
  <div class="ml-auto flex gap-2 items-center flex-wrap" id="header-actions-monitoring">
    <button class="btn btn-outline text-white border-blue-300" onclick="showAddMesinModal()">
      <i class="fas fa-plus"></i> Tambah Mesin
    </button>
    <button class="btn btn-success" onclick="saveAllData()">
      <i class="fas fa-save"></i> Simpan Semua
    </button>
  </div>
  <div class="ml-auto flex gap-2 items-center flex-wrap hidden" id="header-actions-laporan">
    <button class="btn btn-success" onclick="saveAllLap()">
      <i class="fas fa-save"></i> Simpan Semua
    </button>
  </div>
</header>

<!-- ===== TOOLBAR (shared) ===== -->
<div class="px-6 py-3 bg-white shadow-sm border-b border-slate-200">

  <!-- TOOLBAR MONITORING -->
  <div id="toolbar-monitoring" class="toolbar">
    <div class="flex items-center gap-2">
      <label class="text-sm font-semibold text-slate-600"><i class="fas fa-calendar mr-1"></i>Tanggal:</label>
      <input type="date" id="sel-tanggal" class="border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>
    </div>
    <div class="flex items-center gap-2">
      <label class="text-sm font-semibold text-slate-600"><i class="fas fa-clock mr-1"></i>Jam:</label>
      <select id="sel-jam" class="border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
        ${jamOptions}
      </select>
    </div>
    <button class="btn btn-primary" onclick="loadData()"><i class="fas fa-search"></i> Tampilkan</button>
    <button class="btn btn-outline" onclick="showRiwayat()"><i class="fas fa-history"></i> Riwayat</button>
    <div id="loading-indicator" class="hidden"><span class="spinner"></span></div>
    <div class="ml-auto text-xs text-slate-400" id="info-record"></div>
  </div>

  <!-- TOOLBAR LAP OPERASIONAL -->
  <div id="toolbar-laporan" class="toolbar hidden">
    <div class="flex items-center gap-2">
      <label class="text-sm font-semibold text-slate-600"><i class="fas fa-calendar mr-1"></i>Tanggal:</label>
      <input type="date" id="lap-tanggal" class="border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>
    </div>
    <button class="btn btn-primary" onclick="loadLapData()"><i class="fas fa-search"></i> Tampilkan</button>
    <button class="btn btn-outline" onclick="showRiwayatLap()"><i class="fas fa-history"></i> Riwayat</button>
    <input type="text" id="search-unit" class="search-unit" placeholder="&#xf002; Cari unit..." oninput="filterUnit(this.value)"/>
    <div id="loading-indicator-lap" class="hidden"><span class="spinner"></span></div>
    <div class="ml-auto text-xs text-slate-400" id="info-lap-record"></div>
  </div>
</div>

<!-- ===== TAB CONTENT: MONITORING MESIN ===== -->
<div id="tab-monitoring" class="tab-content active px-4 py-3">
  <div class="table-wrap" id="table-container">
    <table id="main-table">
      <thead id="table-head"></thead>
      <tbody id="table-body"></tbody>
    </table>
  </div>
</div>

<!-- ===== TAB CONTENT: LAP. OPERASIONAL ===== -->
<div id="tab-laporan" class="tab-content px-4 py-3">
  <div class="lap-form-wrap" id="lap-cards-container">
    <!-- Cards dirender oleh JS -->
  </div>
</div>

<!-- ===== TOAST ===== -->
<div id="toast"></div>

<!-- MODAL TAMBAH MESIN -->
<div id="modal-mesin" class="modal-overlay hidden">
  <div class="modal-box">
    <div class="modal-title"><i class="fas fa-cog mr-2"></i>Tambah Mesin Baru</div>
    <input type="text" id="input-nama-mesin" placeholder="Nama mesin (contoh: Mesin 4)"
      class="w-full border border-slate-300 rounded px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"/>
    <div class="flex gap-2 justify-end">
      <button class="btn btn-outline" onclick="closeModal('modal-mesin')">Batal</button>
      <button class="btn btn-primary" onclick="addMesin()"><i class="fas fa-plus"></i> Tambah</button>
    </div>
  </div>
</div>

<!-- MODAL RIWAYAT MONITORING -->
<div id="modal-riwayat" class="modal-overlay hidden">
  <div class="modal-box" style="width:420px">
    <div class="modal-title"><i class="fas fa-history mr-2"></i>Riwayat Data Monitoring</div>
    <p class="text-sm text-slate-500 mb-3">Pilih tanggal untuk melihat data:</p>
    <div id="riwayat-list" class="max-h-64 overflow-y-auto flex flex-col gap-1"></div>
    <div class="flex justify-end mt-4">
      <button class="btn btn-outline" onclick="closeModal('modal-riwayat')">Tutup</button>
    </div>
  </div>
</div>

<!-- MODAL RIWAYAT LAP OPERASIONAL -->
<div id="modal-riwayat-lap" class="modal-overlay hidden">
  <div class="modal-box" style="width:420px">
    <div class="modal-title"><i class="fas fa-history mr-2"></i>Riwayat Lap. Operasional</div>
    <p class="text-sm text-slate-500 mb-3">Pilih tanggal untuk melihat data:</p>
    <div id="riwayat-lap-list" class="max-h-64 overflow-y-auto flex flex-col gap-1"></div>
    <div class="flex justify-end mt-4">
      <button class="btn btn-outline" onclick="closeModal('modal-riwayat-lap')">Tutup</button>
    </div>
  </div>
</div>

<script>
// =============================================
// DATA & STATE
// =============================================
const UNIT_DATA = ${unitJson}
let mesinList   = []
let currentData = {}
let lapData     = {}   // { kode_unit: { field: val } }
let allCards    = []   // untuk filter

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
const LAP_FIELDS = [
  { key:'nama_operator',    label:'Nama Operator',                    type:'text',   full:true  },
  { key:'kwh_produksi',     label:'kWh Produksi (kWh)',              type:'number', full:false },
  { key:'saldo_awal',       label:'Saldo Awal (ltr)',                 type:'number', full:false },
  { key:'saldo_akhir',      label:'Saldo Akhir (ltr)',                type:'number', full:false },
  { key:'penerimaan_bbm',   label:'Penerimaan BBM (ltr)',             type:'number', full:false },
  { key:'estimasi_bbm_max', label:'Estimasi Pemakaian BBM Maks (ltr)',type:'number', full:true  },
]

// =============================================
// INIT
// =============================================
document.addEventListener('DOMContentLoaded', async () => {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  document.getElementById('sel-tanggal').value = todayStr
  document.getElementById('lap-tanggal').value = todayStr
  document.getElementById('sel-jam').value = String(today.getHours()).padStart(2,'0') + ':00'
  document.getElementById('last-update').textContent = 'Update: ' + today.toLocaleString('id-ID')
  await loadMesin()
  renderTable()
  await loadData()
  renderLapCards()   // render kosong dulu
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
    const res  = await fetch('/api/mesin')
    const json = await res.json()
    if (json.success) mesinList = json.data
  } catch(e) { showToast('Gagal memuat daftar mesin','error') }
}

function renderTable() {
  const thead = document.getElementById('table-head')
  const tbody = document.getElementById('table-body')
  let headHTML = '<tr><th>Parameter</th>'
  mesinList.forEach(m => { headHTML += \`<th>\${m.nama}</th>\` })
  headHTML += '</tr>'
  thead.innerHTML = headHTML

  let bodyHTML = ''
  PARAMS.forEach((p, idx) => {
    if (idx === 13) bodyHTML += \`<tr class="row-section"><td colspan="\${mesinList.length+1}">— Produksi —</td></tr>\`
    bodyHTML += \`<tr data-param="\${p.key}">\`
    bodyHTML += \`<td><span class="text-slate-700">\${p.label}</span>\${p.unit?'<span class="ml-1 text-slate-400 text-xs font-normal">('+p.unit+')</span>':''}</td>\`
    mesinList.forEach(m => {
      const val = currentData[m.id]?.[p.key] ?? ''
      if (p.type === 'select') {
        bodyHTML += \`<td><select class="cell-input" onchange="setCellValue(\${m.id},'\${p.key}',this.value)">\`
        STATUS_OPTIONS.forEach(opt => { bodyHTML += \`<option value="\${opt}" \${val===opt||(!val&&opt==='Operasi')?'selected':''}>\${opt}</option>\` })
        bodyHTML += '</select></td>'
      } else {
        bodyHTML += \`<td><input type="number" step="any" class="cell-input" placeholder="—"
          value="\${val!==''&&val!==null?val:''}" oninput="setCellValue(\${m.id},'\${p.key}',this.value)"/></td>\`
      }
    })
    bodyHTML += '</tr>'
  })
  tbody.innerHTML = bodyHTML
}

function setCellValue(mesinId, field, value) {
  if (!currentData[mesinId]) currentData[mesinId] = {}
  currentData[mesinId][field] = value===''?null:(field==='status_mesin'?value:parseFloat(value))
}

async function loadData() {
  const tanggal = document.getElementById('sel-tanggal').value
  const jam     = document.getElementById('sel-jam').value
  if (!tanggal) { showToast('Pilih tanggal terlebih dahulu','info'); return }
  showLoading(true,'loading-indicator')
  try {
    const res  = await fetch(\`/api/monitoring?tanggal=\${tanggal}&jam=\${jam}\`)
    const json = await res.json()
    if (!json.success) throw new Error(json.error)
    currentData = {}
    mesinList.forEach(m => { currentData[m.id] = { status_mesin:'Operasi' } })
    json.data.forEach(row => {
      currentData[row.mesin_id] = { daya_mampu:row.daya_mampu, beban:row.beban, stand_kwh:row.stand_kwh, stand_bbm:row.stand_bbm, phasa_r:row.phasa_r, phasa_s:row.phasa_s, phasa_t:row.phasa_t, tek_oli:row.tek_oli, temp_air_pendingin:row.temp_air_pendingin, tegangan:row.tegangan, frequency:row.frequency, cos_phi:row.cos_phi, jam_kerja_mesin:row.jam_kerja_mesin, status_mesin:row.status_mesin, kwh_produksi:row.kwh_produksi, pemakaian_bbm:row.pemakaian_bbm }
    })
    renderTable()
    const cnt = json.data.length
    document.getElementById('info-record').textContent = cnt>0?\`\${cnt} mesin sudah ada data\`:\`Belum ada data untuk \${tanggal} \${jam}\`
    document.getElementById('last-update').textContent = \`Ditampilkan: \${tanggal} Jam \${jam}\`
  } catch(e) { showToast('Gagal memuat data: '+e.message,'error') }
  finally { showLoading(false,'loading-indicator') }
}

async function saveAllData() {
  const tanggal = document.getElementById('sel-tanggal').value
  const jam     = document.getElementById('sel-jam').value
  if (!tanggal||!jam) { showToast('Pilih tanggal dan jam','info'); return }
  const records = mesinList.map(m => ({ mesin_id:m.id, ...(currentData[m.id]||{status_mesin:'Operasi'}) }))
  showLoading(true,'loading-indicator')
  try {
    const res  = await fetch('/api/monitoring/batch',{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({tanggal,jam,records}) })
    const json = await res.json()
    if (!json.success) throw new Error(json.error)
    showToast(\`Data berhasil disimpan! (\${json.saved} mesin, \${tanggal} \${jam})\`,'success')
    document.getElementById('last-update').textContent = 'Disimpan: '+new Date().toLocaleString('id-ID')
  } catch(e) { showToast('Gagal menyimpan: '+e.message,'error') }
  finally { showLoading(false,'loading-indicator') }
}

function showAddMesinModal() {
  document.getElementById('input-nama-mesin').value = ''
  document.getElementById('modal-mesin').classList.remove('hidden')
  setTimeout(()=>document.getElementById('input-nama-mesin').focus(),100)
}
async function addMesin() {
  const nama = document.getElementById('input-nama-mesin').value.trim()
  if (!nama) { showToast('Nama mesin tidak boleh kosong','error'); return }
  try {
    const res  = await fetch('/api/mesin',{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({nama}) })
    const json = await res.json()
    if (!json.success) throw new Error(json.error)
    closeModal('modal-mesin')
    showToast(\`Mesin "\${nama}" berhasil ditambahkan\`,'success')
    await loadMesin(); renderTable()
  } catch(e) { showToast('Gagal menambah mesin: '+e.message,'error') }
}

async function showRiwayat() {
  const list = document.getElementById('riwayat-list')
  list.innerHTML = '<div class="text-sm text-slate-400 text-center py-4"><span class="spinner"></span> Memuat...</div>'
  document.getElementById('modal-riwayat').classList.remove('hidden')
  try {
    const res  = await fetch('/api/monitoring/tanggal')
    const json = await res.json()
    if (!json.success) throw new Error(json.error)
    if (json.data.length===0) { list.innerHTML='<div class="text-sm text-slate-400 text-center py-4">Belum ada data</div>'; return }
    list.innerHTML = json.data.map(row=>\`
      <button class="w-full text-left px-3 py-2 rounded hover:bg-blue-50 border border-slate-200 text-sm flex items-center gap-2" onclick="selectRiwayat('\${row.tanggal}')">
        <i class="fas fa-calendar-day text-blue-400"></i><span class="font-medium text-slate-700">\${row.tanggal}</span>
      </button>\`).join('')
  } catch(e) { list.innerHTML='<div class="text-sm text-red-400 text-center py-4">Gagal memuat</div>' }
}
async function selectRiwayat(tanggal) {
  document.getElementById('sel-tanggal').value = tanggal
  closeModal('modal-riwayat')
  try {
    const res  = await fetch(\`/api/monitoring/jam?tanggal=\${tanggal}\`)
    const json = await res.json()
    if (json.success&&json.data.length>0) document.getElementById('sel-jam').value = json.data[0].jam
  } catch(e) {}
  await loadData()
}

// =============================================
// ===== LAP. OPERASIONAL =====
// =============================================
function renderLapCards(filter='') {
  const container = document.getElementById('lap-cards-container')
  allCards = UNIT_DATA
  const filtered = filter ? allCards.filter(u => u.nama_unit.toLowerCase().includes(filter.toLowerCase()) || String(u.kode_unit).includes(filter)) : allCards
  if (filtered.length === 0) {
    container.innerHTML = '<div class="text-center py-12 text-slate-400"><i class="fas fa-search text-3xl mb-2"></i><p>Tidak ada unit ditemukan</p></div>'
    return
  }
  // Group by area
  const areas = {}
  filtered.forEach(u => {
    if (!areas[u.area]) areas[u.area] = []
    areas[u.area].push(u)
  })
  let html = ''
  Object.entries(areas).forEach(([area, units]) => {
    html += \`<div class="mb-1 px-1 pt-2 pb-1">
      <div class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
        <i class="fas fa-map-marker-alt text-blue-400"></i>\${area}
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">\`
    units.forEach(u => {
      const d = lapData[u.kode_unit] || {}
      const tgl = document.getElementById('lap-tanggal')?.value || ''
      html += \`<div class="lap-card" id="card-\${u.kode_unit}" data-unit="\${u.nama_unit.toLowerCase()}">
        <div class="lap-card-header">
          <div>
            <div class="unit-name">\${u.nama_unit}</div>
            <div class="unit-area">\${u.area}</div>
          </div>
          <div class="flex items-center gap-2">
            <span id="saved-\${u.kode_unit}" class="lap-saved"><i class="fas fa-check-circle"></i> Tersimpan</span>
            <span class="unit-kode">ID: \${u.kode_unit}</span>
          </div>
        </div>
        <div style="padding:10px 16px 6px; background:#f8fafc; border-bottom:1px solid #e2e8f0; font-size:0.72rem; color:#64748b; display:flex; gap:16px;">
          <span><i class="fas fa-building mr-1"></i>UNIT: \${u.nama_unit}</span>
          <span><i class="fas fa-hashtag mr-1"></i>ID UNIT: \${u.kode_unit}</span>
          <span><i class="fas fa-calendar mr-1"></i>Tgl: \${tgl||'—'}</span>
        </div>
        <div class="lap-grid">
          <div class="lap-field full">
            <label><i class="fas fa-user mr-1"></i>Nama Operator</label>
            <input type="text" placeholder="Nama operator..." value="\${d.nama_operator||''}"
              oninput="setLapValue(\${u.kode_unit},'nama_operator',this.value)"/>
          </div>
          <div class="lap-field">
            <label><i class="fas fa-bolt mr-1"></i>kWh Produksi (kWh)</label>
            <input type="number" step="any" placeholder="0" value="\${d.kwh_produksi??''}"
              oninput="setLapValue(\${u.kode_unit},'kwh_produksi',this.value)"/>
          </div>
          <div class="lap-field">
            <label><i class="fas fa-gas-pump mr-1 text-yellow-500"></i>Saldo Awal (ltr)</label>
            <input type="number" step="any" placeholder="0" value="\${d.saldo_awal??''}"
              oninput="setLapValue(\${u.kode_unit},'saldo_awal',this.value)"/>
          </div>
          <div class="lap-field">
            <label><i class="fas fa-gas-pump mr-1 text-green-500"></i>Saldo Akhir (ltr)</label>
            <input type="number" step="any" placeholder="0" value="\${d.saldo_akhir??''}"
              oninput="setLapValue(\${u.kode_unit},'saldo_akhir',this.value)"/>
          </div>
          <div class="lap-field">
            <label><i class="fas fa-truck-ramp-box mr-1 text-blue-500"></i>Penerimaan BBM (ltr)</label>
            <input type="number" step="any" placeholder="0" value="\${d.penerimaan_bbm??''}"
              oninput="setLapValue(\${u.kode_unit},'penerimaan_bbm',this.value)"/>
          </div>
          <div class="lap-field full">
            <label><i class="fas fa-calculator mr-1 text-red-500"></i>Estimasi Pemakaian BBM Maksimal (ltr)</label>
            <input type="number" step="any" placeholder="0" value="\${d.estimasi_bbm_max??''}"
              oninput="setLapValue(\${u.kode_unit},'estimasi_bbm_max',this.value)"/>
          </div>
        </div>
        <div style="padding:8px 16px; border-top:1px solid #f1f5f9; display:flex; justify-content:flex-end;">
          <button class="btn btn-primary" style="padding:5px 14px; font-size:0.75rem;" onclick="saveLapSingle(\${u.kode_unit},'${u.nama_unit}')">
            <i class="fas fa-save"></i> Simpan
          </button>
        </div>
      </div>\`
    })
    html += '</div></div>'
  })
  container.innerHTML = html
}

function setLapValue(kode, field, value) {
  if (!lapData[kode]) lapData[kode] = {}
  lapData[kode][field] = value===''?null:(field==='nama_operator'?value:parseFloat(value))
}

async function loadLapData() {
  const tanggal = document.getElementById('lap-tanggal').value
  if (!tanggal) { showToast('Pilih tanggal terlebih dahulu','info'); return }
  showLoading(true,'loading-indicator-lap')
  try {
    const res  = await fetch(\`/api/lap-operasional?tanggal=\${tanggal}\`)
    const json = await res.json()
    if (!json.success) throw new Error(json.error)
    lapData = {}
    json.data.forEach(row => {
      lapData[row.kode_unit] = { nama_operator:row.nama_operator, kwh_produksi:row.kwh_produksi, saldo_awal:row.saldo_awal, saldo_akhir:row.saldo_akhir, penerimaan_bbm:row.penerimaan_bbm, estimasi_bbm_max:row.estimasi_bbm_max }
    })
    renderLapCards(document.getElementById('search-unit')?.value||'')
    // Show saved badge for units that have data
    json.data.forEach(row => {
      const badge = document.getElementById(\`saved-\${row.kode_unit}\`)
      if (badge) badge.classList.add('show')
    })
    const cnt = json.data.length
    document.getElementById('info-lap-record').textContent = cnt>0?\`\${cnt} unit sudah ada data pada \${tanggal}\`:\`Belum ada data untuk \${tanggal}\`
    document.getElementById('last-update').textContent = \`LAP. OPERASIONAL — \${tanggal}\`
  } catch(e) { showToast('Gagal memuat data: '+e.message,'error') }
  finally { showLoading(false,'loading-indicator-lap') }
}

async function saveLapSingle(kode, namaUnit) {
  const tanggal = document.getElementById('lap-tanggal').value
  if (!tanggal) { showToast('Pilih tanggal terlebih dahulu','info'); return }
  const d = lapData[kode] || {}
  try {
    const res  = await fetch('/api/lap-operasional',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ kode_unit:kode, nama_unit:namaUnit, tanggal, ...d })
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.error)
    showToast(\`\${namaUnit} berhasil disimpan\`,'success')
    const badge = document.getElementById(\`saved-\${kode}\`)
    if (badge) { badge.classList.add('show'); setTimeout(()=>badge.classList.remove('show'),3000) }
  } catch(e) { showToast('Gagal: '+e.message,'error') }
}

async function saveAllLap() {
  const tanggal = document.getElementById('lap-tanggal').value
  if (!tanggal) { showToast('Pilih tanggal terlebih dahulu','info'); return }
  showLoading(true,'loading-indicator-lap')
  let saved=0, errors=0
  const promises = UNIT_DATA.map(async u => {
    const d = lapData[u.kode_unit] || {}
    // only save if any field is filled
    const hasData = Object.values(d).some(v => v!==null && v!==undefined && v!=='')
    if (!hasData) return
    try {
      const res  = await fetch('/api/lap-operasional',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ kode_unit:u.kode_unit, nama_unit:u.nama_unit, tanggal, ...d })
      })
      const json = await res.json()
      if (json.success) {
        saved++
        const badge = document.getElementById(\`saved-\${u.kode_unit}\`)
        if (badge) { badge.classList.add('show'); setTimeout(()=>badge.classList.remove('show'),3000) }
      } else errors++
    } catch(e) { errors++ }
  })
  await Promise.all(promises)
  showLoading(false,'loading-indicator-lap')
  if (errors===0) showToast(\`\${saved} unit berhasil disimpan\`,'success')
  else showToast(\`\${saved} disimpan, \${errors} gagal\`,'error')
}

function filterUnit(val) {
  renderLapCards(val)
  // re-show saved badges
  const tanggal = document.getElementById('lap-tanggal').value
  if (tanggal) {
    Object.keys(lapData).forEach(kode => {
      const badge = document.getElementById(\`saved-\${kode}\`)
      if (badge) badge.classList.add('show')
    })
  }
}

async function showRiwayatLap() {
  const list = document.getElementById('riwayat-lap-list')
  list.innerHTML = '<div class="text-sm text-slate-400 text-center py-4"><span class="spinner"></span> Memuat...</div>'
  document.getElementById('modal-riwayat-lap').classList.remove('hidden')
  try {
    const res  = await fetch('/api/lap-operasional/tanggal')
    const json = await res.json()
    if (!json.success) throw new Error(json.error)
    if (json.data.length===0) { list.innerHTML='<div class="text-sm text-slate-400 text-center py-4">Belum ada data</div>'; return }
    list.innerHTML = json.data.map(row=>\`
      <button class="w-full text-left px-3 py-2 rounded hover:bg-blue-50 border border-slate-200 text-sm flex items-center gap-2" onclick="selectRiwayatLap('\${row.tanggal}')">
        <i class="fas fa-calendar-day text-blue-400"></i><span class="font-medium text-slate-700">\${row.tanggal}</span>
      </button>\`).join('')
  } catch(e) { list.innerHTML='<div class="text-sm text-red-400 text-center py-4">Gagal memuat</div>' }
}
async function selectRiwayatLap(tanggal) {
  document.getElementById('lap-tanggal').value = tanggal
  closeModal('modal-riwayat-lap')
  await loadLapData()
}

// =============================================
// UTILS
// =============================================
document.addEventListener('keydown', (e) => {
  if (e.key==='Enter' && !document.getElementById('modal-mesin').classList.contains('hidden')) addMesin()
})
function closeModal(id) { document.getElementById(id).classList.add('hidden') }
function showLoading(show, id) { document.getElementById(id).classList.toggle('hidden',!show) }
function showToast(msg, type='info') {
  const container = document.getElementById('toast')
  const el = document.createElement('div')
  el.className = \`toast-item toast-\${type}\`
  el.innerHTML = \`<i class="fas fa-\${type==='success'?'check-circle':type==='error'?'circle-xmark':'info-circle'} mr-2"></i>\${msg}\`
  container.appendChild(el)
  setTimeout(()=>el.remove(), 3500)
}
document.querySelectorAll('.modal-overlay').forEach(el => {
  el.addEventListener('click', (e) => { if (e.target===el) el.classList.add('hidden') })
})
</script>
</body>
</html>`
}

export default app
