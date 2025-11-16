# Wholesale Car Dealer Inventory Maintenance System

A web application for wholesale car dealers to maintain inventory with VIN lookup, purchase tracking, repair logs, and profit calculations.

## Features

- VIN entry with automatic car details population
- Purchase details tracking (date, auction site, prices, fees)
- Repair log maintenance
- Profit calculation based on buy price + fees + repairs
- Market price comparison (manual entry)
- Inventory list view

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Open your browser and navigate to:
```
http://localhost:3000
```

## Technology Stack

- Frontend: HTML5, CSS3, Vanilla JavaScript
- Backend: Node.js, Express.js
- Database: SQLite3
- VIN Decoder: NHTSA vPIC API

