const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { protect } = require('../authMiddleware');
const router = express.Router();
const crypto = require('crypto');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Get a list of users a resource is shared with
router.get('/:resourceId', protect, async (req, res) => {
  try {
    const { resourceId } = req.params;
    const { data: shares, error: sharesError } = await supabase
      .from('shares')
      .select('id, role, grantee_user_id')
      .eq('resource_id', resourceId)
      .eq('created_by', req.user.id);

    if (sharesError) throw sharesError;
    if (!shares || shares.length === 0) return res.status(200).json([]);

    const populatedShares = await Promise.all(shares.map(async (share) => {
      const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(share.grantee_user_id);
      if (userError || !user) return null;
      
      return {
        id: share.id,
        role: share.role,
        grantee: { id: user.id, email: user.email }
      };
    }));
    
    res.status(200).json(populatedShares.filter(Boolean));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Share with a specific user
router.post('/', protect, async (req, res) => {
  const { resourceId, granteeEmail, role } = req.body;
  try {
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({
      email: granteeEmail,
    });
    if (listError) throw listError;
    if (!users || users.length === 0) {
      return res.status(404).json({ error: 'User with that email not found.' });
    }
    const grantee = users[0];

    const { data, error } = await supabase
      .from('shares')
      .insert({ resource_id: resourceId, grantee_user_id: grantee.id, role, created_by: req.user.id })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Revoke access from a specific user
router.delete('/:shareId', protect, async (req, res) => {
  const { shareId } = req.params;
  const { error } = await supabase.from('shares').delete().eq('id', shareId).eq('created_by', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json({ message: 'Access revoked.' });
});

// --- Public Link Sharing ---

// Create a public shareable link
router.post('/link', protect, async (req, res) => {
    const { resourceId } = req.body;
    const token = crypto.randomBytes(16).toString('hex');
    const { data, error } = await supabase
        .from('link_shares')
        .insert({ resource_id: resourceId, token, created_by: req.user.id })
        .select()
        .single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
});

// Get an existing public link for a resource
router.get('/link/:resourceId', protect, async (req, res) => {
    const { resourceId } = req.params;
    const { data, error } = await supabase
        .from('link_shares')
        .select('*')
        .eq('resource_id', resourceId)
        .eq('created_by', req.user.id)
        .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    res.status(200).json(data);
});

// Delete a public link
router.delete('/link/:linkId', protect, async (req, res) => {
    const { linkId } = req.params;
    const { error } = await supabase
        .from('link_shares')
        .delete()
        .eq('id', linkId)
        .eq('created_by', req.user.id);
    if (error) return res.status(500).json({ error: error.message });
    res.status(200).json({ message: 'Link deleted' });
});

module.exports = router;