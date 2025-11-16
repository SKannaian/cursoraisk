const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all inventory items
router.get('/', (req, res) => {
    db.all(`
        SELECT i.*, 
               COALESCE(SUM(r.cost), 0) as total_repair_costs
        FROM inventory i
        LEFT JOIN repairs r ON i.id = r.inventory_id
        GROUP BY i.id
        ORDER BY i.created_at DESC
    `, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Get single inventory item with repairs
router.get('/:id', (req, res) => {
    const id = req.params.id;
    
    db.get('SELECT * FROM inventory WHERE id = ?', [id], (err, vehicle) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!vehicle) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }
        
        // Get repairs for this vehicle
        db.all('SELECT * FROM repairs WHERE inventory_id = ? ORDER BY repair_date DESC', [id], (err, repairs) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            // Calculate total repair costs
            const totalRepairCosts = repairs.reduce((sum, repair) => sum + (repair.cost || 0), 0);
            
            res.json({
                ...vehicle,
                repairs: repairs,
                total_repair_costs: totalRepairCosts
            });
        });
    });
});

// Create new inventory item
router.post('/', (req, res) => {
    const {
        vin, make, model, year, color, trim, miles,
        date_bought, auction_site, buy_price, auction_fees, transport_fee, market_price
    } = req.body;
    
    // Calculate profit price (will be updated when repairs are added)
    const buyPrice = parseFloat(buy_price) || 0;
    const auctionFees = parseFloat(auction_fees) || 0;
    const transportFee = parseFloat(transport_fee) || 0;
    const profitPrice = buyPrice + auctionFees + transportFee;
    
    db.run(`
        INSERT INTO inventory 
        (vin, make, model, year, color, trim, miles, date_bought, auction_site, 
         buy_price, auction_fees, transport_fee, profit_price, market_price)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        vin, make, model, year, color, trim, miles,
        date_bought, auction_site, buy_price, auction_fees, transport_fee, profitPrice, market_price
    ], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID, message: 'Vehicle added successfully' });
    });
});

// Update inventory item
router.put('/:id', (req, res) => {
    const id = req.params.id;
    const {
        vin, make, model, year, color, trim, miles,
        date_bought, auction_site, buy_price, auction_fees, transport_fee, market_price
    } = req.body;
    
    // Get current total repair costs
    db.get('SELECT COALESCE(SUM(cost), 0) as total FROM repairs WHERE inventory_id = ?', [id], (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        const totalRepairCosts = result.total || 0;
        const buyPrice = parseFloat(buy_price) || 0;
        const auctionFees = parseFloat(auction_fees) || 0;
        const transportFee = parseFloat(transport_fee) || 0;
        const profitPrice = buyPrice + auctionFees + transportFee + totalRepairCosts;
        
        db.run(`
            UPDATE inventory SET
                vin = ?, make = ?, model = ?, year = ?, color = ?, trim = ?, miles = ?,
                date_bought = ?, auction_site = ?, buy_price = ?, auction_fees = ?,
                transport_fee = ?, profit_price = ?, market_price = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            vin, make, model, year, color, trim, miles,
            date_bought, auction_site, buy_price, auction_fees, transport_fee, profitPrice, market_price, id
        ], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Vehicle not found' });
            }
            res.json({ message: 'Vehicle updated successfully' });
        });
    });
});

// Delete inventory item
router.delete('/:id', (req, res) => {
    const id = req.params.id;
    
    db.run('DELETE FROM inventory WHERE id = ?', [id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }
        res.json({ message: 'Vehicle deleted successfully' });
    });
});

module.exports = router;

