import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()
app.use('/api/*', cors())
app.use('/static/*', serveStatic({ root: './public' }))

// ============================================================
// INIT DATABASE
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
// SERVE MAIN PAGE (HTML inline, JS/CSS dari /static/)
// ============================================================
app.get('/', (c) => {
  // Generate jam options
  const jamOptions = Array.from({length:24}, (_,i) => {
    const h = String(i).padStart(2,'0') + ':00'
    return `<option value="${h}">${h}</option>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Sistem Operasional Mesin</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet"/>
  <link href="/static/style.css" rel="stylesheet"/>
</head>
<body class="bg-slate-100 min-h-screen">

<!-- ===== HEADER ===== -->
<header class="bg-[#1e3a5f] text-white px-5 py-3 flex items-center gap-4 shadow-lg">
  <i class="fas fa-gauge-high text-2xl text-blue-300 flex-shrink-0"></i>
  <div class="flex-1 min-w-0">
    <div class="flex items-center gap-2 flex-wrap">
      <button id="tab-btn-monitoring" class="tab-btn active" onclick="switchTab('monitoring')">
        <i class="fas fa-table-cells mr-1"></i>MONITORING MESIN
      </button>
      <button id="tab-btn-laporan" class="tab-btn" onclick="switchTab('laporan')">
        <i class="fas fa-file-lines mr-1"></i>LAP. OPERASIONAL
      </button>
    </div>
    <p class="text-xs text-blue-300 mt-1" id="last-update">—</p>
  </div>
  <div class="flex gap-2 items-center flex-wrap flex-shrink-0" id="header-actions-monitoring">
    <button class="btn btn-outline" style="color:#fff;border-color:#93c5fd;" onclick="showAddMesinModal()">
      <i class="fas fa-plus"></i> Tambah Mesin
    </button>
    <button class="btn btn-success" onclick="saveAllData()">
      <i class="fas fa-save"></i> Simpan Semua
    </button>
  </div>
  <div class="flex gap-2 items-center hidden" id="header-actions-laporan">
    <button class="btn btn-success" onclick="saveAllLap()">
      <i class="fas fa-save"></i> Simpan Semua
    </button>
  </div>
</header>

<!-- ===== TOOLBAR ===== -->
<div class="px-5 py-2.5 bg-white shadow-sm border-b border-slate-200">
  <!-- Monitoring toolbar -->
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
  <!-- Lap operasional toolbar -->
  <div id="toolbar-laporan" class="toolbar hidden">
    <div class="flex items-center gap-2">
      <label class="text-sm font-semibold text-slate-600"><i class="fas fa-calendar mr-1"></i>Tanggal:</label>
      <input type="date" id="lap-tanggal" class="border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/>
    </div>
    <button class="btn btn-primary" onclick="loadLapData()"><i class="fas fa-search"></i> Tampilkan</button>
    <button class="btn btn-outline" onclick="showRiwayatLap()"><i class="fas fa-history"></i> Riwayat</button>
    <input type="text" id="search-unit" class="search-unit" placeholder="Cari unit..." oninput="filterUnit(this.value)"/>
    <div id="loading-indicator-lap" class="hidden"><span class="spinner"></span></div>
    <div class="ml-auto text-xs text-slate-400" id="info-lap-record"></div>
  </div>
</div>

<!-- ===== TAB: MONITORING MESIN ===== -->
<div id="tab-monitoring" class="tab-content active px-4 py-3">
  <div class="table-wrap">
    <table id="main-table">
      <thead id="table-head"></thead>
      <tbody id="table-body"></tbody>
    </table>
  </div>
</div>

<!-- ===== TAB: LAP. OPERASIONAL ===== -->
<div id="tab-laporan" class="tab-content px-4 py-3">
  <div class="lap-form-wrap" id="lap-cards-container"></div>
</div>

<!-- TOAST -->
<div id="toast"></div>

<!-- MODAL: Tambah Mesin -->
<div id="modal-mesin" class="modal-overlay hidden">
  <div class="modal-box">
    <div class="modal-title"><i class="fas fa-cog"></i>Tambah Mesin Baru</div>
    <input type="text" id="input-nama-mesin" placeholder="Contoh: Mesin 4"
      class="w-full border border-slate-300 rounded px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"/>
    <div class="flex gap-2 justify-end">
      <button class="btn btn-outline" onclick="closeModal('modal-mesin')">Batal</button>
      <button class="btn btn-primary" onclick="addMesin()"><i class="fas fa-plus"></i> Tambah</button>
    </div>
  </div>
</div>

<!-- MODAL: Riwayat Monitoring -->
<div id="modal-riwayat" class="modal-overlay hidden">
  <div class="modal-box" style="width:420px">
    <div class="modal-title"><i class="fas fa-history"></i>Riwayat Monitoring</div>
    <div id="riwayat-list" class="max-h-64 overflow-y-auto"></div>
    <div class="flex justify-end mt-3">
      <button class="btn btn-outline" onclick="closeModal('modal-riwayat')">Tutup</button>
    </div>
  </div>
</div>

<!-- MODAL: Riwayat Lap Operasional -->
<div id="modal-riwayat-lap" class="modal-overlay hidden">
  <div class="modal-box" style="width:420px">
    <div class="modal-title"><i class="fas fa-history"></i>Riwayat Lap. Operasional</div>
    <div id="riwayat-lap-list" class="max-h-64 overflow-y-auto"></div>
    <div class="flex justify-end mt-3">
      <button class="btn btn-outline" onclick="closeModal('modal-riwayat-lap')">Tutup</button>
    </div>
  </div>
</div>

<script src="/static/app.js"></script>
</body>
</html>`
  return c.html(html)
})

export default app
