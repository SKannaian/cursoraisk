const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db');

// Add repair log entry
router.post('/', (req, res) => {
    const inventoryId = req.params.inventoryId || req.inventoryId;
    const { repair_date, description, cost, part_cost, labor_cost } = req.body;
    
    if (!repair_date || !description) {
        return res.status(400).json({ error: 'Missing required fields: repair_date, description' });
    }
    
    // Calculate total cost if not provided
    const partCost = parseFloat(part_cost) || 0;
    const laborCost = parseFloat(labor_cost) || 0;
    const totalCost = cost !== undefined ? parseFloat(cost) : (partCost + laborCost);
    
    if (totalCost <= 0) {
        return res.status(400).json({ error: 'Total cost must be greater than 0' });
    }
    
    db.run(`
        INSERT INTO repairs (inventory_id, repair_date, description, cost, part_cost, labor_cost)
        VALUES (?, ?, ?, ?, ?, ?)
    `, [inventoryId, repair_date, description, totalCost, partCost, laborCost], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        const repairId = this.lastID;
        
        // Update profit_price in inventory to include this repair cost
        db.get('SELECT COALESCE(SUM(cost), 0) as total FROM repairs WHERE inventory_id = ?', [inventoryId], (err, result) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            const totalRepairCosts = result.total || 0;
            
            db.get('SELECT buy_price, auction_fees, transport_fee FROM inventory WHERE id = ?', [inventoryId], (err, vehicle) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                
                const buyPrice = parseFloat(vehicle.buy_price) || 0;
                const auctionFees = parseFloat(vehicle.auction_fees) || 0;
                const transportFee = parseFloat(vehicle.transport_fee) || 0;
                const profitPrice = buyPrice + auctionFees + transportFee + totalRepairCosts;
                
                db.run('UPDATE inventory SET profit_price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
                    [profitPrice, inventoryId], (err) => {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }
                    res.json({ id: repairId, message: 'Repair added successfully' });
                });
            });
        });
    });
});

// Get all repairs for an inventory item
router.get('/', (req, res) => {
    const inventoryId = req.params.inventoryId || req.inventoryId;
    
    db.all('SELECT * FROM repairs WHERE inventory_id = ? ORDER BY repair_date DESC', [inventoryId], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Update repair entry
router.put('/:repairId', (req, res) => {
    const repairId = req.params.repairId;
    const { repair_date, description, cost, part_cost, labor_cost } = req.body;
    
    if (!repair_date || !description) {
        return res.status(400).json({ error: 'Missing required fields: repair_date, description' });
    }
    
    // Calculate total cost if not provided
    const partCost = parseFloat(part_cost) || 0;
    const laborCost = parseFloat(labor_cost) || 0;
    const totalCost = cost !== undefined ? parseFloat(cost) : (partCost + laborCost);
    
    if (totalCost <= 0) {
        return res.status(400).json({ error: 'Total cost must be greater than 0' });
    }
    
    // Get inventory_id from repair
    db.get('SELECT inventory_id FROM repairs WHERE id = ?', [repairId], (err, repair) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!repair) {
            return res.status(404).json({ error: 'Repair not found' });
        }
        
        const inventoryId = repair.inventory_id;
        
        // Update repair
        db.run(`
            UPDATE repairs 
            SET repair_date = ?, description = ?, cost = ?, part_cost = ?, labor_cost = ?
            WHERE id = ?
        `, [repair_date, description, totalCost, partCost, laborCost, repairId], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            // Update profit_price in inventory
            db.get('SELECT COALESCE(SUM(cost), 0) as total FROM repairs WHERE inventory_id = ?', [inventoryId], (err, result) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                
                const totalRepairCosts = result.total || 0;
                
                db.get('SELECT buy_price, auction_fees, transport_fee FROM inventory WHERE id = ?', [inventoryId], (err, vehicle) => {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }
                    
                    const buyPrice = parseFloat(vehicle.buy_price) || 0;
                    const auctionFees = parseFloat(vehicle.auction_fees) || 0;
                    const transportFee = parseFloat(vehicle.transport_fee) || 0;
                    const profitPrice = buyPrice + auctionFees + transportFee + totalRepairCosts;
                    
                    db.run('UPDATE inventory SET profit_price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
                        [profitPrice, inventoryId], (err) => {
                        if (err) {
                            return res.status(500).json({ error: err.message });
                        }
                        res.json({ message: 'Repair updated successfully' });
                    });
                });
            });
        });
    });
});

// Delete repair entry
router.delete('/:repairId', (req, res) => {
    const repairId = req.params.repairId;
    
    // Get inventory_id before deleting
    db.get('SELECT inventory_id FROM repairs WHERE id = ?', [repairId], (err, repair) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!repair) {
            return res.status(404).json({ error: 'Repair not found' });
        }
        
        const inventoryId = repair.inventory_id;
        
        // Delete the repair
        db.run('DELETE FROM repairs WHERE id = ?', [repairId], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            // Update profit_price in inventory
            db.get('SELECT COALESCE(SUM(cost), 0) as total FROM repairs WHERE inventory_id = ?', [inventoryId], (err, result) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                
                const totalRepairCosts = result.total || 0;
                
                db.get('SELECT buy_price, auction_fees, transport_fee FROM inventory WHERE id = ?', [inventoryId], (err, vehicle) => {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }
                    
                    const buyPrice = parseFloat(vehicle.buy_price) || 0;
                    const auctionFees = parseFloat(vehicle.auction_fees) || 0;
                    const transportFee = parseFloat(vehicle.transport_fee) || 0;
                    const profitPrice = buyPrice + auctionFees + transportFee + totalRepairCosts;
                    
                    db.run('UPDATE inventory SET profit_price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
                        [profitPrice, inventoryId], (err) => {
                        if (err) {
                            return res.status(500).json({ error: err.message });
                        }
                        res.json({ message: 'Repair deleted successfully' });
                    });
                });
            });
        });
    });
});

module.exports = router;

