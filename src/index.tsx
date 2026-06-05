import { Hono } from 'hono'
import { cors } from 'hono/cors'
type Bindings = {
  DB: D1Database
  FILES: KVNamespace
  ASSETS: Fetcher
}

const app = new Hono<{ Bindings: Bindings }>()
app.use('/api/*', cors())
// Static files: serve dari ASSETS binding (Cloudflare Workers Assets)
app.use('/static/*', async (c) => {
  const url = new URL(c.req.url)
  // Strip /static prefix → file path di dist/static/
  const filePath = url.pathname.replace(/^\/static/, '')
  const assetUrl = new URL(filePath, url.origin)
  const response = await c.env.ASSETS.fetch(new Request(assetUrl.toString(), c.req.raw))
  const newRes = new Response(response.body, response)
  newRes.headers.set('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400')
  return newRes
})

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

    // Kirim ke Apps Script (tidak perlu auth, sudah public)
    const resp = await fetch(LOGSHEET_APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' }, // Apps Script butuh text/plain untuk avoid CORS preflight
      body: JSON.stringify({ tanggal, periode, kode_unit, nama_unit, records })
    })
    const json: any = await resp.json()
    if (!json.success) throw new Error(json.error || 'Apps Script error')
    return c.json({ success: true, appended: json.appended })
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

// ── ZIP helper (store-only, no compression) ───────────────────────────────────
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
// Parse ZIP → Map<filename, rawBytes (compressed bytes as-is)>
function _zipParse(buf:Uint8Array):Map<string,{data:Uint8Array,method:number,crc:number,usize:number}>{
  const v=new DataView(buf.buffer,buf.byteOffset,buf.byteLength)
  const m=new Map<string,{data:Uint8Array,method:number,crc:number,usize:number}>()
  let i=0
  while(i<buf.length-4){
    if(v.getUint32(i,true)!==0x04034B50){i++;continue}
    const method=v.getUint16(i+8,true)
    const crc=v.getUint32(i+14,true)
    const cl=v.getUint32(i+18,true)
    const usize=v.getUint32(i+22,true)
    const fl=v.getUint16(i+26,true),el=v.getUint16(i+28,true)
    const fn=new TextDecoder().decode(buf.slice(i+30,i+30+fl))
    const off=i+30+fl+el
    m.set(fn,{data:buf.slice(off,off+cl),method,crc,usize})
    i=off+cl
  }
  return m
}
// Decompress a DEFLATE-compressed entry using DecompressionStream
async function _inflate(compressed:Uint8Array):Promise<Uint8Array>{
  const ds=new DecompressionStream('deflate-raw')
  const writer=ds.writable.getWriter()
  const reader=ds.readable.getReader()
  writer.write(compressed)
  writer.close()
  const chunks:Uint8Array[]=[]
  while(true){const{done,value}=await reader.read();if(done)break;chunks.push(value)}
  return _cat(...chunks)
}
// Repack Map → ZIP (store, uncompressed)
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
// Repack template ZIP: decompress all entries, apply text patches, rebuild as store ZIP
async function zipRepack(tplBytes:Uint8Array, patches:Map<string,string>):Promise<Uint8Array>{
  const parsed=_zipParse(tplBytes)
  const out=new Map<string,Uint8Array>()
  for(const[name,entry] of parsed){
    if(patches.has(name)){
      // Use patched text content
      out.set(name, new TextEncoder().encode(patches.get(name)!))
    } else if(entry.method===8){
      // DEFLATE compressed → decompress first
      out.set(name, await _inflate(entry.data))
    } else {
      // STORE → use as-is
      out.set(name, entry.data)
    }
  }
  return _zipPack(out)
}

// Template: template_harian_uid_kalimantan_selatan_dan_kalimantan_tengah.xlsx (base64)
const NERACA_TEMPLATE_B64 = `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`

// ── buildNeracaXlsx: patch template dengan data dari DB ───────────────────────
// Pendekatan baru (template-injection):
//   1. Load template ZIP → decompress sheet1.xml + sheet2.xml → teks XML asli
//   2. Inject nilai numerik hanya pada sel data tertentu via regex replacement
//      - sheet1: kolom F (DMP) dan H (Beban Puncak) per baris
//      - sheet2: kolom E (DTP), F (DMN), G (MAKS) per baris
//   3. Repack ZIP dengan sheet1/sheet2 baru, semua file lain dari template (decompressed)
// TIDAK ADA cell, row, kolom, style, merge, sharedString, dsb yang dibuat ulang
async function buildNeracaXlsx(rows: any[], tanggal: string): Promise<Uint8Array> {
  const NERACA_ORDER = [399,390,382,391,376,373,395,375,366,910,911,385,913,915,920,917,918,919,372]
  // ID (kolom B) sesuai template sharedStrings index 17-37
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

  // ── Load template ZIP dan decompress sheet1.xml + sheet2.xml ──────────────
  const templateZip = b64ToU8(NERACA_TEMPLATE_B64)
  const parsed = _zipParse(templateZip)

  // Helper: dekompresi entry ZIP (DEFLATE method=8, STORE method=0)
  const dec = new TextDecoder()
  async function getEntryText(name: string): Promise<string> {
    const e = parsed.get(name)
    if (!e) throw new Error(`Entry not found: ${name}`)
    if (e.method === 8) {
      return dec.decode(await _inflate(e.data))
    }
    return dec.decode(e.data)
  }

  // ── Ambil XML asli dari template ──────────────────────────────────────────
  let sheet1Xml = await getEntryText('xl/worksheets/sheet1.xml')
  let sheet2Xml = await getEntryText('xl/worksheets/sheet2.xml')

  // ── Helper: inject nilai numerik ke sel tertentu ───────────────────────────
  // Template cells sheet1 (F,H per row) empty: <c r="F2" s="6"/>
  // Template cells sheet1 (F,H per row) with value: <c r="F2" s="6"><v>...</v></c>
  // Kita ganti: <c r="Xn" s="..."/> → <c r="Xn" s="..."><v>val</v></c>
  //         atau <c r="Xn" s="..."><v>existing</v></c> → <c r="Xn" s="..."><v>val</v></c>
  function injectNum(xml: string, cellRef: string, val: number|null): string {
    if (val === null) return xml // kosongkan: biarkan sel empty dari template
    // Ganti sel empty <c r="Xn" s="N"/> atau <c r="Xn" s="N" t="..."/>  → dengan value
    // Pola: <c r="CELLREF" ... /> (self-closing) atau <c r="CELLREF" ...><v>old</v></c>
    const escaped = cellRef.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // Self-closing tanpa value
    xml = xml.replace(
      new RegExp(`(<c r="${escaped}"[^>]*?)/>`, 'g'),
      `$1><v>${val}</v></c>`
    )
    // Sudah ada value — ganti value lama
    xml = xml.replace(
      new RegExp(`(<c r="${escaped}"[^>]*>)<v>[^<]*</v></c>`, 'g'),
      `$1<v>${val}</v></c>`
    )
    return xml
  }

  // ── Patch sheet1.xml: inject DMP (kolom F) dan Beban Puncak (kolom H) ────
  // Template: row 2,3=ULD#1 siang/malam, row 4,5=ULD#2, dst. (F=DMP, H=BP)
  sorted.forEach((r, i) => {
    const rSiang = 2 + i * 2      // row siang (baris ganjil di Excel)
    const rMalam = 2 + i * 2 + 1 // row malam (baris genap di Excel)
    const dmp = toMW(r.dm_pasok != null ? r.dm_pasok : r.dm_terpasang)
    const bpS = toMW(r.beban_puncak_siang)
    const bpM = toMW(r.beban_puncak_malam)
    // Kolom F = DMP (sama untuk siang dan malam)
    sheet1Xml = injectNum(sheet1Xml, `F${rSiang}`, dmp)
    sheet1Xml = injectNum(sheet1Xml, `F${rMalam}`, dmp)
    // Kolom H = Beban Puncak
    sheet1Xml = injectNum(sheet1Xml, `H${rSiang}`, bpS)
    sheet1Xml = injectNum(sheet1Xml, `H${rMalam}`, bpM)
  })

  // ── Patch sheet2.xml: inject DTP (E), DMN (F), MAKS (G) per baris ────────
  // Template: row 2=ULD#1, row 3=ULD#2, dst.
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

  // ── Repack ZIP: semua entry dari template di-decompress, patch sheet1+sheet2 ─
  const patches = new Map<string, string>([
    ['xl/worksheets/sheet1.xml', sheet1Xml],
    ['xl/worksheets/sheet2.xml', sheet2Xml],
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

    const xlsxBytes = await buildNeracaXlsx(rows, tanggal)
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
  } catch(e:any) { return c.json({ error: String(e) }, 500) }
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
    const xlsxBytes = await buildNeracaXlsx(rows, tanggal)
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
  } catch(e:any) { return c.json({ error: String(e) }, 500) }
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
    // Simpan base64 ke KV dengan TTL 24 jam
    await c.env.FILES.put(key, data, { expirationTtl: 86400, metadata: { filename } })
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
    const { value, metadata } = await c.env.FILES.getWithMetadata<{ filename: string }>(key)
    if (!value) return c.json({ error: 'File tidak ditemukan atau sudah kedaluwarsa' }, 404)
    const filename = metadata?.filename || 'neraca.xlsx'
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
    const svg = await c.env.FILES.get(key)
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
    const b64 = await c.env.FILES.get(key)
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
    const val = await c.env.FILES.get('neraca-last-sent-date')
    return c.json({ success: true, tanggal: val || null })
  } catch (e: any) { return c.json({ success: false, error: e.message }, 500) }
})

app.post('/api/neraca-last-sent-date', async (c) => {
  try {
    const { tanggal } = await c.req.json<{ tanggal: string }>()
    if (!tanggal || !/^\d{4}-\d{2}-\d{2}$/.test(tanggal))
      return c.json({ success: false, error: 'tanggal wajib format YYYY-MM-DD' }, 400)
    await c.env.FILES.put('neraca-last-sent-date', tanggal)
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
    const result = await autoKirimNeraca(c.env.DB, c.env.FILES, origin)

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

    // 2. Kirim ke WA Group via Whacenter
    const DEVICE_ID  = '550fd04ee9fc7c4b4e057d0bce6270f3'
    const GROUP_NAME = 'AMC UID KASELTENG'
    const tglFmt    = tanggal.split('-').reverse().join('.')  // DD.MM.YYYY
    const message   = `📊 *Neraca Daya ${tglFmt}*\nRingkasan neraca daya harian seluruh ULD.`

    const waForm = new FormData()
    waForm.append('device_id', DEVICE_ID)
    waForm.append('group',     GROUP_NAME)
    waForm.append('message',   message)
    waForm.append('file',      imgUrl)

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
const WHACENTER_NUMBER    = '6282252147896'

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
    if (lines.length < 2) return c.json({ success: false, error: 'Spreadsheet kosong' }, 400)

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

    if (jadwalSet.size === 0) return c.json({ success: false, error: 'Tidak ada jadwal valid ditemukan di kolom Z' }, 400)

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
  <link rel="icon" type="image/x-icon" href="/static/favicon.ico"/>
  <link rel="icon" type="image/png" sizes="192x192" href="/static/icon-192.png"/>
  <link rel="icon" type="image/png" sizes="512x512" href="/static/icon-512.png"/>
  <link rel="apple-touch-icon" sizes="180x180" href="/static/apple-touch-icon.png"/>
  <link rel="preload" href="/static/style.css?v=20260516k" as="style"/>
  <link rel="preload" href="/static/app-v2.js" as="script"/>
  <link href="/static/style.css?v=20260516k" rel="stylesheet"/>
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
<script src="/static/app-v2.js"></script>
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
// HELPER: AUTO-KIRIM NERACA DAYA (screenshot + excel ke WA Grup)
// Dipanggil dari cron malam DAN dari endpoint /api/neraca-auto-kirim
// Parameter origin: base URL Pages (untuk membentuk excel URL)
// ============================================================
async function autoKirimNeraca(
  db: D1Database,
  kv: KVNamespace,
  origin: string   // mis. "https://mesin-monitor.pages.dev"
): Promise<{ skipped?: boolean, reason?: string, tanggal?: string, error?: string, message?: string }> {

  const NERACA_ORDER   = [399,390,382,391,376,373,395,375,366,910,911,385,913,915,920,917,918,919,372]
  const REQUIRED_COUNT = NERACA_ORDER.length  // 19
  const DEVICE_ID      = '550fd04ee9fc7c4b4e057d0bce6270f3'
  const GROUP_NAME     = 'AMC UID KASELTENG'
  const SCREENSHOT_SERVICE_URL = 'https://3001-ixws25249u6ccmhjmwoyc-18e660f9.sandbox.novita.ai'

  // ── 1. Cari tanggal_lengkap: 19/19 ULD punya record MALAM ────────────────
  const candidates = await db.prepare(`
    SELECT DISTINCT dm.tanggal
    FROM data_monitoring dm
    JOIN mesin_cache mc ON dm.mesin_id = mc.id_mesin
    WHERE mc.kode_unit IN (${NERACA_ORDER.join(',')})
    ORDER BY dm.tanggal DESC
    LIMIT 30
  `).all<{ tanggal: string }>()

  let tanggalLengkap: string | null = null
  for (const row of candidates.results) {
    const check = await db.prepare(`
      SELECT
        COUNT(DISTINCT CASE
          WHEN CAST(dm.jam AS INTEGER) >= 18 OR CAST(dm.jam AS INTEGER) <= 5
          THEN mc.kode_unit END) as cnt_malam
      FROM data_monitoring dm
      JOIN mesin_cache mc ON dm.mesin_id = mc.id_mesin
      WHERE dm.tanggal = ?
        AND mc.kode_unit IN (${NERACA_ORDER.join(',')})
    `).bind(row.tanggal).first<{ cnt_malam: number }>()
    if ((check?.cnt_malam ?? 0) >= REQUIRED_COUNT) {
      tanggalLengkap = row.tanggal
      break
    }
  }

  if (!tanggalLengkap) {
    return { skipped: true, reason: 'Belum ada data beban puncak malam lengkap 19/19 dalam 30 hari terakhir' }
  }

  // ── 2. Anti-duplikat: cek KV ─────────────────────────────────────────────
  const lastSentDate = await kv.get('neraca-last-sent-date')
  if (lastSentDate && tanggalLengkap <= lastSentDate) {
    return {
      skipped: true,
      reason: `Sudah dikirim untuk tanggal ${tanggalLengkap} (last_sent: ${lastSentDate})`,
      tanggal: tanggalLengkap
    }
  }

  const tanggalKirim = tanggalLengkap
  const tglFmt = tanggalKirim.split('-').reverse().join('.')

  // ── 3. Screenshot via Playwright service ─────────────────────────────────
  let imgUrl = ''
  try {
    const ssRes = await fetch(`${SCREENSHOT_SERVICE_URL}/screenshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tanggal: tanggalKirim }),
      signal: AbortSignal.timeout(60000)
    })
    const ssJson = await ssRes.json() as { success: boolean, url?: string, error?: string }
    if (ssJson.success && ssJson.url) imgUrl = ssJson.url
  } catch(e: any) {
    console.error('[autoKirimNeraca] Screenshot service error:', e.message)
  }
  if (!imgUrl) {
    return { error: 'Screenshot service tidak tersedia. Pastikan sandbox aktif.' }
  }

  // ── 4. Kirim screenshot ke WA Grup AMC UID KASELTENG ─────────────────────
  const waForm = new FormData()
  waForm.append('device_id', DEVICE_ID)
  waForm.append('group',     GROUP_NAME)
  waForm.append('message',   `📊 *Neraca Daya ${tglFmt}*\nTabel Neraca Daya seluruh ULD (No s/d Status)`)
  waForm.append('file',      imgUrl)
  const waRes  = await fetch('https://app.whacenter.com/api/sendGroup', { method:'POST', body:waForm })
  const waJson = await waRes.json() as { status:boolean, message:string }
  if (!waJson.status) {
    return { error: `Screenshot WA gagal: ${waJson.message}` }
  }

  // ── 5. Kirim URL Excel ke grup ────────────────────────────────────────────
  let excelSent = false
  try {
    const excelUrl  = `${origin}/api/xlsx?tanggal=${tanggalKirim}`
    const excelMsg  = `📥 *Download Excel Neraca Daya ${tglFmt}*\nUID KSKT ${tglFmt}.xlsx\n\n${excelUrl}`
    const waExcelForm = new FormData()
    waExcelForm.append('device_id', DEVICE_ID)
    waExcelForm.append('group',     GROUP_NAME)
    waExcelForm.append('message',   excelMsg)
    const waExcelRes  = await fetch('https://app.whacenter.com/api/sendGroup', { method:'POST', body:waExcelForm })
    const waExcelJson = await waExcelRes.json() as { status:boolean, message:string }
    excelSent = waExcelJson.status
  } catch(_) { /* tidak blocking */ }

  // ── 6. Notif ke AMC PRINDAVAN ─────────────────────────────────────────────
  let prindavanSent = false
  try {
    const msgPrindavan =
      `✅ *Neraca Daya ${tglFmt}*\n` +
      `Data malam seluruh *19 ULD* sudah lengkap.\n` +
      `Laporan telah dikirim ke grup AMC UID KALSELTENG.`
    const waPrindavan = new FormData()
    waPrindavan.append('device_id', DEVICE_ID)
    waPrindavan.append('group',     'AMC PRINDAVAN')
    waPrindavan.append('message',   msgPrindavan)
    const resPrindavan = await fetch('https://app.whacenter.com/api/sendGroup', { method:'POST', body:waPrindavan })
    const jsonPrindavan = await resPrindavan.json() as { status:boolean, message:string }
    prindavanSent = jsonPrindavan.status
  } catch(_) { /* tidak blocking */ }

  // ── 7. Update KV last-sent-date ───────────────────────────────────────────
  await kv.put('neraca-last-sent-date', tanggalKirim)

  return {
    tanggal: tanggalKirim,
    message: `Screenshot${excelSent ? ' + Excel' : ''} dikirim ke grup WA AMC UID KASELTENG (${tglFmt})${prindavanSent ? ' + notif ke AMC PRINDAVAN' : ''}`
  }
}

// ============================================================
// HELPER: AUTO-KIRIM HOP BBM (screenshot tabel HOP → WA Grup)
// Dipanggil dari cron jam 03:00 UTC = 11:00 WITA
// Data pakai H-1 (tanggal kemarin)
// ============================================================
async function autoKirimHopBbm(
  kv: KVNamespace,
  origin: string
): Promise<{ skipped?: boolean, reason?: string, tanggal?: string, error?: string, message?: string }> {

  const SCREENSHOT_SERVICE_URL = 'https://3001-ixws25249u6ccmhjmwoyc-18e660f9.sandbox.novita.ai'
  const DEVICE_ID  = '550fd04ee9fc7c4b4e057d0bce6270f3'
  const GROUP_NAME = 'AMC UID KASELTENG'

  // Tanggal H-1 WITA
  const nowWita = new Date(new Date().getTime() + 8 * 60 * 60 * 1000)
  nowWita.setDate(nowWita.getDate() - 1)
  const tanggal = nowWita.toISOString().split('T')[0]  // YYYY-MM-DD H-1

  // Anti-duplikat: cek KV
  const lastSent = await kv.get('hop-last-sent-date')
  if (lastSent && tanggal <= lastSent) {
    return { skipped: true, reason: `Sudah dikirim untuk tanggal ${tanggal} (last_sent: ${lastSent})`, tanggal }
  }

  // Screenshot via Playwright service
  let imgUrl = ''
  try {
    const ssRes = await fetch(`${SCREENSHOT_SERVICE_URL}/screenshot-hop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tanggal }),
      signal: AbortSignal.timeout(90000)
    })
    const ssJson = await ssRes.json() as { success: boolean, url?: string, error?: string }
    if (ssJson.success && ssJson.url) imgUrl = ssJson.url
    else return { error: `Screenshot HOP gagal: ${ssJson.error || 'unknown'}` }
  } catch(e: any) {
    return { error: `Screenshot service tidak tersedia: ${e.message}` }
  }

  // Kirim ke WA Grup AMC UID KASELTENG
  const tglFmt = tanggal.split('-').reverse().join('.')
  const waForm = new FormData()
  waForm.append('device_id', DEVICE_ID)
  waForm.append('group',     GROUP_NAME)
  waForm.append('message',   `📊 *HOP BBM KALSELTENG — ${tglFmt}*\nData stok & estimasi BBM per ULD (data H-1)\n_AMC UID KASELTENG_`)
  waForm.append('file',      imgUrl)

  const waRes = await fetch('https://app.whacenter.com/api/sendGroup', {
    method: 'POST',
    body: waForm
  })
  const waJson = await waRes.json() as any
  if (!waJson.status) {
    return { error: `Whacenter sendGroup error: ${waJson.message}` }
  }

  // Update KV anti-duplikat
  await kv.put('hop-last-sent-date', tanggal)

  return {
    tanggal,
    message: `Screenshot HOP BBM dikirim ke grup WA ${GROUP_NAME} (${tglFmt})`
  }
}

// ============================================================
// ENDPOINT: /api/hop-auto-kirim (GET) — trigger manual / test
// ============================================================
app.get('/api/hop-auto-kirim', async (c) => {
  try {
    const origin = new URL(c.req.url).origin
    const result = await autoKirimHopBbm(c.env.FILES, origin)
    if (result.error)   return c.json({ success: false, error: result.error }, 200)
    if (result.skipped) return c.json({ success: true, skipped: true, reason: result.reason, tanggal: result.tanggal })
    return c.json({ success: true, tanggal: result.tanggal, message: result.message })
  } catch(e:any) { return c.json({ success: false, error: e.message }, 200) }
})

// ============================================================
// ENDPOINT: /api/hop-last-sent-date (GET/POST) — baca/set KV
// ============================================================
app.get('/api/hop-last-sent-date', async (c) => {
  const val = await c.env.FILES.get('hop-last-sent-date')
  return c.json({ success: true, date: val || null })
})
app.post('/api/hop-last-sent-date', async (c) => {
  const body = await c.req.json() as any
  if (body?.date) await c.env.FILES.put('hop-last-sent-date', body.date)
  return c.json({ success: true })
})

// ============================================================
// SCHEDULED HANDLER — dipanggil oleh Cloudflare Cron Trigger
// Cron 0: "* * * * *"   → setiap menit — keep-alive ping screenshot service
// Cron 1: "0 2 * * *"   → 02:00 UTC = 10:00 WITA (notif HOP BBM teks)
// Cron 2: "0 3 * * *"   → 03:00 UTC = 11:00 WITA (screenshot HOP BBM → AMC UID KASELTENG)
// Cron 3: "0 12 * * *"  → 12:00 UTC = 20:00 WITA (notif neraca teks ke AMC PRINDAVAN)
// Cron 4-9: "0 10-15 * * *" → 18:00–23:00 WITA (auto-kirim neraca screenshot+excel ke AMC UID KASELTENG)
// ============================================================
const MALAM_CRONS = ['0 10 * * *','0 11 * * *','0 12 * * *','0 13 * * *','0 14 * * *','0 15 * * *']
const SCREENSHOT_SERVICE_KEEPALIVE = 'https://3001-ixws25249u6ccmhjmwoyc-18e660f9.sandbox.novita.ai'

async function handleScheduled(
  event: ScheduledEvent,
  env: { DB: D1Database, FILES: KVNamespace },
  _ctx: ExecutionContext
): Promise<void> {
  const db       = env.DB
  const cronExpr = event.cron

  try {
    if (cronExpr === '* * * * *') {
      // Setiap menit — keep-alive ping agar sandbox tidak sleep
      try {
        await fetch(`${SCREENSHOT_SERVICE_KEEPALIVE}/health`, { signal: AbortSignal.timeout(5000) })
      } catch(_) { /* sandbox sedang sleep, tidak apa-apa */ }

    } else if (cronExpr === '0 2 * * *') {
      // 02:00 UTC = 10:00 WITA — notif HOP BBM teks ke AMC PRINDAVAN
      const { pesan, mentions } = await notifHopBBM(db)
      await kirimPesanGrup(pesan, mentions)

    } else if (cronExpr === '0 3 * * *') {
      // 03:00 UTC = 11:00 WITA — screenshot HOP BBM H-1 → AMC UID KASELTENG
      console.log(`[cron ${cronExpr}] Mulai screenshot HOP BBM H-1...`)
      const result = await autoKirimHopBbm(env.FILES, 'https://mesin-monitor.pages.dev')
      if (result.skipped) {
        console.log(`[cron ${cronExpr}] Skipped: ${result.reason}`)
      } else if (result.error) {
        console.error(`[cron ${cronExpr}] Error: ${result.error}`)
      } else {
        console.log(`[cron ${cronExpr}] Berhasil: ${result.message}`)
      }

    } else if (MALAM_CRONS.includes(cronExpr)) {
      // 18:00–23:00 WITA — cek malam 19/19 → screenshot + excel ke AMC UID KASELTENG
      console.log(`[cron ${cronExpr}] Mulai cek neraca malam WITA...`)
      const result = await autoKirimNeraca(db, env.FILES, 'https://mesin-monitor.pages.dev')
      if (result.skipped) {
        console.log(`[cron ${cronExpr}] Skipped: ${result.reason}`)
      } else if (result.error) {
        console.error(`[cron ${cronExpr}] Error: ${result.error}`)
      } else {
        console.log(`[cron ${cronExpr}] Berhasil: ${result.message}`)
      }

      // Notif teks neraca daya ke AMC PRINDAVAN (hanya jam 20:00 WITA = 12:00 UTC)
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

