// Authentication state
let isAuthenticated = false;
let currentUser = null;

// Global state
let currentVehicleId = null;
let currentVehicleData = null;
let inventoryData = [];
let filteredInventoryData = [];
let selectedVehicleIds = new Set();
let currentExpensesVehicleId = null;
let currentSort = 'date_bought_desc';

// DOM Elements - Auth
const authSection = document.getElementById('authSection');
const mainApp = document.getElementById('mainApp');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');
const loginError = document.getElementById('loginError');

// DOM Elements - Main App
const viewInventoryBtn = document.getElementById('viewInventoryBtn');
const addVehicleBtn = document.getElementById('addVehicleBtn');
const analyticsBtn = document.getElementById('analyticsBtn');
const adminBtn = document.getElementById('adminBtn');
const addVehicleSection = document.getElementById('addVehicleSection');
const inventorySection = document.getElementById('inventorySection');
const analyticsSection = document.getElementById('analyticsSection');
const adminSection = document.getElementById('adminSection');
const vehicleForm = document.getElementById('vehicleForm');
const lookupVinBtn = document.getElementById('lookupVinBtn');
const resetFormBtn = document.getElementById('resetFormBtn');

// Navigation
viewInventoryBtn.addEventListener('click', () => {
    addVehicleSection.style.display = 'none';
    inventorySection.style.display = 'block';
    analyticsSection.style.display = 'none';
    if (adminSection) adminSection.style.display = 'none';
    viewInventoryBtn.classList.add('active');
    addVehicleBtn.classList.remove('active');
    analyticsBtn.classList.remove('active');
    if (adminBtn) adminBtn.classList.remove('active');
    loadInventory();
});

addVehicleBtn.addEventListener('click', () => {
    addVehicleSection.style.display = 'block';
    inventorySection.style.display = 'none';
    analyticsSection.style.display = 'none';
    if (adminSection) adminSection.style.display = 'none';
    addVehicleBtn.classList.add('active');
    viewInventoryBtn.classList.remove('active');
    analyticsBtn.classList.remove('active');
    if (adminBtn) adminBtn.classList.remove('active');
    resetForm();
});

analyticsBtn.addEventListener('click', () => {
    addVehicleSection.style.display = 'none';
    inventorySection.style.display = 'none';
    analyticsSection.style.display = 'block';
    if (adminSection) adminSection.style.display = 'none';
    analyticsBtn.classList.add('active');
    addVehicleBtn.classList.remove('active');
    viewInventoryBtn.classList.remove('active');
    if (adminBtn) adminBtn.classList.remove('active');
    loadAnalytics();
});

if (adminBtn) {
    adminBtn.addEventListener('click', () => {
        if (!isAdmin) {
            alert('Unauthorized: Admin access required');
            return;
        }
        addVehicleSection.style.display = 'none';
        inventorySection.style.display = 'none';
        analyticsSection.style.display = 'none';
        if (adminSection) adminSection.style.display = 'block';
        adminBtn.classList.add('active');
        addVehicleBtn.classList.remove('active');
        viewInventoryBtn.classList.remove('active');
        analyticsBtn.classList.remove('active');
        loadAdminPanel();
    });
}

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
        const response = await fetch(`/api/vin/${vin}`, {
            credentials: 'include'
        });
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
            if (data.accident_history && data.accident_history.trim() !== '') {
                document.getElementById('accident_history').value = data.accident_history;
            }
            if (data.number_of_owners && data.number_of_owners !== null) {
                document.getElementById('number_of_owners').value = data.number_of_owners;
            }
            
            // Update CarGurus link after VIN lookup populates fields
            updateCarGurusLink();
            
            if (fieldsPopulated === 0) {
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
        accident_history: formData.get('accident_history') || null,
        number_of_owners: formData.get('number_of_owners') ? parseInt(formData.get('number_of_owners')) : null,
        date_bought: formData.get('date_bought'),
        auction_site: formData.get('auction_site'),
        buy_price: parseFloat(formData.get('buy_price')),
        auction_fees: parseFloat(formData.get('auction_fees')),
        transport_fee: parseFloat(formData.get('transport_fee')),
        market_price: formData.get('market_price') ? parseFloat(formData.get('market_price')) : null,
        sale_date: formData.get('sale_date') || null,
        sale_price: formData.get('sale_price') ? parseFloat(formData.get('sale_price')) : null,
        status: formData.get('status') || 'In Stock',
        notes: formData.get('notes') || null,
        customer_name: formData.get('customer_name') || null,
        customer_phone: formData.get('customer_phone') || null,
        customer_email: formData.get('customer_email') || null,
        image_path: document.getElementById('image_path').value || null
    };
    
    try {
        let response;
        if (currentVehicleId) {
            // Update existing vehicle
            response = await fetch(`/api/inventory/${currentVehicleId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(vehicleData)
            });
        } else {
            // Create new vehicle
            response = await fetch('/api/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(vehicleData)
            });
        }
        
        const data = await response.json();
        
        if (response.ok) {
            if (!currentVehicleId) {
                currentVehicleId = data.id;
                await loadVehicleDetails(currentVehicleId);
            } else {
                await loadVehicleDetails(currentVehicleId);
            }
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
        const response = await fetch(`/api/inventory/${id}`, { credentials: 'include' });
        const data = await response.json();
        
        if (response.ok) {
            currentVehicleData = data;
            currentVehicleId = id;
            
            // Populate form
            document.getElementById('vin').value = data.vin;
            document.getElementById('make').value = data.make || '';
            document.getElementById('model').value = data.model || '';
            document.getElementById('year').value = data.year || '';
            document.getElementById('trim').value = data.trim || '';
            document.getElementById('color').value = data.color || '';
            document.getElementById('miles').value = data.miles || '';
            document.getElementById('accident_history').value = data.accident_history || '';
            document.getElementById('number_of_owners').value = data.number_of_owners || '';
            document.getElementById('date_bought').value = data.date_bought || '';
            document.getElementById('auction_site').value = data.auction_site || '';
            document.getElementById('buy_price').value = data.buy_price || '';
            document.getElementById('auction_fees').value = data.auction_fees || '';
            document.getElementById('transport_fee').value = data.transport_fee || '';
            document.getElementById('market_price').value = data.market_price || '';
            document.getElementById('sale_date').value = data.sale_date || '';
            document.getElementById('sale_price').value = data.sale_price || '';
            document.getElementById('status').value = data.status || 'In Stock';
            document.getElementById('notes').value = data.notes || '';
            document.getElementById('customer_name').value = data.customer_name || '';
            document.getElementById('customer_phone').value = data.customer_phone || '';
            document.getElementById('customer_email').value = data.customer_email || '';
            document.getElementById('image_path').value = data.image_path || '';
            
            // Display image if exists
            if (data.image_path) {
                const preview = document.getElementById('imagePreview');
                preview.innerHTML = `<img src="${data.image_path}" style="max-width: 200px; max-height: 200px; border-radius: 6px; margin-top: 10px;">`;
            }
            
            calculateProfit();
            updateCarGurusLink();
        }
    } catch (error) {
        console.error('Load error:', error);
    }
}

// Open Repair Log in new tab (no longer using modal)
function openRepairLogModal(vehicleId) {
    window.open(`repair-log.html?id=${vehicleId}`, '_blank');
}

// Repair Form Submit - moved to repair-log.html (no longer needed here)

// Load repairs for a vehicle - moved to repair-log.html (no longer needed here)

// Delete repair
async function deleteRepair(repairId) {
    if (!confirm('Are you sure you want to delete this repair?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/inventory/repairs/${repairId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Refresh inventory to update profit calculations
            if (inventoryData.length > 0) {
                loadInventory();
            }
        } else {
            alert('Error: ' + (data.error || 'Failed to delete repair'));
        }
    } catch (error) {
        console.error('Delete repair error:', error);
        alert('Failed to delete repair. Please try again.');
    }
}

// Inventory data storage (inventoryData and currentSort already declared at top)

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
        const response = await fetch('/api/inventory', { credentials: 'include' });
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
    
    // Apply filters
    filteredInventoryData = applyInventoryFilters(inventoryData);
    
    if (filteredInventoryData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="27" class="no-items">No vehicles found matching your filters.</td></tr>';
        updateTotals([]);
        return;
    }
    
    // Sort the data
    const sortedData = sortInventory(filteredInventoryData, currentSort);
    
    // Calculate totals
    updateTotals(sortedData);
    
    // Render rows
    sortedData.forEach(vehicle => {
        // Calculate repair cost: profit_price - buy_price - auction_fees - transport_fee
        const buyPrice = parseFloat(vehicle.buy_price) || 0;
        const auctionFees = parseFloat(vehicle.auction_fees) || 0;
        const transportFee = parseFloat(vehicle.transport_fee) || 0;
        const profitPrice = parseFloat(vehicle.profit_price) || 0;
        const repairCost = profitPrice - buyPrice - auctionFees - transportFee;
        
        // Calculate profit: if sold, use sale_price; otherwise use market_price
        const salePrice = vehicle.sale_price || null;
        const marketPrice = vehicle.market_price || null;
        
        let profit = null;
        if (salePrice) {
            profit = salePrice - profitPrice;
        } else if (marketPrice) {
            profit = marketPrice - profitPrice;
        }
        
        const profitClass = profit !== null ? (profit >= 0 ? 'positive' : 'negative') : '';
        const profitDisplay = profit !== null ? formatCurrency(profit) : 'N/A';
        const statusClass = vehicle.status === 'Sold' ? 'status-sold' : vehicle.status === 'Pending Sale' ? 'status-pending' : vehicle.status === 'Reserved' ? 'status-reserved' : 'status-instock';
        const isSelected = selectedVehicleIds.has(vehicle.id);
        const imageHtml = vehicle.image_path ? `<img src="${vehicle.image_path}" style="max-width: 50px; max-height: 50px; border-radius: 4px; cursor: pointer;" onclick="window.open('${vehicle.image_path}', '_blank')">` : '<span style="color: #999;">No image</span>';
        const notesPreview = vehicle.notes ? (vehicle.notes.length > 30 ? vehicle.notes.substring(0, 30) + '...' : vehicle.notes) : '';
        
        const row = document.createElement('tr');
        row.dataset.vehicleId = vehicle.id;
        row.innerHTML = `
            <td><input type="checkbox" class="vehicle-checkbox" data-vehicle-id="${vehicle.id}" ${isSelected ? 'checked' : ''}></td>
            <td>${imageHtml}</td>
            <td><a href="#" class="link-edit" onclick="event.preventDefault(); editVehicle(${vehicle.id}); return false;">Edit</a></td>
            <td><a href="#" class="link-delete" onclick="event.preventDefault(); if(confirm('Are you sure you want to delete this vehicle?')) { deleteVehicle(${vehicle.id}); } return false;">Delete</a></td>
            <td>
                <a href="repair-log.html?id=${vehicle.id}" class="link-repair" target="_blank">Repair Log</a> | 
                <a href="#" onclick="event.preventDefault(); openExpensesModal(${vehicle.id}); return false;" class="link-expenses">Expenses</a>
            </td>
            <td><span class="status-badge ${statusClass}">${vehicle.status || 'In Stock'}</span></td>
            <td>${vehicle.year || 'N/A'}</td>
            <td>${vehicle.make || 'N/A'}</td>
            <td>${vehicle.model || 'N/A'}</td>
            <td>${vehicle.vin}</td>
            <td>${vehicle.color || 'N/A'}</td>
            <td>${formatNumber(vehicle.miles)}</td>
            <td>${vehicle.accident_history || 'N/A'}</td>
            <td>${vehicle.number_of_owners || 'N/A'}</td>
            <td>${formatDate(vehicle.date_bought)}</td>
            <td>${vehicle.auction_site || 'N/A'}</td>
            <td>${formatCurrency(vehicle.buy_price)}</td>
            <td>${formatCurrency(vehicle.auction_fees)}</td>
            <td>${formatCurrency(vehicle.transport_fee)}</td>
            <td>${formatCurrency(repairCost)}</td>
            <td>${formatCurrency(vehicle.profit_price)}</td>
            <td>${vehicle.sale_price ? formatCurrency(vehicle.sale_price) : 'N/A'}</td>
            <td>${vehicle.market_price ? formatCurrency(vehicle.market_price) : 'N/A'}</td>
            <td>${vehicle.sale_date ? formatDate(vehicle.sale_date) : 'N/A'}</td>
            <td class="${profitClass}">${profitDisplay}</td>
            <td title="${vehicle.notes || ''}">${notesPreview || 'N/A'}</td>
        `;
        tbody.appendChild(row);
    });
    
    // Add checkbox event listeners
    document.querySelectorAll('.vehicle-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const vehicleId = parseInt(this.dataset.vehicleId);
            if (this.checked) {
                selectedVehicleIds.add(vehicleId);
            } else {
                selectedVehicleIds.delete(vehicleId);
            }
            updateBulkActionsButton();
        });
    });
    
    // Select all checkbox
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            document.querySelectorAll('.vehicle-checkbox').forEach(cb => {
                cb.checked = this.checked;
                const vehicleId = parseInt(cb.dataset.vehicleId);
                if (this.checked) {
                    selectedVehicleIds.add(vehicleId);
                } else {
                    selectedVehicleIds.delete(vehicleId);
                }
            });
            updateBulkActionsButton();
        });
    }
}

// Update totals row
function updateTotals(data) {
    if (!data || data.length === 0) {
        document.getElementById('totalBuyPrice').textContent = formatCurrency(0);
        document.getElementById('totalAuctionFees').textContent = formatCurrency(0);
        document.getElementById('totalTransportFee').textContent = formatCurrency(0);
        document.getElementById('totalRepairCost').textContent = formatCurrency(0);
        document.getElementById('totalCost').textContent = formatCurrency(0);
        document.getElementById('totalSalePrice').textContent = formatCurrency(0);
        document.getElementById('totalMarketPrice').textContent = formatCurrency(0);
        document.getElementById('totalProfit').textContent = formatCurrency(0);
        return;
    }
    
    const totalBuyPrice = data.reduce((sum, v) => sum + (parseFloat(v.buy_price) || 0), 0);
    const totalAuctionFees = data.reduce((sum, v) => sum + (parseFloat(v.auction_fees) || 0), 0);
    const totalTransportFee = data.reduce((sum, v) => sum + (parseFloat(v.transport_fee) || 0), 0);
    const totalCost = data.reduce((sum, v) => sum + (parseFloat(v.profit_price) || 0), 0);
    
    // Calculate total repair cost: sum of (profit_price - buy_price - auction_fees - transport_fee)
    const totalRepairCost = data.reduce((sum, v) => {
        const buyPrice = parseFloat(v.buy_price) || 0;
        const auctionFees = parseFloat(v.auction_fees) || 0;
        const transportFee = parseFloat(v.transport_fee) || 0;
        const profitPrice = parseFloat(v.profit_price) || 0;
        return sum + (profitPrice - buyPrice - auctionFees - transportFee);
    }, 0);
    
    // Calculate total sale price (only for sold vehicles)
    const totalSalePrice = data.reduce((sum, v) => sum + (parseFloat(v.sale_price) || 0), 0);
    
    // Calculate total market price (only for vehicles with market price)
    const totalMarketPrice = data.reduce((sum, v) => sum + (parseFloat(v.market_price) || 0), 0);
    
    // Calculate total profit: sum of actual profits (sale_price - profit_price) or (market_price - profit_price)
    const totalProfit = data.reduce((sum, v) => {
        const profitPrice = parseFloat(v.profit_price) || 0;
        const salePrice = parseFloat(v.sale_price);
        const marketPrice = parseFloat(v.market_price);
        
        if (salePrice) {
            return sum + (salePrice - profitPrice);
        } else if (marketPrice) {
            return sum + (marketPrice - profitPrice);
        }
        return sum;
    }, 0);
    
    document.getElementById('totalBuyPrice').textContent = formatCurrency(totalBuyPrice);
    document.getElementById('totalAuctionFees').textContent = formatCurrency(totalAuctionFees);
    document.getElementById('totalTransportFee').textContent = formatCurrency(totalTransportFee);
    document.getElementById('totalRepairCost').textContent = formatCurrency(totalRepairCost);
    document.getElementById('totalCost').textContent = formatCurrency(totalCost);
    document.getElementById('totalSalePrice').textContent = formatCurrency(totalSalePrice);
    document.getElementById('totalMarketPrice').textContent = formatCurrency(totalMarketPrice);
    document.getElementById('totalProfit').textContent = formatCurrency(totalProfit);
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
            method: 'DELETE',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            if (currentVehicleId === id) {
                resetForm();
            }
            loadInventory();
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
    currentVehicleId = null;
    currentVehicleData = null;
    document.getElementById('profitDisplay').style.display = 'none';
    document.getElementById('cargurusLink').style.display = 'none';
    // Set default date_bought to today
    setDefaultDateBought();
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

// Authentication Functions
let isAdmin = false;
async function checkAuth() {
    try {
        const response = await fetch('/api/auth/check', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.authenticated) {
            isAuthenticated = true;
            currentUser = data.user;
            isAdmin = data.isAdmin || false;
            showMainApp();
            updateAdminButton();
        } else {
            showAuthSection();
        }
    } catch (error) {
        console.error('Auth check error:', error);
        showAuthSection();
    }
}

function updateAdminButton() {
    const adminBtn = document.getElementById('adminBtn');
    if (adminBtn) {
        adminBtn.style.display = isAdmin ? 'inline-block' : 'none';
    }
}

function showAuthSection() {
    if (authSection) authSection.style.display = 'flex';
    if (mainApp) mainApp.style.display = 'none';
    isAuthenticated = false;
}

function showMainApp() {
    if (authSection) authSection.style.display = 'none';
    if (mainApp) mainApp.style.display = 'block';
    if (isAuthenticated) {
        // Default to View Inventory
        addVehicleSection.style.display = 'none';
        inventorySection.style.display = 'block';
        if (analyticsSection) analyticsSection.style.display = 'none';
        if (adminSection) adminSection.style.display = 'none';
        viewInventoryBtn.classList.add('active');
        addVehicleBtn.classList.remove('active');
        if (analyticsBtn) analyticsBtn.classList.remove('active');
        if (adminBtn) adminBtn.classList.remove('active');
        updateAdminButton();
        loadInventory();
    }
}

// Analytics filter state
let analyticsFilters = {
    vin: '',
    year: '',
    make: '',
    model: ''
};

// Load and render analytics
async function loadAnalytics() {
    try {
        const response = await fetch('/api/inventory', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (response.ok) {
            // Populate filter dropdowns
            populateFilterDropdowns(data);
            // Apply filters
            const filteredData = applyAnalyticsFilters(data);
            renderAnalytics(filteredData);
        } else {
            console.error('Failed to load inventory:', data);
            renderAnalytics([]);
        }
    } catch (error) {
        console.error('Load analytics error:', error);
        renderAnalytics([]);
    }
}

// Populate filter dropdowns with unique values from inventory
function populateFilterDropdowns(data) {
    if (!data || data.length === 0) return;
    
    // Get unique values
    const uniqueVins = [...new Set(data.map(v => v.vin).filter(v => v))].sort();
    const uniqueYears = [...new Set(data.map(v => v.year).filter(v => v))].sort((a, b) => b - a);
    const uniqueMakes = [...new Set(data.map(v => v.make).filter(v => v))].sort();
    const uniqueModels = [...new Set(data.map(v => v.model).filter(v => v))].sort();
    
    // Populate VIN dropdown
    const vinSelect = document.getElementById('filterVin');
    if (vinSelect) {
        // Keep the "All VINs" option
        const currentValue = vinSelect.value;
        vinSelect.innerHTML = '<option value="">All VINs</option>';
        uniqueVins.forEach(vin => {
            const option = document.createElement('option');
            option.value = vin;
            option.textContent = vin;
            vinSelect.appendChild(option);
        });
        // Restore selection if it still exists
        if (currentValue) {
            vinSelect.value = currentValue;
        }
    }
    
    // Populate Year dropdown
    const yearSelect = document.getElementById('filterYear');
    if (yearSelect) {
        const currentValue = yearSelect.value;
        yearSelect.innerHTML = '<option value="">All Years</option>';
        uniqueYears.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        });
        if (currentValue) {
            yearSelect.value = currentValue;
        }
    }
    
    // Populate Make dropdown
    const makeSelect = document.getElementById('filterMake');
    if (makeSelect) {
        const currentValue = makeSelect.value;
        makeSelect.innerHTML = '<option value="">All Makes</option>';
        uniqueMakes.forEach(make => {
            const option = document.createElement('option');
            option.value = make;
            option.textContent = make;
            makeSelect.appendChild(option);
        });
        if (currentValue) {
            makeSelect.value = currentValue;
        }
    }
    
    // Populate Model dropdown
    const modelSelect = document.getElementById('filterModel');
    if (modelSelect) {
        const currentValue = modelSelect.value;
        modelSelect.innerHTML = '<option value="">All Models</option>';
        uniqueModels.forEach(model => {
            const option = document.createElement('option');
            option.value = model;
            option.textContent = model;
            modelSelect.appendChild(option);
        });
        if (currentValue) {
            modelSelect.value = currentValue;
        }
    }
}

// Apply filters to data
function applyAnalyticsFilters(data) {
    if (!data || data.length === 0) return [];
    
    let filtered = [...data];
    
    // Filter by VIN (exact match)
    if (analyticsFilters.vin && analyticsFilters.vin.trim() !== '') {
        filtered = filtered.filter(v => 
            v.vin && v.vin === analyticsFilters.vin
        );
    }
    
    // Filter by Year (exact match)
    if (analyticsFilters.year && analyticsFilters.year.trim() !== '') {
        const yearFilter = parseInt(analyticsFilters.year);
        filtered = filtered.filter(v => 
            v.year && parseInt(v.year) === yearFilter
        );
    }
    
    // Filter by Make (exact match)
    if (analyticsFilters.make && analyticsFilters.make.trim() !== '') {
        filtered = filtered.filter(v => 
            v.make && v.make === analyticsFilters.make
        );
    }
    
    // Filter by Model (exact match)
    if (analyticsFilters.model && analyticsFilters.model.trim() !== '') {
        filtered = filtered.filter(v => 
            v.model && v.model === analyticsFilters.model
        );
    }
    
    return filtered;
}

// Setup analytics filters
function setupAnalyticsFilters() {
    const filterVin = document.getElementById('filterVin');
    const filterYear = document.getElementById('filterYear');
    const filterMake = document.getElementById('filterMake');
    const filterModel = document.getElementById('filterModel');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    
    // Auto-apply filters on change
    function applyFilters() {
        analyticsFilters.vin = filterVin ? filterVin.value : '';
        analyticsFilters.year = filterYear ? filterYear.value : '';
        analyticsFilters.make = filterMake ? filterMake.value : '';
        analyticsFilters.model = filterModel ? filterModel.value : '';
        loadAnalytics();
    }
    
    // Add change event listeners to all dropdowns
    [filterVin, filterYear, filterMake, filterModel].forEach(select => {
        if (select) {
            select.addEventListener('change', applyFilters);
        }
    });
    
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            if (filterVin) filterVin.value = '';
            if (filterYear) filterYear.value = '';
            if (filterMake) filterMake.value = '';
            if (filterModel) filterModel.value = '';
            analyticsFilters = { vin: '', year: '', make: '', model: '' };
            loadAnalytics();
        });
    }
}

// Setup dashboard tabs
function setupDashboardTabs() {
    const tabs = document.querySelectorAll('.dashboard-tab');
    const tabContents = document.querySelectorAll('.dashboard-tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            
            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            const targetContent = document.getElementById(`tab-${targetTab}`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
}

// Initialize on page load - This is handled in the main initialization block below
// Removed duplicate DOMContentLoaded listener

// Setup login form handler
let loginFormSetup = false;
function setupLoginForm() {
    if (loginFormSetup) return; // Prevent duplicate listeners
    loginFormSetup = true;
    
    const loginFormEl = document.getElementById('loginForm');
    const loginErrorEl = document.getElementById('loginError');
    const homeSignInBtn = document.getElementById('homeSignInBtn');
    const homeAdminBtn = document.getElementById('homeAdminBtn');
    const loginFormContainer = document.getElementById('loginFormContainer');
    const adminLoginContainer = document.getElementById('adminLoginContainer');
    const adminInviteContainer = document.getElementById('adminInviteContainer');
    const backToHomeBtn = document.getElementById('backToHomeBtn');
    const adminLoginForm = document.getElementById('adminLoginForm');
    const adminLoginError = document.getElementById('adminLoginError');
    const adminInviteForm = document.getElementById('adminInviteForm');
    const adminInviteMessage = document.getElementById('adminInviteMessage');
    const adminLogoutBtn = document.getElementById('adminLogoutBtn');
    
    // Track admin session
    let isAdminLoggedIn = false;
    
    // Show login form by default
    if (homeSignInBtn) {
        homeSignInBtn.classList.add('active');
        homeSignInBtn.addEventListener('click', () => {
            if (loginFormContainer) loginFormContainer.style.display = 'block';
            if (adminLoginContainer) adminLoginContainer.style.display = 'none';
            if (adminInviteContainer) adminInviteContainer.style.display = 'none';
            homeSignInBtn.classList.add('active');
            if (homeAdminBtn) homeAdminBtn.classList.remove('active');
        });
    }
    
    // Show admin login form
    if (homeAdminBtn) {
        homeAdminBtn.addEventListener('click', () => {
            if (loginFormContainer) loginFormContainer.style.display = 'none';
            if (adminLoginContainer) adminLoginContainer.style.display = 'block';
            if (adminInviteContainer) adminInviteContainer.style.display = 'none';
            homeAdminBtn.classList.add('active');
            if (homeSignInBtn) homeSignInBtn.classList.remove('active');
        });
    }
    
    // Back to home button
    if (backToHomeBtn) {
        backToHomeBtn.addEventListener('click', () => {
            if (loginFormContainer) loginFormContainer.style.display = 'block';
            if (adminLoginContainer) adminLoginContainer.style.display = 'none';
            if (adminInviteContainer) adminInviteContainer.style.display = 'none';
            if (homeSignInBtn) homeSignInBtn.classList.add('active');
            if (homeAdminBtn) homeAdminBtn.classList.remove('active');
            if (adminLoginForm) adminLoginForm.reset();
            if (adminLoginError) adminLoginError.textContent = '';
            isAdminLoggedIn = false;
        });
    }
    
    // Admin logout button
    if (adminLogoutBtn) {
        adminLogoutBtn.addEventListener('click', () => {
            isAdminLoggedIn = false;
            if (adminLoginContainer) adminLoginContainer.style.display = 'block';
            if (adminInviteContainer) adminInviteContainer.style.display = 'none';
            if (adminLoginForm) adminLoginForm.reset();
            if (adminInviteForm) adminInviteForm.reset();
            if (adminInviteMessage) adminInviteMessage.textContent = '';
        });
    }
    
    // Admin login form
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (adminLoginError) adminLoginError.textContent = '';
            
            const username = document.getElementById('adminLoginUsername').value;
            const password = document.getElementById('adminLoginPassword').value;
            
            if (!username || !password) {
                if (adminLoginError) adminLoginError.textContent = 'Please enter both username and password';
                return;
            }
            
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ username, password })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // Check if user is admin
                    const checkResponse = await fetch('/api/auth/check', {
                        credentials: 'include'
                    });
                    const checkData = await checkResponse.json();
                    
                    if (checkData.isAdmin) {
                        // Admin login successful - show invite form
                        isAdminLoggedIn = true;
                        if (adminLoginContainer) adminLoginContainer.style.display = 'none';
                        if (adminInviteContainer) adminInviteContainer.style.display = 'block';
                        if (adminLoginForm) adminLoginForm.reset();
                    } else {
                        if (adminLoginError) adminLoginError.textContent = 'Access denied: Admin privileges required';
                    }
                } else {
                    if (adminLoginError) adminLoginError.textContent = data.error || 'Login failed';
                }
            } catch (error) {
                console.error('Admin login error:', error);
                if (adminLoginError) adminLoginError.textContent = 'Failed to connect to server. Please check if the server is running.';
            }
        });
    }
    
    // Admin invite form
    if (adminInviteForm) {
        adminInviteForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (adminInviteMessage) adminInviteMessage.textContent = '';
            
            if (!isAdminLoggedIn) {
                if (adminInviteMessage) adminInviteMessage.textContent = 'Please login as admin first';
                return;
            }
            
            const email = document.getElementById('adminEmail').value.trim();
            const companyName = document.getElementById('adminCompanyName').value.trim();
            
            if (!email || !companyName) {
                if (adminInviteMessage) adminInviteMessage.textContent = 'Please fill in all fields';
                return;
            }
            
            try {
                if (adminInviteMessage) adminInviteMessage.textContent = 'Sending invitation...';
                if (adminInviteMessage) adminInviteMessage.style.color = '#667eea';
                
                const response = await fetch('/api/auth/invite', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ email, companyName })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    if (data.credentials) {
                        // Email not configured - show credentials
                        if (adminInviteMessage) {
                            adminInviteMessage.innerHTML = `
                                <div style="background: #fff3cd; padding: 15px; border-radius: 6px; border-left: 4px solid #ffc107; color: #856404;">
                                    <p><strong>User created successfully!</strong></p>
                                    <p>Email is not configured. Please provide these credentials to the user:</p>
                                    <div style="background: white; padding: 10px; margin: 10px 0; border-radius: 4px;">
                                        <p><strong>Email:</strong> ${data.credentials.username}</p>
                                        <p><strong>Password:</strong> <code>${data.credentials.password}</code></p>
                                    </div>
                                    <p style="font-size: 12px;">${data.credentials.note}</p>
                                </div>
                            `;
                        }
                    } else {
                        if (adminInviteMessage) {
                            adminInviteMessage.textContent = '✓ Invitation email sent successfully!';
                            adminInviteMessage.style.color = '#28a745';
                        }
                    }
                    adminInviteForm.reset();
                } else {
                    if (adminInviteMessage) {
                        adminInviteMessage.textContent = 'Error: ' + (data.error || 'Failed to send invitation');
                        adminInviteMessage.style.color = '#dc3545';
                    }
                }
            } catch (error) {
                console.error('Invite user error:', error);
                if (adminInviteMessage) {
                    adminInviteMessage.textContent = 'Failed to send invitation. Please try again.';
                    adminInviteMessage.style.color = '#dc3545';
                }
            }
        });
    }
    
    // Login form
    if (loginFormEl) {
        loginFormEl.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (loginErrorEl) loginErrorEl.textContent = '';
            
            const username = document.getElementById('loginUsername').value;
            const password = document.getElementById('loginPassword').value;
            
            if (!username || !password) {
                if (loginErrorEl) loginErrorEl.textContent = 'Please enter both username and password';
                return;
            }
            
            try {
                console.log('Attempting login for:', username);
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ username, password })
                });
                
                console.log('Login response status:', response.status);
                const data = await response.json();
                console.log('Login response data:', data);
                
                if (response.ok) {
                    isAuthenticated = true;
                    currentUser = data.user;
                    console.log('Login successful, showing main app');
                    showMainApp();
                    loginFormEl.reset();
                } else {
                    console.error('Login failed:', data.error);
                    if (loginErrorEl) loginErrorEl.textContent = data.error || 'Login failed';
                }
            } catch (error) {
                console.error('Login error:', error);
                if (loginErrorEl) loginErrorEl.textContent = 'Failed to connect to server. Please check if the server is running.';
            }
        });
    }
}

// Setup logout button handler
let logoutButtonSetup = false;
function setupLogoutButton() {
    if (logoutButtonSetup) return; // Prevent duplicate listeners
    logoutButtonSetup = true;
    
    const logoutBtnEl = document.getElementById('logoutBtn');
    if (logoutBtnEl) {
        logoutBtnEl.addEventListener('click', async () => {
            try {
                const response = await fetch('/api/auth/logout', {
                    method: 'POST',
                    credentials: 'include'
                });
                
                if (response.ok) {
                    isAuthenticated = false;
                    currentUser = null;
                    showAuthSection();
                }
            } catch (error) {
                console.error('Logout error:', error);
            }
        });
    }
}

// Update all fetch calls to include credentials
const originalFetch = window.fetch;
window.fetch = function(url, options = {}) {
    if (typeof url === 'string' && url.startsWith('/api/') && !url.startsWith('/api/auth/')) {
        options.credentials = 'include';
    }
    return originalFetch.call(this, url, options);
};

// Make functions available globally
window.deleteRepair = deleteRepair;
window.editVehicle = editVehicle;
window.deleteVehicle = deleteVehicle;
window.openRepairLogModal = openRepairLogModal;

// Set default date_bought to today
function setDefaultDateBought() {
    const dateBoughtInput = document.getElementById('date_bought');
    if (dateBoughtInput && !dateBoughtInput.value) {
        const today = new Date().toISOString().split('T')[0];
        dateBoughtInput.value = today;
    }
}

// Excel-like keyboard navigation - Enter key moves to next field
function setupExcelLikeNavigation() {
    const vehicleFormInputs = document.querySelectorAll('#vehicleForm input, #vehicleForm select');
    
    function addEnterNavigation(inputs) {
        inputs.forEach((input, index) => {
            input.addEventListener('keydown', (e) => {
                // Enter key moves to next field (except for textarea and submit buttons)
                if (e.key === 'Enter' && input.tagName !== 'TEXTAREA' && input.type !== 'submit' && input.type !== 'button' && input.type !== 'hidden') {
                    e.preventDefault();
                    const nextIndex = index + 1;
                    if (nextIndex < inputs.length) {
                        const nextInput = inputs[nextIndex];
                        // Skip buttons and hidden inputs
                        if (nextInput.type !== 'submit' && nextInput.type !== 'button' && nextInput.type !== 'hidden') {
                            nextInput.focus();
                            // Select text in input fields for quick editing
                            if (nextInput.type === 'text' || nextInput.type === 'number') {
                                nextInput.select();
                            }
                        }
                    }
                }
            });
        });
    }
    
    if (vehicleFormInputs.length > 0) {
        addEnterNavigation(vehicleFormInputs);
    }
}

function renderAnalytics(data) {
    if (!data || data.length === 0) {
        // Show empty state
        document.getElementById('totalInventoryValue').textContent = '$0.00';
        document.getElementById('totalVehicles').textContent = '0';
        document.getElementById('soldVehicles').textContent = '0';
        document.getElementById('unsoldVehicles').textContent = '0';
        document.getElementById('totalInvestment').textContent = '$0.00';
        document.getElementById('totalRepairCostsAnalytics').textContent = '$0.00';
        document.getElementById('totalSalesRevenue').textContent = '$0.00';
        document.getElementById('totalProfitAnalytics').textContent = '$0.00';
        document.getElementById('avgProfitPerVehicle').textContent = '$0.00';
        document.getElementById('avgRepairCost').textContent = '$0.00';
        document.getElementById('vehiclesWithProfit').textContent = '0';
        document.getElementById('vehiclesWithLoss').textContent = '0';
        document.getElementById('highestProfit').textContent = '$0.00';
        document.getElementById('lowestProfit').textContent = '$0.00';
        document.getElementById('avgProfitMargin').textContent = '0%';
        document.getElementById('vehiclesWithRepairs').textContent = '0';
        document.getElementById('vehiclesWithoutRepairs').textContent = '0';
        document.getElementById('highestRepairCost').textContent = '$0.00';
        document.getElementById('repairCostPercentage').textContent = '0%';
        document.getElementById('topPerformersBody').innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No data available</td></tr>';
        document.getElementById('auctionSiteBody').innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">No data available</td></tr>';
        return;
    }
    
    // Basic counts
    const totalVehicles = data.length;
    const soldVehicles = data.filter(v => v.sale_price && parseFloat(v.sale_price) > 0).length;
    const unsoldVehicles = totalVehicles - soldVehicles;
    
    // Financial calculations
    let totalInventoryValue = 0;
    let totalInvestment = 0;
    let totalRepairCosts = 0;
    let totalSalesRevenue = 0;
    let totalProfit = 0;
    let vehiclesWithProfit = 0;
    let vehiclesWithLoss = 0;
    let highestProfit = 0;
    let lowestProfit = Infinity;
    let vehiclesWithRepairs = 0;
    let highestRepairCost = 0;
    
    const profitData = [];
    const auctionSiteData = {};
    
    data.forEach(vehicle => {
        const buyPrice = parseFloat(vehicle.buy_price) || 0;
        const auctionFees = parseFloat(vehicle.auction_fees) || 0;
        const transportFee = parseFloat(vehicle.transport_fee) || 0;
        const profitPrice = parseFloat(vehicle.profit_price) || 0;
        const repairCost = profitPrice - buyPrice - auctionFees - transportFee;
        const salePrice = parseFloat(vehicle.sale_price) || 0;
        const marketPrice = parseFloat(vehicle.market_price) || 0;
        
        totalInventoryValue += profitPrice;
        totalInvestment += buyPrice + auctionFees + transportFee;
        totalRepairCosts += repairCost;
        
        if (repairCost > 0) {
            vehiclesWithRepairs++;
            if (repairCost > highestRepairCost) {
                highestRepairCost = repairCost;
            }
        }
        
        let profit = null;
        if (salePrice > 0) {
            totalSalesRevenue += salePrice;
            profit = salePrice - profitPrice;
            totalProfit += profit;
        } else if (marketPrice > 0) {
            profit = marketPrice - profitPrice;
            totalProfit += profit;
        }
        
        if (profit !== null) {
            if (profit > 0) {
                vehiclesWithProfit++;
            } else if (profit < 0) {
                vehiclesWithLoss++;
            }
            
            if (profit > highestProfit) {
                highestProfit = profit;
            }
            if (profit < lowestProfit) {
                lowestProfit = profit;
            }
            
            profitData.push({
                vehicle: `${vehicle.year || ''} ${vehicle.make || ''} ${vehicle.model || ''}`.trim() || vehicle.vin,
                totalCost: profitPrice,
                saleOrMarketPrice: salePrice || marketPrice,
                profit: profit,
                profitPercent: profitPrice > 0 ? ((profit / profitPrice) * 100) : 0
            });
        }
        
        // Auction site analysis
        const auctionSite = vehicle.auction_site || 'Unknown';
        if (!auctionSiteData[auctionSite]) {
            auctionSiteData[auctionSite] = {
                count: 0,
                totalInvestment: 0,
                totalProfit: 0
            };
        }
        auctionSiteData[auctionSite].count++;
        auctionSiteData[auctionSite].totalInvestment += buyPrice + auctionFees + transportFee;
        if (profit !== null) {
            auctionSiteData[auctionSite].totalProfit += profit;
        }
    });
    
    // Update summary cards
    document.getElementById('totalInventoryValue').textContent = formatCurrency(totalInventoryValue);
    document.getElementById('totalVehicles').textContent = totalVehicles;
    document.getElementById('soldVehicles').textContent = soldVehicles;
    document.getElementById('unsoldVehicles').textContent = unsoldVehicles;
    
    // Update financial summary
    document.getElementById('totalInvestment').textContent = formatCurrency(totalInvestment);
    document.getElementById('totalRepairCostsAnalytics').textContent = formatCurrency(totalRepairCosts);
    document.getElementById('totalSalesRevenue').textContent = formatCurrency(totalSalesRevenue);
    document.getElementById('totalProfitAnalytics').textContent = formatCurrency(totalProfit);
    
    const avgProfitPerVehicle = soldVehicles > 0 ? totalProfit / soldVehicles : 0;
    document.getElementById('avgProfitPerVehicle').textContent = formatCurrency(avgProfitPerVehicle);
    
    const avgRepairCost = vehiclesWithRepairs > 0 ? totalRepairCosts / vehiclesWithRepairs : 0;
    document.getElementById('avgRepairCost').textContent = formatCurrency(avgRepairCost);
    
    // Update profit analysis
    document.getElementById('vehiclesWithProfit').textContent = vehiclesWithProfit;
    document.getElementById('vehiclesWithLoss').textContent = vehiclesWithLoss;
    document.getElementById('highestProfit').textContent = formatCurrency(highestProfit);
    document.getElementById('lowestProfit').textContent = lowestProfit === Infinity ? '$0.00' : formatCurrency(lowestProfit);
    
    const avgProfitMargin = totalInventoryValue > 0 ? (totalProfit / totalInventoryValue) * 100 : 0;
    document.getElementById('avgProfitMargin').textContent = avgProfitMargin.toFixed(1) + '%';
    
    // Update repair cost analysis
    document.getElementById('vehiclesWithRepairs').textContent = vehiclesWithRepairs;
    document.getElementById('vehiclesWithoutRepairs').textContent = totalVehicles - vehiclesWithRepairs;
    document.getElementById('highestRepairCost').textContent = formatCurrency(highestRepairCost);
    
    const repairCostPercentage = totalInventoryValue > 0 ? (totalRepairCosts / totalInventoryValue) * 100 : 0;
    document.getElementById('repairCostPercentage').textContent = repairCostPercentage.toFixed(1) + '%';
    
    // Render top performers
    renderTopPerformers(profitData);
    
    // Render auction site analysis
    renderAuctionSiteAnalysis(auctionSiteData);
    
    // Render aged outstanding sales
    renderAgedOutstandingSales(data);
    
    // Render sales history (best/worst sales)
    renderSalesHistory(data);
    
    // Update performance metrics
    updatePerformanceMetrics(data, totalVehicles, soldVehicles, unsoldVehicles);
}

function renderTopPerformers(profitData) {
    const tbody = document.getElementById('topPerformersBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (profitData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No profit data available</td></tr>';
        return;
    }
    
    // Sort by profit (descending)
    const sorted = profitData.sort((a, b) => b.profit - a.profit).slice(0, 10);
    
    sorted.forEach((item, index) => {
        const row = document.createElement('tr');
        const profitClass = item.profit >= 0 ? 'positive' : 'negative';
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${item.vehicle}</td>
            <td>${formatCurrency(item.totalCost)}</td>
            <td>${formatCurrency(item.saleOrMarketPrice)}</td>
            <td class="${profitClass}">${formatCurrency(item.profit)}</td>
            <td class="${profitClass}">${item.profitPercent.toFixed(1)}%</td>
        `;
        tbody.appendChild(row);
    });
}

function renderAuctionSiteAnalysis(auctionSiteData) {
    const tbody = document.getElementById('auctionSiteBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (Object.keys(auctionSiteData).length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">No auction site data available</td></tr>';
        return;
    }
    
    // Sort by count (descending)
    const sorted = Object.entries(auctionSiteData)
        .map(([site, data]) => ({ site, ...data }))
        .sort((a, b) => b.count - a.count);
    
    sorted.forEach(item => {
        const row = document.createElement('tr');
        const profitClass = item.totalProfit >= 0 ? 'positive' : 'negative';
        row.innerHTML = `
            <td>${item.site}</td>
            <td>${item.count}</td>
            <td>${formatCurrency(item.totalInvestment)}</td>
            <td class="${profitClass}">${formatCurrency(item.totalProfit)}</td>
        `;
        tbody.appendChild(row);
    });
}

// Render aged outstanding sales
function renderAgedOutstandingSales(data) {
    const tbody = document.getElementById('agedSalesBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    // Filter unsold vehicles
    const unsoldVehicles = data.filter(v => !v.sale_price || parseFloat(v.sale_price) === 0);
    
    if (unsoldVehicles.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">No outstanding sales</td></tr>';
        return;
    }
    
    // Calculate days in inventory and sort by age (oldest first)
    const today = new Date();
    const agedVehicles = unsoldVehicles.map(vehicle => {
        const dateBought = new Date(vehicle.date_bought);
        const daysInInventory = Math.floor((today - dateBought) / (1000 * 60 * 60 * 24));
        const profitPrice = parseFloat(vehicle.profit_price) || 0;
        const marketPrice = parseFloat(vehicle.market_price) || 0;
        const potentialProfit = marketPrice > 0 ? marketPrice - profitPrice : null;
        
        return {
            ...vehicle,
            daysInInventory,
            potentialProfit
        };
    }).sort((a, b) => b.daysInInventory - a.daysInInventory);
    
    // Render pie chart
    renderAgedSalesPieChart(agedVehicles);
    
    agedVehicles.forEach(vehicle => {
        const row = document.createElement('tr');
        const vehicleName = `${vehicle.year || ''} ${vehicle.make || ''} ${vehicle.model || ''}`.trim() || vehicle.vin;
        const daysClass = vehicle.daysInInventory > 90 ? 'negative' : vehicle.daysInInventory > 60 ? 'warning' : '';
        const profitClass = vehicle.potentialProfit !== null ? (vehicle.potentialProfit >= 0 ? 'positive' : 'negative') : '';
        
        row.innerHTML = `
            <td>${vehicleName}</td>
            <td>${vehicle.vin}</td>
            <td>${formatDate(vehicle.date_bought)}</td>
            <td class="${daysClass}"><strong>${vehicle.daysInInventory}</strong> days</td>
            <td>${formatCurrency(vehicle.profit_price)}</td>
            <td>${vehicle.market_price ? formatCurrency(vehicle.market_price) : 'N/A'}</td>
            <td class="${profitClass}">${vehicle.potentialProfit !== null ? formatCurrency(vehicle.potentialProfit) : 'N/A'}</td>
        `;
        tbody.appendChild(row);
    });
}

// Render pie chart for aged sales
function renderAgedSalesPieChart(agedVehicles) {
    // Categorize by age buckets
    const ageBuckets = {
        '0-30 days': 0,
        '31-60 days': 0,
        '61-90 days': 0,
        '90+ days': 0
    };
    
    agedVehicles.forEach(vehicle => {
        const days = vehicle.daysInInventory;
        if (days <= 30) {
            ageBuckets['0-30 days']++;
        } else if (days <= 60) {
            ageBuckets['31-60 days']++;
        } else if (days <= 90) {
            ageBuckets['61-90 days']++;
        } else {
            ageBuckets['90+ days']++;
        }
    });
    
    const total = agedVehicles.length;
    if (total === 0) {
        document.getElementById('agedSalesPieChart').innerHTML = '<text x="150" y="150" text-anchor="middle" font-size="16" fill="#999">No data</text>';
        document.getElementById('pieChartLegend').innerHTML = '';
        return;
    }
    
    // Colors for each bucket
    const colors = {
        '0-30 days': '#28a745',
        '31-60 days': '#ffc107',
        '61-90 days': '#fd7e14',
        '90+ days': '#dc3545'
    };
    
    // Calculate angles for pie chart
    let currentAngle = -90; // Start at top
    const radius = 120;
    const centerX = 150;
    const centerY = 150;
    const strokeWidth = 40;
    
    const svg = document.getElementById('agedSalesPieChart');
    svg.innerHTML = '';
    
    const legend = document.getElementById('pieChartLegend');
    legend.innerHTML = '';
    
    Object.entries(ageBuckets).forEach(([bucket, count]) => {
        if (count === 0) return;
        
        const percentage = (count / total) * 100;
        const angle = (percentage / 100) * 360;
        
        // Calculate arc path
        const startAngle = (currentAngle * Math.PI) / 180;
        const endAngle = ((currentAngle + angle) * Math.PI) / 180;
        
        const x1 = centerX + radius * Math.cos(startAngle);
        const y1 = centerY + radius * Math.sin(startAngle);
        const x2 = centerX + radius * Math.cos(endAngle);
        const y2 = centerY + radius * Math.sin(endAngle);
        
        const largeArc = angle > 180 ? 1 : 0;
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`);
        path.setAttribute('fill', colors[bucket]);
        path.setAttribute('stroke', 'white');
        path.setAttribute('stroke-width', '2');
        svg.appendChild(path);
        
        // Add legend item
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        legendItem.innerHTML = `
            <span class="legend-color" style="background-color: ${colors[bucket]}"></span>
            <span class="legend-label">${bucket}</span>
            <span class="legend-value">${count} (${percentage.toFixed(1)}%)</span>
        `;
        legend.appendChild(legendItem);
        
        currentAngle += angle;
    });
}

// Render sales history (best and worst sales)
function renderSalesHistory(data) {
    const today = new Date();
    
    // Filter sold vehicles
    const soldVehicles = data.filter(v => v.sale_price && parseFloat(v.sale_price) > 0 && v.sale_date);
    
    if (soldVehicles.length === 0) {
        document.getElementById('bestSalesByProfitBody').innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No sales data available</td></tr>';
        document.getElementById('bestSalesByAgeBody').innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No sales data available</td></tr>';
        document.getElementById('worstSalesByProfitBody').innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No sales data available</td></tr>';
        document.getElementById('worstSalesByAgeBody').innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No sales data available</td></tr>';
        return;
    }
    
    // Process sold vehicles
    const salesData = soldVehicles.map(vehicle => {
        const dateBought = new Date(vehicle.date_bought);
        const saleDate = new Date(vehicle.sale_date);
        const daysToSell = Math.floor((saleDate - dateBought) / (1000 * 60 * 60 * 24));
        const profitPrice = parseFloat(vehicle.profit_price) || 0;
        const salePrice = parseFloat(vehicle.sale_price) || 0;
        const profit = salePrice - profitPrice;
        const profitPercent = profitPrice > 0 ? (profit / profitPrice) * 100 : 0;
        
        return {
            ...vehicle,
            daysToSell,
            profit,
            profitPercent,
            vehicleName: `${vehicle.year || ''} ${vehicle.make || ''} ${vehicle.model || ''}`.trim() || vehicle.vin
        };
    });
    
    // Best by Profit (top 5)
    const bestByProfit = [...salesData].sort((a, b) => b.profit - a.profit).slice(0, 5);
    renderSalesTable('bestSalesByProfitBody', bestByProfit, 'profit');
    
    // Best by Age (quickest sales, top 5)
    const bestByAge = [...salesData].sort((a, b) => a.daysToSell - b.daysToSell).slice(0, 5);
    renderSalesTable('bestSalesByAgeBody', bestByAge, 'age');
    
    // Worst by Profit (bottom 5)
    const worstByProfit = [...salesData].sort((a, b) => a.profit - b.profit).slice(0, 5);
    renderSalesTable('worstSalesByProfitBody', worstByProfit, 'profit', true);
    
    // Worst by Age (slowest sales, bottom 5)
    const worstByAge = [...salesData].sort((a, b) => b.daysToSell - a.daysToSell).slice(0, 5);
    renderSalesTable('worstSalesByAgeBody', worstByAge, 'age', true);
}

function renderSalesTable(tbodyId, salesData, type, isWorst = false) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (salesData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No data available</td></tr>';
        return;
    }
    
    salesData.forEach(sale => {
        const row = document.createElement('tr');
        const profitClass = sale.profit >= 0 ? 'positive' : 'negative';
        
        if (type === 'profit') {
            row.innerHTML = `
                <td>${sale.vehicleName}</td>
                <td>${formatCurrency(sale.sale_price)}</td>
                <td>${formatCurrency(sale.profit_price)}</td>
                <td class="${profitClass}">${formatCurrency(sale.profit)}</td>
                <td class="${profitClass}">${sale.profitPercent.toFixed(1)}%</td>
            `;
        } else { // age
            row.innerHTML = `
                <td>${sale.vehicleName}</td>
                <td>${formatDate(sale.date_bought)}</td>
                <td>${formatDate(sale.sale_date)}</td>
                <td><strong>${sale.daysToSell}</strong> days</td>
                <td class="${profitClass}">${formatCurrency(sale.profit)}</td>
            `;
        }
        tbody.appendChild(row);
    });
}

// Update performance metrics
function updatePerformanceMetrics(data, totalVehicles, soldVehicles, unsoldVehicles) {
    const salesRate = totalVehicles > 0 ? (soldVehicles / totalVehicles) * 100 : 0;
    
    document.getElementById('totalVehiclesPerformance').textContent = totalVehicles;
    document.getElementById('soldVehiclesPerformance').textContent = soldVehicles;
    document.getElementById('unsoldVehiclesPerformance').textContent = unsoldVehicles;
    document.getElementById('salesRate').textContent = salesRate.toFixed(1) + '%';
}

// Initialize - check authentication on page load
function initializeApp() {
    setupLoginForm();
    setupLogoutButton();
    setupAnalyticsFilters();
    setupDashboardTabs();
    checkAuth();
    setDefaultDateBought();
    setTimeout(setupExcelLikeNavigation, 500);
    setupNewFeatures();
    
    // Setup admin panel refresh button
    const refreshUsersBtn = document.getElementById('refreshUsersBtn');
    if (refreshUsersBtn) {
        refreshUsersBtn.addEventListener('click', loadUsers);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// ========== NEW FEATURES FUNCTIONS ==========

// Apply inventory filters
function applyInventoryFilters(data) {
    let filtered = [...data];
    
    // Search filter
    const searchTerm = document.getElementById('inventorySearch')?.value.toLowerCase() || '';
    if (searchTerm) {
        filtered = filtered.filter(v => 
            (v.vin && v.vin.toLowerCase().includes(searchTerm)) ||
            (v.make && v.make.toLowerCase().includes(searchTerm)) ||
            (v.model && v.model.toLowerCase().includes(searchTerm)) ||
            (v.year && String(v.year).includes(searchTerm))
        );
    }
    
    // Status filter
    const statusFilter = document.getElementById('filterStatus')?.value || '';
    if (statusFilter) {
        filtered = filtered.filter(v => (v.status || 'In Stock') === statusFilter);
    }
    
    // Auction site filter
    const auctionFilter = document.getElementById('filterAuctionSite')?.value || '';
    if (auctionFilter) {
        filtered = filtered.filter(v => v.auction_site === auctionFilter);
    }
    
    // Date range filter
    const dateFrom = document.getElementById('filterDateFrom')?.value || '';
    const dateTo = document.getElementById('filterDateTo')?.value || '';
    if (dateFrom) {
        filtered = filtered.filter(v => v.date_bought >= dateFrom);
    }
    if (dateTo) {
        filtered = filtered.filter(v => v.date_bought <= dateTo);
    }
    
    return filtered;
}

// Update bulk actions button visibility
function updateBulkActionsButton() {
    const bulkBtn = document.getElementById('bulkActionsBtn');
    if (bulkBtn) {
        bulkBtn.style.display = selectedVehicleIds.size > 0 ? 'inline-block' : 'none';
    }
}

// Setup all new features
function setupNewFeatures() {
    // Search and filter
    const searchInput = document.getElementById('inventorySearch');
    if (searchInput) {
        searchInput.addEventListener('input', () => renderInventoryTable());
    }
    
    ['filterStatus', 'filterAuctionSite', 'filterDateFrom', 'filterDateTo'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => renderInventoryTable());
        }
    });
    
    // Export CSV
    const exportBtn = document.getElementById('exportCsvBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', async () => {
            try {
                const response = await fetch('/api/inventory/export/csv', { credentials: 'include' });
                if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `inventory-export-${new Date().toISOString().split('T')[0]}.csv`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                } else {
                    alert('Failed to export inventory');
                }
            } catch (error) {
                console.error('Export error:', error);
                alert('Failed to export inventory');
            }
        });
    }
    
    // Bulk operations
    const bulkActionsBtn = document.getElementById('bulkActionsBtn');
    const bulkActionsPanel = document.getElementById('bulkActionsPanel');
    const bulkActionSelect = document.getElementById('bulkActionSelect');
    const bulkActionValue = document.getElementById('bulkActionValue');
    const applyBulkActionBtn = document.getElementById('applyBulkActionBtn');
    const cancelBulkActionBtn = document.getElementById('cancelBulkActionBtn');
    
    if (bulkActionsBtn && bulkActionsPanel) {
        bulkActionsBtn.addEventListener('click', () => {
            bulkActionsPanel.style.display = bulkActionsPanel.style.display === 'none' ? 'block' : 'none';
        });
    }
    
    if (bulkActionSelect) {
        bulkActionSelect.addEventListener('change', (e) => {
            if (e.target.value === 'delete') {
                bulkActionValue.style.display = 'none';
            } else {
                bulkActionValue.style.display = 'inline-block';
                bulkActionValue.placeholder = e.target.value === 'update_status' ? 'Status value' : 'Market price';
            }
        });
    }
    
    if (applyBulkActionBtn) {
        applyBulkActionBtn.addEventListener('click', async () => {
            if (selectedVehicleIds.size === 0) {
                alert('Please select at least one vehicle');
                return;
            }
            
            const action = bulkActionSelect?.value;
            if (!action) {
                alert('Please select an action');
                return;
            }
            
            const ids = Array.from(selectedVehicleIds);
            
            if (action === 'delete') {
                if (!confirm(`Are you sure you want to delete ${ids.length} vehicle(s)?`)) return;
                
                try {
                    const response = await fetch('/api/inventory/bulk', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ action: 'delete', ids })
                    });
                    
                    const data = await response.json();
                    if (response.ok) {
                        alert(data.message);
                        selectedVehicleIds.clear();
                        loadInventory();
                        bulkActionsPanel.style.display = 'none';
                    } else {
                        alert('Error: ' + data.error);
                    }
                } catch (error) {
                    console.error('Bulk delete error:', error);
                    alert('Failed to delete vehicles');
                }
            } else {
                const value = bulkActionValue?.value;
                if (!value) {
                    alert('Please enter a value');
                    return;
                }
                
                const data = {};
                if (action === 'update_status') {
                    data.status = value;
                } else if (action === 'update_market_price') {
                    data.market_price = parseFloat(value);
                }
                
                try {
                    const response = await fetch('/api/inventory/bulk', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ action: 'update', ids, data })
                    });
                    
                    const result = await response.json();
                    if (response.ok) {
                        alert(result.message);
                        selectedVehicleIds.clear();
                        loadInventory();
                        bulkActionsPanel.style.display = 'none';
                    } else {
                        alert('Error: ' + result.error);
                    }
                } catch (error) {
                    console.error('Bulk update error:', error);
                    alert('Failed to update vehicles');
                }
            }
        });
    }
    
    if (cancelBulkActionBtn) {
        cancelBulkActionBtn.addEventListener('click', () => {
            bulkActionsPanel.style.display = 'none';
            selectedVehicleIds.clear();
            renderInventoryTable();
        });
    }
    
    // Image upload
    const imageInput = document.getElementById('vehicleImage');
    if (imageInput) {
        imageInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file');
                return;
            }
            
            const formData = new FormData();
            formData.append('image', file);
            
            try {
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    credentials: 'include',
                    body: formData
                });
                
                const data = await response.json();
                if (response.ok) {
                    document.getElementById('image_path').value = data.imagePath;
                    const preview = document.getElementById('imagePreview');
                    preview.innerHTML = `<img src="${data.imagePath}" style="max-width: 200px; max-height: 200px; border-radius: 6px; margin-top: 10px;">`;
                } else {
                    alert('Failed to upload image: ' + (data.error || 'Unknown error'));
                }
            } catch (error) {
                console.error('Upload error:', error);
                alert('Failed to upload image');
            }
        });
    }
    
    // Alerts system
    loadAlerts();
    setInterval(loadAlerts, 60000); // Refresh every minute
    
    const viewAllAlertsBtn = document.getElementById('viewAllAlertsBtn');
    if (viewAllAlertsBtn) {
        viewAllAlertsBtn.addEventListener('click', () => {
            document.getElementById('alertsModal').style.display = 'block';
            loadAlertsModal();
        });
    }
    
    const markAllReadBtn = document.getElementById('markAllReadBtn');
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', async () => {
            try {
                const response = await fetch('/api/alerts/read-all', {
                    method: 'PUT',
                    credentials: 'include'
                });
                if (response.ok) {
                    loadAlerts();
                }
            } catch (error) {
                console.error('Mark all read error:', error);
            }
        });
    }
    
    // Expenses modal
    window.openExpensesModal = function(vehicleId) {
        currentExpensesVehicleId = vehicleId;
        document.getElementById('expensesModal').style.display = 'block';
        loadExpenses(vehicleId);
    };
    
    window.closeExpensesModal = function() {
        document.getElementById('expensesModal').style.display = 'none';
        currentExpensesVehicleId = null;
    };
    
    const expenseForm = document.getElementById('expenseForm');
    if (expenseForm) {
        expenseForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentExpensesVehicleId) return;
            
            const expenseData = {
                expense_date: document.getElementById('expense_date').value,
                category: document.getElementById('expense_category').value,
                description: document.getElementById('expense_description').value,
                amount: parseFloat(document.getElementById('expense_amount').value)
            };
            
            try {
                const response = await fetch(`/api/inventory/${currentExpensesVehicleId}/expenses`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(expenseData)
                });
                
                const data = await response.json();
                if (response.ok) {
                    expenseForm.reset();
                    loadExpenses(currentExpensesVehicleId);
                    loadInventory(); // Refresh to update totals
                } else {
                    alert('Error: ' + data.error);
                }
            } catch (error) {
                console.error('Add expense error:', error);
                alert('Failed to add expense');
            }
        });
    }
    
    // Alerts modal
    window.closeAlertsModal = function() {
        document.getElementById('alertsModal').style.display = 'none';
    };
}

// Load alerts
async function loadAlerts() {
    try {
        const response = await fetch('/api/alerts?unread_only=true', { credentials: 'include' });
        const data = await response.json();
        
        if (response.ok) {
            const unreadAlerts = data.filter(a => !a.is_read);
            const alertsBanner = document.getElementById('alertsBanner');
            const alertsCount = document.getElementById('alertsCount');
            const alertsList = document.getElementById('alertsList');
            
            if (unreadAlerts.length > 0) {
                alertsBanner.style.display = 'block';
                alertsCount.textContent = unreadAlerts.length;
                
                alertsList.innerHTML = unreadAlerts.slice(0, 5).map(alert => `
                    <div class="alert-item" style="padding: 10px; margin: 5px 0; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                        <strong>${alert.alert_type}:</strong> ${alert.message}
                        <button onclick="markAlertRead(${alert.id})" style="float: right; background: #667eea; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">Mark Read</button>
                    </div>
                `).join('');
                
                // Generate alerts for aging inventory
                generateAgingAlerts();
            } else {
                alertsBanner.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Load alerts error:', error);
    }
}

// Generate alerts for aging inventory
async function generateAgingAlerts() {
    try {
        const response = await fetch('/api/inventory', { credentials: 'include' });
        const data = await response.json();
        
        if (response.ok) {
            const today = new Date();
            data.forEach(vehicle => {
                if (vehicle.status !== 'Sold' && vehicle.date_bought) {
                    const dateBought = new Date(vehicle.date_bought);
                    const daysInInventory = Math.floor((today - dateBought) / (1000 * 60 * 60 * 24));
                    
                    if (daysInInventory > 90) {
                        // Check if alert already exists
                        fetch(`/api/alerts?unread_only=true`, { credentials: 'include' })
                            .then(res => res.json())
                            .then(alerts => {
                                const existingAlert = alerts.find(a => 
                                    a.inventory_id === vehicle.id && 
                                    a.alert_type === 'Aging Inventory' &&
                                    !a.is_read
                                );
                                
                                if (!existingAlert) {
                                    fetch('/api/alerts', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        credentials: 'include',
                                        body: JSON.stringify({
                                            inventory_id: vehicle.id,
                                            alert_type: 'Aging Inventory',
                                            message: `Vehicle ${vehicle.vin} (${vehicle.year} ${vehicle.make} ${vehicle.model}) has been in inventory for ${daysInInventory} days`
                                        })
                                    });
                                }
                            });
                    }
                }
            });
        }
    } catch (error) {
        console.error('Generate alerts error:', error);
    }
}

// Mark alert as read
window.markAlertRead = async function(alertId) {
    try {
        const response = await fetch(`/api/alerts/${alertId}/read`, {
            method: 'PUT',
            credentials: 'include'
        });
        if (response.ok) {
            loadAlerts();
        }
    } catch (error) {
        console.error('Mark alert read error:', error);
    }
};

// Load alerts modal
async function loadAlertsModal() {
    try {
        const response = await fetch('/api/alerts', { credentials: 'include' });
        const data = await response.json();
        
        if (response.ok) {
            const alertsList = document.getElementById('alertsModalList');
            if (alertsList) {
                if (data.length === 0) {
                    alertsList.innerHTML = '<p>No alerts</p>';
                } else {
                    alertsList.innerHTML = data.map(alert => `
                        <div class="alert-item" style="padding: 15px; margin: 10px 0; background: ${alert.is_read ? '#f8f9fa' : '#fff3cd'}; border-left: 4px solid ${alert.is_read ? '#6c757d' : '#ffc107'}; border-radius: 4px;">
                            <strong>${alert.alert_type}:</strong> ${alert.message}
                            <div style="font-size: 12px; color: #666; margin-top: 5px;">
                                ${alert.vin ? `VIN: ${alert.vin}` : ''} - ${new Date(alert.created_at).toLocaleString()}
                            </div>
                            ${!alert.is_read ? `<button onclick="markAlertRead(${alert.id}); loadAlertsModal();" style="margin-top: 5px; background: #667eea; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">Mark Read</button>` : ''}
                        </div>
                    `).join('');
                }
            }
        }
    } catch (error) {
        console.error('Load alerts modal error:', error);
    }
}

// Load expenses
async function loadExpenses(vehicleId) {
    try {
        // Load vehicle info
        const vehicleResponse = await fetch(`/api/inventory/${vehicleId}`, { credentials: 'include' });
        const vehicleData = await vehicleResponse.json();
        
        if (vehicleResponse.ok) {
            const vehicleInfo = document.getElementById('expensesVehicleInfo');
            vehicleInfo.innerHTML = `
                <strong>VIN:</strong> ${vehicleData.vin} | 
                <strong>Make:</strong> ${vehicleData.make} | 
                <strong>Model:</strong> ${vehicleData.model} | 
                <strong>Year:</strong> ${vehicleData.year}
            `;
        }
        
        // Load expenses
        const response = await fetch(`/api/inventory/${vehicleId}/expenses`, { credentials: 'include' });
        const data = await response.json();
        
        if (response.ok) {
            const tbody = document.getElementById('expensesTableBody');
            const tfoot = document.getElementById('expensesTotals');
            
            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No expenses recorded</td></tr>';
                tfoot.innerHTML = '';
            } else {
                let total = 0;
                tbody.innerHTML = data.map(expense => {
                    total += parseFloat(expense.amount) || 0;
                    return `
                        <tr>
                            <td>${formatDate(expense.expense_date)}</td>
                            <td>${expense.category}</td>
                            <td>${expense.description}</td>
                            <td>${formatCurrency(expense.amount)}</td>
                            <td>
                                <a href="#" onclick="event.preventDefault(); deleteExpense(${expense.id}); return false;" style="color: #dc3545;">Delete</a>
                            </td>
                        </tr>
                    `;
                }).join('');
                
                tfoot.innerHTML = `
                    <tr style="background: #667eea; color: white; font-weight: 600;">
                        <td colspan="3" style="text-align: right; padding: 10px;">Total:</td>
                        <td style="padding: 10px;">${formatCurrency(total)}</td>
                        <td></td>
                    </tr>
                `;
            }
        }
    } catch (error) {
        console.error('Load expenses error:', error);
    }
}

// Delete expense
window.deleteExpense = async function(expenseId) {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    
    try {
        const response = await fetch(`/api/inventory/${currentExpensesVehicleId}/expenses/${expenseId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (response.ok) {
            loadExpenses(currentExpensesVehicleId);
            loadInventory(); // Refresh to update totals
        } else {
            const data = await response.json();
            alert('Error: ' + data.error);
        }
    } catch (error) {
        console.error('Delete expense error:', error);
        alert('Failed to delete expense');
    }
};

// Admin Panel Functions
async function loadAdminPanel() {
    if (!isAdmin) {
        alert('Unauthorized: Admin access required');
        return;
    }
    
    await loadUsers();
    
    // Setup invite form
    const inviteForm = document.getElementById('inviteUserForm');
    if (inviteForm) {
        inviteForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('inviteEmail').value.trim();
            const companyName = document.getElementById('inviteCompanyName').value.trim();
            const messageDiv = document.getElementById('inviteMessage');
            
            if (!email || !companyName) {
                messageDiv.innerHTML = '<p style="color: #dc3545;">Please fill in all fields</p>';
                return;
            }
            
            try {
                messageDiv.innerHTML = '<p style="color: #667eea;">Sending invitation...</p>';
                
                const response = await fetch('/api/auth/invite', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ email, companyName })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    if (data.credentials) {
                        // Email not configured - show credentials
                        messageDiv.innerHTML = `
                            <div style="background: #fff3cd; padding: 15px; border-radius: 6px; border-left: 4px solid #ffc107;">
                                <p><strong>User created successfully!</strong></p>
                                <p>Email is not configured. Please provide these credentials to the user:</p>
                                <div style="background: white; padding: 10px; margin: 10px 0; border-radius: 4px;">
                                    <p><strong>Email:</strong> ${data.credentials.username}</p>
                                    <p><strong>Password:</strong> <code>${data.credentials.password}</code></p>
                                </div>
                                <p style="font-size: 12px; color: #666;">${data.credentials.note}</p>
                            </div>
                        `;
                    } else {
                        messageDiv.innerHTML = '<p style="color: #28a745;">✓ Invitation email sent successfully!</p>';
                    }
                    inviteForm.reset();
                    setTimeout(() => {
                        loadUsers(); // Refresh user list
                    }, 1000);
                } else {
                    messageDiv.innerHTML = `<p style="color: #dc3545;">Error: ${data.error}</p>`;
                }
            } catch (error) {
                console.error('Invite user error:', error);
                messageDiv.innerHTML = '<p style="color: #dc3545;">Failed to send invitation. Please try again.</p>';
            }
        });
    }
}

async function loadUsers() {
    try {
        const response = await fetch('/api/auth/users', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            if (response.status === 403) {
                const usersList = document.getElementById('usersList');
                if (usersList) {
                    usersList.innerHTML = '<p style="color: #dc3545;">Unauthorized: Admin access required</p>';
                }
                return;
            }
            throw new Error('Failed to load users');
        }
        
        const users = await response.json();
        const usersList = document.getElementById('usersList');
        
        if (!usersList) return;
        
        if (users.length === 0) {
            usersList.innerHTML = '<p>No users found</p>';
        } else {
            usersList.innerHTML = `
                <table class="admin-table" style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #667eea; color: white;">
                            <th style="padding: 10px; text-align: left;">ID</th>
                            <th style="padding: 10px; text-align: left;">Username</th>
                            <th style="padding: 10px; text-align: left;">Created</th>
                            <th style="padding: 10px; text-align: left;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.map(user => `
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${user.id}</td>
                                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${user.username}</td>
                                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${new Date(user.created_at).toLocaleDateString()}</td>
                                <td style="padding: 10px; border-bottom: 1px solid #ddd;">
                                    ${user.id === currentUser?.id ? '<span style="color: #999;">Current User</span>' : `<button onclick="deleteUser(${user.id})" class="btn-secondary" style="padding: 5px 10px; font-size: 12px;">Delete</button>`}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }
    } catch (error) {
        console.error('Load users error:', error);
        const usersList = document.getElementById('usersList');
        if (usersList) {
            usersList.innerHTML = '<p style="color: #dc3545;">Error loading users</p>';
        }
    }
}

window.deleteUser = async function(userId) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/auth/users/${userId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('User deleted successfully');
            loadUsers();
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        console.error('Delete user error:', error);
        alert('Failed to delete user');
    }
};

