const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure database directory exists
const dbDir = path.join(__dirname, '..', 'database');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'inventory.db');
const db = new sqlite3.Database(dbPath);

// Initialize database schema
db.serialize(() => {
    // Create inventory table
    db.run(`
        CREATE TABLE IF NOT EXISTS inventory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vin TEXT UNIQUE NOT NULL,
            make TEXT,
            model TEXT,
            year INTEGER,
            color TEXT,
            trim TEXT,
            miles INTEGER,
            date_bought DATE,
            auction_site TEXT,
            buy_price REAL,
            auction_fees REAL,
            transport_fee REAL,
            profit_price REAL,
            market_price REAL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create repairs table
    db.run(`
        CREATE TABLE IF NOT EXISTS repairs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            inventory_id INTEGER NOT NULL,
            repair_date DATE NOT NULL,
            description TEXT NOT NULL,
            cost REAL NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE CASCADE
        )
    `);

    // Create index on inventory_id for faster repairs queries
    db.run(`
        CREATE INDEX IF NOT EXISTS idx_repairs_inventory_id 
        ON repairs(inventory_id)
    `);
});

module.exports = db;

