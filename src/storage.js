import { mkdirSync, closeSync, openSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export class ThoughtStore {
  constructor(path) {
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    closeSync(openSync(path, 'a', 0o600));
    this.db = new DatabaseSync(path);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS fragments (
        id INTEGER PRIMARY KEY,
        text TEXT NOT NULL,
        received_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS analyses (
        version INTEGER PRIMARY KEY,
        status TEXT NOT NULL,
        snapshot TEXT NOT NULL,
        source TEXT NOT NULL,
        result TEXT,
        error TEXT,
        created_at TEXT NOT NULL
      );
    `);
    if (!this.db.prepare('PRAGMA table_info(analyses)').all().some(column => column.name === 'checkpoint')) {
      this.db.exec('ALTER TABLE analyses ADD COLUMN checkpoint TEXT');
    }
    this.insert = this.db.prepare('INSERT INTO fragments (text, received_at) VALUES (?, ?)');
  }

  capture(text) {
    this.insert.run(text, new Date().toISOString());
    return { received: true, pending_count: this.pendingCount() };
  }

  pendingCount() {
    return this.db.prepare(`SELECT COUNT(*) AS count FROM fragments WHERE id >
      (SELECT COALESCE(MAX(version), 0) FROM analyses WHERE status = 'ready')`).get().count;
  }

  snapshot() {
    const fragments = this.db.prepare('SELECT * FROM fragments ORDER BY id').all();
    return { version: fragments.at(-1)?.id ?? 0, fragments };
  }

  analysis(version) {
    const row = this.db.prepare('SELECT * FROM analyses WHERE version = ?').get(version);
    return row && { ...row, snapshot: JSON.parse(row.snapshot), result: row.result && JSON.parse(row.result), checkpoint: row.checkpoint && JSON.parse(row.checkpoint) };
  }

  recoverInterrupted() {
    this.db.exec("UPDATE analyses SET status = 'failed', error = 'interrupted' WHERE status = 'analyzing'");
  }

  startAnalysis(snapshot, source) {
    this.db.prepare(`INSERT INTO analyses (version, status, snapshot, source, created_at)
      VALUES (?, 'analyzing', ?, ?, ?)
      ON CONFLICT(version) DO UPDATE SET status = 'analyzing', source = excluded.source,
        result = NULL, error = NULL, created_at = excluded.created_at
      WHERE analyses.status = 'failed'`).run(snapshot.version, JSON.stringify(snapshot.fragments), source, new Date().toISOString());
  }

  finishAnalysis(version, result, error = null) {
    this.db.prepare(`UPDATE analyses SET status = ?, result = ?, error = ?
      WHERE version = ? AND status = 'analyzing'`).run(error ? 'failed' : 'ready', result ? JSON.stringify(result) : null, error, version);
  }

  saveCheckpoint(version, checkpoint) {
    this.db.prepare("UPDATE analyses SET checkpoint = ? WHERE version = ? AND status = 'analyzing'")
      .run(JSON.stringify(checkpoint), version);
  }

  close() {
    this.db.close();
  }
}
