const express = require('express');
const router = express.Router();

module.exports = (pool) => {
  router.patch('/:id/status', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const status = String(req.body.status || '').trim();
      const remarks = String(req.body.remarks || '').trim() || null;
      if (!Number.isInteger(id) || !['approved','rejected'].includes(status)) return res.status(400).json({ error: 'Valid document id and status are required' });
      const [result] = await pool.query('UPDATE documents SET status = ?, remarks = ? WHERE id = ?', [status, remarks, id]);
      if (!result.affectedRows) return res.status(404).json({ error: 'Document not found' });
      res.json({ ok: true, status });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Unable to update document status' });
    }
  });
  return router;
};
