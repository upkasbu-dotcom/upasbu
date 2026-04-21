import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()
app.use('/api/*', cors())
app.use('/static/*', serveStatic({ root: './public' }))

const JSON_URL = 'https://script.google.com/macros/s/AKfycbyGPqAcIBVFFzHuu5ZxtQWHGOmM8ragfZspoiF72NyvdLXc1qW0TWBeovokFJlVEDEI/exec'

// ============================================================
// INIT DATABASE
// ============================================================
async function initDB(db: D1Database) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS mesin_cache (
    id_mesin    INTEGER PRIMARY KEY,
    up3         TEXT NOT NULL,
    kode_unit   INTEGER NOT NULL,
    nama_unit   TEXT NOT NULL,
    mesin       TEXT NOT NULL,
    type        TEXT,
    s_n         TEXT,
    nama_mesin  TEXT,
    cached_at   TEXT NOT NULL
  )`).run()

  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_mesin_cache_kode_unit ON mesin_cache(kode_unit)`).run()
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_mesin_cache_up3 ON mesin_cache(up3)`).run()

  await db.prepare(`CREATE TABLE IF NOT EXISTS sync_log (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    sync_type    TEXT NOT NULL UNIQUE,
    synced_at    TEXT NOT NULL,
    record_count INTEGER DEFAULT 0
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
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
}

// ============================================================
// SYNC MESIN FROM JSON (cache 1x per hari)
// ============================================================
async function syncMesinIfNeeded(db: D1Database): Promise<{ synced: boolean, count: number }> {
  const today = new Date().toISOString().split('T')[0]

  // Cek apakah sudah sync hari ini
  const lastSync = await db.prepare(
    `SELECT synced_at, record_count FROM sync_log WHERE sync_type = 'mesin_cache'`
  ).first<{ synced_at: string, record_count: number }>()

  if (lastSync && lastSync.synced_at >= today) {
    return { synced: false, count: lastSync.record_count }
  }

  // Fetch dari Google Script
  const res = await fetch(JSON_URL)
  if (!res.ok) throw new Error('Gagal fetch data mesin dari sumber')

  const data: any[] = await res.json()
  if (!Array.isArray(data) || data.length === 0) throw new Error('Data mesin kosong')

  // Filter data valid (skip yang nama_mesinnya #N/A atau null)
  const valid = data.filter((r: any) =>
    r.id_mesin && r.kode_unit && r.nama_unit && r.mesin &&
    r.mesin !== '#N/A' && r.nama_mesin !== '#N/A'
  )

  // Hapus cache lama, insert batch baru
  await db.prepare(`DELETE FROM mesin_cache`).run()

  const BATCH = 50
  for (let i = 0; i < valid.length; i += BATCH) {
    const chunk = valid.slice(i, i + BATCH)
    const stmts = chunk.map((r: any) =>
      db.prepare(`
        INSERT OR REPLACE INTO mesin_cache
          (id_mesin, up3, kode_unit, nama_unit, mesin, type, s_n, nama_mesin, cached_at)
        VALUES (?,?,?,?,?,?,?,?,?)
      `).bind(
        r.id_mesin,
        r.up3 || '',
        r.kode_unit,
        r.nama_unit,
        r.mesin,
        r.type || null,
        String(r.s_n || ''),
        r.nama_mesin || r.mesin,
        today
      )
    )
    await db.batch(stmts)
  }

  // Update sync log
  await db.prepare(`
    INSERT INTO sync_log (sync_type, synced_at, record_count)
    VALUES ('mesin_cache', ?, ?)
    ON CONFLICT(sync_type) DO UPDATE SET synced_at=excluded.synced_at, record_count=excluded.record_count
  `).bind(today, valid.length).run()

  return { synced: true, count: valid.length }
}

// ============================================================
// API: SYNC MESIN (manual trigger / auto)
// ============================================================
app.get('/api/sync-mesin', async (c) => {
  try {
    const result = await syncMesinIfNeeded(c.env.DB)
    return c.json({ success: true, ...result })
  } catch (e: any) { return c.json({ success: false, error: e.message }, 500) }
})

app.post('/api/sync-mesin/force', async (c) => {
  try {
    await c.env.DB.prepare(`DELETE FROM sync_log WHERE sync_type='mesin_cache'`).run()
    const result = await syncMesinIfNeeded(c.env.DB)
    return c.json({ success: true, ...result, forced: true })
  } catch (e: any) { return c.json({ success: false, error: e.message }, 500) }
})

// ============================================================
// API: GET UP3 LIST  (+ trigger sync harian jika perlu)
// ============================================================
app.get('/api/up3', async (c) => {
  try {
    // Sync hanya di endpoint ini — entry point pertama setiap hari
    await syncMesinIfNeeded(c.env.DB)
    const result = await c.env.DB.prepare(
      `SELECT DISTINCT up3 FROM mesin_cache ORDER BY up3`
    ).all<{ up3: string }>()
    return c.json({ success: true, data: result.results.map(r => r.up3) })
  } catch (e: any) { return c.json({ success: false, error: e.message }, 500) }
})

// ============================================================
// API: GET UNIT BY UP3
// ============================================================
app.get('/api/unit', async (c) => {
  try {
    const up3 = c.req.query('up3') || ''
    let query = `SELECT DISTINCT kode_unit, nama_unit FROM mesin_cache`
    const params: any[] = []
    if (up3) { query += ` WHERE up3 = ?`; params.push(up3) }
    query += ` ORDER BY nama_unit`
    const result = await c.env.DB.prepare(query).bind(...params).all()
    return c.json({ success: true, data: result.results })
  } catch (e: any) { return c.json({ success: false, error: e.message }, 500) }
})

// ============================================================
// API: GET MESIN BY KODE_UNIT
// ============================================================
app.get('/api/mesin-unit', async (c) => {
  try {
    const kode_unit = c.req.query('kode_unit') || ''
    if (!kode_unit) return c.json({ success: false, error: 'kode_unit wajib' }, 400)
    const result = await c.env.DB.prepare(
      `SELECT id_mesin, mesin, type, s_n, nama_mesin FROM mesin_cache WHERE kode_unit = ? ORDER BY id_mesin`
    ).bind(kode_unit).all()
    return c.json({ success: true, data: result.results })
  } catch (e: any) { return c.json({ success: false, error: e.message }, 500) }
})

// ============================================================
// API: MONITORING
// ============================================================
app.get('/api/monitoring', async (c) => {
  try {
    const tanggal = c.req.query('tanggal') || new Date().toISOString().split('T')[0]
    const jam = c.req.query('jam') || null
    const kode_unit = c.req.query('kode_unit') || null

    let query = `SELECT dm.* FROM data_monitoring dm WHERE dm.tanggal = ?`
    const params: any[] = [tanggal]
    if (jam) { query += ' AND dm.jam = ?'; params.push(jam) }
    if (kode_unit) {
      query += ` AND dm.mesin_id IN (SELECT id_mesin FROM mesin_cache WHERE kode_unit = ?)`
      params.push(kode_unit)
    }
    query += ' ORDER BY dm.jam, dm.mesin_id'
    const result = await c.env.DB.prepare(query).bind(...params).all()
    return c.json({ success: true, data: result.results })
  } catch (e: any) { return c.json({ success: false, error: e.message }, 500) }
})

app.get('/api/monitoring/tanggal', async (c) => {
  try {
    const kode_unit = c.req.query('kode_unit') || null
    let query = `SELECT DISTINCT tanggal FROM data_monitoring`
    const params: any[] = []
    if (kode_unit) {
      query += ` WHERE mesin_id IN (SELECT id_mesin FROM mesin_cache WHERE kode_unit = ?)`
      params.push(kode_unit)
    }
    query += ` ORDER BY tanggal DESC LIMIT 90`
    const result = await c.env.DB.prepare(query).bind(...params).all()
    return c.json({ success: true, data: result.results })
  } catch (e: any) { return c.json({ success: false, error: e.message }, 500) }
})

app.get('/api/monitoring/jam', async (c) => {
  try {
    const tanggal = c.req.query('tanggal') || new Date().toISOString().split('T')[0]
    const result = await c.env.DB.prepare(
      'SELECT DISTINCT jam FROM data_monitoring WHERE tanggal=? ORDER BY jam'
    ).bind(tanggal).all()
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
app.get('/', (c) => {
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
  <link rel="icon" type="image/x-icon" href="/static/favicon.ico"/>
  <link href="/static/style.css" rel="stylesheet"/>
</head>
<body class="bg-slate-100 min-h-screen">

<!-- ===== HEADER ===== -->
<header class="app-header">
  <i class="fas fa-gauge-high app-header-icon"></i>
  <div class="app-header-body">
    <div class="tab-row">
      <button id="tab-btn-monitoring" class="tab-btn active" onclick="switchTab('monitoring')">
        <i class="fas fa-table-cells"></i><span class="btn-text"> MONITORING</span>
      </button>
      <button id="tab-btn-laporan" class="tab-btn" onclick="switchTab('laporan')">
        <i class="fas fa-file-lines"></i><span class="btn-text"> LAP. OPERASIONAL</span>
      </button>
    </div>
    <p class="app-header-sub" id="last-update">—</p>
  </div>
  <div class="header-actions" id="header-actions-monitoring">
    <button class="btn btn-success" id="btn-simpan-semua" onclick="saveAllData()" disabled style="opacity:0.5;cursor:not-allowed;">
      <i class="fas fa-save"></i><span class="btn-text"> Simpan Semua</span>
    </button>
  </div>
  <div class="header-actions" id="header-actions-laporan" style="display:none;">
    <button class="btn btn-outline" id="btn-edit-lap" style="color:#fff;border-color:#93c5fd;display:none;" onclick="backToForm()">
      <i class="fas fa-pen"></i><span class="btn-text"> Edit</span>
    </button>
    <button class="btn btn-success" id="btn-save-lap" onclick="saveLapCurrent()" disabled style="opacity:0.5;cursor:not-allowed;">
      <i class="fas fa-save"></i><span class="btn-text"> Simpan</span>
    </button>
  </div>
</header>

<!-- ===== TOOLBAR ===== -->
<div class="toolbar-wrap">
  <!-- Monitoring toolbar -->
  <div id="toolbar-monitoring">
    <!-- Baris 1: UP3 + Unit -->
    <div class="toolbar">
      <div class="toolbar-group">
        <label class="toolbar-label"><i class="fas fa-network-wired" style="color:#3b82f6"></i> UP3</label>
        <select id="mon-sel-up3" class="toolbar-select" onchange="onMonUp3Change(this.value)">
          <option value="">-- Pilih UP3 --</option>
        </select>
      </div>
      <div class="toolbar-group">
        <label class="toolbar-label"><i class="fas fa-building" style="color:#3b82f6"></i> Unit</label>
        <select id="mon-sel-unit" class="toolbar-select" onchange="onMonUnitChange(this.value)" disabled>
          <option value="">-- Pilih Unit --</option>
        </select>
      </div>
      <div id="loading-indicator-mesin" class="hidden"><span class="spinner"></span></div>
      <span class="toolbar-info" id="info-mesin-count"></span>
    </div>
    <!-- Baris 2: Tanggal + Jam + Aksi -->
    <div class="toolbar">
      <div class="toolbar-group">
        <label class="toolbar-label"><i class="fas fa-calendar"></i> Tgl</label>
        <input type="date" id="sel-tanggal" class="toolbar-input"/>
      </div>
      <div class="toolbar-group">
        <label class="toolbar-label"><i class="fas fa-clock"></i> Jam</label>
        <select id="sel-jam" class="toolbar-select" style="max-width:100px;">
          ${jamOptions}
        </select>
      </div>
      <button class="btn btn-primary" onclick="loadData()" id="btn-tampilkan" disabled style="opacity:0.5;cursor:not-allowed;">
        <i class="fas fa-search"></i><span class="btn-text"> Tampilkan</span>
      </button>
      <button class="btn btn-outline" onclick="showRiwayat()" id="btn-riwayat" disabled style="opacity:0.5;cursor:not-allowed;">
        <i class="fas fa-history"></i><span class="btn-text"> Riwayat</span>
      </button>
      <div id="loading-indicator" class="hidden"><span class="spinner"></span></div>
      <span class="toolbar-info" id="info-record"></span>
    </div>
  </div>

  <!-- Lap operasional toolbar -->
  <div id="toolbar-laporan" class="hidden">
    <!-- Baris 1: UP3 + Unit -->
    <div class="toolbar">
      <div class="toolbar-group">
        <label class="toolbar-label"><i class="fas fa-network-wired" style="color:#3b82f6"></i> UP3</label>
        <select id="lap-sel-up3" class="toolbar-select" onchange="onLapUp3Change(this.value)">
          <option value="">-- Pilih UP3 --</option>
        </select>
      </div>
      <div class="toolbar-group">
        <label class="toolbar-label"><i class="fas fa-building" style="color:#3b82f6"></i> Unit</label>
        <select id="lap-sel-unit" class="toolbar-select" onchange="onLapUnitChange(this.value)" disabled>
          <option value="">-- Pilih Unit --</option>
        </select>
      </div>
      <div id="loading-indicator-lap-unit" class="hidden"><span class="spinner"></span></div>
    </div>
    <!-- Baris 2: Tanggal + Aksi -->
    <div class="toolbar">
      <div class="toolbar-group">
        <label class="toolbar-label"><i class="fas fa-calendar"></i> Tgl</label>
        <input type="date" id="lap-tanggal" class="toolbar-input"/>
      </div>
      <button class="btn btn-primary" onclick="loadLapData()" id="btn-tampilkan-lap" disabled style="opacity:0.5;cursor:not-allowed;">
        <i class="fas fa-search"></i><span class="btn-text"> Tampilkan</span>
      </button>
      <button class="btn btn-outline" onclick="showRiwayatLap()">
        <i class="fas fa-history"></i><span class="btn-text"> Riwayat</span>
      </button>
      <div id="loading-indicator-lap" class="hidden"><span class="spinner"></span></div>
      <span class="toolbar-info" id="info-lap-record"></span>
    </div>
  </div>
</div>

<!-- ===== TAB: MONITORING MESIN ===== -->
<div id="tab-monitoring" class="tab-content active" style="padding:10px 12px;">
  <div id="mon-state-empty" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;color:#94a3b8;text-align:center;">
    <i class="fas fa-network-wired" style="font-size:3rem;margin-bottom:16px;color:#bfdbfe;"></i>
    <p style="font-size:1rem;font-weight:600;color:#64748b;">Pilih UP3 dan Unit</p>
    <p style="font-size:0.82rem;margin-top:4px;">Silakan pilih <strong>UP3</strong> kemudian <strong>Unit</strong> di toolbar atas</p>
  </div>
  <div id="mon-table-wrap" class="hidden">
    <div class="table-wrap">
      <table id="main-table">
        <thead id="table-head"></thead>
        <tbody id="table-body"></tbody>
      </table>
    </div>
  </div>
</div>

<!-- ===== TAB: LAP. OPERASIONAL ===== -->
<div id="tab-laporan" class="tab-content" style="padding:10px 12px;">
  <div id="lap-state-empty" style="flex-direction:column;align-items:center;justify-content:center;padding:50px 20px;color:#94a3b8;text-align:center;">
    <i class="fas fa-network-wired" style="font-size:3rem;margin-bottom:16px;color:#bfdbfe;"></i>
    <p style="font-size:1rem;font-weight:600;color:#64748b;">Pilih UP3 dan Unit</p>
    <p style="font-size:0.82rem;margin-top:4px;">Silakan pilih <strong>UP3</strong> kemudian <strong>Unit (ULD)</strong> di toolbar atas</p>
  </div>
  <div id="lap-state-pick-unit" style="display:none;flex-direction:column;align-items:center;justify-content:center;padding:50px 20px;color:#94a3b8;text-align:center;">
    <i class="fas fa-building" style="font-size:3rem;margin-bottom:16px;color:#bfdbfe;"></i>
    <p style="font-size:1rem;font-weight:600;color:#64748b;">Pilih Unit (ULD)</p>
    <p style="font-size:0.82rem;margin-top:4px;">UP3 sudah dipilih, sekarang pilih <strong>Unit (ULD)</strong> di dropdown atas</p>
  </div>
  <div id="lap-form-container" class="hidden" style="max-width:600px;margin:0 auto;"></div>
  <div id="lap-review-container" class="hidden" style="max-width:600px;margin:0 auto;"></div>
</div>

<!-- TOAST -->
<div id="toast"></div>

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

<!-- MODAL: KIRIM LAPORAN -->
<div id="modal-kirim" class="modal-overlay hidden">
  <div class="modal-box" style="width:480px;max-width:96vw">
    <div class="modal-title"><i class="fas fa-paper-plane" style="color:#16a34a"></i>Kirim Laporan</div>
    <p class="text-xs text-slate-400 mb-3">Pratinjau teks laporan yang akan dikirim:</p>
    <div class="kirim-preview-box">
      <pre id="kirim-preview-text" class="kirim-preview-text"></pre>
    </div>
    <div class="kirim-actions">
      <button class="btn btn-outline-dark" onclick="copyKirimText()">
        <i class="fas fa-copy"></i> Salin Teks
      </button>
      <button class="btn btn-wa" onclick="kirimWhatsApp()">
        <i class="fab fa-whatsapp"></i> WhatsApp
      </button>
      <button class="btn btn-outline" onclick="closeModal('modal-kirim')" style="margin-left:auto">
        Tutup
      </button>
    </div>
  </div>
</div>

<script src="/static/app.js"></script>
</body>
</html>`
  return c.html(html)
})

export default app
