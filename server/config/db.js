const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { DatabaseSync } = require('node:sqlite');
const mongoose = require('mongoose');

let isMongo = false;
let db = null;

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'problembridge.db');
db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

function ensureSqliteColumns() {
  const tableColumns = {
    problems: ['workflowHistoryJson', 'reviewerStatus', 'lastUpdatedBy'],
    solutions: ['workflowHistoryJson', 'reviewedBy', 'reviewerNotes'],
    challenges: ['workflowHistoryJson']
  };

  Object.entries(tableColumns).forEach(([tableName, columns]) => {
    try {
      const existing = db.prepare(`PRAGMA table_info(${tableName})`).all();
      const existingColumns = new Set(existing.map(column => column.name));
      columns.forEach(column => {
        if (!existingColumns.has(column)) {
          db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${column} TEXT DEFAULT '[]'`);
        }
      });
    } catch (err) {
      console.warn(`Unable to ensure SQLite migration for ${tableName}:`, err.message);
    }
  });
}

function initSqliteSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      fullName TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      role TEXT NOT NULL,
      mobileNumber TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS problems (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      location TEXT DEFAULT 'Not provided',
      evidenceUrl TEXT,
      contact TEXT,
      authorId TEXT,
      authorName TEXT,
      route TEXT NOT NULL,
      urgency TEXT NOT NULL,
      score INTEGER NOT NULL,
      duplicate INTEGER DEFAULT 0,
      recurring INTEGER DEFAULT 0,
      similarReports INTEGER DEFAULT 0,
      assignedAuthority TEXT,
      recommendation TEXT,
      peopleAffected TEXT,
      innovationPotential TEXT,
      rootCausesJson TEXT,
      techSuggestionsJson TEXT,
      authorityStatus TEXT DEFAULT 'Forwarded to Concerned Authority',
      citizenVerification TEXT DEFAULT '',
      supportCount INTEGER DEFAULT 0,
      workflowHistoryJson TEXT DEFAULT '[]',
      reviewerStatus TEXT DEFAULT '',
      lastUpdatedBy TEXT DEFAULT '',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS challenges (
      id TEXT PRIMARY KEY,
      problemId TEXT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      problem TEXT NOT NULL,
      challengeQuestion TEXT,
      skillsJson TEXT,
      expectedImpact TEXT,
      watchersCount INTEGER DEFAULT 0,
      featured INTEGER DEFAULT 0,
      workflowHistoryJson TEXT DEFAULT '[]',
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS solutions (
      id TEXT PRIMARY KEY,
      challengeId TEXT,
      problemId TEXT,
      authorId TEXT,
      authorName TEXT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      technology TEXT,
      team TEXT,
      impact TEXT,
      status TEXT DEFAULT 'Proposed',
      progressPercent INTEGER DEFAULT 10,
      websiteUrl TEXT,
      sourceCodeUrl TEXT,
      demoUrl TEXT,
      evidenceFilesJson TEXT,
      workflowHistoryJson TEXT DEFAULT '[]',
      reviewedBy TEXT DEFAULT '',
      reviewerNotes TEXT DEFAULT '',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS challenge_watchers (
      challengeId TEXT NOT NULL,
      userId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      PRIMARY KEY (challengeId, userId)
    );

    CREATE TABLE IF NOT EXISTS problem_supporters (
      problemId TEXT NOT NULL,
      userId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      PRIMARY KEY (problemId, userId)
    );
  `);

  ensureSqliteColumns();
}

async function connectDatabase() {
  const mongoUri = process.env.MONGODB_URI;
  if (mongoUri) {
    try {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
      isMongo = true;
      console.log(` Connected to MongoDB successfully at: ${mongoUri}`);
      return { isMongo: true, type: 'mongodb' };
    } catch (err) {
      console.warn(` MongoDB connection failed (${err.message}). Falling back to local zero-config SQLite database.`);
      isMongo = false;
    }
  }

  initSqliteSchema();
  return { isMongo: false, type: 'sqlite' };
}

initSqliteSchema();

module.exports = {
  db,
  isMongo: () => isMongo,
  connectDatabase,
  initSchema: initSqliteSchema
};
