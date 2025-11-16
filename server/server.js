const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const inventoryRoutes = require('./routes/inventory');
const repairsRoutes = require('./routes/repairs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// API Routes
app.use('/api/inventory', inventoryRoutes);
app.use('/api/inventory/:inventoryId/repairs', repairsRoutes);
app.use('/api/inventory/repairs', repairsRoutes);

// VIN Decoder endpoint (proxy to NHTSA vPIC API)
app.get('/api/vin/:vin', async (req, res) => {
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

