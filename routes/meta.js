// server/routes/meta.js
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { protect } = require('../authMiddleware');
const router = express.Router();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// GET /api/meta/starred
router.get('/starred', protect, async (req, res) => {
  const { data, error } = await supabase
    .from('stars')
    .select('...nodes(*)') // Select all columns from the joined 'nodes' table
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });

  // FIX: This filters out any stars that point to deleted or non-existent nodes
  const validNodes = data
    .map(s => s.nodes) // Get the nested node object
    .filter(Boolean); // 'filter(Boolean)' removes any null/undefined items from the array

  res.status(200).json(validNodes);
});

// GET /api/meta/recent
router.get('/recent', protect, async (req, res) => {
  const { data, error } = await supabase
    .from('nodes')
    .select('*')
    .eq('owner_id', req.user.id)
    .eq('is_deleted', false)
    .order('updated_at', { ascending: false })
    .limit(20);

  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json(data);
});

// POST /api/meta/stars
router.post('/stars', protect, async (req, res) => {
  const { nodeId } = req.body;
  const { error } = await supabase
    .from('stars')
    .insert({ node_id: nodeId, user_id: req.user.id });

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ message: 'Item starred.' });
});
// server/routes/meta.js

// POST /api/meta/stars - Star an item
router.post('/stars', protect, async (req, res) => {
  const { nodeId } = req.body;
  const { error } = await supabase
    .from('stars')
    .insert({ node_id: nodeId, user_id: req.user.id });

  if (error) {
    // --- ADD THIS LINE FOR DEBUGGING ---
    console.error('Supabase star insert error:', error);
    // ------------------------------------
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json({ message: 'Item starred.' });
});

// ... (rest of the file)
// DELETE /api/meta/stars/:nodeId
router.delete('/stars/:nodeId', protect, async (req, res) => {
  const { nodeId } = req.params;
  const { error } = await supabase
    .from('stars')
    .delete()
    .eq('node_id', nodeId)
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json({ message: 'Item unstarred.' });
});

module.exports = router;