// Load environment variables from .env file if it exists
try {
    require('dotenv').config();
} catch (e) {
    // dotenv not installed, continue without it
    console.log('Note: dotenv not installed. Using system environment variables only.');
}

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const multer = require('multer');
const db = require('./db');
const inventoryRoutes = require('./routes/inventory');
const repairsRoutes = require('./routes/repairs');
const authRoutes = require('./routes/auth');
const expensesRoutes = require('./routes/expenses');
const alertsRoutes = require('./routes/alerts');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware - CORS must come before session
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json());

// Session configuration - must come after CORS and express.json
app.use(session({
    secret: 'wholesale-car-inventory-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    name: 'sessionId', // Custom session name
    cookie: {
        secure: false, // Set to true if using HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax' // Helps with cross-site requests
    }
}));

app.use(express.static(path.join(__dirname, '..', 'public')));

// Configure multer for file uploads (images)
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'vehicle-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Serve uploaded images
app.use('/uploads', express.static(uploadsDir));

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (req.session && req.session.userId) {
        next();
    } else {
        res.status(401).json({ error: 'Authentication required' });
    }
};

// Authentication routes (public)
app.use('/api/auth', authRoutes);

// Protected API Routes
app.use('/api/inventory', requireAuth, inventoryRoutes);
app.use('/api/inventory/:inventoryId/repairs', requireAuth, repairsRoutes);
app.use('/api/inventory/repairs', requireAuth, repairsRoutes);
app.use('/api/inventory/:inventoryId/expenses', requireAuth, expensesRoutes);
app.use('/api/alerts', requireAuth, alertsRoutes);

// Image upload endpoint
app.post('/api/upload', requireAuth, upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    res.json({ 
        imagePath: `/uploads/${req.file.filename}`,
        filename: req.file.filename
    });
});

// Vehicle History API helper function
async function getVehicleHistory(vin) {
    // Check if API key is configured (you can set this via environment variable)
    const CARSXE_API_KEY = process.env.CARSXE_API_KEY;
    const VINAUDIT_API_KEY = process.env.VINAUDIT_API_KEY;
    
    // Try CarsXE API first (if key is configured)
    if (CARSXE_API_KEY) {
        try {
            const response = await fetch(`https://api.carsxe.com/history?key=${CARSXE_API_KEY}&vin=${vin}`);
            const data = await response.json();
            
            if (data.success && data.specifications) {
                const history = data.history || {};
                const accidents = history.accidents || [];
                const titles = history.titles || [];
                
                // Determine accident history
                let accidentHistory = null;
                if (accidents && accidents.length > 0) {
                    const hasMajor = accidents.some(a => a.severity === 'Major' || a.severity === 'Severe');
                    const hasModerate = accidents.some(a => a.severity === 'Moderate');
                    if (hasMajor) accidentHistory = 'Major';
                    else if (hasModerate) accidentHistory = 'Moderate';
                    else accidentHistory = 'Minor';
                } else {
                    accidentHistory = 'None';
                }
                
                // Count number of owners from title history
                const numberOfOwners = titles ? titles.length : null;
                
                return {
                    accident_history: accidentHistory,
                    number_of_owners: numberOfOwners
                };
            }
        } catch (error) {
            console.log('CarsXE API error:', error.message);
        }
    }
    
    // Try VinAudit API as fallback (if key is configured)
    if (VINAUDIT_API_KEY) {
        try {
            const response = await fetch(`https://api.vinaudit.com/v2/lookup?key=${VINAUDIT_API_KEY}&vin=${vin}`);
            const data = await response.json();
            
            if (data.success) {
                const history = data.history || {};
                const accidents = history.accidents || [];
                const owners = history.owners || [];
                
                // Determine accident history
                let accidentHistory = null;
                if (accidents && accidents.length > 0) {
                    const hasMajor = accidents.some(a => a.severity === 'Major' || a.severity === 'Severe');
                    const hasModerate = accidents.some(a => a.severity === 'Moderate');
                    if (hasMajor) accidentHistory = 'Major';
                    else if (hasModerate) accidentHistory = 'Moderate';
                    else accidentHistory = 'Minor';
                } else {
                    accidentHistory = 'None';
                }
                
                return {
                    accident_history: accidentHistory,
                    number_of_owners: owners.length || null
                };
            }
        } catch (error) {
            console.log('VinAudit API error:', error.message);
        }
    }
    
    // If no API keys configured, return null (graceful fallback)
    return null;
}

// VIN Decoder endpoint (proxy to NHTSA vPIC API) - protected
app.get('/api/vin/:vin', requireAuth, async (req, res) => {
    const vin = req.params.vin;
    
    if (!vin || vin.length !== 17) {
        return res.status(400).json({ error: 'Invalid VIN. Must be 17 characters.' });
    }
    
    try {
        const response = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${vin}?format=json`);
        const data = await response.json();
        
        if (data.Results && data.Results.length > 0) {
            // NHTSA API returns an array of {Variable, Value} objects
            // We need to find the right variables in the results
            const findValue = (variableNames) => {
                // Accept array of possible variable names
                const names = Array.isArray(variableNames) ? variableNames : [variableNames];
                for (const name of names) {
                    const item = data.Results.find(r => r.Variable === name);
                    if (item && item.Value && 
                        item.Value !== 'Not Applicable' && 
                        item.Value !== '' && 
                        item.Value !== null &&
                        item.Value.trim() !== '') {
                        return item.Value.trim();
                    }
                }
                return null;
            };
            
            // Extract relevant information - try multiple possible variable names
            const make = findValue('Make');
            const model = findValue(['Model', 'Model Name']);
            const yearStr = findValue(['Model Year', 'Year']);
            const year = yearStr ? parseInt(yearStr) : null;
            const trim = findValue(['Trim', 'Trim2']);
            const color = findValue(['Exterior Primary Color', 'Base Color', 'Primary Color']);
            
            const vehicleInfo = {
                make: make || '',
                model: model || '',
                year: year || null,
                trim: trim || '',
                color: color || '',
                bodyClass: findValue('Body Class') || '',
                engine: findValue('Engine Configuration') || '',
                transmission: findValue('Transmission Style') || '',
                driveType: findValue('Drive Type') || ''
            };
            
            // Try to get vehicle history (accident history, number of owners) if API key is configured
            try {
                const historyData = await getVehicleHistory(vin);
                if (historyData) {
                    vehicleInfo.accident_history = historyData.accident_history || null;
                    vehicleInfo.number_of_owners = historyData.number_of_owners || null;
                }
            } catch (error) {
                console.log('Vehicle history lookup not available or failed:', error.message);
                // Continue without history data - not critical
            }
            
            // Log for debugging
            console.log('VIN lookup result:', vehicleInfo);
            
            res.json(vehicleInfo);
        } else {
            res.status(404).json({ error: 'VIN not found' });
        }
    } catch (error) {
        console.error('VIN decoder error:', error);
        res.status(500).json({ error: 'Failed to decode VIN' });
    }
});

// Serve index.html for root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Database initialized');
});

