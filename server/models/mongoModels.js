const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, required: true },
  mobileNumber: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

const problemSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  location: { type: String, default: 'Not provided' },
  evidenceUrl: { type: String, default: '' },
  contact: { type: String, default: '' },
  authorId: { type: String, default: null },
  authorName: { type: String, default: 'Community Member' },
  route: { type: String, required: true },
  urgency: { type: String, required: true },
  score: { type: Number, required: true },
  duplicate: { type: Boolean, default: false },
  recurring: { type: Boolean, default: false },
  similarReports: { type: Number, default: 0 },
  assignedAuthority: { type: String, default: 'District Public Services Office' },
  recommendation: { type: String, default: '' },
  peopleAffected: { type: String, default: 'Community members' },
  innovationPotential: { type: String, default: 'MEDIUM' },
  rootCauses: { type: [String], default: [] },
  techSuggestions: { type: [String], default: [] },
  authorityStatus: { type: String, default: 'Forwarded to Concerned Authority' },
  citizenVerification: { type: String, default: '' },
  supportCount: { type: Number, default: 1 },
  supporters: { type: [String], default: [] },
  workflowHistory: { type: [mongoose.Schema.Types.Mixed], default: [] },
  reviewerStatus: { type: String, default: '' },
  lastUpdatedBy: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const challengeSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  problemId: { type: String, default: null },
  title: { type: String, required: true },
  category: { type: String, required: true },
  problem: { type: String, required: true },
  challengeQuestion: { type: String, default: '' },
  skills: { type: [String], default: [] },
  expectedImpact: { type: String, default: '' },
  watchersCount: { type: Number, default: 0 },
  watchers: { type: [String], default: [] },
  featured: { type: Boolean, default: false },
  workflowHistory: { type: [mongoose.Schema.Types.Mixed], default: [] },
  createdAt: { type: Date, default: Date.now }
});

const solutionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  challengeId: { type: String, required: true },
  problemId: { type: String, default: null },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  authorId: { type: String, default: null },
  authorName: { type: String, default: 'Innovator' },
  title: { type: String, required: true },
  description: { type: String, required: true },
  technology: { type: String, default: '' },
  team: { type: String, default: '' },
  impact: { type: String, default: '' },
  status: { type: String, default: 'Proposed' },
  progressPercent: { type: Number, default: 10 },
  websiteUrl: { type: String, default: '' },
  sourceCodeUrl: { type: String, default: '' },
  demoUrl: { type: String, default: '' },
  evidenceFiles: { type: [String], default: [] },
  workflowHistory: { type: [mongoose.Schema.Types.Mixed], default: [] },
  reviewedBy: { type: String, default: '' },
  reviewerNotes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Problem = mongoose.models.Problem || mongoose.model('Problem', problemSchema);
const Challenge = mongoose.models.Challenge || mongoose.model('Challenge', challengeSchema);
const Solution = mongoose.models.Solution || mongoose.model('Solution', solutionSchema);

module.exports = {
  User,
  Problem,
  Challenge,
  Solution
};
