-- Tabel cache mesin dari JSON Google Script
CREATE TABLE IF NOT EXISTS mesin_cache (
  id_mesin    INTEGER PRIMARY KEY,
  up3         TEXT NOT NULL,
  kode_unit   INTEGER NOT NULL,
  nama_unit   TEXT NOT NULL,
  mesin       TEXT NOT NULL,
  type        TEXT,
  s_n         TEXT,
  nama_mesin  TEXT,
  cached_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mesin_cache_kode_unit ON mesin_cache(kode_unit);
CREATE INDEX IF NOT EXISTS idx_mesin_cache_up3 ON mesin_cache(up3);

-- Tabel untuk simpan waktu terakhir sync
CREATE TABLE IF NOT EXISTS sync_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  sync_type  TEXT NOT NULL UNIQUE,
  synced_at  TEXT NOT NULL,
  record_count INTEGER DEFAULT 0
);
