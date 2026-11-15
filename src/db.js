const Database = require('better-sqlite3');
const crypto = require('node:crypto');
const {cleanText} = require('./core');

const seeds = [
  ['AI calling platform','Problem: Build an AI calling platform. Responsibilities: End-to-end ownership including requirements from relationship managers, product decisions, UI design, testing, and production release. Architecture: React, Node.js, MongoDB, Redis. Scale: post-call webhook bursts above 1,000 requests per second. Trade-offs, failure modes, and measurable outcomes: fill in with verified details.'],
  ['Realtime updates','SSE updates are batched every 10 seconds. Start, Pause, and Stop events are sent immediately. Record the reason for the batching choice and the measured impact before claiming either.'],
  ['Webhook reliability','Webhook idempotency, Redis locking, retries, and dead-letter handling were used. Fill in exact ownership, retry policy, lock lifetime, failure modes, and measured results.'],
  ['Other projects','WhatsApp loan qualification, Exotel Click-to-Call, and Gemini-assisted bank MIS reconciliation. Add the problem, personal responsibilities, architecture, scale, trade-offs, failure modes, and measurable outcomes for each.']
];
class Store {
  constructor(file) {
    this.db = new Database(file);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`CREATE TABLE IF NOT EXISTS notes(id TEXT PRIMARY KEY, title TEXT NOT NULL, body TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'note', updated_at TEXT NOT NULL);
      CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(title, body, content='notes', content_rowid='rowid');
      CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN INSERT INTO notes_fts(rowid,title,body) VALUES(new.rowid,new.title,new.body); END;
      CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN INSERT INTO notes_fts(notes_fts,rowid,title,body) VALUES('delete',old.rowid,old.title,old.body); END;
      CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN INSERT INTO notes_fts(notes_fts,rowid,title,body) VALUES('delete',old.rowid,old.title,old.body); INSERT INTO notes_fts(rowid,title,body) VALUES(new.rowid,new.title,new.body); END;
      CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY, created_at TEXT NOT NULL, mode TEXT NOT NULL, summary TEXT NOT NULL DEFAULT '');
      CREATE TABLE IF NOT EXISTS turns(id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE, role TEXT NOT NULL, source TEXT, text TEXT NOT NULL, created_at TEXT NOT NULL, latency_json TEXT);
      CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT NOT NULL);`);
    this.db.pragma('foreign_keys = ON');
    if (!this.db.prepare('SELECT 1 FROM notes LIMIT 1').get()) for (const [title,body] of seeds) this.saveNote({title,body,kind:'project'});
  }
  id(){return crypto.randomUUID();}
  saveNote({id,title,body,kind='note'}) {
    id=id || this.id(); title=cleanText(title,200); body=cleanText(body,100000);
    if(typeof id!=='string'||id.length>100)throw new Error('Invalid note ID');
    if (!title || !body) throw new Error('Title and text are required');
    if (!['note','project','resume','job'].includes(kind)) throw new Error('Invalid note kind');
    this.db.prepare(`INSERT INTO notes(id,title,body,kind,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,body=excluded.body,kind=excluded.kind,updated_at=excluded.updated_at`).run(id,title,body,kind,new Date().toISOString());
    return id;
  }
  notes(){return this.db.prepare('SELECT * FROM notes ORDER BY updated_at DESC').all();}
  note(id){return this.db.prepare('SELECT * FROM notes WHERE id=?').get(id);}
  deleteNote(id){this.db.prepare('DELETE FROM notes WHERE id=?').run(id);}
  search(question, limit=4) {
    const words = [...new Set(cleanText(question,2000).toLowerCase().match(/[a-z0-9]{3,}/g)||[])].slice(0,12);
    if (!words.length) return [];
    return this.db.prepare(`SELECT notes.*, bm25(notes_fts) AS rank FROM notes_fts JOIN notes ON notes_fts.rowid=notes.rowid WHERE notes_fts MATCH ? ORDER BY rank LIMIT ?`).all(words.map(w=>`"${w}"`).join(' OR '),limit);
  }
  createSession(mode){const id=this.id();this.db.prepare('INSERT INTO sessions(id,created_at,mode) VALUES(?,?,?)').run(id,new Date().toISOString(),mode);return id;}
  sessions(){return this.db.prepare('SELECT * FROM sessions ORDER BY created_at DESC').all();}
  session(id){return this.db.prepare('SELECT * FROM sessions WHERE id=?').get(id);}
  updateSummary(id,fragment){const existing=this.session(id)?.summary||'';this.db.prepare('UPDATE sessions SET summary=? WHERE id=?').run((existing+'\n'+cleanText(fragment,350)).trim().slice(-1200),id);}
  turns(id){return this.db.prepare('SELECT * FROM turns WHERE session_id=? ORDER BY created_at,rowid').all(id);}
  addTurn(sessionId,role,text,source='',latency=null){
    const id=this.id();
    this.db.prepare('INSERT INTO turns(id,session_id,role,source,text,created_at,latency_json) VALUES(?,?,?,?,?,?,?)').run(id,sessionId,role,cleanText(text,100000),source,new Date().toISOString(),latency ? JSON.stringify(latency):null);
    return id;
  }
  updateTurn(id,text){this.db.prepare('UPDATE turns SET text=? WHERE id=?').run(cleanText(text,100000),id);}
  deleteSession(id){this.db.prepare('DELETE FROM sessions WHERE id=?').run(id);}
  getSetting(key, fallback=null){const row=this.db.prepare('SELECT value FROM settings WHERE key=?').get(key);return row?JSON.parse(row.value):fallback;}
  setSetting(key,value){this.db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key,JSON.stringify(value));}
  close(){this.db.close();}
}
module.exports={Store};
