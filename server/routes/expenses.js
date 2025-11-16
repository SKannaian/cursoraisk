const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all expenses for a vehicle
router.get('/:inventoryId/expenses', (req, res) => {
    const inventoryId = req.params.inventoryId;
    
    db.all('SELECT * FROM expenses WHERE inventory_id = ? ORDER BY expense_date DESC', [inventoryId], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Create new expense
router.post('/:inventoryId/expenses', (req, res) => {
    const inventoryId = req.params.inventoryId;
    const { expense_date, category, description, amount } = req.body;
    
    if (!expense_date || !category || !description || !amount) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const expenseAmount = parseFloat(amount);
    if (isNaN(expenseAmount) || expenseAmount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
    }
    
    db.run(`
        INSERT INTO expenses (inventory_id, expense_date, category, description, amount)
        VALUES (?, ?, ?, ?, ?)
    `, [inventoryId, expense_date, category, description, expenseAmount], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        // Update profit_price in inventory to include this expense
        db.get('SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE inventory_id = ?', [inventoryId], (err, result) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            const totalExpenses = result.total || 0;
            
            db.get('SELECT buy_price, auction_fees, transport_fee FROM inventory WHERE id = ?', [inventoryId], (err, vehicle) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                
                db.get('SELECT COALESCE(SUM(cost), 0) as total FROM repairs WHERE inventory_id = ?', [inventoryId], (err, repairResult) => {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }
                    
                    const totalRepairCosts = repairResult.total || 0;
                    const buyPrice = parseFloat(vehicle.buy_price) || 0;
                    const auctionFees = parseFloat(vehicle.auction_fees) || 0;
                    const transportFee = parseFloat(vehicle.transport_fee) || 0;
                    const profitPrice = buyPrice + auctionFees + transportFee + totalRepairCosts + totalExpenses;
                    
                    db.run('UPDATE inventory SET profit_price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
                        [profitPrice, inventoryId], (err) => {
                        if (err) {
                            return res.status(500).json({ error: err.message });
                        }
                        res.json({ id: this.lastID, message: 'Expense added successfully' });
                    });
                });
            });
        });
    });
});

// Update expense
router.put('/:inventoryId/expenses/:expenseId', (req, res) => {
    const expenseId = req.params.expenseId;
    const inventoryId = req.params.inventoryId;
    const { expense_date, category, description, amount } = req.body;
    
    if (!expense_date || !category || !description || !amount) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const expenseAmount = parseFloat(amount);
    if (isNaN(expenseAmount) || expenseAmount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
    }
    
    db.run(`
        UPDATE expenses 
        SET expense_date = ?, category = ?, description = ?, amount = ?
        WHERE id = ? AND inventory_id = ?
    `, [expense_date, category, description, expenseAmount, expenseId, inventoryId], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        // Recalculate profit_price
        db.get('SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE inventory_id = ?', [inventoryId], (err, result) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            const totalExpenses = result.total || 0;
            
            db.get('SELECT buy_price, auction_fees, transport_fee FROM inventory WHERE id = ?', [inventoryId], (err, vehicle) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                
                db.get('SELECT COALESCE(SUM(cost), 0) as total FROM repairs WHERE inventory_id = ?', [inventoryId], (err, repairResult) => {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }
                    
                    const totalRepairCosts = repairResult.total || 0;
                    const buyPrice = parseFloat(vehicle.buy_price) || 0;
                    const auctionFees = parseFloat(vehicle.auction_fees) || 0;
                    const transportFee = parseFloat(vehicle.transport_fee) || 0;
                    const profitPrice = buyPrice + auctionFees + transportFee + totalRepairCosts + totalExpenses;
                    
                    db.run('UPDATE inventory SET profit_price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
                        [profitPrice, inventoryId], (err) => {
                        if (err) {
                            return res.status(500).json({ error: err.message });
                        }
                        res.json({ message: 'Expense updated successfully' });
                    });
                });
            });
        });
    });
});

// Delete expense
router.delete('/:inventoryId/expenses/:expenseId', (req, res) => {
    const expenseId = req.params.expenseId;
    const inventoryId = req.params.inventoryId;
    
    db.run('DELETE FROM expenses WHERE id = ? AND inventory_id = ?', [expenseId, inventoryId], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        // Recalculate profit_price
        db.get('SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE inventory_id = ?', [inventoryId], (err, result) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            const totalExpenses = result.total || 0;
            
            db.get('SELECT buy_price, auction_fees, transport_fee FROM inventory WHERE id = ?', [inventoryId], (err, vehicle) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                
                db.get('SELECT COALESCE(SUM(cost), 0) as total FROM repairs WHERE inventory_id = ?', [inventoryId], (err, repairResult) => {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }
                    
                    const totalRepairCosts = repairResult.total || 0;
                    const buyPrice = parseFloat(vehicle.buy_price) || 0;
                    const auctionFees = parseFloat(vehicle.auction_fees) || 0;
                    const transportFee = parseFloat(vehicle.transport_fee) || 0;
                    const profitPrice = buyPrice + auctionFees + transportFee + totalRepairCosts + totalExpenses;
                    
                    db.run('UPDATE inventory SET profit_price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
                        [profitPrice, inventoryId], (err) => {
                        if (err) {
                            return res.status(500).json({ error: err.message });
                        }
                        res.json({ message: 'Expense deleted successfully' });
                    });
                });
            });
        });
    });
});

module.exports = router;

