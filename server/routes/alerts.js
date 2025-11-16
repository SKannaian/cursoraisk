const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all alerts
router.get('/', (req, res) => {
    const { unread_only } = req.query;
    
    let query = 'SELECT a.*, i.vin, i.make, i.model, i.year FROM alerts a LEFT JOIN inventory i ON a.inventory_id = i.id';
    const params = [];
    
    if (unread_only === 'true') {
        query += ' WHERE a.is_read = 0';
    }
    
    query += ' ORDER BY a.created_at DESC';
    
    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Create alert
router.post('/', (req, res) => {
    const { inventory_id, alert_type, message } = req.body;
    
    if (!alert_type || !message) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    db.run(`
        INSERT INTO alerts (inventory_id, alert_type, message)
        VALUES (?, ?, ?)
    `, [inventory_id || null, alert_type, message], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID, message: 'Alert created successfully' });
    });
});

// Mark alert as read
router.put('/:id/read', (req, res) => {
    const id = req.params.id;
    
    db.run('UPDATE alerts SET is_read = 1 WHERE id = ?', [id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Alert not found' });
        }
        res.json({ message: 'Alert marked as read' });
    });
});

// Mark all alerts as read
router.put('/read-all', (req, res) => {
    db.run('UPDATE alerts SET is_read = 1 WHERE is_read = 0', function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'All alerts marked as read', count: this.changes });
    });
});

// Delete alert
router.delete('/:id', (req, res) => {
    const id = req.params.id;
    
    db.run('DELETE FROM alerts WHERE id = ?', [id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Alert not found' });
        }
        res.json({ message: 'Alert deleted successfully' });
    });
});

module.exports = router;

