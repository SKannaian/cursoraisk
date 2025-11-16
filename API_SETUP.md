# Vehicle History API Setup

To enable automatic population of accident history and number of owners from VIN lookup, you need to configure a vehicle history API.

## Available APIs

### Option 1: CarsXE API (Recommended)
1. Sign up at: https://api.carsxe.com/
2. Get your API key from the dashboard
3. Set environment variable:
   ```bash
   # Windows PowerShell
   $env:CARSXE_API_KEY="your-api-key-here"
   
   # Or create a .env file (not included in repo for security)
   CARSXE_API_KEY=your-api-key-here
   ```

### Option 2: VinAudit API
1. Sign up at: https://www.vinaudit.com/
2. Get your API key
3. Set environment variable:
   ```bash
   # Windows PowerShell
   $env:VINAUDIT_API_KEY="your-api-key-here"
   ```

## Setup Instructions

### Method 1: Environment Variable (Temporary)
```powershell
# Windows PowerShell
$env:CARSXE_API_KEY="your-api-key-here"
npm start
```

### Method 2: .env File (Recommended for Production)
1. Create a `.env` file in the project root
2. Add your API key:
   ```
   CARSXE_API_KEY=your-api-key-here
   ```
3. Install dotenv package:
   ```bash
   npm install dotenv
   ```
4. Update `server/server.js` to load .env file:
   ```javascript
   require('dotenv').config();
   ```

### Method 3: System Environment Variables (Permanent)
1. Set system environment variable in Windows
2. Restart your terminal/server

## API Pricing

Most vehicle history APIs offer:
- **Free tier**: Limited requests per month
- **Paid plans**: More requests and additional features

Check each provider's website for current pricing.

## Fallback Behavior

If no API key is configured:
- VIN lookup will still work for basic vehicle details (make, model, year, etc.)
- Accident history and number of owners fields will remain empty
- You can manually enter this information

## Testing

After setting up your API key:
1. Restart the server
2. Enter a VIN and click "Lookup VIN"
3. Check if accident history and number of owners are populated
4. If not, check server console for error messages

