PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS clinics (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    clinic_id TEXT NOT NULL REFERENCES clinics(id),
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('doctor', 'receptionist')),
    password_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY,
    clinic_id TEXT NOT NULL REFERENCES clinics(id),
    name TEXT NOT NULL,
    birth_year INTEGER NOT NULL,
    sex TEXT NOT NULL,
    UNIQUE(id, clinic_id)
);
CREATE TABLE IF NOT EXISTS encounters (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    clinic_id TEXT NOT NULL,
    occurred_at TEXT NOT NULL,
    reason TEXT NOT NULL,
    clinician TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('Completed', 'In progress', 'Scheduled')),
    UNIQUE(id, patient_id, clinic_id),
    FOREIGN KEY(patient_id, clinic_id) REFERENCES patients(id, clinic_id)
);
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    position INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY,
    patient_id TEXT NOT NULL,
    encounter_id TEXT NOT NULL,
    clinic_id TEXT NOT NULL,
    category_id TEXT NOT NULL REFERENCES categories(id),
    title TEXT NOT NULL,
    created_at TEXT NOT NULL,
    content TEXT NOT NULL,
    search_metadata TEXT NOT NULL,
    FOREIGN KEY(encounter_id, patient_id, clinic_id)
        REFERENCES encounters(id, patient_id, clinic_id)
);
CREATE INDEX IF NOT EXISTS patients_clinic ON patients(clinic_id, name);
CREATE INDEX IF NOT EXISTS encounters_clinic_patient
    ON encounters(clinic_id, patient_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS records_clinic_date ON records(clinic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS records_clinic_category ON records(clinic_id, category_id);
CREATE INDEX IF NOT EXISTS records_clinic_encounter ON records(clinic_id, encounter_id);
CREATE INDEX IF NOT EXISTS records_clinic_patient ON records(clinic_id, patient_id);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);

-- An external-content search index, not a second document store.
CREATE VIRTUAL TABLE IF NOT EXISTS records_fts USING fts5(
    title, content, search_metadata,
    content='records', content_rowid='id', tokenize='unicode61 remove_diacritics 2'
);
CREATE TRIGGER IF NOT EXISTS records_insert AFTER INSERT ON records BEGIN
    INSERT INTO records_fts(rowid, title, content, search_metadata)
    VALUES (new.id, new.title, new.content, new.search_metadata);
END;
CREATE TRIGGER IF NOT EXISTS records_delete AFTER DELETE ON records BEGIN
    INSERT INTO records_fts(records_fts, rowid, title, content, search_metadata)
    VALUES ('delete', old.id, old.title, old.content, old.search_metadata);
END;
CREATE TRIGGER IF NOT EXISTS records_update AFTER UPDATE ON records BEGIN
    INSERT INTO records_fts(records_fts, rowid, title, content, search_metadata)
    VALUES ('delete', old.id, old.title, old.content, old.search_metadata);
    INSERT INTO records_fts(rowid, title, content, search_metadata)
    VALUES (new.id, new.title, new.content, new.search_metadata);
END;
