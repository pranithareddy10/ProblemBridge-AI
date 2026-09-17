const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const { connectDatabase } = require('./config/db');
const { seedDatabase } = require('./config/seed');

const authRoutes = require('./routes/authRoutes');
const problemRoutes = require('./routes/problemRoutes');
const challengeRoutes = require('./routes/challengeRoutes');
const solutionRoutes = require('./routes/solutionRoutes');
const statRoutes = require('./routes/statRoutes');

const app = express();
const PORT = process.env.PORT || 3000;
const startup = (async () => {
  await connectDatabase();
  await seedDatabase();
})();

app.use((req, res, next) => {
  startup.then(() => next()).catch(err => next(err));
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.static(path.join(__dirname, '..')));

app.use('/api/auth', authRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/solutions', solutionRoutes);
app.use('/api/stats', statRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'ProblemBridge AI',
    time: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'API endpoint not found.' });
  }
  res.sendFile(path.join(__dirname, '../index.html'));
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error.'
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log('=============================================');
    console.log(' ProblemBridge AI Full Stack Server Running ');
    console.log(` URL: http://localhost:${PORT}`);
    console.log(` Health: http://localhost:${PORT}/api/health`);
    console.log(` Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log('=============================================');
  });
}

module.exports = app;
