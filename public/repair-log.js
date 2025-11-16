// Get vehicle ID from URL parameter
const urlParams = new URLSearchParams(window.location.search);
const vehicleId = urlParams.get('id');

let currentVehicleId = vehicleId;
let isAuthenticated = false;

// DOM Elements
const repairsContainer = document.getElementById('repairsContainer');

// Check authentication
async function checkAuth() {
    try {
        const response = await fetch('/api/auth/check', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (response.ok && data.authenticated) {
            isAuthenticated = true;
            return true;
        } else {
            // Redirect to login
            window.location.href = '/';
            return false;
        }
    } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = '/';
        return false;
    }
}

// Load vehicle details and repairs on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication first
    const authenticated = await checkAuth();
    if (!authenticated) {
        return;
    }
    
    if (!vehicleId) {
        alert('No vehicle ID provided');
        window.close();
        return;
    }
    
    await loadVehicleDetails(vehicleId);
    await loadRepairs(vehicleId);
});

// Load vehicle details
async function loadVehicleDetails(id) {
    try {
        const response = await fetch(`/api/inventory/${id}`, {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            alert('Error: ' + (errorData.error || `Failed to load vehicle details (Status: ${response.status})`));
            return;
        }
        
        const data = await response.json();
        
        // Pre-fill vehicle information
        document.getElementById('modalVin').textContent = data.vin || '-';
        document.getElementById('modalMake').textContent = data.make || '-';
        document.getElementById('modalModel').textContent = data.model || '-';
        document.getElementById('modalYear').textContent = data.year || '-';
    } catch (error) {
        console.error('Load vehicle error:', error);
        alert('Failed to load vehicle details: ' + error.message);
    }
}

// Load repairs for a vehicle
async function loadRepairs(vehicleId) {
    try {
        const response = await fetch(`/api/inventory/${vehicleId}/repairs`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            repairsContainer.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #dc3545;">Error loading repairs</td></tr>';
            return;
        }
        
        const data = await response.json();
        repairsContainer.innerHTML = '';
        
        // Always add an empty row at the end for new entries
        const today = new Date().toISOString().split('T')[0];
        
        // Initialize totals
        let totalPartCost = 0;
        let totalLaborCost = 0;
        let totalCost = 0;
        let repairCount = 0;
        
        if (data.length === 0) {
            repairsContainer.innerHTML = '';
            addEmptyRow(today);
            updateTotalsRow(0, 0, 0, 0);
            return;
        }
        
        data.forEach(repair => {
            const partCost = repair.part_cost || 0;
            const laborCost = repair.labor_cost || 0;
            const repairTotalCost = repair.cost || (partCost + laborCost);
            
            // Accumulate totals
            totalPartCost += partCost;
            totalLaborCost += laborCost;
            totalCost += repairTotalCost;
            repairCount++;
            
            const row = document.createElement('tr');
            row.id = `repair-row-${repair.id}`;
            row.dataset.repairId = repair.id;
            // Store data in row for editing
            row.dataset.repairDate = repair.repair_date;
            row.dataset.partCost = partCost;
            row.dataset.laborCost = laborCost;
            row.dataset.description = repair.description;
            
            row.innerHTML = `
                <td class="editable-cell" data-field="repair_date" data-type="date">
                    <span class="cell-display">${formatDate(repair.repair_date)}</span>
                    <input type="date" class="cell-edit" value="${repair.repair_date}" onblur="saveCellEdit(${repair.id}, 'repair_date', this.value)" onkeydown="handleCellKeydown(event, ${repair.id}, 'repair_date', this)">
                </td>
                <td class="editable-cell repair-description-cell" data-field="description" data-type="text">
                    <span class="cell-display">${repair.description}</span>
                    <textarea class="cell-edit" rows="2" onblur="saveCellEdit(${repair.id}, 'description', this.value)" onkeydown="handleCellKeydown(event, ${repair.id}, 'description', this)">${repair.description}</textarea>
                </td>
                <td class="editable-cell" data-field="part_cost" data-type="number">
                    <span class="cell-display">${formatCurrency(partCost)}</span>
                    <input type="number" class="cell-edit" step="0.01" min="0" value="${partCost}" onblur="saveCellEdit(${repair.id}, 'part_cost', this.value)" onkeydown="handleCellKeydown(event, ${repair.id}, 'part_cost', this)" oninput="updateRowTotal(${repair.id})">
                </td>
                <td class="editable-cell" data-field="labor_cost" data-type="number">
                    <span class="cell-display">${formatCurrency(laborCost)}</span>
                    <input type="number" class="cell-edit" step="0.01" min="0" value="${laborCost}" onblur="saveCellEdit(${repair.id}, 'labor_cost', this.value)" onkeydown="handleCellKeydown(event, ${repair.id}, 'labor_cost', this)" oninput="updateRowTotal(${repair.id})">
                </td>
                <td class="total-cost-cell" id="total-${repair.id}">${formatCurrency(repairTotalCost)}</td>
                <td>
                    <div class="repair-actions">
                        <a href="#" class="link-edit" onclick="event.preventDefault(); editRepair(${repair.id}); return false;">Edit</a>
                        <a href="#" class="link-delete" onclick="event.preventDefault(); if(confirm('Are you sure you want to delete this repair record?')) { deleteRepair(${repair.id}); } return false;">Delete</a>
                    </div>
                </td>
            `;
            repairsContainer.appendChild(row);
            
            // Add click handler for editable cells
            const editableCells = row.querySelectorAll('.editable-cell');
            editableCells.forEach(cell => {
                cell.addEventListener('click', function(e) {
                    if (!cell.classList.contains('editing')) {
                        startCellEdit(cell);
                    }
                });
            });
        });
        
        // Update totals row
        updateTotalsRow(repairCount, totalPartCost, totalLaborCost, totalCost);
        
        // Add empty row at the end for new entries
        addEmptyRow(today);
    } catch (error) {
        console.error('Load repairs error:', error);
        repairsContainer.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #dc3545;">Error loading repairs</td></tr>';
    }
}

// Edit repair - starts inline editing
function editRepair(repairId) {
    // Find the repair row
    const row = document.getElementById(`repair-row-${repairId}`);
    if (!row) return;
    
    // Start editing the first cell (date)
    const firstCell = row.querySelector('.editable-cell');
    if (firstCell) {
        startCellEdit(firstCell);
    }
}

// Delete repair
async function deleteRepair(repairId) {
    try {
        const response = await fetch(`/api/inventory/repairs/${repairId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            await loadRepairs(currentVehicleId);
        } else {
            alert('Error: ' + (data.error || 'Failed to delete repair'));
        }
    } catch (error) {
        console.error('Delete repair error:', error);
        alert('Failed to delete repair. Please try again.');
    }
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
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Update totals row
function updateTotalsRow(count, totalPartCost, totalLaborCost, totalCost) {
    const totalsFooter = document.getElementById('repairsTotals');
    if (!totalsFooter) return;
    
    if (count === 0) {
        totalsFooter.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 15px;">No repairs recorded</td>
            </tr>
        `;
        return;
    }
    
    totalsFooter.innerHTML = `
        <tr>
            <td><strong>Total (${count} ${count === 1 ? 'repair' : 'repairs'}):</strong></td>
            <td></td>
            <td><strong>${formatCurrency(totalPartCost)}</strong></td>
            <td><strong>${formatCurrency(totalLaborCost)}</strong></td>
            <td><strong>${formatCurrency(totalCost)}</strong></td>
            <td></td>
        </tr>
    `;
}

// Inline cell editing functions
function startCellEdit(cell) {
    cell.classList.add('editing');
    const input = cell.querySelector('.cell-edit');
    if (input) {
        input.focus();
        if (input.type === 'text' || input.type === 'number') {
            input.select();
        }
    }
}

function handleCellKeydown(event, repairId, field, input) {
    if (event.key === 'Enter' && input.tagName !== 'TEXTAREA') {
        event.preventDefault();
        input.blur(); // This will trigger saveCellEdit
    } else if (event.key === 'Escape') {
        event.preventDefault();
        cancelCellEdit(input.closest('.editable-cell'));
    }
}

function cancelCellEdit(cell) {
    const row = cell.closest('tr');
    const repairId = row.dataset.repairId;
    const field = cell.dataset.field;
    const input = cell.querySelector('.cell-edit');
    
    if (!input) return;
    
    // Restore original value
    if (field === 'repair_date') {
        input.value = row.dataset.repairDate;
    } else if (field === 'description') {
        input.value = row.dataset.description;
    } else if (field === 'part_cost') {
        input.value = row.dataset.partCost;
    } else if (field === 'labor_cost') {
        input.value = row.dataset.laborCost;
    }
    
    cell.classList.remove('editing');
}

function updateRowTotal(repairId) {
    const row = document.getElementById(`repair-row-${repairId}`);
    if (!row) return;
    
    const partCostInput = row.querySelector('[data-field="part_cost"] .cell-edit');
    const laborCostInput = row.querySelector('[data-field="labor_cost"] .cell-edit');
    
    if (partCostInput && laborCostInput) {
        const partCost = parseFloat(partCostInput.value) || 0;
        const laborCost = parseFloat(laborCostInput.value) || 0;
        const totalCost = partCost + laborCost;
        
        const totalCell = document.getElementById(`total-${repairId}`);
        if (totalCell) {
            totalCell.textContent = formatCurrency(totalCost);
        }
    }
}

async function saveCellEdit(repairId, field, value) {
    const row = document.getElementById(`repair-row-${repairId}`);
    if (!row) return;
    
    const cell = row.querySelector(`[data-field="${field}"]`);
    if (!cell) return;
    
    // Remove editing class
    cell.classList.remove('editing');
    
    // Update display value
    const display = cell.querySelector('.cell-display');
    if (display) {
        if (field === 'repair_date') {
            display.textContent = formatDate(value);
            row.dataset.repairDate = value;
        } else if (field === 'description') {
            display.textContent = value;
            row.dataset.description = value;
        } else if (field === 'part_cost') {
            const numValue = parseFloat(value) || 0;
            display.textContent = formatCurrency(numValue);
            row.dataset.partCost = numValue;
            // Update total
            updateRowTotal(repairId);
        } else if (field === 'labor_cost') {
            const numValue = parseFloat(value) || 0;
            display.textContent = formatCurrency(numValue);
            row.dataset.laborCost = numValue;
            // Update total
            updateRowTotal(repairId);
        }
    }
    
    // Get all current values
    const repairDate = row.dataset.repairDate;
    const description = row.dataset.description;
    const partCost = parseFloat(row.dataset.partCost) || 0;
    const laborCost = parseFloat(row.dataset.laborCost) || 0;
    const totalCost = partCost + laborCost;
    
    // Update the total cost cell
    const totalCell = document.getElementById(`total-${repairId}`);
    if (totalCell) {
        totalCell.textContent = formatCurrency(totalCost);
    }
    
    // Save to server
    const repairData = {
        repair_date: repairDate,
        description: description,
        part_cost: partCost,
        labor_cost: laborCost,
        cost: totalCost
    };
    
    try {
        const response = await fetch(`/api/inventory/repairs/${repairId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(repairData)
        });
        
        if (!response.ok) {
            const data = await response.json();
            alert('Error saving: ' + (data.error || 'Failed to save changes'));
            // Reload to restore correct values
            await loadRepairs(currentVehicleId);
        }
    } catch (error) {
        console.error('Save cell error:', error);
        alert('Failed to save changes. Please try again.');
        // Reload to restore correct values
        await loadRepairs(currentVehicleId);
    }
}

// Make functions available globally
window.deleteRepair = deleteRepair;
window.editRepair = editRepair;
window.saveCellEdit = saveCellEdit;
window.handleCellKeydown = handleCellKeydown;
window.updateRowTotal = updateRowTotal;
window.saveNewRepair = saveNewRepair;
window.handleNewRowKeydown = handleNewRowKeydown;
window.updateNewRowTotal = updateNewRowTotal;

// Add empty row for new entry
function addEmptyRow(defaultDate) {
    const emptyRowId = 'new-repair-row';
    // Remove existing empty row if any
    const existingEmpty = document.getElementById(emptyRowId);
    if (existingEmpty) {
        existingEmpty.remove();
    }
    
    const row = document.createElement('tr');
    row.id = emptyRowId;
    row.className = 'new-repair-row';
    row.dataset.repairId = 'new';
    row.dataset.repairDate = defaultDate;
    row.dataset.partCost = '0';
    row.dataset.laborCost = '0';
    row.dataset.description = '';
    
    row.innerHTML = `
        <td class="editable-cell" data-field="repair_date" data-type="date">
            <span class="cell-display">${formatDate(defaultDate)}</span>
            <input type="date" class="cell-edit" value="${defaultDate}" onblur="saveNewRepair(this)" onkeydown="handleNewRowKeydown(event, 'repair_date', this)">
        </td>
        <td class="editable-cell repair-description-cell" data-field="description" data-type="text">
            <span class="cell-display" style="color: #999;">Enter description...</span>
            <textarea class="cell-edit" rows="2" placeholder="Enter description" onblur="saveNewRepair(this)" onkeydown="handleNewRowKeydown(event, 'description', this)"></textarea>
        </td>
        <td class="editable-cell" data-field="part_cost" data-type="number">
            <span class="cell-display" style="color: #999;">$0.00</span>
            <input type="number" class="cell-edit" step="0.01" min="0" value="0" placeholder="0.00" onblur="saveNewRepair(this)" onkeydown="handleNewRowKeydown(event, 'part_cost', this)" oninput="updateNewRowTotal()">
        </td>
        <td class="editable-cell" data-field="labor_cost" data-type="number">
            <span class="cell-display" style="color: #999;">$0.00</span>
            <input type="number" class="cell-edit" step="0.01" min="0" value="0" placeholder="0.00" onblur="saveNewRepair(this)" onkeydown="handleNewRowKeydown(event, 'labor_cost', this)" oninput="updateNewRowTotal()">
        </td>
        <td class="total-cost-cell" id="total-new">$0.00</td>
        <td>
            <div class="repair-actions">
                <span style="color: #999; font-size: 12px;">New row</span>
            </div>
        </td>
    `;
    
    repairsContainer.appendChild(row);
    
    // Add click handler for editable cells
    const editableCells = row.querySelectorAll('.editable-cell');
    editableCells.forEach(cell => {
        cell.addEventListener('click', function(e) {
            if (!cell.classList.contains('editing')) {
                startCellEdit(cell);
            }
        });
    });
}

// Handle keyboard navigation for new row
function handleNewRowKeydown(event, field, input) {
    if (event.key === 'Enter' && input.tagName !== 'TEXTAREA') {
        event.preventDefault();
        // Move to next cell
        const row = input.closest('tr');
        const cells = row.querySelectorAll('.editable-cell');
        const currentIndex = Array.from(cells).findIndex(cell => cell.dataset.field === field);
        if (currentIndex < cells.length - 1) {
            const nextCell = cells[currentIndex + 1];
            startCellEdit(nextCell);
        } else {
            // If last cell, save the new repair
            input.blur();
        }
    } else if (event.key === 'Tab') {
        // Allow default tab behavior
        return;
    } else if (event.key === 'Escape') {
        event.preventDefault();
        cancelNewRowEdit(input.closest('.editable-cell'));
    }
}

function cancelNewRowEdit(cell) {
    const row = cell.closest('tr');
    const field = cell.dataset.field;
    const input = cell.querySelector('.cell-edit');
    
    if (!input) return;
    
    // Restore original value
    if (field === 'repair_date') {
        input.value = row.dataset.repairDate;
    } else if (field === 'description') {
        input.value = '';
    } else if (field === 'part_cost') {
        input.value = '0';
    } else if (field === 'labor_cost') {
        input.value = '0';
    }
    
    cell.classList.remove('editing');
}

function updateNewRowTotal() {
    const row = document.getElementById('new-repair-row');
    if (!row) return;
    
    const partCostInput = row.querySelector('[data-field="part_cost"] .cell-edit');
    const laborCostInput = row.querySelector('[data-field="labor_cost"] .cell-edit');
    
    if (partCostInput && laborCostInput) {
        const partCost = parseFloat(partCostInput.value) || 0;
        const laborCost = parseFloat(laborCostInput.value) || 0;
        const totalCost = partCost + laborCost;
        
        const totalCell = document.getElementById('total-new');
        if (totalCell) {
            totalCell.textContent = formatCurrency(totalCost);
        }
    }
}

async function saveNewRepair(input) {
    const row = document.getElementById('new-repair-row');
    if (!row) return;
    
    const field = input.closest('.editable-cell').dataset.field;
    const cell = row.querySelector(`[data-field="${field}"]`);
    
    if (!cell) return;
    
    // Remove editing class
    cell.classList.remove('editing');
    
    // Update display and dataset
    const display = cell.querySelector('.cell-display');
    const value = input.value;
    
    if (field === 'repair_date') {
        if (display) display.textContent = formatDate(value);
        row.dataset.repairDate = value;
    } else if (field === 'description') {
        if (display) {
            display.textContent = value || 'Enter description...';
            display.style.color = value ? '#333' : '#999';
        }
        row.dataset.description = value;
    } else if (field === 'part_cost') {
        const numValue = parseFloat(value) || 0;
        if (display) {
            display.textContent = formatCurrency(numValue);
            display.style.color = numValue > 0 ? '#333' : '#999';
        }
        row.dataset.partCost = numValue;
        updateNewRowTotal();
    } else if (field === 'labor_cost') {
        const numValue = parseFloat(value) || 0;
        if (display) {
            display.textContent = formatCurrency(numValue);
            display.style.color = numValue > 0 ? '#333' : '#999';
        }
        row.dataset.laborCost = numValue;
        updateNewRowTotal();
    }
    
    // Check if we have enough data to save (at least description and some cost)
    const description = row.dataset.description;
    const partCost = parseFloat(row.dataset.partCost) || 0;
    const laborCost = parseFloat(row.dataset.laborCost) || 0;
    const totalCost = partCost + laborCost;
    
    // Only save if we have description and total cost > 0
    if (description && description.trim() !== '' && totalCost > 0) {
        const repairDate = row.dataset.repairDate;
        
        const repairData = {
            repair_date: repairDate,
            description: description.trim(),
            part_cost: partCost,
            labor_cost: laborCost,
            cost: totalCost
        };
        
        try {
            const response = await fetch(`/api/inventory/${currentVehicleId}/repairs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(repairData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Reload repairs to show the new one and add another empty row
                await loadRepairs(currentVehicleId);
            } else {
                alert('Error saving: ' + (data.error || 'Failed to save repair'));
            }
        } catch (error) {
            console.error('Save new repair error:', error);
            alert('Failed to save repair. Please try again.');
        }
    }
}

