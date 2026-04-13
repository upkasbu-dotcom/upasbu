-- Tabel Mesin
CREATE TABLE IF NOT EXISTS mesin (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nama TEXT NOT NULL UNIQUE,
  urutan INTEGER DEFAULT 0,
  aktif INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Data Monitoring Per Jam
CREATE TABLE IF NOT EXISTS data_monitoring (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mesin_id INTEGER NOT NULL,
  tanggal TEXT NOT NULL,        -- format: YYYY-MM-DD
  jam TEXT NOT NULL,            -- format: HH:00
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
);

-- Index untuk performa query
CREATE INDEX IF NOT EXISTS idx_monitoring_mesin_id ON data_monitoring(mesin_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_tanggal ON data_monitoring(tanggal);
CREATE INDEX IF NOT EXISTS idx_monitoring_tanggal_jam ON data_monitoring(tanggal, jam);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_mesin_jam ON data_monitoring(mesin_id, tanggal, jam);

-- Data awal mesin
INSERT OR IGNORE INTO mesin (nama, urutan) VALUES
  ('Mesin 1', 1),
  ('Mesin 2', 2),
  ('Mesin 3', 3);
