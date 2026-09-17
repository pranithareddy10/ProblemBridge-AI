const { db, isMongo } = require('../config/db');
const { User, Problem, Challenge, Solution } = require('./mongoModels');

function parseJsonSafe(value, fallback = []) {
  if (!value) return fallback;
  try {
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch (e) {
    return fallback;
  }
}

function normalizeWorkflowHistory(raw) {
  const parsed = parseJsonSafe(raw, []);
  return Array.isArray(parsed) ? parsed : [];
}

function appendWorkflowEvent(history, event) {
  const next = Array.isArray(history) ? history : [];
  next.push({
    ...event,
    timestamp: event.timestamp || new Date().toISOString()
  });
  return next;
}

const progressMap = {
  'Proposed': 10,
  'In Development': 30,
  'Testing': 50,
  'Ready for Review': 70,
  'Implemented': 90,
  'Problem Solved': 100
};

const validRoles = [
  'Citizen',
  'Student / Innovator',
  'Authority / Organization',
  'Admin / Reviewer'
];

const UserRepository = {
  async createUser({ id, fullName, email, passwordHash, role, mobileNumber }) {
    if (isMongo()) {
      const doc = await User.create({
        id,
        fullName,
        email: email.toLowerCase(),
        passwordHash,
        role,
        mobileNumber: mobileNumber || ''
      });
      return this.findById(id);
    }

    const createdAt = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO users (id, fullName, email, passwordHash, role, mobileNumber, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, fullName, email.toLowerCase(), passwordHash, role, mobileNumber || '', createdAt);
    return this.findById(id);
  },

  async findByEmail(email) {
    if (isMongo()) {
      const user = await User.findOne({ email: email.toLowerCase() }).lean();
      return user || null;
    }

    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email.toLowerCase()) || null;
  },

  async findById(id) {
    if (isMongo()) {
      const user = await User.findOne({ id }).select('id fullName email role mobileNumber createdAt').lean();
      return user || null;
    }

    const stmt = db.prepare('SELECT id, fullName, email, role, mobileNumber, createdAt FROM users WHERE id = ?');
    return stmt.get(id) || null;
  }
};

const ProblemRepository = {
  async createProblem(p) {
    const workflowHistory = appendWorkflowEvent([], {
      type: 'created',
      actor: p.authorName || 'System',
      actorRole: p.authorRole || 'Citizen',
      note: 'Problem submitted'
    });

    if (isMongo()) {
      const doc = await Problem.create({
        id: p.id,
        title: p.title,
        description: p.description,
        category: p.category,
        location: p.location || 'Not provided',
        evidenceUrl: p.evidenceUrl || '',
        contact: p.contact || '',
        authorId: p.authorId || null,
        authorName: p.authorName || 'Community Member',
        route: p.route,
        urgency: p.urgency,
        score: p.score,
        duplicate: Boolean(p.duplicate),
        recurring: Boolean(p.recurring),
        similarReports: p.similarReports || 0,
        assignedAuthority: p.assignedAuthority || 'District Public Services Office',
        recommendation: p.recommendation || '',
        peopleAffected: p.peopleAffected || 'Community members',
        innovationPotential: p.innovationPotential || 'MEDIUM',
        rootCauses: p.rootCauses || [],
        techSuggestions: p.techSuggestions || [],
        authorityStatus: p.authorityStatus || (p.route === 'authority' || p.route === 'dual' ? 'Forwarded to Concerned Authority' : 'AI Analysis Completed'),
        citizenVerification: p.citizenVerification || '',
        supportCount: p.supportCount || 1,
        supporters: [],
        workflowHistory,
        reviewerStatus: p.reviewerStatus || '',
        lastUpdatedBy: p.lastUpdatedBy || '',
      });
      return this.findById(p.id);
    }

    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO problems (
        id, title, description, category, location, evidenceUrl, contact,
        authorId, authorName, route, urgency, score, duplicate, recurring,
        similarReports, assignedAuthority, recommendation, peopleAffected,
        innovationPotential, rootCausesJson, techSuggestionsJson,
        authorityStatus, citizenVerification, supportCount, workflowHistoryJson,
        reviewerStatus, lastUpdatedBy, createdAt, updatedAt
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      )
    `);

    stmt.run(
      p.id,
      p.title,
      p.description,
      p.category,
      p.location || 'Not provided',
      p.evidenceUrl || '',
      p.contact || '',
      p.authorId || null,
      p.authorName || 'Community Member',
      p.route,
      p.urgency,
      p.score,
      p.duplicate ? 1 : 0,
      p.recurring ? 1 : 0,
      p.similarReports || 0,
      p.assignedAuthority || 'District Public Services Office',
      p.recommendation || '',
      p.peopleAffected || 'Community members',
      p.innovationPotential || 'MEDIUM',
      JSON.stringify(p.rootCauses || []),
      JSON.stringify(p.techSuggestions || []),
      p.authorityStatus || (p.route === 'authority' || p.route === 'dual' ? 'Forwarded to Concerned Authority' : 'AI Analysis Completed'),
      p.citizenVerification || '',
      p.supportCount || 1,
      JSON.stringify(workflowHistory),
      p.reviewerStatus || '',
      p.lastUpdatedBy || '',
      now,
      now
    );

    return this.findById(p.id);
  },

  async findById(id) {
    if (isMongo()) {
      const row = await Problem.findOne({ id }).lean();
      if (!row) return null;
      return {
        ...row,
        rootCauses: row.rootCauses || [],
        techSuggestions: row.techSuggestions || [],
        workflowHistory: normalizeWorkflowHistory(row.workflowHistory)
      };
    }

    const stmt = db.prepare('SELECT * FROM problems WHERE id = ?');
    const row = stmt.get(id);
    if (!row) return null;
    return {
      ...row,
      duplicate: Boolean(row.duplicate),
      recurring: Boolean(row.recurring),
      rootCauses: parseJsonSafe(row.rootCausesJson, []),
      techSuggestions: parseJsonSafe(row.techSuggestionsJson, []),
      workflowHistory: normalizeWorkflowHistory(row.workflowHistoryJson),
      reviewerStatus: row.reviewerStatus || '',
      lastUpdatedBy: row.lastUpdatedBy || ''
    };
  },

  async findAll({ category, route, search, status, citizenVerification, limit = 50, offset = 0 } = {}) {
    if (isMongo()) {
      const query = {};
      if (category && category !== 'all') query.category = category;
      if (route && route !== 'all') query.route = route;
      if (status) query.authorityStatus = status;
      if (citizenVerification !== undefined && citizenVerification !== null && citizenVerification !== '') query.citizenVerification = citizenVerification;
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { location: { $regex: search, $options: 'i' } }
        ];
      }
      const rows = await Problem.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit).lean();
      return rows.map(r => ({
        ...r,
        rootCauses: r.rootCauses || [],
        techSuggestions: r.techSuggestions || [],
        workflowHistory: normalizeWorkflowHistory(r.workflowHistory)
      }));
    }

    let sql = 'SELECT * FROM problems WHERE 1=1';
    const params = [];

    if (category && category !== 'all') {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (route && route !== 'all') {
      sql += ' AND route = ?';
      params.push(route);
    }
    if (status) {
      sql += ' AND authorityStatus = ?';
      params.push(status);
    }
    if (citizenVerification !== undefined && citizenVerification !== null && citizenVerification !== '') {
      sql += ' AND citizenVerification = ?';
      params.push(citizenVerification);
    }
    if (search) {
      sql += ' AND (title LIKE ? OR description LIKE ? OR location LIKE ?)';
      const queryPattern = `%${search}%`;
      params.push(queryPattern, queryPattern, queryPattern);
    }

    sql += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = db.prepare(sql);
    const rows = stmt.all(...params);
    return rows.map(row => ({
      ...row,
      duplicate: Boolean(row.duplicate),
      recurring: Boolean(row.recurring),
      rootCauses: parseJsonSafe(row.rootCausesJson, []),
      techSuggestions: parseJsonSafe(row.techSuggestionsJson, []),
      workflowHistory: normalizeWorkflowHistory(row.workflowHistoryJson),
      reviewerStatus: row.reviewerStatus || '',
      lastUpdatedBy: row.lastUpdatedBy || ''
    }));
  },

  async updateAuthorityStatus(id, status, actor = null) {
    const before = await this.findById(id);
    const history = normalizeWorkflowHistory(before?.workflowHistory || []);
    const nextHistory = appendWorkflowEvent(history, {
      type: 'authority_status',
      actor: actor ? actor.fullName || actor.id : 'System',
      actorRole: actor ? actor.role : 'System',
      from: before?.authorityStatus || null,
      to: status,
      note: `Authority status changed to ${status}`
    });

    if (isMongo()) {
      await Problem.findOneAndUpdate({ id }, {
        authorityStatus: status,
        workflowHistory: nextHistory,
        lastUpdatedBy: actor ? actor.id : '',
        updatedAt: new Date()
      });
      return this.findById(id);
    }

    const now = new Date().toISOString();
    const stmt = db.prepare('UPDATE problems SET authorityStatus = ?, workflowHistoryJson = ?, lastUpdatedBy = ?, updatedAt = ? WHERE id = ?');
    stmt.run(status, JSON.stringify(nextHistory), actor ? actor.id : '', now, id);
    return this.findById(id);
  },

  async updateCitizenVerification(id, verification, actor = null) {
    const before = await this.findById(id);
    const history = normalizeWorkflowHistory(before?.workflowHistory || []);
    const nextHistory = appendWorkflowEvent(history, {
      type: 'citizen_verification',
      actor: actor ? actor.fullName || actor.id : 'System',
      actorRole: actor ? actor.role : 'System',
      answer: verification,
      note: verification === 'yes' ? 'Citizen confirmed resolution' : 'Citizen reopened issue'
    });

    if (isMongo()) {
      await Problem.findOneAndUpdate({ id }, {
        citizenVerification: verification,
        workflowHistory: nextHistory,
        lastUpdatedBy: actor ? actor.id : '',
        updatedAt: new Date()
      });
      return this.findById(id);
    }

    const now = new Date().toISOString();
    const stmt = db.prepare('UPDATE problems SET citizenVerification = ?, workflowHistoryJson = ?, lastUpdatedBy = ?, updatedAt = ? WHERE id = ?');
    stmt.run(verification, JSON.stringify(nextHistory), actor ? actor.id : '', now, id);
    return this.findById(id);
  },

  async incrementSupport(problemId, userId) {
    if (isMongo()) {
      const problem = await Problem.findOne({ id: problemId });
      if (!problem) return { alreadySupported: false, problem: null };

      if (userId && problem.supporters.includes(userId)) {
        return { alreadySupported: true, problem: await this.findById(problemId) };
      }

      const update = { $inc: { supportCount: 1 }, updatedAt: new Date() };
      if (userId) update.$addToSet = { supporters: userId };

      await Problem.findOneAndUpdate({ id: problemId }, update);
      return { alreadySupported: false, problem: await this.findById(problemId) };
    }

    if (userId) {
      const checkStmt = db.prepare('SELECT * FROM problem_supporters WHERE problemId = ? AND userId = ?');
      const existing = checkStmt.get(problemId, userId);
      if (existing) {
        return { alreadySupported: true, problem: await this.findById(problemId) };
      }
      const supportStmt = db.prepare('INSERT INTO problem_supporters (problemId, userId, createdAt) VALUES (?, ?, ?)');
      supportStmt.run(problemId, userId, new Date().toISOString());
    }

    const updateStmt = db.prepare('UPDATE problems SET supportCount = supportCount + 1, updatedAt = ? WHERE id = ?');
    updateStmt.run(new Date().toISOString(), problemId);
    return { alreadySupported: false, problem: await this.findById(problemId) };
  }
};

const ChallengeRepository = {
  async createChallenge(c) {
    const workflowHistory = appendWorkflowEvent([], {
      type: 'created',
      actor: c.authorName || 'System',
      actorRole: c.authorRole || 'Admin / Reviewer',
      note: 'Challenge created'
    });

    if (isMongo()) {
      await Challenge.create({
        id: c.id,
        problemId: c.problemId || null,
        title: c.title,
        category: c.category,
        problem: c.problem,
        challengeQuestion: c.challengeQuestion || '',
        skills: c.skills || [],
        expectedImpact: c.expectedImpact || '',
        watchersCount: c.watchersCount || 0,
        watchers: [],
        featured: Boolean(c.featured),
        workflowHistory
      });
      return this.findById(c.id);
    }

    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO challenges (
        id, problemId, title, category, problem, challengeQuestion,
        skillsJson, expectedImpact, watchersCount, featured, workflowHistoryJson, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      c.id,
      c.problemId || null,
      c.title,
      c.category,
      c.problem,
      c.challengeQuestion || '',
      JSON.stringify(c.skills || []),
      c.expectedImpact || '',
      c.watchersCount || 0,
      c.featured ? 1 : 0,
      JSON.stringify(workflowHistory),
      now
    );

    return this.findById(c.id);
  },

  async findDuplicate({ title, problem, category }) {
    const pool = await this.findAll({ category, search: title || problem });
    return pool.find(item => {
      const sameTitle = title && item.title && item.title.toLowerCase() === title.toLowerCase();
      const sameProblem = problem && item.problem && item.problem.toLowerCase() === problem.toLowerCase();
      const sameCategory = category && item.category && item.category.toLowerCase() === category.toLowerCase();
      return sameTitle || (sameProblem && sameCategory);
    }) || null;
  },

  async findById(id) {
    if (isMongo()) {
      const row = await Challenge.findOne({ id }).lean();
      if (!row) return null;
      return {
        ...row,
        skills: row.skills || [],
        workflowHistory: normalizeWorkflowHistory(row.workflowHistory)
      };
    }

    const stmt = db.prepare('SELECT * FROM challenges WHERE id = ?');
    const row = stmt.get(id);
    if (!row) return null;
    return {
      ...row,
      featured: Boolean(row.featured),
      skills: parseJsonSafe(row.skillsJson, []),
      workflowHistory: normalizeWorkflowHistory(row.workflowHistoryJson)
    };
  },

  async findAll({ category, search } = {}) {
    if (isMongo()) {
      const query = {};
      if (category && category !== 'all') query.category = category;
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { problem: { $regex: search, $options: 'i' } },
          { category: { $regex: search, $options: 'i' } }
        ];
      }
      const rows = await Challenge.find(query).sort({ featured: -1, createdAt: -1 }).lean();
      return rows.map(r => ({
        ...r,
        skills: r.skills || [],
        workflowHistory: normalizeWorkflowHistory(r.workflowHistory)
      }));
    }

    let sql = 'SELECT * FROM challenges WHERE 1=1';
    const params = [];

    if (category && category !== 'all') {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (search) {
      sql += ' AND (title LIKE ? OR problem LIKE ? OR category LIKE ?)';
      const queryPattern = `%${search}%`;
      params.push(queryPattern, queryPattern, queryPattern);
    }

    sql += ' ORDER BY featured DESC, createdAt DESC';
    const stmt = db.prepare(sql);
    const rows = stmt.all(...params);
    return rows.map(row => ({
      ...row,
      featured: Boolean(row.featured),
      skills: parseJsonSafe(row.skillsJson, []),
      workflowHistory: normalizeWorkflowHistory(row.workflowHistoryJson)
    }));
  },

  async toggleWatch(challengeId, userId) {
    if (isMongo()) {
      const challenge = await Challenge.findOne({ id: challengeId });
      if (!challenge) return { watched: false, challenge: null };

      const isWatched = challenge.watchers.includes(userId);
      if (isWatched) {
        await Challenge.findOneAndUpdate(
          { id: challengeId },
          { $pull: { watchers: userId }, $inc: { watchersCount: -1 } }
        );
        return { watched: false, challenge: await this.findById(challengeId) };
      } else {
        await Challenge.findOneAndUpdate(
          { id: challengeId },
          { $addToSet: { watchers: userId }, $inc: { watchersCount: 1 } }
        );
        return { watched: true, challenge: await this.findById(challengeId) };
      }
    }

    const checkStmt = db.prepare('SELECT * FROM challenge_watchers WHERE challengeId = ? AND userId = ?');
    const existing = checkStmt.get(challengeId, userId);
    if (existing) {
      db.prepare('DELETE FROM challenge_watchers WHERE challengeId = ? AND userId = ?').run(challengeId, userId);
      db.prepare('UPDATE challenges SET watchersCount = MAX(0, watchersCount - 1) WHERE id = ?').run(challengeId);
      return { watched: false, challenge: await this.findById(challengeId) };
    } else {
      db.prepare('INSERT INTO challenge_watchers (challengeId, userId, createdAt) VALUES (?, ?, ?)').run(challengeId, userId, new Date().toISOString());
      db.prepare('UPDATE challenges SET watchersCount = watchersCount + 1 WHERE id = ?').run(challengeId);
      return { watched: true, challenge: await this.findById(challengeId) };
    }
  },

  async isWatchedByUser(challengeId, userId) {
    if (!userId) return false;
    if (isMongo()) {
      const challenge = await Challenge.findOne({ id: challengeId, watchers: userId });
      return Boolean(challenge);
    }

    const stmt = db.prepare('SELECT 1 FROM challenge_watchers WHERE challengeId = ? AND userId = ?');
    return Boolean(stmt.get(challengeId, userId));
  }
};

const SolutionRepository = {
  async createSolution(s) {
    const status = s.status || 'Proposed';
    const progressPercent = progressMap[status] || 10;
    const workflowHistory = appendWorkflowEvent([], {
      type: 'created',
      actor: s.authorName || 'System',
      actorRole: s.authorRole || 'Student / Innovator',
      note: `Solution created with status ${status}`
    });

    if (isMongo()) {
      await Solution.create({
        id: s.id,
        challengeId: s.challengeId || 'hospital',
        problemId: s.problemId || null,
        authorId: s.authorId || null,
        authorName: s.authorName || 'Innovator',
        title: s.title,
        description: s.description,
        technology: s.technology || '',
        team: s.team || '',
        impact: s.impact || '',
        status,
        progressPercent,
        websiteUrl: s.websiteUrl || '',
        sourceCodeUrl: s.sourceCodeUrl || '',
        demoUrl: s.demoUrl || '',
        evidenceFiles: s.evidenceFiles || [],
        workflowHistory,
        reviewedBy: s.reviewedBy || '',
        reviewerNotes: s.reviewerNotes || ''
      });
      return this.findById(s.id);
    }

    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO solutions (
        id, challengeId, problemId, authorId, authorName,
        title, description, technology, team, impact,
        status, progressPercent, websiteUrl, sourceCodeUrl, demoUrl,
        evidenceFilesJson, workflowHistoryJson, reviewedBy, reviewerNotes,
        createdAt, updatedAt
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      )
    `);

    stmt.run(
      s.id,
      s.challengeId || 'hospital',
      s.problemId || null,
      s.authorId || null,
      s.authorName || 'Innovator',
      s.title,
      s.description,
      s.technology || '',
      s.team || '',
      s.impact || '',
      status,
      progressPercent,
      s.websiteUrl || '',
      s.sourceCodeUrl || '',
      s.demoUrl || '',
      JSON.stringify(s.evidenceFiles || []),
      JSON.stringify(workflowHistory),
      s.reviewedBy || '',
      s.reviewerNotes || '',
      now,
      now
    );

    return this.findById(s.id);
  },

  async findByChallengeAndAuthor(challengeId, authorId) {
    if (!challengeId || !authorId) return null;
    if (isMongo()) {
      return Solution.findOne({ challengeId, authorId }).lean();
    }
    const stmt = db.prepare('SELECT * FROM solutions WHERE challengeId = ? AND authorId = ? ORDER BY updatedAt DESC LIMIT 1');
    const row = stmt.get(challengeId, authorId);
    if (!row) return null;
    return {
      ...row,
      evidenceFiles: parseJsonSafe(row.evidenceFilesJson, []),
      workflowHistory: normalizeWorkflowHistory(row.workflowHistoryJson),
      reviewerNotes: row.reviewerNotes || '',
      reviewedBy: row.reviewedBy || ''
    };
  },

  async findById(id) {
    if (isMongo()) {
      const row = await Solution.findOne({ id }).lean();
      if (!row) return null;
      return {
        ...row,
        evidenceFiles: row.evidenceFiles || [],
        workflowHistory: normalizeWorkflowHistory(row.workflowHistory)
      };
    }

    const stmt = db.prepare('SELECT * FROM solutions WHERE id = ?');
    const row = stmt.get(id);
    if (!row) return null;
    return {
      ...row,
      evidenceFiles: parseJsonSafe(row.evidenceFilesJson, []),
      workflowHistory: normalizeWorkflowHistory(row.workflowHistoryJson),
      reviewedBy: row.reviewedBy || '',
      reviewerNotes: row.reviewerNotes || ''
    };
  },

  async findAll({ challengeId, authorId, status, search } = {}) {
    if (isMongo()) {
      const query = {};
      if (challengeId) query.challengeId = challengeId;
      if (authorId) query.authorId = authorId;
      if (status) query.status = status;
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { team: { $regex: search, $options: 'i' } }
        ];
      }
      const rows = await Solution.find(query).sort({ updatedAt: -1 }).lean();
      return rows.map(r => ({
        ...r,
        evidenceFiles: r.evidenceFiles || [],
        workflowHistory: normalizeWorkflowHistory(r.workflowHistory)
      }));
    }

    let sql = 'SELECT * FROM solutions WHERE 1=1';
    const params = [];

    if (challengeId) {
      sql += ' AND challengeId = ?';
      params.push(challengeId);
    }
    if (authorId) {
      sql += ' AND authorId = ?';
      params.push(authorId);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (search) {
      sql += ' AND (title LIKE ? OR description LIKE ? OR team LIKE ?)';
      const queryPattern = `%${search}%`;
      params.push(queryPattern, queryPattern, queryPattern);
    }

    sql += ' ORDER BY updatedAt DESC';
    const stmt = db.prepare(sql);
    const rows = stmt.all(...params);
    return rows.map(row => ({
      ...row,
      evidenceFiles: parseJsonSafe(row.evidenceFilesJson, []),
      workflowHistory: normalizeWorkflowHistory(row.workflowHistoryJson),
      reviewedBy: row.reviewedBy || '',
      reviewerNotes: row.reviewerNotes || ''
    }));
  },

  async updateSolution(id, fields, actor) {
    const current = await this.findById(id);
    if (!current) return null;

    const nextHistory = appendWorkflowEvent(normalizeWorkflowHistory(current.workflowHistory), {
      type: 'updated',
      actor: actor.fullName || actor.id,
      actorRole: actor.role,
      note: 'Solution details updated'
    });

    const allowed = {
      title: fields.title,
      description: fields.description,
      technology: fields.technology,
      team: fields.team,
      impact: fields.impact,
      websiteUrl: fields.websiteUrl,
      sourceCodeUrl: fields.sourceCodeUrl,
      demoUrl: fields.demoUrl
    };

    if (isMongo()) {
      await Solution.findOneAndUpdate(
        { id },
        { ...allowed, workflowHistory: nextHistory, updatedAt: new Date() }
      );
      return this.findById(id);
    }

    const now = new Date().toISOString();
    const stmt = db.prepare(`
      UPDATE solutions
      SET title = ?, description = ?, technology = ?, team = ?, impact = ?,
          websiteUrl = ?, sourceCodeUrl = ?, demoUrl = ?, workflowHistoryJson = ?, updatedAt = ?
      WHERE id = ?
    `);
    stmt.run(
      allowed.title,
      allowed.description,
      allowed.technology,
      allowed.team,
      allowed.impact,
      allowed.websiteUrl,
      allowed.sourceCodeUrl,
      allowed.demoUrl,
      JSON.stringify(nextHistory),
      now,
      id
    );
    return this.findById(id);
  },

  async updateStatus(id, status, websiteUrl, actor = null, reviewerNotes = '') {
    const current = await this.findById(id);
    const progressPercent = progressMap[status] || 10;
    const now = new Date();
    const existingHistory = normalizeWorkflowHistory(current?.workflowHistory || []);
    const nextHistory = appendWorkflowEvent(existingHistory, {
      type: 'status_change',
      actor: actor ? actor.fullName || actor.id : 'System',
      actorRole: actor ? actor.role : 'System',
      from: current?.status || null,
      to: status,
      note: reviewerNotes || `Status updated to ${status}`
    });

    if (isMongo()) {
      const update = {
        status,
        progressPercent,
        workflowHistory: nextHistory,
        updatedAt: now
      };
      if (websiteUrl !== undefined) update.websiteUrl = websiteUrl;
      if (actor && actor.role === 'Admin / Reviewer') {
        update.reviewedBy = actor.id;
      }
      if (reviewerNotes) {
        update.reviewerNotes = reviewerNotes;
      }
      await Solution.findOneAndUpdate({ id }, update);
      return this.findById(id);
    }

    const nowIso = now.toISOString();
    if (websiteUrl !== undefined) {
      const stmt = db.prepare('UPDATE solutions SET status = ?, progressPercent = ?, websiteUrl = ?, workflowHistoryJson = ?, reviewedBy = ?, reviewerNotes = ?, updatedAt = ? WHERE id = ?');
      stmt.run(status, progressPercent, websiteUrl, JSON.stringify(nextHistory), actor && actor.role === 'Admin / Reviewer' ? actor.id : (current?.reviewedBy || ''), reviewerNotes || current?.reviewerNotes || '', nowIso, id);
    } else {
      const stmt = db.prepare('UPDATE solutions SET status = ?, progressPercent = ?, workflowHistoryJson = ?, reviewedBy = ?, reviewerNotes = ?, updatedAt = ? WHERE id = ?');
      stmt.run(status, progressPercent, JSON.stringify(nextHistory), actor && actor.role === 'Admin / Reviewer' ? actor.id : (current?.reviewedBy || ''), reviewerNotes || current?.reviewerNotes || '', nowIso, id);
    }

    return this.findById(id);
  }
};

const StatsRepository = {
  async getOverview(filters = {}) {
    const { category, route, status, search } = filters;
    const problems = await ProblemRepository.findAll({ category, route, search, status, limit: 1000, offset: 0 });
    const challenges = await ChallengeRepository.findAll({ category, search });
    const solutions = await SolutionRepository.findAll({ status, search, challengeId: filters.challengeId });

    const problemsReported = problems.length;
    const problemsSolved = problems.filter(problem => problem.authorityStatus === 'Resolved' || problem.citizenVerification === 'yes').length;
    const innovationChallenges = challenges.length;
    const activeInnovators = new Set(solutions.filter(solution => solution.authorId).map(solution => solution.authorId)).size;

    const routeCounts = { authority: 0, innovation: 0, dual: 0, duplicate: 0 };
    problems.forEach(problem => {
      if (routeCounts[problem.route] !== undefined) routeCounts[problem.route] += 1;
    });
    const totalRouteCount = Object.values(routeCounts).reduce((sum, count) => sum + count, 0) || 1;

    return {
      problemsReported,
      problemsSolved,
      innovationChallenges,
      activeInnovators,
      realCounts: {
        problemsCount: problemsReported,
        solvedCount: problemsSolved,
        challengesCount: innovationChallenges,
        innovatorsCount: activeInnovators
      },
      routingPercentages: {
        authority: Math.round((routeCounts.authority / totalRouteCount) * 100),
        innovation: Math.round((routeCounts.innovation / totalRouteCount) * 100),
        dual: Math.round((routeCounts.dual / totalRouteCount) * 100),
        duplicate: Math.round((routeCounts.duplicate / totalRouteCount) * 100)
      }
    };
  }
};

module.exports = {
  UserRepository,
  ProblemRepository,
  ChallengeRepository,
  SolutionRepository,
  StatsRepository,
  progressMap,
  validRoles
};
