# Wholesale Car Inventory Management System

A comprehensive inventory management system for wholesale car dealers with VIN lookup, repair tracking, and profit calculation.

## Features

- **VIN Lookup**: Automatic vehicle details population using NHTSA vPIC API
- **Inventory Management**: Track vehicles with purchase details, auction information, and costs
- **Repair Log**: Maintain detailed repair history with costs
- **Profit Calculation**: Automatic calculation of total costs and potential profit
- **Price Comparison**: Quick links to CarGurus for market price comparison
- **Table View**: Sortable inventory table with totals
- **Authentication**: Secure login system with controlled access

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create your first user account:
```bash
node create-user.js <username> <password>
```

Example:
```bash
node create-user.js admin mypassword123
```

3. Start the server:
```bash
npm start
```

4. Open your browser and navigate to:
```
http://localhost:3000
```

## User Management

### Creating New Users

Only authorized administrators can create new users. There are two ways:

1. **Via Admin Panel (Recommended)**: 
   - Log in as admin
   - Click the "Admin" button in the top-right
   - Enter the user's email and company name
   - Click "Send Invitation Email"
   - The user will receive an email with login credentials

2. **Via Script**:
   ```bash
   node create-user.js <username> <password>
   ```

### Email Configuration (for Admin Invitations)

To enable email invitations, create a `.env` file in the project root with:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_NAME=Wholesale Car Inventory
APP_URL=http://localhost:3000
ADMIN_USER_ID=1
```

**For Gmail:**
- Use an App Password (not your regular password)
- Enable 2-factor authentication
- Generate App Password: https://myaccount.google.com/apppasswords

**Note**: The password must be at least 6 characters long.

### Default Master Password (for API)

If you need to create users via API, you can set a master password using an environment variable:

```bash
# Windows PowerShell
$env:MASTER_PASSWORD="your-secret-password"
npm start

# Or create a .env file (not included in repo for security)
```

The default master password is `admin123` (change this in production!).

## Usage

1. **Login**: Use your username and password to access the system
2. **Add Vehicle**: 
   - Enter VIN and click "Lookup VIN" to auto-populate details
   - Fill in purchase information (date, auction site, prices, fees)
   - Click "Save Vehicle"
3. **View Inventory**: 
   - See all vehicles in a sortable table
   - Sort by date, mileage, year, or buy price
   - View totals for buy price, auction fees, and transport fees
4. **Repair Log**: 
   - Add repair entries with date, description, and cost
   - Repair costs are automatically included in profit calculations
5. **Price Comparison**: 
   - CarGurus link appears automatically when you enter make, model, and year
   - Click to view similar vehicles on CarGurus

## Database

The system uses SQLite database stored in the `database/` directory:
- `inventory.db`: Contains all inventory, repairs, and user data

## Security

- Passwords are hashed using bcrypt
- Session-based authentication
- All API routes require authentication
- User registration is restricted (admin-only)

## Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: SQLite3
- **Frontend**: HTML, CSS, JavaScript
- **Authentication**: express-session, bcrypt
- **APIs**: NHTSA vPIC API (VIN decoding)

## License

ISC
