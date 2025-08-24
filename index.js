// server/index.js  (CommonJS)
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  'http://localhost:3000',
  'https://skystash-frontend.onrender.com', // update if your frontend URL changes
];

// Allow our origins + no-origin (health checks, curl, same-host calls)
const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false); // or callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// --- basic routes ---
app.get('/', (_req, res) => res.send('SkyStash API is running'));
app.get('/healthz', (_req, res) => res.send('ok'));

// --- API routes ---
const fileRoutes = require('./routes/files');
const shareRoutes = require('./routes/shares');
const metaRoutes  = require('./routes/meta');
// const authRoutes = require('./routes/auth'); // add back when you implement

// app.use('/api/auth', authRoutes);
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
