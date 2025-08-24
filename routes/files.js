const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { protect } = require('../authMiddleware');
const router = express.Router();
const BUCKET_NAME = 'user-files';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

router.get('/', protect, async (req, res) => {
  // --- THIS IS THE DEBUGGING LINE ---
  console.log('SORTING_DEBUG: Received parameters:', req.query);
  // ------------------------------------

  const { parentId, view = 'drive', sortBy = 'name', sortOrder = 'asc' } = req.query;
  
  let query = supabase.from('nodes').select(`*, stars ( user_id )`).eq('owner_id', req.user.id);

  if (view === 'trash') {
    query = query.eq('is_deleted', true).order('deleted_at', { ascending: false });
  } else {
    query = query.eq('is_deleted', false);
    if (parentId) {
      query = query.eq('parent_id', parentId);
    } else {
      query = query.is('parent_id', null);
    }

    const isAscending = sortOrder === 'asc';
    query = query.order('is_folder', { ascending: false })
                 .order(sortBy, { ascending: isAscending });
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  
  const processedData = data.map(node => ({ ...node, is_starred: Array.isArray(node.stars) && node.stars.length > 0 }));
  res.status(200).json(processedData);
});

router.get('/search', protect, async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ error: 'Query parameter "q" is required.' });
  }
  const { data, error } = await supabase.from('nodes').select(`*, stars ( user_id )`).eq('owner_id', req.user.id).eq('is_deleted', false).ilike('name', `%${q}%`);
  if (error) return res.status(500).json({ error: error.message });
  const processedData = data.map(node => ({ ...node, is_starred: Array.isArray(node.stars) && node.stars.length > 0 }));
  res.status(200).json(processedData);
});

router.post('/signed-url', protect, async (req, res) => {
  const { fileName, contentType } = req.body;
  const userId = req.user.id;
  const path = `${userId}/${Date.now()}_${fileName}`;
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUploadUrl(path, 60, { contentType: contentType });
    if (error) throw error;
    res.status(200).json({ signedUrl: data.signedUrl, path: data.path });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/metadata', protect, async (req, res) => {
  const { name, path, mime_type, size, parentId } = req.body;
  const newFileNode = { name, path, mime_type, size_bytes: size, parent_id: parentId, is_folder: false, owner_id: req.user.id };
  const { data, error } = await supabase.from('nodes').insert(newFileNode).select().single();
  if (error) {
    console.error('Supabase metadata insert error:', error);
    return res.status(500).json({ error: 'Failed to save file metadata.' });
  }
  res.status(201).json(data);
});

router.post('/', protect, async (req, res) => {
  const { name, parentId } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required.' });
  }
  const newNode = { name, parent_id: parentId, is_folder: true, owner_id: req.user.id };
  const { data, error } = await supabase.from('nodes').insert(newNode).select().single();
  if (error) {
    console.error('Supabase Error creating folder:', error);
    return res.status(500).json({ error: error.message });
  }
  res.status(201).json(data);
});

router.get('/:nodeId/download', protect, async (req, res) => {
  const { nodeId } = req.params;
  const { data: node, error: nodeError } = await supabase.from('nodes').select('path').eq('id', nodeId).eq('owner_id', req.user.id).single();
  if (nodeError || !node || !node.path) return res.status(404).json({ error: 'File not found or not downloadable.' });
  const { data, error } = await supabase.storage.from(BUCKET_NAME).createSignedUrl(node.path, 60);
  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json({ downloadUrl: data.signedUrl });
});

router.patch('/:nodeId/move', protect, async (req, res) => {
  const { nodeId } = req.params;
  const { newParentId } = req.body;
  const { data, error } = await supabase.from('nodes').update({ parent_id: newParentId, updated_at: new Date() }).eq('id', nodeId).eq('owner_id', req.user.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json(data);
});

router.patch('/:fileId/rename', protect, async (req, res) => {
  const { newName } = req.body;
  if (!newName) return res.status(400).json({ error: 'New name is required' });
  const { data, error } = await supabase.from('nodes').update({ name: newName, updated_at: new Date() }).eq('id', req.params.fileId).eq('owner_id', req.user.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json(data);
});

router.patch('/:fileId/trash', protect, async (req, res) => {
  const { error } = await supabase.from('nodes').update({ is_deleted: true, deleted_at: new Date() }).eq('id', req.params.fileId).eq('owner_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json({ message: 'Item moved to trash' });
});

router.patch('/:fileId/restore', protect, async (req, res) => {
  const { error } = await supabase.from('nodes').update({ is_deleted: false, deleted_at: null }).eq('id', req.params.fileId).eq('owner_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json({ message: 'Item restored' });
});

router.delete('/:fileId', protect, async (req, res) => {
  const { error } = await supabase.from('nodes').delete().eq('id', req.params.fileId).eq('owner_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json({ message: 'Item permanently deleted' });
});

module.exports = router;