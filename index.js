// index.js (at repo root)
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  'http://localhost:3000',
  'https://skystash-frontend.onrender.com',
];

const corsOptions = {
  origin(origin, cb) {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(null, false);
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// sanity routes
app.get('/', (_req, res) => res.send('SkyStash API is running'));
app.get('/healthz', (_req, res) => res.send('ok'));

// your API routes
// const authRoutes = require('./routes/auth');
// app.use('/api/auth', authRoutes);
const fileRoutes = require('./routes/files');
const shareRoutes = require('./routes/shares');
const metaRoutes  = require('./routes/meta');
app.use('/api/files', fileRoutes);
app.use('/api/shares', shareRoutes);
app.use('/api/meta',  metaRoutes);

// 404 + error handlers
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
