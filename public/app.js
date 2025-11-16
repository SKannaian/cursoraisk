// Global state
let currentVehicleId = null;
let currentVehicleData = null;

// DOM Elements
const viewInventoryBtn = document.getElementById('viewInventoryBtn');
const addVehicleBtn = document.getElementById('addVehicleBtn');
const addVehicleSection = document.getElementById('addVehicleSection');
const inventorySection = document.getElementById('inventorySection');
const vehicleForm = document.getElementById('vehicleForm');
const repairForm = document.getElementById('repairForm');
const lookupVinBtn = document.getElementById('lookupVinBtn');
const resetFormBtn = document.getElementById('resetFormBtn');
const repairLogSection = document.getElementById('repairLogSection');
const repairsContainer = document.getElementById('repairsContainer');
const currentVehicleIdInput = document.getElementById('currentVehicleId');

// Navigation
viewInventoryBtn.addEventListener('click', () => {
    addVehicleSection.style.display = 'none';
    inventorySection.style.display = 'block';
    viewInventoryBtn.classList.add('active');
    addVehicleBtn.classList.remove('active');
    loadInventory();
});

addVehicleBtn.addEventListener('click', () => {
    addVehicleSection.style.display = 'block';
    inventorySection.style.display = 'none';
    addVehicleBtn.classList.add('active');
    viewInventoryBtn.classList.remove('active');
    resetForm();
});

// VIN Lookup
lookupVinBtn.addEventListener('click', async () => {
    const vin = document.getElementById('vin').value.trim().toUpperCase();
    
    if (!vin || vin.length !== 17) {
        alert('Please enter a valid 17-character VIN');
        return;
    }
    
    lookupVinBtn.disabled = true;
    lookupVinBtn.textContent = 'Looking up...';
    
    try {
        const response = await fetch(`/api/vin/${vin}`);
        const data = await response.json();
        
        if (response.ok) {
            // Debug: log the response
            console.log('VIN lookup response:', data);
            
            // Populate form fields (check for non-empty strings)
            let fieldsPopulated = 0;
            if (data.make && data.make.trim() !== '') {
                document.getElementById('make').value = data.make.trim();
                fieldsPopulated++;
            }
            if (data.model && data.model.trim() !== '') {
                document.getElementById('model').value = data.model.trim();
                fieldsPopulated++;
            }
            if (data.year && data.year !== null && data.year !== '') {
                document.getElementById('year').value = data.year;
                fieldsPopulated++;
            }
            if (data.trim && data.trim.trim() !== '') {
                document.getElementById('trim').value = data.trim.trim();
            }
            if (data.color && data.color.trim() !== '') {
                document.getElementById('color').value = data.color.trim();
            }
            
            // Update CarGurus link after VIN lookup populates fields
            updateCarGurusLink();
            
            if (fieldsPopulated > 0) {
                alert(`VIN lookup successful! Populated ${fieldsPopulated} field(s). Please review and complete remaining fields.`);
            } else {
                console.warn('No fields populated. Response data:', data);
                alert('VIN lookup completed, but no vehicle details were found. Please enter details manually. Check browser console (F12) for details.');
            }
        } else {
            alert('VIN lookup failed: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('VIN lookup error:', error);
        alert('Failed to lookup VIN. Please check your internet connection and try again, or enter details manually.');
    } finally {
        lookupVinBtn.disabled = false;
        lookupVinBtn.textContent = 'Lookup VIN';
    }
});

// Calculate and display profit
function calculateProfit() {
    const buyPrice = parseFloat(document.getElementById('buy_price').value) || 0;
    const auctionFees = parseFloat(document.getElementById('auction_fees').value) || 0;
    const transportFee = parseFloat(document.getElementById('transport_fee').value) || 0;
    const marketPrice = parseFloat(document.getElementById('market_price').value) || 0;
    const repairCosts = currentVehicleData?.total_repair_costs || 0;
    
    const totalCost = buyPrice + auctionFees + transportFee + repairCosts;
    
    // Update display
    document.getElementById('displayBuyPrice').textContent = formatCurrency(buyPrice);
    document.getElementById('displayAuctionFees').textContent = formatCurrency(auctionFees);
    document.getElementById('displayTransportFee').textContent = formatCurrency(transportFee);
    document.getElementById('displayRepairCosts').textContent = formatCurrency(repairCosts);
    document.getElementById('displayProfitPrice').textContent = formatCurrency(totalCost);
    
    if (marketPrice > 0) {
        document.getElementById('displayMarketPrice').textContent = formatCurrency(marketPrice);
        document.getElementById('marketPriceDisplay').style.display = 'flex';
        
        const profitMargin = marketPrice - totalCost;
        document.getElementById('displayProfitMargin').textContent = formatCurrency(profitMargin);
        document.getElementById('displayProfitMargin').className = profitMargin >= 0 ? 'positive' : 'negative';
        document.getElementById('profitMarginDisplay').style.display = 'flex';
    } else {
        document.getElementById('marketPriceDisplay').style.display = 'none';
        document.getElementById('profitMarginDisplay').style.display = 'none';
    }
    
    document.getElementById('profitDisplay').style.display = 'block';
}

// Add event listeners for price calculation
['buy_price', 'auction_fees', 'transport_fee', 'market_price'].forEach(id => {
    document.getElementById(id).addEventListener('input', calculateProfit);
});

// CarGurus entity ID mapping for common makes (partial list)
// These are CarGurus internal entity IDs for makes
const cargurusMakeIds = {
    'TOYOTA': 'd2204',
    'HONDA': 'd2205',
    'FORD': 'd2206',
    'CHEVROLET': 'd2207',
    'CHEVY': 'd2207',
    'NISSAN': 'd2208',
    'BMW': 'd2209',
    'MERCEDES-BENZ': 'd2210',
    'MERCEDES': 'd2210',
    'AUDI': 'd2211',
    'HYUNDAI': 'd2212',
    'KIA': 'd2213',
    'MAZDA': 'd2214',
    'SUBARU': 'd2215',
    'VOLKSWAGEN': 'd2216',
    'VW': 'd2216',
    'JEEP': 'd2217',
    'RAM': 'd2218',
    'GMC': 'd2219',
    'DODGE': 'd2220',
    'CHRYSLER': 'd2221',
    'LEXUS': 'd2222',
    'ACURA': 'd2223',
    'INFINITI': 'd2224',
    'CADILLAC': 'd2225',
    'LINCOLN': 'd2226',
    'BUICK': 'd2227',
    'VOLVO': 'd2228',
    'MINI': 'd2229',
    'MITSUBISHI': 'd2230',
    'TESLA': 'd2231'
};

// Update CarGurus link when vehicle details change
function updateCarGurusLink() {
    const make = document.getElementById('make').value.trim();
    const model = document.getElementById('model').value.trim();
    const year = document.getElementById('year').value.trim();
    const linkContainer = document.getElementById('cargurusLink');
    const linkAnchor = document.getElementById('cargurusLinkAnchor');
    const searchText = document.getElementById('cargurusSearchText');
    
    if (make && model && year) {
        const makeFormatted = make.trim().toUpperCase();
        const modelFormatted = model.trim();
        const yearFormatted = year.trim();
        
        // Build CarGurus URL using their search results page format
        // CarGurus uses a specific URL format: /Cars/l-Used-{Make}-{Model}-{Year}-c{ModelID}
        // Since we don't have ModelID, we'll use a search-based approach
        
        // Format make and model for URL (lowercase, replace spaces with dashes)
        const makeUrl = makeFormatted.toLowerCase().replace(/\s+/g, '-');
        const modelUrl = modelFormatted.toLowerCase().replace(/\s+/g, '-');
        
        // Try CarGurus search results URL format
        // Format: /Cars/l-Used-{Make}-{Model}-{Year}
        // This should filter by make, model, and year
        const cargurusUrl = `https://www.cargurus.com/Cars/l-Used-${makeUrl}-${modelUrl}-${yearFormatted}`;
        
        linkAnchor.href = cargurusUrl;
        searchText.textContent = `${yearFormatted} ${makeFormatted} ${modelFormatted}`;
        linkContainer.style.display = 'block';
    } else {
        linkContainer.style.display = 'none';
    }
}

// Add event listeners for CarGurus link updates
['make', 'model', 'year'].forEach(id => {
    const element = document.getElementById(id);
    if (element) {
        element.addEventListener('input', updateCarGurusLink);
        element.addEventListener('change', updateCarGurusLink);
    }
});

// Vehicle Form Submit
vehicleForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(vehicleForm);
    const vehicleData = {
        vin: formData.get('vin').toUpperCase(),
        make: formData.get('make'),
        model: formData.get('model'),
        year: parseInt(formData.get('year')),
        trim: formData.get('trim'),
        color: formData.get('color'),
        miles: parseInt(formData.get('miles')),
        date_bought: formData.get('date_bought'),
        auction_site: formData.get('auction_site'),
        buy_price: parseFloat(formData.get('buy_price')),
        auction_fees: parseFloat(formData.get('auction_fees')),
        transport_fee: parseFloat(formData.get('transport_fee')),
        market_price: formData.get('market_price') ? parseFloat(formData.get('market_price')) : null
    };
    
    try {
        let response;
        if (currentVehicleId) {
            // Update existing vehicle
            response = await fetch(`/api/inventory/${currentVehicleId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(vehicleData)
            });
        } else {
            // Create new vehicle
            response = await fetch('/api/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(vehicleData)
            });
        }
        
        const data = await response.json();
        
        if (response.ok) {
            if (!currentVehicleId) {
                currentVehicleId = data.id;
                currentVehicleIdInput.value = currentVehicleId;
                repairLogSection.style.display = 'block';
                await loadVehicleDetails(currentVehicleId);
            } else {
                await loadVehicleDetails(currentVehicleId);
            }
            alert('Vehicle saved successfully!');
        } else {
            alert('Error: ' + (data.error || 'Failed to save vehicle'));
        }
    } catch (error) {
        console.error('Save error:', error);
        alert('Failed to save vehicle. Please try again.');
    }
});

// Load vehicle details
async function loadVehicleDetails(id) {
    try {
        const response = await fetch(`/api/inventory/${id}`);
        const data = await response.json();
        
        if (response.ok) {
            currentVehicleData = data;
            currentVehicleId = id;
            currentVehicleIdInput.value = id;
            
            // Populate form
            document.getElementById('vin').value = data.vin;
            document.getElementById('make').value = data.make || '';
            document.getElementById('model').value = data.model || '';
            document.getElementById('year').value = data.year || '';
            document.getElementById('trim').value = data.trim || '';
            document.getElementById('color').value = data.color || '';
            document.getElementById('miles').value = data.miles || '';
            document.getElementById('date_bought').value = data.date_bought || '';
            document.getElementById('auction_site').value = data.auction_site || '';
            document.getElementById('buy_price').value = data.buy_price || '';
            document.getElementById('auction_fees').value = data.auction_fees || '';
            document.getElementById('transport_fee').value = data.transport_fee || '';
            document.getElementById('market_price').value = data.market_price || '';
            
            repairLogSection.style.display = 'block';
            loadRepairs(id);
            calculateProfit();
            updateCarGurusLink();
        }
    } catch (error) {
        console.error('Load error:', error);
    }
}

// Repair Form Submit
repairForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!currentVehicleId) {
        alert('Please save the vehicle first before adding repairs');
        return;
    }
    
    const formData = new FormData(repairForm);
    const repairData = {
        repair_date: formData.get('repair_date'),
        description: formData.get('repair_description'),
        cost: parseFloat(formData.get('repair_cost'))
    };
    
    try {
        const response = await fetch(`/api/inventory/${currentVehicleId}/repairs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(repairData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            repairForm.reset();
            await loadRepairs(currentVehicleId);
            await loadVehicleDetails(currentVehicleId);
            alert('Repair added successfully!');
        } else {
            alert('Error: ' + (data.error || 'Failed to add repair'));
        }
    } catch (error) {
        console.error('Repair save error:', error);
        alert('Failed to add repair. Please try again.');
    }
});

// Load repairs for a vehicle
async function loadRepairs(vehicleId) {
    try {
        const response = await fetch(`/api/inventory/${vehicleId}/repairs`);
        const data = await response.json();
        
        if (response.ok) {
            repairsContainer.innerHTML = '';
            
            if (data.length === 0) {
                repairsContainer.innerHTML = '<p class="no-repairs">No repairs recorded yet.</p>';
                return;
            }
            
            data.forEach(repair => {
                const repairItem = document.createElement('div');
                repairItem.className = 'repair-item';
                repairItem.innerHTML = `
                    <div class="repair-header">
                        <span class="repair-date">${formatDate(repair.repair_date)}</span>
                        <span class="repair-cost">${formatCurrency(repair.cost)}</span>
                        <button class="btn-delete" onclick="deleteRepair(${repair.id})">Delete</button>
                    </div>
                    <div class="repair-description">${repair.description}</div>
                `;
                repairsContainer.appendChild(repairItem);
            });
        }
    } catch (error) {
        console.error('Load repairs error:', error);
    }
}

// Delete repair
async function deleteRepair(repairId) {
    if (!confirm('Are you sure you want to delete this repair?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/inventory/repairs/${repairId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            await loadRepairs(currentVehicleId);
            await loadVehicleDetails(currentVehicleId);
            alert('Repair deleted successfully!');
        } else {
            alert('Error: ' + (data.error || 'Failed to delete repair'));
        }
    } catch (error) {
        console.error('Delete repair error:', error);
        alert('Failed to delete repair. Please try again.');
    }
}

// Inventory data storage
let inventoryData = [];
let currentSort = 'date_bought_desc';

// Sort inventory data
function sortInventory(data, sortBy) {
    // Parse sortBy: "date_bought_desc" -> field="date_bought", order="desc"
    const parts = sortBy.split('_');
    const order = parts.pop(); // Get last part (asc/desc)
    const field = parts.join('_'); // Join remaining parts for field name
    
    const sorted = [...data].sort((a, b) => {
        let aVal, bVal;
        
        switch(field) {
            case 'date_bought':
                aVal = new Date(a.date_bought || 0);
                bVal = new Date(b.date_bought || 0);
                break;
            case 'miles':
                aVal = parseInt(a.miles) || 0;
                bVal = parseInt(b.miles) || 0;
                break;
            case 'year':
                aVal = parseInt(a.year) || 0;
                bVal = parseInt(b.year) || 0;
                break;
            case 'buy_price':
                aVal = parseFloat(a.buy_price) || 0;
                bVal = parseFloat(b.buy_price) || 0;
                break;
            default:
                return 0;
        }
        
        if (order === 'desc') {
            return bVal - aVal;
        } else {
            return aVal - bVal;
        }
    });
    
    return sorted;
}

// Load inventory list
async function loadInventory() {
    try {
        const response = await fetch('/api/inventory');
        const data = await response.json();
        
        if (response.ok) {
            inventoryData = data;
            renderInventoryTable();
        }
    } catch (error) {
        console.error('Load inventory error:', error);
    }
}

// Render inventory table
function renderInventoryTable() {
    const tbody = document.getElementById('inventoryTableBody');
    tbody.innerHTML = '';
    
    if (inventoryData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="14" class="no-items">No vehicles in inventory yet.</td></tr>';
        updateTotals([]);
        return;
    }
    
    // Sort the data
    const sortedData = sortInventory(inventoryData, currentSort);
    
    // Calculate totals
    updateTotals(sortedData);
    
    // Render rows
    sortedData.forEach(vehicle => {
        const profit = vehicle.market_price ? (vehicle.market_price - vehicle.profit_price) : null;
        const profitClass = profit !== null ? (profit >= 0 ? 'positive' : 'negative') : '';
        const profitDisplay = profit !== null ? formatCurrency(profit) : 'N/A';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${vehicle.year || 'N/A'}</td>
            <td>${vehicle.make || 'N/A'}</td>
            <td>${vehicle.model || 'N/A'}</td>
            <td>${vehicle.vin}</td>
            <td>${formatNumber(vehicle.miles)}</td>
            <td>${formatDate(vehicle.date_bought)}</td>
            <td>${vehicle.auction_site || 'N/A'}</td>
            <td>${formatCurrency(vehicle.buy_price)}</td>
            <td>${formatCurrency(vehicle.auction_fees)}</td>
            <td>${formatCurrency(vehicle.transport_fee)}</td>
            <td>${formatCurrency(vehicle.profit_price)}</td>
            <td>${vehicle.market_price ? formatCurrency(vehicle.market_price) : 'N/A'}</td>
            <td class="${profitClass}">${profitDisplay}</td>
            <td>
                <button class="btn-edit" onclick="editVehicle(${vehicle.id})">Edit</button>
                <button class="btn-delete" onclick="deleteVehicle(${vehicle.id})">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Update totals row
function updateTotals(data) {
    const totalBuyPrice = data.reduce((sum, v) => sum + (parseFloat(v.buy_price) || 0), 0);
    const totalAuctionFees = data.reduce((sum, v) => sum + (parseFloat(v.auction_fees) || 0), 0);
    const totalTransportFee = data.reduce((sum, v) => sum + (parseFloat(v.transport_fee) || 0), 0);
    const totalCost = data.reduce((sum, v) => sum + (parseFloat(v.profit_price) || 0), 0);
    
    document.getElementById('totalBuyPrice').textContent = formatCurrency(totalBuyPrice);
    document.getElementById('totalAuctionFees').textContent = formatCurrency(totalAuctionFees);
    document.getElementById('totalTransportFee').textContent = formatCurrency(totalTransportFee);
    document.getElementById('totalCost').textContent = formatCurrency(totalCost);
}

// Sort change handler
function initializeSortHandler() {
    const sortSelect = document.getElementById('sortBy');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            currentSort = e.target.value;
            renderInventoryTable();
        });
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSortHandler);
} else {
    initializeSortHandler();
}

// Edit vehicle
async function editVehicle(id) {
    currentVehicleId = id;
    addVehicleBtn.click();
    await loadVehicleDetails(id);
}

// Delete vehicle
async function deleteVehicle(id) {
    if (!confirm('Are you sure you want to delete this vehicle? This will also delete all associated repairs.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/inventory/${id}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            if (currentVehicleId === id) {
                resetForm();
            }
            loadInventory();
            alert('Vehicle deleted successfully!');
        } else {
            alert('Error: ' + (data.error || 'Failed to delete vehicle'));
        }
    } catch (error) {
        console.error('Delete error:', error);
        alert('Failed to delete vehicle. Please try again.');
    }
}

// Reset form
function resetForm() {
    vehicleForm.reset();
    repairForm.reset();
    currentVehicleId = null;
    currentVehicleData = null;
    currentVehicleIdInput.value = '';
    repairLogSection.style.display = 'none';
    repairsContainer.innerHTML = '';
    document.getElementById('profitDisplay').style.display = 'none';
    document.getElementById('cargurusLink').style.display = 'none';
}

// Utility functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount || 0);
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatNumber(num) {
    return new Intl.NumberFormat('en-US').format(num || 0);
}

// Make functions available globally
window.deleteRepair = deleteRepair;
window.editVehicle = editVehicle;
window.deleteVehicle = deleteVehicle;

