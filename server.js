require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');

const authRouter = require('./routes/auth');
const requestsRouter = require('./routes/requests');
const usersRouter = require('./routes/users');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 8 * 60 * 60 * 1000 }
}));

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRouter);
app.use('/api/requests', requestsRouter);
app.use('/api/users', usersRouter);

app.get('/', (req, res) => res.redirect('/index.html'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
