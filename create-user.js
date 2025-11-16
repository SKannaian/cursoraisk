/**
 * Script to create a new user in the system
 * Usage: node create-user.js <username> <password>
 * 
 * Example: node create-user.js admin mypassword123
 */

const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
    console.log('Usage: node create-user.js <username> <password>');
    console.log('Example: node create-user.js admin mypassword123');
    process.exit(1);
}

const username = args[0];
const password = args[1];

if (password.length < 6) {
    console.error('Error: Password must be at least 6 characters long');
    process.exit(1);
}

// Database path
const dbDir = path.join(__dirname, 'database');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'inventory.db');
const db = new sqlite3.Database(dbPath);

// Check if user already exists
db.get('SELECT id FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) {
        console.error('Database error:', err.message);
        db.close();
        process.exit(1);
    }

    if (user) {
        console.error(`Error: User "${username}" already exists`);
        db.close();
        process.exit(1);
    }

    // Hash password
    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new user
        db.run('INSERT INTO users (username, password) VALUES (?, ?)', 
            [username, hashedPassword], 
            function(err) {
                if (err) {
                    console.error('Error creating user:', err.message);
                    db.close();
                    process.exit(1);
                }
                
                console.log(`✓ User "${username}" created successfully!`);
                console.log(`  User ID: ${this.lastID}`);
                db.close();
                process.exit(0);
            }
        );
    } catch (error) {
        console.error('Error hashing password:', error.message);
        db.close();
        process.exit(1);
    }
});

