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
        vin, make, model, year, color, trim, miles, accident_history, number_of_owners,
        date_bought, auction_site, buy_price, auction_fees, transport_fee, market_price, sale_date, sale_price,
        status, notes, customer_name, customer_phone, customer_email, image_path
    } = req.body;
    
    // Calculate profit price (will be updated when repairs are added)
    const buyPrice = parseFloat(buy_price) || 0;
    const auctionFees = parseFloat(auction_fees) || 0;
    const transportFee = parseFloat(transport_fee) || 0;
    const profitPrice = buyPrice + auctionFees + transportFee;
    
    db.run(`
        INSERT INTO inventory 
        (vin, make, model, year, color, trim, miles, accident_history, number_of_owners, date_bought, auction_site, 
         buy_price, auction_fees, transport_fee, profit_price, market_price, sale_date, sale_price,
         status, notes, customer_name, customer_phone, customer_email, image_path)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        vin, make, model, year, color, trim, miles, accident_history, number_of_owners,
        date_bought, auction_site, buy_price, auction_fees, transport_fee, profitPrice, market_price, sale_date, sale_price,
        status || 'In Stock', notes, customer_name, customer_phone, customer_email, image_path
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
        vin, make, model, year, color, trim, miles, accident_history, number_of_owners,
        date_bought, auction_site, buy_price, auction_fees, transport_fee, market_price, sale_date, sale_price,
        status, notes, customer_name, customer_phone, customer_email, image_path
    } = req.body;
    
    // Get current total repair costs
    db.get('SELECT COALESCE(SUM(cost), 0) as total FROM repairs WHERE inventory_id = ?', [id], (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        const totalRepairCosts = result.total || 0;
        
        // Get total expenses
        db.get('SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE inventory_id = ?', [id], (err, expenseResult) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            const totalExpenses = expenseResult.total || 0;
            const buyPrice = parseFloat(buy_price) || 0;
            const auctionFees = parseFloat(auction_fees) || 0;
            const transportFee = parseFloat(transport_fee) || 0;
            const profitPrice = buyPrice + auctionFees + transportFee + totalRepairCosts + totalExpenses;
        
            db.run(`
            UPDATE inventory SET
                vin = ?, make = ?, model = ?, year = ?, color = ?, trim = ?, miles = ?,
                accident_history = ?, number_of_owners = ?, date_bought = ?, auction_site = ?, buy_price = ?, auction_fees = ?,
                transport_fee = ?, profit_price = ?, market_price = ?, sale_date = ?, sale_price = ?,
                status = ?, notes = ?, customer_name = ?, customer_phone = ?, customer_email = ?, image_path = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            vin, make, model, year, color, trim, miles, accident_history, number_of_owners,
            date_bought, auction_site, buy_price, auction_fees, transport_fee, profitPrice, market_price, sale_date, sale_price,
            status || 'In Stock', notes, customer_name, customer_phone, customer_email, image_path, id
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

// Bulk operations
router.post('/bulk', (req, res) => {
    const { action, ids, data } = req.body;
    
    if (!action || !ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'Invalid bulk operation request' });
    }
    
    const placeholders = ids.map(() => '?').join(',');
    
    if (action === 'delete') {
        db.run(`DELETE FROM inventory WHERE id IN (${placeholders})`, ids, function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: `${this.changes} vehicle(s) deleted successfully` });
        });
    } else if (action === 'update') {
        if (!data || typeof data !== 'object') {
            return res.status(400).json({ error: 'Update data required' });
        }
        
        const updates = [];
        const values = [];
        
        Object.keys(data).forEach(key => {
            if (key !== 'id' && key !== 'vin') {
                updates.push(`${key} = ?`);
                values.push(data[key]);
            }
        });
        
        if (updates.length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }
        
        values.push(...ids);
        const sql = `UPDATE inventory SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`;
        
        db.run(sql, values, function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: `${this.changes} vehicle(s) updated successfully` });
        });
    } else {
        return res.status(400).json({ error: 'Invalid action' });
    }
});

// Export inventory to CSV
router.get('/export/csv', (req, res) => {
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
        
        // Convert to CSV
        const headers = ['ID', 'VIN', 'Make', 'Model', 'Year', 'Color', 'Trim', 'Miles', 'Accident History', 
                        'Number of Owners', 'Date Bought', 'Auction Site', 'Buy Price', 'Auction Fees', 
                        'Transport Fee', 'Repair Costs', 'Total Cost', 'Market Price', 'Sale Date', 'Sale Price',
                        'Status', 'Customer Name', 'Customer Phone', 'Customer Email'];
        const csvRows = [headers.join(',')];
        
        rows.forEach(row => {
            const repairCost = parseFloat(row.total_repair_costs) || 0;
            const totalCost = parseFloat(row.profit_price) || 0;
            const values = [
                row.id, row.vin, row.make, row.model, row.year, row.color, row.trim, row.miles,
                row.accident_history || '', row.number_of_owners || '', row.date_bought, row.auction_site,
                row.buy_price, row.auction_fees, row.transport_fee, repairCost, totalCost,
                row.market_price || '', row.sale_date || '', row.sale_price || '',
                row.status || 'In Stock', row.customer_name || '', row.customer_phone || '', row.customer_email || ''
            ];
            csvRows.push(values.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
        });
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=inventory-export.csv');
        res.send(csvRows.join('\n'));
    });
});

module.exports = router;

