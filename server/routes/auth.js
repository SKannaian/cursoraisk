const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');
const router = express.Router();
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Register new user (admin only - requires master password)
router.post('/register', async (req, res) => {
    const { username, password, masterPassword } = req.body;

    // Master password check - change this to your desired master password
    const MASTER_PASSWORD = process.env.MASTER_PASSWORD || 'admin123';

    if (!masterPassword || masterPassword !== MASTER_PASSWORD) {
        return res.status(403).json({ error: 'Unauthorized: Master password required' });
    }

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    try {
        // Check if user already exists
        db.get('SELECT id FROM users WHERE username = ?', [username], async (err, user) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            if (user) {
                return res.status(400).json({ error: 'Username already exists' });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert new user
            db.run('INSERT INTO users (username, password) VALUES (?, ?)', 
                [username, hashedPassword], 
                function(err) {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }
                    res.json({ message: 'User created successfully', userId: this.lastID });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ error: 'User creation failed' });
    }
});

// Login
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    console.log('Login attempt:', { username, hasPassword: !!password });

    if (!username || !password) {
        console.log('Login failed: Missing username or password');
        return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: err.message });
        }

        if (!user) {
            console.log('Login failed: User not found');
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Check password
        try {
            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                console.log('Login failed: Invalid password');
                return res.status(401).json({ error: 'Invalid username or password' });
            }

            // Set session
            req.session.userId = user.id;
            req.session.username = user.username;

            console.log('Login successful for user:', user.username, 'Session ID:', req.sessionID);

            res.json({ 
                message: 'Login successful', 
                user: { id: user.id, username: user.username } 
            });
        } catch (bcryptError) {
            console.error('Password comparison error:', bcryptError);
            return res.status(500).json({ error: 'Authentication error' });
        }
    });
});

// Logout
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.clearCookie('sessionId');
        res.json({ message: 'Logout successful' });
    });
});

// Check authentication status
router.get('/check', (req, res) => {
    if (req.session && req.session.userId) {
        // Check if user is admin
        const ADMIN_USER_ID = parseInt(process.env.ADMIN_USER_ID) || 1; // Default to first user (ID 1)
        const isAdmin = req.session.userId === ADMIN_USER_ID;
        
        res.json({ 
            authenticated: true, 
            user: { 
                id: req.session.userId, 
                username: req.session.username 
            },
            isAdmin: isAdmin
        });
    } else {
        res.json({ authenticated: false });
    }
});

// Get all users (admin only)
router.get('/users', (req, res) => {
    const ADMIN_USER_ID = parseInt(process.env.ADMIN_USER_ID) || 1;
    
    if (!req.session || !req.session.userId || req.session.userId !== ADMIN_USER_ID) {
        return res.status(403).json({ error: 'Unauthorized: Admin access required' });
    }
    
    db.all('SELECT id, username, created_at FROM users ORDER BY created_at DESC', (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Delete user (admin only)
router.delete('/users/:id', (req, res) => {
    const ADMIN_USER_ID = parseInt(process.env.ADMIN_USER_ID) || 1;
    const userIdToDelete = parseInt(req.params.id);
    
    if (!req.session || !req.session.userId || req.session.userId !== ADMIN_USER_ID) {
        return res.status(403).json({ error: 'Unauthorized: Admin access required' });
    }
    
    // Prevent deleting yourself
    if (userIdToDelete === req.session.userId) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    db.run('DELETE FROM users WHERE id = ?', [userIdToDelete], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ message: 'User deleted successfully' });
    });
});

// Configure email transporter
function getEmailTransporter() {
    // Use environment variables for email configuration
    const emailConfig = {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    };
    
    // Only create transporter if credentials are provided
    if (emailConfig.auth.user && emailConfig.auth.pass) {
        return nodemailer.createTransport(emailConfig);
    }
    
    return null;
}

// Invite user (admin only) - sends email with signup link
router.post('/invite', async (req, res) => {
    const ADMIN_USER_ID = parseInt(process.env.ADMIN_USER_ID) || 1;
    const { email, companyName } = req.body;
    
    // Function to proceed with invitation
    async function proceedWithInvitation() {
        if (!email || !companyName) {
            return res.status(400).json({ error: 'Email and company name are required' });
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }
        
        // Check if user already exists
        db.get('SELECT id FROM users WHERE username = ?', [email], async (err, existingUser) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            if (existingUser) {
                return res.status(400).json({ error: 'User with this email already exists' });
            }
            
            // Generate temporary password
            const tempPassword = crypto.randomBytes(8).toString('hex');
            const hashedPassword = await bcrypt.hash(tempPassword, 10);
            
            // Create user account
            db.run('INSERT INTO users (username, password) VALUES (?, ?)', 
                [email, hashedPassword], 
                async function(err) {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }
                    
                    const userId = this.lastID;
                    
                    // Send invitation email
                    const transporter = getEmailTransporter();
                    
                    if (!transporter) {
                        // If email is not configured, return success with credentials
                        return res.json({ 
                            message: 'User created successfully. Email not configured. Please provide these credentials to the user manually.',
                            credentials: {
                                username: email,
                                password: tempPassword,
                                note: 'Please change password after first login'
                            }
                        });
                    }
                    
                    try {
                        const appUrl = process.env.APP_URL || 'http://localhost:3000';
                        const loginUrl = `${appUrl}/`;
                        
                        const mailOptions = {
                            from: `"${process.env.SMTP_FROM_NAME || 'Wholesale Car Inventory'}" <${process.env.SMTP_USER}>`,
                            to: email,
                            subject: `Invitation to ${companyName} - Wholesale Car Inventory System`,
                            html: `
                                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                    <h2 style="color: #667eea;">Welcome to ${companyName}</h2>
                                    <p>You have been invited to access the Wholesale Car Inventory Management System.</p>
                                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                        <p><strong>Your login credentials:</strong></p>
                                        <p><strong>Email:</strong> ${email}</p>
                                        <p><strong>Temporary Password:</strong> <code style="background: white; padding: 4px 8px; border-radius: 4px;">${tempPassword}</code></p>
                                    </div>
                                    <p><strong>Important:</strong> Please change your password after your first login for security.</p>
                                    <p style="margin-top: 30px;">
                                        <a href="${loginUrl}" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Login Now</a>
                                    </p>
                                    <p style="color: #666; font-size: 12px; margin-top: 30px;">
                                        If you did not expect this invitation, please ignore this email.
                                    </p>
                                </div>
                            `,
                            text: `
Welcome to ${companyName}

You have been invited to access the Wholesale Car Inventory Management System.

Your login credentials:
Email: ${email}
Temporary Password: ${tempPassword}

Important: Please change your password after your first login for security.

Login URL: ${loginUrl}

If you did not expect this invitation, please ignore this email.
                            `
                        };
                        
                        await transporter.sendMail(mailOptions);
                        
                        res.json({ 
                            message: 'Invitation email sent successfully',
                            userId: userId
                        });
                    } catch (emailError) {
                        console.error('Email send error:', emailError);
                        // User was created but email failed - return credentials
                        res.json({ 
                            message: 'User created but email failed to send. Please provide these credentials to the user manually.',
                            credentials: {
                                username: email,
                                password: tempPassword,
                                note: 'Please change password after first login'
                            },
                            userId: userId
                        });
                    }
                }
            );
        });
    }
    
    // Check if user is logged in as admin
    if (req.session && req.session.userId && req.session.userId === ADMIN_USER_ID) {
        // User is logged in as admin
        proceedWithInvitation();
    } else {
        return res.status(403).json({ error: 'Unauthorized: Admin access required. Please login as admin first.' });
    }
});

module.exports = router;

