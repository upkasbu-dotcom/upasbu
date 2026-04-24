import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()
app.use('/api/*', cors())
// Static files: cache 7 hari di browser, 1 jam di edge
app.use('/static/*', async (c, next) => {
  await next()
  c.res.headers.set('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400')
})
app.use('/static/*', serveStatic({ root: './public' }))

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

    const fileUrl  = (json.data.url || '').replace('https://ibb.co/', 'https://ibb.co.com/') // URL format https://ibb.co.com/xxx
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
  391: { no: 17, jalur: 'DARAT',                kapasitas_tangki: 20000, stock_mati: 1000 }, // TELAGA PULANG
  376: { no: 18, jalur: 'DARAT - LAUT - SUNGAI', kapasitas_tangki: 83000, stock_mati: 5000 }, // MENDAWAI
  373: { no: 19, jalur: 'DARAT',                kapasitas_tangki: 20000, stock_mati: 2000 }, // KENAMBUI
  395: { no: 20, jalur: 'DARAT - SUNGAI',       kapasitas_tangki: 46000, stock_mati: 1000 }, // TUMBANG MANJUL
  375: { no: 21, jalur: 'DARAT',                kapasitas_tangki: 46000, stock_mati: 1000 }, // KUDANGAN
}

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

    if (bulanTanggal === '2026-04') {
      // Bulan April 2026: pakai data referensi statis
      for (const [kode, val] of Object.entries(STOK_AWAL_APRIL_2026)) {
        stokAwalBulanMap[Number(kode)] = val
      }
    } else {
      // Bulan lain: ambil stock_bersih tanggal terakhir bulan sebelumnya dari DB
      // tanggal terakhir bulan sebelumnya = hari terakhir bulan sebelum bulanTanggal
      const [yr, mo] = bulanTanggal.split('-').map(Number)
      const lastDayPrevMonth = new Date(yr, mo - 1, 0).toISOString().split('T')[0] // hari terakhir bulan lalu
      const prevData = await c.env.DB.prepare(
        `SELECT kode_unit, saldo_akhir FROM lap_operasional WHERE tanggal = ? ORDER BY kode_unit`
      ).bind(lastDayPrevMonth).all<{ kode_unit: number, saldo_akhir: number }>()

      if (prevData.results.length > 0) {
        // Hitung stock_bersih = saldo_akhir - stock_mati per unit
        for (const row of prevData.results) {
          const meta = UNIT_META[row.kode_unit]
          const stockMati = meta?.stock_mati ?? 0
          stokAwalBulanMap[row.kode_unit] = Math.max(0, row.saldo_akhir - stockMati)
        }
      } else {
        // Fallback: cari tanggal terakhir yang ada di bulan sebelumnya
        const fallback = await c.env.DB.prepare(`
          SELECT kode_unit, saldo_akhir
          FROM lap_operasional
          WHERE tanggal = (
            SELECT MAX(tanggal) FROM lap_operasional
            WHERE tanggal < ?
          )
        `).bind(bulanTanggal + '-01').all<{ kode_unit: number, saldo_akhir: number }>()
        for (const row of fallback.results) {
          const meta = UNIT_META[row.kode_unit]
          const stockMati = meta?.stock_mati ?? 0
          stokAwalBulanMap[row.kode_unit] = Math.max(0, row.saldo_akhir - stockMati)
        }
      }
    }

    const SAFETY_STOCK_HARI = 3  // hari safety stock

    // Urutkan unit sesuai nomor di UNIT_META, sisanya di akhir
    const sortedUnits = [...units.results].sort((a, b) => {
      const na = UNIT_META[a.kode_unit]?.no ?? 999
      const nb = UNIT_META[b.kode_unit]?.no ?? 999
      return na - nb
    })

    const rows = sortedUnits.map((u) => {
      const meta      = UNIT_META[u.kode_unit]
      const lap       = lapMap[u.kode_unit]
      const avgPakai  = avgMap[u.kode_unit] || null

      const stokAwalBln  = stokAwalBulanMap[u.kode_unit] ?? null
      const stokAwal     = lap?.saldo_akhir ?? null   // STOCK AWAL = Saldo Akhir dari lap. operasional
      const stokAkhir    = lap?.saldo_akhir ?? null
      const penerimaanBbm = lap?.penerimaan_bbm ?? null

      const jalur        = meta?.jalur ?? '-'
      const kapasitasTangki = meta?.kapasitas_tangki ?? null
      const stockMati    = meta?.stock_mati ?? 0
      const noUrut       = meta?.no ?? '-'

      const stockBersih  = stokAkhir !== null ? Math.max(0, stokAkhir - stockMati) : null
      // SAFETY STOCK = STOCK BERSIH / PEMAKAIAN TERTINGGI
      const safetyStock  = (stockBersih !== null && avgPakai !== null && avgPakai > 0)
                           ? Math.round(stockBersih / avgPakai)
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
        rata_rata_harian: avgPakai !== null ? Math.round(avgPakai) : null,
        daya_tampung_storage: dayaTampung,
        bbm_siap_kirim: bbmSiapKirim,
        safety_stock: safetyStock,
        estimasi_bbm_habis: estimasiBbmHabis,
        kondisi_stock: kondisi
      }
    })

    return c.json({ success: true, data: rows })
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
  <title>DILAN [DIGITALISASI LAPORAN]</title>
  <meta name="theme-color" content="#1e3a5f"/>
  <link rel="icon" type="image/x-icon" href="/static/favicon.ico"/>
  <link rel="preload" href="/static/style.css?v=20260425o" as="style"/>
  <link rel="preload" href="/static/app.js?v=20260425o" as="script"/>
  <link href="/static/style.css?v=20260425o" rel="stylesheet"/>
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
          <span class="btn-text">LOG SHEET</span>
        </button>
        <button id="tab-btn-data" class="tab-btn" onclick="switchTab('data')">
          <span class="btn-text">DATA</span>
        </button>
      </div>
      <div class="header-actions" id="header-actions-monitoring">
        <button class="btn btn-success" id="btn-simpan-semua" onclick="saveAllData()" disabled style="opacity:0.5;cursor:not-allowed;">
          <span class="btn-text">Simpan Semua</span>
        </button>
      </div>
      <div class="header-actions" id="header-actions-data" style="display:none;"></div>
      <div class="header-actions" id="header-actions-laporan" style="display:none;">


      </div>
    </div>
  </div>
</header>

<!-- ===== TOOLBAR ===== -->
<div class="toolbar-wrap">
  <!-- Monitoring toolbar -->
  <div id="toolbar-monitoring">
    <div class="toolbar">
      <div class="toolbar-group">
        <label class="toolbar-label">Unit</label>
        <select id="mon-sel-unit" class="toolbar-select" onchange="onMonUnitChange(this.value)">
          <option value="">-- Pilih Unit --</option>
        </select>
      </div>
      <div class="toolbar-group">
        <label class="toolbar-label">Tanggal</label>
        <input type="date" id="sel-tanggal" class="toolbar-input"/>
      </div>
      <div class="toolbar-group">
        <label class="toolbar-label">Jam</label>
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
      <div id="loading-indicator-mesin" class="hidden"><span class="spinner"></span></div>
      <div id="loading-indicator" class="hidden"><span class="spinner"></span></div>
      <span class="toolbar-info" id="info-mesin-count"></span>
      <span class="toolbar-info" id="info-record"></span>
    </div>
  </div>

  <!-- Data toolbar -->
  <div id="toolbar-data" class="hidden">
    <!-- Sub-tab row: HOP BBM | STOCK OLI | REKAP | Tanggal/Filter | info -->
    <div class="data-subtab-row" style="flex-wrap:wrap;gap:4px;">
      <button id="subtab-btn-hop-bbm" class="data-subtab-btn active" onclick="switchDataView('hop-bbm')">
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

      <div id="loading-indicator-data" class="hidden"><span class="spinner"></span></div>
      <span class="toolbar-info" id="info-data-record"></span>
    </div>
  </div>

  <!-- Lap operasional toolbar -->
  <div id="toolbar-laporan" class="hidden">
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
<div id="tab-monitoring" class="tab-content active" style="padding:10px 12px;">
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
<div id="tab-laporan" class="tab-content" style="padding:10px 12px;">
  <div id="lap-state-empty" style="flex-direction:column;"></div>
  <div id="lap-state-pick-unit" style="display:none;flex-direction:column;"></div>
  <div id="lap-form-container" class="hidden" style="max-width:600px;margin:0 auto;width:100%;"></div>
  <div id="lap-review-container" class="hidden" style="max-width:600px;margin:0 auto;width:100%;"></div>
</div>

<!-- ===== TAB: DATA ===== -->
<div id="tab-data" class="tab-content" style="padding:10px 12px;">
  <div id="data-state-empty" style="display:flex;"></div>
  <!-- HOP BBM -->
  <div id="data-table-wrap" class="hidden">
    <div class="table-wrap">
      <table id="data-table" style="width:100%;border-collapse:collapse;">
        <thead id="data-table-head"></thead>
        <tbody id="data-table-body"></tbody>
      </table>
    </div>
  </div>
  <!-- STOCK OLI -->
  <div id="oli-table-wrap" class="hidden">
    <div class="table-wrap">
      <table id="oli-table" style="width:100%;border-collapse:collapse;">
        <thead id="oli-table-head"></thead>
        <tbody id="oli-table-body"></tbody>
      </table>
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

<script src="/static/app.js?v=20260425o" defer></script>
</body>
</html>`
  const resp = c.html(html)
  resp.headers.set('Cache-Control', 'no-cache, must-revalidate')
  return resp
})

export default app
