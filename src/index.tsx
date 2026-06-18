import { Hono } from 'hono'
import { cors } from 'hono/cors'
type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()
app.use('/api/*', cors())

// Auto-init DB tables — hanya sekali per Worker instance (in-memory flag)
let _dbInited = false
app.use('/api/*', async (c, next) => {
  if (!_dbInited) {
    await initDB(c.env.DB)
    _dbInited = true
  }
  return next()
})

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
    terpasang   REAL,
    cached_at   TEXT NOT NULL,
    is_manual   INTEGER DEFAULT 0
  )`).run()
  // Tambah kolom is_manual jika belum ada (untuk DB lama)
  try { await db.prepare(`ALTER TABLE mesin_cache ADD COLUMN is_manual INTEGER DEFAULT 0`).run() } catch(_) {}

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
    terpasang REAL,
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

  // Index tambahan untuk mempercepat query berdasarkan tanggal
  try { await db.prepare(`CREATE INDEX IF NOT EXISTS idx_dm_tanggal ON data_monitoring(tanggal)`).run() } catch(_) {}
  // Index untuk query SFC & neraca (GROUP BY kode_unit + tanggal via JOIN mesin_cache)
  try { await db.prepare(`CREATE INDEX IF NOT EXISTS idx_dm_mesin_tanggal ON data_monitoring(mesin_id, tanggal)`).run() } catch(_) {}
  // Index untuk lap_operasional berdasarkan tanggal
  try { await db.prepare(`CREATE INDEX IF NOT EXISTS idx_lap_tanggal ON lap_operasional(tanggal)`).run() } catch(_) {}

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
    stock_oli_sae40 TEXT,
    stock_oli_sx TEXT,
    stock_oli_sx_plus TEXT,
    dokumen_url  TEXT,
    dokumen_nama TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`).run()

  await db.prepare(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_lap_ops ON lap_operasional(kode_unit, tanggal)`
  ).run()

  // Tabel untuk menyimpan file dokumen (base64) — tanpa Google Drive / R2
  await db.prepare(`CREATE TABLE IF NOT EXISTS dokumen_file (
    id          TEXT PRIMARY KEY,
    kode_unit   INTEGER,
    tanggal     TEXT,
    nama_file   TEXT NOT NULL,
    mime_type   TEXT NOT NULL DEFAULT 'application/octet-stream',
    file_data   TEXT NOT NULL,
    ukuran      INTEGER DEFAULT 0,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  )`).run()

  // Tambah kolom dokumen_url & dokumen_nama jika belum ada (migrasi)
  try { await db.prepare(`ALTER TABLE lap_operasional ADD COLUMN dokumen_url  TEXT`).run() } catch(_){}
  try { await db.prepare(`ALTER TABLE lap_operasional ADD COLUMN dokumen_nama TEXT`).run() } catch(_){}
  // Tambah kolom terpasang ke data_monitoring jika belum ada (migrasi)
  try { await db.prepare(`ALTER TABLE data_monitoring ADD COLUMN terpasang REAL`).run() } catch(_){}
  // Tambah kolom keterangan ke data_monitoring jika belum ada (migrasi)
  try { await db.prepare(`ALTER TABLE data_monitoring ADD COLUMN keterangan TEXT`).run() } catch(_){}
  // Tambah kolom terpasang ke mesin_cache jika belum ada (migrasi)
  try { await db.prepare(`ALTER TABLE mesin_cache ADD COLUMN terpasang REAL`).run() } catch(_){}
  // Tambah kolom kode_mesin ke mesin_cache jika belum ada (migrasi)
  try { await db.prepare(`ALTER TABLE mesin_cache ADD COLUMN kode_mesin TEXT`).run() } catch(_){}

  // Tabel HOP BBM info: posisi terakhir armada + estimasi tiba (per unit, bukan per tanggal)
  await db.prepare(`CREATE TABLE IF NOT EXISTS hop_bbm_info (
    kode_unit        INTEGER PRIMARY KEY,
    posisi_terakhir  TEXT,
    estimasi_tiba    TEXT,
    updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP
  )`).run()

  // Tabel SLD (Single Line Diagram) per unit
  await db.prepare(`CREATE TABLE IF NOT EXISTS sld (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    kode_unit   INTEGER NOT NULL UNIQUE,
    nama_unit   TEXT NOT NULL,
    svg_data    TEXT NOT NULL DEFAULT '[]',
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  )`).run()

  // Tabel TAD (Tenaga Administrasi)
  await db.prepare(`CREATE TABLE IF NOT EXISTS tad (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    nama        TEXT NOT NULL,
    jabatan     TEXT NOT NULL,
    penempatan  TEXT NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  )`).run()

  // Tabel event padam per unit per tanggal
  await db.prepare(`CREATE TABLE IF NOT EXISTS event_padam (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    kode_unit   INTEGER NOT NULL,
    tanggal     TEXT NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(kode_unit, tanggal)
  )`).run()

  // Tabel jadwal kirim WA per jam
  await db.prepare(`CREATE TABLE IF NOT EXISTS jadwal_wa (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    kode_unit   INTEGER NOT NULL,
    tanggal     TEXT NOT NULL,
    jam         TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'pending',
    sent_at     TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  )`).run()
  await db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_jadwal_wa_unique ON jadwal_wa(kode_unit, tanggal, jam)`).run()

  // Tabel log pengiriman WA auto — track per tanggal & jenis agar tidak double-kirim
  // jenis: 'hop_screenshot' | 'neraca_screenshot' | 'neraca_tabel'
  await db.prepare(`CREATE TABLE IF NOT EXISTS wa_kirim_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    tanggal    TEXT NOT NULL,
    jenis      TEXT NOT NULL,
    status     TEXT NOT NULL DEFAULT 'sent',
    info       TEXT,
    sent_at    DATETIME DEFAULT CURRENT_TIMESTAMP
  )`).run()
  await db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_wa_kirim_log_unique ON wa_kirim_log(tanggal, jenis)`).run()

  // Tabel kv_store — pengganti Cloudflare KV (karena KV tidak tersedia di Genspark Hosted Deploy)
  // Menyimpan key-value dengan TTL opsional (Unix timestamp detik, NULL = tidak expire)
  await db.prepare(`CREATE TABLE IF NOT EXISTS kv_store (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    expires_at INTEGER,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`).run()

  // MIGRASI: hapus FOREIGN KEY di data_monitoring (referensi ke tabel mesin yg salah)
  // Cek apakah tabel masih punya FK dengan melihat sql-nya
  try {
    const schemaRow: any = await db.prepare(
      `SELECT sql FROM sqlite_master WHERE type='table' AND name='data_monitoring'`
    ).first()
    if (schemaRow && schemaRow.sql && schemaRow.sql.includes('FOREIGN KEY')) {
      // Recreate tabel tanpa FK, pertahankan semua data
      await db.batch([
        db.prepare(`ALTER TABLE data_monitoring RENAME TO data_monitoring_old`),
        db.prepare(`CREATE TABLE data_monitoring (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          mesin_id INTEGER NOT NULL,
          tanggal TEXT NOT NULL,
          jam TEXT NOT NULL,
          terpasang REAL,
          daya_mampu REAL, beban REAL, stand_kwh REAL, stand_bbm REAL,
          phasa_r REAL, phasa_s REAL, phasa_t REAL, tek_oli REAL,
          temp_air_pendingin REAL, tegangan REAL, frequency REAL, cos_phi REAL,
          jam_kerja_mesin REAL, status_mesin TEXT DEFAULT 'Operasi',
          kwh_produksi REAL, pemakaian_bbm REAL, keterangan TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`),
        db.prepare(`INSERT INTO data_monitoring
          (id,mesin_id,tanggal,jam,terpasang,daya_mampu,beban,stand_kwh,stand_bbm,
           phasa_r,phasa_s,phasa_t,tek_oli,temp_air_pendingin,tegangan,frequency,
           cos_phi,jam_kerja_mesin,status_mesin,kwh_produksi,pemakaian_bbm,keterangan,
           created_at,updated_at)
          SELECT id,mesin_id,tanggal,jam,terpasang,daya_mampu,beban,stand_kwh,stand_bbm,
           phasa_r,phasa_s,phasa_t,tek_oli,temp_air_pendingin,tegangan,frequency,
           cos_phi,jam_kerja_mesin,status_mesin,kwh_produksi,pemakaian_bbm,keterangan,
           created_at,updated_at
          FROM data_monitoring_old`),
        db.prepare(`DROP TABLE data_monitoring_old`),
        db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_mesin_jam ON data_monitoring(mesin_id, tanggal, jam)`),
      ])
    }
  } catch(_) {}
}

// ============================================================
// KV STORE HELPERS — D1-backed pengganti Cloudflare KV binding
// ============================================================
async function kvGet(db: D1Database, key: string): Promise<string | null> {
  try {
    const row = await db.prepare(
      `SELECT value, expires_at FROM kv_store WHERE key = ?`
    ).bind(key).first<{ value: string, expires_at: number | null }>()
    if (!row) return null
    // Cek TTL
    if (row.expires_at !== null && row.expires_at < Math.floor(Date.now() / 1000)) {
      // Sudah expire — hapus dan return null
      await db.prepare(`DELETE FROM kv_store WHERE key = ?`).bind(key).run()
      return null
    }
    return row.value
  } catch(_) { return null }
}

async function kvPut(db: D1Database, key: string, value: string, options?: { expirationTtl?: number }): Promise<void> {
  const expiresAt = options?.expirationTtl
    ? Math.floor(Date.now() / 1000) + options.expirationTtl
    : null
  await db.prepare(
    `INSERT INTO kv_store(key, value, expires_at, updated_at)
     VALUES(?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(key) DO UPDATE SET value=excluded.value, expires_at=excluded.expires_at, updated_at=CURRENT_TIMESTAMP`
  ).bind(key, value, expiresAt).run()
}

async function kvDelete(db: D1Database, key: string): Promise<void> {
  await db.prepare(`DELETE FROM kv_store WHERE key = ?`).bind(key).run()
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

  // Simpan terpasang + mesin manual yang sudah ada sebelum dihapus
  const existingRows = await db.prepare(`SELECT id_mesin, terpasang, is_manual, up3, kode_unit, nama_unit, mesin, type, s_n, nama_mesin FROM mesin_cache`).all()
  const terpasangMap: Record<number, number> = {}
  const manualRows: any[] = []
  for (const row of existingRows.results as any[]) {
    if (row.terpasang != null) terpasangMap[row.id_mesin] = row.terpasang
    if (row.is_manual === 1) manualRows.push(row)
  }

  // Hapus cache lama (kecuali mesin manual), insert batch baru
  await db.prepare(`DELETE FROM mesin_cache WHERE is_manual = 0 OR is_manual IS NULL`).run()

  const BATCH = 50
  for (let i = 0; i < valid.length; i += BATCH) {
    const chunk = valid.slice(i, i + BATCH)
    const stmts = chunk.map((r: any) => {
      // Prioritaskan terpasang dari DB (input manual), baru dari Google Sheets
      const terpasang = terpasangMap[r.id_mesin] ?? (r.terpasang != null ? parseFloat(r.terpasang) : null)
      return db.prepare(`
        INSERT OR REPLACE INTO mesin_cache
          (id_mesin, up3, kode_unit, nama_unit, mesin, type, s_n, nama_mesin, terpasang, cached_at)
        VALUES (?,?,?,?,?,?,?,?,?,?)
      `).bind(
        r.id_mesin,
        r.up3 || '',
        r.kode_unit,
        r.nama_unit,
        r.mesin,
        r.type || null,
        String(r.s_n || ''),
        r.nama_mesin || r.mesin,
        terpasang,
        today
      )
    })
    await db.batch(stmts)
  }

  // Re-insert mesin manual yang tidak ada di Google Sheets
  for (const mr of manualRows) {
    const inValid = valid.some((r: any) => r.id_mesin === mr.id_mesin)
    if (!inValid) {
      // Mesin manual tidak ada di Google Sheets → pertahankan
      await db.prepare(`
        INSERT OR IGNORE INTO mesin_cache
          (id_mesin, up3, kode_unit, nama_unit, mesin, type, s_n, nama_mesin, terpasang, cached_at, is_manual)
        VALUES (?,?,?,?,?,?,?,?,?,?,1)
      `).bind(
        mr.id_mesin, mr.up3, mr.kode_unit, mr.nama_unit,
        mr.mesin, mr.type, mr.s_n, mr.nama_mesin,
        terpasangMap[mr.id_mesin] ?? mr.terpasang, today
      ).run()
    }
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
    // Sync di background (non-blocking) — tidak tunda response
    c.executionCtx.waitUntil(syncMesinIfNeeded(c.env.DB).catch(() => {}))
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
      `SELECT id_mesin, mesin, type, s_n, nama_mesin, terpasang FROM mesin_cache WHERE kode_unit = ? ORDER BY id_mesin`
    ).bind(kode_unit).all()
    return c.json({ success: true, data: result.results })
  } catch (e: any) { return c.json({ success: false, error: e.message }, 500) }
})

// Update nilai terpasang per mesin (batch)
app.post('/api/mesin-terpasang', async (c) => {
  try {
    const body = await c.req.json() as { updates: { id_mesin: number, terpasang: number }[] }
    if (!body.updates || !Array.isArray(body.updates)) return c.json({ success: false, error: 'updates wajib array' }, 400)
    const stmts = body.updates.map((u: { id_mesin: number, terpasang: number }) =>
      c.env.DB.prepare(`UPDATE mesin_cache SET terpasang = ? WHERE id_mesin = ?`).bind(u.terpasang, u.id_mesin)
    )
    await c.env.DB.batch(stmts)
    return c.json({ success: true, updated: body.updates.length })
  } catch (e: any) { return c.json({ success: false, error: e.message }, 500) }
})

// Update kode_mesin per mesin (batch)
app.post('/api/mesin-kode', async (c) => {
  try {
    const body = await c.req.json() as { updates: { id_mesin: number, kode_mesin: string }[] }
    if (!body.updates || !Array.isArray(body.updates)) return c.json({ success: false, error: 'updates wajib array' }, 400)
    const stmts = body.updates.map((u: { id_mesin: number, kode_mesin: string }) =>
      c.env.DB.prepare(`UPDATE mesin_cache SET kode_mesin = ? WHERE id_mesin = ?`).bind(u.kode_mesin, u.id_mesin)
    )
    await c.env.DB.batch(stmts)
    return c.json({ success: true, updated: body.updates.length })
  } catch (e: any) { return c.json({ success: false, error: e.message }, 500) }
})

// Tambah mesin baru ke mesin_cache secara manual
// GET semua mesin cache (untuk lookup nama/sn/kode_unit di frontend)
app.get('/api/mesin-cache', async (c) => {
  try {
    const rows = await c.env.DB.prepare(
      `SELECT id_mesin, kode_unit, nama_unit, mesin, type, s_n, nama_mesin, terpasang, is_manual, up3 FROM mesin_cache ORDER BY kode_unit, id_mesin`
    ).all()
    return c.json({ success: true, data: rows.results })
  } catch (e: any) { return c.json({ success: false, error: e.message }, 500) }
})

// GET daftar UP3 unik dari database
app.get('/api/mesin-cache/up3-list', async (c) => {
  try {
    const rows = await c.env.DB.prepare(
      `SELECT DISTINCT up3 FROM mesin_cache WHERE up3 IS NOT NULL AND up3 != '' ORDER BY up3`
    ).all()
    return c.json({ success: true, data: rows.results.map((r: any) => r.up3) })
  } catch (e: any) { return c.json({ success: false, error: e.message }, 500) }
})

app.post('/api/mesin-cache/add', async (c) => {
  try {
    const body = await c.req.json() as {
      id_mesin: number, up3: string, kode_unit: number, nama_unit: string,
      mesin: string, type?: string, s_n?: string, nama_mesin?: string, terpasang?: number
    }
    const today = new Date().toISOString().slice(0,10)
    // is_manual=1 agar mesin ini tidak terhapus saat sync dari Google Sheets
    await c.env.DB.prepare(`
      INSERT OR REPLACE INTO mesin_cache
        (id_mesin, up3, kode_unit, nama_unit, mesin, type, s_n, nama_mesin, terpasang, cached_at, is_manual)
      VALUES (?,?,?,?,?,?,?,?,?,?,1)
    `).bind(
      body.id_mesin, body.up3 || '', body.kode_unit, body.nama_unit,
      body.mesin, body.type || null, body.s_n || null,
      body.nama_mesin || body.mesin, body.terpasang || null, today
    ).run()
    return c.json({ success: true, id_mesin: body.id_mesin })
  } catch (e: any) { return c.json({ success: false, error: e.message }, 500) }
})

// Edit mesin manual (hanya is_manual=1)
app.put('/api/mesin-cache/:id_mesin', async (c) => {
  try {
    const id = Number(c.req.param('id_mesin'))
    // Cek apakah mesin ini is_manual=1
    const check = await c.env.DB.prepare(
      `SELECT is_manual FROM mesin_cache WHERE id_mesin = ?`
    ).bind(id).first() as { is_manual: number } | null
    if (!check) return c.json({ success: false, error: 'Mesin tidak ditemukan' }, 404)
    if (!check.is_manual) return c.json({ success: false, error: 'Hanya mesin manual yang bisa diedit' }, 403)
    const body = await c.req.json() as {
      up3?: string, kode_unit?: number, nama_unit?: string,
      mesin?: string, type?: string, s_n?: string, nama_mesin?: string, terpasang?: number
    }
    await c.env.DB.prepare(`
      UPDATE mesin_cache
      SET up3=?, kode_unit=?, nama_unit=?, mesin=?, type=?, s_n=?, nama_mesin=?, terpasang=?
      WHERE id_mesin = ? AND is_manual = 1
    `).bind(
      body.up3 || '', body.kode_unit || 0, body.nama_unit || '',
      body.mesin || '', body.type || null, body.s_n || null,
      body.nama_mesin || body.mesin || '', body.terpasang || null, id
    ).run()
    return c.json({ success: true, id_mesin: id })
  } catch (e: any) { return c.json({ success: false, error: e.message }, 500) }
})

// Hapus mesin (hanya is_manual=1)
app.delete('/api/mesin-cache/:id_mesin', async (c) => {
  try {
    const id = Number(c.req.param('id_mesin'))
    // Cek apakah mesin ini is_manual=1
    const check = await c.env.DB.prepare(
      `SELECT is_manual FROM mesin_cache WHERE id_mesin = ?`
    ).bind(id).first() as { is_manual: number } | null
    if (!check) return c.json({ success: false, error: 'Mesin tidak ditemukan' }, 404)
    if (!check.is_manual) return c.json({ success: false, error: 'Hanya mesin manual yang bisa dihapus' }, 403)
    const r = await c.env.DB.prepare(
      `DELETE FROM mesin_cache WHERE id_mesin = ? AND is_manual = 1`
    ).bind(id).run()
    return c.json({ success: true, deleted: r.meta.changes })
  } catch (e: any) { return c.json({ success: false, error: e.message }, 500) }
})

// ─── DELETE data_monitoring by date range ───────────────────
// WAJIB sertakan kode_unit dan jam agar tidak hapus data unit/periode lain
app.delete('/api/monitoring/by-date', async (c) => {
  try {
    const db         = c.env.DB
    const tgl_dari   = c.req.query('dari')
    const tgl_sampai = c.req.query('sampai')
    const kode_unit  = c.req.query('kode_unit')
    const jam        = c.req.query('jam')
    if (!tgl_dari || !tgl_sampai) return c.json({ success: false, error: 'dari dan sampai wajib diisi' }, 400)
    if (!kode_unit)  return c.json({ success: false, error: 'kode_unit wajib diisi' }, 400)
    if (!jam)        return c.json({ success: false, error: 'jam wajib diisi (12=siang, 18=malam)' }, 400)
    // JOIN ke mesin_cache agar filter by kode_unit
    const r = await db.prepare(`
      DELETE FROM data_monitoring
      WHERE tanggal BETWEEN ? AND ?
        AND jam = ?
        AND mesin_id IN (
          SELECT id_mesin FROM mesin_cache WHERE kode_unit = ?
        )
    `).bind(tgl_dari, tgl_sampai, jam, kode_unit).run()
    return c.json({ success: true, deleted: r.meta.changes, dari: tgl_dari, sampai: tgl_sampai, kode_unit, jam })
  } catch (e: any) { return c.json({ success: false, error: e.message }, 500) }
})

// ============================================================
// API: MONITORING
// ============================================================
// Jam range per periode
// Siang: 06-17, Malam: 18-23 DAN 00-05 (cross-midnight)
function periodeJamFilter(periode: string | null): string {
  if (periode === 'siang') return `(CAST(dm.jam AS INTEGER) >= 6 AND CAST(dm.jam AS INTEGER) <= 17)`
  if (periode === 'malam') return `(CAST(dm.jam AS INTEGER) >= 18 OR CAST(dm.jam AS INTEGER) <= 5)`
  return '1=1'  // tanpa filter
}

app.get('/api/monitoring', async (c) => {
  try {
    const tanggal   = c.req.query('tanggal') || new Date().toISOString().split('T')[0]
    const periode   = c.req.query('periode') || null
    const jam       = c.req.query('jam')     || null   // filter jam eksak
    const kode_unit = c.req.query('kode_unit') || null

    let query = `SELECT dm.* FROM data_monitoring dm WHERE dm.tanggal = ?`
    const params: any[] = [tanggal]
    if (jam) {
      // Filter jam eksak (misal jam=12 atau jam=18)
      query += ` AND dm.jam = ?`
      params.push(jam)
    } else {
      // Filter periode (range jam)
      query += ` AND ${periodeJamFilter(periode)}`
    }
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
           temp_air_pendingin,tegangan,frequency,cos_phi,jam_kerja_mesin,status_mesin,kwh_produksi,pemakaian_bbm,keterangan,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
        ON CONFLICT(mesin_id,tanggal,jam) DO UPDATE SET
          daya_mampu=excluded.daya_mampu,beban=excluded.beban,stand_kwh=excluded.stand_kwh,stand_bbm=excluded.stand_bbm,
          phasa_r=excluded.phasa_r,phasa_s=excluded.phasa_s,phasa_t=excluded.phasa_t,tek_oli=excluded.tek_oli,
          temp_air_pendingin=excluded.temp_air_pendingin,tegangan=excluded.tegangan,frequency=excluded.frequency,
          cos_phi=excluded.cos_phi,jam_kerja_mesin=excluded.jam_kerja_mesin,status_mesin=excluded.status_mesin,
          kwh_produksi=excluded.kwh_produksi,pemakaian_bbm=excluded.pemakaian_bbm,keterangan=excluded.keterangan,
          updated_at=CURRENT_TIMESTAMP
      `).bind(
        r.mesin_id, tanggal, jam,
        r.daya_mampu??null, r.beban??null, r.stand_kwh??null, r.stand_bbm??null,
        r.phasa_r??null, r.phasa_s??null, r.phasa_t??null, r.tek_oli??null,
        r.temp_air_pendingin??null, r.tegangan??null, r.frequency??null,
        r.cos_phi??null, r.jam_kerja_mesin??null,
        r.status_mesin||'Operasi', r.kwh_produksi??null, r.pemakaian_bbm??null,
        r.keterangan??null
      )
    )
    await c.env.DB.batch(stmts)
    return c.json({ success: true, saved: records.length })
  } catch (e: any) { return c.json({ success: false, error: e.message }, 500) }
})

// ============================================================
// API: SYNC LOG SHEET → Google Sheets backup via Apps Script
// ============================================================
const LOGSHEET_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx8-uV4vAu2E5nFs_Do3Be9FCzo20daUm7JJBeAxtitObNNebepoNkJbd9DCg_HfwBL/exec'

app.post('/api/monitoring/sync-sheets', async (c) => {
  try {
    const { tanggal, periode, kode_unit, nama_unit, records } = await c.req.json() as {
      tanggal: string, periode: string, kode_unit: string, nama_unit: string,
      records: any[]
    }
    if (!tanggal || !records || !Array.isArray(records))
      return c.json({ success: false, error: 'tanggal dan records wajib' }, 400)

    // Jalankan di background via waitUntil — response langsung ke client tanpa nunggu Apps Script
    const payload = JSON.stringify({ tanggal, periode, kode_unit, nama_unit, records })
    c.executionCtx.waitUntil(
      fetch(LOGSHEET_APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: payload,
        signal: AbortSignal.timeout(25000) // max 25 detik di background, tidak block user
      }).catch(() => { /* abaikan error background */ })
    )

    // Langsung return ke client — Apps Script jalan di background
    return c.json({ success: true, queued: true })
  } catch (e: any) { return c.json({ success: false, error: e.message }, 500) }
})

// ============================================================
// API: OPERASIONAL
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
    const { kode_unit, nama_unit, tanggal, nama_operator, kwh_produksi, saldo_awal, saldo_akhir, penerimaan_bbm, estimasi_bbm_max, stock_oli_sae40, stock_oli_sx, stock_oli_sx_plus } = body
    if (!kode_unit || !tanggal) return c.json({ success: false, error: 'kode_unit dan tanggal wajib diisi' }, 400)
    // Tambah kolom jika belum ada (ALTER TABLE idempotent)
    try { await c.env.DB.prepare(`ALTER TABLE lap_operasional ADD COLUMN stock_oli_sae40 TEXT`).run() } catch(e){}
    try { await c.env.DB.prepare(`ALTER TABLE lap_operasional ADD COLUMN stock_oli_sx TEXT`).run() } catch(e){}
    try { await c.env.DB.prepare(`ALTER TABLE lap_operasional ADD COLUMN stock_oli_sx_plus TEXT`).run() } catch(e){}
    try { await c.env.DB.prepare(`ALTER TABLE lap_operasional ADD COLUMN dokumen_base64 TEXT`).run() } catch(e){}
    try { await c.env.DB.prepare(`ALTER TABLE lap_operasional ADD COLUMN dokumen_nama TEXT`).run() } catch(e){}
    try { await c.env.DB.prepare(`ALTER TABLE lap_operasional ADD COLUMN dokumen_type TEXT`).run() } catch(e){}
    try { await c.env.DB.prepare(`ALTER TABLE lap_operasional ADD COLUMN dokumen_url TEXT`).run() } catch(e){}
    await c.env.DB.prepare(`
      INSERT INTO lap_operasional (kode_unit,nama_unit,tanggal,nama_operator,kwh_produksi,saldo_awal,saldo_akhir,penerimaan_bbm,estimasi_bbm_max,stock_oli_sae40,stock_oli_sx,stock_oli_sx_plus,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
      ON CONFLICT(kode_unit,tanggal) DO UPDATE SET
        nama_unit=excluded.nama_unit, nama_operator=excluded.nama_operator,
        kwh_produksi=excluded.kwh_produksi, saldo_awal=excluded.saldo_awal,
        saldo_akhir=excluded.saldo_akhir, penerimaan_bbm=excluded.penerimaan_bbm,
        estimasi_bbm_max=excluded.estimasi_bbm_max,
        stock_oli_sae40=excluded.stock_oli_sae40, stock_oli_sx=excluded.stock_oli_sx,
        stock_oli_sx_plus=excluded.stock_oli_sx_plus, updated_at=CURRENT_TIMESTAMP
    `).bind(
      kode_unit, nama_unit||'', tanggal, nama_operator||'',
      kwh_produksi??null, saldo_awal??null, saldo_akhir??null,
      penerimaan_bbm??null, estimasi_bbm_max??null,
      stock_oli_sae40??null, stock_oli_sx??null, stock_oli_sx_plus??null
    ).run()
    return c.json({ success: true })
  } catch (e: any) { return c.json({ success: false, error: e.message }, 500) }
})

// ============================================================
// ============================================================
// SERVICE ACCOUNT — hanya untuk Google Sheets (catat log dokumen)
// ============================================================
const SA_EMAIL       = 'pltd-service@pltd-upload.iam.gserviceaccount.com'
const SA_KEY_ID      = 'd924253a34a279f108e0aec4fc7c83c661548e97'
const SHEETS_ID      = '17QuFT3vK9uQZ7iQtY8iEA5LPiVt2tuTtBxu7Ekdgdac'
const SA_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQC8/Bx6mn54ezEO
fzs4hcDDpOWabZM71Ei5XL+QIqwXbaOqbAPj1Yj/O8mwforbC0Kwu7A0iCrHPOYv
mRP/KYt3+Vs4tP/j478rCrm9amuDWbwF/SQ+OqRowanl8QCzAdpfSdjKz/AkXTu8
pb29EfMKVMGVSXjRxD18bMBa4Re4sq6Yjutr4f833ZkXXFHpOtucSYpQit/vyBSq
zR/BEzw8HDl0kA/aAty82LJAMPbZC2Dumxp/BtXd9wSaV3peKYUmboa81qK2ZlJc
+zqzUC2faFMkq6/P1cNIY0iRvbjBxMWhj77PENpmZQcQJBBJrdEkSAXn3w1JJ+BE
9NRfFDrfAgMBAAECgf9mEIBHfeZeDtT97GOnIxoxOhYu+5Z/WqIlCCGvme22IcLj
uUxzfVr7AilKFbg9sRARII7jhEgH/R5BQUVJF3wx3YzraK+IIfM5QjxQZX57x0ax
vG26EZLyaOfBZDgPa93P94PSKscL0yifbcdgqqZVjzfhACKCouspzHWkn0HbHpsv
ehgveRBW7EWygZCi98fdHedwUkMj+EPlU9aKOF16YX4RBdCaP0xAHXWBIM/nBQO8
A5XX8LPAXRbrW6QRrL4xR7C82iQGdFhLcYF1Iwkiwg9ipplyNVqk7zUvEDzXwB2o
NUq/SyFD1mMxDO9A4Oqk9p5wFaIPY0Rgj+snw2ECgYEA4rr+kwJg2Sad+veF59Vh
bpwBFNRqmxpzFOQnARkSG3gB398Z+ut95EH7tjgHCwj4laY03Suumkh02BE77xlB
TXDpAn2Zmg55G/LB1M3zFJ/IqJ5SsZEkfYreKahr6VaygKCvURuOe7FcYCBMMr8p
0pswhBBKLJGYSDECXE+Q/jECgYEA1WGyLzR43oudiIozQ0XQ1dM2Ks3LyUr+Lt0B
RaXoaP0DObCfynbxO7l23KRkuSVaRLWFmslI9VB3W+DzJKQOjsYksjrOGD6WMCil
Bd10DKE7P7CT/4Fub7VOHwkMhVKK585rvDyKWLxLeRLC2k3CSnFP3thElFQEL+6u
yK6nNg8CgYEAnKSQiUSVYLF7aA5mpxsW63JAlQGEfZAyffZ6tBl8Fxo8QU1EB8V2
/qJPoz7mLsuN4uYnk75ALTtt7nFJtRD/ut8NPLlFy9e/+H0pSTrYfCFAYq6vdxpN
2aZ9gs5nb5iETrW1KhYdxHtu1MK7ojvMS0MIq9UNSel1CjtB5EDcbaECgYEAqLKd
ce6VJLTSrhE86BG5QmPCrmKXm6P7g0dc6xh4vxBRTXnTSvlwTNybGWOq8imSzUGJ
yE8crD2ar/wPnsdJbx0+A96z87z/dkGb/iAP0LBjrD3JNDa6/fwkMCsyR/FzOkMb
L+3ZHsB3Fth7TqYtVjdxgugOiApIaTDV5HkYX4cCgYBupxmjD6GE16UGNP09IWmX
kMycQktjZXca5fyoW7Km+v9pQlw1vAaLR1MBJTPG2Iyz3wKvxsUul4VztHxHnB47
bPcCohqhI6DzDPtpMS90MNOGwNwkrvI9UOPJe3/NulwNs3BWN6CYXW2ZRieWEPuj
6vKIyNBEsPIOrVa81hESfQ==
-----END PRIVATE KEY-----`

function b64url(data: ArrayBuffer): string {
  const bytes = new Uint8Array(data)
  let str = ''
  for (const b of bytes) str += String.fromCharCode(b)
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function getGoogleAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT', kid: SA_KEY_ID }
  const claim  = {
    iss: SA_EMAIL,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  }
  const enc       = new TextEncoder()
  const headerB64 = b64url(enc.encode(JSON.stringify(header)).buffer as ArrayBuffer)
  const claimB64  = b64url(enc.encode(JSON.stringify(claim)).buffer as ArrayBuffer)
  const sigInput  = `${headerB64}.${claimB64}`
  const pemBody   = SA_PRIVATE_KEY
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '')
  const keyBytes  = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0))
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', keyBytes.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  )
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, enc.encode(sigInput))
  const jwt = `${sigInput}.${b64url(sig)}`
  const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`
  })
  const tokenJson: any = await tokenResp.json()
  if (!tokenJson.access_token) throw new Error('Token error: ' + JSON.stringify(tokenJson))
  return tokenJson.access_token
}

// ============================================================
// API: CATAT LOG DOKUMEN ke Google Sheets
// ============================================================
app.post('/api/log-sheets', async (c) => {
  try {
    const { kode_unit, nama_unit, tanggal, fileName, imgUrl } = await c.req.json()
    if (!imgUrl) return c.json({ success: false, error: 'imgUrl wajib' }, 400)

    const token = await getGoogleAccessToken()
    const now   = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })

    // Pastikan header ada (baris 1) — cek dulu
    const checkResp = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/Sheet1!A1:F1`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const checkJson: any = await checkResp.json()
    const hasHeader = checkJson.values && checkJson.values.length > 0

    if (!hasHeader) {
      // Tulis header dulu
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/Sheet1!A1:F1?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ values: [['Timestamp', 'Kode Unit', 'Nama Unit', 'Tanggal', 'Nama File', 'URL Gambar']] })
        }
      )
    }

    // Append baris data
    const appendResp = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/Sheet1!A:F:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [[now, kode_unit || '', nama_unit || '', tanggal || '', fileName || '', imgUrl]] })
      }
    )
    const appendJson: any = await appendResp.json()
    if (appendJson.error) throw new Error(JSON.stringify(appendJson.error))

    return c.json({ success: true, updatedRange: appendJson.updates?.updatedRange })
  } catch(e: any) { return c.json({ success: false, error: e.message }, 500) }
})

// ============================================================
// API: DEBUG — cek info spreadsheet (nama sheet, dll)
// ============================================================
// Preview pesan WA logsheet (sementara untuk verifikasi)
app.get('/api/preview-pesan', async (c) => {
  try {
    const kode_unit = Number(c.req.query('kode_unit'))
    const tanggal   = c.req.query('tanggal') || ''
    const jam       = c.req.query('jam') || ''
    const pesan = await buildPesanJam(c.env.DB, kode_unit, tanggal, jam)
    return c.text(pesan || '(null — tidak ada data)')
  } catch (e: any) { return c.text('ERROR: ' + e.message) }
})

app.get('/api/debug-sheets', async (c) => {
  try {
    const token = await getGoogleAccessToken()
    // Ambil metadata spreadsheet (sheet names)
    const metaResp = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}?fields=sheets.properties.title`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const meta: any = await metaResp.json()
    // Baca baris pertama sheet pertama
    const sheetTitle = meta.sheets?.[0]?.properties?.title || 'Sheet1'
    const readResp = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/${encodeURIComponent(sheetTitle)}!A1:F20`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const readJson: any = await readResp.json()
    return c.json({ success: true, sheets: meta.sheets?.map((s: any) => s.properties.title), firstRows: readJson.values || [] })
  } catch(e: any) { return c.json({ success: false, error: e.message }, 500) }
})

// ============================================================
// API: UPLOAD GAMBAR ke ImgBB (proxy — API key aman di server)
// ============================================================
const IMGBB_API_KEY = 'bb2f97ad9b31b5ae4967eeead61e03de'

app.post('/api/upload', async (c) => {
  try {
    const body = await c.req.json()
    const { base64, fileName, kode_unit, tanggal } = body
    if (!base64) return c.json({ success: false, error: 'base64 wajib diisi' }, 400)

    // Kirim ke ImgBB
    const form = new URLSearchParams()
    form.append('key', IMGBB_API_KEY)
    form.append('image', base64)
    if (fileName) form.append('name', fileName)

    const resp = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: form
    })
    const json: any = await resp.json()

    if (!json.success) {
      return c.json({ success: false, error: 'ImgBB error: ' + JSON.stringify(json.error || json) }, 500)
    }

    // Ambil ID dari url_viewer atau url lalu bentuk https://ibb.co.com/ID
    const _rawUrl = json.data.url_viewer || json.data.url || ''
    const _match  = _rawUrl.match(/ibb\.co(?:\.com)?\/([^\/\s]+)/)
    const fileUrl  = _match ? 'https://ibb.co.com/' + _match[1] : _rawUrl
    const viewUrl  = json.data.url_viewer // URL halaman viewer
    const imgName  = json.data.title || fileName || 'dokumen'

    // Simpan URL ke lap_operasional jika ada kode_unit & tanggal
    if (kode_unit && tanggal) {
      await c.env.DB.prepare(`
        UPDATE lap_operasional
        SET dokumen_url=?, dokumen_nama=?, updated_at=CURRENT_TIMESTAMP
        WHERE kode_unit=? AND tanggal=?
      `).bind(fileUrl, imgName, Number(kode_unit), tanggal).run()
    }

    return c.json({ success: true, url: fileUrl, viewUrl, fileName: imgName })
  } catch(e: any) { return c.json({ success: false, error: e.message }, 500) }
})

// ============================================================
// API: SIMPAN URL DOKUMEN ke D1
// ============================================================
app.post('/api/lap-operasional/dokumen', async (c) => {
  try {
    const body = await c.req.json()
    const {
      kode_unit, tanggal, dokumen_url, dokumen_nama, nama_unit,
      nama_operator, kwh_produksi, saldo_awal, saldo_akhir,
      penerimaan_bbm, estimasi_bbm_max,
      stock_oli_sae40, stock_oli_sx, stock_oli_sx_plus
    } = body
    if (!kode_unit || !tanggal || !dokumen_url) return c.json({ success: false, error: 'Parameter tidak lengkap' }, 400)
    // INSERT baris jika belum ada, UPDATE dokumen + semua field form jika nilai tidak null
    await c.env.DB.prepare(`
      INSERT INTO lap_operasional
        (kode_unit, nama_unit, tanggal, nama_operator,
         kwh_produksi, saldo_awal, saldo_akhir, penerimaan_bbm, estimasi_bbm_max,
         stock_oli_sae40, stock_oli_sx, stock_oli_sx_plus,
         dokumen_url, dokumen_nama)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(kode_unit, tanggal) DO UPDATE SET
        dokumen_url       = excluded.dokumen_url,
        dokumen_nama      = excluded.dokumen_nama,
        nama_operator     = COALESCE(excluded.nama_operator,     lap_operasional.nama_operator),
        kwh_produksi      = COALESCE(excluded.kwh_produksi,      lap_operasional.kwh_produksi),
        saldo_awal        = COALESCE(excluded.saldo_awal,        lap_operasional.saldo_awal),
        saldo_akhir       = COALESCE(excluded.saldo_akhir,       lap_operasional.saldo_akhir),
        penerimaan_bbm    = COALESCE(excluded.penerimaan_bbm,    lap_operasional.penerimaan_bbm),
        estimasi_bbm_max  = COALESCE(excluded.estimasi_bbm_max,  lap_operasional.estimasi_bbm_max),
        stock_oli_sae40   = COALESCE(excluded.stock_oli_sae40,   lap_operasional.stock_oli_sae40),
        stock_oli_sx      = COALESCE(excluded.stock_oli_sx,      lap_operasional.stock_oli_sx),
        stock_oli_sx_plus = COALESCE(excluded.stock_oli_sx_plus, lap_operasional.stock_oli_sx_plus),
        updated_at        = CURRENT_TIMESTAMP
    `).bind(
      kode_unit, nama_unit || '', tanggal,
      nama_operator ?? null,
      kwh_produksi ?? null, saldo_awal ?? null, saldo_akhir ?? null,
      penerimaan_bbm ?? null, estimasi_bbm_max ?? null,
      stock_oli_sae40 ?? null, stock_oli_sx ?? null, stock_oli_sx_plus ?? null,
      dokumen_url, dokumen_nama || 'dokumen'
    ).run()
    return c.json({ success: true })
  } catch(e: any) { return c.json({ success: false, error: e.message }, 500) }
})

// ============================================================
// API: STOCK OLI (rekap stock oli per unit per tanggal)
// ============================================================
app.get('/api/stock-oli', async (c) => {
  try {
    const tanggal = c.req.query('tanggal') || new Date().toISOString().split('T')[0]
    const result = await c.env.DB.prepare(`
      SELECT kode_unit, nama_unit, tanggal, stock_oli_sae40, stock_oli_sx, stock_oli_sx_plus
      FROM lap_operasional WHERE tanggal = ? ORDER BY kode_unit
    `).bind(tanggal).all<any>()

    // Gabungkan dengan UNIT_META untuk urutan dan nomor
    const unitMetaKeys = [366,910,385,911,913,372,915,918,919,917,920,399,390,382,391,376,373,395,375]
    const dataMap: Record<number, any> = {}
    for (const row of result.results) dataMap[row.kode_unit] = row

    const rows = unitMetaKeys.map((kode, idx) => {
      const row = dataMap[kode]
      return {
        no: idx + 1,
        kode_unit: kode,
        nama_unit: row?.nama_unit ?? (Object.values({366:'ULD BABAI',910:'ULD MANGKATIP',385:'ULD RANGGA ILUNG',911:'ULD TELUK BETUNG',913:'ULD TUMPUNG LAUNG',372:'ULD GUNUNG PUREI',915:'ULD SUNGAI BALI',918:'ULD KERAYAAN',919:'ULD KERUMPUTAN',917:'ULD KERASIAN',920:'ULD MARABATUAN',399:'ULD TUMBANG SENAMANG',390:'ULD TELAGA',382:'ULD PAGATAN',391:'ULD TELAGA PULANG',376:'ULD MENDAWAI',373:'ULD KENAMBUI',395:'ULD TUMBANG MANJUL',375:'ULD KUDANGAN'} as Record<number,string>)[kode] ?? '-'),
        sae40: row ? (row.stock_oli_sae40 ?? 'tidak menggunakan') : null,
        sx:    row ? (row.stock_oli_sx    ?? 'tidak menggunakan') : null,
        sx_plus: row ? (row.stock_oli_sx_plus ?? 'tidak menggunakan') : null
      }
    })
    return c.json({ success: true, data: rows })
  } catch (e: any) { return c.json({ success: false, error: e.message }, 500) }
})

// ============================================================
// API: DATA STOK (tabel rekap semua unit per tanggal)
// ============================================================
// Data statis per unit: jalur, kapasitas tangki (liter), stock mati (liter)
// NO di sini sesuai urutan dari dokumen resmi
const UNIT_META: Record<number, { no: number, jalur: string, kapasitas_tangki: number, stock_mati: number }> = {
  366: { no:  1, jalur: 'SUNGAI',               kapasitas_tangki: 52000, stock_mati: 1500 }, // BABAI
  910: { no:  2, jalur: 'SUNGAI',               kapasitas_tangki: 60000, stock_mati: 3500 }, // MANGKATIP
  385: { no:  3, jalur: 'SUNGAI',               kapasitas_tangki: 47000, stock_mati: 1500 }, // RANGGA ILUNG
  911: { no:  4, jalur: 'SUNGAI',               kapasitas_tangki: 28000, stock_mati: 1500 }, // TELUK BETUNG
  913: { no:  5, jalur: 'SUNGAI',               kapasitas_tangki: 62000, stock_mati: 5000 }, // TUMPUNG LAUNG
  372: { no:  6, jalur: 'DARAT',                kapasitas_tangki: 40000, stock_mati: 1000 }, // GUNUNG PUREI
  915: { no:  7, jalur: 'DARAT - LAUT',         kapasitas_tangki: 54000, stock_mati: 1000 }, // SUNGAI BALI
  918: { no: 10, jalur: 'DARAT - LAUT',         kapasitas_tangki: 41000, stock_mati:    0 }, // KERAYAAN
  919: { no: 11, jalur: 'DARAT - LAUT',         kapasitas_tangki: 21000, stock_mati: 1000 }, // KERUMPUTAN
  917: { no: 12, jalur: 'DARAT - LAUT',         kapasitas_tangki: 34000, stock_mati:    0 }, // KERASIAN
  920: { no: 13, jalur: 'DARAT - LAUT',         kapasitas_tangki: 28000, stock_mati:    0 }, // MARABATUAN
  399: { no: 14, jalur: 'DARAT - SUNGAI - DARAT', kapasitas_tangki: 38000, stock_mati: 10000 }, // TUMBANG SENAMANG
  390: { no: 15, jalur: 'DARAT - SUNGAI',       kapasitas_tangki: 20000, stock_mati: 1000 }, // TELAGA
  382: { no: 16, jalur: 'DARAT - LAUT - SUNGAI', kapasitas_tangki: 49000, stock_mati: 4500 }, // PAGATAN
  391: { no: 17, jalur: 'DARAT',                kapasitas_tangki: 20000, stock_mati: 1500 }, // TELAGA PULANG
  376: { no: 18, jalur: 'DARAT - LAUT - SUNGAI', kapasitas_tangki: 83000, stock_mati: 5000 }, // MENDAWAI
  373: { no: 19, jalur: 'DARAT',                kapasitas_tangki: 20000, stock_mati: 2000 }, // KENAMBUI
  395: { no: 20, jalur: 'DARAT - SUNGAI',       kapasitas_tangki: 46000, stock_mati: 1000 }, // TUMBANG MANJUL
  375: { no: 21, jalur: 'DARAT',                kapasitas_tangki: 46000, stock_mati: 1500 }, // KUDANGAN
}

// ─── PADAM ─────────────────────────────────────────────────────────────────
// Hitung: nilai_per_mesin = (Total BP tanggal terakhir ada data - beban non-padam) / jumlah mesin padam yang terakhir Operasi
// "Tanggal terakhir ada data" = tanggal MAX di data_monitoring untuk unit ini, sebelum tanggal dipilih
// Hanya mesin yang record terakhirnya berstatus Operasi yang mendapat nilai, jika negatif → 0
app.get('/api/padam', async (c) => {
  try {
    const db               = c.env.DB
    const tanggal          = c.req.query('tanggal')          || new Date().toISOString().split('T')[0]
    const kode_unit        = c.req.query('kode_unit')        || ''
    const mesinIdsRaw      = c.req.query('mesin_ids')        || '[]'
    const bebanNonPadamRaw = c.req.query('beban_non_padam')  || '0'
    const jam              = c.req.query('jam')              || '18'  // periode: siang=12, malam=18

    let mesinIds: number[] = []
    try { mesinIds = JSON.parse(mesinIdsRaw) } catch { mesinIds = [] }
    if (mesinIds.length === 0) return c.json({ success: true, total_bp_last: 0, nilai_per_mesin: 0, mesin_eligible: [] })

    const bebanNonPadam = parseFloat(bebanNonPadamRaw) || 0

    // Cari tanggal TERAKHIR yang ada datanya di DB untuk unit ini, sebelum tanggal dipilih
    // Filter juga berdasarkan jam periode yang sama
    const lastTglRow = await db.prepare(
      `SELECT MAX(dm.tanggal) as last_tanggal
       FROM data_monitoring dm
       INNER JOIN mesin_cache mc ON mc.id_mesin = dm.mesin_id
       WHERE mc.kode_unit = ? AND dm.tanggal < ? AND dm.jam = ?`
    ).bind(kode_unit, tanggal, jam).first() as any

    const tanggalLast = lastTglRow?.last_tanggal || null

    // Ambil total BP H-1 hanya dari jam/periode yang sama
    const totalBpLast = tanggalLast ? (() => {
      return db.prepare(
        `SELECT COALESCE(SUM(dm.beban), 0) as total_bp
         FROM data_monitoring dm
         INNER JOIN mesin_cache mc ON mc.id_mesin = dm.mesin_id
         WHERE mc.kode_unit = ? AND dm.tanggal = ? AND dm.jam = ? AND dm.status_mesin = 'Operasi'`
      ).bind(kode_unit, tanggalLast, jam).first()
    })() : Promise.resolve(null)

    const bpLastRow      = await totalBpLast as any
    const totalBpLastVal = bpLastRow ? (parseFloat(bpLastRow.total_bp) || 0) : 0

    // Cek tiap mesin padam — eligible hanya jika record TERAKHIR periode sama sebelum tanggal ini berstatus Operasi
    const mesinEligible: number[] = []
    for (const mesinId of mesinIds) {
      const lastRow = await db.prepare(
        `SELECT status_mesin FROM data_monitoring
         WHERE mesin_id = ? AND tanggal < ? AND jam = ?
         ORDER BY tanggal DESC
         LIMIT 1`
      ).bind(mesinId, tanggal, jam).first() as any
      // Eligible hanya jika record terakhir periode sama sebelum tanggal ini adalah Operasi
      if (lastRow && lastRow.status_mesin === 'Operasi') mesinEligible.push(mesinId)
    }

    const jumlahEligible = mesinEligible.length
    const sisa           = totalBpLastVal - bebanNonPadam
    const nilaiPerMesin  = jumlahEligible > 0 ? Math.max(0, Math.round(sisa / jumlahEligible)) : 0

    return c.json({
      success:          true,
      total_bp_last:    totalBpLastVal,
      tanggal_last:     tanggalLast,
      nilai_per_mesin:  nilaiPerMesin,
      mesin_eligible:   mesinEligible,
    })
  } catch(e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

// Simpan event padam (dipanggil saat tombol PADAM berhasil diklik)
app.post('/api/event-padam', async (c) => {
  try {
    const { kode_unit, tanggal } = await c.req.json()
    if (!kode_unit || !tanggal) return c.json({ success: false, error: 'kode_unit dan tanggal wajib' }, 400)
    await c.env.DB.prepare(
      `INSERT OR IGNORE INTO event_padam (kode_unit, tanggal) VALUES (?, ?)`
    ).bind(kode_unit, tanggal).run()
    return c.json({ success: true })
  } catch(e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

// Hapus event padam (jika ingin reset status defisit)
app.delete('/api/event-padam', async (c) => {
  try {
    // Baca dari query string (DELETE /api/event-padam?kode_unit=919&tanggal=2026-05-02)
    const kode_unit = c.req.query('kode_unit') || ''
    const tanggal   = c.req.query('tanggal')   || ''
    if (!kode_unit || !tanggal) return c.json({ success: false, error: 'kode_unit dan tanggal wajib' }, 400)
    await c.env.DB.prepare(
      `DELETE FROM event_padam WHERE kode_unit = ? AND tanggal = ?`
    ).bind(kode_unit, tanggal).run()
    return c.json({ success: true })
  } catch(e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

// Cek apakah ada event padam untuk unit+tanggal tertentu
app.get('/api/event-padam', async (c) => {
  try {
    const kode_unit = c.req.query('kode_unit') || ''
    const tanggal   = c.req.query('tanggal')   || ''
    if (!kode_unit || !tanggal) return c.json({ success: false, error: 'kode_unit dan tanggal wajib' }, 400)
    const row = await c.env.DB.prepare(
      `SELECT id FROM event_padam WHERE kode_unit = ? AND tanggal = ?`
    ).bind(kode_unit, tanggal).first()
    return c.json({ success: true, ada_padam: !!row })
  } catch(e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

// Ambil semua event padam dalam satu bulan
app.get('/api/event-padam-bulanan', async (c) => {
  try {
    const bulan = c.req.query('bulan') || new Date().toISOString().slice(0, 7)
    const rows = await c.env.DB.prepare(
      `SELECT kode_unit, tanggal FROM event_padam WHERE tanggal LIKE ?`
    ).bind(`${bulan}-%`).all<{ kode_unit: number, tanggal: string }>()
    return c.json({ success: true, data: rows.results })
  } catch(e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

// ─── SFC ───────────────────────────────────────────────────────────────────
app.get('/api/sfc', async (c) => {
  try {
    const db      = c.env.DB
    const tanggal = c.req.query('tanggal') || new Date().toISOString().split('T')[0]

    // SFC per mesin dari data_monitoring jam malam (jam >= 18 atau jam <= 5)
    const rows = await db.prepare(`
      SELECT
        mc.kode_unit,
        mc.nama_unit,
        mc.id_mesin,
        mc.nama_mesin,
        SUM(CASE WHEN (CAST(dm.jam AS INTEGER) >= 18 OR CAST(dm.jam AS INTEGER) <= 5)
            AND dm.status_mesin = 'Operasi'
            THEN COALESCE(dm.pemakaian_bbm, 0) ELSE 0 END) as total_pemakaian_bbm,
        SUM(CASE WHEN (CAST(dm.jam AS INTEGER) >= 18 OR CAST(dm.jam AS INTEGER) <= 5)
            AND dm.status_mesin = 'Operasi'
            THEN COALESCE(dm.kwh_produksi, 0) ELSE 0 END) as total_kwh_produksi,
        COUNT(CASE WHEN (CAST(dm.jam AS INTEGER) >= 18 OR CAST(dm.jam AS INTEGER) <= 5)
            AND dm.status_mesin = 'Operasi' THEN 1 END) as jumlah_jam
      FROM data_monitoring dm
      JOIN mesin_cache mc ON dm.mesin_id = mc.id_mesin
      WHERE dm.tanggal = ?
        AND (CAST(dm.jam AS INTEGER) >= 18 OR CAST(dm.jam AS INTEGER) <= 5)
      GROUP BY mc.kode_unit, mc.id_mesin
      ORDER BY mc.kode_unit, mc.nama_mesin
    `).bind(tanggal).all<{
      kode_unit: number, nama_unit: string,
      id_mesin: number, nama_mesin: string,
      total_pemakaian_bbm: number, total_kwh_produksi: number, jumlah_jam: number
    }>()

    // Kelompokkan per ULD
    const unitMap: Record<number, {
      kode_unit: number, nama_unit: string,
      mesin: { id_mesin: number, nama_mesin: string, pemakaian_bbm: number, kwh_produksi: number, sfc: number | null }[],
      total_pemakaian_bbm: number, total_kwh_produksi: number
    }> = {}

    for (const r of rows.results) {
      if (!unitMap[r.kode_unit]) {
        unitMap[r.kode_unit] = {
          kode_unit: r.kode_unit,
          nama_unit: r.nama_unit,
          mesin: [],
          total_pemakaian_bbm: 0,
          total_kwh_produksi: 0
        }
      }
      const sfc = (r.total_kwh_produksi > 0)
        ? Math.round(r.total_pemakaian_bbm / r.total_kwh_produksi * 1000) / 1000
        : null
      unitMap[r.kode_unit].mesin.push({
        id_mesin:       r.id_mesin,
        nama_mesin:     r.nama_mesin,
        pemakaian_bbm:  Math.round(r.total_pemakaian_bbm * 100) / 100,
        kwh_produksi:   Math.round(r.total_kwh_produksi  * 100) / 100,
        sfc
      })
      unitMap[r.kode_unit].total_pemakaian_bbm += r.total_pemakaian_bbm
      unitMap[r.kode_unit].total_kwh_produksi  += r.total_kwh_produksi
    }

    // Konversi ke array, hitung SFC total per ULD
    const data = Object.values(unitMap).map(u => ({
      kode_unit:           u.kode_unit,
      nama_unit:           u.nama_unit,
      total_pemakaian_bbm: Math.round(u.total_pemakaian_bbm * 100) / 100,
      total_kwh_produksi:  Math.round(u.total_kwh_produksi  * 100) / 100,
      sfc: u.total_kwh_produksi > 0
        ? Math.round(u.total_pemakaian_bbm / u.total_kwh_produksi * 1000) / 1000
        : null,
      mesin: u.mesin
    }))

    return c.json({ success: true, data })
  } catch (e: any) { return c.json({ success: false, error: e.message }, 500) }
})

// ─── DETAIL MESIN PER ULD PER TANGGAL (untuk popup neraca daya) ────────────
app.get('/api/detail-mesin', async (c) => {
  try {
    const db        = c.env.DB
    const kode_unit = Number(c.req.query('kode_unit'))
    const tanggal   = c.req.query('tanggal') || ''
    if (!kode_unit || !tanggal) return c.json({ success: false, error: 'kode_unit dan tanggal wajib' }, 400)

    const rows = await db.prepare(`
      SELECT
        mc.id_mesin,
        mc.nama_mesin,
        mc.terpasang,
        -- Status mesin malam (ambil status paling dominan jam malam)
        (SELECT dm2.status_mesin FROM data_monitoring dm2
         WHERE dm2.mesin_id = mc.id_mesin AND dm2.tanggal = ?
           AND (CAST(dm2.jam AS INTEGER) >= 18 OR CAST(dm2.jam AS INTEGER) <= 5)
         GROUP BY dm2.status_mesin ORDER BY COUNT(*) DESC LIMIT 1
        ) as status_mesin,
        -- Daya mampu malam (max)
        MAX(CASE WHEN (CAST(dm.jam AS INTEGER) >= 18 OR CAST(dm.jam AS INTEGER) <= 5)
            THEN dm.daya_mampu ELSE NULL END) as daya_mampu,
        -- Beban malam (max)
        MAX(CASE WHEN (CAST(dm.jam AS INTEGER) >= 18 OR CAST(dm.jam AS INTEGER) <= 5)
            THEN dm.beban ELSE NULL END) as beban,
        -- SFC malam: sum(pemakaian_bbm) / sum(kwh_produksi) saat Operasi
        SUM(CASE WHEN (CAST(dm.jam AS INTEGER) >= 18 OR CAST(dm.jam AS INTEGER) <= 5)
            AND dm.status_mesin = 'Operasi'
            THEN COALESCE(dm.pemakaian_bbm, 0) ELSE 0 END) as total_bbm,
        SUM(CASE WHEN (CAST(dm.jam AS INTEGER) >= 18 OR CAST(dm.jam AS INTEGER) <= 5)
            AND dm.status_mesin = 'Operasi'
            THEN COALESCE(dm.kwh_produksi, 0) ELSE 0 END) as total_kwh,
        -- Jam kerja mesin malam: SUM jam_kerja_mesin saat Operasi di jam malam
        SUM(CASE WHEN (CAST(dm.jam AS INTEGER) >= 18 OR CAST(dm.jam AS INTEGER) <= 5)
            AND dm.status_mesin = 'Operasi'
            THEN COALESCE(dm.jam_kerja_mesin, 0) ELSE 0 END) as total_jam_kerja,
        -- has_data: 1 jika mesin punya minimal 1 record di tanggal ini, 0 jika tidak
        COUNT(dm.id) as jumlah_record
      FROM mesin_cache mc
      LEFT JOIN data_monitoring dm
        ON dm.mesin_id = mc.id_mesin AND dm.tanggal = ?
      WHERE mc.kode_unit = ?
      GROUP BY mc.id_mesin, mc.nama_mesin, mc.terpasang
      ORDER BY mc.id_mesin
    `).bind(tanggal, tanggal, kode_unit).all<{
      id_mesin: number, nama_mesin: string, terpasang: number | null,
      status_mesin: string | null, daya_mampu: number | null, beban: number | null,
      total_bbm: number, total_kwh: number, total_jam_kerja: number, jumlah_record: number
    }>()

    const data = rows.results.map(r => ({
      id_mesin:     r.id_mesin,
      nama_mesin:   r.nama_mesin,
      terpasang:    r.terpasang,
      has_data:     (r.jumlah_record ?? 0) > 0,   // true = punya data di tanggal ini
      status_mesin: r.status_mesin || '-',
      daya_mampu:   r.daya_mampu   != null ? Math.round(r.daya_mampu) : null,
      beban:        r.beban        != null ? Math.round(r.beban)       : null,
      pemakaian_bbm: r.total_bbm > 0 ? Math.round(r.total_bbm * 100) / 100 : null,
      kwh_produksi:  r.total_kwh > 0 ? Math.round(r.total_kwh * 100) / 100 : null,
      jam_kerja_mesin: r.total_jam_kerja > 0 ? Math.round(r.total_jam_kerja * 100) / 100 : null,
      sfc:          r.total_kwh > 0
        ? Math.round(r.total_bbm / r.total_kwh * 10000) / 10000
        : null
    }))

    return c.json({ success: true, data })
  } catch (e: any) { return c.json({ success: false, error: e.message }, 500) }
})

// ─── SFC 30 HARI ───────────────────────────────────────────────────────────
app.get('/api/sfc-bulanan', async (c) => {
  try {
    const db      = c.env.DB
    const tanggal = c.req.query('tanggal') || new Date().toISOString().split('T')[0]

    // Hitung 30 tanggal: H-29 s/d tanggal terpilih
    const dates: string[] = []
    const tglEnd = new Date(tanggal)
    for (let i = 29; i >= 0; i--) {
      const d = new Date(tglEnd)
      d.setDate(d.getDate() - i)
      dates.push(d.toISOString().split('T')[0])
    }
    const tglStart = dates[0]

    // Query SFC per mesin per tanggal (jam malam)
    const rows = await db.prepare(`
      SELECT
        mc.kode_unit,
        mc.nama_unit,
        mc.id_mesin,
        mc.nama_mesin,
        dm.tanggal,
        SUM(CASE WHEN dm.status_mesin = 'Operasi' THEN COALESCE(dm.pemakaian_bbm, 0) ELSE 0 END) as total_bbm,
        SUM(CASE WHEN dm.status_mesin = 'Operasi' THEN COALESCE(dm.kwh_produksi,  0) ELSE 0 END) as total_kwh
      FROM data_monitoring dm
      JOIN mesin_cache mc ON dm.mesin_id = mc.id_mesin
      WHERE dm.tanggal >= ? AND dm.tanggal <= ?
        AND (CAST(dm.jam AS INTEGER) >= 18 OR CAST(dm.jam AS INTEGER) <= 5)
      GROUP BY mc.kode_unit, mc.id_mesin, dm.tanggal
      ORDER BY mc.kode_unit, mc.nama_mesin, dm.tanggal
    `).bind(tglStart, tanggal).all<{
      kode_unit: number, nama_unit: string,
      id_mesin: number, nama_mesin: string,
      tanggal: string, total_bbm: number, total_kwh: number
    }>()

    // Struktur: unitMap[kode_unit] = { nama_unit, mesin: { id_mesin, nama_mesin, daily: { tgl: sfc } }, daily: { tgl: sfc } }
    const unitMap: Record<number, {
      kode_unit: number, nama_unit: string,
      daily: Record<string, { bbm: number, kwh: number }>,
      mesinMap: Record<number, { nama_mesin: string, daily: Record<string, number | null> }>
    }> = {}

    for (const r of rows.results) {
      if (!unitMap[r.kode_unit]) {
        unitMap[r.kode_unit] = { kode_unit: r.kode_unit, nama_unit: r.nama_unit, daily: {}, mesinMap: {} }
      }
      // Akumulasi per ULD per tanggal
      if (!unitMap[r.kode_unit].daily[r.tanggal]) {
        unitMap[r.kode_unit].daily[r.tanggal] = { bbm: 0, kwh: 0 }
      }
      unitMap[r.kode_unit].daily[r.tanggal].bbm += r.total_bbm
      unitMap[r.kode_unit].daily[r.tanggal].kwh += r.total_kwh

      // Per mesin per tanggal
      if (!unitMap[r.kode_unit].mesinMap[r.id_mesin]) {
        unitMap[r.kode_unit].mesinMap[r.id_mesin] = { nama_mesin: r.nama_mesin, daily: {} }
      }
      const sfc = r.total_kwh > 0 ? Math.round(r.total_bbm / r.total_kwh * 1000) / 1000 : null
      unitMap[r.kode_unit].mesinMap[r.id_mesin].daily[r.tanggal] = sfc
    }

    // Konversi ke array
    const data = Object.values(unitMap).map(u => {
      // SFC per ULD per tanggal
      const daily: Record<string, number | null> = {}
      for (const tgl of dates) {
        const d = u.daily[tgl]
        daily[tgl] = (d && d.kwh > 0) ? Math.round(d.bbm / d.kwh * 1000) / 1000 : null
      }
      // Per mesin
      const mesin = Object.values(u.mesinMap).map(m => ({
        nama_mesin: m.nama_mesin,
        daily: m.daily
      }))
      return { kode_unit: u.kode_unit, nama_unit: u.nama_unit, daily, mesin }
    })

    return c.json({ success: true, data, dates })
  } catch (e: any) { return c.json({ success: false, error: e.message }, 500) }
})

// ─── NERACA DAYA ───────────────────────────────────────────────────────────
app.get('/api/neraca-daya', async (c) => {
  try {
    const db      = c.env.DB
    const tanggal = c.req.query('tanggal') || new Date().toISOString().split('T')[0]

    // Hitung tanggal H-1
    const tglDate = new Date(tanggal)
    tglDate.setDate(tglDate.getDate() - 1)
    const tanggalH1 = tglDate.toISOString().split('T')[0]

    // Ambil semua unit dari mesin_cache
    const units = await db.prepare(
      `SELECT DISTINCT kode_unit, nama_unit FROM mesin_cache ORDER BY nama_unit`
    ).all<{ kode_unit: number, nama_unit: string }>()

    // DM terpasang per unit (SUM terpasang dari mesin_cache)
    const terpasangRows = await db.prepare(
      `SELECT kode_unit, SUM(terpasang) as dm_terpasang FROM mesin_cache WHERE terpasang IS NOT NULL GROUP BY kode_unit`
    ).all<{ kode_unit: number, dm_terpasang: number }>()
    const terpasangMap: Record<number, number> = {}
    for (const r of terpasangRows.results) terpasangMap[r.kode_unit] = Math.round(r.dm_terpasang || 0)

    // kode_mesin representatif per unit (MIN kode_mesin yang tidak null)
    const kodeMesinRows = await db.prepare(
      `SELECT kode_unit, MIN(CAST(kode_mesin AS INTEGER)) as kode_mesin_int FROM mesin_cache WHERE kode_mesin IS NOT NULL AND kode_mesin != '' GROUP BY kode_unit`
    ).all<{ kode_unit: number, kode_mesin_int: number }>()
    const kodeMesinMap: Record<number, number | null> = {}
    for (const r of kodeMesinRows.results) kodeMesinMap[r.kode_unit] = r.kode_mesin_int || null

    // Data monitoring pada tanggal tersebut: dm_pasok = SUM daya_mampu (Operasi+Standby), beban = SUM beban (Operasi), max_dm = MAX daya_mampu
    const monRows = await db.prepare(`
      SELECT
        mc.kode_unit,
        -- Kolom utama: hanya dari data MALAM (jam >= 18 atau jam <= 5)
        SUM(CASE WHEN (CAST(dm.jam AS INTEGER) >= 18 OR CAST(dm.jam AS INTEGER) <= 5) AND dm.status_mesin IN ('Operasi','Standby') THEN COALESCE(dm.daya_mampu,0) ELSE 0 END) as dm_pasok,
        SUM(CASE WHEN (CAST(dm.jam AS INTEGER) >= 18 OR CAST(dm.jam AS INTEGER) <= 5) AND dm.status_mesin = 'Operasi' THEN COALESCE(dm.beban,0) ELSE 0 END) as beban_puncak,
        MAX(CASE WHEN (CAST(dm.jam AS INTEGER) >= 18 OR CAST(dm.jam AS INTEGER) <= 5) AND dm.status_mesin IN ('Operasi','Standby') THEN COALESCE(dm.daya_mampu,0) ELSE 0 END) as max_dm,
        COUNT(CASE WHEN (CAST(dm.jam AS INTEGER) >= 18 OR CAST(dm.jam AS INTEGER) <= 5) AND dm.status_mesin = 'Operasi' THEN 1 END) as jumlah_operasi,
        COUNT(CASE WHEN (CAST(dm.jam AS INTEGER) >= 18 OR CAST(dm.jam AS INTEGER) <= 5) AND dm.status_mesin = 'Standby' THEN 1 END) as jumlah_standby,
        COUNT(CASE WHEN (CAST(dm.jam AS INTEGER) >= 18 OR CAST(dm.jam AS INTEGER) <= 5) AND dm.status_mesin = 'Pemeliharaan' THEN 1 END) as jumlah_pemeliharaan,
        COUNT(CASE WHEN (CAST(dm.jam AS INTEGER) >= 18 OR CAST(dm.jam AS INTEGER) <= 5) AND dm.status_mesin = 'Gangguan' THEN 1 END) as jumlah_gangguan,
        COUNT(CASE WHEN (CAST(dm.jam AS INTEGER) >= 18 OR CAST(dm.jam AS INTEGER) <= 5) AND dm.status_mesin = 'Rusak' THEN 1 END) as jumlah_rusak,
        COUNT(CASE WHEN (CAST(dm.jam AS INTEGER) >= 18 OR CAST(dm.jam AS INTEGER) <= 5) THEN 1 END) as jumlah_mesin,
        SUM(CASE WHEN (CAST(dm.jam AS INTEGER) >= 18 OR CAST(dm.jam AS INTEGER) <= 5) AND dm.status_mesin = 'Operasi' THEN COALESCE(dm.jam_kerja_mesin,0) ELSE 0 END) as jam_operasi,
        -- BP Siang: hanya dari data SIANG (jam 6-17)
        SUM(CASE WHEN (CAST(dm.jam AS INTEGER) >= 6 AND CAST(dm.jam AS INTEGER) <= 17) AND dm.status_mesin = 'Operasi' THEN COALESCE(dm.beban,0) ELSE 0 END) as beban_puncak_siang,
        -- BP Malam: hanya dari data MALAM (jam >= 18 atau jam <= 5)
        SUM(CASE WHEN (CAST(dm.jam AS INTEGER) >= 18 OR CAST(dm.jam AS INTEGER) <= 5) AND dm.status_mesin = 'Operasi' THEN COALESCE(dm.beban,0) ELSE 0 END) as beban_puncak_malam,
        -- cnt_siang/cnt_malam: jumlah record (tanpa filter status) — untuk deteksi keberadaan data
        COUNT(CASE WHEN CAST(dm.jam AS INTEGER) >= 6  AND CAST(dm.jam AS INTEGER) <= 17 THEN 1 END) as cnt_siang,
        COUNT(CASE WHEN CAST(dm.jam AS INTEGER) >= 18 OR  CAST(dm.jam AS INTEGER) <= 5  THEN 1 END) as cnt_malam
      FROM data_monitoring dm
      JOIN mesin_cache mc ON dm.mesin_id = mc.id_mesin
      WHERE dm.tanggal = ?
      GROUP BY mc.kode_unit
    `).bind(tanggal).all<{ kode_unit: number, dm_pasok: number, beban_puncak: number, max_dm: number, jumlah_operasi: number, jumlah_standby: number, jumlah_pemeliharaan: number, jumlah_gangguan: number, jumlah_rusak: number, jumlah_mesin: number, jam_operasi: number, beban_puncak_siang: number, beban_puncak_malam: number, cnt_siang: number, cnt_malam: number }>()
    const monMap: Record<number, { dm_pasok: number, beban_puncak: number, max_dm: number, jumlah_operasi: number, jumlah_standby: number, jumlah_pemeliharaan: number, jumlah_gangguan: number, jumlah_rusak: number, jumlah_mesin: number, jam_operasi: number, beban_puncak_siang: number, beban_puncak_malam: number, has_siang: boolean, has_malam: boolean }> = {}
    for (const r of monRows.results) {
      monMap[r.kode_unit] = {
        dm_pasok:            Math.round(r.dm_pasok      || 0),
        beban_puncak:        Math.round(r.beban_puncak  || 0),
        max_dm:              Math.round(r.max_dm        || 0),
        jumlah_operasi:      r.jumlah_operasi      || 0,
        jumlah_standby:      r.jumlah_standby      || 0,
        jumlah_pemeliharaan: r.jumlah_pemeliharaan || 0,
        jumlah_gangguan:     r.jumlah_gangguan     || 0,
        jumlah_rusak:        r.jumlah_rusak        || 0,
        jumlah_mesin:        r.jumlah_mesin        || 0,
        jam_operasi:         Math.round((r.jam_operasi || 0) * 100) / 100,
        beban_puncak_siang:  Math.round(r.beban_puncak_siang  || 0),
        beban_puncak_malam:  Math.round(r.beban_puncak_malam  || 0),
        // has_siang/has_malam: ada record di jam tsb (tanpa filter status)
        has_siang:           (r.cnt_siang || 0) > 0,
        has_malam:           (r.cnt_malam || 0) > 0
      }
    }

    // Query DMN dan MAKS dari data malam H-1 (sebagai fallback jika belum ada data malam hari ini)
    const h1Rows = await db.prepare(`
      SELECT
        mc.kode_unit,
        SUM(CASE WHEN dm.status_mesin IN ('Operasi','Standby') AND (CAST(dm.jam AS INTEGER) >= 18 OR CAST(dm.jam AS INTEGER) <= 5) THEN COALESCE(dm.daya_mampu,0) ELSE 0 END) as dm_pasok_h1,
        MAX(CASE WHEN dm.status_mesin IN ('Operasi','Standby') AND (CAST(dm.jam AS INTEGER) >= 18 OR CAST(dm.jam AS INTEGER) <= 5) THEN COALESCE(dm.daya_mampu,0) ELSE 0 END) as max_dm_h1
      FROM data_monitoring dm
      JOIN mesin_cache mc ON dm.mesin_id = mc.id_mesin
      WHERE dm.tanggal = ?
      GROUP BY mc.kode_unit
    `).bind(tanggalH1).all<{ kode_unit: number, dm_pasok_h1: number, max_dm_h1: number }>()
    const h1Map: Record<number, { dm_pasok_h1: number, max_dm_h1: number }> = {}
    for (const r of h1Rows.results) {
      h1Map[r.kode_unit] = {
        dm_pasok_h1: Math.round(r.dm_pasok_h1 || 0),
        max_dm_h1:   Math.round(r.max_dm_h1   || 0)
      }
    }

    const rows = units.results.map(u => {
      const mon = monMap[u.kode_unit]
      const h1  = h1Map[u.kode_unit]

      // DMN & MAKS: gunakan data malam hari ini jika sudah ada, fallback ke H-1 malam
      const hasMalam = mon?.has_malam ?? false
      const dmn  = hasMalam ? (mon?.dm_pasok ?? null) : (h1?.dm_pasok_h1 ?? null)
      const maks = hasMalam ? (mon?.max_dm   ?? null) : (h1?.max_dm_h1   ?? null)

      return {
        kode_unit:      u.kode_unit,
        kode_mesin:     kodeMesinMap[u.kode_unit] ?? null,
        nama_unit:      u.nama_unit,
        dm_terpasang:   terpasangMap[u.kode_unit] ?? null,
        jumlah_operasi:      mon ? mon.jumlah_operasi      : null,
        jumlah_standby:      mon ? mon.jumlah_standby      : null,
        jumlah_pemeliharaan: mon ? mon.jumlah_pemeliharaan : null,
        jumlah_gangguan:     mon ? mon.jumlah_gangguan     : null,
        jumlah_rusak:        mon ? mon.jumlah_rusak        : null,
        jumlah_mesin:        mon ? mon.jumlah_mesin        : null,
        jam_operasi:         mon ? mon.jam_operasi         : null,
        dm_pasok:            dmn,
        beban_puncak:        mon ? mon.beban_puncak        : null,
        max_dm:              maks,
        beban_puncak_siang:  mon ? mon.beban_puncak_siang  : null,
        beban_puncak_malam:  mon ? mon.beban_puncak_malam  : null,
        has_siang:           mon ? mon.has_siang : false,
        has_malam:           mon ? mon.has_malam : false
      }
    })

    return c.json({ success: true, data: rows })
  } catch (e: any) { return c.json({ success: false, error: e.message }, 500) }
})

// ─── NERACA LAST COMPLETE DATE ──────────────────────────────────────────────
// Cari tanggal terbaru yang seluruh 19 ULD sudah punya data lengkap.
// Konsisten dengan isNeracaAllFilled() di frontend:
//   - dm_pasok   != null  (wajib ada, boleh 0)
//   - bp_siang   != null  (boleh 0 — ada unit yang memang tidak ada beban siang)
//   - bp_malam   != null  (wajib ada)
// Artinya: unit harus punya minimal 1 record data_monitoring pada tanggal itu.
app.get('/api/neraca-last-complete-date', async (c) => {
  try {
    const db = c.env.DB
    const REQUIRED_UNITS = [399,390,382,391,376,373,395,375,366,910,911,385,913,915,920,917,918,919,372]
    const REQUIRED_COUNT = REQUIRED_UNITS.length  // 19

    // Cari 30 hari terakhir yang ada datanya, dari paling baru
    const candidates = await db.prepare(`
      SELECT DISTINCT dm.tanggal
      FROM data_monitoring dm
      JOIN mesin_cache mc ON dm.mesin_id = mc.id_mesin
      WHERE mc.kode_unit IN (${REQUIRED_UNITS.join(',')})
      ORDER BY dm.tanggal DESC
      LIMIT 30
    `).all<{ tanggal: string }>()

    for (const row of candidates.results) {
      const tgl = row.tanggal

      // Hitung berapa unit yang punya record MALAM (jam 18-23 atau 00-05)
      const unitCheck = await db.prepare(`
        SELECT COUNT(DISTINCT mc.kode_unit) as cnt
        FROM data_monitoring dm
        JOIN mesin_cache mc ON dm.mesin_id = mc.id_mesin
        WHERE dm.tanggal = ?
          AND mc.kode_unit IN (${REQUIRED_UNITS.join(',')})
          AND (CAST(dm.jam AS INTEGER) >= 18 OR CAST(dm.jam AS INTEGER) <= 5)
      `).bind(tgl).first<{ cnt: number }>()

      if (unitCheck && unitCheck.cnt >= REQUIRED_COUNT) {
        return c.json({ success: true, tanggal: tgl })
      }
    }

    // Tidak ada tanggal lengkap dalam 30 hari terakhir
    return c.json({ success: false, tanggal: null, error: 'Belum ada data malam lengkap 19/19 dalam 30 hari terakhir' })
  } catch (e: any) { return c.json({ success: false, tanggal: null, error: e.message }, 500) }
})

// ─── NERACA DAYA BULANAN ────────────────────────────────────────────────────
app.get('/api/neraca-daya-bulanan', async (c) => {
  try {
    const db    = c.env.DB
    // bulan format YYYY-MM
    const bulan = c.req.query('bulan') || new Date().toISOString().slice(0, 7)
    const [yr, mo] = bulan.split('-').map(Number)
    const daysInMonth = new Date(yr, mo, 0).getDate()

    // Semua unit
    const units = await db.prepare(
      `SELECT DISTINCT kode_unit, nama_unit FROM mesin_cache ORDER BY nama_unit`
    ).all<{ kode_unit: number, nama_unit: string }>()

    // Query status per unit per tanggal dalam bulan
    // dm_pasok = SUM daya_mampu Operasi+Standby, beban_malam = SUM beban Operasi malam, max_dm = MAX daya_mampu
    const rows = await db.prepare(`
      SELECT
        mc.kode_unit,
        dm.tanggal,
        SUM(CASE WHEN dm.status_mesin IN ('Operasi','Standby') AND (CAST(dm.jam AS INTEGER) >= 18 OR CAST(dm.jam AS INTEGER) <= 5) THEN COALESCE(dm.daya_mampu,0) ELSE 0 END) as dm_pasok,
        SUM(CASE WHEN dm.status_mesin = 'Operasi' AND (CAST(dm.jam AS INTEGER) >= 18 OR CAST(dm.jam AS INTEGER) <= 5)
            THEN COALESCE(dm.beban,0) ELSE 0 END) as beban_malam,
        MAX(CASE WHEN dm.status_mesin IN ('Operasi','Standby') AND (CAST(dm.jam AS INTEGER) >= 18 OR CAST(dm.jam AS INTEGER) <= 5) THEN COALESCE(dm.daya_mampu,0) ELSE 0 END) as max_dm
      FROM data_monitoring dm
      JOIN mesin_cache mc ON dm.mesin_id = mc.id_mesin
      WHERE dm.tanggal LIKE ?
      GROUP BY mc.kode_unit, dm.tanggal
    `).bind(`${bulan}-%`).all<{ kode_unit: number, tanggal: string, dm_pasok: number, beban_malam: number, max_dm: number }>()

    // Query event_padam bulan ini
    const padamRows = await db.prepare(
      `SELECT kode_unit, tanggal FROM event_padam WHERE tanggal LIKE ?`
    ).bind(`${bulan}-%`).all<{ kode_unit: number, tanggal: string }>()
    // Build set padam: "kode_unit_tanggal"
    const padamSet = new Set<string>()
    for (const p of padamRows.results) padamSet.add(`${p.kode_unit}_${p.tanggal}`)

    // Build map: kode_unit → { tanggal → status }
    // Hanya isi status jika ada data malam (beban_malam > 0)
    const statusMap: Record<number, Record<string, string>> = {}
    for (const r of rows.results) {
      if (!r.beban_malam || r.beban_malam <= 0) continue  // skip jika tidak ada data malam
      if (!statusMap[r.kode_unit]) statusMap[r.kode_unit] = {}
      const cadangan = (r.dm_pasok || 0) - (r.beban_malam || 0)
      let status: string
      // DEFISIT jika ada event padam untuk unit+tanggal ini
      if (padamSet.has(`${r.kode_unit}_${r.tanggal}`))    status = 'DEFISIT'
      else if (cadangan >= 0 && cadangan < (r.max_dm || 0)) status = 'SIAGA'
      else                                                   status = 'NORMAL'
      statusMap[r.kode_unit][r.tanggal] = status
    }

    // Build result: satu baris per unit, kolom per tanggal
    const result = units.results.map(u => {
      const daily: Record<string, string | null> = {}
      for (let d = 1; d <= daysInMonth; d++) {
        const tgl = `${bulan}-${String(d).padStart(2, '0')}`
        daily[tgl] = statusMap[u.kode_unit]?.[tgl] ?? null
      }
      return { kode_unit: u.kode_unit, nama_unit: u.nama_unit, daily }
    })

    return c.json({ success: true, bulan, days_in_month: daysInMonth, data: result })
  } catch (e: any) { return c.json({ success: false, error: e.message }, 500) }
})

// ─── BEBAN PUNCAK BULANAN PER ULD ──────────────────────────────────────────
// Query: /api/bp-bulanan?bulan=YYYY-MM&kode_unit=NNN&periode=siang|malam
app.get('/api/bp-bulanan', async (c) => {
  try {
    const db       = c.env.DB
    const bulan    = c.req.query('bulan')     || new Date().toISOString().slice(0, 7)
    const kodeUnit = c.req.query('kode_unit') || ''
    const periode  = c.req.query('periode')   || 'malam'   // 'siang' | 'malam'

    const [yr, mo] = bulan.split('-').map(Number)
    const daysInMonth = new Date(yr, mo, 0).getDate()

    // Kondisi jam berdasarkan periode
    const jamCond = periode === 'siang'
      ? `(CAST(dm.jam AS INTEGER) >= 6 AND CAST(dm.jam AS INTEGER) <= 17)`
      : `(CAST(dm.jam AS INTEGER) >= 18 OR CAST(dm.jam AS INTEGER) <= 5)`

    let rows
    if (kodeUnit) {
      rows = await db.prepare(`
        SELECT
          dm.tanggal,
          SUM(CASE WHEN dm.status_mesin = 'Operasi' AND ${jamCond} THEN COALESCE(dm.beban,0) ELSE 0 END) as beban_puncak
        FROM data_monitoring dm
        JOIN mesin_cache mc ON dm.mesin_id = mc.id_mesin
        WHERE dm.tanggal LIKE ? AND mc.kode_unit = ?
        GROUP BY dm.tanggal
        ORDER BY dm.tanggal
      `).bind(`${bulan}-%`, parseInt(kodeUnit)).all<{ tanggal: string, beban_puncak: number }>()
    } else {
      rows = await db.prepare(`
        SELECT
          dm.tanggal,
          SUM(CASE WHEN dm.status_mesin = 'Operasi' AND ${jamCond} THEN COALESCE(dm.beban,0) ELSE 0 END) as beban_puncak
        FROM data_monitoring dm
        WHERE dm.tanggal LIKE ?
        GROUP BY dm.tanggal
        ORDER BY dm.tanggal
      `).bind(`${bulan}-%`).all<{ tanggal: string, beban_puncak: number }>()
    }

    // Build array tanggal lengkap (semua hari dalam bulan)
    const dataMap: Record<string, number> = {}
    for (const r of rows.results) {
      dataMap[r.tanggal] = Math.round(r.beban_puncak || 0)
    }

    const dates: string[] = []
    const values: (number | null)[] = []
    for (let d = 1; d <= daysInMonth; d++) {
      const tgl = `${bulan}-${String(d).padStart(2, '0')}`
      dates.push(tgl)
      values.push(dataMap[tgl] !== undefined ? dataMap[tgl] : null)
    }

    return c.json({ success: true, bulan, kode_unit: kodeUnit, periode, dates, values })
  } catch (e: any) { return c.json({ success: false, error: e.message }, 500) }
})

app.get('/api/data-stok', async (c) => {
  try {
    const tanggal = c.req.query('tanggal') || new Date().toISOString().split('T')[0]

    // Ambil semua unit dari mesin_cache
    const units = await c.env.DB.prepare(
      `SELECT DISTINCT kode_unit, nama_unit FROM mesin_cache ORDER BY nama_unit`
    ).all<{ kode_unit: number, nama_unit: string }>()

    // Ambil data lap_operasional hari ini
    const lapHariIni = await c.env.DB.prepare(
      `SELECT * FROM lap_operasional WHERE tanggal = ? ORDER BY kode_unit`
    ).bind(tanggal).all<any>()
    const lapMap: Record<number, any> = {}
    for (const row of lapHariIni.results) lapMap[row.kode_unit] = row

    // Ambil pemakaian BBM tertinggi 30 hari terakhir per unit
    // pemakaian = saldo_awal - saldo_akhir + penerimaan_bbm
    const avgResult = await c.env.DB.prepare(`
      SELECT kode_unit,
             MAX(CASE WHEN (saldo_awal - saldo_akhir + COALESCE(penerimaan_bbm,0)) > 0
                      THEN (saldo_awal - saldo_akhir + COALESCE(penerimaan_bbm,0))
                      ELSE NULL END) AS avg_pemakaian
      FROM lap_operasional
      WHERE tanggal >= date(?, '-30 days') AND tanggal <= ?
      GROUP BY kode_unit
    `).bind(tanggal, tanggal).all<{ kode_unit: number, avg_pemakaian: number }>()
    const avgMap: Record<number, number> = {}
    for (const row of avgResult.results) avgMap[row.kode_unit] = row.avg_pemakaian

    // Ambil rata-rata pemakaian BBM 30 hari terakhir per unit (AVG)
    const avgRataResult = await c.env.DB.prepare(`
      SELECT kode_unit,
             AVG(CASE WHEN (saldo_awal - saldo_akhir + COALESCE(penerimaan_bbm,0)) > 0
                      THEN (saldo_awal - saldo_akhir + COALESCE(penerimaan_bbm,0))
                      ELSE NULL END) AS rata_pemakaian
      FROM lap_operasional
      WHERE tanggal >= date(?, '-30 days') AND tanggal <= ?
      GROUP BY kode_unit
    `).bind(tanggal, tanggal).all<{ kode_unit: number, rata_pemakaian: number }>()
    const avgRataMap: Record<number, number> = {}
    for (const row of avgRataResult.results) avgRataMap[row.kode_unit] = row.rata_pemakaian

    // Stok awal bulan aktual (April 2026) — data referensi dari dokumen resmi
    const STOK_AWAL_APRIL_2026: Record<number, number> = {
      366: 6141,   // BABAI
      910: 48836,  // MANGKATIP
      385: 37213,  // RANGGA ILUNG
      911: 455,    // TELUK BETUNG
      913: 6030,   // TUMPUNG LAUNG
      372: 28202,  // GUNUNG PUREI
      915: 36359,  // SUNGAI BALI
      918: 26560,  // KERAYAAN
      919: 18231,  // KERUMPUTAN
      917: 25242,  // KERASIAN
      920: 29058,  // MARABATUAN
      399: 17803,  // TUMBANG SENAMANG
      390: 13983,  // TELAGA
      382: 46810,  // PAGATAN
      391: 13117,  // TELAGA PULANG
      376: 67517,  // MENDAWAI
      373: 9229,   // KENAMBUI
      395: 26263,  // TUMBANG MANJUL
      375: 25627,  // KUDANGAN
    }

    const bulanTanggal = tanggal.substring(0, 7) // "YYYY-MM"
    const stokAwalBulanMap: Record<number, number> = {}

    // ── Grup cut-off ────────────────────────────────────────────────────────
    // Grup A (H-1): cut-off = akhir bulan - 1 (selalu, termasuk Februari)
    const GRUP_A = new Set([366, 910, 385, 911, 913, 372, 915, 918, 919, 917, 920])
    // Grup B (H-5): cut-off = akhir bulan - 5
    //               Pengecualian Februari: selalu tanggal 25
    const GRUP_B = new Set([399, 390, 382, 391, 376, 373, 395, 375])

    // Hitung tanggal cut-off untuk sebuah unit berdasarkan tahun+bulan tertentu
    function getCutoffDate(kode: number, yr: number, mo: number): string {
      const lastDay = new Date(yr, mo, 0).getDate() // hari terakhir bulan mo
      let cutDay: number
      if (GRUP_A.has(kode)) {
        cutDay = lastDay - 1
      } else {
        // Grup B — Februari selalu tgl 25, bulan lain akhir bulan - 5
        if (mo === 2) {
          cutDay = 25
        } else {
          cutDay = lastDay - 5
        }
      }
      return `${yr}-${String(mo).padStart(2,'0')}-${String(cutDay).padStart(2,'0')}`
    }

    // Untuk tanggal T, tentukan cut-off mana yang berlaku per unit:
    //   - Hitung cutoff bulan berjalan (mo berjalan)
    //   - Jika T > cutoff bulan berjalan → pakai cutoff bulan berjalan
    //   - Jika T <= cutoff bulan berjalan → pakai cutoff bulan sebelumnya
    const [tYr, tMo, tDy] = tanggal.split('-').map(Number)

    if (bulanTanggal === '2026-04') {
      // Bulan April 2026: pakai data referensi statis untuk semua unit
      for (const [kode, val] of Object.entries(STOK_AWAL_APRIL_2026)) {
        stokAwalBulanMap[Number(kode)] = val
      }
    } else {
      // Kumpulkan set tanggal cut-off yang dibutuhkan (bisa berbeda per unit)
      // key = "YYYY-MM-DD", value = array kode_unit yang butuh tanggal tsb
      const cutoffNeeds: Record<string, number[]> = {}

      for (const kode of [...GRUP_A, ...GRUP_B]) {
        // Cutoff bulan berjalan
        const cutCurr = getCutoffDate(kode, tYr, tMo)
        const cutCurrDay = parseInt(cutCurr.split('-')[2])

        let cutoffTgl: string
        if (tDy > cutCurrDay) {
          // Setelah cut-off bulan ini → pakai saldo akhir cut-off bulan ini
          cutoffTgl = cutCurr
        } else {
          // Sebelum / tepat cut-off bulan ini → pakai saldo akhir cut-off bulan lalu
          const prevMo = tMo === 1 ? 12 : tMo - 1
          const prevYr = tMo === 1 ? tYr - 1 : tYr
          cutoffTgl = getCutoffDate(kode, prevYr, prevMo)
        }

        if (!cutoffNeeds[cutoffTgl]) cutoffNeeds[cutoffTgl] = []
        cutoffNeeds[cutoffTgl].push(kode)
      }

      // Fetch saldo_akhir untuk setiap tanggal cut-off yang dibutuhkan
      for (const [cutTgl, kodeList] of Object.entries(cutoffNeeds)) {
        // Coba ambil data tepat di tanggal cut-off
        const rows = await c.env.DB.prepare(
          `SELECT kode_unit, saldo_akhir FROM lap_operasional WHERE tanggal = ? ORDER BY kode_unit`
        ).bind(cutTgl).all<{ kode_unit: number, saldo_akhir: number }>()

        const foundMap: Record<number, number> = {}
        for (const row of rows.results) foundMap[row.kode_unit] = row.saldo_akhir

        for (const kode of kodeList) {
          if (foundMap[kode] !== undefined) {
            // Data cut-off tersedia
            stokAwalBulanMap[kode] = Math.max(0, foundMap[kode] - (UNIT_META[kode]?.stock_mati ?? 0))
          } else {
            // Fallback: cari tanggal terdekat sebelum cut-off yang ada datanya untuk unit ini
            const fb = await c.env.DB.prepare(`
              SELECT saldo_akhir FROM lap_operasional
              WHERE kode_unit = ? AND tanggal <= ?
              ORDER BY tanggal DESC LIMIT 1
            `).bind(kode, cutTgl).first<{ saldo_akhir: number }>()
            if (fb) {
              stokAwalBulanMap[kode] = Math.max(0, fb.saldo_akhir - (UNIT_META[kode]?.stock_mati ?? 0))
            }
          }
        }
      }
    }

    const SAFETY_STOCK_HARI = 3  // hari safety stock

    // ── Total Penerimaan & Total Pemakaian per unit (per periode cut-off) ──
    // Periode = (cutoff berlaku + 1 hari) s.d. tanggal T
    // cutoff berlaku = sama dengan yang dipakai untuk stok awal bulan
    const totalPenerimaanMap: Record<number, number> = {}
    const totalPemakaianMap:  Record<number, number> = {}

    // Bangun map kode_unit → periodeAwal (cutoff + 1 hari)
    const periodeAwalMap: Record<number, string> = {}
    for (const kode of [...GRUP_A, ...GRUP_B]) {
      const cutCurr    = getCutoffDate(kode, tYr, tMo)
      const cutCurrDay = parseInt(cutCurr.split('-')[2])
      let cutoffBerlaku: string
      if (tDy > cutCurrDay) {
        cutoffBerlaku = cutCurr
      } else {
        const prevMo = tMo === 1 ? 12 : tMo - 1
        const prevYr = tMo === 1 ? tYr - 1 : tYr
        cutoffBerlaku = getCutoffDate(kode, prevYr, prevMo)
      }
      // periodeAwal = cutoff + 1 hari
      const cutDate = new Date(cutoffBerlaku)
      cutDate.setDate(cutDate.getDate() + 1)
      periodeAwalMap[kode] = cutDate.toISOString().split('T')[0]
    }

    // Kelompokkan unit berdasarkan periodeAwal yang sama → minimasi jumlah query
    const periodeGroups: Record<string, number[]> = {}
    for (const [kodeStr, awal] of Object.entries(periodeAwalMap)) {
      if (!periodeGroups[awal]) periodeGroups[awal] = []
      periodeGroups[awal].push(Number(kodeStr))
    }

    // Fetch per kelompok periodeAwal
    for (const [periodeAwal, kodeList] of Object.entries(periodeGroups)) {
      const placeholders = kodeList.map(() => '?').join(',')
      const penRes = await c.env.DB.prepare(`
        SELECT kode_unit,
               SUM(COALESCE(penerimaan_bbm, 0)) AS total_penerimaan
        FROM lap_operasional
        WHERE tanggal >= ? AND tanggal <= ?
          AND kode_unit IN (${placeholders})
        GROUP BY kode_unit
      `).bind(periodeAwal, tanggal, ...kodeList)
        .all<{ kode_unit: number, total_penerimaan: number }>()
      for (const row of penRes.results) totalPenerimaanMap[row.kode_unit] = row.total_penerimaan

      const pakRes = await c.env.DB.prepare(`
        SELECT kode_unit,
               SUM(CASE WHEN (saldo_awal + COALESCE(penerimaan_bbm,0) - saldo_akhir) > 0
                        THEN (saldo_awal + COALESCE(penerimaan_bbm,0) - saldo_akhir)
                        ELSE 0 END) AS total_pemakaian
        FROM lap_operasional
        WHERE tanggal >= ? AND tanggal <= ?
          AND kode_unit IN (${placeholders})
        GROUP BY kode_unit
      `).bind(periodeAwal, tanggal, ...kodeList)
        .all<{ kode_unit: number, total_pemakaian: number }>()
      for (const row of pakRes.results) totalPemakaianMap[row.kode_unit] = row.total_pemakaian
    }
    // ── End total penerimaan/pemakaian ──────────────────────────────────────

    // Urutkan unit sesuai nomor di UNIT_META, sisanya di akhir
    const sortedUnits = [...units.results].sort((a, b) => {
      const na = UNIT_META[a.kode_unit]?.no ?? 999
      const nb = UNIT_META[b.kode_unit]?.no ?? 999
      return na - nb
    })

    const rows = sortedUnits.map((u) => {
      const meta         = UNIT_META[u.kode_unit]
      const lap          = lapMap[u.kode_unit]
      const avgPakai     = avgMap[u.kode_unit] || null
      const rataaPakai   = avgRataMap[u.kode_unit] || null

      const stokAwalBln  = stokAwalBulanMap[u.kode_unit] ?? null
      const stokAwal     = lap?.saldo_akhir ?? null   // STOCK AWAL = Saldo Akhir dari lap. operasional
      const stokAkhir    = lap?.saldo_akhir ?? null
      const penerimaanBbm = lap?.penerimaan_bbm ?? null
      const lapSaldoAwal  = lap?.saldo_awal ?? null
      const lapSaldoAkhir = lap?.saldo_akhir ?? null
      const lapKwhProd    = lap?.kwh_produksi ?? null
      // PEMAKAIAN BBM = Saldo Awal + Penerimaan - Saldo Akhir
      const penerimaan   = penerimaanBbm ?? 0
      const pemakaianBbm = (lapSaldoAwal !== null && lapSaldoAkhir !== null)
                           ? lapSaldoAwal + penerimaan - lapSaldoAkhir
                           : null
      // SFC = (Saldo Awal + Penerimaan - Saldo Akhir) / kWh Produksi
      const sfc = (lapSaldoAwal !== null && lapSaldoAkhir !== null && lapKwhProd !== null && lapKwhProd > 0)
                  ? Math.round((lapSaldoAwal + penerimaan - lapSaldoAkhir) / lapKwhProd * 1000) / 1000
                  : null

      const jalur        = meta?.jalur ?? '-'
      const kapasitasTangki = meta?.kapasitas_tangki ?? null
      const stockMati    = meta?.stock_mati ?? 0
      const noUrut       = meta?.no ?? '-'

      const stockBersih  = stokAkhir !== null ? Math.max(0, stokAkhir - stockMati) : null
      // SAFETY STOCK = STOCK BERSIH / PEMAKAIAN RATA-RATA
      const safetyStock  = (stockBersih !== null && rataaPakai !== null && rataaPakai > 0)
                           ? Math.round(stockBersih / rataaPakai)
                           : null
      // DAYA TAMPUNG = (KAPASITAS - STOCK AWAL) / KAPASITAS
      const dayaTampung  = (kapasitasTangki !== null && stokAwal !== null && kapasitasTangki > 0)
                           ? Math.round(((kapasitasTangki - stokAwal) / kapasitasTangki) * 100) / 100
                           : null
      // BBM SIAP KIRIM = KAPASITAS * DAYA TAMPUNG
      const bbmSiapKirim = (kapasitasTangki !== null && dayaTampung !== null)
                           ? Math.round(kapasitasTangki * dayaTampung)
                           : null

      // Estimasi BBM habis: stockBersih / avgPakai
      let estimasiBbmHabis: string | null = null
      if (stockBersih !== null && avgPakai !== null && avgPakai > 0) {
        const hariLagi = Math.floor(stockBersih / avgPakai)
        const tglHabis = new Date(tanggal)
        tglHabis.setDate(tglHabis.getDate() + hariLagi)
        estimasiBbmHabis = tglHabis.toISOString().split('T')[0]
      }

      // Kondisi stok berdasarkan nilai SAFETY STOCK (hari)
      let kondisi = '-'
      if (safetyStock !== null) {
        if (safetyStock < 5)                             kondisi = 'KRITIS'
        else if (safetyStock >= 5 && safetyStock <= 7)   kondisi = 'SIAGA'
        else                                             kondisi = 'AMAN'
      }

      return {
        no: noUrut,
        kode_unit: u.kode_unit,
        nama_unit: u.nama_unit,
        jalur,
        kapasitas_tangki: kapasitasTangki,
        stok_awal_bulan: stokAwalBln,
        stok_awal: stokAwal,
        stock_mati: stockMati,
        stock_bersih: stockBersih,
        pemakaian_rata_rata: rataaPakai !== null ? Math.round(rataaPakai) : null,
        rata_rata_harian: avgPakai !== null ? Math.round(avgPakai) : null,
        daya_tampung_storage: dayaTampung,
        bbm_siap_kirim: bbmSiapKirim,
        safety_stock: safetyStock,
        estimasi_bbm_habis: estimasiBbmHabis,
        kondisi_stock: kondisi,
        pemakaian_bbm: pemakaianBbm,
        saldo_awal: lapSaldoAwal !== null ? Math.round(lapSaldoAwal) : null,
        saldo_akhir: lapSaldoAkhir !== null ? Math.round(lapSaldoAkhir) : null,
        penerimaan_bbm: penerimaanBbm !== null ? Math.round(penerimaanBbm) : null,
        kwh_produksi: lapKwhProd !== null ? Math.round(lapKwhProd) : null,
        sfc,
        total_penerimaan: totalPenerimaanMap[u.kode_unit] != null ? Math.round(totalPenerimaanMap[u.kode_unit]) : null,
        total_pemakaian:  totalPemakaianMap[u.kode_unit]  != null ? Math.round(totalPemakaianMap[u.kode_unit])  : null
      }
    })

    return c.json({ success: true, data: rows })
  } catch (e: any) { return c.json({ success: false, error: e.message }, 500) }
})

// ===========================================================
// API: HOP BBM INFO — posisi terakhir armada & estimasi tiba
// ===========================================================
app.get('/api/hop-info', async (c) => {
  try {
    const rows = await c.env.DB.prepare(
      `SELECT kode_unit, posisi_terakhir, estimasi_tiba, updated_at FROM hop_bbm_info ORDER BY kode_unit`
    ).all<{ kode_unit: number, posisi_terakhir: string | null, estimasi_tiba: string | null, updated_at: string }>()
    const map: Record<number, { posisi_terakhir: string | null, estimasi_tiba: string | null }> = {}
    for (const r of rows.results) map[r.kode_unit] = { posisi_terakhir: r.posisi_terakhir, estimasi_tiba: r.estimasi_tiba }
    return c.json({ success: true, data: map })
  } catch (e: any) { return c.json({ success: false, error: e.message }, 500) }
})

app.post('/api/hop-info', async (c) => {
  try {
    const { kode_unit, posisi_terakhir, estimasi_tiba } = await c.req.json<{
      kode_unit: number, posisi_terakhir?: string, estimasi_tiba?: string
    }>()
    if (!kode_unit) return c.json({ success: false, error: 'kode_unit wajib' }, 400)
    await c.env.DB.prepare(`
      INSERT INTO hop_bbm_info (kode_unit, posisi_terakhir, estimasi_tiba, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(kode_unit) DO UPDATE SET
        posisi_terakhir = excluded.posisi_terakhir,
        estimasi_tiba   = excluded.estimasi_tiba,
        updated_at      = excluded.updated_at
    `).bind(kode_unit, posisi_terakhir ?? null, estimasi_tiba ?? null).run()
    return c.json({ success: true })
  } catch (e: any) { return c.json({ success: false, error: e.message }, 500) }
})

// ===========================================================
// API: TAD (Tenaga Administrasi)
// ===========================================================
app.get('/api/tad', async (c) => {
  try {
    const penempatan = c.req.query('penempatan') || ''
    let rows
    if (penempatan) {
      rows = await c.env.DB.prepare(
        `SELECT id, nama, jabatan, penempatan, created_at, updated_at FROM tad WHERE penempatan = ? ORDER BY nama ASC`
      ).bind(penempatan).all<{ id: number, nama: string, jabatan: string, penempatan: string, created_at: string, updated_at: string }>()
    } else {
      rows = await c.env.DB.prepare(
        `SELECT id, nama, jabatan, penempatan, created_at, updated_at FROM tad ORDER BY penempatan ASC, nama ASC`
      ).all<{ id: number, nama: string, jabatan: string, penempatan: string, created_at: string, updated_at: string }>()
    }
    return c.json({ success: true, data: rows.results })
  } catch (e: any) { return c.json({ success: false, error: e.message }, 500) }
})

app.post('/api/tad', async (c) => {
  try {
    const { nama, jabatan, penempatan } = await c.req.json<{ nama: string, jabatan: string, penempatan: string }>()
    if (!nama || !jabatan || !penempatan) return c.json({ success: false, error: 'nama, jabatan, penempatan wajib diisi' }, 400)
    const result = await c.env.DB.prepare(
      `INSERT INTO tad (nama, jabatan, penempatan) VALUES (?, ?, ?)`
    ).bind(nama.trim(), jabatan.trim(), penempatan.trim()).run()
    return c.json({ success: true, id: result.meta.last_row_id })
  } catch (e: any) { return c.json({ success: false, error: e.message }, 500) }
})

app.put('/api/tad/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    const { nama, jabatan, penempatan } = await c.req.json<{ nama: string, jabatan: string, penempatan: string }>()
    if (!nama || !jabatan || !penempatan) return c.json({ success: false, error: 'nama, jabatan, penempatan wajib diisi' }, 400)
    await c.env.DB.prepare(
      `UPDATE tad SET nama = ?, jabatan = ?, penempatan = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).bind(nama.trim(), jabatan.trim(), penempatan.trim(), id).run()
    return c.json({ success: true })
  } catch (e: any) { return c.json({ success: false, error: e.message }, 500) }
})

app.delete('/api/tad/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    await c.env.DB.prepare(`DELETE FROM tad WHERE id = ?`).bind(id).run()
    return c.json({ success: true })
  } catch (e: any) { return c.json({ success: false, error: e.message }, 500) }
})

// ===========================================================
// API: DOWNLOAD NERACA EXCEL (server-side generate, no browser cache issue)
// GET /api/download-neraca-excel?tanggal=YYYY-MM-DD
// ===========================================================

// ── XLSX builder berbasis template (template di-embed sebagai base64) ──────────
// Strategi: load template ZIP → ambil sheet1.xml + sheet2.xml verbatim dari template →
// inject hanya nilai numerik ke sel data tertentu → repack ZIP
// SEMUA komponen lain (style, theme, mergeCells, sharedStrings, cols, pageSetup, dll)
// DIPERTAHANKAN 100% dari template — tidak ada XML yang dibuat ulang

// ── ZIP helper (store-only, template pre-expanded) ───────────────────────────────
// Template sudah di-pre-process menjadi STORE ZIP (method=0) sehingga tidak
// perlu DecompressionStream di runtime — hindari masalah inflate di Cloudflare Workers
function b64ToU8(s: string): Uint8Array {
  const bin = atob(s); const out = new Uint8Array(bin.length)
  for (let i=0;i<bin.length;i++) out[i]=bin.charCodeAt(i); return out
}
function _le2(n:number):Uint8Array{return new Uint8Array([n&0xff,(n>>8)&0xff])}
function _le4(n:number):Uint8Array{return new Uint8Array([n&0xff,(n>>8)&0xff,(n>>16)&0xff,(n>>24)&0xff])}
function _cat(...a:Uint8Array[]):Uint8Array{
  const t=a.reduce((s,x)=>s+x.length,0),o=new Uint8Array(t);let p=0
  for(const x of a){o.set(x,p);p+=x.length};return o
}
function _crc32(d:Uint8Array):number{
  const t=new Int32Array(256)
  for(let i=0;i<256;i++){let c=i;for(let j=0;j<8;j++)c=c&1?(0xEDB88320^(c>>>1)):(c>>>1);t[i]=c}
  let c=-1;for(let i=0;i<d.length;i++)c=(c>>>8)^t[(c^d[i])&0xff];return(c^-1)>>>0
}
// Parse STORE ZIP (method=0) → Map<filename, rawBytes>
// Template sudah dalam format STORE sehingga tidak perlu decompress
function _zipParse(buf:Uint8Array):Map<string,Uint8Array>{
  const v=new DataView(buf.buffer,buf.byteOffset,buf.byteLength),m=new Map<string,Uint8Array>()
  let i=0
  while(i<buf.length-4){
    if(v.getUint32(i,true)!==0x04034B50){i++;continue}
    const cl=v.getUint32(i+18,true)
    const fl=v.getUint16(i+26,true),el=v.getUint16(i+28,true)
    const fn=new TextDecoder().decode(buf.slice(i+30,i+30+fl))
    const off=i+30+fl+el; m.set(fn,buf.slice(off,off+cl)); i=off+cl
  }
  return m
}
// Repack STORE ZIP: Map<filename, rawBytes> → ZIP bytes
function _zipPack(entries:Map<string,Uint8Array>):Uint8Array{
  const ls:Uint8Array[]=[],cs:Uint8Array[]=[]; let off=0
  const dt=0x4A21,dd=0x5565
  for(const[n,d] of entries){
    const nb=new TextEncoder().encode(n),cr=_crc32(d)
    const l=_cat(new Uint8Array([0x50,0x4B,0x03,0x04]),_le2(20),_le2(0),_le2(0),_le2(dt),_le2(dd),_le4(cr),_le4(d.length),_le4(d.length),_le2(nb.length),_le2(0),nb,d)
    const c=_cat(new Uint8Array([0x50,0x4B,0x01,0x02]),_le2(20),_le2(20),_le2(0),_le2(0),_le2(dt),_le2(dd),_le4(cr),_le4(d.length),_le4(d.length),_le2(nb.length),_le2(0),_le2(0),_le2(0),_le2(0),_le4(0),_le4(off),nb)
    ls.push(l);cs.push(c);off+=l.length
  }
  const cd=_cat(...cs)
  return _cat(...ls,cd,_cat(new Uint8Array([0x50,0x4B,0x05,0x06]),_le2(0),_le2(0),_le2(entries.size),_le2(entries.size),_le4(cd.length),_le4(off),_le2(0)))
}
// Repack: ambil semua entry dari template STORE ZIP, override yg ada di patches
function zipRepack(tplBytes:Uint8Array, patches:Map<string,Uint8Array>):Uint8Array{
  const m=_zipParse(tplBytes)
  for(const[k,v] of patches) m.set(k,v)
  return _zipPack(m)
}

// Template pre-expanded sebagai STORE ZIP (method=0, tidak perlu inflate di runtime)
// Di-generate dari template_harian_uid_kalimantan_selatan_dan_kalimantan_tengah.xlsx
// dengan python: zipfile semua entry di-decompress → repack store ZIP → base64
const NERACA_TEMPLATE_B64 = `UEsDBBQAAAAAACFKZVVq0gxjeAUAAHgFAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbDw/eG1sIHZlcnNpb249IjEuMCIgZW5jb2Rpbmc9IlVURi04IiBzdGFuZGFsb25lPSJ5ZXMiPz4KPFR5cGVzIHhtbG5zPSJodHRwOi8vc2NoZW1hcy5vcGVueG1sZm9ybWF0cy5vcmcvcGFja2FnZS8yMDA2L2NvbnRlbnQtdHlwZXMiPjxPdmVycmlkZSBQYXJ0TmFtZT0iL3hsL3RoZW1lL3RoZW1lMS54bWwiIENvbnRlbnRUeXBlPSJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQudGhlbWUreG1sIi8+PE92ZXJyaWRlIFBhcnROYW1lPSIveGwvc3R5bGVzLnhtbCIgQ29udGVudFR5cGU9ImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC5zcHJlYWRzaGVldG1sLnN0eWxlcyt4bWwiLz48RGVmYXVsdCBFeHRlbnNpb249InJlbHMiIENvbnRlbnRUeXBlPSJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtcGFja2FnZS5yZWxhdGlvbnNoaXBzK3htbCIvPjxEZWZhdWx0IEV4dGVuc2lvbj0ieG1sIiBDb250ZW50VHlwZT0iYXBwbGljYXRpb24veG1sIi8+PERlZmF1bHQgRXh0ZW5zaW9uPSJ2bWwiIENvbnRlbnRUeXBlPSJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQudm1sRHJhd2luZyIvPjxPdmVycmlkZSBQYXJ0TmFtZT0iL3hsL3dvcmtib29rLnhtbCIgQ29udGVudFR5cGU9ImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC5zcHJlYWRzaGVldG1sLnNoZWV0Lm1haW4reG1sIi8+PE92ZXJyaWRlIFBhcnROYW1lPSIvZG9jUHJvcHMvYXBwLnhtbCIgQ29udGVudFR5cGU9ImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC5leHRlbmRlZC1wcm9wZXJ0aWVzK3htbCIvPjxPdmVycmlkZSBQYXJ0TmFtZT0iL2RvY1Byb3BzL2NvcmUueG1sIiBDb250ZW50VHlwZT0iYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLXBhY2thZ2UuY29yZS1wcm9wZXJ0aWVzK3htbCIvPjxPdmVycmlkZSBQYXJ0TmFtZT0iL3hsL3dvcmtzaGVldHMvc2hlZXQxLnhtbCIgQ29udGVudFR5cGU9ImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC5zcHJlYWRzaGVldG1sLndvcmtzaGVldCt4bWwiLz48T3ZlcnJpZGUgUGFydE5hbWU9Ii94bC93b3Jrc2hlZXRzL3NoZWV0Mi54bWwiIENvbnRlbnRUeXBlPSJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQuc3ByZWFkc2hlZXRtbC53b3Jrc2hlZXQreG1sIi8+PE92ZXJyaWRlIFBhcnROYW1lPSIveGwvc2hhcmVkU3RyaW5ncy54bWwiIENvbnRlbnRUeXBlPSJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQuc3ByZWFkc2hlZXRtbC5zaGFyZWRTdHJpbmdzK3htbCIvPjwvVHlwZXM+UEsDBBQAAAAAACFKZVUXtjc4SwIAAEsCAAALAAAAX3JlbHMvLnJlbHM8P3htbCB2ZXJzaW9uPSIxLjAiIGVuY29kaW5nPSJVVEYtOCIgc3RhbmRhbG9uZT0ieWVzIj8+CjxSZWxhdGlvbnNoaXBzIHhtbG5zPSJodHRwOi8vc2NoZW1hcy5vcGVueG1sZm9ybWF0cy5vcmcvcGFja2FnZS8yMDA2L3JlbGF0aW9uc2hpcHMiPjxSZWxhdGlvbnNoaXAgSWQ9InJJZDMiIFR5cGU9Imh0dHA6Ly9zY2hlbWFzLm9wZW54bWxmb3JtYXRzLm9yZy9vZmZpY2VEb2N1bWVudC8yMDA2L3JlbGF0aW9uc2hpcHMvZXh0ZW5kZWQtcHJvcGVydGllcyIgVGFyZ2V0PSJkb2NQcm9wcy9hcHAueG1sIi8+PFJlbGF0aW9uc2hpcCBJZD0icklkMiIgVHlwZT0iaHR0cDovL3NjaGVtYXMub3BlbnhtbGZvcm1hdHMub3JnL3BhY2thZ2UvMjAwNi9yZWxhdGlvbnNoaXBzL21ldGFkYXRhL2NvcmUtcHJvcGVydGllcyIgVGFyZ2V0PSJkb2NQcm9wcy9jb3JlLnhtbCIvPjxSZWxhdGlvbnNoaXAgSWQ9InJJZDEiIFR5cGU9Imh0dHA6Ly9zY2hlbWFzLm9wZW54bWxmb3JtYXRzLm9yZy9vZmZpY2VEb2N1bWVudC8yMDA2L3JlbGF0aW9uc2hpcHMvb2ZmaWNlRG9jdW1lbnQiIFRhcmdldD0ieGwvd29ya2Jvb2sueG1sIi8+PC9SZWxhdGlvbnNoaXBzPlBLAwQUAAAAAAAhSmVV/r6RkkYDAABGAwAAGgAAAHhsL19yZWxzL3dvcmtib29rLnhtbC5yZWxzPD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9InllcyI/Pgo8UmVsYXRpb25zaGlwcyB4bWxucz0iaHR0cDovL3NjaGVtYXMub3BlbnhtbGZvcm1hdHMub3JnL3BhY2thZ2UvMjAwNi9yZWxhdGlvbnNoaXBzIj48UmVsYXRpb25zaGlwIElkPSJySWQxIiBUeXBlPSJodHRwOi8vc2NoZW1hcy5vcGVueG1sZm9ybWF0cy5vcmcvb2ZmaWNlRG9jdW1lbnQvMjAwNi9yZWxhdGlvbnNoaXBzL3N0eWxlcyIgVGFyZ2V0PSJzdHlsZXMueG1sIi8+PFJlbGF0aW9uc2hpcCBJZD0icklkMiIgVHlwZT0iaHR0cDovL3NjaGVtYXMub3BlbnhtbGZvcm1hdHMub3JnL29mZmljZURvY3VtZW50LzIwMDYvcmVsYXRpb25zaGlwcy90aGVtZSIgVGFyZ2V0PSJ0aGVtZS90aGVtZTEueG1sIi8+PFJlbGF0aW9uc2hpcCBJZD0icklkMyIgVHlwZT0iaHR0cDovL3NjaGVtYXMub3BlbnhtbGZvcm1hdHMub3JnL29mZmljZURvY3VtZW50LzIwMDYvcmVsYXRpb25zaGlwcy9zaGFyZWRTdHJpbmdzIiBUYXJnZXQ9InNoYXJlZFN0cmluZ3MueG1sIi8+PFJlbGF0aW9uc2hpcCBJZD0icklkNCIgVHlwZT0iaHR0cDovL3NjaGVtYXMub3BlbnhtbGZvcm1hdHMub3JnL29mZmljZURvY3VtZW50LzIwMDYvcmVsYXRpb25zaGlwcy93b3Jrc2hlZXQiIFRhcmdldD0id29ya3NoZWV0cy9zaGVldDEueG1sIi8+PFJlbGF0aW9uc2hpcCBJZD0icklkNSIgVHlwZT0iaHR0cDovL3NjaGVtYXMub3BlbnhtbGZvcm1hdHMub3JnL29mZmljZURvY3VtZW50LzIwMDYvcmVsYXRpb25zaGlwcy93b3Jrc2hlZXQiIFRhcmdldD0id29ya3NoZWV0cy9zaGVldDIueG1sIi8+PC9SZWxhdGlvbnNoaXBzPlBLAwQUAAAAAAAhSmVVwJZeI2YDAABmAwAAEAAAAGRvY1Byb3BzL2FwcC54bWw8P3htbCB2ZXJzaW9uPSIxLjAiIGVuY29kaW5nPSJVVEYtOCIgc3RhbmRhbG9uZT0ieWVzIj8+CjxQcm9wZXJ0aWVzIHhtbG5zPSJodHRwOi8vc2NoZW1hcy5vcGVueG1sZm9ybWF0cy5vcmcvb2ZmaWNlRG9jdW1lbnQvMjAwNi9leHRlbmRlZC1wcm9wZXJ0aWVzIiB4bWxuczp2dD0iaHR0cDovL3NjaGVtYXMub3BlbnhtbGZvcm1hdHMub3JnL29mZmljZURvY3VtZW50LzIwMDYvZG9jUHJvcHNWVHlwZXMiPjxBcHBsaWNhdGlvbj5NaWNyb3NvZnQgRXhjZWw8L0FwcGxpY2F0aW9uPjxEb2NTZWN1cml0eT4wPC9Eb2NTZWN1cml0eT48U2NhbGVDcm9wPmZhbHNlPC9TY2FsZUNyb3A+PEhlYWRpbmdQYWlycz48dnQ6dmVjdG9yIHNpemU9IjIiIGJhc2VUeXBlPSJ2YXJpYW50Ij48dnQ6dmFyaWFudD48dnQ6bHBzdHI+V29ya3NoZWV0czwvdnQ6bHBzdHI+PC92dDp2YXJpYW50Pjx2dDp2YXJpYW50Pjx2dDppND4yPC92dDppND48L3Z0OnZhcmlhbnQ+PC92dDp2ZWN0b3I+PC9IZWFkaW5nUGFpcnM+PFRpdGxlc09mUGFydHM+PHZ0OnZlY3RvciBzaXplPSIyIiBiYXNlVHlwZT0ibHBzdHIiPjx2dDpscHN0cj5OZXJhY2EgRGF5YTwvdnQ6bHBzdHI+PHZ0Omxwc3RyPktlc2lhcGFuIFBlbWJhbmdraXQ8L3Z0Omxwc3RyPjwvdnQ6dmVjdG9yPjwvVGl0bGVzT2ZQYXJ0cz48Q29tcGFueT5NYWF0d2Vic2l0ZTwvQ29tcGFueT48TWFuYWdlcj5NYWF0d2Vic2l0ZTwvTWFuYWdlcj48TGlua3NVcFRvRGF0ZT5mYWxzZTwvTGlua3NVcFRvRGF0ZT48U2hhcmVkRG9jPmZhbHNlPC9TaGFyZWREb2M+PEh5cGVybGlua3NDaGFuZ2VkPmZhbHNlPC9IeXBlcmxpbmtzQ2hhbmdlZD48QXBwVmVyc2lvbj4xMi4wMDAwPC9BcHBWZXJzaW9uPjwvUHJvcGVydGllcz5QSwMEFAAAAAAAIUplVZ2Db818AwAAfAMAABEAAABkb2NQcm9wcy9jb3JlLnhtbDw/eG1sIHZlcnNpb249IjEuMCIgZW5jb2Rpbmc9IlVURi04IiBzdGFuZGFsb25lPSJ5ZXMiPz4KPGNwOmNvcmVQcm9wZXJ0aWVzIHhtbG5zOmNwPSJodHRwOi8vc2NoZW1hcy5vcGVueG1sZm9ybWF0cy5vcmcvcGFja2FnZS8yMDA2L21ldGFkYXRhL2NvcmUtcHJvcGVydGllcyIgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIiB4bWxuczpkY3Rlcm1zPSJodHRwOi8vcHVybC5vcmcvZGMvdGVybXMvIiB4bWxuczpkY21pdHlwZT0iaHR0cDovL3B1cmwub3JnL2RjL2RjbWl0eXBlLyIgeG1sbnM6eHNpPSJodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYS1pbnN0YW5jZSI+PGRjOmNyZWF0b3I+TWFhdHdlYnNpdGU8L2RjOmNyZWF0b3I+PGNwOmxhc3RNb2RpZmllZEJ5Pk1hYXR3ZWJzaXRlPC9jcDpsYXN0TW9kaWZpZWRCeT48ZGN0ZXJtczpjcmVhdGVkIHhzaTp0eXBlPSJkY3Rlcm1zOlczQ0RURiI+MjAyNi0wNi0wNVQxODoyNzowMCswNzowMDwvZGN0ZXJtczpjcmVhdGVkPjxkY3Rlcm1zOm1vZGlmaWVkIHhzaTp0eXBlPSJkY3Rlcm1zOlczQ0RURiI+MjAyNi0wNi0wNVQxODoyNzowMCswNzowMDwvZGN0ZXJtczptb2RpZmllZD48ZGM6dGl0bGU+dGVtcGxhdGVfaGFyaWFuX3VpZF9rYWxpbWFudGFuX3NlbGF0YW5fZGFuX2thbGltYW50YW5fdGVuZ2FoPC9kYzp0aXRsZT48ZGM6ZGVzY3JpcHRpb24+RGVmYXVsdCBzcHJlYWRzaGVldCBleHBvcnQ8L2RjOmRlc2NyaXB0aW9uPjxkYzpzdWJqZWN0PlNwcmVhZHNoZWV0IGV4cG9ydDwvZGM6c3ViamVjdD48Y3A6a2V5d29yZHM+bWFhdHdlYnNpdGUsIGV4Y2VsLCBleHBvcnQ8L2NwOmtleXdvcmRzPjxjcDpjYXRlZ29yeT5FeGNlbDwvY3A6Y2F0ZWdvcnk+PC9jcDpjb3JlUHJvcGVydGllcz5QSwMEFAAAAAAAIUplVXORe1mmGwAAphsAABMAAAB4bC90aGVtZS90aGVtZTEueG1sPD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9InllcyI/Pgo8YTp0aGVtZSB4bWxuczphPSJodHRwOi8vc2NoZW1hcy5vcGVueG1sZm9ybWF0cy5vcmcvZHJhd2luZ21sLzIwMDYvbWFpbiIgbmFtZT0iT2ZmaWNlIFRoZW1lIj48YTp0aGVtZUVsZW1lbnRzPjxhOmNsclNjaGVtZSBuYW1lPSJPZmZpY2UiPjxhOmRrMT48YTpzeXNDbHIgdmFsPSJ3aW5kb3dUZXh0IiBsYXN0Q2xyPSIwMDAwMDAiLz48L2E6ZGsxPjxhOmx0MT48YTpzeXNDbHIgdmFsPSJ3aW5kb3ciIGxhc3RDbHI9IkZGRkZGRiIvPjwvYTpsdDE+PGE6ZGsyPjxhOnNyZ2JDbHIgdmFsPSIxRjQ5N0QiLz48L2E6ZGsyPjxhOmx0Mj48YTpzcmdiQ2xyIHZhbD0iRUVFQ0UxIi8+PC9hOmx0Mj48YTphY2NlbnQxPjxhOnNyZ2JDbHIgdmFsPSI0RjgxQkQiLz48L2E6YWNjZW50MT48YTphY2NlbnQyPjxhOnNyZ2JDbHIgdmFsPSJDMDUwNEQiLz48L2E6YWNjZW50Mj48YTphY2NlbnQzPjxhOnNyZ2JDbHIgdmFsPSI5QkJCNTkiLz48L2E6YWNjZW50Mz48YTphY2NlbnQ0PjxhOnNyZ2JDbHIgdmFsPSI4MDY0QTIiLz48L2E6YWNjZW50ND48YTphY2NlbnQ1PjxhOnNyZ2JDbHIgdmFsPSI0QkFDQzYiLz48L2E6YWNjZW50NT48YTphY2NlbnQ2PjxhOnNyZ2JDbHIgdmFsPSJGNzk2NDYiLz48L2E6YWNjZW50Nj48YTpobGluaz48YTpzcmdiQ2xyIHZhbD0iMDAwMEZGIi8+PC9hOmhsaW5rPjxhOmZvbEhsaW5rPjxhOnNyZ2JDbHIgdmFsPSI4MDAwODAiLz48L2E6Zm9sSGxpbms+PC9hOmNsclNjaGVtZT48YTpmb250U2NoZW1lIG5hbWU9Ik9mZmljZSI+PGE6bWFqb3JGb250PjxhOmxhdGluIHR5cGVmYWNlPSJDYW1icmlhIi8+PGE6ZWEgdHlwZWZhY2U9IiIvPjxhOmNzIHR5cGVmYWNlPSIiLz48YTpmb250IHNjcmlwdD0iSnBhbiIgdHlwZWZhY2U9Iu+8re+8syDvvLDjgrTjgrfjg4Pjgq8iLz48YTpmb250IHNjcmlwdD0iSGFuZyIgdHlwZWZhY2U9IuunkeydgCDqs6DrlJUiLz48YTpmb250IHNjcmlwdD0iSGFucyIgdHlwZWZhY2U9IuWui+S9kyIvPjxhOmZvbnQgc2NyaXB0PSJIYW50IiB0eXBlZmFjZT0i5paw57Sw5piO6auUIi8+PGE6Zm9udCBzY3JpcHQ9IkFyYWIiIHR5cGVmYWNlPSJUaW1lcyBOZXcgUm9tYW4iLz48YTpmb250IHNjcmlwdD0iSGViciIgdHlwZWZhY2U9IlRpbWVzIE5ldyBSb21hbiIvPjxhOmZvbnQgc2NyaXB0PSJUaGFpIiB0eXBlZmFjZT0iVGFob21hIi8+PGE6Zm9udCBzY3JpcHQ9IkV0aGkiIHR5cGVmYWNlPSJOeWFsYSIvPjxhOmZvbnQgc2NyaXB0PSJCZW5nIiB0eXBlZmFjZT0iVnJpbmRhIi8+PGE6Zm9udCBzY3JpcHQ9Ikd1anIiIHR5cGVmYWNlPSJTaHJ1dGkiLz48YTpmb250IHNjcmlwdD0iS2htciIgdHlwZWZhY2U9Ik1vb2xCb3JhbiIvPjxhOmZvbnQgc2NyaXB0PSJLbmRhIiB0eXBlZmFjZT0iVHVuZ2EiLz48YTpmb250IHNjcmlwdD0iR3VydSIgdHlwZWZhY2U9IlJhYXZpIi8+PGE6Zm9udCBzY3JpcHQ9IkNhbnMiIHR5cGVmYWNlPSJFdXBoZW1pYSIvPjxhOmZvbnQgc2NyaXB0PSJDaGVyIiB0eXBlZmFjZT0iUGxhbnRhZ2VuZXQgQ2hlcm9rZWUiLz48YTpmb250IHNjcmlwdD0iWWlpaSIgdHlwZWZhY2U9Ik1pY3Jvc29mdCBZaSBCYWl0aSIvPjxhOmZvbnQgc2NyaXB0PSJUaWJ0IiB0eXBlZmFjZT0iTWljcm9zb2Z0IEhpbWFsYXlhIi8+PGE6Zm9udCBzY3JpcHQ9IlRoYWEiIHR5cGVmYWNlPSJNViBCb2xpIi8+PGE6Zm9udCBzY3JpcHQ9IkRldmEiIHR5cGVmYWNlPSJNYW5nYWwiLz48YTpmb250IHNjcmlwdD0iVGVsdSIgdHlwZWZhY2U9IkdhdXRhbWkiLz48YTpmb250IHNjcmlwdD0iVGFtbCIgdHlwZWZhY2U9IkxhdGhhIi8+PGE6Zm9udCBzY3JpcHQ9IlN5cmMiIHR5cGVmYWNlPSJFc3RyYW5nZWxvIEVkZXNzYSIvPjxhOmZvbnQgc2NyaXB0PSJPcnlhIiB0eXBlZmFjZT0iS2FsaW5nYSIvPjxhOmZvbnQgc2NyaXB0PSJNbHltIiB0eXBlZmFjZT0iS2FydGlrYSIvPjxhOmZvbnQgc2NyaXB0PSJMYW9vIiB0eXBlZmFjZT0iRG9rQ2hhbXBhIi8+PGE6Zm9udCBzY3JpcHQ9IlNpbmgiIHR5cGVmYWNlPSJJc2tvb2xhIFBvdGEiLz48YTpmb250IHNjcmlwdD0iTW9uZyIgdHlwZWZhY2U9Ik1vbmdvbGlhbiBCYWl0aSIvPjxhOmZvbnQgc2NyaXB0PSJWaWV0IiB0eXBlZmFjZT0iVGltZXMgTmV3IFJvbWFuIi8+PGE6Zm9udCBzY3JpcHQ9IlVpZ2giIHR5cGVmYWNlPSJNaWNyb3NvZnQgVWlnaHVyIi8+PGE6Zm9udCBzY3JpcHQ9Ikdlb3IiIHR5cGVmYWNlPSJTeWxmYWVuIi8+PC9hOm1ham9yRm9udD48YTptaW5vckZvbnQ+PGE6bGF0aW4gdHlwZWZhY2U9IkNhbGlicmkiLz48YTplYSB0eXBlZmFjZT0iIi8+PGE6Y3MgdHlwZWZhY2U9IiIvPjxhOmZvbnQgc2NyaXB0PSJKcGFuIiB0eXBlZmFjZT0i77yt77yzIO+8sOOCtOOCt+ODg+OCryIvPjxhOmZvbnQgc2NyaXB0PSJIYW5nIiB0eXBlZmFjZT0i66eR7J2AIOqzoOuUlSIvPjxhOmZvbnQgc2NyaXB0PSJIYW5zIiB0eXBlZmFjZT0i5a6L5L2TIi8+PGE6Zm9udCBzY3JpcHQ9IkhhbnQiIHR5cGVmYWNlPSLmlrDntLDmmI7pq5QiLz48YTpmb250IHNjcmlwdD0iQXJhYiIgdHlwZWZhY2U9IkFyaWFsIi8+PGE6Zm9udCBzY3JpcHQ9IkhlYnIiIHR5cGVmYWNlPSJBcmlhbCIvPjxhOmZvbnQgc2NyaXB0PSJUaGFpIiB0eXBlZmFjZT0iVGFob21hIi8+PGE6Zm9udCBzY3JpcHQ9IkV0aGkiIHR5cGVmYWNlPSJOeWFsYSIvPjxhOmZvbnQgc2NyaXB0PSJCZW5nIiB0eXBlZmFjZT0iVnJpbmRhIi8+PGE6Zm9udCBzY3JpcHQ9Ikd1anIiIHR5cGVmYWNlPSJTaHJ1dGkiLz48YTpmb250IHNjcmlwdD0iS2htciIgdHlwZWZhY2U9IkRhdW5QZW5oIi8+PGE6Zm9udCBzY3JpcHQ9IktuZGEiIHR5cGVmYWNlPSJUdW5nYSIvPjxhOmZvbnQgc2NyaXB0PSJHdXJ1IiB0eXBlZmFjZT0iUmFhdmkiLz48YTpmb250IHNjcmlwdD0iQ2FucyIgdHlwZWZhY2U9IkV1cGhlbWlhIi8+PGE6Zm9udCBzY3JpcHQ9IkNoZXIiIHR5cGVmYWNlPSJQbGFudGFnZW5ldCBDaGVyb2tlZSIvPjxhOmZvbnQgc2NyaXB0PSJZaWlpIiB0eXBlZmFjZT0iTWljcm9zb2Z0IFlpIEJhaXRpIi8+PGE6Zm9udCBzY3JpcHQ9IlRpYnQiIHR5cGVmYWNlPSJNaWNyb3NvZnQgSGltYWxheWEiLz48YTpmb250IHNjcmlwdD0iVGhhYSIgdHlwZWZhY2U9Ik1WIEJvbGkiLz48YTpmb250IHNjcmlwdD0iRGV2YSIgdHlwZWZhY2U9Ik1hbmdhbCIvPjxhOmZvbnQgc2NyaXB0PSJUZWx1IiB0eXBlZmFjZT0iR2F1dGFtaSIvPjxhOmZvbnQgc2NyaXB0PSJUYW1sIiB0eXBlZmFjZT0iTGF0aGEiLz48YTpmb250IHNjcmlwdD0iU3lyYyIgdHlwZWZhY2U9IkVzdHJhbmdlbG8gRWRlc3NhIi8+PGE6Zm9udCBzY3JpcHQ9Ik9yeWEiIHR5cGVmYWNlPSJLYWxpbmdhIi8+PGE6Zm9udCBzY3JpcHQ9Ik1seW0iIHR5cGVmYWNlPSJLYXJ0aWthIi8+PGE6Zm9udCBzY3JpcHQ9Ikxhb28iIHR5cGVmYWNlPSJEb2tDaGFtcGEiLz48YTpmb250IHNjcmlwdD0iU2luaCIgdHlwZWZhY2U9Iklza29vbGEgUG90YSIvPjxhOmZvbnQgc2NyaXB0PSJNb25nIiB0eXBlZmFjZT0iTW9uZ29saWFuIEJhaXRpIi8+PGE6Zm9udCBzY3JpcHQ9IlZpZXQiIHR5cGVmYWNlPSJBcmlhbCIvPjxhOmZvbnQgc2NyaXB0PSJVaWdoIiB0eXBlZmFjZT0iTWljcm9zb2Z0IFVpZ2h1ciIvPjxhOmZvbnQgc2NyaXB0PSJHZW9yIiB0eXBlZmFjZT0iU3lsZmFlbiIvPjwvYTptaW5vckZvbnQ+PC9hOmZvbnRTY2hlbWU+PGE6Zm10U2NoZW1lIG5hbWU9Ik9mZmljZSI+PGE6ZmlsbFN0eWxlTHN0PjxhOnNvbGlkRmlsbD48YTpzY2hlbWVDbHIgdmFsPSJwaENsciIvPjwvYTpzb2xpZEZpbGw+PGE6Z3JhZEZpbGwgcm90V2l0aFNoYXBlPSIxIj48YTpnc0xzdD48YTpncyBwb3M9IjAiPjxhOnNjaGVtZUNsciB2YWw9InBoQ2xyIj48YTp0aW50IHZhbD0iNTAwMDAiLz48YTpzYXRNb2QgdmFsPSIzMDAwMDAiLz48L2E6c2NoZW1lQ2xyPjwvYTpncz48YTpncyBwb3M9IjM1MDAwIj48YTpzY2hlbWVDbHIgdmFsPSJwaENsciI+PGE6dGludCB2YWw9IjM3MDAwIi8+PGE6c2F0TW9kIHZhbD0iMzAwMDAwIi8+PC9hOnNjaGVtZUNscj48L2E6Z3M+PGE6Z3MgcG9zPSIxMDAwMDAiPjxhOnNjaGVtZUNsciB2YWw9InBoQ2xyIj48YTp0aW50IHZhbD0iMTUwMDAiLz48YTpzYXRNb2QgdmFsPSIzNTAwMDAiLz48L2E6c2NoZW1lQ2xyPjwvYTpncz48L2E6Z3NMc3Q+PGE6bGluIGFuZz0iMTYyMDAwMDAiIHNjYWxlZD0iMSIvPjwvYTpncmFkRmlsbD48YTpncmFkRmlsbCByb3RXaXRoU2hhcGU9IjEiPjxhOmdzTHN0PjxhOmdzIHBvcz0iMCI+PGE6c2NoZW1lQ2xyIHZhbD0icGhDbHIiPjxhOnNoYWRlIHZhbD0iNTEwMDAiLz48YTpzYXRNb2QgdmFsPSIxMzAwMDAiLz48L2E6c2NoZW1lQ2xyPjwvYTpncz48YTpncyBwb3M9IjgwMDAwIj48YTpzY2hlbWVDbHIgdmFsPSJwaENsciI+PGE6c2hhZGUgdmFsPSI5MzAwMCIvPjxhOnNhdE1vZCB2YWw9IjEzMDAwMCIvPjwvYTpzY2hlbWVDbHI+PC9hOmdzPjxhOmdzIHBvcz0iMTAwMDAwIj48YTpzY2hlbWVDbHIgdmFsPSJwaENsciI+PGE6c2hhZGUgdmFsPSI5NDAwMCIvPjxhOnNhdE1vZCB2YWw9IjEzNTAwMCIvPjwvYTpzY2hlbWVDbHI+PC9hOmdzPjwvYTpnc0xzdD48YTpsaW4gYW5nPSIxNjIwMDAwMCIgc2NhbGVkPSIwIi8+PC9hOmdyYWRGaWxsPjwvYTpmaWxsU3R5bGVMc3Q+PGE6bG5TdHlsZUxzdD48YTpsbiB3PSI5NTI1IiBjYXA9ImZsYXQiIGNtcGQ9InNuZyIgYWxnbj0iY3RyIj48YTpzb2xpZEZpbGw+PGE6c2NoZW1lQ2xyIHZhbD0icGhDbHIiPjxhOnNoYWRlIHZhbD0iOTUwMDAiLz48YTpzYXRNb2QgdmFsPSIxMDUwMDAiLz48L2E6c2NoZW1lQ2xyPjwvYTpzb2xpZEZpbGw+PGE6cHJzdERhc2ggdmFsPSJzb2xpZCIvPjwvYTpsbj48YTpsbiB3PSIyNTQwMCIgY2FwPSJmbGF0IiBjbXBkPSJzbmciIGFsZ249ImN0ciI+PGE6c29saWRGaWxsPjxhOnNjaGVtZUNsciB2YWw9InBoQ2xyIi8+PC9hOnNvbGlkRmlsbD48YTpwcnN0RGFzaCB2YWw9InNvbGlkIi8+PC9hOmxuPjxhOmxuIHc9IjM4MTAwIiBjYXA9ImZsYXQiIGNtcGQ9InNuZyIgYWxnbj0iY3RyIj48YTpzb2xpZEZpbGw+PGE6c2NoZW1lQ2xyIHZhbD0icGhDbHIiLz48L2E6c29saWRGaWxsPjxhOnByc3REYXNoIHZhbD0ic29saWQiLz48L2E6bG4+PC9hOmxuU3R5bGVMc3Q+PGE6ZWZmZWN0U3R5bGVMc3Q+PGE6ZWZmZWN0U3R5bGU+PGE6ZWZmZWN0THN0PjxhOm91dGVyU2hkdyBibHVyUmFkPSI0MDAwMCIgZGlzdD0iMjAwMDAiIGRpcj0iNTQwMDAwMCIgcm90V2l0aFNoYXBlPSIwIj48YTpzcmdiQ2xyIHZhbD0iMDAwMDAwIj48YTphbHBoYSB2YWw9IjM4MDAwIi8+PC9hOnNyZ2JDbHI+PC9hOm91dGVyU2hkdz48L2E6ZWZmZWN0THN0PjwvYTplZmZlY3RTdHlsZT48YTplZmZlY3RTdHlsZT48YTplZmZlY3RMc3Q+PGE6b3V0ZXJTaGR3IGJsdXJSYWQ9IjQwMDAwIiBkaXN0PSIyMzAwMCIgZGlyPSI1NDAwMDAwIiByb3RXaXRoU2hhcGU9IjAiPjxhOnNyZ2JDbHIgdmFsPSIwMDAwMDAiPjxhOmFscGhhIHZhbD0iMzUwMDAiLz48L2E6c3JnYkNscj48L2E6b3V0ZXJTaGR3PjwvYTplZmZlY3RMc3Q+PC9hOmVmZmVjdFN0eWxlPjxhOmVmZmVjdFN0eWxlPjxhOmVmZmVjdExzdD48YTpvdXRlclNoZHcgYmx1clJhZD0iNDAwMDAiIGRpc3Q9IjIzMDAwIiBkaXI9IjU0MDAwMDAiIHJvdFdpdGhTaGFwZT0iMCI+PGE6c3JnYkNsciB2YWw9IjAwMDAwMCI+PGE6YWxwaGEgdmFsPSIzNTAwMCIvPjwvYTpzcmdiQ2xyPjwvYTpvdXRlclNoZHc+PC9hOmVmZmVjdExzdD48YTpzY2VuZTNkPjxhOmNhbWVyYSBwcnN0PSJvcnRob2dyYXBoaWNGcm9udCI+PGE6cm90IGxhdD0iMCIgbG9uPSIwIiByZXY9IjAiLz48L2E6Y2FtZXJhPjxhOmxpZ2h0UmlnIHJpZz0idGhyZWVQdCIgZGlyPSJ0Ij48YTpyb3QgbGF0PSIwIiBsb249IjAiIHJldj0iMTIwMDAwMCIvPjwvYTpsaWdodFJpZz48L2E6c2NlbmUzZD48YTpzcDNkPjxhOmJldmVsVCB3PSI2MzUwMCIgaD0iMjU0MDAiLz48L2E6c3AzZD48L2E6ZWZmZWN0U3R5bGU+PC9hOmVmZmVjdFN0eWxlTHN0PjxhOmJnRmlsbFN0eWxlTHN0PjxhOnNvbGlkRmlsbD48YTpzY2hlbWVDbHIgdmFsPSJwaENsciIvPjwvYTpzb2xpZEZpbGw+PGE6Z3JhZEZpbGwgcm90V2l0aFNoYXBlPSIxIj48YTpnc0xzdD48YTpncyBwb3M9IjAiPjxhOnNjaGVtZUNsciB2YWw9InBoQ2xyIj48YTp0aW50IHZhbD0iNDAwMDAiLz48YTpzYXRNb2QgdmFsPSIzNTAwMDAiLz48L2E6c2NoZW1lQ2xyPjwvYTpncz48YTpncyBwb3M9IjQwMDAwIj48YTpzY2hlbWVDbHIgdmFsPSJwaENsciI+PGE6dGludCB2YWw9IjQ1MDAwIi8+PGE6c2hhZGUgdmFsPSI5OTAwMCIvPjxhOnNhdE1vZCB2YWw9IjM1MDAwMCIvPjwvYTpzY2hlbWVDbHI+PC9hOmdzPjxhOmdzIHBvcz0iMTAwMDAwIj48YTpzY2hlbWVDbHIgdmFsPSJwaENsciI+PGE6c2hhZGUgdmFsPSIyMDAwMCIvPjxhOnNhdE1vZCB2YWw9IjI1NTAwMCIvPjwvYTpzY2hlbWVDbHI+PC9hOmdzPjwvYTpnc0xzdD48YTpwYXRoIHBhdGg9ImNpcmNsZSI+PGE6ZmlsbFRvUmVjdCBsPSI1MDAwMCIgdD0iLTgwMDAwIiByPSI1MDAwMCIgYj0iMTgwMDAwIi8+PC9hOnBhdGg+PC9hOmdyYWRGaWxsPjxhOmdyYWRGaWxsIHJvdFdpdGhTaGFwZT0iMSI+PGE6Z3NMc3Q+PGE6Z3MgcG9zPSIwIj48YTpzY2hlbWVDbHIgdmFsPSJwaENsciI+PGE6dGludCB2YWw9IjgwMDAwIi8+PGE6c2F0TW9kIHZhbD0iMzAwMDAwIi8+PC9hOnNjaGVtZUNscj48L2E6Z3M+PGE6Z3MgcG9zPSIxMDAwMDAiPjxhOnNjaGVtZUNsciB2YWw9InBoQ2xyIj48YTpzaGFkZSB2YWw9IjMwMDAwIi8+PGE6c2F0TW9kIHZhbD0iMjAwMDAwIi8+PC9hOnNjaGVtZUNscj48L2E6Z3M+PC9hOmdzTHN0PjxhOnBhdGggcGF0aD0iY2lyY2xlIj48YTpmaWxsVG9SZWN0IGw9IjUwMDAwIiB0PSI1MDAwMCIgcj0iNTAwMDAiIGI9IjUwMDAwIi8+PC9hOnBhdGg+PC9hOmdyYWRGaWxsPjwvYTpiZ0ZpbGxTdHlsZUxzdD48L2E6Zm10U2NoZW1lPjwvYTp0aGVtZUVsZW1lbnRzPjxhOm9iamVjdERlZmF1bHRzLz48YTpleHRyYUNsclNjaGVtZUxzdC8+PC9hOnRoZW1lPlBLAwQUAAAAAAAhSmVVFKryjicFAAAnBQAAFAAAAHhsL3NoYXJlZFN0cmluZ3MueG1sPD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9InllcyI/Pgo8c3N0IHhtbG5zPSJodHRwOi8vc2NoZW1hcy5vcGVueG1sZm9ybWF0cy5vcmcvc3ByZWFkc2hlZXRtbC8yMDA2L21haW4iIHVuaXF1ZUNvdW50PSI0MSI+PHNpPjx0Pk5vPC90Pjwvc2k+PHNpPjx0PklEPC90Pjwvc2k+PHNpPjx0PkplbmlzPC90Pjwvc2k+PHNpPjx0PlNpc3RlbTwvdD48L3NpPjxzaT48dD5XYWt0dTwvdD48L3NpPjxzaT48dD5ETVAgKE1XKTwvdD48L3NpPjxzaT48dD5DYXB0aXZlIFBvd2VyIChNVyk8L3Q+PC9zaT48c2k+PHQ+QmViYW4gUHVuY2FrIChNVyk8L3Q+PC9zaT48c2k+PHQ+Q2FkYW5nYW4gKE1XKTwvdD48L3NpPjxzaT48dD5LaXJpbSAoTVcpPC90Pjwvc2k+PHNpPjx0PklEIFNpc3RlbSBQZW5lcmltYTwvdD48L3NpPjxzaT48dD5UZXJpbWEgKE1XKTwvdD48L3NpPjxzaT48dD5JRCBTaXN0ZW0gUGVuZ2lyaW08L3Q+PC9zaT48c2k+PHQ+U3RhdHVzPC90Pjwvc2k+PHNpPjx0PlVuaXQgVGlkYWsgU2lhcDwvdD48L3NpPjxzaT48dD5LZXRlcmFuZ2FuPC90Pjwvc2k+PHNpPjx0PlVMRDwvdD48L3NpPjxzaT48dD5QTFREIFR1bWJhbmcgU2VuYW1hbmc8L3Q+PC9zaT48c2k+PHQ+U2lhbmc8L3Q+PC9zaT48c2k+PHQ+TWFsYW08L3Q+PC9zaT48c2k+PHQ+UExURCBUZWxhZ2E8L3Q+PC9zaT48c2k+PHQ+UExURCBQYWdhdGFuPC90Pjwvc2k+PHNpPjx0PlBMVEQgVGVsYWdhIFB1bGFuZzwvdD48L3NpPjxzaT48dD5QTFREIE1lbmRhd2FpPC90Pjwvc2k+PHNpPjx0PlBMVEQgS2VuYW1idWk8L3Q+PC9zaT48c2k+PHQ+UExURCBUdW1iYW5nIE1hbmp1bDwvdD48L3NpPjxzaT48dD5QTFREIEt1ZGFuZ2FuPC90Pjwvc2k+PHNpPjx0PlBMVEQgQmFiYWk8L3Q+PC9zaT48c2k+PHQ+UExURCBNYW5na2F0aXA8L3Q+PC9zaT48c2k+PHQ+UExURCBUZWx1ayBCZXR1bmc8L3Q+PC9zaT48c2k+PHQ+UExURCBSYW5nZ2EgSWx1bmc8L3Q+PC9zaT48c2k+PHQ+UExURCBUdW1wdW5nIExhdW5nPC90Pjwvc2k+PHNpPjx0PlBMVEQgU3VuZ2FpIEJhbGk8L3Q+PC9zaT48c2k+PHQ+UExURCBNYXJhYmF0dWFuPC90Pjwvc2k+PHNpPjx0PlBMVEQgS2VyYXNpYW48L3Q+PC9zaT48c2k+PHQ+UExURCBLZXJheWFhbjwvdD48L3NpPjxzaT48dD5QTFREIEtlcnVtcHV0YW48L3Q+PC9zaT48c2k+PHQ+UExURCBHdW51bmcgUHVyZWk8L3Q+PC9zaT48c2k+PHQ+VG90YWwgRGF5YSBUZXJwYXNhbmcgKE1XKTwvdD48L3NpPjxzaT48dD5ETU4gKE1XKTwvdD48L3NpPjxzaT48dD5Vbml0IFRlcmJlc2FyIChNVyk8L3Q+PC9zaT48L3NzdD5QSwMEFAAAAAAAIUplVRFubsE6DwAAOg8AAA0AAAB4bC9zdHlsZXMueG1sPD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9InllcyI/Pgo8c3R5bGVTaGVldCB4bWw6c3BhY2U9InByZXNlcnZlIiB4bWxucz0iaHR0cDovL3NjaGVtYXMub3BlbnhtbGZvcm1hdHMub3JnL3NwcmVhZHNoZWV0bWwvMjAwNi9tYWluIj48bnVtRm10cyBjb3VudD0iMCIvPjxmb250cyBjb3VudD0iMiI+PGZvbnQ+PGIgdmFsPSIwIi8+PGkgdmFsPSIwIi8+PHN0cmlrZSB2YWw9IjAiLz48dSB2YWw9Im5vbmUiLz48c3ogdmFsPSIxMSIvPjxjb2xvciByZ2I9IkZGMDAwMDAwIi8+PG5hbWUgdmFsPSJDYWxpYnJpIi8+PC9mb250Pjxmb250PjxiIHZhbD0iMSIvPjxpIHZhbD0iMCIvPjxzdHJpa2UgdmFsPSIwIi8+PHUgdmFsPSJub25lIi8+PHN6IHZhbD0iMTIiLz48Y29sb3IgcmdiPSJGRjAwMDAwMCIvPjxuYW1lIHZhbD0iQ2FsaWJyaSIvPjwvZm9udD48L2ZvbnRzPjxmaWxscyBjb3VudD0iMiI+PGZpbGw+PHBhdHRlcm5GaWxsIHBhdHRlcm5UeXBlPSJub25lIi8+PC9maWxsPjxmaWxsPjxwYXR0ZXJuRmlsbCBwYXR0ZXJuVHlwZT0iZ3JheTEyNSI+PGZnQ29sb3IgcmdiPSJGRkZGRkZGRiIvPjxiZ0NvbG9yIHJnYj0iRkYwMDAwMDAiLz48L3BhdHRlcm5GaWxsPjwvZmlsbD48L2ZpbGxzPjxib3JkZXJzIGNvdW50PSI0Ij48Ym9yZGVyLz48Ym9yZGVyPjxsZWZ0IHN0eWxlPSJ0aGluIj48Y29sb3IgcmdiPSJGRjAwMDAwMCIvPjwvbGVmdD48cmlnaHQgc3R5bGU9InRoaW4iPjxjb2xvciByZ2I9IkZGMDAwMDAwIi8+PC9yaWdodD48dG9wIHN0eWxlPSJ0aGluIj48Y29sb3IgcmdiPSJGRjAwMDAwMCIvPjwvdG9wPjxib3R0b20gc3R5bGU9InRoaW4iPjxjb2xvciByZ2I9IkZGMDAwMDAwIi8+PC9ib3R0b20+PC9ib3JkZXI+PGJvcmRlcj48bGVmdCBzdHlsZT0idGhpbiI+PGNvbG9yIHJnYj0iRkYwMDAwMDAiLz48L2xlZnQ+PHJpZ2h0IHN0eWxlPSJ0aGluIj48Y29sb3IgcmdiPSJGRjAwMDAwMCIvPjwvcmlnaHQ+PHRvcCBzdHlsZT0idGhpbiI+PGNvbG9yIHJnYj0iRkYwMDAwMDAiLz48L3RvcD48L2JvcmRlcj48Ym9yZGVyPjxsZWZ0IHN0eWxlPSJ0aGluIj48Y29sb3IgcmdiPSJGRjAwMDAwMCIvPjwvbGVmdD48cmlnaHQgc3R5bGU9InRoaW4iPjxjb2xvciByZ2I9IkZGMDAwMDAwIi8+PC9yaWdodD48Ym90dG9tIHN0eWxlPSJ0aGluIj48Y29sb3IgcmdiPSJGRjAwMDAwMCIvPjwvYm90dG9tPjwvYm9yZGVyPjwvYm9yZGVycz48Y2VsbFN0eWxlWGZzIGNvdW50PSIxIj48eGYgbnVtRm10SWQ9IjAiIGZvbnRJZD0iMCIgZmlsbElkPSIwIiBib3JkZXJJZD0iMCIvPjwvY2VsbFN0eWxlWGZzPjxjZWxsWGZzIGNvdW50PSI5Ij48eGYgeGZJZD0iMCIgZm9udElkPSIwIiBudW1GbXRJZD0iMCIgZmlsbElkPSIwIiBib3JkZXJJZD0iMCIgYXBwbHlGb250PSIwIiBhcHBseU51bWJlckZvcm1hdD0iMCIgYXBwbHlGaWxsPSIwIiBhcHBseUJvcmRlcj0iMCIgYXBwbHlBbGlnbm1lbnQ9IjAiPjxhbGlnbm1lbnQgaG9yaXpvbnRhbD0iZ2VuZXJhbCIgdmVydGljYWw9ImJvdHRvbSIgdGV4dFJvdGF0aW9uPSIwIiB3cmFwVGV4dD0iZmFsc2UiIHNocmlua1RvRml0PSJmYWxzZSIvPjwveGY+PHhmIHhmSWQ9IjAiIGZvbnRJZD0iMCIgbnVtRm10SWQ9IjAiIGZpbGxJZD0iMCIgYm9yZGVySWQ9IjEiIGFwcGx5Rm9udD0iMCIgYXBwbHlOdW1iZXJGb3JtYXQ9IjAiIGFwcGx5RmlsbD0iMCIgYXBwbHlCb3JkZXI9IjEiIGFwcGx5QWxpZ25tZW50PSIxIj48YWxpZ25tZW50IGhvcml6b250YWw9ImNlbnRlciIgdmVydGljYWw9ImNlbnRlciIgdGV4dFJvdGF0aW9uPSIwIiB3cmFwVGV4dD0iZmFsc2UiIHNocmlua1RvRml0PSJmYWxzZSIvPjwveGY+PHhmIHhmSWQ9IjAiIGZvbnRJZD0iMSIgbnVtRm10SWQ9IjAiIGZpbGxJZD0iMCIgYm9yZGVySWQ9IjEiIGFwcGx5Rm9udD0iMSIgYXBwbHlOdW1iZXJGb3JtYXQ9IjAiIGFwcGx5RmlsbD0iMCIgYXBwbHlCb3JkZXI9IjEiIGFwcGx5QWxpZ25tZW50PSIxIj48YWxpZ25tZW50IGhvcml6b250YWw9ImNlbnRlciIgdmVydGljYWw9ImNlbnRlciIgdGV4dFJvdGF0aW9uPSIwIiB3cmFwVGV4dD0iZmFsc2UiIHNocmlua1RvRml0PSJmYWxzZSIvPjwveGY+PHhmIHhmSWQ9IjAiIGZvbnRJZD0iMCIgbnVtRm10SWQ9IjAiIGZpbGxJZD0iMCIgYm9yZGVySWQ9IjIiIGFwcGx5Rm9udD0iMCIgYXBwbHlOdW1iZXJGb3JtYXQ9IjAiIGFwcGx5RmlsbD0iMCIgYXBwbHlCb3JkZXI9IjEiIGFwcGx5QWxpZ25tZW50PSIxIj48YWxpZ25tZW50IGhvcml6b250YWw9ImNlbnRlciIgdmVydGljYWw9ImNlbnRlciIgdGV4dFJvdGF0aW9uPSIwIiB3cmFwVGV4dD0iZmFsc2UiIHNocmlua1RvRml0PSJmYWxzZSIvPjwveGY+PHhmIHhmSWQ9IjAiIGZvbnRJZD0iMCIgbnVtRm10SWQ9IjAiIGZpbGxJZD0iMCIgYm9yZGVySWQ9IjEiIGFwcGx5Rm9udD0iMCIgYXBwbHlOdW1iZXJGb3JtYXQ9IjAiIGFwcGx5RmlsbD0iMCIgYXBwbHlCb3JkZXI9IjEiIGFwcGx5QWxpZ25tZW50PSIxIj48YWxpZ25tZW50IGhvcml6b250YWw9ImxlZnQiIHZlcnRpY2FsPSJjZW50ZXIiIHRleHRSb3RhdGlvbj0iMCIgd3JhcFRleHQ9ImZhbHNlIiBzaHJpbmtUb0ZpdD0iZmFsc2UiLz48L3hmPjx4ZiB4ZklkPSIwIiBmb250SWQ9IjAiIG51bUZtdElkPSIwIiBmaWxsSWQ9IjAiIGJvcmRlcklkPSIxIiBhcHBseUZvbnQ9IjAiIGFwcGx5TnVtYmVyRm9ybWF0PSIwIiBhcHBseUZpbGw9IjAiIGFwcGx5Qm9yZGVyPSIxIiBhcHBseUFsaWdubWVudD0iMSI+PGFsaWdubWVudCBob3Jpem9udGFsPSJnZW5lcmFsIiB2ZXJ0aWNhbD0iY2VudGVyIiB0ZXh0Um90YXRpb249IjAiIHdyYXBUZXh0PSJmYWxzZSIgc2hyaW5rVG9GaXQ9ImZhbHNlIi8+PC94Zj48eGYgeGZJZD0iMCIgZm9udElkPSIwIiBudW1GbXRJZD0iMCIgZmlsbElkPSIwIiBib3JkZXJJZD0iMSIgYXBwbHlGb250PSIwIiBhcHBseU51bWJlckZvcm1hdD0iMCIgYXBwbHlGaWxsPSIwIiBhcHBseUJvcmRlcj0iMSIgYXBwbHlBbGlnbm1lbnQ9IjEiIGFwcGx5UHJvdGVjdGlvbj0idHJ1ZSI+PGFsaWdubWVudCBob3Jpem9udGFsPSJnZW5lcmFsIiB2ZXJ0aWNhbD0iY2VudGVyIiB0ZXh0Um90YXRpb249IjAiIHdyYXBUZXh0PSJmYWxzZSIgc2hyaW5rVG9GaXQ9ImZhbHNlIi8+PHByb3RlY3Rpb24gbG9ja2VkPSJmYWxzZSIvPjwveGY+PHhmIHhmSWQ9IjAiIGZvbnRJZD0iMCIgbnVtRm10SWQ9IjAiIGZpbGxJZD0iMCIgYm9yZGVySWQ9IjMiIGFwcGx5Rm9udD0iMCIgYXBwbHlOdW1iZXJGb3JtYXQ9IjAiIGFwcGx5RmlsbD0iMCIgYXBwbHlCb3JkZXI9IjEiIGFwcGx5QWxpZ25tZW50PSIxIj48YWxpZ25tZW50IGhvcml6b250YWw9ImdlbmVyYWwiIHZlcnRpY2FsPSJjZW50ZXIiIHRleHRSb3RhdGlvbj0iMCIgd3JhcFRleHQ9ImZhbHNlIiBzaHJpbmtUb0ZpdD0iZmFsc2UiLz48L3hmPjx4ZiB4ZklkPSIwIiBmb250SWQ9IjAiIG51bUZtdElkPSIwIiBmaWxsSWQ9IjAiIGJvcmRlcklkPSIzIiBhcHBseUZvbnQ9IjAiIGFwcGx5TnVtYmVyRm9ybWF0PSIwIiBhcHBseUZpbGw9IjAiIGFwcGx5Qm9yZGVyPSIxIiBhcHBseUFsaWdubWVudD0iMSI+PGFsaWdubWVudCBob3Jpem9udGFsPSJjZW50ZXIiIHZlcnRpY2FsPSJjZW50ZXIiIHRleHRSb3RhdGlvbj0iMCIgd3JhcFRleHQ9ImZhbHNlIiBzaHJpbmtUb0ZpdD0iZmFsc2UiLz48L3hmPjwvY2VsbFhmcz48Y2VsbFN0eWxlcyBjb3VudD0iMSI+PGNlbGxTdHlsZSBuYW1lPSJOb3JtYWwiIHhmSWQ9IjAiIGJ1aWx0aW5JZD0iMCIvPjwvY2VsbFN0eWxlcz48ZHhmcyBjb3VudD0iMCIvPjx0YWJsZVN0eWxlcyBkZWZhdWx0VGFibGVTdHlsZT0iVGFibGVTdHlsZU1lZGl1bTkiIGRlZmF1bHRQaXZvdFN0eWxlPSJQaXZvdFRhYmxlU3R5bGUxIi8+PC9zdHlsZVNoZWV0PlBLAwQUAAAAAAAhSmVV9I83YxADAAAQAwAADwAAAHhsL3dvcmtib29rLnhtbDw/eG1sIHZlcnNpb249IjEuMCIgZW5jb2Rpbmc9IlVURi04IiBzdGFuZGFsb25lPSJ5ZXMiPz4KPHdvcmtib29rIHhtbDpzcGFjZT0icHJlc2VydmUiIHhtbG5zPSJodHRwOi8vc2NoZW1hcy5vcGVueG1sZm9ybWF0cy5vcmcvc3ByZWFkc2hlZXRtbC8yMDA2L21haW4iIHhtbG5zOnI9Imh0dHA6Ly9zY2hlbWFzLm9wZW54bWxmb3JtYXRzLm9yZy9vZmZpY2VEb2N1bWVudC8yMDA2L3JlbGF0aW9uc2hpcHMiPjxmaWxlVmVyc2lvbiBhcHBOYW1lPSJ4bCIgbGFzdEVkaXRlZD0iNCIgbG93ZXN0RWRpdGVkPSI0IiBydXBCdWlsZD0iNDUwNSIvPjx3b3JrYm9va1ByIGNvZGVOYW1lPSJUaGlzV29ya2Jvb2siLz48Ym9va1ZpZXdzPjx3b3JrYm9va1ZpZXcgYWN0aXZlVGFiPSIxIiBhdXRvRmlsdGVyRGF0ZUdyb3VwaW5nPSIxIiBmaXJzdFNoZWV0PSIwIiBtaW5pbWl6ZWQ9IjAiIHNob3dIb3Jpem9udGFsU2Nyb2xsPSIxIiBzaG93U2hlZXRUYWJzPSIxIiBzaG93VmVydGljYWxTY3JvbGw9IjEiIHRhYlJhdGlvPSI2MDAiIHZpc2liaWxpdHk9InZpc2libGUiLz48L2Jvb2tWaWV3cz48c2hlZXRzPjxzaGVldCBuYW1lPSJOZXJhY2EgRGF5YSIgc2hlZXRJZD0iMSIgcjppZD0icklkNCIvPjxzaGVldCBuYW1lPSJLZXNpYXBhbiBQZW1iYW5na2l0IiBzaGVldElkPSIyIiByOmlkPSJySWQ1Ii8+PC9zaGVldHM+PGRlZmluZWROYW1lcy8+PGNhbGNQciBjYWxjSWQ9Ijk5OTk5OSIgY2FsY01vZGU9ImF1dG8iIGNhbGNDb21wbGV0ZWQ9IjAiIGZ1bGxDYWxjT25Mb2FkPSIxIi8+PC93b3JrYm9vaz5QSwMEFAAAAAAAIUplVcdZpTyDSgAAg0oAABgAAAB4bC93b3Jrc2hlZXRzL3NoZWV0MS54bWw8P3htbCB2ZXJzaW9uPSIxLjAiIGVuY29kaW5nPSJVVEYtOCIgc3RhbmRhbG9uZT0ieWVzIj8+Cjx3b3Jrc2hlZXQgeG1sOnNwYWNlPSJwcmVzZXJ2ZSIgeG1sbnM9Imh0dHA6Ly9zY2hlbWFzLm9wZW54bWxmb3JtYXRzLm9yZy9zcHJlYWRzaGVldG1sLzIwMDYvbWFpbiIgeG1sbnM6cj0iaHR0cDovL3NjaGVtYXMub3BlbnhtbGZvcm1hdHMub3JnL29mZmljZURvY3VtZW50LzIwMDYvcmVsYXRpb25zaGlwcyI+PHNoZWV0UHI+PG91dGxpbmVQciBzdW1tYXJ5QmVsb3c9IjEiIHN1bW1hcnlSaWdodD0iMSIvPjxwYWdlU2V0VXBQciBmaXRUb1BhZ2U9IjEiLz48L3NoZWV0UHI+PGRpbWVuc2lvbiByZWY9IkExOlAzOSIvPjxzaGVldFZpZXdzPjxzaGVldFZpZXcgdGFiU2VsZWN0ZWQ9IjAiIHdvcmtib29rVmlld0lkPSIwIiBzaG93R3JpZExpbmVzPSJ0cnVlIiBzaG93Um93Q29sSGVhZGVycz0iMSI+PHNlbGVjdGlvbiBhY3RpdmVDZWxsPSJEMzgiIHNxcmVmPSJEMzgiLz48L3NoZWV0Vmlldz48L3NoZWV0Vmlld3M+PHNoZWV0Rm9ybWF0UHIgZGVmYXVsdFJvd0hlaWdodD0iMTQuNCIgb3V0bGluZUxldmVsUm93PSIwIiBvdXRsaW5lTGV2ZWxDb2w9IjAiLz48Y29scz48Y29sIG1pbj0iMSIgbWF4PSIxIiB3aWR0aD0iMy41NzA1NTciIGJlc3RGaXQ9InRydWUiIGN1c3RvbVdpZHRoPSJ0cnVlIiBzdHlsZT0iMCIvPjxjb2wgbWluPSIyIiBtYXg9IjIiIHdpZHRoPSI1Ljg1NTcxMyIgYmVzdEZpdD0idHJ1ZSIgY3VzdG9tV2lkdGg9InRydWUiIHN0eWxlPSIwIi8+PGNvbCBtaW49IjMiIG1heD0iMyIgd2lkdGg9IjcuNDI2NzU4IiBiZXN0Rml0PSJ0cnVlIiBjdXN0b21XaWR0aD0idHJ1ZSIgc3R5bGU9IjAiLz48Y29sIG1pbj0iNCIgbWF4PSI0IiB3aWR0aD0iMzAiIGN1c3RvbVdpZHRoPSJ0cnVlIiBzdHlsZT0iMCIvPjxjb2wgbWluPSI1IiBtYXg9IjUiIHdpZHRoPSI3LjQyNjc1OCIgYmVzdEZpdD0idHJ1ZSIgY3VzdG9tV2lkdGg9InRydWUiIHN0eWxlPSIwIi8+PGNvbCBtaW49IjYiIG1heD0iNiIgd2lkdGg9IjIwIiBjdXN0b21XaWR0aD0idHJ1ZSIgc3R5bGU9IjAiLz48Y29sIG1pbj0iNyIgbWF4PSI3IiB3aWR0aD0iMjAiIGN1c3RvbVdpZHRoPSJ0cnVlIiBzdHlsZT0iMCIvPjxjb2wgbWluPSI4IiBtYXg9IjgiIHdpZHRoPSIyMCIgY3VzdG9tV2lkdGg9InRydWUiIHN0eWxlPSIwIi8+PGNvbCBtaW49IjkiIG1heD0iOSIgd2lkdGg9IjIwIiBjdXN0b21XaWR0aD0idHJ1ZSIgc3R5bGU9IjAiLz48Y29sIG1pbj0iMTAiIG1heD0iMTAiIHdpZHRoPSIyMCIgY3VzdG9tV2lkdGg9InRydWUiIHN0eWxlPSIwIi8+PGNvbCBtaW49IjExIiBtYXg9IjExIiB3aWR0aD0iMjAiIGN1c3RvbVdpZHRoPSJ0cnVlIiBzdHlsZT0iMCIvPjxjb2wgbWluPSIxMiIgbWF4PSIxMiIgd2lkdGg9IjIwIiBjdXN0b21XaWR0aD0idHJ1ZSIgc3R5bGU9IjAiLz48Y29sIG1pbj0iMTMiIG1heD0iMTMiIHdpZHRoPSIyMCIgY3VzdG9tV2lkdGg9InRydWUiIHN0eWxlPSIwIi8+PGNvbCBtaW49IjE0IiBtYXg9IjE0IiB3aWR0aD0iOC43MTIxNTgwMDAwMDAwMDEiIGJlc3RGaXQ9InRydWUiIGN1c3RvbVdpZHRoPSJ0cnVlIiBzdHlsZT0iMCIvPjxjb2wgbWluPSIxNSIgbWF4PSIxNSIgd2lkdGg9IjUwIiBjdXN0b21XaWR0aD0idHJ1ZSIgc3R5bGU9IjAiLz48Y29sIG1pbj0iMTYiIG1heD0iMTYiIHdpZHRoPSI1MCIgY3VzdG9tV2lkdGg9InRydWUiIHN0eWxlPSIwIi8+PC9jb2xzPjxzaGVldERhdGE+PHJvdyByPSIxIiBzcGFucz0iMToxNiIgY3VzdG9tSGVpZ2h0PSIxIiBodD0iMjUiPjxjIHI9IkExIiBzPSIyIiB0PSJzIj48dj4wPC92PjwvYz48YyByPSJCMSIgcz0iMiIgdD0icyI+PHY+MTwvdj48L2M+PGMgcj0iQzEiIHM9IjIiIHQ9InMiPjx2PjI8L3Y+PC9jPjxjIHI9IkQxIiBzPSIyIiB0PSJzIj48dj4zPC92PjwvYz48YyByPSJFMSIgcz0iMiIgdD0icyI+PHY+NDwvdj48L2M+PGMgcj0iRjEiIHM9IjIiIHQ9InMiPjx2PjU8L3Y+PC9jPjxjIHI9IkcxIiBzPSIyIiB0PSJzIj48dj42PC92PjwvYz48YyByPSJIMSIgcz0iMiIgdD0icyI+PHY+Nzwvdj48L2M+PGMgcj0iSTEiIHM9IjIiIHQ9InMiPjx2Pjg8L3Y+PC9jPjxjIHI9IkoxIiBzPSIyIiB0PSJzIj48dj45PC92PjwvYz48YyByPSJLMSIgcz0iMiIgdD0icyI+PHY+MTA8L3Y+PC9jPjxjIHI9IkwxIiBzPSIyIiB0PSJzIj48dj4xMTwvdj48L2M+PGMgcj0iTTEiIHM9IjIiIHQ9InMiPjx2PjEyPC92PjwvYz48YyByPSJOMSIgcz0iMiIgdD0icyI+PHY+MTM8L3Y+PC9jPjxjIHI9Ik8xIiBzPSIyIiB0PSJzIj48dj4xNDwvdj48L2M+PGMgcj0iUDEiIHM9IjIiIHQ9InMiPjx2PjE1PC92PjwvYz48L3Jvdz48cm93IHI9IjIiIHNwYW5zPSIxOjE2IiBjdXN0b21IZWlnaHQ9IjEiIGh0PSIyNSI+PGMgcj0iQTIiIHM9IjMiPjx2PjE8L3Y+PC9jPjxjIHI9IkIyIiBzPSIzIj48dj41NjA8L3Y+PC9jPjxjIHI9IkMyIiBzPSIzIiB0PSJzIj48dj4xNjwvdj48L2M+PGMgcj0iRDIiIHM9IjQiIHQ9InMiPjx2PjE3PC92PjwvYz48YyByPSJFMiIgcz0iNSIgdD0icyI+PHY+MTg8L3Y+PC9jPjxjIHI9IkYyIiBzPSI2Ii8+PGMgcj0iRzIiIHM9IjYiLz48YyByPSJIMiIgcz0iNiIvPjxjIHI9IkkyIiBzPSI2Ii8+PGMgcj0iSjIiIHM9IjYiLz48YyByPSJLMiIgcz0iNiIvPjxjIHI9IkwyIiBzPSI2Ii8+PGMgcj0iTTIiIHM9IjYiLz48YyByPSJOMiIgcz0iNiIvPjxjIHI9Ik8yIiBzPSI2Ii8+PGMgcj0iUDIiIHM9IjYiLz48L3Jvdz48cm93IHI9IjMiIHNwYW5zPSIxOjE2IiBjdXN0b21IZWlnaHQ9IjEiIGh0PSIyNSI+PGMgcj0iQTMiIHM9IjciLz48YyByPSJCMyIgcz0iOCI+PHY+NTYwPC92PjwvYz48YyByPSJDMyIgcz0iOCIgdD0icyI+PHY+MTY8L3Y+PC9jPjxjIHI9IkQzIiBzPSI0Ii8+PGMgcj0iRTMiIHM9IjUiIHQ9InMiPjx2PjE5PC92PjwvYz48YyByPSJGMyIgcz0iNiIvPjxjIHI9IkczIiBzPSI2Ii8+PGMgcj0iSDMiIHM9IjYiLz48YyByPSJJMyIgcz0iNiIvPjxjIHI9IkozIiBzPSI2Ii8+PGMgcj0iSzMiIHM9IjYiLz48YyByPSJMMyIgcz0iNiIvPjxjIHI9Ik0zIiBzPSI2Ii8+PGMgcj0iTjMiIHM9IjYiLz48YyByPSJPMyIgcz0iNiIvPjxjIHI9IlAzIiBzPSI2Ii8+PC9yb3c+PHJvdyByPSI0IiBzcGFucz0iMToxNiIgY3VzdG9tSGVpZ2h0PSIxIiBodD0iMjUiPjxjIHI9IkE0IiBzPSIzIj48dj4yPC92PjwvYz48YyByPSJCNCIgcz0iMyI+PHY+NTYxPC92PjwvYz48YyByPSJDNCIgcz0iMyIgdD0icyI+PHY+MTY8L3Y+PC9jPjxjIHI9IkQ0IiBzPSI0IiB0PSJzIj48dj4yMDwvdj48L2M+PGMgcj0iRTQiIHM9IjUiIHQ9InMiPjx2PjE4PC92PjwvYz48YyByPSJGNCIgcz0iNiIvPjxjIHI9Ikc0IiBzPSI2Ii8+PGMgcj0iSDQiIHM9IjYiLz48YyByPSJJNCIgcz0iNiIvPjxjIHI9Iko0IiBzPSI2Ii8+PGMgcj0iSzQiIHM9IjYiLz48YyByPSJMNCIgcz0iNiIvPjxjIHI9Ik00IiBzPSI2Ii8+PGMgcj0iTjQiIHM9IjYiLz48YyByPSJPNCIgcz0iNiIvPjxjIHI9IlA0IiBzPSI2Ii8+PC9yb3c+PHJvdyByPSI1IiBzcGFucz0iMToxNiIgY3VzdG9tSGVpZ2h0PSIxIiBodD0iMjUiPjxjIHI9IkE1IiBzPSI3Ii8+PGMgcj0iQjUiIHM9IjgiPjx2PjU2MTwvdj48L2M+PGMgcj0iQzUiIHM9IjgiIHQ9InMiPjx2PjE2PC92PjwvYz48YyByPSJENSIgcz0iNCIvPjxjIHI9IkU1IiBzPSI1IiB0PSJzIj48dj4xOTwvdj48L2M+PGMgcj0iRjUiIHM9IjYiLz48YyByPSJHNSIgcz0iNiIvPjxjIHI9Ikg1IiBzPSI2Ii8+PGMgcj0iSTUiIHM9IjYiLz48YyByPSJKNSIgcz0iNiIvPjxjIHI9Iks1IiBzPSI2Ii8+PGMgcj0iTDUiIHM9IjYiLz48YyByPSJNNSIgcz0iNiIvPjxjIHI9Ik41IiBzPSI2Ii8+PGMgcj0iTzUiIHM9IjYiLz48YyByPSJQNSIgcz0iNiIvPjwvcm93Pjxyb3cgcj0iNiIgc3BhbnM9IjE6MTYiIGN1c3RvbUhlaWdodD0iMSIgaHQ9IjI1Ij48YyByPSJBNiIgcz0iMyI+PHY+Mzwvdj48L2M+PGMgcj0iQjYiIHM9IjMiPjx2PjU2Mjwvdj48L2M+PGMgcj0iQzYiIHM9IjMiIHQ9InMiPjx2PjE2PC92PjwvYz48YyByPSJENiIgcz0iNCIgdD0icyI+PHY+MjE8L3Y+PC9jPjxjIHI9IkU2IiBzPSI1IiB0PSJzIj48dj4xODwvdj48L2M+PGMgcj0iRjYiIHM9IjYiLz48YyByPSJHNiIgcz0iNiIvPjxjIHI9Ikg2IiBzPSI2Ii8+PGMgcj0iSTYiIHM9IjYiLz48YyByPSJKNiIgcz0iNiIvPjxjIHI9Iks2IiBzPSI2Ii8+PGMgcj0iTDYiIHM9IjYiLz48YyByPSJNNiIgcz0iNiIvPjxjIHI9Ik42IiBzPSI2Ii8+PGMgcj0iTzYiIHM9IjYiLz48YyByPSJQNiIgcz0iNiIvPjwvcm93Pjxyb3cgcj0iNyIgc3BhbnM9IjE6MTYiIGN1c3RvbUhlaWdodD0iMSIgaHQ9IjI1Ij48YyByPSJBNyIgcz0iNyIvPjxjIHI9IkI3IiBzPSI4Ij48dj41NjI8L3Y+PC9jPjxjIHI9IkM3IiBzPSI4IiB0PSJzIj48dj4xNjwvdj48L2M+PGMgcj0iRDciIHM9IjQiLz48YyByPSJFNyIgcz0iNSIgdD0icyI+PHY+MTk8L3Y+PC9jPjxjIHI9IkY3IiBzPSI2Ii8+PGMgcj0iRzciIHM9IjYiLz48YyByPSJINyIgcz0iNiIvPjxjIHI9Ikk3IiBzPSI2Ii8+PGMgcj0iSjciIHM9IjYiLz48YyByPSJLNyIgcz0iNiIvPjxjIHI9Ikw3IiBzPSI2Ii8+PGMgcj0iTTciIHM9IjYiLz48YyByPSJONyIgcz0iNiIvPjxjIHI9Ik83IiBzPSI2Ii8+PGMgcj0iUDciIHM9IjYiLz48L3Jvdz48cm93IHI9IjgiIHNwYW5zPSIxOjE2IiBjdXN0b21IZWlnaHQ9IjEiIGh0PSIyNSI+PGMgcj0iQTgiIHM9IjMiPjx2PjQ8L3Y+PC9jPjxjIHI9IkI4IiBzPSIzIj48dj41NjM8L3Y+PC9jPjxjIHI9IkM4IiBzPSIzIiB0PSJzIj48dj4xNjwvdj48L2M+PGMgcj0iRDgiIHM9IjQiIHQ9InMiPjx2PjIyPC92PjwvYz48YyByPSJFOCIgcz0iNSIgdD0icyI+PHY+MTg8L3Y+PC9jPjxjIHI9IkY4IiBzPSI2Ii8+PGMgcj0iRzgiIHM9IjYiLz48YyByPSJIOCIgcz0iNiIvPjxjIHI9Ikk4IiBzPSI2Ii8+PGMgcj0iSjgiIHM9IjYiLz48YyByPSJLOCIgcz0iNiIvPjxjIHI9Ikw4IiBzPSI2Ii8+PGMgcj0iTTgiIHM9IjYiLz48YyByPSJOOCIgcz0iNiIvPjxjIHI9Ik84IiBzPSI2Ii8+PGMgcj0iUDgiIHM9IjYiLz48L3Jvdz48cm93IHI9IjkiIHNwYW5zPSIxOjE2IiBjdXN0b21IZWlnaHQ9IjEiIGh0PSIyNSI+PGMgcj0iQTkiIHM9IjciLz48YyByPSJCOSIgcz0iOCI+PHY+NTYzPC92PjwvYz48YyByPSJDOSIgcz0iOCIgdD0icyI+PHY+MTY8L3Y+PC9jPjxjIHI9IkQ5IiBzPSI0Ii8+PGMgcj0iRTkiIHM9IjUiIHQ9InMiPjx2PjE5PC92PjwvYz48YyByPSJGOSIgcz0iNiIvPjxjIHI9Ikc5IiBzPSI2Ii8+PGMgcj0iSDkiIHM9IjYiLz48YyByPSJJOSIgcz0iNiIvPjxjIHI9Iko5IiBzPSI2Ii8+PGMgcj0iSzkiIHM9IjYiLz48YyByPSJMOSIgcz0iNiIvPjxjIHI9Ik05IiBzPSI2Ii8+PGMgcj0iTjkiIHM9IjYiLz48YyByPSJPOSIgcz0iNiIvPjxjIHI9IlA5IiBzPSI2Ii8+PC9yb3c+PHJvdyByPSIxMCIgc3BhbnM9IjE6MTYiIGN1c3RvbUhlaWdodD0iMSIgaHQ9IjI1Ij48YyByPSJBMTAiIHM9IjMiPjx2PjU8L3Y+PC9jPjxjIHI9IkIxMCIgcz0iMyI+PHY+NTY0PC92PjwvYz48YyByPSJDMTAiIHM9IjMiIHQ9InMiPjx2PjE2PC92PjwvYz48YyByPSJEMTAiIHM9IjQiIHQ9InMiPjx2PjIzPC92PjwvYz48YyByPSJFMTAiIHM9IjUiIHQ9InMiPjx2PjE4PC92PjwvYz48YyByPSJGMTAiIHM9IjYiLz48YyByPSJHMTAiIHM9IjYiLz48YyByPSJIMTAiIHM9IjYiLz48YyByPSJJMTAiIHM9IjYiLz48YyByPSJKMTAiIHM9IjYiLz48YyByPSJLMTAiIHM9IjYiLz48YyByPSJMMTAiIHM9IjYiLz48YyByPSJNMTAiIHM9IjYiLz48YyByPSJOMTAiIHM9IjYiLz48YyByPSJPMTAiIHM9IjYiLz48YyByPSJQMTAiIHM9IjYiLz48L3Jvdz48cm93IHI9IjExIiBzcGFucz0iMToxNiIgY3VzdG9tSGVpZ2h0PSIxIiBodD0iMjUiPjxjIHI9IkExMSIgcz0iNyIvPjxjIHI9IkIxMSIgcz0iOCI+PHY+NTY0PC92PjwvYz48YyByPSJDMTEiIHM9IjgiIHQ9InMiPjx2PjE2PC92PjwvYz48YyByPSJEMTEiIHM9IjQiLz48YyByPSJFMTEiIHM9IjUiIHQ9InMiPjx2PjE5PC92PjwvYz48YyByPSJGMTEiIHM9IjYiLz48YyByPSJHMTEiIHM9IjYiLz48YyByPSJIMTEiIHM9IjYiLz48YyByPSJJMTEiIHM9IjYiLz48YyByPSJKMTEiIHM9IjYiLz48YyByPSJLMTEiIHM9IjYiLz48YyByPSJMMTEiIHM9IjYiLz48YyByPSJNMTEiIHM9IjYiLz48YyByPSJOMTEiIHM9IjYiLz48YyByPSJPMTEiIHM9IjYiLz48YyByPSJQMTEiIHM9IjYiLz48L3Jvdz48cm93IHI9IjEyIiBzcGFucz0iMToxNiIgY3VzdG9tSGVpZ2h0PSIxIiBodD0iMjUiPjxjIHI9IkExMiIgcz0iMyI+PHY+Njwvdj48L2M+PGMgcj0iQjEyIiBzPSIzIj48dj41NjY8L3Y+PC9jPjxjIHI9IkMxMiIgcz0iMyIgdD0icyI+PHY+MTY8L3Y+PC9jPjxjIHI9IkQxMiIgcz0iNCIgdD0icyI+PHY+MjQ8L3Y+PC9jPjxjIHI9IkUxMiIgcz0iNSIgdD0icyI+PHY+MTg8L3Y+PC9jPjxjIHI9IkYxMiIgcz0iNiIvPjxjIHI9IkcxMiIgcz0iNiIvPjxjIHI9IkgxMiIgcz0iNiIvPjxjIHI9IkkxMiIgcz0iNiIvPjxjIHI9IkoxMiIgcz0iNiIvPjxjIHI9IksxMiIgcz0iNiIvPjxjIHI9IkwxMiIgcz0iNiIvPjxjIHI9Ik0xMiIgcz0iNiIvPjxjIHI9Ik4xMiIgcz0iNiIvPjxjIHI9Ik8xMiIgcz0iNiIvPjxjIHI9IlAxMiIgcz0iNiIvPjwvcm93Pjxyb3cgcj0iMTMiIHNwYW5zPSIxOjE2IiBjdXN0b21IZWlnaHQ9IjEiIGh0PSIyNSI+PGMgcj0iQTEzIiBzPSI3Ii8+PGMgcj0iQjEzIiBzPSI4Ij48dj41NjY8L3Y+PC9jPjxjIHI9IkMxMyIgcz0iOCIgdD0icyI+PHY+MTY8L3Y+PC9jPjxjIHI9IkQxMyIgcz0iNCIvPjxjIHI9IkUxMyIgcz0iNSIgdD0icyI+PHY+MTk8L3Y+PC9jPjxjIHI9IkYxMyIgcz0iNiIvPjxjIHI9IkcxMyIgcz0iNiIvPjxjIHI9IkgxMyIgcz0iNiIvPjxjIHI9IkkxMyIgcz0iNiIvPjxjIHI9IkoxMyIgcz0iNiIvPjxjIHI9IksxMyIgcz0iNiIvPjxjIHI9IkwxMyIgcz0iNiIvPjxjIHI9Ik0xMyIgcz0iNiIvPjxjIHI9Ik4xMyIgcz0iNiIvPjxjIHI9Ik8xMyIgcz0iNiIvPjxjIHI9IlAxMyIgcz0iNiIvPjwvcm93Pjxyb3cgcj0iMTQiIHNwYW5zPSIxOjE2IiBjdXN0b21IZWlnaHQ9IjEiIGh0PSIyNSI+PGMgcj0iQTE0IiBzPSIzIj48dj43PC92PjwvYz48YyByPSJCMTQiIHM9IjMiPjx2PjU2OTwvdj48L2M+PGMgcj0iQzE0IiBzPSIzIiB0PSJzIj48dj4xNjwvdj48L2M+PGMgcj0iRDE0IiBzPSI0IiB0PSJzIj48dj4yNTwvdj48L2M+PGMgcj0iRTE0IiBzPSI1IiB0PSJzIj48dj4xODwvdj48L2M+PGMgcj0iRjE0IiBzPSI2Ii8+PGMgcj0iRzE0IiBzPSI2Ii8+PGMgcj0iSDE0IiBzPSI2Ii8+PGMgcj0iSTE0IiBzPSI2Ii8+PGMgcj0iSjE0IiBzPSI2Ii8+PGMgcj0iSzE0IiBzPSI2Ii8+PGMgcj0iTDE0IiBzPSI2Ii8+PGMgcj0iTTE0IiBzPSI2Ii8+PGMgcj0iTjE0IiBzPSI2Ii8+PGMgcj0iTzE0IiBzPSI2Ii8+PGMgcj0iUDE0IiBzPSI2Ii8+PC9yb3c+PHJvdyByPSIxNSIgc3BhbnM9IjE6MTYiIGN1c3RvbUhlaWdodD0iMSIgaHQ9IjI1Ij48YyByPSJBMTUiIHM9IjciLz48YyByPSJCMTUiIHM9IjgiPjx2PjU2OTwvdj48L2M+PGMgcj0iQzE1IiBzPSI4IiB0PSJzIj48dj4xNjwvdj48L2M+PGMgcj0iRDE1IiBzPSI0Ii8+PGMgcj0iRTE1IiBzPSI1IiB0PSJzIj48dj4xOTwvdj48L2M+PGMgcj0iRjE1IiBzPSI2Ii8+PGMgcj0iRzE1IiBzPSI2Ii8+PGMgcj0iSDE1IiBzPSI2Ii8+PGMgcj0iSTE1IiBzPSI2Ii8+PGMgcj0iSjE1IiBzPSI2Ii8+PGMgcj0iSzE1IiBzPSI2Ii8+PGMgcj0iTDE1IiBzPSI2Ii8+PGMgcj0iTTE1IiBzPSI2Ii8+PGMgcj0iTjE1IiBzPSI2Ii8+PGMgcj0iTzE1IiBzPSI2Ii8+PGMgcj0iUDE1IiBzPSI2Ii8+PC9yb3c+PHJvdyByPSIxNiIgc3BhbnM9IjE6MTYiIGN1c3RvbUhlaWdodD0iMSIgaHQ9IjI1Ij48YyByPSJBMTYiIHM9IjMiPjx2Pjg8L3Y+PC9jPjxjIHI9IkIxNiIgcz0iMyI+PHY+NTcxPC92PjwvYz48YyByPSJDMTYiIHM9IjMiIHQ9InMiPjx2PjE2PC92PjwvYz48YyByPSJEMTYiIHM9IjQiIHQ9InMiPjx2PjI2PC92PjwvYz48YyByPSJFMTYiIHM9IjUiIHQ9InMiPjx2PjE4PC92PjwvYz48YyByPSJGMTYiIHM9IjYiLz48YyByPSJHMTYiIHM9IjYiLz48YyByPSJIMTYiIHM9IjYiLz48YyByPSJJMTYiIHM9IjYiLz48YyByPSJKMTYiIHM9IjYiLz48YyByPSJLMTYiIHM9IjYiLz48YyByPSJMMTYiIHM9IjYiLz48YyByPSJNMTYiIHM9IjYiLz48YyByPSJOMTYiIHM9IjYiLz48YyByPSJPMTYiIHM9IjYiLz48YyByPSJQMTYiIHM9IjYiLz48L3Jvdz48cm93IHI9IjE3IiBzcGFucz0iMToxNiIgY3VzdG9tSGVpZ2h0PSIxIiBodD0iMjUiPjxjIHI9IkExNyIgcz0iNyIvPjxjIHI9IkIxNyIgcz0iOCI+PHY+NTcxPC92PjwvYz48YyByPSJDMTciIHM9IjgiIHQ9InMiPjx2PjE2PC92PjwvYz48YyByPSJEMTciIHM9IjQiLz48YyByPSJFMTciIHM9IjUiIHQ9InMiPjx2PjE5PC92PjwvYz48YyByPSJGMTciIHM9IjYiLz48YyByPSJHMTciIHM9IjYiLz48YyByPSJIMTciIHM9IjYiLz48YyByPSJJMTciIHM9IjYiLz48YyByPSJKMTciIHM9IjYiLz48YyByPSJLMTciIHM9IjYiLz48YyByPSJMMTciIHM9IjYiLz48YyByPSJNMTciIHM9IjYiLz48YyByPSJOMTciIHM9IjYiLz48YyByPSJPMTciIHM9IjYiLz48YyByPSJQMTciIHM9IjYiLz48L3Jvdz48cm93IHI9IjE4IiBzcGFucz0iMToxNiIgY3VzdG9tSGVpZ2h0PSIxIiBodD0iMjUiPjxjIHI9IkExOCIgcz0iMyI+PHY+OTwvdj48L2M+PGMgcj0iQjE4IiBzPSIzIj48dj44MDA8L3Y+PC9jPjxjIHI9IkMxOCIgcz0iMyIgdD0icyI+PHY+MTY8L3Y+PC9jPjxjIHI9IkQxOCIgcz0iNCIgdD0icyI+PHY+Mjc8L3Y+PC9jPjxjIHI9IkUxOCIgcz0iNSIgdD0icyI+PHY+MTg8L3Y+PC9jPjxjIHI9IkYxOCIgcz0iNiIvPjxjIHI9IkcxOCIgcz0iNiIvPjxjIHI9IkgxOCIgcz0iNiIvPjxjIHI9IkkxOCIgcz0iNiIvPjxjIHI9IkoxOCIgcz0iNiIvPjxjIHI9IksxOCIgcz0iNiIvPjxjIHI9IkwxOCIgcz0iNiIvPjxjIHI9Ik0xOCIgcz0iNiIvPjxjIHI9Ik4xOCIgcz0iNiIvPjxjIHI9Ik8xOCIgcz0iNiIvPjxjIHI9IlAxOCIgcz0iNiIvPjwvcm93Pjxyb3cgcj0iMTkiIHNwYW5zPSIxOjE2IiBjdXN0b21IZWlnaHQ9IjEiIGh0PSIyNSI+PGMgcj0iQTE5IiBzPSI3Ii8+PGMgcj0iQjE5IiBzPSI4Ij48dj44MDA8L3Y+PC9jPjxjIHI9IkMxOSIgcz0iOCIgdD0icyI+PHY+MTY8L3Y+PC9jPjxjIHI9IkQxOSIgcz0iNCIvPjxjIHI9IkUxOSIgcz0iNSIgdD0icyI+PHY+MTk8L3Y+PC9jPjxjIHI9IkYxOSIgcz0iNiIvPjxjIHI9IkcxOSIgcz0iNiIvPjxjIHI9IkgxOSIgcz0iNiIvPjxjIHI9IkkxOSIgcz0iNiIvPjxjIHI9IkoxOSIgcz0iNiIvPjxjIHI9IksxOSIgcz0iNiIvPjxjIHI9IkwxOSIgcz0iNiIvPjxjIHI9Ik0xOSIgcz0iNiIvPjxjIHI9Ik4xOSIgcz0iNiIvPjxjIHI9Ik8xOSIgcz0iNiIvPjxjIHI9IlAxOSIgcz0iNiIvPjwvcm93Pjxyb3cgcj0iMjAiIHNwYW5zPSIxOjE2IiBjdXN0b21IZWlnaHQ9IjEiIGh0PSIyNSI+PGMgcj0iQTIwIiBzPSIzIj48dj4xMDwvdj48L2M+PGMgcj0iQjIwIiBzPSIzIj48dj44MDQ8L3Y+PC9jPjxjIHI9IkMyMCIgcz0iMyIgdD0icyI+PHY+MTY8L3Y+PC9jPjxjIHI9IkQyMCIgcz0iNCIgdD0icyI+PHY+Mjg8L3Y+PC9jPjxjIHI9IkUyMCIgcz0iNSIgdD0icyI+PHY+MTg8L3Y+PC9jPjxjIHI9IkYyMCIgcz0iNiIvPjxjIHI9IkcyMCIgcz0iNiIvPjxjIHI9IkgyMCIgcz0iNiIvPjxjIHI9IkkyMCIgcz0iNiIvPjxjIHI9IkoyMCIgcz0iNiIvPjxjIHI9IksyMCIgcz0iNiIvPjxjIHI9IkwyMCIgcz0iNiIvPjxjIHI9Ik0yMCIgcz0iNiIvPjxjIHI9Ik4yMCIgcz0iNiIvPjxjIHI9Ik8yMCIgcz0iNiIvPjxjIHI9IlAyMCIgcz0iNiIvPjwvcm93Pjxyb3cgcj0iMjEiIHNwYW5zPSIxOjE2IiBjdXN0b21IZWlnaHQ9IjEiIGh0PSIyNSI+PGMgcj0iQTIxIiBzPSI3Ii8+PGMgcj0iQjIxIiBzPSI4Ij48dj44MDQ8L3Y+PC9jPjxjIHI9IkMyMSIgcz0iOCIgdD0icyI+PHY+MTY8L3Y+PC9jPjxjIHI9IkQyMSIgcz0iNCIvPjxjIHI9IkUyMSIgcz0iNSIgdD0icyI+PHY+MTk8L3Y+PC9jPjxjIHI9IkYyMSIgcz0iNiIvPjxjIHI9IkcyMSIgcz0iNiIvPjxjIHI9IkgyMSIgcz0iNiIvPjxjIHI9IkkyMSIgcz0iNiIvPjxjIHI9IkoyMSIgcz0iNiIvPjxjIHI9IksyMSIgcz0iNiIvPjxjIHI9IkwyMSIgcz0iNiIvPjxjIHI9Ik0yMSIgcz0iNiIvPjxjIHI9Ik4yMSIgcz0iNiIvPjxjIHI9Ik8yMSIgcz0iNiIvPjxjIHI9IlAyMSIgcz0iNiIvPjwvcm93Pjxyb3cgcj0iMjIiIHNwYW5zPSIxOjE2IiBjdXN0b21IZWlnaHQ9IjEiIGh0PSIyNSI+PGMgcj0iQTIyIiBzPSIzIj48dj4xMTwvdj48L2M+PGMgcj0iQjIyIiBzPSIzIj48dj44MDE8L3Y+PC9jPjxjIHI9IkMyMiIgcz0iMyIgdD0icyI+PHY+MTY8L3Y+PC9jPjxjIHI9IkQyMiIgcz0iNCIgdD0icyI+PHY+Mjk8L3Y+PC9jPjxjIHI9IkUyMiIgcz0iNSIgdD0icyI+PHY+MTg8L3Y+PC9jPjxjIHI9IkYyMiIgcz0iNiIvPjxjIHI9IkcyMiIgcz0iNiIvPjxjIHI9IkgyMiIgcz0iNiIvPjxjIHI9IkkyMiIgcz0iNiIvPjxjIHI9IkoyMiIgcz0iNiIvPjxjIHI9IksyMiIgcz0iNiIvPjxjIHI9IkwyMiIgcz0iNiIvPjxjIHI9Ik0yMiIgcz0iNiIvPjxjIHI9Ik4yMiIgcz0iNiIvPjxjIHI9Ik8yMiIgcz0iNiIvPjxjIHI9IlAyMiIgcz0iNiIvPjwvcm93Pjxyb3cgcj0iMjMiIHNwYW5zPSIxOjE2IiBjdXN0b21IZWlnaHQ9IjEiIGh0PSIyNSI+PGMgcj0iQTIzIiBzPSI3Ii8+PGMgcj0iQjIzIiBzPSI4Ij48dj44MDE8L3Y+PC9jPjxjIHI9IkMyMyIgcz0iOCIgdD0icyI+PHY+MTY8L3Y+PC9jPjxjIHI9IkQyMyIgcz0iNCIvPjxjIHI9IkUyMyIgcz0iNSIgdD0icyI+PHY+MTk8L3Y+PC9jPjxjIHI9IkYyMyIgcz0iNiIvPjxjIHI9IkcyMyIgcz0iNiIvPjxjIHI9IkgyMyIgcz0iNiIvPjxjIHI9IkkyMyIgcz0iNiIvPjxjIHI9IkoyMyIgcz0iNiIvPjxjIHI9IksyMyIgcz0iNiIvPjxjIHI9IkwyMyIgcz0iNiIvPjxjIHI9Ik0yMyIgcz0iNiIvPjxjIHI9Ik4yMyIgcz0iNiIvPjxjIHI9Ik8yMyIgcz0iNiIvPjxjIHI9IlAyMyIgcz0iNiIvPjwvcm93Pjxyb3cgcj0iMjQiIHNwYW5zPSIxOjE2IiBjdXN0b21IZWlnaHQ9IjEiIGh0PSIyNSI+PGMgcj0iQTI0IiBzPSIzIj48dj4xMjwvdj48L2M+PGMgcj0iQjI0IiBzPSIzIj48dj44MDU8L3Y+PC9jPjxjIHI9IkMyNCIgcz0iMyIgdD0icyI+PHY+MTY8L3Y+PC9jPjxjIHI9IkQyNCIgcz0iNCIgdD0icyI+PHY+MzA8L3Y+PC9jPjxjIHI9IkUyNCIgcz0iNSIgdD0icyI+PHY+MTg8L3Y+PC9jPjxjIHI9IkYyNCIgcz0iNiIvPjxjIHI9IkcyNCIgcz0iNiIvPjxjIHI9IkgyNCIgcz0iNiIvPjxjIHI9IkkyNCIgcz0iNiIvPjxjIHI9IkoyNCIgcz0iNiIvPjxjIHI9IksyNCIgcz0iNiIvPjxjIHI9IkwyNCIgcz0iNiIvPjxjIHI9Ik0yNCIgcz0iNiIvPjxjIHI9Ik4yNCIgcz0iNiIvPjxjIHI9Ik8yNCIgcz0iNiIvPjxjIHI9IlAyNCIgcz0iNiIvPjwvcm93Pjxyb3cgcj0iMjUiIHNwYW5zPSIxOjE2IiBjdXN0b21IZWlnaHQ9IjEiIGh0PSIyNSI+PGMgcj0iQTI1IiBzPSI3Ii8+PGMgcj0iQjI1IiBzPSI4Ij48dj44MDU8L3Y+PC9jPjxjIHI9IkMyNSIgcz0iOCIgdD0icyI+PHY+MTY8L3Y+PC9jPjxjIHI9IkQyNSIgcz0iNCIvPjxjIHI9IkUyNSIgcz0iNSIgdD0icyI+PHY+MTk8L3Y+PC9jPjxjIHI9IkYyNSIgcz0iNiIvPjxjIHI9IkcyNSIgcz0iNiIvPjxjIHI9IkgyNSIgcz0iNiIvPjxjIHI9IkkyNSIgcz0iNiIvPjxjIHI9IkoyNSIgcz0iNiIvPjxjIHI9IksyNSIgcz0iNiIvPjxjIHI9IkwyNSIgcz0iNiIvPjxjIHI9Ik0yNSIgcz0iNiIvPjxjIHI9Ik4yNSIgcz0iNiIvPjxjIHI9Ik8yNSIgcz0iNiIvPjxjIHI9IlAyNSIgcz0iNiIvPjwvcm93Pjxyb3cgcj0iMjYiIHNwYW5zPSIxOjE2IiBjdXN0b21IZWlnaHQ9IjEiIGh0PSIyNSI+PGMgcj0iQTI2IiBzPSIzIj48dj4xMzwvdj48L2M+PGMgcj0iQjI2IiBzPSIzIj48dj44MTE8L3Y+PC9jPjxjIHI9IkMyNiIgcz0iMyIgdD0icyI+PHY+MTY8L3Y+PC9jPjxjIHI9IkQyNiIgcz0iNCIgdD0icyI+PHY+MzE8L3Y+PC9jPjxjIHI9IkUyNiIgcz0iNSIgdD0icyI+PHY+MTg8L3Y+PC9jPjxjIHI9IkYyNiIgcz0iNiIvPjxjIHI9IkcyNiIgcz0iNiIvPjxjIHI9IkgyNiIgcz0iNiIvPjxjIHI9IkkyNiIgcz0iNiIvPjxjIHI9IkoyNiIgcz0iNiIvPjxjIHI9IksyNiIgcz0iNiIvPjxjIHI9IkwyNiIgcz0iNiIvPjxjIHI9Ik0yNiIgcz0iNiIvPjxjIHI9Ik4yNiIgcz0iNiIvPjxjIHI9Ik8yNiIgcz0iNiIvPjxjIHI9IlAyNiIgcz0iNiIvPjwvcm93Pjxyb3cgcj0iMjciIHNwYW5zPSIxOjE2IiBjdXN0b21IZWlnaHQ9IjEiIGh0PSIyNSI+PGMgcj0iQTI3IiBzPSI3Ii8+PGMgcj0iQjI3IiBzPSI4Ij48dj44MTE8L3Y+PC9jPjxjIHI9IkMyNyIgcz0iOCIgdD0icyI+PHY+MTY8L3Y+PC9jPjxjIHI9IkQyNyIgcz0iNCIvPjxjIHI9IkUyNyIgcz0iNSIgdD0icyI+PHY+MTk8L3Y+PC9jPjxjIHI9IkYyNyIgcz0iNiIvPjxjIHI9IkcyNyIgcz0iNiIvPjxjIHI9IkgyNyIgcz0iNiIvPjxjIHI9IkkyNyIgcz0iNiIvPjxjIHI9IkoyNyIgcz0iNiIvPjxjIHI9IksyNyIgcz0iNiIvPjxjIHI9IkwyNyIgcz0iNiIvPjxjIHI9Ik0yNyIgcz0iNiIvPjxjIHI9Ik4yNyIgcz0iNiIvPjxjIHI9Ik8yNyIgcz0iNiIvPjxjIHI9IlAyNyIgcz0iNiIvPjwvcm93Pjxyb3cgcj0iMjgiIHNwYW5zPSIxOjE2IiBjdXN0b21IZWlnaHQ9IjEiIGh0PSIyNSI+PGMgcj0iQTI4IiBzPSIzIj48dj4xNDwvdj48L2M+PGMgcj0iQjI4IiBzPSIzIj48dj4zMjI8L3Y+PC9jPjxjIHI9IkMyOCIgcz0iMyIgdD0icyI+PHY+MTY8L3Y+PC9jPjxjIHI9IkQyOCIgcz0iNCIgdD0icyI+PHY+MzI8L3Y+PC9jPjxjIHI9IkUyOCIgcz0iNSIgdD0icyI+PHY+MTg8L3Y+PC9jPjxjIHI9IkYyOCIgcz0iNiIvPjxjIHI9IkcyOCIgcz0iNiIvPjxjIHI9IkgyOCIgcz0iNiIvPjxjIHI9IkkyOCIgcz0iNiIvPjxjIHI9IkoyOCIgcz0iNiIvPjxjIHI9IksyOCIgcz0iNiIvPjxjIHI9IkwyOCIgcz0iNiIvPjxjIHI9Ik0yOCIgcz0iNiIvPjxjIHI9Ik4yOCIgcz0iNiIvPjxjIHI9Ik8yOCIgcz0iNiIvPjxjIHI9IlAyOCIgcz0iNiIvPjwvcm93Pjxyb3cgcj0iMjkiIHNwYW5zPSIxOjE2IiBjdXN0b21IZWlnaHQ9IjEiIGh0PSIyNSI+PGMgcj0iQTI5IiBzPSI3Ii8+PGMgcj0iQjI5IiBzPSI4Ij48dj4zMjI8L3Y+PC9jPjxjIHI9IkMyOSIgcz0iOCIgdD0icyI+PHY+MTY8L3Y+PC9jPjxjIHI9IkQyOSIgcz0iNCIvPjxjIHI9IkUyOSIgcz0iNSIgdD0icyI+PHY+MTk8L3Y+PC9jPjxjIHI9IkYyOSIgcz0iNiIvPjxjIHI9IkcyOSIgcz0iNiIvPjxjIHI9IkgyOSIgcz0iNiIvPjxjIHI9IkkyOSIgcz0iNiIvPjxjIHI9IkoyOSIgcz0iNiIvPjxjIHI9IksyOSIgcz0iNiIvPjxjIHI9IkwyOSIgcz0iNiIvPjxjIHI9Ik0yOSIgcz0iNiIvPjxjIHI9Ik4yOSIgcz0iNiIvPjxjIHI9Ik8yOSIgcz0iNiIvPjxjIHI9IlAyOSIgcz0iNiIvPjwvcm93Pjxyb3cgcj0iMzAiIHNwYW5zPSIxOjE2IiBjdXN0b21IZWlnaHQ9IjEiIGh0PSIyNSI+PGMgcj0iQTMwIiBzPSIzIj48dj4xNTwvdj48L2M+PGMgcj0iQjMwIiBzPSIzIj48dj4zMjQ8L3Y+PC9jPjxjIHI9IkMzMCIgcz0iMyIgdD0icyI+PHY+MTY8L3Y+PC9jPjxjIHI9IkQzMCIgcz0iNCIgdD0icyI+PHY+MzM8L3Y+PC9jPjxjIHI9IkUzMCIgcz0iNSIgdD0icyI+PHY+MTg8L3Y+PC9jPjxjIHI9IkYzMCIgcz0iNiIvPjxjIHI9IkczMCIgcz0iNiIvPjxjIHI9IkgzMCIgcz0iNiIvPjxjIHI9IkkzMCIgcz0iNiIvPjxjIHI9IkozMCIgcz0iNiIvPjxjIHI9IkszMCIgcz0iNiIvPjxjIHI9IkwzMCIgcz0iNiIvPjxjIHI9Ik0zMCIgcz0iNiIvPjxjIHI9Ik4zMCIgcz0iNiIvPjxjIHI9Ik8zMCIgcz0iNiIvPjxjIHI9IlAzMCIgcz0iNiIvPjwvcm93Pjxyb3cgcj0iMzEiIHNwYW5zPSIxOjE2IiBjdXN0b21IZWlnaHQ9IjEiIGh0PSIyNSI+PGMgcj0iQTMxIiBzPSI3Ii8+PGMgcj0iQjMxIiBzPSI4Ij48dj4zMjQ8L3Y+PC9jPjxjIHI9IkMzMSIgcz0iOCIgdD0icyI+PHY+MTY8L3Y+PC9jPjxjIHI9IkQzMSIgcz0iNCIvPjxjIHI9IkUzMSIgcz0iNSIgdD0icyI+PHY+MTk8L3Y+PC9jPjxjIHI9IkYzMSIgcz0iNiIvPjxjIHI9IkczMSIgcz0iNiIvPjxjIHI9IkgzMSIgcz0iNiIvPjxjIHI9IkkzMSIgcz0iNiIvPjxjIHI9IkozMSIgcz0iNiIvPjxjIHI9IkszMSIgcz0iNiIvPjxjIHI9IkwzMSIgcz0iNiIvPjxjIHI9Ik0zMSIgcz0iNiIvPjxjIHI9Ik4zMSIgcz0iNiIvPjxjIHI9Ik8zMSIgcz0iNiIvPjxjIHI9IlAzMSIgcz0iNiIvPjwvcm93Pjxyb3cgcj0iMzIiIHNwYW5zPSIxOjE2IiBjdXN0b21IZWlnaHQ9IjEiIGh0PSIyNSI+PGMgcj0iQTMyIiBzPSIzIj48dj4xNjwvdj48L2M+PGMgcj0iQjMyIiBzPSIzIj48dj4zMzg8L3Y+PC9jPjxjIHI9IkMzMiIgcz0iMyIgdD0icyI+PHY+MTY8L3Y+PC9jPjxjIHI9IkQzMiIgcz0iNCIgdD0icyI+PHY+MzQ8L3Y+PC9jPjxjIHI9IkUzMiIgcz0iNSIgdD0icyI+PHY+MTg8L3Y+PC9jPjxjIHI9IkYzMiIgcz0iNiIvPjxjIHI9IkczMiIgcz0iNiIvPjxjIHI9IkgzMiIgcz0iNiIvPjxjIHI9IkkzMiIgcz0iNiIvPjxjIHI9IkozMiIgcz0iNiIvPjxjIHI9IkszMiIgcz0iNiIvPjxjIHI9IkwzMiIgcz0iNiIvPjxjIHI9Ik0zMiIgcz0iNiIvPjxjIHI9Ik4zMiIgcz0iNiIvPjxjIHI9Ik8zMiIgcz0iNiIvPjxjIHI9IlAzMiIgcz0iNiIvPjwvcm93Pjxyb3cgcj0iMzMiIHNwYW5zPSIxOjE2IiBjdXN0b21IZWlnaHQ9IjEiIGh0PSIyNSI+PGMgcj0iQTMzIiBzPSI3Ii8+PGMgcj0iQjMzIiBzPSI4Ij48dj4zMzg8L3Y+PC9jPjxjIHI9IkMzMyIgcz0iOCIgdD0icyI+PHY+MTY8L3Y+PC9jPjxjIHI9IkQzMyIgcz0iNCIvPjxjIHI9IkUzMyIgcz0iNSIgdD0icyI+PHY+MTk8L3Y+PC9jPjxjIHI9IkYzMyIgcz0iNiIvPjxjIHI9IkczMyIgcz0iNiIvPjxjIHI9IkgzMyIgcz0iNiIvPjxjIHI9IkkzMyIgcz0iNiIvPjxjIHI9IkozMyIgcz0iNiIvPjxjIHI9IkszMyIgcz0iNiIvPjxjIHI9IkwzMyIgcz0iNiIvPjxjIHI9Ik0zMyIgcz0iNiIvPjxjIHI9Ik4zMyIgcz0iNiIvPjxjIHI9Ik8zMyIgcz0iNiIvPjxjIHI9IlAzMyIgcz0iNiIvPjwvcm93Pjxyb3cgcj0iMzQiIHNwYW5zPSIxOjE2IiBjdXN0b21IZWlnaHQ9IjEiIGh0PSIyNSI+PGMgcj0iQTM0IiBzPSIzIj48dj4xNzwvdj48L2M+PGMgcj0iQjM0IiBzPSIzIj48dj4xMjAyPC92PjwvYz48YyByPSJDMzQiIHM9IjMiIHQ9InMiPjx2PjE2PC92PjwvYz48YyByPSJEMzQiIHM9IjQiIHQ9InMiPjx2PjM1PC92PjwvYz48YyByPSJFMzQiIHM9IjUiIHQ9InMiPjx2PjE4PC92PjwvYz48YyByPSJGMzQiIHM9IjYiLz48YyByPSJHMzQiIHM9IjYiLz48YyByPSJIMzQiIHM9IjYiLz48YyByPSJJMzQiIHM9IjYiLz48YyByPSJKMzQiIHM9IjYiLz48YyByPSJLMzQiIHM9IjYiLz48YyByPSJMMzQiIHM9IjYiLz48YyByPSJNMzQiIHM9IjYiLz48YyByPSJOMzQiIHM9IjYiLz48YyByPSJPMzQiIHM9IjYiLz48YyByPSJQMzQiIHM9IjYiLz48L3Jvdz48cm93IHI9IjM1IiBzcGFucz0iMToxNiIgY3VzdG9tSGVpZ2h0PSIxIiBodD0iMjUiPjxjIHI9IkEzNSIgcz0iNyIvPjxjIHI9IkIzNSIgcz0iOCI+PHY+MTIwMjwvdj48L2M+PGMgcj0iQzM1IiBzPSI4IiB0PSJzIj48dj4xNjwvdj48L2M+PGMgcj0iRDM1IiBzPSI0Ii8+PGMgcj0iRTM1IiBzPSI1IiB0PSJzIj48dj4xOTwvdj48L2M+PGMgcj0iRjM1IiBzPSI2Ii8+PGMgcj0iRzM1IiBzPSI2Ii8+PGMgcj0iSDM1IiBzPSI2Ii8+PGMgcj0iSTM1IiBzPSI2Ii8+PGMgcj0iSjM1IiBzPSI2Ii8+PGMgcj0iSzM1IiBzPSI2Ii8+PGMgcj0iTDM1IiBzPSI2Ii8+PGMgcj0iTTM1IiBzPSI2Ii8+PGMgcj0iTjM1IiBzPSI2Ii8+PGMgcj0iTzM1IiBzPSI2Ii8+PGMgcj0iUDM1IiBzPSI2Ii8+PC9yb3c+PHJvdyByPSIzNiIgc3BhbnM9IjE6MTYiIGN1c3RvbUhlaWdodD0iMSIgaHQ9IjI1Ij48YyByPSJBMzYiIHM9IjMiPjx2PjE4PC92PjwvYz48YyByPSJCMzYiIHM9IjMiPjx2PjEyMDM8L3Y+PC9jPjxjIHI9IkMzNiIgcz0iMyIgdD0icyI+PHY+MTY8L3Y+PC9jPjxjIHI9IkQzNiIgcz0iNCIgdD0icyI+PHY+MzY8L3Y+PC9jPjxjIHI9IkUzNiIgcz0iNSIgdD0icyI+PHY+MTg8L3Y+PC9jPjxjIHI9IkYzNiIgcz0iNiIvPjxjIHI9IkczNiIgcz0iNiIvPjxjIHI9IkgzNiIgcz0iNiIvPjxjIHI9IkkzNiIgcz0iNiIvPjxjIHI9IkozNiIgcz0iNiIvPjxjIHI9IkszNiIgcz0iNiIvPjxjIHI9IkwzNiIgcz0iNiIvPjxjIHI9Ik0zNiIgcz0iNiIvPjxjIHI9Ik4zNiIgcz0iNiIvPjxjIHI9Ik8zNiIgcz0iNiIvPjxjIHI9IlAzNiIgcz0iNiIvPjwvcm93Pjxyb3cgcj0iMzciIHNwYW5zPSIxOjE2IiBjdXN0b21IZWlnaHQ9IjEiIGh0PSIyNSI+PGMgcj0iQTM3IiBzPSI3Ii8+PGMgcj0iQjM3IiBzPSI4Ij48dj4xMjAzPC92PjwvYz48YyByPSJDMzciIHM9IjgiIHQ9InMiPjx2PjE2PC92PjwvYz48YyByPSJEMzciIHM9IjQiLz48YyByPSJFMzciIHM9IjUiIHQ9InMiPjx2PjE5PC92PjwvYz48YyByPSJGMzciIHM9IjYiLz48YyByPSJHMzciIHM9IjYiLz48YyByPSJIMzciIHM9IjYiLz48YyByPSJJMzciIHM9IjYiLz48YyByPSJKMzciIHM9IjYiLz48YyByPSJLMzciIHM9IjYiLz48YyByPSJMMzciIHM9IjYiLz48YyByPSJNMzciIHM9IjYiLz48YyByPSJOMzciIHM9IjYiLz48YyByPSJPMzciIHM9IjYiLz48YyByPSJQMzciIHM9IjYiLz48L3Jvdz48cm93IHI9IjM4IiBzcGFucz0iMToxNiIgY3VzdG9tSGVpZ2h0PSIxIiBodD0iMjUiPjxjIHI9IkEzOCIgcz0iMyI+PHY+MTk8L3Y+PC9jPjxjIHI9IkIzOCIgcz0iMyI+PHY+Mjc2MDwvdj48L2M+PGMgcj0iQzM4IiBzPSIzIiB0PSJzIj48dj4xNjwvdj48L2M+PGMgcj0iRDM4IiBzPSI0IiB0PSJzIj48dj4zNzwvdj48L2M+PGMgcj0iRTM4IiBzPSI1IiB0PSJzIj48dj4xODwvdj48L2M+PGMgcj0iRjM4IiBzPSI2Ii8+PGMgcj0iRzM4IiBzPSI2Ii8+PGMgcj0iSDM4IiBzPSI2Ii8+PGMgcj0iSTM4IiBzPSI2Ii8+PGMgcj0iSjM4IiBzPSI2Ii8+PGMgcj0iSzM4IiBzPSI2Ii8+PGMgcj0iTDM4IiBzPSI2Ii8+PGMgcj0iTTM4IiBzPSI2Ii8+PGMgcj0iTjM4IiBzPSI2Ii8+PGMgcj0iTzM4IiBzPSI2Ii8+PGMgcj0iUDM4IiBzPSI2Ii8+PC9yb3c+PHJvdyByPSIzOSIgc3BhbnM9IjE6MTYiIGN1c3RvbUhlaWdodD0iMSIgaHQ9IjI1Ij48YyByPSJBMzkiIHM9IjciLz48YyByPSJCMzkiIHM9IjgiPjx2PjI3NjA8L3Y+PC9jPjxjIHI9IkMzOSIgcz0iOCIgdD0icyI+PHY+MTY8L3Y+PC9jPjxjIHI9IkQzOSIgcz0iNCIvPjxjIHI9IkUzOSIgcz0iNSIgdD0icyI+PHY+MTk8L3Y+PC9jPjxjIHI9IkYzOSIgcz0iNiIvPjxjIHI9IkczOSIgcz0iNiIvPjxjIHI9IkgzOSIgcz0iNiIvPjxjIHI9IkkzOSIgcz0iNiIvPjxjIHI9IkozOSIgcz0iNiIvPjxjIHI9IkszOSIgcz0iNiIvPjxjIHI9IkwzOSIgcz0iNiIvPjxjIHI9Ik0zOSIgcz0iNiIvPjxjIHI9Ik4zOSIgcz0iNiIvPjxjIHI9Ik8zOSIgcz0iNiIvPjxjIHI9IlAzOSIgcz0iNiIvPjwvcm93Pjwvc2hlZXREYXRhPjxzaGVldFByb3RlY3Rpb24gc2hlZXQ9InRydWUiIG9iamVjdHM9ImZhbHNlIiBzY2VuYXJpb3M9ImZhbHNlIiBmb3JtYXRDZWxscz0iZmFsc2UiIGZvcm1hdENvbHVtbnM9ImZhbHNlIiBmb3JtYXRSb3dzPSJmYWxzZSIgaW5zZXJ0Q29sdW1ucz0iZmFsc2UiIGluc2VydFJvd3M9ImZhbHNlIiBpbnNlcnRIeXBlcmxpbmtzPSJmYWxzZSIgZGVsZXRlQ29sdW1ucz0iZmFsc2UiIGRlbGV0ZVJvd3M9ImZhbHNlIiBzZWxlY3RMb2NrZWRDZWxscz0iZmFsc2UiIHNvcnQ9ImZhbHNlIiBhdXRvRmlsdGVyPSJmYWxzZSIgcGl2b3RUYWJsZXM9ImZhbHNlIiBzZWxlY3RVbmxvY2tlZENlbGxzPSJmYWxzZSIvPjxtZXJnZUNlbGxzPjxtZXJnZUNlbGwgcmVmPSJEMjpEMyIvPjxtZXJnZUNlbGwgcmVmPSJENDpENSIvPjxtZXJnZUNlbGwgcmVmPSJENjpENyIvPjxtZXJnZUNlbGwgcmVmPSJEODpEOSIvPjxtZXJnZUNlbGwgcmVmPSJEMTA6RDExIi8+PG1lcmdlQ2VsbCByZWY9IkQxMjpEMTMiLz48bWVyZ2VDZWxsIHJlZj0iRDE0OkQxNSIvPjxtZXJnZUNlbGwgcmVmPSJEMTY6RDE3Ii8+PG1lcmdlQ2VsbCByZWY9IkQxODpEMTkiLz48bWVyZ2VDZWxsIHJlZj0iRDIwOkQyMSIvPjxtZXJnZUNlbGwgcmVmPSJEMjI6RDIzIi8+PG1lcmdlQ2VsbCByZWY9IkQyNDpEMjUiLz48bWVyZ2VDZWxsIHJlZj0iRDI2OkQyNyIvPjxtZXJnZUNlbGwgcmVmPSJEMjg6RDI5Ii8+PG1lcmdlQ2VsbCByZWY9IkQzMDpEMzEiLz48bWVyZ2VDZWxsIHJlZj0iRDMyOkQzMyIvPjxtZXJnZUNlbGwgcmVmPSJEMzQ6RDM1Ii8+PG1lcmdlQ2VsbCByZWY9IkQzNjpEMzciLz48bWVyZ2VDZWxsIHJlZj0iRDM4OkQzOSIvPjwvbWVyZ2VDZWxscz48cHJpbnRPcHRpb25zIGdyaWRMaW5lcz0iZmFsc2UiIGdyaWRMaW5lc1NldD0idHJ1ZSIvPjxwYWdlTWFyZ2lucyBsZWZ0PSIiIHJpZ2h0PSIiIHRvcD0iIiBib3R0b209IiIgaGVhZGVyPSIwLjMiIGZvb3Rlcj0iMC4zIi8+PHBhZ2VTZXR1cCBwYXBlclNpemU9IjkiIG9yaWVudGF0aW9uPSJwb3J0cmFpdCIgc2NhbGU9IjEwMCIgZml0VG9IZWlnaHQ9IjEiIGZpdFRvV2lkdGg9IjEiLz48aGVhZGVyRm9vdGVyIGRpZmZlcmVudE9kZEV2ZW49ImZhbHNlIiBkaWZmZXJlbnRGaXJzdD0iZmFsc2UiIHNjYWxlV2l0aERvYz0idHJ1ZSIgYWxpZ25XaXRoTWFyZ2lucz0idHJ1ZSI+PG9kZEhlYWRlcj48L29kZEhlYWRlcj48b2RkRm9vdGVyPjwvb2RkRm9vdGVyPjxldmVuSGVhZGVyPjwvZXZlbkhlYWRlcj48ZXZlbkZvb3Rlcj48L2V2ZW5Gb290ZXI+PGZpcnN0SGVhZGVyPjwvZmlyc3RIZWFkZXI+PGZpcnN0Rm9vdGVyPjwvZmlyc3RGb290ZXI+PC9oZWFkZXJGb290ZXI+PC93b3Jrc2hlZXQ+UEsDBBQAAAAAACFKZVU2i2Ey0R0AANEdAAAYAAAAeGwvd29ya3NoZWV0cy9zaGVldDIueG1sPD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9InllcyI/Pgo8d29ya3NoZWV0IHhtbDpzcGFjZT0icHJlc2VydmUiIHhtbG5zPSJodHRwOi8vc2NoZW1hcy5vcGVueG1sZm9ybWF0cy5vcmcvc3ByZWFkc2hlZXRtbC8yMDA2L21haW4iIHhtbG5zOnI9Imh0dHA6Ly9zY2hlbWFzLm9wZW54bWxmb3JtYXRzLm9yZy9vZmZpY2VEb2N1bWVudC8yMDA2L3JlbGF0aW9uc2hpcHMiPjxzaGVldFByPjxvdXRsaW5lUHIgc3VtbWFyeUJlbG93PSIxIiBzdW1tYXJ5UmlnaHQ9IjEiLz48cGFnZVNldFVwUHIgZml0VG9QYWdlPSIxIi8+PC9zaGVldFByPjxkaW1lbnNpb24gcmVmPSJBMTpHMjAiLz48c2hlZXRWaWV3cz48c2hlZXRWaWV3IHRhYlNlbGVjdGVkPSIxIiB3b3JrYm9va1ZpZXdJZD0iMCIgc2hvd0dyaWRMaW5lcz0idHJ1ZSIgc2hvd1Jvd0NvbEhlYWRlcnM9IjEiPjxzZWxlY3Rpb24gYWN0aXZlQ2VsbD0iRzIwIiBzcXJlZj0iRzIwIi8+PC9zaGVldFZpZXc+PC9zaGVldFZpZXdzPjxzaGVldEZvcm1hdFByIGRlZmF1bHRSb3dIZWlnaHQ9IjE0LjQiIG91dGxpbmVMZXZlbFJvdz0iMCIgb3V0bGluZUxldmVsQ29sPSIwIi8+PGNvbHM+PGNvbCBtaW49IjEiIG1heD0iMSIgd2lkdGg9IjMuNTcwNTU3IiBiZXN0Rml0PSJ0cnVlIiBjdXN0b21XaWR0aD0idHJ1ZSIgc3R5bGU9IjAiLz48Y29sIG1pbj0iMiIgbWF4PSIyIiB3aWR0aD0iNS44NTU3MTMiIGJlc3RGaXQ9InRydWUiIGN1c3RvbVdpZHRoPSJ0cnVlIiBzdHlsZT0iMCIvPjxjb2wgbWluPSIzIiBtYXg9IjMiIHdpZHRoPSI3LjQyNjc1OCIgYmVzdEZpdD0idHJ1ZSIgY3VzdG9tV2lkdGg9InRydWUiIHN0eWxlPSIwIi8+PGNvbCBtaW49IjQiIG1heD0iNCIgd2lkdGg9IjMwIiBjdXN0b21XaWR0aD0idHJ1ZSIgc3R5bGU9IjAiLz48Y29sIG1pbj0iNSIgbWF4PSI1IiB3aWR0aD0iMzAiIGN1c3RvbVdpZHRoPSJ0cnVlIiBzdHlsZT0iMCIvPjxjb2wgbWluPSI2IiBtYXg9IjYiIHdpZHRoPSIyMCIgY3VzdG9tV2lkdGg9InRydWUiIHN0eWxlPSIwIi8+PGNvbCBtaW49IjciIG1heD0iNyIgd2lkdGg9IjIwIiBjdXN0b21XaWR0aD0idHJ1ZSIgc3R5bGU9IjAiLz48L2NvbHM+PHNoZWV0RGF0YT48cm93IHI9IjEiIHNwYW5zPSIxOjciIGN1c3RvbUhlaWdodD0iMSIgaHQ9IjI1Ij48YyByPSJBMSIgcz0iMiIgdD0icyI+PHY+MDwvdj48L2M+PGMgcj0iQjEiIHM9IjIiIHQ9InMiPjx2PjE8L3Y+PC9jPjxjIHI9IkMxIiBzPSIyIiB0PSJzIj48dj4yPC92PjwvYz48YyByPSJEMSIgcz0iMiIgdD0icyI+PHY+Mzwvdj48L2M+PGMgcj0iRTEiIHM9IjIiIHQ9InMiPjx2PjM4PC92PjwvYz48YyByPSJGMSIgcz0iMiIgdD0icyI+PHY+Mzk8L3Y+PC9jPjxjIHI9IkcxIiBzPSIyIiB0PSJzIj48dj40MDwvdj48L2M+PC9yb3c+PHJvdyByPSIyIiBzcGFucz0iMTo3IiBjdXN0b21IZWlnaHQ9IjEiIGh0PSIyNSI+PGMgcj0iQTIiIHM9IjEiPjx2PjE8L3Y+PC9jPjxjIHI9IkIyIiBzPSIxIj48dj41NjA8L3Y+PC9jPjxjIHI9IkMyIiBzPSIxIiB0PSJzIj48dj4xNjwvdj48L2M+PGMgcj0iRDIiIHM9IjUiIHQ9InMiPjx2PjE3PC92PjwvYz48YyByPSJFMiIgcz0iNiI+PHY+MC44NTI8L3Y+PC9jPjxjIHI9IkYyIiBzPSI2Ij48dj4wLjQyPC92PjwvYz48YyByPSJHMiIgcz0iNiI+PHY+MC4wODwvdj48L2M+PC9yb3c+PHJvdyByPSIzIiBzcGFucz0iMTo3IiBjdXN0b21IZWlnaHQ9IjEiIGh0PSIyNSI+PGMgcj0iQTMiIHM9IjEiPjx2PjI8L3Y+PC9jPjxjIHI9IkIzIiBzPSIxIj48dj41NjE8L3Y+PC9jPjxjIHI9IkMzIiBzPSIxIiB0PSJzIj48dj4xNjwvdj48L2M+PGMgcj0iRDMiIHM9IjUiIHQ9InMiPjx2PjIwPC92PjwvYz48YyByPSJFMyIgcz0iNiI+PHY+MC41NjAwMDAwMDAwMDAwMDAxPC92PjwvYz48YyByPSJGMyIgcz0iNiI+PHY+MC4yMzwvdj48L2M+PGMgcj0iRzMiIHM9IjYiPjx2PjAuMDg8L3Y+PC9jPjwvcm93Pjxyb3cgcj0iNCIgc3BhbnM9IjE6NyIgY3VzdG9tSGVpZ2h0PSIxIiBodD0iMjUiPjxjIHI9IkE0IiBzPSIxIj48dj4zPC92PjwvYz48YyByPSJCNCIgcz0iMSI+PHY+NTYyPC92PjwvYz48YyByPSJDNCIgcz0iMSIgdD0icyI+PHY+MTY8L3Y+PC9jPjxjIHI9IkQ0IiBzPSI1IiB0PSJzIj48dj4yMTwvdj48L2M+PGMgcj0iRTQiIHM9IjYiPjx2PjIuNjAyPC92PjwvYz48YyByPSJGNCIgcz0iNiI+PHY+MC40Njwvdj48L2M+PGMgcj0iRzQiIHM9IjYiPjx2PjAuNTwvdj48L2M+PC9yb3c+PHJvdyByPSI1IiBzcGFucz0iMTo3IiBjdXN0b21IZWlnaHQ9IjEiIGh0PSIyNSI+PGMgcj0iQTUiIHM9IjEiPjx2PjQ8L3Y+PC9jPjxjIHI9IkI1IiBzPSIxIj48dj41NjM8L3Y+PC9jPjxjIHI9IkM1IiBzPSIxIiB0PSJzIj48dj4xNjwvdj48L2M+PGMgcj0iRDUiIHM9IjUiIHQ9InMiPjx2PjIyPC92PjwvYz48YyByPSJFNSIgcz0iNiI+PHY+MC44NzY8L3Y+PC9jPjxjIHI9IkY1IiBzPSI2Ij48dj4wLjQ4PC92PjwvYz48YyByPSJHNSIgcz0iNiI+PHY+MC4xODwvdj48L2M+PC9yb3c+PHJvdyByPSI2IiBzcGFucz0iMTo3IiBjdXN0b21IZWlnaHQ9IjEiIGh0PSIyNSI+PGMgcj0iQTYiIHM9IjEiPjx2PjU8L3Y+PC9jPjxjIHI9IkI2IiBzPSIxIj48dj41NjQ8L3Y+PC9jPjxjIHI9IkM2IiBzPSIxIiB0PSJzIj48dj4xNjwvdj48L2M+PGMgcj0iRDYiIHM9IjUiIHQ9InMiPjx2PjIzPC92PjwvYz48YyByPSJFNiIgcz0iNiI+PHY+NC4xNDwvdj48L2M+PGMgcj0iRjYiIHM9IjYiPjx2PjEuMzk8L3Y+PC9jPjxjIHI9Ikc2IiBzPSI2Ij48dj4wLjQ1PC92PjwvYz48L3Jvdz48cm93IHI9IjciIHNwYW5zPSIxOjciIGN1c3RvbUhlaWdodD0iMSIgaHQ9IjI1Ij48YyByPSJBNyIgcz0iMSI+PHY+Njwvdj48L2M+PGMgcj0iQjciIHM9IjEiPjx2PjU2Njwvdj48L2M+PGMgcj0iQzciIHM9IjEiIHQ9InMiPjx2PjE2PC92PjwvYz48YyByPSJENyIgcz0iNSIgdD0icyI+PHY+MjQ8L3Y+PC9jPjxjIHI9IkU3IiBzPSI2Ij48dj4wLjUyODwvdj48L2M+PGMgcj0iRjciIHM9IjYiPjx2PjAuMTg8L3Y+PC9jPjxjIHI9Ikc3IiBzPSI2Ij48dj4wLjA4PC92PjwvYz48L3Jvdz48cm93IHI9IjgiIHNwYW5zPSIxOjciIGN1c3RvbUhlaWdodD0iMSIgaHQ9IjI1Ij48YyByPSJBOCIgcz0iMSI+PHY+Nzwvdj48L2M+PGMgcj0iQjgiIHM9IjEiPjx2PjU2OTwvdj48L2M+PGMgcj0iQzgiIHM9IjEiIHQ9InMiPjx2PjE2PC92PjwvYz48YyByPSJEOCIgcz0iNSIgdD0icyI+PHY+MjU8L3Y+PC9jPjxjIHI9IkU4IiBzPSI2Ij48dj4wLjU5Mjwvdj48L2M+PGMgcj0iRjgiIHM9IjYiPjx2PjAuNDM8L3Y+PC9jPjxjIHI9Ikc4IiBzPSI2Ij48dj4wLjE4PC92PjwvYz48L3Jvdz48cm93IHI9IjkiIHNwYW5zPSIxOjciIGN1c3RvbUhlaWdodD0iMSIgaHQ9IjI1Ij48YyByPSJBOSIgcz0iMSI+PHY+ODwvdj48L2M+PGMgcj0iQjkiIHM9IjEiPjx2PjU3MTwvdj48L2M+PGMgcj0iQzkiIHM9IjEiIHQ9InMiPjx2PjE2PC92PjwvYz48YyByPSJEOSIgcz0iNSIgdD0icyI+PHY+MjY8L3Y+PC9jPjxjIHI9IkU5IiBzPSI2Ij48dj4wLjc2Njwvdj48L2M+PGMgcj0iRjkiIHM9IjYiPjx2PjAuMzk8L3Y+PC9jPjxjIHI9Ikc5IiBzPSI2Ij48dj4wLjA4PC92PjwvYz48L3Jvdz48cm93IHI9IjEwIiBzcGFucz0iMTo3IiBjdXN0b21IZWlnaHQ9IjEiIGh0PSIyNSI+PGMgcj0iQTEwIiBzPSIxIj48dj45PC92PjwvYz48YyByPSJCMTAiIHM9IjEiPjx2PjgwMDwvdj48L2M+PGMgcj0iQzEwIiBzPSIxIiB0PSJzIj48dj4xNjwvdj48L2M+PGMgcj0iRDEwIiBzPSI1IiB0PSJzIj48dj4yNzwvdj48L2M+PGMgcj0iRTEwIiBzPSI2Ij48dj4wLjU1Njwvdj48L2M+PGMgcj0iRjEwIiBzPSI2Ij48dj4wLjM0PC92PjwvYz48YyByPSJHMTAiIHM9IjYiPjx2PjAuMDg1MDAwMDAwMDAwMDAwMDE8L3Y+PC9jPjwvcm93Pjxyb3cgcj0iMTEiIHNwYW5zPSIxOjciIGN1c3RvbUhlaWdodD0iMSIgaHQ9IjI1Ij48YyByPSJBMTEiIHM9IjEiPjx2PjEwPC92PjwvYz48YyByPSJCMTEiIHM9IjEiPjx2PjgwNDwvdj48L2M+PGMgcj0iQzExIiBzPSIxIiB0PSJzIj48dj4xNjwvdj48L2M+PGMgcj0iRDExIiBzPSI1IiB0PSJzIj48dj4yODwvdj48L2M+PGMgcj0iRTExIiBzPSI2Ij48dj4wLjcyNDwvdj48L2M+PGMgcj0iRjExIiBzPSI2Ij48dj4wLjI2NTwvdj48L2M+PGMgcj0iRzExIiBzPSI2Ij48dj4wLjA4PC92PjwvYz48L3Jvdz48cm93IHI9IjEyIiBzcGFucz0iMTo3IiBjdXN0b21IZWlnaHQ9IjEiIGh0PSIyNSI+PGMgcj0iQTEyIiBzPSIxIj48dj4xMTwvdj48L2M+PGMgcj0iQjEyIiBzPSIxIj48dj44MDE8L3Y+PC9jPjxjIHI9IkMxMiIgcz0iMSIgdD0icyI+PHY+MTY8L3Y+PC9jPjxjIHI9IkQxMiIgcz0iNSIgdD0icyI+PHY+Mjk8L3Y+PC9jPjxjIHI9IkUxMiIgcz0iNiI+PHY+MC4yNDg8L3Y+PC9jPjxjIHI9IkYxMiIgcz0iNiI+PHY+MC4xODU8L3Y+PC9jPjxjIHI9IkcxMiIgcz0iNiI+PHY+MC4wODwvdj48L2M+PC9yb3c+PHJvdyByPSIxMyIgc3BhbnM9IjE6NyIgY3VzdG9tSGVpZ2h0PSIxIiBodD0iMjUiPjxjIHI9IkExMyIgcz0iMSI+PHY+MTI8L3Y+PC9jPjxjIHI9IkIxMyIgcz0iMSI+PHY+ODA1PC92PjwvYz48YyByPSJDMTMiIHM9IjEiIHQ9InMiPjx2PjE2PC92PjwvYz48YyByPSJEMTMiIHM9IjUiIHQ9InMiPjx2PjMwPC92PjwvYz48YyByPSJFMTMiIHM9IjYiPjx2PjAuODQ4PC92PjwvYz48YyByPSJGMTMiIHM9IjYiPjx2PjAuNDY8L3Y+PC9jPjxjIHI9IkcxMyIgcz0iNiI+PHY+MC4xODwvdj48L2M+PC9yb3c+PHJvdyByPSIxNCIgc3BhbnM9IjE6NyIgY3VzdG9tSGVpZ2h0PSIxIiBodD0iMjUiPjxjIHI9IkExNCIgcz0iMSI+PHY+MTM8L3Y+PC9jPjxjIHI9IkIxNCIgcz0iMSI+PHY+ODExPC92PjwvYz48YyByPSJDMTQiIHM9IjEiIHQ9InMiPjx2PjE2PC92PjwvYz48YyByPSJEMTQiIHM9IjUiIHQ9InMiPjx2PjMxPC92PjwvYz48YyByPSJFMTQiIHM9IjYiPjx2PjIuNjwvdj48L2M+PGMgcj0iRjE0IiBzPSI2Ij48dj4wLjU5NTwvdj48L2M+PGMgcj0iRzE0IiBzPSI2Ij48dj4wLjE4PC92PjwvYz48L3Jvdz48cm93IHI9IjE1IiBzcGFucz0iMTo3IiBjdXN0b21IZWlnaHQ9IjEiIGh0PSIyNSI+PGMgcj0iQTE1IiBzPSIxIj48dj4xNDwvdj48L2M+PGMgcj0iQjE1IiBzPSIxIj48dj4zMjI8L3Y+PC9jPjxjIHI9IkMxNSIgcz0iMSIgdD0icyI+PHY+MTY8L3Y+PC9jPjxjIHI9IkQxNSIgcz0iNSIgdD0icyI+PHY+MzI8L3Y+PC9jPjxjIHI9IkUxNSIgcz0iNiI+PHY+Mi43MTQ8L3Y+PC9jPjxjIHI9IkYxNSIgcz0iNiI+PHY+MC44NDwvdj48L2M+PGMgcj0iRzE1IiBzPSI2Ij48dj4wLjU8L3Y+PC9jPjwvcm93Pjxyb3cgcj0iMTYiIHNwYW5zPSIxOjciIGN1c3RvbUhlaWdodD0iMSIgaHQ9IjI1Ij48YyByPSJBMTYiIHM9IjEiPjx2PjE1PC92PjwvYz48YyByPSJCMTYiIHM9IjEiPjx2PjMyNDwvdj48L2M+PGMgcj0iQzE2IiBzPSIxIiB0PSJzIj48dj4xNjwvdj48L2M+PGMgcj0iRDE2IiBzPSI1IiB0PSJzIj48dj4zMzwvdj48L2M+PGMgcj0iRTE2IiBzPSI2Ij48dj4wLjU3PC92PjwvYz48YyByPSJGMTYiIHM9IjYiPjx2PjAuMjc1PC92PjwvYz48YyByPSJHMTYiIHM9IjYiPjx2PjAuMDg8L3Y+PC9jPjwvcm93Pjxyb3cgcj0iMTciIHNwYW5zPSIxOjciIGN1c3RvbUhlaWdodD0iMSIgaHQ9IjI1Ij48YyByPSJBMTciIHM9IjEiPjx2PjE2PC92PjwvYz48YyByPSJCMTciIHM9IjEiPjx2PjMzODwvdj48L2M+PGMgcj0iQzE3IiBzPSIxIiB0PSJzIj48dj4xNjwvdj48L2M+PGMgcj0iRDE3IiBzPSI1IiB0PSJzIj48dj4zNDwvdj48L2M+PGMgcj0iRTE3IiBzPSI2Ij48dj4wLjM5ODwvdj48L2M+PGMgcj0iRjE3IiBzPSI2Ij48dj4wLjE2PC92PjwvYz48YyByPSJHMTciIHM9IjYiPjx2PjAuODU8L3Y+PC9jPjwvcm93Pjxyb3cgcj0iMTgiIHNwYW5zPSIxOjciIGN1c3RvbUhlaWdodD0iMSIgaHQ9IjI1Ij48YyByPSJBMTgiIHM9IjEiPjx2PjE3PC92PjwvYz48YyByPSJCMTgiIHM9IjEiPjx2PjEyMDI8L3Y+PC9jPjxjIHI9IkMxOCIgcz0iMSIgdD0icyI+PHY+MTY8L3Y+PC9jPjxjIHI9IkQxOCIgcz0iNSIgdD0icyI+PHY+MzU8L3Y+PC9jPjxjIHI9IkUxOCIgcz0iNiI+PHY+MC41MTwvdj48L2M+PGMgcj0iRjE4IiBzPSI2Ij48dj4wLjM1PC92PjwvYz48YyByPSJHMTgiIHM9IjYiPjx2PjAuODU8L3Y+PC9jPjwvcm93Pjxyb3cgcj0iMTkiIHNwYW5zPSIxOjciIGN1c3RvbUhlaWdodD0iMSIgaHQ9IjI1Ij48YyByPSJBMTkiIHM9IjEiPjx2PjE4PC92PjwvYz48YyByPSJCMTkiIHM9IjEiPjx2PjEyMDM8L3Y+PC9jPjxjIHI9IkMxOSIgcz0iMSIgdD0icyI+PHY+MTY8L3Y+PC9jPjxjIHI9IkQxOSIgcz0iNSIgdD0icyI+PHY+MzY8L3Y+PC9jPjxjIHI9IkUxOSIgcz0iNiI+PHY+MC40MjQ8L3Y+PC9jPjxjIHI9IkYxOSIgcz0iNiI+PHY+MC4xODwvdj48L2M+PGMgcj0iRzE5IiBzPSI2Ij48dj4wLjg8L3Y+PC9jPjwvcm93Pjxyb3cgcj0iMjAiIHNwYW5zPSIxOjciIGN1c3RvbUhlaWdodD0iMSIgaHQ9IjI1Ij48YyByPSJBMjAiIHM9IjEiPjx2PjE5PC92PjwvYz48YyByPSJCMjAiIHM9IjEiPjx2PjI3NjA8L3Y+PC9jPjxjIHI9IkMyMCIgcz0iMSIgdD0icyI+PHY+MTY8L3Y+PC9jPjxjIHI9IkQyMCIgcz0iNSIgdD0icyI+PHY+Mzc8L3Y+PC9jPjxjIHI9IkUyMCIgcz0iNiI+PHY+MC40ODwvdj48L2M+PGMgcj0iRjIwIiBzPSI2Ij48dj4wLjM8L3Y+PC9jPjxjIHI9IkcyMCIgcz0iNiI+PHY+MC4wODwvdj48L2M+PC9yb3c+PC9zaGVldERhdGE+PHNoZWV0UHJvdGVjdGlvbiBzaGVldD0idHJ1ZSIgb2JqZWN0cz0iZmFsc2UiIHNjZW5hcmlvcz0iZmFsc2UiIGZvcm1hdENlbGxzPSJmYWxzZSIgZm9ybWF0Q29sdW1ucz0iZmFsc2UiIGZvcm1hdFJvd3M9ImZhbHNlIiBpbnNlcnRDb2x1bW5zPSJmYWxzZSIgaW5zZXJ0Um93cz0iZmFsc2UiIGluc2VydEh5cGVybGlua3M9ImZhbHNlIiBkZWxldGVDb2x1bW5zPSJmYWxzZSIgZGVsZXRlUm93cz0iZmFsc2UiIHNlbGVjdExvY2tlZENlbGxzPSJmYWxzZSIgc29ydD0iZmFsc2UiIGF1dG9GaWx0ZXI9ImZhbHNlIiBwaXZvdFRhYmxlcz0iZmFsc2UiIHNlbGVjdFVubG9ja2VkQ2VsbHM9ImZhbHNlIi8+PHByaW50T3B0aW9ucyBncmlkTGluZXM9ImZhbHNlIiBncmlkTGluZXNTZXQ9InRydWUiLz48cGFnZU1hcmdpbnMgbGVmdD0iIiByaWdodD0iIiB0b3A9IiIgYm90dG9tPSIiIGhlYWRlcj0iMC4zIiBmb290ZXI9IjAuMyIvPjxwYWdlU2V0dXAgcGFwZXJTaXplPSI5IiBvcmllbnRhdGlvbj0icG9ydHJhaXQiIHNjYWxlPSIxMDAiIGZpdFRvSGVpZ2h0PSIxIiBmaXRUb1dpZHRoPSIxIi8+PGhlYWRlckZvb3RlciBkaWZmZXJlbnRPZGRFdmVuPSJmYWxzZSIgZGlmZmVyZW50Rmlyc3Q9ImZhbHNlIiBzY2FsZVdpdGhEb2M9InRydWUiIGFsaWduV2l0aE1hcmdpbnM9InRydWUiPjxvZGRIZWFkZXI+PC9vZGRIZWFkZXI+PG9kZEZvb3Rlcj48L29kZEZvb3Rlcj48ZXZlbkhlYWRlcj48L2V2ZW5IZWFkZXI+PGV2ZW5Gb290ZXI+PC9ldmVuRm9vdGVyPjxmaXJzdEhlYWRlcj48L2ZpcnN0SGVhZGVyPjxmaXJzdEZvb3Rlcj48L2ZpcnN0Rm9vdGVyPjwvaGVhZGVyRm9vdGVyPjwvd29ya3NoZWV0PlBLAwQUAAAAAAAhSmVVzUtSIo0AAACNAAAAIwAAAHhsL3dvcmtzaGVldHMvX3JlbHMvc2hlZXQxLnhtbC5yZWxzPD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9InllcyI/Pgo8UmVsYXRpb25zaGlwcyB4bWxucz0iaHR0cDovL3NjaGVtYXMub3BlbnhtbGZvcm1hdHMub3JnL3BhY2thZ2UvMjAwNi9yZWxhdGlvbnNoaXBzIi8+UEsDBBQAAAAAACFKZVXNS1IijQAAAI0AAAAjAAAAeGwvd29ya3NoZWV0cy9fcmVscy9zaGVldDIueG1sLnJlbHM8P3htbCB2ZXJzaW9uPSIxLjAiIGVuY29kaW5nPSJVVEYtOCIgc3RhbmRhbG9uZT0ieWVzIj8+CjxSZWxhdGlvbnNoaXBzIHhtbG5zPSJodHRwOi8vc2NoZW1hcy5vcGVueG1sZm9ybWF0cy5vcmcvcGFja2FnZS8yMDA2L3JlbGF0aW9uc2hpcHMiLz5QSwECFAAUAAAAAAAhSmVVatIMY3gFAAB4BQAAEwAAAAAAAAAAAAAAAAAAAAAAW0NvbnRlbnRfVHlwZXNdLnhtbFBLAQIUABQAAAAAACFKZVUXtjc4SwIAAEsCAAALAAAAAAAAAAAAAAAAAKkFAABfcmVscy8ucmVsc1BLAQIUABQAAAAAACFKZVX+vpGSRgMAAEYDAAAaAAAAAAAAAAAAAAAAAB0IAAB4bC9fcmVscy93b3JrYm9vay54bWwucmVsc1BLAQIUABQAAAAAACFKZVXAll4jZgMAAGYDAAAQAAAAAAAAAAAAAAAAAJsLAABkb2NQcm9wcy9hcHAueG1sUEsBAhQAFAAAAAAAIUplVZ2Db818AwAAfAMAABEAAAAAAAAAAAAAAAAALw8AAGRvY1Byb3BzL2NvcmUueG1sUEsBAhQAFAAAAAAAIUplVXORe1mmGwAAphsAABMAAAAAAAAAAAAAAAAA2hIAAHhsL3RoZW1lL3RoZW1lMS54bWxQSwECFAAUAAAAAAAhSmVVFKryjicFAAAnBQAAFAAAAAAAAAAAAAAAAACxLgAAeGwvc2hhcmVkU3RyaW5ncy54bWxQSwECFAAUAAAAAAAhSmVVEW5uwToPAAA6DwAADQAAAAAAAAAAAAAAAAAKNAAAeGwvc3R5bGVzLnhtbFBLAQIUABQAAAAAACFKZVX0jzdjEAMAABADAAAPAAAAAAAAAAAAAAAAAG9DAAB4bC93b3JrYm9vay54bWxQSwECFAAUAAAAAAAhSmVVx1mlPINKAACDSgAAGAAAAAAAAAAAAAAAAACsRgAAeGwvd29ya3NoZWV0cy9zaGVldDEueG1sUEsBAhQAFAAAAAAAIUplVTaLYTLRHQAA0R0AABgAAAAAAAAAAAAAAAAAZZEAAHhsL3dvcmtzaGVldHMvc2hlZXQyLnhtbFBLAQIUABQAAAAAACFKZVXNS1IijQAAAI0AAAAjAAAAAAAAAAAAAAAAAGyvAAB4bC93b3Jrc2hlZXRzL19yZWxzL3NoZWV0MS54bWwucmVsc1BLAQIUABQAAAAAACFKZVXNS1IijQAAAI0AAAAjAAAAAAAAAAAAAAAAADqwAAB4bC93b3Jrc2hlZXRzL19yZWxzL3NoZWV0Mi54bWwucmVsc1BLBQYAAAAADQANAGgDAAAIsQAAAAA=`

// ── buildNeracaXlsx: inject nilai data ke template ────────────────────────────
// SYNC function — tidak perlu async karena template sudah STORE ZIP
// Ambil sheet1.xml + sheet2.xml verbatim dari template, inject nilai numerik,
// repack ZIP. Semua style/merge/sharedStrings/theme dari template dipertahankan.
function buildNeracaXlsx(rows: any[], tanggal: string): Uint8Array {
  const NERACA_ORDER = [399,390,382,391,376,373,395,375,366,910,911,385,913,915,920,917,918,919,372]
  const UNIT_META: Record<number,{id:number,ss:number,maks:number}> = {
    399:{id:560,ss:17,maks:0.08},
    390:{id:561,ss:20,maks:0.08},
    382:{id:562,ss:21,maks:0.38},
    391:{id:563,ss:22,maks:0.09},
    376:{id:564,ss:23,maks:0.40},
    373:{id:566,ss:24,maks:0.09},
    395:{id:569,ss:25,maks:0.18},
    375:{id:571,ss:26,maks:0.17},
    366:{id:800,ss:27,maks:0.09},
    910:{id:804,ss:28,maks:0.08},
    911:{id:801,ss:29,maks:0.08},
    385:{id:805,ss:30,maks:0.16},
    913:{id:811,ss:31,maks:0.16},
    915:{id:322,ss:32,maks:0.17},
    920:{id:324,ss:33,maks:0.08},
    917:{id:338,ss:34,maks:0.085},
    918:{id:1202,ss:35,maks:0.085},
    919:{id:1203,ss:36,maks:0.08},
    372:{id:2760,ss:37,maks:0.08},
  }
  const rowMap: Record<number,any> = {}
  rows.forEach(r => rowMap[r.kode_unit]=r)
  const sorted = NERACA_ORDER.filter(ku=>rowMap[ku]).map(ku=>rowMap[ku])
  rows.forEach(r=>{ if(!NERACA_ORDER.includes(r.kode_unit)) sorted.push(r) })
  const toMW = (kw:number|null) => kw==null?null:+(Math.round(kw)/1000).toFixed(3)

  // ── Load template STORE ZIP → ambil sheet1.xml + sheet2.xml ──────────────
  const templateZip = b64ToU8(NERACA_TEMPLATE_B64)
  const parsed = _zipParse(templateZip)
  const dec = new TextDecoder()

  // Ambil XML asli dari template (STORE = tidak perlu inflate)
  const e1 = parsed.get('xl/worksheets/sheet1.xml')
  const e2 = parsed.get('xl/worksheets/sheet2.xml')
  if (!e1 || !e2) throw new Error('Template entries not found')
  let sheet1Xml = dec.decode(e1)
  let sheet2Xml = dec.decode(e2)

  // Helper: inject nilai numerik ke sel tertentu
  // Template cells empty: <c r="F2" s="6"/>  atau  <c r="F2" s="6"><v>old</v></c>
  function injectNum(xml: string, cellRef: string, val: number|null): string {
    if (val === null) return xml
    const escaped = cellRef.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // self-closing → dengan value
    xml = xml.replace(new RegExp(`(<c r="${escaped}"[^>]*?)/>`, 'g'), `$1><v>${val}</v></c>`)
    // ganti value lama
    xml = xml.replace(new RegExp(`(<c r="${escaped}"[^>]*>)<v>[^<]*</v></c>`, 'g'), `$1<v>${val}</v></c>`)
    return xml
  }

  // ── Patch sheet1.xml: F=DMP, H=Beban Puncak per baris ────────────────────
  sorted.forEach((r, i) => {
    const rSiang = 2 + i * 2
    const rMalam = 2 + i * 2 + 1
    const dmp = toMW(r.dm_pasok != null ? r.dm_pasok : r.dm_terpasang)
    const bpS = toMW(r.beban_puncak_siang)
    const bpM = toMW(r.beban_puncak_malam)
    sheet1Xml = injectNum(sheet1Xml, `F${rSiang}`, dmp)
    sheet1Xml = injectNum(sheet1Xml, `F${rMalam}`, dmp)
    sheet1Xml = injectNum(sheet1Xml, `H${rSiang}`, bpS)
    sheet1Xml = injectNum(sheet1Xml, `H${rMalam}`, bpM)
  })

  // ── Patch sheet2.xml: E=DTP, F=DMN, G=MAKS per baris ────────────────────
  sorted.forEach((r, i) => {
    const meta = UNIT_META[r.kode_unit] ?? null
    const rn   = i + 2
    const dtp  = toMW(r.dm_terpasang)
    const dmn  = toMW(r.dm_pasok != null ? r.dm_pasok : r.dm_terpasang)
    const maks = meta ? meta.maks : null
    sheet2Xml = injectNum(sheet2Xml, `E${rn}`, dtp)
    sheet2Xml = injectNum(sheet2Xml, `F${rn}`, dmn)
    sheet2Xml = injectNum(sheet2Xml, `G${rn}`, maks)
  })

  // ── Repack ZIP: patch sheet1+sheet2, semua file lain dari template ────────
  const enc = new TextEncoder()
  const patches = new Map<string,Uint8Array>([
    ['xl/worksheets/sheet1.xml', enc.encode(sheet1Xml)],
    ['xl/worksheets/sheet2.xml', enc.encode(sheet2Xml)],
  ])
  return zipRepack(templateZip, patches)
}

app.get('/api/download-neraca-excel', async (c) => {
  try {
    const db      = c.env.DB
    const tanggal = c.req.query('tanggal') || new Date().toISOString().split('T')[0]

    // Hitung H-1
    const tglDate = new Date(tanggal); tglDate.setDate(tglDate.getDate()-1)
    const tanggalH1 = tglDate.toISOString().split('T')[0]

    const units = await db.prepare(`SELECT DISTINCT kode_unit, nama_unit FROM mesin_cache ORDER BY nama_unit`).all<{kode_unit:number,nama_unit:string}>()
    const terpasangRows = await db.prepare(`SELECT kode_unit, SUM(terpasang) as dm_terpasang FROM mesin_cache WHERE terpasang IS NOT NULL GROUP BY kode_unit`).all<{kode_unit:number,dm_terpasang:number}>()
    const terpasangMap: Record<number,number> = {}
    for (const r of terpasangRows.results) terpasangMap[r.kode_unit] = Math.round(r.dm_terpasang||0)

    const monRows = await db.prepare(`
      SELECT mc.kode_unit,
        SUM(CASE WHEN (CAST(dm.jam AS INTEGER)>=18 OR CAST(dm.jam AS INTEGER)<=5) AND dm.status_mesin IN ('Operasi','Standby') THEN COALESCE(dm.daya_mampu,0) ELSE 0 END) as dm_pasok,
        SUM(CASE WHEN (CAST(dm.jam AS INTEGER)>=6 AND CAST(dm.jam AS INTEGER)<=17) AND dm.status_mesin='Operasi' THEN COALESCE(dm.beban,0) ELSE 0 END) as beban_puncak_siang,
        SUM(CASE WHEN (CAST(dm.jam AS INTEGER)>=18 OR CAST(dm.jam AS INTEGER)<=5) AND dm.status_mesin='Operasi' THEN COALESCE(dm.beban,0) ELSE 0 END) as beban_puncak_malam,
        COUNT(CASE WHEN CAST(dm.jam AS INTEGER)>=18 OR CAST(dm.jam AS INTEGER)<=5 THEN 1 END) as cnt_malam
      FROM data_monitoring dm JOIN mesin_cache mc ON dm.mesin_id=mc.id_mesin
      WHERE dm.tanggal=? GROUP BY mc.kode_unit
    `).bind(tanggal).all<{kode_unit:number,dm_pasok:number,beban_puncak_siang:number,beban_puncak_malam:number,cnt_malam:number}>()
    const monMap: Record<number,any> = {}
    for (const r of monRows.results) monMap[r.kode_unit] = {
      dm_pasok: Math.round(r.dm_pasok||0),
      beban_puncak_siang: Math.round(r.beban_puncak_siang||0),
      beban_puncak_malam: Math.round(r.beban_puncak_malam||0),
      has_malam: (r.cnt_malam||0)>0
    }

    const h1Rows = await db.prepare(`
      SELECT mc.kode_unit,
        SUM(CASE WHEN dm.status_mesin IN ('Operasi','Standby') AND (CAST(dm.jam AS INTEGER)>=18 OR CAST(dm.jam AS INTEGER)<=5) THEN COALESCE(dm.daya_mampu,0) ELSE 0 END) as dm_pasok_h1
      FROM data_monitoring dm JOIN mesin_cache mc ON dm.mesin_id=mc.id_mesin
      WHERE dm.tanggal=? GROUP BY mc.kode_unit
    `).bind(tanggalH1).all<{kode_unit:number,dm_pasok_h1:number}>()
    const h1Map: Record<number,number> = {}
    for (const r of h1Rows.results) h1Map[r.kode_unit] = Math.round(r.dm_pasok_h1||0)

    const rows = units.results.map(u => {
      const mon = monMap[u.kode_unit]
      const hasMalam = mon?.has_malam ?? false
      const dmn = hasMalam ? (mon?.dm_pasok ?? null) : (h1Map[u.kode_unit] ?? null)
      return {
        kode_unit: u.kode_unit,
        nama_unit: u.nama_unit,
        dm_terpasang: terpasangMap[u.kode_unit] ?? null,
        dm_pasok: dmn,
        beban_puncak_siang: mon?.beban_puncak_siang ?? null,
        beban_puncak_malam: mon?.beban_puncak_malam ?? null,
      }
    })

    const xlsxBytes = buildNeracaXlsx(rows, tanggal)
    const tglP = tanggal.split('-')
    const fileName = `UID KSKT ${tglP[2]}.${tglP[1]}.${tglP[0]}.xlsx`

    return new Response(xlsxBytes, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': String(xlsxBytes.length),
        'Cache-Control': 'no-cache'
      }
    })
  } catch(e:any) { return c.json({ error: String(e), stack: (e as any)?.stack?.substring(0,500) }, 500) }
})

// Endpoint /api/xlsx — serve langsung (tanpa redirect) agar browser langsung download
app.get('/api/xlsx', async (c) => {
  try {
    const db      = c.env.DB
    const tanggal = c.req.query('tanggal') || new Date().toISOString().split('T')[0]
    const tglDate = new Date(tanggal); tglDate.setDate(tglDate.getDate()-1)
    const tanggalH1 = tglDate.toISOString().split('T')[0]
    const units = await db.prepare(`SELECT DISTINCT kode_unit, nama_unit FROM mesin_cache ORDER BY nama_unit`).all<{kode_unit:number,nama_unit:string}>()
    const terpasangRows = await db.prepare(`SELECT kode_unit, SUM(terpasang) as dm_terpasang FROM mesin_cache WHERE terpasang IS NOT NULL GROUP BY kode_unit`).all<{kode_unit:number,dm_terpasang:number}>()
    const terpasangMap: Record<number,number> = {}
    for (const r of terpasangRows.results) terpasangMap[r.kode_unit] = Math.round(r.dm_terpasang||0)
    const monRows = await db.prepare(`
      SELECT mc.kode_unit,
        SUM(CASE WHEN (CAST(dm.jam AS INTEGER)>=18 OR CAST(dm.jam AS INTEGER)<=5) AND dm.status_mesin IN ('Operasi','Standby') THEN COALESCE(dm.daya_mampu,0) ELSE 0 END) as dm_pasok,
        SUM(CASE WHEN (CAST(dm.jam AS INTEGER)>=6 AND CAST(dm.jam AS INTEGER)<=17) AND dm.status_mesin='Operasi' THEN COALESCE(dm.beban,0) ELSE 0 END) as beban_puncak_siang,
        SUM(CASE WHEN (CAST(dm.jam AS INTEGER)>=18 OR CAST(dm.jam AS INTEGER)<=5) AND dm.status_mesin='Operasi' THEN COALESCE(dm.beban,0) ELSE 0 END) as beban_puncak_malam,
        COUNT(CASE WHEN CAST(dm.jam AS INTEGER)>=18 OR CAST(dm.jam AS INTEGER)<=5 THEN 1 END) as cnt_malam
      FROM data_monitoring dm JOIN mesin_cache mc ON dm.mesin_id=mc.id_mesin
      WHERE dm.tanggal=? GROUP BY mc.kode_unit
    `).bind(tanggal).all<{kode_unit:number,dm_pasok:number,beban_puncak_siang:number,beban_puncak_malam:number,cnt_malam:number}>()
    const monMap: Record<number,any> = {}
    for (const r of monRows.results) monMap[r.kode_unit] = {
      dm_pasok: Math.round(r.dm_pasok||0),
      beban_puncak_siang: Math.round(r.beban_puncak_siang||0),
      beban_puncak_malam: Math.round(r.beban_puncak_malam||0),
      has_malam: (r.cnt_malam||0)>0
    }
    const h1Rows = await db.prepare(`
      SELECT mc.kode_unit,
        SUM(CASE WHEN dm.status_mesin IN ('Operasi','Standby') AND (CAST(dm.jam AS INTEGER)>=18 OR CAST(dm.jam AS INTEGER)<=5) THEN COALESCE(dm.daya_mampu,0) ELSE 0 END) as dm_pasok_h1
      FROM data_monitoring dm JOIN mesin_cache mc ON dm.mesin_id=mc.id_mesin
      WHERE dm.tanggal=? GROUP BY mc.kode_unit
    `).bind(tanggalH1).all<{kode_unit:number,dm_pasok_h1:number}>()
    const h1Map: Record<number,number> = {}
    for (const r of h1Rows.results) h1Map[r.kode_unit] = Math.round(r.dm_pasok_h1||0)
    const rows = units.results.map(u => {
      const mon = monMap[u.kode_unit]
      const hasMalam = mon?.has_malam ?? false
      const dmn = hasMalam ? (mon?.dm_pasok ?? null) : (h1Map[u.kode_unit] ?? null)
      return { kode_unit: u.kode_unit, nama_unit: u.nama_unit, dm_terpasang: terpasangMap[u.kode_unit] ?? null, dm_pasok: dmn, beban_puncak_siang: mon?.beban_puncak_siang ?? null, beban_puncak_malam: mon?.beban_puncak_malam ?? null }
    })
    const xlsxBytes = buildNeracaXlsx(rows, tanggal)
    const tglP = tanggal.split('-')
    const fileName = `UID KSKT ${tglP[2]}.${tglP[1]}.${tglP[0]}.xlsx`
    return new Response(xlsxBytes, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': String(xlsxBytes.length),
        'Cache-Control': 'no-store'
      }
    })
  } catch(e:any) { return c.json({ error: String(e), stack: (e as any)?.stack?.substring(0,500) }, 500) }
})

// ===========================================================
// DIAGNOSTIC: test atob + _zipParse di CF Workers runtime
// GET /api/xlsx-diag
// ===========================================================
app.get('/api/xlsx-diag', async (c) => {
  try {
    const steps: string[] = []
    // Step 1: atob test
    steps.push(`b64 length: ${NERACA_TEMPLATE_B64.length}`)
    const tplBytes = b64ToU8(NERACA_TEMPLATE_B64)
    steps.push(`decoded bytes: ${tplBytes.length}`)
    steps.push(`zip sig: ${tplBytes[0].toString(16)}${tplBytes[1].toString(16)}${tplBytes[2].toString(16)}${tplBytes[3].toString(16)}`)
    // Step 2: parse ZIP
    const parsed = _zipParse(tplBytes)
    steps.push(`parsed entries: ${parsed.size}`)
    for (const [k,v] of parsed) steps.push(`  ${k}: ${v.length}b`)
    // Step 3: decode sheet1
    const e1 = parsed.get('xl/worksheets/sheet1.xml')
    if (e1) {
      const xml = new TextDecoder().decode(e1)
      steps.push(`sheet1 xml len: ${xml.length}`)
      steps.push(`sheet1 first 80: ${xml.substring(0,80)}`)
    } else steps.push('sheet1 NOT FOUND')
    return c.json({ ok: true, steps })
  } catch(e:any) {
    return c.json({ ok: false, error: String(e), stack: (e as any)?.stack?.substring(0,1000) })
  }
})

// ===========================================================
// API: UPLOAD EXCEL KE KV (TTL 1 jam) → return URL publik
// POST /api/neraca-excel-upload  body: { filename, data (base64) }
// ===========================================================
app.post('/api/neraca-excel-upload', async (c) => {
  try {
    const { filename, data } = await c.req.json<{ filename: string, data: string }>()
    if (!filename || !data) return c.json({ success: false, error: 'filename dan data wajib' }, 400)
    // Key = nama file asli ("UID KSKT DD.MM.YYYY.xlsx") — tidak pakai random suffix
    // agar URL yang dikirim ke WA mengandung nama file yang benar
    // URL encode spasi → %20 saat disusun, tapi key di KV tetap pakai spasi
    const key = filename  // e.g. "UID KSKT 31.05.2026.xlsx"
    // Simpan base64 ke D1 kv_store dengan TTL 24 jam
    await kvPut(c.env.DB, key, data, { expirationTtl: 86400 })
    const baseUrl = new URL(c.req.url).origin
    // Encode spasi di URL → %20 agar URL valid
    const encodedKey = encodeURIComponent(key)
    return c.json({ success: true, url: baseUrl + '/api/neraca-excel-file/' + encodedKey, key })
  } catch (e: any) { return c.json({ success: false, error: e.message }, 500) }
})

// GET /api/neraca-excel-file/:key → serve file Excel dari KV
app.get('/api/neraca-excel-file/:key{.+}', async (c) => {
  try {
    const key = decodeURIComponent(c.req.param('key'))
    const value = await kvGet(c.env.DB, key)
    if (!value) return c.json({ error: 'File tidak ditemukan atau sudah kedaluwarsa' }, 404)
    const filename = key
    // Decode base64 → binary dengan cara aman (handle byte > 127)
    const binaryStr = atob(value)
    const bytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i) & 0xff
    return new Response(bytes, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Cache-Control': 'no-store'
      }
    })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

// ===========================================================
// API: SERVE SVG NERACA DARI KV (backward compat)
// GET  /api/neraca-svg/:key
// ===========================================================
app.get('/api/neraca-svg/:key{.+}', async (c) => {
  try {
    const key = c.req.param('key')
    const svg = await kvGet(c.env.DB, key)
    if (!svg) return c.json({ error: 'SVG tidak ditemukan atau sudah kedaluwarsa' }, 404)
    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*'
      }
    })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

// ===========================================================
// API: SERVE PNG NERACA DARI KV
// GET  /api/neraca-png/:key
// ===========================================================
app.get('/api/neraca-png/:key{.+}', async (c) => {
  try {
    const key = c.req.param('key')
    const b64 = await kvGet(c.env.DB, key)
    if (!b64) return c.json({ error: 'PNG tidak ditemukan atau sudah kedaluwarsa' }, 404)
    // Decode base64 → binary
    const bin = atob(b64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i) & 0xff
    return new Response(bytes, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*'
      }
    })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

// ===========================================================
// API: ADMIN — baca / set neraca-last-sent-date di KV
// GET  /api/neraca-last-sent-date          → baca tanggal terakhir kirim
// POST /api/neraca-last-sent-date          body: { tanggal: "YYYY-MM-DD" }  → set manual
// ===========================================================
app.get('/api/neraca-last-sent-date', async (c) => {
  try {
    const val = await kvGet(c.env.DB, 'neraca-last-sent-date')
    return c.json({ success: true, tanggal: val || null })
  } catch (e: any) { return c.json({ success: false, error: e.message }, 500) }
})

app.post('/api/neraca-last-sent-date', async (c) => {
  try {
    const { tanggal } = await c.req.json<{ tanggal: string }>()
    if (!tanggal || !/^\d{4}-\d{2}-\d{2}$/.test(tanggal))
      return c.json({ success: false, error: 'tanggal wajib format YYYY-MM-DD' }, 400)
    await kvPut(c.env.DB, 'neraca-last-sent-date', tanggal)
    return c.json({ success: true, tanggal, message: `neraca-last-sent-date di-set ke ${tanggal}` })
  } catch (e: any) { return c.json({ success: false, error: e.message }, 500) }
})

// ===========================================================
// API: NERACA AUTO-KIRIM SERVER-SIDE (tanpa html2canvas)
// GET  /api/neraca-auto-kirim?tanggal=YYYY-MM-DD
// Flow: cek malam 19/19 → anti-duplikat KV → screenshot service → kirim grup WA
// Mendelegasikan ke fungsi helper autoKirimNeraca()
// query param ?tanggal= diabaikan (selalu pakai tanggal lengkap dari DB)
// ===========================================================
app.get('/api/neraca-auto-kirim', async (c) => {
  try {
    const origin = new URL(c.req.url).origin
    const result = await autoKirimNeraca(c.env.DB, origin)

    if (result.error) {
      return c.json({ success: false, error: result.error }, 200)
    }
    if (result.skipped) {
      return c.json({ success: true, skipped: true, reason: result.reason, tanggal_lengkap: result.tanggal })
    }
    return c.json({
      success: true,
      tanggal_kirim: result.tanggal,
      last_sent_date_updated: result.tanggal,
      message: result.message
    })
  } catch (e:any) { return c.json({ success:false, error:e.message }, 200) }
})

// ===========================================================
// API: KIRIM SCREENSHOT NERACA KE WA GROUP
// POST /api/kirim-wa-screenshot  body: { imageBase64, tanggal }
// Upload PNG ke ImgBB → kirim URL ke Whacenter sendGroup
// ===========================================================
app.post('/api/kirim-wa-screenshot', async (c) => {
  try {
    const { imageBase64, tanggal } = await c.req.json<{ imageBase64: string, tanggal: string }>()
    if (!imageBase64) return c.json({ success: false, error: 'imageBase64 wajib' }, 400)

    // 1. Upload ke ImgBB → dapat URL publik gambar
    const form = new URLSearchParams()
    form.append('key', 'bb2f97ad9b31b5ae4967eeead61e03de')
    // Hapus prefix data:image/png;base64, jika ada
    form.append('image', imageBase64.replace(/^data:image\/\w+;base64,/, ''))
    form.append('name', 'Neraca_Daya_' + tanggal)

    const imgRes  = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: form })
    const imgJson = await imgRes.json() as any
    if (!imgJson.success) return c.json({ success: false, error: 'ImgBB: ' + JSON.stringify(imgJson.error || imgJson) }, 500)

    const imgUrl = imgJson.data?.url || ''

    // 2. Kirim ke WA Group via Whacenter — kirim sebagai binary Blob
    const DEVICE_ID  = '550fd04ee9fc7c4b4e057d0bce6270f3'
    const GROUP_NAME = 'AMC UID KASELTENG'
    const tglFmt    = tanggal.split('-').reverse().join('.')  // DD.MM.YYYY
    const message   = `📊 *Neraca Daya ${tglFmt}*\nRingkasan neraca daya harian seluruh ULD.`

    // Kirim ke WA Group — pakai image_url (bukan file Blob)
    const waForm = new FormData()
    waForm.append('device_id',  DEVICE_ID)
    waForm.append('group',      GROUP_NAME)
    waForm.append('message',    message)
    waForm.append('image_url',  imgUrl)

    const waRes  = await fetch('https://app.whacenter.com/api/sendGroup', { method: 'POST', body: waForm })
    const waJson = await waRes.json() as { status: boolean, message: string }
    if (!waJson.status) return c.json({ success: false, error: waJson.message }, 500)

    return c.json({ success: true, imgUrl, message: 'Screenshot berhasil dikirim ke group WA' })
  } catch (e: any) { return c.json({ success: false, error: e.message }, 500) }
})

// ===========================================================
// API: KIRIM NERACA DAYA EXCEL KE WA GROUP VIA WHACENTER
// POST /api/kirim-wa-neraca  body: { fileUrl, filename, tanggal }
// Flow:
//   1. Konversi tanggal → DD.MM.YYYY, bentuk fname = "UID KSKT DD.MM.YYYY.xlsx"
//   2. Kirim pesan teks berisi fileUrl (URL KV kita) ke WA Group
//      URL sudah mengandung nama file: .../UID%20KSKT%20DD.MM.YYYY.xlsx
//      → user tap URL → download langsung file .xlsx yang valid
// ===========================================================
app.post('/api/kirim-wa-neraca', async (c) => {
  try {
    const { fileUrl, filename, tanggal } = await c.req.json<{ fileUrl: string, filename: string, tanggal: string }>()
    if (!fileUrl) return c.json({ success: false, error: 'fileUrl wajib diisi' }, 400)

    const DEVICE_ID  = '550fd04ee9fc7c4b4e057d0bce6270f3'
    const GROUP_NAME = 'AMC UID KASELTENG'

    // Konversi tanggal YYYY-MM-DD → DD.MM.YYYY
    const tglFmt = tanggal.includes('-')
      ? tanggal.split('-').reverse().join('.')
      : tanggal
    const fname = `UID KSKT ${tglFmt}.xlsx`

    // Kirim pesan teks + URL langsung ke WA Group
    // fileUrl sudah mengandung nama file: .../UID%20KSKT%20DD.MM.YYYY.xlsx
    const message = `📊 *Neraca Daya ${tglFmt}*\nData neraca daya harian seluruh ULD telah lengkap (19/19).\n\n📥 *Download Excel:*\n${fileUrl}`

    const form = new FormData()
    form.append('device_id', DEVICE_ID)
    form.append('group',     GROUP_NAME)
    form.append('message',   message)

    const waRes  = await fetch('https://app.whacenter.com/api/sendGroup', { method: 'POST', body: form })
    const waJson = await waRes.json() as { status: boolean, message: string }
    if (!waJson.status) return c.json({ success: false, error: waJson.message }, 500)

    return c.json({ success: true, message: 'Berhasil dikirim ke group WA', directUrl: fileUrl, fname })
  } catch (e: any) { return c.json({ success: false, error: e.message }, 500) }
})

// ===========================================================
// API: REKAP LAPORAN (summary per periode & unit)
// ===========================================================
app.get('/api/laporan', async (c) => {
  try {
    const date_start    = c.req.query('date_start') || ''
    const date_end      = c.req.query('date_end')   || ''
    const kode_unit     = c.req.query('kode_unit')  || ''
    const nama_operator = c.req.query('nama_operator') || ''

    if (!date_start || !date_end) {
      return c.json({ success: false, error: 'date_start dan date_end wajib diisi' }, 400)
    }

    let sql = `SELECT kode_unit, nama_unit, tanggal, nama_operator,
                      kwh_produksi, saldo_awal, saldo_akhir, penerimaan_bbm, estimasi_bbm_max,
                      stock_oli_sae40, stock_oli_sx, stock_oli_sx_plus,
                      dokumen_url, dokumen_nama, updated_at
               FROM lap_operasional
               WHERE tanggal BETWEEN ? AND ?`
    const binds: any[] = [date_start, date_end]

    if (kode_unit && kode_unit !== '0' && kode_unit !== 'all') {
      sql += ' AND kode_unit = ?'
      binds.push(Number(kode_unit))
    }
    if (nama_operator) {
      sql += ' AND nama_operator LIKE ?'
      binds.push('%' + nama_operator + '%')
    }
    sql += ' ORDER BY tanggal DESC, nama_unit ASC'

    const result = await c.env.DB.prepare(sql).bind(...binds).all<any>()
    return c.json({ success: true, data: result.results })
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

// ============================================================
// API: WA TEXT - simpan teks sementara, redirect ke WA
// ============================================================
app.post('/api/wa-text', async (c) => {
  try {
    const db = c.env.DB
    // Buat tabel jika belum ada
    await db.prepare(`CREATE TABLE IF NOT EXISTS wa_text_temp (
      id TEXT PRIMARY KEY,
      teks TEXT NOT NULL,
      phone TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`).run()
    // Hapus data lama (> 1 jam)
    await db.prepare(`DELETE FROM wa_text_temp WHERE created_at < datetime('now', '-1 hour')`).run()
    const { teks, phone } = await c.req.json()
    if (!teks || !phone) return c.json({ success: false, error: 'teks dan phone wajib' }, 400)
    const id = Math.random().toString(36).slice(2) + Date.now().toString(36)
    await db.prepare(`INSERT INTO wa_text_temp (id, teks, phone) VALUES (?, ?, ?)`)
      .bind(id, teks, phone).run()
    return c.json({ success: true, id })
  } catch(e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

app.get('/api/wa-redirect/:id', async (c) => {
  try {
    const db = c.env.DB
    const id = c.req.param('id')
    const row = await db.prepare(`SELECT teks, phone FROM wa_text_temp WHERE id = ?`)
      .bind(id).first() as { teks: string, phone: string } | null
    if (!row) return c.text('Link kadaluarsa atau tidak ditemukan', 404)
    const url = 'https://wa.me/' + row.phone + '?text=' + encodeURIComponent(row.teks)
    return c.redirect(url, 302)
  } catch(e: any) {
    return c.text('Error: ' + e.message, 500)
  }
})

// ============================================================
// API: KIRIM WA VIA WHACENTER
// ============================================================
const WHACENTER_DEVICE_ID = '550fd04ee9fc7c4b4e057d0bce6270f3'
const WHACENTER_NUMBER    = '6285285596663'

app.post('/api/kirim-wa', async (c) => {
  try {
    const { message } = await c.req.json() as { message: string }
    if (!message) return c.json({ success: false, error: 'message wajib' }, 400)

    const resp = await fetch('https://app.whacenter.com/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_id: WHACENTER_DEVICE_ID,
        number:    WHACENTER_NUMBER,
        message:   message
      })
    })
    const json: any = await resp.json()
    // Whacenter return { status: true } jika berhasil
    if (!json.status) throw new Error(json.message || 'Whacenter error')
    return c.json({ success: true })
  } catch(e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

// ============================================================
// API: JADWAL WA — baca kolom Z dari Sheets, simpan jadwal ke D1
// ============================================================
// Multi-unit spreadsheet config: kode_unit → { id, gid }
const UNIT_SHEETS: Record<number, { id: string, gid: string }> = {
  919: { id: '1Z9GUVysMpsEtUxYYTXjDcrTZHD3iG5E8FoRLsHN6ll0', gid: '967712266' },
  918: { id: '1M2JOXWK4Q-LP1vlyL15YuTbM2dkW6shOpj1ehSkfbko', gid: '0'         },
  917: { id: '1JnExvPvj3dW75bJSwmcz7Hu9At4MAY8_SFn_6h6r-ck',  gid: '967712266' },
  920: { id: '1_TLzT_-rrtZYRTGinl5wA6XTQgsS722WJHgIAkds_EM',  gid: '967712266' },
  915: { id: '1NqK9-si1ljB4NSdFfzoQOX3Y0TpwG-sy-uIYrsQY3wU',  gid: '967712266' },
  390: { id: '1D1CBsjxQ4jHxNCI_5LUXqCrG92rls4_XTwdmCk4F5_s',  gid: '967712266' },
  399: { id: '1oMNZUph4KLB8LS-N23f4mD2VbA5ZeBUDlz4VqSKE620',  gid: '967712266' },
  395: { id: '1q9eDZGdg-AI42xkpIIgyR95B-GdlkAnksNw5KofJcqo',   gid: '967712266' },
  391: { id: '12cee_bWeFjVhH0ZpyoLmSHaBhWfIaTMLAZnWPvGO74U',   gid: '967712266' },
  373: { id: '1KjYrM-FysfrpKv3LUaMnZxoDS8ENHFZecCBAaTSTMPk',   gid: '967712266' },
  376: { id: '1bMROUJT6Mh8HtoKxaVAClzmZqG3x0XZJ6yIiXxEidvc',   gid: '967712266' },
  382: { id: '1UXSL2bIlcKKNrFI14D13KAhlKPt3bZ2L0eeupPFGzc0',   gid: '967712266' },
  375: { id: '17-vy4DZsG-X0QbgGUyWyQH_fWcELztL9ukVuVu5XR9g',   gid: '967712266' },
  913: { id: '1B8WS2SqB8pjUtZiY7fg8I2yow1DVjGat_mGq7SJ_mtM',   gid: '967712266' },
  910: { id: '1ogcKzhOptTuMUgf18XLpoqvBn1QvFynD-Omp-kgPj4w',   gid: '967712266' },
  385: { id: '1T38eNZ8a02B2SiIzjsGG-kAVUCvPtwpq8SP6m8bmEtQ',   gid: '967712266' },
  366: { id: '1mgPRQnFMGw0ugdZTapUjz3kkVMGScuHCMCCbpg3SSBE',   gid: '967712266' },
  372: { id: '109mi5EnZzhw5Q25orDJiLcb6FhV3PtjF939Fna2qAP8',   gid: '967712266' },
  911: { id: '1xJPP81LffMzVIDX_73-SxIkoXiD39degdWibRB-xyFE',   gid: '967712266' },
}

app.post('/api/jadwal-wa', async (c) => {
  try {
    const db = c.env.DB
    // Ambil kode_unit dari body atau query, default 919
    let kode_unit_req = 919
    try {
      const body = await c.req.json().catch(() => ({})) as any
      if (body?.kode_unit) kode_unit_req = Number(body.kode_unit)
    } catch(_) {}
    if (!kode_unit_req) {
      const q = c.req.query('kode_unit')
      if (q) kode_unit_req = Number(q)
    }
    const sheetCfg = UNIT_SHEETS[kode_unit_req]
    if (!sheetCfg) return c.json({ success: true, skipped: true, reason: `Unit ${kode_unit_req} tidak perlu sinkronisasi jadwal` }, 200)
    // Baca spreadsheet via CSV export (public)
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetCfg.id}/export?format=csv&gid=${sheetCfg.gid}`
    const csvResp = await fetch(csvUrl)
    const csvText = await csvResp.text()

    // Parse CSV sederhana
    const lines = csvText.trim().split('\n')
    if (lines.length < 2) return c.json({ success: true, inserted: 0, total: 0, note: 'Spreadsheet belum ada data' }, 200)

    const idxTanggal = 1  // kolom B = index 1
    const idxJam     = 25 // kolom Z = index 25

    // Helper: konversi M/D/YYYY atau M/D/YY → YYYY-MM-DD, lalu tambah 1 hari (H+1)
    const parseAndNextDay = (raw: string): string | null => {
      const s = raw.replace(/"/g, '').trim()
      // Coba format M/D/YYYY atau M/D/YY
      const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
      if (mdy) {
        let yr = parseInt(mdy[3])
        if (yr < 100) yr += 2000
        const mo = parseInt(mdy[1])
        const dy = parseInt(mdy[2])
        const d = new Date(yr, mo - 1, dy + 1) // +1 = H+1
        const yy = d.getFullYear()
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const dd = String(d.getDate()).padStart(2, '0')
        return `${yy}-${mm}-${dd}`
      }
      // Coba format YYYY-MM-DD
      const ymd = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
      if (ymd) {
        const d = new Date(parseInt(ymd[1]), parseInt(ymd[2]) - 1, parseInt(ymd[3]) + 1)
        const yy = d.getFullYear()
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const dd = String(d.getDate()).padStart(2, '0')
        return `${yy}-${mm}-${dd}`
      }
      return null
    }

    // Helper: validasi format jam HH:MM
    const parseJam = (raw: string): string | null => {
      const s = raw.replace(/"/g, '').trim()
      const m = s.match(/^(\d{1,2}):(\d{2})$/)
      if (!m) return null
      const h = parseInt(m[1])
      const mi = parseInt(m[2])
      if (h < 0 || h > 23 || mi < 0 || mi > 59) return null
      return `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`
    }

    // Kumpulkan jadwal unik: tanggal H+1 + jam valid dari kolom Z
    const jadwalSet = new Set<string>()
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((v: string) => v.replace(/"/g, '').trim())
      const tanggalRaw = cols[idxTanggal] || ''
      const jamRaw     = cols[idxJam]     || ''
      if (!tanggalRaw || !jamRaw) continue

      const tanggal = parseAndNextDay(tanggalRaw)
      const jam     = parseJam(jamRaw)
      if (!tanggal || !jam) continue  // skip baris dengan format tidak valid

      jadwalSet.add(`${tanggal}|${jam}`)
    }

    if (jadwalSet.size === 0) return c.json({ success: true, inserted: 0, total: 0, note: 'Tidak ada jadwal valid di kolom Z (Generate Jam)' }, 200)

    // Simpan ke tabel jadwal_wa (INSERT OR IGNORE — tidak timpa yang sudah ada)
    let inserted = 0
    for (const key of jadwalSet) {
      const [tanggal, jam] = key.split('|')
      try {
        await db.prepare(`INSERT OR IGNORE INTO jadwal_wa (kode_unit, tanggal, jam, status) VALUES (?, ?, ?, 'pending')`)
          .bind(kode_unit_req, tanggal, jam).run()
        inserted++
      } catch(_) {}
    }

    return c.json({ success: true, inserted, total: jadwalSet.size })
  } catch(e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

// Endpoint untuk lihat jadwal (debug)
app.get('/api/jadwal-wa', async (c) => {
  try {
    const db = c.env.DB
    const rows = await db.prepare(`SELECT * FROM jadwal_wa ORDER BY tanggal, jam`).all()
    return c.json({ success: true, data: rows.results })
  } catch(e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

// Endpoint cleanup: hapus jadwal dengan format tanggal atau jam salah
app.delete('/api/jadwal-wa/cleanup', async (c) => {
  try {
    const db = c.env.DB
    const r1 = await db.prepare(`DELETE FROM jadwal_wa WHERE tanggal NOT GLOB '????-??-??'`).run()
    const r2 = await db.prepare(`DELETE FROM jadwal_wa WHERE jam NOT GLOB '??:??'`).run()
    return c.json({ success: true, deleted_bad_tanggal: r1.meta.changes, deleted_bad_jam: r2.meta.changes })
  } catch(e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

// ============================================================
// FUNGSI: Build pesan WA per jam untuk unit 919
// ============================================================
async function buildPesanJam(db: D1Database, kode_unit: number, tanggal: string, jam: string): Promise<string | null> {
  try {
    // Normalisasi jam → "HH:MM" dan integer
    const jamHHMM = (() => {
      const s = String(jam).trim()
      const m = s.match(/^(\d{1,2}):(\d{2})$/)
      if (m) return `${m[1].padStart(2,'0')}:${m[2]}`
      const h = parseInt(s, 10)
      return `${String(h).padStart(2,'0')}:00`
    })()
    const jamInt = parseInt(jamHHMM.split(':')[0], 10)

    // ── Ambil data dari spreadsheet ──────────────────────────────
    // Kolom: B=Tanggal(1), D=KodeUnit(3), F=IDMesin(5), G=NamaMesin(6),
    //        H=Status(7), I=Terpasang(8), J=DM(9), K=Beban(10),
    //        L=StandKWH(11), M=StandBBM(12), N=PhasaR(13), O=PhasaS(14),
    //        P=PhasaT(15), Q=TekOli(16), R=TempAir(17), S=Tegangan(18),
    //        T=Frequency(19), U=CosPhi(20), V=JamKerja(21),
    //        W=KwhProd(22), X=PakaiBBM(23), Y=Ket(24), Z=GenerateJam(25)
    const sheetCfgPesan = UNIT_SHEETS[kode_unit] ?? UNIT_SHEETS[919]
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetCfgPesan.id}/export?format=csv&gid=${sheetCfgPesan.gid}`
    const csvResp = await fetch(csvUrl)
    const csvText = await csvResp.text()

    // Parse CSV — filter baris sesuai kode_unit + jam kolom Z
    const csvLines = csvText.trim().split('\n')
    // Map: id_mesin → row data dari spreadsheet
    const sheetMap: Record<string, string[]> = {}
    let namaUnitSheet = ''

    for (let i = 1; i < csvLines.length; i++) {
      // Parse CSV dengan memperhatikan quoted fields
      const cols: string[] = []
      let cur = '', inQ = false
      for (const ch of csvLines[i]) {
        if (ch === '"') { inQ = !inQ }
        else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = '' }
        else cur += ch
      }
      cols.push(cur.trim())

      const rowKode = (cols[3] || '').replace(/"/g,'').trim()
      const rowJam  = (cols[25] || '').replace(/"/g,'').trim()
      const rowId   = (cols[5] || '').replace(/"/g,'').trim()

      if (rowKode !== String(kode_unit)) continue
      if (rowJam !== jamHHMM) continue
      if (!rowId) continue

      if (!namaUnitSheet) namaUnitSheet = (cols[4] || '').replace(/"/g,'').trim()
      sheetMap[rowId] = cols
    }

    // ── Ambil data mesin dari mesin_cache (untuk urutan & SN) ───
    const mesinRows = await db.prepare(
      `SELECT * FROM mesin_cache WHERE kode_unit = ? ORDER BY id_mesin`
    ).bind(kode_unit).all()
    if (!mesinRows.results || mesinRows.results.length === 0) return null

    const mesinList: any[] = mesinRows.results
    const namaUnit = namaUnitSheet || (mesinList[0] ? (mesinList[0] as any).nama_unit : String(kode_unit))

    // ── Ambil nama operator dari lap_operasional tanggal H-1 ──────
    // Sama seperti LAPORAN BEBAN PUNCAK: gunakan operator hari sebelumnya
    const tglDate = new Date(tanggal)
    tglDate.setDate(tglDate.getDate() - 1)
    const tanggalH1 = tglDate.toISOString().split('T')[0]
    let namaOperator = '-'
    try {
      const lapRow: any = await db.prepare(
        `SELECT nama_operator FROM lap_operasional WHERE kode_unit = ? AND tanggal = ?`
      ).bind(kode_unit, tanggalH1).first()
      if (lapRow) namaOperator = lapRow.nama_operator || '-'
    } catch(_) {}

    // ── Susun teks pesan ─────────────────────────────────────────
    const lines: string[] = []
    lines.push('LAPORAN LOGSHEET PLTD')
    lines.push(namaUnit)
    lines.push(`id unit: ${String(kode_unit).padStart(4, '0')}`)
    lines.push(`tgl : ${tanggal}`)
    lines.push(`jam : ${jamHHMM}`)
    lines.push(`nama operator: ${namaOperator}`)
    lines.push('')

    // Helper: ambil nilai kolom, kembalikan string kosong jika null/kosong
    const col = (cols: string[], idx: number): string => {
      const v = (cols[idx] || '').replace(/"/g, '').trim()
      return v
    }
    // Helper: nilai numerik — tampilkan 0 jika kosong
    const num = (v: string): string => v !== '' ? v.replace(',', '.') : '0'

    for (let i = 0; i < mesinList.length; i++) {
      const m: any = mesinList[i]
      const idStr  = String(m.id_mesin)
      const cols   = sheetMap[idStr] || []        // data dari spreadsheet
      const hasSheet = cols.length > 0

      // Nama mesin: dari sheet jika ada, fallback ke cache
      const namaMesin = hasSheet ? col(cols, 6) || m.mesin || m.nama_mesin : m.mesin || m.nama_mesin

      lines.push(`${i + 1}. ${namaMesin}`)
      lines.push(`id mesin: ${idStr.padStart(6, '0')}`)
      lines.push(`kode mesin: ${m.kode_mesin || '-'}`)
      lines.push(`sn: ${m.s_n || '-'}`)
      lines.push(`dt: ${m.terpasang ?? '-'}`)

      if (hasSheet) {
        // Data dari spreadsheet sesuai mapping kolom
        lines.push(`daya mampu: ${num(col(cols, 9))}`)           // J
        lines.push(`beban: ${num(col(cols, 26))}`)               // AA (Generate Daya)
        lines.push(`stand kwh: ${num(col(cols, 11))}`)           // L
        lines.push(`stand bbm: ${num(col(cols, 12))}`)           // M
        lines.push(`phasa r: ${num(col(cols, 13))}`)             // N
        lines.push(`phasa s: ${num(col(cols, 14))}`)             // O
        lines.push(`phasa t: ${num(col(cols, 15))}`)             // P
        lines.push(`tek oli: ${num(col(cols, 16))}`)             // Q
        lines.push(`temp air pendingin: ${num(col(cols, 17))}`)  // R
        lines.push(`tegangan: ${num(col(cols, 18))}`)            // S
        lines.push(`frequency: ${num(col(cols, 19))}`)           // T
        lines.push(`cos phi: ${num(col(cols, 20))}`)             // U
        lines.push(`jam kerja mesin: ${num(col(cols, 21))}`)     // V
        lines.push(`status mesin: ${(col(cols, 7) || 'Operasi').toLowerCase()}`) // H
        lines.push(`Kwh produksi : ${num(col(cols, 22))}`)       // W
        lines.push(`pemakaian bbm : ${num(col(cols, 23))}`)      // X
        lines.push(`jenis bahan bakar : B35`)
        const ket = col(cols, 24)                                 // Y
        lines.push(`ket: ${ket}`)                                // kosong jika null, tapi baris tetap ada
      } else {
        // Fallback ke DB jika tidak ada di spreadsheet
        const dbRow = await db.prepare(
          `SELECT * FROM data_monitoring WHERE mesin_id = ? AND tanggal = ? AND CAST(jam AS INTEGER) = ?`
        ).bind(m.id_mesin, tanggal, jamInt).first() as any || {}
        const v0 = (val: any) => val != null ? val : 0
        lines.push(`daya mampu: ${v0(dbRow.daya_mampu)}`)
        lines.push(`beban: ${v0(dbRow.beban)}`)
        lines.push(`stand kwh: ${v0(dbRow.stand_kwh)}`)
        lines.push(`stand bbm: ${v0(dbRow.stand_bbm)}`)
        lines.push(`phasa r: ${v0(dbRow.phasa_r)}`)
        lines.push(`phasa s: ${v0(dbRow.phasa_s)}`)
        lines.push(`phasa t: ${v0(dbRow.phasa_t)}`)
        lines.push(`tek oli: ${v0(dbRow.tek_oli)}`)
        lines.push(`temp air pendingin: ${v0(dbRow.temp_air_pendingin)}`)
        lines.push(`tegangan: ${v0(dbRow.tegangan)}`)
        lines.push(`frequency: ${v0(dbRow.frequency)}`)
        lines.push(`cos phi: ${v0(dbRow.cos_phi)}`)
        lines.push(`jam kerja mesin: ${v0(dbRow.jam_kerja_mesin)}`)
        lines.push(`status mesin: ${(dbRow.status_mesin || 'Operasi').toLowerCase()}`)
        lines.push(`Kwh produksi : ${v0(dbRow.kwh_produksi)}`)
        lines.push(`pemakaian bbm : ${v0(dbRow.pemakaian_bbm)}`)
        lines.push(`jenis bahan bakar : B35`)
        const ket = dbRow.keterangan || ''
        lines.push(`ket: ${ket}`)
      }
      lines.push('')
    }

    return lines.join('\n').trim()
  } catch(e) {
    return null
  }
}

// ============================================================
// API: KIRIM WA TERJADWAL — dipanggil oleh Apps Script scheduler
// ============================================================
app.post('/api/kirim-wa-terjadwal', async (c) => {
  try {
    const { kode_unit, tanggal, jam } = await c.req.json() as {
      kode_unit: number, tanggal: string, jam: string
    }
    if (!kode_unit || !tanggal || !jam)
      return c.json({ success: false, error: 'kode_unit, tanggal, jam wajib' }, 400)

    const db = c.env.DB

    // Cek apakah sudah pernah dikirim (idempoten)
    const existing: any = await db.prepare(
      `SELECT status FROM jadwal_wa WHERE kode_unit=? AND tanggal=? AND jam=?`
    ).bind(kode_unit, tanggal, jam).first()
    if (existing && existing.status === 'sent')
      return c.json({ success: true, skipped: true, reason: 'Sudah dikirim sebelumnya' })

    // Build pesan
    const pesan = await buildPesanJam(db, kode_unit, tanggal, jam)
    if (!pesan)
      return c.json({ success: false, error: 'Tidak ada data monitoring untuk jam ini' })

    // Kirim via Whacenter
    const resp = await fetch('https://app.whacenter.com/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_id: WHACENTER_DEVICE_ID,
        number:    WHACENTER_NUMBER,
        message:   pesan
      })
    })
    const json: any = await resp.json()
    if (!json.status) throw new Error(json.message || 'Whacenter error')

    // Tandai sudah terkirim di tabel jadwal_wa
    await db.prepare(`INSERT OR REPLACE INTO jadwal_wa (kode_unit, tanggal, jam, status, sent_at)
      VALUES (?, ?, ?, 'sent', datetime('now'))`
    ).bind(kode_unit, tanggal, jam).run()

    return c.json({ success: true, sent: true, jam, tanggal })
  } catch(e: any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

// ============================================================
// SERVE MAIN PAGE
// ============================================================

app.get('/', (c) => {
  // Periode: Siang (06-17) dan Malam (18-05)
  const periodeOptions = `
    <option value="siang">SIANG</option>
    <option value="malam">MALAM</option>
  `

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>DILAN [DIGITALISASI LAPORAN]</title>
  <meta name="theme-color" content="#1e3a5f"/>
  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"/>
  <meta http-equiv="Pragma" content="no-cache"/>
  <meta http-equiv="Expires" content="0"/>
  <link rel="icon" type="image/x-icon" href="/static/favicon.ico"/>
  <link rel="icon" type="image/png" sizes="192x192" href="/static/icon-192.png"/>
  <link rel="icon" type="image/png" sizes="512x512" href="/static/icon-512.png"/>
  <link rel="apple-touch-icon" sizes="180x180" href="/static/apple-touch-icon.png"/>
  <link rel="preload" href="/static/style.css?v=20260618b" as="style"/>
  <link rel="preload" href="/static/app-v2.js?v=20260618b" as="script"/>
  <link href="/static/style.css?v=20260618b" rel="stylesheet"/>
</head>
<body class="bg-slate-100 min-h-screen">

<!-- ===== HEADER ===== -->
<header class="app-header">
  <div class="app-header-body">
    <div class="app-name">DILAN [DIGITALISASI LAPORAN]</div>
    <div class="app-header-nav">
      <div class="tab-row">
        <button id="tab-btn-laporan" class="tab-btn active" onclick="switchTab('laporan')">
          <span class="btn-text">OPERASIONAL</span>
        </button>
        <button id="tab-btn-monitoring" class="tab-btn" onclick="switchTab('monitoring')">
          <span class="btn-text">BEBAN PUNCAK</span>
        </button>
        <button id="tab-btn-data" class="tab-btn" onclick="switchTab('data')">
          <span class="btn-text">DATA</span>
        </button>
        <button id="tab-btn-pengaturan" class="tab-btn tab-btn-admin-icon" onclick="switchTab('pengaturan')" title="Admin">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </button>
      </div>
      <div class="header-actions" id="header-actions-monitoring"></div>
      <div class="header-actions" id="header-actions-data" style="display:none;"></div>
      <div class="header-actions" id="header-actions-laporan" style="display:none;">


      </div>
    </div>
  </div>
</header>

<!-- ===== TOOLBAR ===== -->
<div class="toolbar-wrap">
  <!-- Monitoring toolbar -->
  <div id="toolbar-monitoring" class="hidden">
    <div class="toolbar">
      <div class="toolbar-group">
        <label class="toolbar-label">Unit</label>
        <select id="mon-sel-unit" class="toolbar-select" onchange="onMonUnitChange(this.value)">
          <option value="">-- Pilih Unit --</option>
        </select>
      </div>
      <div class="toolbar-group">
        <label class="toolbar-label">Tanggal</label>
        <input type="date" id="sel-tanggal" class="toolbar-input" onchange="loadData()"/>
      </div>
      <div class="toolbar-group" id="toolbar-group-periode">
        <label class="toolbar-label">Periode</label>
        <select id="sel-periode" class="toolbar-select" style="max-width:200px;" onchange="loadData()">
          ${periodeOptions}
        </select>
        <button onclick="onPadamClick()" class="btn-toolbar-mobile btn-padam-mobile" style="background:#dc2626;color:#fff;border:none;border-radius:6px;font-weight:700;font-size:0.75rem;cursor:pointer;letter-spacing:0.05em;flex-shrink:0;">PADAM</button>
        <button id="btn-simpan-semua-mobile" onclick="saveAllData()" disabled class="btn-toolbar-mobile btn-simpan-mobile" style="background:#16a34a;color:#fff;border:none;border-radius:6px;font-weight:700;font-size:0.75rem;cursor:not-allowed;letter-spacing:0.05em;flex-shrink:0;opacity:0.5;">SIMPAN</button>
      </div>
      <div id="loading-indicator-mesin" class="hidden"><span class="spinner"></span></div>
      <div id="loading-indicator" class="hidden"><span class="spinner"></span></div>
      <span class="toolbar-info" id="info-mesin-count"></span>

      <button id="btn-padam-desktop" onclick="onPadamClick()" style="background:#dc2626;color:#fff;border:none;border-radius:6px;padding:6px 18px;font-weight:700;font-size:0.85rem;cursor:pointer;letter-spacing:0.05em;flex-shrink:0;margin-left:8px;">PADAM</button>
      <button id="btn-simpan-semua" onclick="saveAllData()" disabled style="background:#16a34a;color:#fff;border:none;border-radius:6px;padding:6px 18px;font-weight:700;font-size:0.85rem;cursor:not-allowed;letter-spacing:0.05em;flex-shrink:0;margin-left:8px;opacity:0.5;">SIMPAN</button>
    </div>
  </div>

  <!-- Data toolbar -->
  <div id="toolbar-data" class="hidden">
    <!-- Sub-tab row: NERACA DAYA | HOP BBM | STOCK OLI | Tanggal/Filter | info -->
    <div class="data-subtab-row" style="flex-wrap:wrap;gap:4px;">
      <button id="subtab-btn-neraca-daya" class="data-subtab-btn active" onclick="switchDataView('neraca-daya')">
        NERACA DAYA
      </button>
      <button id="subtab-btn-sfc" class="data-subtab-btn" onclick="switchDataView('sfc')">
        SFC
      </button>
      <button id="subtab-btn-hop-bbm" class="data-subtab-btn" onclick="switchDataView('hop-bbm')">
        HOP BBM
      </button>
      <button id="subtab-btn-stock-oli" class="data-subtab-btn" onclick="switchDataView('stock-oli')">
        STOCK OLI
      </button>
      <!-- Tanggal (untuk HOP BBM & STOCK OLI) -->
      <div id="data-subtab-date-wrap" class="data-subtab-date">
        <label class="toolbar-label">Tanggal</label>
        <input type="date" id="data-tanggal" class="toolbar-input" onchange="onDataTanggalChange()"/>
      </div>



      <!-- Filter ULD untuk SFC -->
      <div id="sfc-filter-wrap" style="display:none;align-items:center;gap:4px;flex-shrink:0;">
        <label class="toolbar-label">ULD</label>
        <select id="sfc-sel-uld" class="toolbar-select" style="width:180px;" onchange="onSfcUldChange()">
          <option value="">Semua ULD</option>
        </select>
      </div>
      <!-- Filter ULD + Periode untuk Grafik BP Neraca Daya -->
      <div id="neraca-chart-filter-wrap" style="display:none;align-items:center;gap:4px;flex-shrink:0;flex-wrap:wrap;">
        <label class="toolbar-label">ULD</label>
        <select id="neraca-chart-uld" class="toolbar-select" style="width:160px;" onchange="loadNeracaChart()">
          <option value="">-- Pilih ULD --</option>
        </select>
        <label class="toolbar-label">Periode</label>
        <select id="neraca-chart-periode" class="toolbar-select" style="width:90px;" onchange="loadNeracaChart()">
          <option value="siang">SIANG</option>
          <option value="malam">MALAM</option>
        </select>
      </div>
      <button id="btn-xl" onclick="(function(btn){var tgl=document.getElementById('data-tanggal').value;if(!tgl){alert('Pilih tanggal terlebih dahulu');return;}btn.disabled=true;btn.textContent='⏳...';window.open('/api/xlsx?tanggal='+tgl,'_blank');setTimeout(function(){btn.disabled=false;btn.textContent='EXCEL'},2000);})(this)" style="display:none;background:#16a34a;color:#fff;border:none;border-radius:6px;padding:6px 14px;font-size:0.78rem;font-weight:600;cursor:pointer;flex-shrink:0;" title="Download Excel Neraca Daya">
        EXCEL
      </button>
      <button id="btn-resume-data" onclick="onResumeDataClick()" style="display:none;background:#2563eb;color:#fff;border:none;border-radius:6px;padding:6px 14px;font-weight:700;font-size:0.78rem;cursor:pointer;letter-spacing:0.05em;flex-shrink:0;">RESUME</button>
      <div id="loading-indicator-data" class="hidden"><span class="spinner"></span></div>
      <span class="toolbar-info" id="info-data-record"></span>
    </div>
  </div>

  <!-- Pengaturan toolbar -->
  <div id="toolbar-pengaturan" class="hidden">
    <div class="toolbar">
      <div id="peng-subtab-row" style="display:flex;gap:4px;">
        <button id="peng-sub-btn-mesin"      class="data-subtab-btn active" onclick="switchPengView('mesin')">MESIN</button>
        <button id="peng-sub-btn-tad"         class="data-subtab-btn"        onclick="switchPengView('tad')">TAD</button>
        <button id="peng-sub-btn-sld"         class="data-subtab-btn"        onclick="switchPengView('sld')">SLD</button>
        <button id="peng-sub-btn-budgeting"   class="data-subtab-btn"        onclick="switchPengView('budgeting')">SALDO BBM</button>
      </div>
      <!-- Toolbar Mesin -->
      <div id="peng-toolbar-mesin" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <div class="toolbar-group">
          <label class="toolbar-label">Filter ULD</label>
          <select id="peng-sel-unit" class="toolbar-select" style="min-width:180px;" onchange="loadPengaturanMesin(this.value)">
            <option value="">Semua ULD</option>
          </select>
        </div>
        <button onclick="showTambahMesinForm()" style="background:#1e3a5f;color:#fff;border:none;border-radius:6px;padding:6px 16px;font-weight:700;font-size:0.75rem;cursor:pointer;flex-shrink:0;">
          TAMBAH MESIN
        </button>
        <div id="loading-indicator-peng" class="hidden"><span class="spinner"></span></div>
        <span class="toolbar-info" id="info-peng-count"></span>
      </div>
      <!-- Toolbar TAD -->
      <div id="peng-toolbar-tad" style="display:none;align-items:center;gap:8px;flex-wrap:wrap;">
        <button onclick="tadOpenModal(null)" style="background:#1e3a5f;color:#fff;border:none;border-radius:6px;padding:6px 16px;font-weight:700;font-size:0.75rem;cursor:pointer;">+ TAMBAH TAD</button>
      </div>
      <!-- Toolbar Budgeting -->
      <div id="peng-toolbar-budgeting" style="display:none;align-items:center;gap:8px;flex-wrap:wrap;">

      </div>
      <!-- Toolbar SLD -->
      <div id="peng-toolbar-sld" style="display:none;align-items:center;gap:6px;flex-wrap:wrap;">
        <div class="toolbar-group">
          <label class="toolbar-label">Unit</label>
          <select id="sld-sel-unit" class="toolbar-select" onchange="onSldUnitChange(this.value)">
            <option value="">-- Pilih Unit --</option>
          </select>
        </div>
        <div id="sld-toolbar-actions" style="display:none;align-items:center;gap:6px;flex-wrap:wrap;">
          <button id="sld-btn-autogen" onclick="sldAutoGenerate()" style="background:#7c3aed;color:#fff;border:none;border-radius:5px;padding:4px 10px;font-size:0.75rem;font-weight:600;cursor:pointer;">AUTO GEN</button>
          <button id="sld-btn-group"   onclick="sldGroupSelected()"   style="display:none;background:#0ea5e9;color:#fff;border:none;border-radius:5px;padding:4px 10px;font-size:0.75rem;font-weight:600;cursor:pointer;">GROUP</button>
          <button id="sld-btn-ungroup" onclick="sldUngroupSelected()" style="display:none;background:#0ea5e9;color:#fff;border:none;border-radius:5px;padding:4px 10px;font-size:0.75rem;font-weight:600;cursor:pointer;">UNGROUP</button>
          <button id="sld-btn-copy"   onclick="sldCopy()"      style="display:none;background:#0891b2;color:#fff;border:none;border-radius:5px;padding:4px 10px;font-size:0.75rem;font-weight:600;cursor:pointer;">COPY</button>
          <button id="sld-btn-paste"  onclick="sldPaste()"     style="display:none;background:#0891b2;color:#fff;border:none;border-radius:5px;padding:4px 10px;font-size:0.75rem;font-weight:600;cursor:pointer;">PASTE</button>
          <button id="sld-btn-dup"    onclick="sldDuplicate()" style="display:none;background:#0891b2;color:#fff;border:none;border-radius:5px;padding:4px 10px;font-size:0.75rem;font-weight:600;cursor:pointer;">DUPLIKAT</button>
          <button id="sld-btn-undo"   onclick="sldUndo()" disabled style="background:#64748b;color:#fff;border:none;border-radius:5px;padding:4px 10px;font-size:0.75rem;font-weight:600;cursor:pointer;opacity:0.4;">↩ UNDO</button>
          <button id="sld-btn-redo"   onclick="sldRedo()" disabled style="background:#64748b;color:#fff;border:none;border-radius:5px;padding:4px 10px;font-size:0.75rem;font-weight:600;cursor:pointer;opacity:0.4;">↪ REDO</button>
          <button id="sld-btn-fit"    onclick="sldFitView()"    style="background:#475569;color:#fff;border:none;border-radius:5px;padding:4px 10px;font-size:0.75rem;font-weight:600;cursor:pointer;">FIT</button>
          <button id="sld-btn-grid"   onclick="sldToggleGrid()" style="background:#475569;color:#fff;border:none;border-radius:5px;padding:4px 10px;font-size:0.75rem;font-weight:600;cursor:pointer;">GRID</button>
          <button id="sld-btn-delete" onclick="sldDeleteSelected()" style="display:none;background:#dc2626;color:#fff;border:none;border-radius:5px;padding:4px 10px;font-size:0.75rem;font-weight:600;cursor:pointer;">HAPUS</button>
          <button id="sld-btn-save"   onclick="sldSave()"       style="background:#16a34a;color:#fff;border:none;border-radius:5px;padding:4px 14px;font-size:0.75rem;font-weight:700;cursor:pointer;">SIMPAN</button>
        </div>
        <span id="sld-mode-label" style="font-size:0.72rem;color:#64748b;cursor:pointer;padding:3px 8px;border-radius:4px;background:rgba(0,0,0,0.05);" onclick="sldAdminLogin()">Mode: VIEW</span>
        <div id="loading-indicator-sld" class="hidden"><span class="spinner"></span></div>
      </div>
      <button id="btn-peng-admin" onclick="pengAdminLogin()" style="margin-left:auto;background:#dc2626;color:#fff;border:none;border-radius:6px;padding:6px 16px;font-weight:700;font-size:0.75rem;cursor:pointer;flex-shrink:0;">
        MASUK SEBAGAI ADMIN
      </button>
    </div>
  </div>

  <!-- Lap operasional toolbar -->
  <div id="toolbar-laporan">
    <div class="toolbar">
      <div class="toolbar-group">
        <label class="toolbar-label">Unit</label>
        <select id="lap-sel-unit" class="toolbar-select" onchange="onLapUnitChange(this.value)">
          <option value="">-- Pilih Unit --</option>
        </select>
      </div>
      <div class="toolbar-group">
        <label class="toolbar-label">Tanggal</label>
        <input type="date" id="lap-tanggal" class="toolbar-input" onchange="onLapTanggalChange()"/>
      </div>

      <div id="loading-indicator-lap-unit" class="hidden"><span class="spinner"></span></div>
      <div id="loading-indicator-lap" class="hidden"><span class="spinner"></span></div>
      <span class="toolbar-info" id="info-lap-record"></span>
    </div>
  </div>
</div>

<!-- ===== TAB: LOG SHEET HARIAN ===== -->
<div id="tab-monitoring" class="tab-content" style="padding:10px 12px;">
  <div id="mon-state-empty" style="display:flex;"></div>
  <div id="mon-table-wrap" class="hidden">
    <div class="table-wrap">
      <table id="main-table">
        <thead id="table-head"></thead>
        <tbody id="table-body"></tbody>
      </table>
    </div>
  </div>
</div>

<!-- ===== TAB: OPERASIONAL ===== -->
<div id="tab-laporan" class="tab-content active" style="padding:10px 12px;">
  <div id="lap-state-empty" style="flex-direction:column;"></div>
  <div id="lap-state-pick-unit" style="display:none;flex-direction:column;"></div>
  <div id="lap-form-container" class="hidden" style="max-width:600px;margin:0 auto;width:100%;"></div>
  <div id="lap-review-container" class="hidden" style="max-width:600px;margin:0 auto;width:100%;"></div>
</div>

<!-- ===== TAB: DATA ===== -->
<div id="tab-data" class="tab-content" style="padding:10px 12px;">
  <div id="data-state-empty" style="display:flex;"></div>
  <!-- NERACA DAYA -->
  <div id="neraca-table-wrap" class="hidden">
    <div class="table-wrap">
      <table id="neraca-table" style="min-width:100%;border-collapse:collapse;">
        <thead id="neraca-table-head"></thead>
        <tbody id="neraca-table-body"></tbody>
      </table>
    </div>
    <!-- Grafik Beban Puncak 1 Bulan per ULD -->
    <div id="neraca-chart-wrap" style="display:none;margin-top:16px;padding:12px;background:#fff;border-radius:8px;border:1px solid #e2e8f0;">
      <div id="neraca-chart-title" style="font-size:0.82rem;font-weight:700;color:#1a3352;margin-bottom:10px;text-align:center;"></div>
      <canvas id="neraca-bp-chart" style="width:100%;max-height:360px;"></canvas>
      <div id="neraca-chart-empty" style="display:none;text-align:center;color:#94a3b8;font-size:0.82rem;padding:32px 0;">Pilih ULD untuk menampilkan grafik beban puncak</div>
    </div>
  </div>
  <!-- SFC -->
  <div id="sfc-table-wrap" class="hidden">
    <!-- Tabel SFC di atas grafik -->
    <div style="margin-bottom:12px;">
      <div id="sfc-tabel-title" style="font-size:0.78rem;font-weight:700;color:#1e3a5f;margin-bottom:6px;padding:0 2px;">SFC per ULD</div>
      <!-- Tabel ULD (mode semua ULD) -->
      <div id="sfc-tabel-uld-wrap" style="overflow-x:auto;display:none;">
        <table id="sfc-tabel-uld" style="border-collapse:collapse;font-size:0.75rem;">
          <thead id="sfc-tabel-uld-head"></thead>
          <tbody id="sfc-tabel-uld-body"></tbody>
        </table>
      </div>
      <!-- Tabel Mesin (mode ULD dipilih) -->
      <div id="sfc-tabel-mesin-wrap" style="overflow-x:auto;display:none;">
        <div style="font-size:0.78rem;font-weight:700;color:#1e3a5f;margin-bottom:6px;padding:0 2px;" id="sfc-tabel-mesin-title">SFC per Mesin</div>
        <table id="sfc-tabel-mesin" style="border-collapse:collapse;font-size:0.75rem;">
          <thead id="sfc-tabel-mesin-head"></thead>
          <tbody id="sfc-tabel-mesin-body"></tbody>
        </table>
      </div>
    </div>
    <!-- Grafik SFC -->
    <div style="padding:8px 0;">
      <canvas id="sfc-chart" style="width:100%;max-height:480px;"></canvas>
    </div>
  </div>
  <!-- HOP BBM -->
  <div id="data-table-wrap" class="hidden">
    <div class="table-wrap">
      <table id="data-table" style="min-width:100%;border-collapse:collapse;">
        <thead id="data-table-head"></thead>
        <tbody id="data-table-body"></tbody>
      </table>
    </div>
  </div>
  <!-- STOCK OLI -->
  <div id="oli-table-wrap" class="hidden">
    <div class="table-wrap">
      <table id="oli-table" style="min-width:100%;border-collapse:collapse;">
        <thead id="oli-table-head"></thead>
        <tbody id="oli-table-body"></tbody>
      </table>
    </div>
  </div>

</div>

<!-- ===== TAB: PENGATURAN MESIN + SLD ===== -->
<div id="tab-pengaturan" class="tab-content" style="padding:0;">
  <!-- Sub-view: MESIN -->
  <!-- Sub-view: TAD -->
  <div id="peng-view-tad" style="display:none;padding:10px 12px;">
    <div style="overflow-x:auto;">
      <table id="tad-table" style="width:100%;border-collapse:collapse;font-size:0.82rem;table-layout:fixed;">
        <colgroup>
          <col style="width:4%;"/>
          <col style="width:30%;"/>
          <col style="width:28%;"/>
          <col style="width:26%;"/>
          <col style="width:12%;"/>
        </colgroup>
        <thead id="tad-table-head"></thead>
        <tbody id="tad-table-body">
          <tr><td colspan="5" style="text-align:center;padding:32px;color:#94a3b8;">Memuat data...</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Modal TAD -->
  <div id="modal-tad" class="modal-overlay hidden" onclick="if(event.target===this)closeTadModal()">
    <div class="modal-box" style="width:440px;max-width:96vw;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <h3 id="modal-tad-title" style="font-size:0.95rem;font-weight:700;color:#1e3a5f;margin:0;">Tambah TAD</h3>
        <button onclick="closeTadModal()" style="background:none;border:none;font-size:1.2rem;cursor:pointer;color:#64748b;">✕</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div>
          <label style="font-size:0.75rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Nama <span style="color:#dc2626;">*</span></label>
          <input id="tad-field-nama" type="text" placeholder="Nama lengkap..." style="width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:0.82rem;box-sizing:border-box;"/>
        </div>
        <div>
          <label style="font-size:0.75rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Jabatan <span style="color:#dc2626;">*</span></label>
          <select id="tad-field-jabatan" style="width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:0.82rem;box-sizing:border-box;background:#fff;">
            <option value="">-- Pilih Jabatan --</option>
            <option value="ADMINISTRASI">ADMINISTRASI</option>
            <option value="AHLI K3">AHLI K3</option>
            <option value="KOORDINATOR">KOORDINATOR</option>
            <option value="OPHAR DIST">OPHAR DIST</option>
            <option value="OPHAR KIT">OPHAR KIT</option>
            <option value="TIM HAR">TIM HAR</option>
            <option value="SITE LEADER">SITE LEADER</option>
            <option value="TENAGA AHLI AMC">TENAGA AHLI AMC</option>
          </select>
        </div>
        <div>
          <label style="font-size:0.75rem;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Penempatan <span style="color:#dc2626;">*</span></label>
          <input id="tad-field-penempatan" type="text" placeholder="Penempatan..." style="width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:0.82rem;box-sizing:border-box;"/>
        </div>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:18px;">
        <button onclick="closeTadModal()" style="background:#f1f5f9;color:#475569;border:none;border-radius:6px;padding:7px 18px;font-size:0.8rem;font-weight:600;cursor:pointer;">Batal</button>
        <button id="btn-tad-simpan" onclick="tadSimpan()" style="background:#1e3a5f;color:#fff;border:none;border-radius:6px;padding:7px 18px;font-size:0.8rem;font-weight:700;cursor:pointer;">Simpan</button>
      </div>
    </div>
  </div>

  <div id="peng-view-mesin" style="padding:10px 12px;">
    <div id="peng-state-locked" style="display:none;"></div>
    <div id="peng-state-content" style="display:none;">
      <div id="peng-table-wrap" style="overflow-x:auto;">
        <table id="peng-table" style="width:100%;border-collapse:collapse;font-size:0.82rem;table-layout:fixed;">
          <colgroup>
            <col style="width:3%;"/>        <!-- No -->
            <col style="width:11%;"/>       <!-- ULD -->
            <col style="width:20%;"/>       <!-- Nama Mesin -->
            <col style="width:20%;"/>       <!-- Mesin -->
            <col style="width:9%;"/>        <!-- Tipe -->
            <col style="width:9%;"/>        <!-- S/N -->
            <col style="width:7%;"/>        <!-- DM (kW) -->
            <col style="width:7%;"/>        <!-- Source -->
            <col style="width:10%;"/>       <!-- Aksi -->
          </colgroup>
          <thead id="peng-table-head"></thead>
          <tbody id="peng-table-body"></tbody>
        </table>
      </div>
    </div>
  </div>
  <!-- Sub-view: SALDO BBM -->
  <div id="peng-view-budgeting" style="display:none;padding:0;">
    <iframe
      id="saldo-bbm-iframe"
      src="https://bbm-monitor.pages.dev/"
      style="width:100%;height:calc(90vh - 130px);min-height:500px;border:none;display:block;"
      allowfullscreen
      loading="lazy"
    ></iframe>
  </div>
  <!-- Sub-view: SLD -->
  <div id="peng-view-sld" style="display:none;padding:0;">
    <div id="sld-state-empty" style="display:flex;align-items:center;justify-content:center;height:300px;color:#94a3b8;font-size:0.9rem;">
      Pilih unit untuk melihat / mengedit SLD
    </div>
    <div id="sld-wrap" class="hidden" style="position:relative;width:100%;background:#f1f5f9;border-top:1px solid #e2e8f0;">
      <!-- Palette komponen (kiri) -->
      <div id="sld-palette" style="position:absolute;left:0;top:0;bottom:0;width:72px;background:#1e3a5f;display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 4px;overflow-y:auto;z-index:10;">
        <div class="sld-pal-item" data-type="generator"  title="Generator/PLTD">
          <svg width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="14" fill="none" stroke="#93c5fd" stroke-width="2"/><text x="18" y="22" text-anchor="middle" font-size="11" fill="#93c5fd" font-weight="bold">G</text></svg>
          <span>GEN</span>
        </div>
        <div class="sld-pal-item" data-type="trafo" title="Transformator">
          <svg width="36" height="36" viewBox="0 0 36 36"><circle cx="13" cy="18" r="8" fill="none" stroke="#93c5fd" stroke-width="2"/><circle cx="23" cy="18" r="8" fill="none" stroke="#93c5fd" stroke-width="2"/></svg>
          <span>TRF</span>
        </div>
        <div class="sld-pal-item" data-type="busbar" title="Busbar">
          <svg width="36" height="20" viewBox="0 0 36 20"><rect x="2" y="8" width="32" height="4" fill="#93c5fd" rx="1"/></svg>
          <span>BUS</span>
        </div>
        <div class="sld-pal-item" data-type="cb" title="Circuit Breaker">
          <svg width="36" height="36" viewBox="0 0 36 36"><rect x="12" y="12" width="12" height="12" fill="none" stroke="#93c5fd" stroke-width="2" rx="2"/><line x1="18" y1="2" x2="18" y2="12" stroke="#93c5fd" stroke-width="2"/><line x1="18" y1="24" x2="18" y2="34" stroke="#93c5fd" stroke-width="2"/></svg>
          <span>CB</span>
        </div>
        <div class="sld-pal-item" data-type="load" title="Beban/Load">
          <svg width="36" height="36" viewBox="0 0 36 36"><polygon points="18,4 32,30 4,30" fill="none" stroke="#93c5fd" stroke-width="2"/><line x1="18" y1="30" x2="18" y2="34" stroke="#93c5fd" stroke-width="2"/></svg>
          <span>LOAD</span>
        </div>
        <div class="sld-pal-item" data-type="line" title="Kabel/Line">
          <svg width="36" height="36" viewBox="0 0 36 36"><line x1="4" y1="18" x2="32" y2="18" stroke="#93c5fd" stroke-width="2.5"/><polygon points="28,13 36,18 28,23" fill="#93c5fd"/></svg>
          <span>LINE</span>
        </div>
        <div class="sld-pal-item" data-type="label" title="Label Teks">
          <svg width="36" height="36" viewBox="0 0 36 36"><text x="18" y="24" text-anchor="middle" font-size="18" fill="#93c5fd" font-weight="bold">T</text></svg>
          <span>TXT</span>
        </div>
      </div>
      <!-- Canvas SVG -->
      <div id="sld-canvas-wrap" style="margin-left:72px;overflow:auto;position:relative;height:580px;cursor:default;">
        <svg id="sld-canvas" width="2000" height="1500" style="display:block;background:#f8fafc;">
          <defs>
            <pattern id="sld-grid-pattern" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" stroke-width="0.5"/>
            </pattern>
          </defs>
          <rect id="sld-grid-bg" width="100%" height="100%" fill="url(#sld-grid-pattern)"/>
          <g id="sld-lines-layer"></g>
          <g id="sld-components-layer"></g>
          <g id="sld-overlay-layer"></g>
        </svg>
      </div>
      <!-- Properties panel (kanan bawah, muncul saat ada seleksi) -->
      <div id="sld-props-panel" style="display:none;position:absolute;right:8px;top:8px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px;min-width:180px;box-shadow:0 2px 8px rgba(0,0,0,0.1);z-index:20;">
        <div style="font-size:0.72rem;font-weight:700;color:#1e3a5f;margin-bottom:8px;text-transform:uppercase;">Properti</div>
        <div style="display:flex;flex-direction:column;gap:6px;" id="sld-props-fields"></div>
      </div>
    </div>
  </div>
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

<!-- Modal Detail Mesin per ULD -->
<div id="modal-detail-mesin" class="modal-overlay hidden" onclick="if(event.target===this)closeModal('modal-detail-mesin')">
  <div class="modal-box" style="width:1050px;max-width:96vw;max-height:90vh;overflow-y:auto;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
      <div>
        <div id="modal-detail-title" style="font-size:1rem;font-weight:700;color:#1e3a5f;"></div>
        <div id="modal-detail-sub" style="font-size:0.75rem;color:#64748b;margin-top:2px;"></div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <button id="btn-popup-edit" onclick="togglePopupEditMode()" style="background:#1e3a5f;color:#fff;border:none;border-radius:6px;padding:5px 14px;font-size:0.78rem;font-weight:600;cursor:pointer;">EDIT</button>
        <button onclick="closeModal('modal-detail-mesin')" style="background:none;border:none;font-size:1.2rem;cursor:pointer;color:#64748b;padding:4px 8px;">✕</button>
      </div>
    </div>
    <!-- Filter tanggal + unit di dalam popup -->
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding:8px 10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;flex-wrap:wrap;">
      <span style="font-size:0.72rem;font-weight:600;color:#64748b;white-space:nowrap;">TAMPILKAN:</span>
      <div style="display:flex;align-items:center;gap:6px;">
        <label style="font-size:0.72rem;color:#64748b;white-space:nowrap;">Tanggal</label>
        <input type="date" id="popup-filter-tanggal" onchange="reloadNeracaPopup()" style="font-size:0.75rem;padding:4px 7px;border:1px solid #cbd5e1;border-radius:6px;color:#1e3a5f;font-weight:600;cursor:pointer;"/>
      </div>
      <div style="display:flex;align-items:center;gap:6px;">
        <label style="font-size:0.72rem;color:#64748b;white-space:nowrap;">Unit</label>
        <select id="popup-filter-unit" onchange="reloadNeracaPopup()" style="font-size:0.75rem;padding:4px 7px;border:1px solid #cbd5e1;border-radius:6px;color:#1e3a5f;font-weight:600;cursor:pointer;min-width:160px;"></select>
      </div>
    </div>
    <div id="modal-detail-infobar" style="margin-bottom:0;"></div>
    <div id="modal-detail-loading" style="text-align:center;padding:24px;display:none;"><span class="spinner"></span></div>
    <div id="modal-detail-body"></div>
  </div>
</div>

<script src="https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script>
<script src="/static/app-v2.js?v=20260618b"></script>
</body>
</html>`
  const resp = c.html(html)
  resp.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0')
  resp.headers.set('Pragma', 'no-cache')
  resp.headers.set('Expires', '0')
  resp.headers.set('Surrogate-Control', 'no-store')
  return resp
})

// ============================================================
// CRON HANDLER — cek jadwal WA setiap menit
// ============================================================
async function handleCron(env: { DB: D1Database }) {
  try {
    const db = env.DB
    await initDB(db)

    // Waktu sekarang di Asia/Jakarta
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
    const jamNow  = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0')
    const tanggalNow = now.getFullYear() + '-'
      + String(now.getMonth() + 1).padStart(2, '0') + '-'
      + String(now.getDate()).padStart(2, '0')

    // Ambil jadwal pending yang jamnya <= sekarang dan tanggalnya hari ini
    const pending: any = await db.prepare(`
      SELECT * FROM jadwal_wa
      WHERE status = 'pending'
        AND tanggal = ?
        AND jam <= ?
      ORDER BY jam ASC
    `).bind(tanggalNow, jamNow).all()

    for (const jadwal of (pending.results || [])) {
      const j = jadwal as any
      // Build pesan
      const pesan = await buildPesanJam(db, j.kode_unit, j.tanggal, j.jam)
      if (!pesan) {
        // Tandai skip jika tidak ada data
        await db.prepare(`UPDATE jadwal_wa SET status='skip', sent_at=? WHERE id=?`)
          .bind(new Date().toISOString(), j.id).run()
        continue
      }
      // Kirim via Whacenter
      try {
        const resp = await fetch('https://app.whacenter.com/api/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            device_id: WHACENTER_DEVICE_ID,
            number:    WHACENTER_NUMBER,
            message:   pesan
          })
        })
        const json: any = await resp.json()
        const status = json.status ? 'sent' : 'failed'
        await db.prepare(`UPDATE jadwal_wa SET status=?, sent_at=? WHERE id=?`)
          .bind(status, new Date().toISOString(), j.id).run()
      } catch(_) {
        await db.prepare(`UPDATE jadwal_wa SET status='failed', sent_at=? WHERE id=?`)
          .bind(new Date().toISOString(), j.id).run()
      }
    }
  } catch(_) {}
}

// ============================================================
// API: SLD — GET per unit
// ============================================================
app.get('/api/sld/:kode_unit', async (c) => {
  try {
    const kode = parseInt(c.req.param('kode_unit'))
    const row  = await c.env.DB.prepare(
      `SELECT kode_unit, nama_unit, svg_data, updated_at FROM sld WHERE kode_unit = ?`
    ).bind(kode).first<{ kode_unit: number, nama_unit: string, svg_data: string, updated_at: string }>()
    if (!row) return c.json({ success: true, data: null })
    return c.json({ success: true, data: { ...row, svg_data: JSON.parse(row.svg_data) } })
  } catch (e: any) { return c.json({ success: false, error: e.message }, 500) }
})

// API: SLD — POST simpan / update
app.post('/api/sld/:kode_unit', async (c) => {
  try {
    const kode      = parseInt(c.req.param('kode_unit'))
    const body: any = await c.req.json()
    const namaUnit  = body.nama_unit  || ''
    const svgData   = JSON.stringify(body.svg_data || [])
    await c.env.DB.prepare(`
      INSERT INTO sld (kode_unit, nama_unit, svg_data, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(kode_unit) DO UPDATE SET
        nama_unit  = excluded.nama_unit,
        svg_data   = excluded.svg_data,
        updated_at = CURRENT_TIMESTAMP
    `).bind(kode, namaUnit, svgData).run()
    return c.json({ success: true })
  } catch (e: any) { return c.json({ success: false, error: e.message }, 500) }
})

// ============================================================
// CONSTANTS: konfigurasi notifikasi WA
// ============================================================
const NOTIF_DEVICE_ID  = '550fd04ee9fc7c4b4e057d0bce6270f3'
const NOTIF_GROUP_NAME = 'AMC PRINDAVAN'
const NOTIF_ULD_ORDER  = [399,390,382,391,376,373,395,375,366,910,911,385,913,915,920,917,918,919,372]
const NOTIF_ULD_NAMES: Record<number,string> = {
  399:'ULD TUMBANG SENAMANG', 390:'ULD TELAGA',         382:'ULD PAGATAN',
  391:'ULD TELAGA PULANG',    376:'ULD MENDAWAI',        373:'ULD KENAMBUI',
  395:'ULD TUMBANG MANJUL',   375:'ULD KUDANGAN',        366:'ULD BABAI',
  910:'ULD MANGKATIP',        911:'ULD TELUK BETUNG',    385:'ULD RANGGA ILUNG',
  913:'ULD TUMPUNG LAUNG',    915:'ULD SUNGAI BALI',     920:'ULD MARABATUAN',
  917:'ULD KERASIAN',         918:'ULD KERAYAAN',        919:'ULD KERUMPUTAN',
  372:'ULD GUNUNG PUREI'
}

// PIC per area — kode_unit → nomor WA PIC (tanpa strip, format internasional)
// Tag di pesan jika ada ULD-nya yang belum masuk
const NOTIF_ULD_PIC: Record<number, string> = {
  399:'6282390050020', 390:'6282390050020', 382:'6282390050020',
  391:'6282390050020', 376:'6282390050020', 373:'6282390050020',
  395:'6282390050020', 375:'6282390050020',
  366:'6282148381159', 910:'6282148381159', 911:'6282148381159',
  385:'6282148381159', 913:'6282148381159', 372:'6282148381159',
  915:'6285387141814', 920:'6285387141814', 917:'6285387141814',
  918:'6285387141814', 919:'6285387141814'
}

// Ambil daftar nomor PIC unik dari daftar kode_unit yang belum masuk
function getPICNumbers(belumList: number[]): string[] {
  const picSet = new Set(belumList.map(ku => NOTIF_ULD_PIC[ku]).filter(Boolean))
  return [...picSet]
}

// Buat string tag untuk ditempel di pesan
function tagPIC(belumList: number[]): string {
  return getPICNumbers(belumList).map(no => `@${no}`).join(' ')
}

// ── Kirim pesan teks ke WA Group via Whacenter ──────────────────────────────
// mentions: array nomor internasional tanpa + (misal ['6282390050020']) untuk tag kontak
async function kirimPesanGrup(message: string, mentions: string[] = []): Promise<{ ok: boolean, info: string }> {
  try {
    const form = new FormData()
    form.append('device_id', NOTIF_DEVICE_ID)
    form.append('group',     NOTIF_GROUP_NAME)
    form.append('message',   message)
    // Field 'mention' format JSON array string
    if (mentions.length > 0) {
      form.append('mention', JSON.stringify(mentions))
    }
    const res  = await fetch('https://app.whacenter.com/api/sendGroup', { method:'POST', body:form })
    const json = await res.json() as { status:boolean, message:string }
    return { ok: json.status, info: json.message || '' }
  } catch(e:any) {
    return { ok: false, info: e.message }
  }
}

// ── Tanggal hari ini dalam timezone WITA (UTC+8) ────────────────────────────
function tanggalWITA(): string {
  const now = new Date()
  // Geser +8 jam dari UTC
  const wita = new Date(now.getTime() + 8 * 60 * 60 * 1000)
  return wita.toISOString().split('T')[0]  // "YYYY-MM-DD"
}

// ── Format tanggal DD/MM/YYYY ───────────────────────────────────────────────
function fmtTgl(tgl: string): string {
  return tgl.split('-').reverse().join('/')
}

// ============================================================
// NOTIF 1 — Jam 10:00 WITA: HOP BBM belum masuk
// Cek: lap_operasional hari ini, unit mana yang belum ada record
// (record = saldo_awal dan saldo_akhir sudah terisi)
// ============================================================
async function notifHopBBM(db: D1Database): Promise<{ pesan: string, mentions: string[] }> {
  // HOP BBM = data H-1 (kemarin). Dicek jam 10:00 WITA hari ini.
  const hari_ini = tanggalWITA()
  const d = new Date(hari_ini)
  d.setDate(d.getDate() - 1)
  const tanggal = d.toISOString().split('T')[0]  // H-1

  // Ambil unit yang sudah punya data lengkap untuk H-1
  const rows = await db.prepare(`
    SELECT kode_unit FROM lap_operasional
    WHERE tanggal = ?
      AND saldo_awal  IS NOT NULL
      AND saldo_akhir IS NOT NULL
  `).bind(tanggal).all<{ kode_unit: number }>()

  const sudahSet = new Set(rows.results.map(r => r.kode_unit))
  const belum = NOTIF_ULD_ORDER.filter(ku => !sudahSet.has(ku))

  if (belum.length === 0) {
    return { pesan: `✅ *[HOP BBM ${fmtTgl(tanggal)}]*\nSemua 19 ULD sudah input data HOP BBM. 👍`, mentions: [] }
  }

  const mentions = getPICNumbers(belum)
  const tag      = mentions.map(no => `@${no}`).join(' ')
  const listBelum = belum.map((ku, i) => `  ${i+1}. ${NOTIF_ULD_NAMES[ku] ?? ku}`).join('\n')
  const pesan = (
    `⚠️ *[HOP BBM ${fmtTgl(tanggal)}]*\n` +
    `Jam 10:00 WITA — *${belum.length} ULD* belum input data HOP BBM:\n\n` +
    `${listBelum}\n\n` +
    (tag ? `${tag}\n\n` : '') +
    `_Segera input data hari ini._`
  )
  return { pesan, mentions }
}

// ============================================================
// NOTIF 2 — Jam 20:00 WITA: Neraca daya belum masuk
// Kriteria "ada data":
//   - Ada minimal 1 record data_monitoring di jam siang (6–17) → ada data siang
//   - Ada minimal 1 record data_monitoring di jam malam (18–23 / 00–05) → ada data malam
//   - beban = 0 tetap dianggap ADA data (bisa standby/padam)
//   - Tidak ada record sama sekali → BELUM masuk (tampilkan "-")
// ============================================================
async function notifNeracaDaya(db: D1Database): Promise<{ pesan: string, mentions: string[] }> {
  const tanggal = tanggalWITA()

  // Query: SUM beban per sesi (siang/malam) + COUNT record untuk cek keberadaan data
  // COUNT > 0 = ada data (termasuk beban=0), COUNT = 0 = belum masuk sama sekali
  const rows = await db.prepare(`
    SELECT
      mc.kode_unit,
      COUNT(CASE WHEN CAST(dm.jam AS INTEGER) >= 6
                  AND CAST(dm.jam AS INTEGER) <= 17
                 THEN 1 END) as cnt_siang,
      COUNT(CASE WHEN CAST(dm.jam AS INTEGER) >= 18
                   OR CAST(dm.jam AS INTEGER) <= 5
                 THEN 1 END) as cnt_malam,
      SUM(CASE WHEN CAST(dm.jam AS INTEGER) >= 6
                AND CAST(dm.jam AS INTEGER) <= 17
               THEN COALESCE(dm.beban, 0) END) as bp_siang,
      SUM(CASE WHEN CAST(dm.jam AS INTEGER) >= 18
                 OR CAST(dm.jam AS INTEGER) <= 5
               THEN COALESCE(dm.beban, 0) END) as bp_malam
    FROM data_monitoring dm
    JOIN mesin_cache mc ON dm.mesin_id = mc.id_mesin
    WHERE dm.tanggal = ?
      AND mc.kode_unit IN (${NOTIF_ULD_ORDER.join(',')})
    GROUP BY mc.kode_unit
  `).bind(tanggal).all<{ kode_unit: number, cnt_siang: number, cnt_malam: number, bp_siang: number | null, bp_malam: number | null }>()

  // Map: kode_unit → { cnt_siang, cnt_malam, bp_siang, bp_malam }
  const dataMap: Record<number, { cnt_siang: number, cnt_malam: number, bp_siang: number | null, bp_malam: number | null }> = {}
  for (const r of rows.results) dataMap[r.kode_unit] = r

  // Kategorikan tiap ULD
  // adaSiang = ada record di jam siang (cnt_siang > 0) — BP=0 tetap dianggap ada data
  // adaMalam = ada record di jam malam (cnt_malam > 0)
  const belumKeduanya: string[] = []
  const belumSiang:    string[] = []
  const belumMalam:    string[] = []

  for (const ku of NOTIF_ULD_ORDER) {
    const nama     = NOTIF_ULD_NAMES[ku] ?? String(ku)
    const d        = dataMap[ku]
    const adaSiang = d != null && d.cnt_siang > 0
    const adaMalam = d != null && d.cnt_malam > 0

    if (!adaSiang && !adaMalam) {
      belumKeduanya.push(nama)
    } else if (!adaSiang) {
      belumSiang.push(nama)
    } else if (!adaMalam) {
      belumMalam.push(nama)
    }
  }

  const totalBelum = belumKeduanya.length + belumSiang.length + belumMalam.length

  if (totalBelum === 0) {
    return {
      pesan: `✅ *[Neraca Daya ${fmtTgl(tanggal)}]*\nSemua 19 ULD sudah input data neraca daya (siang & malam). 👍`,
      mentions: []
    }
  }

  // Format per kategori dengan emoji
  let msg = `⚠️ *[Neraca Daya ${fmtTgl(tanggal)}]*\n`
  msg += `Jam 20:00 WITA — *${totalBelum} ULD* belum lengkap:\n`

  if (belumKeduanya.length > 0) {
    msg += `\n🔴 *Belum ada data siang & malam (${belumKeduanya.length}):*\n`
    belumKeduanya.forEach((nama, i) => { msg += `  ${i+1}. ${nama}\n` })
  }

  if (belumSiang.length > 0) {
    msg += `\n🟡 *Belum ada data siang (${belumSiang.length}):*\n`
    belumSiang.forEach((nama, i) => { msg += `  ${i+1}. ${nama}\n` })
  }

  if (belumMalam.length > 0) {
    msg += `\n🟠 *Belum ada data malam (${belumMalam.length}):*\n`
    belumMalam.forEach((nama, i) => { msg += `  ${i+1}. ${nama}\n` })
  }

  // Kumpulkan semua kode_unit yang belum masuk untuk tag PIC
  const semuaBelumKU = NOTIF_ULD_ORDER.filter(ku => {
    const nama = NOTIF_ULD_NAMES[ku] ?? String(ku)
    return belumKeduanya.includes(nama) || belumSiang.includes(nama) || belumMalam.includes(nama)
  })
  const mentions = getPICNumbers(semuaBelumKU)
  const tag      = mentions.map(no => `@${no}`).join(' ')
  if (tag) msg += `\n${tag}\n`

  msg += `\n_Segera lengkapi data hari ini._`

  return { pesan: msg, mentions }
}

// ============================================================
// API: MANUAL TRIGGER — untuk test tanpa menunggu cron
// GET /api/cron-test?jenis=hop | neraca | semua
// ============================================================
app.get('/api/cron-test', async (c) => {
  try {
    const db    = c.env.DB
    const jenis = c.req.query('jenis') || 'semua'
    const kirim = c.req.query('kirim') === '1'  // ?kirim=1 → benar-benar kirim ke WA

    const results: Record<string, any> = {}

    if (jenis === 'hop' || jenis === 'semua') {
      const { pesan, mentions } = await notifHopBBM(db)
      results.hop = { pesan, mentions }
      if (kirim) {
        const r = await kirimPesanGrup(pesan, mentions)
        results.hop.kirim = r
      }
    }

    if (jenis === 'neraca' || jenis === 'semua') {
      const { pesan, mentions } = await notifNeracaDaya(db)
      results.neraca = { pesan, mentions }
      if (kirim) {
        const r = await kirimPesanGrup(pesan, mentions)
        results.neraca.kirim = r
      }
    }

    return c.json({ success: true, tanggal_wita: tanggalWITA(), kirim_ke_wa: kirim, results })
  } catch(e:any) {
    return c.json({ success: false, error: e.message }, 500)
  }
})

// ============================================================
// HELPER: wa_kirim_log — cek & catat pengiriman WA
// Untuk anti-duplikat per (tanggal, jenis) di DB
// ============================================================
async function sudahDikirim(db: D1Database, tanggal: string, jenis: string): Promise<boolean> {
  try {
    const row = await db.prepare(
      `SELECT id FROM wa_kirim_log WHERE tanggal = ? AND jenis = ? LIMIT 1`
    ).bind(tanggal, jenis).first()
    return row != null
  } catch { return false }
}

async function catatKirim(db: D1Database, tanggal: string, jenis: string, info = ''): Promise<void> {
  try {
    await db.prepare(
      `INSERT OR IGNORE INTO wa_kirim_log (tanggal, jenis, status, info) VALUES (?, ?, 'sent', ?)`
    ).bind(tanggal, jenis, info).run()
  } catch(e: any) {
    console.error(`[wa_kirim_log] Gagal catat ${jenis}/${tanggal}: ${e.message}`)
  }
}

// ============================================================
// HELPER: AUTO-KIRIM TABEL NERACA DAYA (pesan teks WA)
// Kirim ringkasan neraca daya dalam format teks ke grup
// Data: BP Siang + BP Malam per ULD dari data_monitoring
// Anti-duplikat: cek wa_kirim_log(tanggal, 'neraca_tabel')
// ============================================================
async function autoKirimTabelNeraca(
  db: D1Database,
  origin: string
): Promise<{ skipped?: boolean, reason?: string, tanggal?: string, error?: string, message?: string }> {

  const NERACA_ORDER   = [399,390,382,391,376,373,395,375,366,910,911,385,913,915,920,917,918,919,372]
  const REQUIRED_COUNT = NERACA_ORDER.length  // 19
  const DEVICE_ID      = '550fd04ee9fc7c4b4e057d0bce6270f3'

  // Baca penerima dari D1 kv_store (sama dengan neraca screenshot)
  type Penerima = { type: 'nomor' | 'grup', target: string }
  let penerima: Penerima[] = [{ type: 'grup', target: 'AMC UID KASELTENG' }]
  try {
    const raw = await kvGet(db, 'wa-penerima-neraca')
    if (raw) penerima = JSON.parse(raw)
  } catch(_) {}

  // ── 1. Cari tanggal terbaru dengan data malam LENGKAP 19/19 ──────────────
  const nowWita = new Date(new Date().getTime() + 8 * 60 * 60 * 1000)
  const hariIni = nowWita.toISOString().split('T')[0]
  const batas7  = (() => { const d = new Date(nowWita); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0] })()

  const tanggalRow = await db.prepare(`
    SELECT dm.tanggal,
      COUNT(DISTINCT CASE
        WHEN CAST(dm.jam AS INTEGER) >= 18 OR CAST(dm.jam AS INTEGER) <= 5
        THEN mc.kode_unit END) as cnt_malam
    FROM data_monitoring dm
    JOIN mesin_cache mc ON dm.mesin_id = mc.id_mesin
    WHERE mc.kode_unit IN (${NERACA_ORDER.join(',')})
      AND dm.tanggal >= ? AND dm.tanggal <= ?
    GROUP BY dm.tanggal
    HAVING cnt_malam >= ?
    ORDER BY dm.tanggal DESC
    LIMIT 1
  `).bind(batas7, hariIni, REQUIRED_COUNT).first<{ tanggal: string, cnt_malam: number }>()

  if (!tanggalRow) {
    return { skipped: true, reason: `Belum ada tanggal dengan data malam lengkap 19/19 (7 hari terakhir)` }
  }

  const tanggal = tanggalRow.tanggal

  // ── 2. Anti-duplikat: cek wa_kirim_log ──────────────────────────────────
  if (await sudahDikirim(db, tanggal, 'neraca_tabel')) {
    return { skipped: true, reason: `Tabel neraca ${tanggal} sudah pernah dikirim`, tanggal }
  }

  // ── 3. Ambil data neraca: BP Siang + BP Malam per ULD ───────────────────
  const dataRows = await db.prepare(`
    SELECT
      mc.kode_unit,
      mc.nama_unit,
      SUM(CASE WHEN (CAST(dm.jam AS INTEGER) >= 6 AND CAST(dm.jam AS INTEGER) <= 17)
               AND dm.status_mesin = 'Operasi' THEN COALESCE(dm.beban,0) ELSE 0 END) as bp_siang,
      SUM(CASE WHEN (CAST(dm.jam AS INTEGER) >= 18 OR CAST(dm.jam AS INTEGER) <= 5)
               AND dm.status_mesin = 'Operasi' THEN COALESCE(dm.beban,0) ELSE 0 END) as bp_malam,
      SUM(CASE WHEN dm.status_mesin IN ('Operasi','Standby')
               AND (CAST(dm.jam AS INTEGER) >= 18 OR CAST(dm.jam AS INTEGER) <= 5)
               THEN COALESCE(dm.daya_mampu,0) ELSE 0 END) as dm_pasok,
      COUNT(CASE WHEN (CAST(dm.jam AS INTEGER) >= 18 OR CAST(dm.jam AS INTEGER) <= 5)
                 AND dm.status_mesin = 'Operasi' THEN 1 END) as jml_ops,
      COUNT(CASE WHEN (CAST(dm.jam AS INTEGER) >= 18 OR CAST(dm.jam AS INTEGER) <= 5)
                 AND dm.status_mesin = 'Gangguan' THEN 1 END) as jml_gng
    FROM data_monitoring dm
    JOIN mesin_cache mc ON dm.mesin_id = mc.id_mesin
    WHERE dm.tanggal = ?
      AND mc.kode_unit IN (${NERACA_ORDER.join(',')})
    GROUP BY mc.kode_unit, mc.nama_unit
  `).bind(tanggal).all<{
    kode_unit: number, nama_unit: string,
    bp_siang: number, bp_malam: number, dm_pasok: number,
    jml_ops: number, jml_gng: number
  }>()

  // Map hasil query
  const dataMap: Record<number, { nama: string, bp_siang: number, bp_malam: number, dm_pasok: number, jml_ops: number, jml_gng: number }> = {}
  for (const r of dataRows.results) {
    dataMap[r.kode_unit] = {
      nama: r.nama_unit.replace(/^ULD\s+/i, ''),  // singkat: hilangkan prefix "ULD "
      bp_siang: Math.round(r.bp_siang || 0),
      bp_malam: Math.round(r.bp_malam || 0),
      dm_pasok:  Math.round(r.dm_pasok  || 0),
      jml_ops:   r.jml_ops || 0,
      jml_gng:   r.jml_gng || 0
    }
  }

  // ── 4. Format pesan teks tabel ───────────────────────────────────────────
  const tglFmt = tanggal.split('-').reverse().join('.')
  let totalBpSiang = 0, totalBpMalam = 0

  // Header
  let msg = `⚡ *NERACA DAYA KALSELTENG*\n`
  msg += `📅 ${tglFmt} | Data Malam\n`
  msg += `━━━━━━━━━━━━━━━━━━━━━━━\n`
  msg += `*No  ULD            Siang  Malam*\n`
  msg += `──────────────────────────────\n`

  NERACA_ORDER.forEach((ku, idx) => {
    const d = dataMap[ku]
    if (!d) return
    const no    = String(idx + 1).padStart(2, ' ')
    // Singkat nama max 13 char
    const nama  = d.nama.length > 13 ? d.nama.substring(0, 13) : d.nama.padEnd(13, ' ')
    const siang = String(d.bp_siang).padStart(5, ' ')
    const malam = String(d.bp_malam).padStart(5, ' ')
    const gng   = d.jml_gng > 0 ? ' ⚠️' : ''
    msg += `${no}. ${nama} ${siang}  ${malam}${gng}\n`
    totalBpSiang += d.bp_siang
    totalBpMalam += d.bp_malam
  })

  msg += `──────────────────────────────\n`
  msg += `*TOTAL         ${String(totalBpSiang).padStart(5,' ')}  ${String(totalBpMalam).padStart(5,' ')}*\n`
  msg += `━━━━━━━━━━━━━━━━━━━━━━━\n`
  msg += `_Satuan: MW · Data beban puncak malam_\n`
  msg += `_AMC UID KASELTENG_`

  // ── 5. Kirim ke semua penerima ───────────────────────────────────────────
  const penerimaDesc = penerima.map(p => `${p.type}:${p.target}`).join(', ')
  let adaYangBerhasil = false

  for (const p of penerima) {
    try {
      const payload: Record<string, string> = {
        device_id: DEVICE_ID,
        message: msg,
        ...(p.type === 'nomor' ? { number: p.target } : { group: p.target })
      }
      const endpoint = p.type === 'nomor'
        ? 'https://app.whacenter.com/api/send'
        : 'https://app.whacenter.com/api/sendGroup'
      const res  = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000)
      })
      const json = await res.json() as any
      if (json.status) {
        adaYangBerhasil = true
        console.log(`[tabel-neraca] OK → ${p.type} ${p.target}`)
      } else {
        console.error(`[tabel-neraca] FAIL → ${p.type} ${p.target}: ${json.message}`)
      }
    } catch(e: any) {
      console.error(`[tabel-neraca] Error → ${p.type} ${p.target}: ${e.message}`)
    }
  }

  // ── 6. Catat ke wa_kirim_log ─────────────────────────────────────────────
  if (adaYangBerhasil) {
    await catatKirim(db, tanggal, 'neraca_tabel', penerimaDesc)
  }

  return {
    tanggal,
    message: `Tabel Neraca Daya ${tglFmt} dikirim ke: ${penerimaDesc} (${adaYangBerhasil ? 'berhasil' : 'gagal semua'})`
  }
}

// ============================================================
// HELPER: AUTO-KIRIM NERACA DAYA (screenshot + excel ke WA Grup)
// Dipanggil dari cron malam DAN dari endpoint /api/neraca-auto-kirim
// Parameter origin: base URL Pages (untuk membentuk excel URL)
// ============================================================
async function autoKirimNeraca(
  db: D1Database,
  origin: string   // mis. "https://mesin-monitor.pages.dev"
): Promise<{ skipped?: boolean, reason?: string, tanggal?: string, error?: string, message?: string }> {

  const NERACA_ORDER   = [399,390,382,391,376,373,395,375,366,910,911,385,913,915,920,917,918,919,372]
  const REQUIRED_COUNT = NERACA_ORDER.length  // 19
  const DEVICE_ID      = '550fd04ee9fc7c4b4e057d0bce6270f3'
  const SCREENSHOT_SERVICE_URL = 'https://screenshot-service-i6l2.onrender.com'

  // Baca penerima dari D1 kv_store — bisa nomor personal atau grup, bisa lebih dari satu
  type Penerima = { type: 'nomor' | 'grup', target: string }
  let penerimaneraca: Penerima[] = [{ type: 'grup', target: 'AMC UID KASELTENG' }]  // default
  try {
    const raw = await kvGet(db, 'wa-penerima-neraca')
    if (raw) penerimaneraca = JSON.parse(raw)
  } catch(_) {}

  // ── 1. Cari tanggal terbaru dengan data malam LENGKAP 19/19 (7 hari terakhir)
  const nowWita = new Date(new Date().getTime() + 8 * 60 * 60 * 1000)
  const hariIni  = nowWita.toISOString().split('T')[0]
  const batas7   = (() => { const d = new Date(nowWita); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0] })()

  const tanggalRow = await db.prepare(`
    SELECT dm.tanggal,
      COUNT(DISTINCT CASE
        WHEN CAST(dm.jam AS INTEGER) >= 18 OR CAST(dm.jam AS INTEGER) <= 5
        THEN mc.kode_unit END) as cnt_malam
    FROM data_monitoring dm
    JOIN mesin_cache mc ON dm.mesin_id = mc.id_mesin
    WHERE mc.kode_unit IN (${NERACA_ORDER.join(',')})
      AND dm.tanggal >= ?
      AND dm.tanggal <= ?
    GROUP BY dm.tanggal
    HAVING cnt_malam >= ?
    ORDER BY dm.tanggal DESC
    LIMIT 1
  `).bind(batas7, hariIni, REQUIRED_COUNT).first<{ tanggal: string, cnt_malam: number }>()

  if (!tanggalRow) {
    return { skipped: true, reason: `Belum ada tanggal dengan data malam lengkap 19/19 (7 hari terakhir)` }
  }

  const tanggalKirim = tanggalRow.tanggal
  const tglFmt = tanggalKirim.split('-').reverse().join('.')

  // ── 2. Anti-duplikat: cek wa_kirim_log (DB) — lebih reliable dari KV ────
  if (await sudahDikirim(db, tanggalKirim, 'neraca_screenshot')) {
    return { skipped: true, reason: `Screenshot neraca ${tanggalKirim} sudah pernah dikirim`, tanggal: tanggalKirim }
  }

  // ── 3. Anti double-trigger: cek D1 kv_store pending flag ─────────────────
  const pendingNeraca = await kvGet(db, 'neraca-pending-tanggal')
  if (pendingNeraca === tanggalKirim) {
    return { skipped: true, reason: `Sedang diproses untuk tanggal ${tanggalKirim}, tunggu callback`, tanggal: tanggalKirim }
  }

  // ── 4. Trigger screenshot untuk setiap penerima — FIRE-AND-FORGET ────────
  const callbackUrl = `${origin}/api/neraca-kirim-callback`
  const penerimaDesc = penerimaneraca.map(p => `${p.type}:${p.target}`).join(', ')

  // Set pending flag (TTL 5 menit — kalau callback tidak datang akan retry otomatis)
  await kvPut(db, 'neraca-pending-tanggal', tanggalKirim, { expirationTtl: 300 })

  for (const penerima of penerimaneraca) {
    try {
      const doNeracaShot = async () => fetch(`${SCREENSHOT_SERVICE_URL}/screenshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tanggal: tanggalKirim,
          origin,
          // kirim ke nomor personal ATAU grup sesuai konfigurasi
          ...(penerima.type === 'nomor'
            ? { nomor: penerima.target }
            : { group: penerima.target }),
          message:     `⚡ *NERACA DAYA KALSELTENG — ${tglFmt}*\nData beban puncak malam seluruh ULD\n_AMC UID KASELTENG_`,
          excelUrl:    `${origin}/api/xlsx?tanggal=${tanggalKirim}`,
          callbackUrl
        }),
        signal: AbortSignal.timeout(30000)
      })
      let ssRes = await doNeracaShot()
      let ssJson = await ssRes.json() as any
      // Retry sekali jika browser crash
      if (!ssJson.success && ssJson.error && (ssJson.error.includes('closed') || ssJson.error.includes('crashed') || ssJson.error.includes('Target'))) {
        await new Promise(r => setTimeout(r, 3000))
        ssRes = await doNeracaShot()
        ssJson = await ssRes.json() as any
      }
      if (!ssJson.success) console.error(`[neraca] Gagal kirim ke ${penerima.target}: ${ssJson.error}`)
      else console.log(`[neraca] Queued ke ${penerima.type} ${penerima.target}`)
    } catch(e: any) {
      console.error(`[neraca] Error kirim ke ${penerima.target}: ${e.message}`)
    }
  }

  return {
    tanggal: tanggalKirim,
    message: `Screenshot Neraca Daya ${tglFmt} dikirim ke: ${penerimaDesc} (fire-and-forget)`
  }
}

// ============================================================
// HELPER: resolveImgUrl — simpan base64 ke KV jika perlu, return public URL
// ============================================================
async function resolveImgUrl(
  raw: string, db: D1Database, kvKey: string, origin: string, ttl = 86400
): Promise<string> {
  if (!raw) return ''
  if (raw.startsWith('data:image/')) {
    const b64 = raw.replace('data:image/png;base64,', '')
    await kvPut(db, kvKey, b64, { expirationTtl: ttl })
    return `${origin}/api/neraca-png/${kvKey}`
  }
  return raw  // URL langsung (litterbox/imgbb)
}

// HELPER: fetchImgBlob — ambil PNG sebagai Blob binary
// Mendukung: imgbb URL, data:image/png;base64,..., atau CF KV URL
// Mengembalikan Blob PNG siap dikirim ke Whacenter sebagai file attachment
// ============================================================
async function fetchImgBlob(raw: string): Promise<Blob | null> {
  if (!raw) return null
  try {
    if (raw.startsWith('data:image/')) {
      // base64 inline → decode jadi binary
      const b64 = raw.replace(/^data:image\/png;base64,/, '')
      const binary = atob(b64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      return new Blob([bytes], { type: 'image/png' })
    }
    // URL (imgbb atau CF KV) → fetch binary
    const r = await fetch(raw, { signal: AbortSignal.timeout(30000) })
    if (!r.ok) return null
    const buf = await r.arrayBuffer()
    return new Blob([buf], { type: 'image/png' })
  } catch { return null }
}

// ============================================================
// HELPER: AUTO-KIRIM HOP BBM (screenshot Playwright 1 gambar → WA)
// Dipanggil dari cron setiap menit — kirim saat data lap_operasional LENGKAP
// Penerima: baca dari KV 'wa-penerima-hop' (JSON array of {type,target})
// Contoh KV: [{"type":"nomor","target":"6285388709607"},{"type":"grup","target":"AMC UID KASELTENG"}]
// Default (jika KV kosong): [{"type":"grup","target":"AMC UID KASELTENG"}]
// ============================================================
async function autoKirimHopBbm(
  db: D1Database,
  origin: string
): Promise<{ skipped?: boolean, reason?: string, tanggal?: string, error?: string, message?: string }> {

  const SCREENSHOT_SVC = 'https://screenshot-service-i6l2.onrender.com'
  const TOTAL_UNITS   = 19  // total ULD yang harus lengkap

  // Baca penerima dari D1 kv_store — bisa nomor personal atau grup, bisa lebih dari satu
  type Penerima = { type: 'nomor' | 'grup', target: string }
  let penerimaHop: Penerima[] = [{ type: 'grup', target: 'AMC UID KASELTENG' }]  // default
  try {
    const raw = await kvGet(db, 'wa-penerima-hop')
    if (raw) penerimaHop = JSON.parse(raw)
  } catch(_) {}

  // ── 1. Cari tanggal paling terakhir yang data lap_operasional-nya LENGKAP ──
  // Lengkap = semua TOTAL_UNITS unit sudah punya saldo_akhir IS NOT NULL
  // Batasi pencarian 7 hari ke belakang dari hari ini WITA
  const nowWita = new Date(new Date().getTime() + 8 * 60 * 60 * 1000)
  const hariIni = nowWita.toISOString().split('T')[0]

  // Ambil tanggal-tanggal yang punya data, cukup banyak unit, 7 hari terakhir
  const kandidat = await db.prepare(`
    SELECT tanggal, COUNT(*) as jumlah_unit
    FROM lap_operasional
    WHERE tanggal <= ? AND tanggal >= date(?, '-7 days')
      AND saldo_akhir IS NOT NULL
    GROUP BY tanggal
    HAVING COUNT(*) >= ?
    ORDER BY tanggal DESC
    LIMIT 1
  `).bind(hariIni, hariIni, TOTAL_UNITS).first<{ tanggal: string, jumlah_unit: number }>()

  if (!kandidat) {
    return { skipped: true, reason: `Belum ada tanggal dengan data lengkap ${TOTAL_UNITS} unit (7 hari terakhir)` }
  }

  const tanggal = kandidat.tanggal

  // ── 2. Anti-duplikat: cek wa_kirim_log (DB) — lebih reliable dari KV ────
  if (await sudahDikirim(db, tanggal, 'hop_screenshot')) {
    return { skipped: true, reason: `Screenshot HOP ${tanggal} sudah pernah dikirim`, tanggal }
  }
  // Cek juga flag "sedang proses" — hindari double-trigger antar menit
  const pending = await kvGet(db, 'hop-pending-tanggal')
  if (pending === tanggal) {
    return { skipped: true, reason: `Sedang diproses untuk tanggal ${tanggal}, tunggu callback`, tanggal }
  }

  const tglFmt = tanggal.split('-').reverse().join('.')

  // ── 3. Trigger screenshot service untuk setiap penerima — fire-and-forget ──
  const callbackUrl = `${origin}/api/hop-kirim-callback`
  const penerimaDesc = penerimaHop.map(p => `${p.type}:${p.target}`).join(', ')

  // Set flag "sedang diproses" dulu — cron menit berikutnya tidak double-trigger
  // TTL 5 menit: kalau callback tidak datang → dianggap gagal → retry otomatis
  await kvPut(db, 'hop-pending-tanggal', tanggal, { expirationTtl: 300 })

  for (const penerima of penerimaHop) {
    try {
      const doHopShot = async () => fetch(`${SCREENSHOT_SVC}/screenshot-hop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tanggal,
          origin,
          // kirim ke nomor personal ATAU grup sesuai konfigurasi
          ...(penerima.type === 'nomor'
            ? { nomor: penerima.target }
            : { group: penerima.target }),
          message:     `📊 *HOP BBM KALSELTENG — ${tglFmt}*\nData stok & estimasi BBM per ULD (data H-1)\n_AMC UID KASELTENG_`,
          callbackUrl  // hanya penerima terakhir yang trigger callback (atau semua, idempotent)
        }),
        signal: AbortSignal.timeout(30000)
      })
      let shotRes = await doHopShot()
      let shotJson = await shotRes.json() as any
      // Retry sekali jika browser crash
      if (!shotJson.success && shotJson.error && (shotJson.error.includes('closed') || shotJson.error.includes('crashed') || shotJson.error.includes('Target'))) {
        await new Promise(r => setTimeout(r, 3000))
        shotRes = await doHopShot()
        shotJson = await shotRes.json() as any
      }
      if (!shotJson.success) console.error(`[hop] Gagal kirim ke ${penerima.target}: ${shotJson.error}`)
      else console.log(`[hop] Queued ke ${penerima.type} ${penerima.target}`)
    } catch(e: any) {
      console.error(`[hop] Error kirim ke ${penerima.target}: ${e.message}`)
    }
  }

  return {
    tanggal,
    message: `Screenshot HOP BBM ${tglFmt} dikirim ke: ${penerimaDesc} — ${kandidat.jumlah_unit} unit lengkap`
  }
}

// ============================================================
// ENDPOINT: /api/hop-kirim-callback — dipanggil screenshot service setelah WA terkirim
// ============================================================
app.post('/api/hop-kirim-callback', async (c) => {
  try {
    const { tanggal, status } = await c.req.json() as { tanggal: string, status: string }
    if (status === 'sent' && tanggal) {
      // Catat ke wa_kirim_log (anti-duplikat permanen di DB)
      await catatKirim(c.env.DB, tanggal, 'hop_screenshot', 'callback-ok')
      // Update kv_store
      await kvPut(c.env.DB, 'hop-last-sent-date', tanggal)
      await kvDelete(c.env.DB, 'hop-pending-tanggal')
      console.log(`[hop-callback] Tercatat: hop_screenshot/${tanggal}`)
    }
    return c.json({ success: true })
  } catch(e: any) { return c.json({ success: false, error: e.message }) }
})

// ============================================================
// ENDPOINT: /api/neraca-kirim-callback — dipanggil screenshot service setelah WA neraca terkirim
// ============================================================
app.post('/api/neraca-kirim-callback', async (c) => {
  try {
    const { tanggal, status } = await c.req.json() as { tanggal: string, status: string }
    if (status === 'sent' && tanggal) {
      // Catat ke wa_kirim_log (anti-duplikat permanen di DB)
      await catatKirim(c.env.DB, tanggal, 'neraca_screenshot', 'callback-ok')
      // Update kv_store
      await kvPut(c.env.DB, 'neraca-last-sent-date', tanggal)
      await kvDelete(c.env.DB, 'neraca-pending-tanggal')
      console.log(`[neraca-callback] Tercatat: neraca_screenshot/${tanggal}`)

      // Kirim Excel + notif PRINDAVAN di background setelah WA screenshot berhasil
      const origin = new URL(c.req.url).origin
      const tglFmt = tanggal.split('-').reverse().join('.')
      const DEVICE_ID = '550fd04ee9fc7c4b4e057d0bce6270f3'
      c.executionCtx.waitUntil((async () => {
        // Kirim link Excel ke grup
        try {
          const excelUrl = `${origin}/api/xlsx?tanggal=${tanggal}`
          const excelMsg = `📥 *Download Excel Neraca Daya ${tglFmt}*\nUID KSKT ${tglFmt}.xlsx\n\n${excelUrl}`
          await fetch('https://app.whacenter.com/api/sendGroup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ device_id: DEVICE_ID, group: 'AMC UID KASELTENG', message: excelMsg })
          })
        } catch(_) {}
        // Notif ke AMC PRINDAVAN
        try {
          const msgPrindavan =
            `✅ *Neraca Daya ${tglFmt}*\n` +
            `Data malam seluruh *19 ULD* sudah lengkap.\n` +
            `Laporan telah dikirim ke grup AMC UID KALSELTENG.`
          await fetch('https://app.whacenter.com/api/sendGroup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ device_id: DEVICE_ID, group: 'AMC PRINDAVAN', message: msgPrindavan })
          })
        } catch(_) {}
      })())
    }
    return c.json({ success: true })
  } catch(e: any) { return c.json({ success: false, error: e.message }) }
})

// ============================================================
// ENDPOINT: /api/hop-auto-kirim (GET) — trigger manual / test
// ============================================================
app.get('/api/hop-auto-kirim', async (c) => {
  try {
    const origin = new URL(c.req.url).origin
    const result = await autoKirimHopBbm(c.env.DB, origin)
    if (result.error)   return c.json({ success: false, error: result.error }, 200)
    if (result.skipped) return c.json({ success: true, skipped: true, reason: result.reason, tanggal: result.tanggal })
    return c.json({ success: true, tanggal: result.tanggal, message: result.message })
  } catch(e:any) { return c.json({ success: false, error: e.message }, 200) }
})

// ============================================================
// ENDPOINT: /api/neraca-tabel-kirim (GET) — trigger manual tabel neraca teks
// ============================================================
app.get('/api/neraca-tabel-kirim', async (c) => {
  try {
    const origin = new URL(c.req.url).origin
    const result = await autoKirimTabelNeraca(c.env.DB, origin)
    if (result.error)   return c.json({ success: false, error: result.error }, 200)
    if (result.skipped) return c.json({ success: true, skipped: true, reason: result.reason, tanggal: result.tanggal })
    return c.json({ success: true, tanggal: result.tanggal, message: result.message })
  } catch(e:any) { return c.json({ success: false, error: e.message }, 200) }
})

// ============================================================
// ENDPOINT: /api/wa-kirim-log (GET) — lihat log pengiriman WA
// Query: ?limit=20&jenis=hop_screenshot|neraca_screenshot|neraca_tabel
// DELETE /api/wa-kirim-log?tanggal=YYYY-MM-DD&jenis=hop_screenshot → hapus entry (untuk force re-send)
// ============================================================
app.get('/api/wa-kirim-log', async (c) => {
  try {
    const limit  = Math.min(parseInt(c.req.query('limit') || '30'), 100)
    const jenis  = c.req.query('jenis') || ''
    let query = `SELECT tanggal, jenis, status, info, sent_at FROM wa_kirim_log`
    const params: any[] = []
    if (jenis) { query += ` WHERE jenis = ?`; params.push(jenis) }
    query += ` ORDER BY sent_at DESC LIMIT ?`
    params.push(limit)
    const rows = await c.env.DB.prepare(query).bind(...params).all()
    return c.json({ success: true, count: rows.results.length, rows: rows.results })
  } catch(e:any) { return c.json({ success: false, error: e.message }, 500) }
})

app.delete('/api/wa-kirim-log', async (c) => {
  try {
    const tanggal = c.req.query('tanggal')
    const jenis   = c.req.query('jenis')
    if (!tanggal || !jenis) return c.json({ success: false, error: 'Butuh ?tanggal=YYYY-MM-DD&jenis=...' }, 400)
    await c.env.DB.prepare(`DELETE FROM wa_kirim_log WHERE tanggal = ? AND jenis = ?`).bind(tanggal, jenis).run()
    return c.json({ success: true, message: `Log ${jenis}/${tanggal} dihapus — akan di-retry saat cron berikutnya` })
  } catch(e:any) { return c.json({ success: false, error: e.message }, 500) }
})

// ============================================================
// ENDPOINT: /api/hop-test-kirim (GET) — test kirim ke nomor personal
// Query: ?nomor=085388709607&tanggal=2026-06-10&force=1
// ============================================================
app.get('/api/hop-test-kirim', async (c) => {
  try {
    const origin = new URL(c.req.url).origin
    const nomor  = c.req.query('nomor') || '085388709607'
    const tanggalParam = c.req.query('tanggal')
    const force  = c.req.query('force') === '1'

    const DEVICE_ID = '550fd04ee9fc7c4b4e057d0bce6270f3'
    const SCREENSHOT_SVC = 'https://screenshot-service-i6l2.onrender.com'

    // Tentukan tanggal: pakai ?tanggal jika ada, else H-1 WITA
    let tanggal = tanggalParam
    if (!tanggal) {
      const nowWita = new Date(new Date().getTime() + 8 * 60 * 60 * 1000)
      nowWita.setDate(nowWita.getDate() - 1)
      tanggal = nowWita.toISOString().split('T')[0]
    }
    const tglFmt = tanggal.split('-').reverse().join('.')

    // Ambil screenshot 1 gambar
    // Format nomor: pastikan diawali 62
    let nomorFmt = nomor.replace(/\D/g, '')
    if (nomorFmt.startsWith('0')) nomorFmt = '62' + nomorFmt.substring(1)
    if (!nomorFmt.startsWith('62')) nomorFmt = '62' + nomorFmt

    // Kirim nomor ke screenshot service → Node.js kirim binary file ke Whacenter
    // Auto-retry sekali jika browser crash (error mengandung "closed" / "crashed")
    const doShot = async () => fetch(`${SCREENSHOT_SVC}/screenshot-hop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tanggal,
        origin,
        nomor:   nomorFmt,
        message: `📊 *HOP BBM KALSELTENG — ${tglFmt}*\nData stok & estimasi BBM per ULD (data H-1)\n_TEST · AMC UID KASELTENG_`
      }),
      signal: AbortSignal.timeout(150000)
    })
    let shotRes = await doShot()
    let shotJson = await shotRes.json() as { success: boolean, url?: string, wa?: any, error?: string, queued?: boolean }
    // Jika browser crash (--single-process race condition), tunggu 3 detik dan retry
    if (!shotJson.success && shotJson.error && (shotJson.error.includes('closed') || shotJson.error.includes('crashed') || shotJson.error.includes('Target'))) {
      await new Promise(r => setTimeout(r, 3000))
      shotRes = await doShot()
      shotJson = await shotRes.json() as { success: boolean, url?: string, wa?: any, error?: string, queued?: boolean }
    }
    if (!shotJson.success) return c.json({ success: false, error: `Screenshot error: ${shotJson.error}` })

    return c.json({ success: true, tanggal, nomor: nomorFmt, img_url: shotJson.url || '', wa_response: shotJson.wa })
  } catch(e:any) { return c.json({ success: false, error: e.message }, 200) }
})

// ============================================================
// ENDPOINT: /api/hop-last-sent-date (GET/POST) — baca/set KV
// ============================================================
app.get('/api/hop-last-sent-date', async (c) => {
  const val = await kvGet(c.env.DB, 'hop-last-sent-date')
  return c.json({ success: true, date: val || null })
})
app.post('/api/hop-last-sent-date', async (c) => {
  const body = await c.req.json() as any
  if (body?.date) await kvPut(c.env.DB, 'hop-last-sent-date', body.date)
  return c.json({ success: true })
})

// ============================================================
// ENDPOINT: /api/wa-penerima — GET/POST konfigurasi penerima WA auto-kirim
// ============================================================
// GET  /api/wa-penerima?jenis=hop|neraca  → baca penerima saat ini
// POST /api/wa-penerima
//   body: { jenis: "hop"|"neraca", penerima: [{type:"nomor",target:"628xxx"},{type:"grup",target:"AMC UID KASELTENG"}] }
// Format nomor: awali dengan 62 (tanpa +, tanpa 0)
// Contoh set nomor personal: {"jenis":"hop","penerima":[{"type":"nomor","target":"6285388709607"}]}
// Contoh set grup: {"jenis":"neraca","penerima":[{"type":"grup","target":"AMC UID KASELTENG"}]}
// Contoh kirim ke keduanya: {"jenis":"hop","penerima":[{"type":"nomor","target":"6285388709607"},{"type":"grup","target":"AMC UID KASELTENG"}]}
app.get('/api/wa-penerima', async (c) => {
  const jenis = c.req.query('jenis') || 'semua'
  const hopRaw    = await kvGet(c.env.DB, 'wa-penerima-hop')
  const neracaRaw = await kvGet(c.env.DB, 'wa-penerima-neraca')
  const defaultHop    = [{ type: 'grup', target: 'AMC UID KASELTENG' }]
  const defaultNeraca = [{ type: 'grup', target: 'AMC UID KASELTENG' }]
  const hop    = hopRaw    ? JSON.parse(hopRaw)    : defaultHop
  const neraca = neracaRaw ? JSON.parse(neracaRaw) : defaultNeraca
  if (jenis === 'hop')    return c.json({ success: true, jenis: 'hop',    penerima: hop,    sumber: hopRaw ? 'kv' : 'default' })
  if (jenis === 'neraca') return c.json({ success: true, jenis: 'neraca', penerima: neraca, sumber: neracaRaw ? 'kv' : 'default' })
  return c.json({ success: true, hop: { penerima: hop, sumber: hopRaw ? 'kv' : 'default' }, neraca: { penerima: neraca, sumber: neracaRaw ? 'kv' : 'default' } })
})

app.post('/api/wa-penerima', async (c) => {
  try {
    const body = await c.req.json() as any
    const { jenis, penerima } = body
    if (!jenis || !Array.isArray(penerima) || penerima.length === 0) {
      return c.json({ success: false, error: 'Butuh jenis (hop|neraca) dan penerima (array)' }, 400)
    }
    // Validasi format: setiap item harus punya type & target
    for (const p of penerima) {
      if (!p.type || !p.target) return c.json({ success: false, error: `Item penerima tidak valid: ${JSON.stringify(p)}` }, 400)
      if (!['nomor','grup'].includes(p.type)) return c.json({ success: false, error: `type harus "nomor" atau "grup", bukan "${p.type}"` }, 400)
      // Normalisasi nomor: pastikan awali 62
      if (p.type === 'nomor') {
        p.target = p.target.replace(/\D/g, '')
        if (p.target.startsWith('0')) p.target = '62' + p.target.substring(1)
        if (!p.target.startsWith('62')) p.target = '62' + p.target
      }
    }
    const kvKey = jenis === 'hop' ? 'wa-penerima-hop' : jenis === 'neraca' ? 'wa-penerima-neraca' : null
    if (!kvKey) return c.json({ success: false, error: 'jenis harus "hop" atau "neraca"' }, 400)
    await kvPut(c.env.DB, kvKey, JSON.stringify(penerima))
    return c.json({ success: true, jenis, penerima, message: `Penerima ${jenis} berhasil disimpan` })
  } catch(e:any) { return c.json({ success: false, error: e.message }, 400) }
})

// Reset ke default grup
app.delete('/api/wa-penerima', async (c) => {
  const jenis = c.req.query('jenis') || 'semua'
  if (jenis === 'hop' || jenis === 'semua') await kvDelete(c.env.DB, 'wa-penerima-hop')
  if (jenis === 'neraca' || jenis === 'semua') await kvDelete(c.env.DB, 'wa-penerima-neraca')
  return c.json({ success: true, message: `Penerima ${jenis} di-reset ke default (grup AMC UID KASELTENG)` })
})

// ============================================================
// SCHEDULED HANDLER — dipanggil oleh Cloudflare Cron Trigger
// Cron 0: "* * * * *"   → setiap menit — keep-alive ping screenshot service
// Cron 1: "0 2 * * *"   → 02:00 UTC = 10:00 WITA (notif HOP BBM teks)
// Cron 2: "0 3 * * *"   → 03:00 UTC = 11:00 WITA (screenshot HOP BBM → AMC UID KASELTENG)
// Cron 3: "0 12 * * *"  → 12:00 UTC = 20:00 WITA (notif neraca teks ke AMC PRINDAVAN)
// Cron 4-9: "0 10-15 * * *" → 18:00–23:00 WITA
//   → auto-kirim 3 laporan (jika data lengkap & belum pernah dikirim):
//     1. Screenshot HOP BBM (cron setiap menit + MALAM_CRONS)
//     2. Screenshot Neraca Daya (MALAM_CRONS)
//     3. Tabel Neraca Daya teks WA (MALAM_CRONS)
// ============================================================
const MALAM_CRONS = ['0 10 * * *','0 11 * * *','0 12 * * *','0 13 * * *','0 14 * * *','0 15 * * *']
const SCREENSHOT_SERVICE_KEEPALIVE = 'https://screenshot-service-i6l2.onrender.com'
const ORIGIN_PROD = 'https://upasbu.pages.dev'

async function handleScheduled(
  event: ScheduledEvent,
  env: { DB: D1Database },
  _ctx: ExecutionContext
): Promise<void> {
  const db       = env.DB
  const cronExpr = event.cron

  try {
    if (cronExpr === '* * * * *') {
      // Setiap menit — keep-alive ping + cek HOP BBM → screenshot + kirim
      try {
        await fetch(`${SCREENSHOT_SERVICE_KEEPALIVE}/health`, { signal: AbortSignal.timeout(5000) })
      } catch(_) { /* Render free tier: spin-down normal */ }

      const hopResult = await autoKirimHopBbm(db, ORIGIN_PROD)
      if (hopResult.skipped) {
        console.log(`[cron HOP] skip: ${hopResult.reason}`)
      } else if (hopResult.error) {
        console.error(`[cron HOP] error: ${hopResult.error}`)
      } else {
        console.log(`[cron HOP] berhasil: ${hopResult.message}`)
      }

    } else if (cronExpr === '0 2 * * *') {
      // 02:00 UTC = 10:00 WITA — notif HOP BBM teks ke AMC PRINDAVAN
      const { pesan, mentions } = await notifHopBBM(db)
      await kirimPesanGrup(pesan, mentions)

    } else if (MALAM_CRONS.includes(cronExpr)) {
      // 18:00–23:00 WITA — cek neraca malam 19/19 → kirim 3 laporan
      console.log(`[cron ${cronExpr}] Mulai cek 3 laporan malam WITA...`)

      // 1. Screenshot Neraca Daya (jika belum pernah dikirim untuk tanggal ini)
      const ssResult = await autoKirimNeraca(db, ORIGIN_PROD)
      if (ssResult.skipped) {
        console.log(`[cron neraca-screenshot] skip: ${ssResult.reason}`)
      } else if (ssResult.error) {
        console.error(`[cron neraca-screenshot] error: ${ssResult.error}`)
      } else {
        console.log(`[cron neraca-screenshot] berhasil: ${ssResult.message}`)
      }

      // 2. Tabel Neraca Daya teks WA (jika belum pernah dikirim untuk tanggal ini)
      const tblResult = await autoKirimTabelNeraca(db, ORIGIN_PROD)
      if (tblResult.skipped) {
        console.log(`[cron neraca-tabel] skip: ${tblResult.reason}`)
      } else if (tblResult.error) {
        console.error(`[cron neraca-tabel] error: ${tblResult.error}`)
      } else {
        console.log(`[cron neraca-tabel] berhasil: ${tblResult.message}`)
      }

      // 3. Notif teks status neraca daya ke AMC PRINDAVAN (hanya jam 20:00 WITA = 12:00 UTC)
      if (cronExpr === '0 12 * * *') {
        const { pesan, mentions } = await notifNeracaDaya(db)
        await kirimPesanGrup(pesan, mentions)
      }
    }
  } catch(e:any) {
    console.error(`[cron ${cronExpr}] Error:`, e.message)
  }
}

export default {
  fetch: app.fetch,
  scheduled: handleScheduled
}

