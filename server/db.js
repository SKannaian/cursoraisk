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
            accident_history TEXT,
            number_of_owners INTEGER,
            date_bought DATE,
            auction_site TEXT,
            buy_price REAL,
            auction_fees REAL,
            transport_fee REAL,
            profit_price REAL,
            market_price REAL,
            sale_date DATE,
            sale_price REAL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Add new columns to existing table if they don't exist (for database migration)
    db.run(`ALTER TABLE inventory ADD COLUMN accident_history TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.log('Note: accident_history column may already exist');
        }
    });
    db.run(`ALTER TABLE inventory ADD COLUMN number_of_owners INTEGER`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.log('Note: number_of_owners column may already exist');
        }
    });
    db.run(`ALTER TABLE inventory ADD COLUMN sale_date DATE`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.log('Note: sale_date column may already exist');
        }
    });
    db.run(`ALTER TABLE inventory ADD COLUMN sale_price REAL`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.log('Note: sale_price column may already exist');
        }
    });
    
    // Add new columns for enhanced features
    db.run(`ALTER TABLE inventory ADD COLUMN status TEXT DEFAULT 'In Stock'`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.log('Note: status column may already exist');
        }
    });
    db.run(`ALTER TABLE inventory ADD COLUMN notes TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.log('Note: notes column may already exist');
        }
    });
    db.run(`ALTER TABLE inventory ADD COLUMN customer_name TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.log('Note: customer_name column may already exist');
        }
    });
    db.run(`ALTER TABLE inventory ADD COLUMN customer_phone TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.log('Note: customer_phone column may already exist');
        }
    });
    db.run(`ALTER TABLE inventory ADD COLUMN customer_email TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.log('Note: customer_email column may already exist');
        }
    });
    db.run(`ALTER TABLE inventory ADD COLUMN image_path TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.log('Note: image_path column may already exist');
        }
    });

    // Create repairs table
           db.run(`
               CREATE TABLE IF NOT EXISTS repairs (
                   id INTEGER PRIMARY KEY AUTOINCREMENT,
                   inventory_id INTEGER NOT NULL,
                   repair_date DATE NOT NULL,
                   description TEXT NOT NULL,
                   cost REAL NOT NULL,
                   part_cost REAL DEFAULT 0,
                   labor_cost REAL DEFAULT 0,
                   created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                   FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE CASCADE
               )
           `);
           
           // Add new columns to existing table if they don't exist (for database migration)
           db.run(`ALTER TABLE repairs ADD COLUMN part_cost REAL DEFAULT 0`, (err) => {
               if (err && !err.message.includes('duplicate column')) {
                   console.log('Note: part_cost column may already exist');
               }
           });
           db.run(`ALTER TABLE repairs ADD COLUMN labor_cost REAL DEFAULT 0`, (err) => {
               if (err && !err.message.includes('duplicate column')) {
                   console.log('Note: labor_cost column may already exist');
               }
           });

    // Create index on inventory_id for faster repairs queries
    db.run(`
        CREATE INDEX IF NOT EXISTS idx_repairs_inventory_id 
        ON repairs(inventory_id)
    `);

    // Create users table for authentication
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create index on username for faster lookups
    db.run(`
        CREATE INDEX IF NOT EXISTS idx_users_username 
        ON users(username)
    `);
    
    // Create expenses table for additional expenses beyond repairs
    db.run(`
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            inventory_id INTEGER NOT NULL,
            expense_date DATE NOT NULL,
            category TEXT NOT NULL,
            description TEXT NOT NULL,
            amount REAL NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE CASCADE
        )
    `);
    
    // Create index on inventory_id for faster expenses queries
    db.run(`
        CREATE INDEX IF NOT EXISTS idx_expenses_inventory_id 
        ON expenses(inventory_id)
    `);
    
    // Create alerts table for reminders
    db.run(`
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            inventory_id INTEGER,
            alert_type TEXT NOT NULL,
            message TEXT NOT NULL,
            is_read INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE CASCADE
        )
    `);
    
    // Create index on alerts
    db.run(`
        CREATE INDEX IF NOT EXISTS idx_alerts_inventory_id 
        ON alerts(inventory_id)
    `);
    db.run(`
        CREATE INDEX IF NOT EXISTS idx_alerts_is_read 
        ON alerts(is_read)
    `);
});

module.exports = db;

