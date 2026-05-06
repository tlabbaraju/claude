require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path    = require('path');
const { initDb }     = require('./db/index');
const { ensureSchema } = require('./db/schema');
const { connectFabric } = require('./db/fabric');

async function start() {
  await initDb();
  ensureSchema();
  try {
    await connectFabric();
  } catch (err) {
    console.warn('⚠ Fabric Warehouse unavailable — writes will be local only');
  }

  const authRouter      = require('./routes/auth');
  const financialRouter = require('./routes/financial');
  const usersRouter     = require('./routes/users');
  const auditRouter     = require('./routes/audit');

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true, maxAge: 8 * 60 * 60 * 1000 },
  }));
  app.use(express.static(path.join(__dirname, 'public')));

  app.use('/api/auth',      authRouter);
  app.use('/api/financial', financialRouter);
  app.use('/api/users',     usersRouter);
  app.use('/api/audit',     auditRouter);

  app.get('/', (req, res) => res.redirect('/index.html'));

  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log(`Financial Tracker running on http://localhost:${PORT}`));
}

start().catch(err => { console.error('Startup failed:', err); process.exit(1); });
