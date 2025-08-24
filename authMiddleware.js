// my-drive-backend/authMiddleware.js

// We need to re-initialize supabase here or pass it from index.js
// For simplicity, we'll re-init
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const protect = async (req, res, next) => {
  // 1. Get the token from the request header
  const token = req.headers.authorization?.split(' ')[1]; // Expects "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ error: 'Not authorized, no token' });
  }

  try {
    // 2. Verify the token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw new Error('Not authorized, token failed');
    }

    // 3. Attach the user object to the request
    req.user = user;

    // 4. Proceed to the next function (our API endpoint)
    next();
  } catch (error) {
    res.status(401).json({ error: 'Not authorized, token failed' });
  }
};

module.exports = { protect };