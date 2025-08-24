// server/index.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// const authRoutes = require('./routes/auth'); // THIS LINE IS DELETED
const fileRoutes = require('./routes/files');
const shareRoutes = require('./routes/shares');
const metaRoutes = require('./routes/meta');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
// app.use('/api/auth', authRoutes); // THIS LINE IS DELETED
app.use('/api/files', fileRoutes);
app.use('/api/shares', shareRoutes);
app.use('/api/meta', metaRoutes);

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});