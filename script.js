let db;
let suitsData = [];
let historyStartDate = "";
let historyEndDate = "";
const CORRECT_PIN = "2704"; 

function toTitleCase(str) {
    if (!str) return '';
    return str.trim()
        .toLowerCase()
        .split(/\s+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function verifyStartupPin(event) {
    event.preventDefault();
    const enteredPin = document.getElementById('startupPinInput').value;

    if (enteredPin === CORRECT_PIN) {
        document.getElementById('startupPinOverlay').style.display = 'none';
    } else {
        document.getElementById('startupPinError').style.display = 'block';
        document.getElementById('startupPinInput').value = '';
        document.getElementById('startupPinInput').focus();
    }
}

document.getElementById('paymentType').addEventListener('change', function() {
    const wrapper = document.getElementById('orderCodeWrapper');
    const input = document.getElementById('orderCode');
    if (this.value === 'COD') {
        wrapper.style.display = 'block';
        input.required = true;
    } else {
        wrapper.style.display = 'none';
        input.required = false;
        input.value = '';
    }
});

function initDB() {
    const request = indexedDB.open("SalesmanTrackerDB", 1);

    request.onerror = function(event) {
        console.error("IndexedDB error:", event.target.error);
    };

    request.onsuccess = function(event) {
        db = event.target.result;
        loadAllRecords();
    };

    request.onupgradeneeded = function(event) {
        db = event.target.result;
        if (!db.objectStoreNames.contains("sales")) {
            db.createObjectStore("sales", { keyPath: "id", autoIncrement: true });
        }
    };
}

function loadAllRecords() {
    if (!db) return;
    const transaction = db.transaction(["sales"], "readonly");
    const store = transaction.objectStore("sales");
    const request = store.getAll();

    request.onsuccess = function(event) {
        suitsData = event.target.result || [];
        updateDesignSuggestions();
        renderTable();
    };
}

function getRecordIsoDate(record) {
    if (record.isoDate) return record.isoDate;
    if (!record.date) return "";
    const parts = record.date.split(' ');
    if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const monthStr = parts[1];
        const year = parts[2];
        const months = {Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'};
        const month = months[monthStr] || '01';
        return `${year}-${month}-${day}`;
    }
    return "";
}

function getRecordDesigns(record) {
    if (record.designs && Array.isArray(record.designs)) {
        return record.designs;
    }
    return [{
        design: record.design || '',
        price: record.price || 0,
        sizes: record.sizes || { S: 0, M: 0, L: 0, XL: 0 }
    }];
}

function updateDesignSuggestions() {
    const datalist = document.getElementById('designSuggestions');
    if (!datalist) return;
    
    const uniqueNamesMap = new Map();
    suitsData.forEach(record => {
        const designs = getRecordDesigns(record);
        designs.forEach(d => {
            const rawName = (d.design || '').trim();
            if (!rawName) return;
            const lowerKey = rawName.toLowerCase();
            if (!uniqueNamesMap.has(lowerKey)) {
                uniqueNamesMap.set(lowerKey, toTitleCase(rawName));
            }
        });
    });

    let fragment = document.createDocumentFragment();
    uniqueNamesMap.forEach(displayName => {
        const option = document.createElement('option');
        option.value = displayName;
        fragment.appendChild(option);
    });
    datalist.innerHTML = '';
    datalist.appendChild(fragment);
}

function addDesignBlock(data = null) {
    const container = document.getElementById('designsContainer');
    const index = container.children.length;
    
    const block = document.createElement('div');
    block.className = 'design-block';
    block.style.cssText = 'background: #f8fafc; border: 1px solid var(--border-color); border-radius: 12px; padding: 15px; display: flex; flex-direction: column; gap: 12px; position: relative;';
    
    const designNameVal = data ? data.design : '';
    const priceVal = data ? data.price : '';
    const sVal = data ? (data.sizes.S || '') : '';
    const mVal = data ? (data.sizes.M || '') : '';
    const lVal = data ? (data.sizes.L || '') : '';
    const xlVal = data ? (data.sizes.XL || '') : '';

    block.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong style="font-size: 13px; color: #4b5563; text-transform: uppercase;">Design #${index + 1}</strong>
            ${index > 0 ? '<button type="button" onclick="this.closest(\'.design-block\').remove(); updateDesignLabels();" style="background: none; border: none; color: #dc2626; font-weight: bold; cursor: pointer; font-size: 13px;">Remove</button>' : ''}
        </div>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <input type="text" class="block-design-name" list="designSuggestions" placeholder="Design Name Sold" value="${designNameVal}" required style="flex: 2; min-width: 150px;" autocomplete="off">
            <input type="number" class="block-design-price" placeholder="Price per Suit" min="0" value="${priceVal}" required style="flex: 1; min-width: 110px;">
        </div>
        <div class="form-row-sizes" style="margin: 0; background: #fff;">
            <h4 style="font-size: 13px; margin-bottom: 5px;">Size Quantities:</h4>
            <div class="size-input-group"><label>S</label><input type="number" class="q-s" min="0" placeholder="0" value="${sVal}"></div>
            <div class="size-input-group"><label>M</label><input type="number" class="q-m" min="0" placeholder="0" value="${mVal}"></div>
            <div class="size-input-group"><label>L</label><input type="number" class="q-l" min="0" placeholder="0" value="${lVal}"></div>
            <div class="size-input-group"><label>XL</label><input type="number" class="q-xl" min="0" placeholder="0" value="${xlVal}"></div>
        </div>
    `;
    container.appendChild(block);
}

function updateDesignLabels() {
    const blocks = document.querySelectorAll('.design-block');
    blocks.forEach((block, idx) => {
        const title = block.querySelector('strong');
        title.innerText = `Design #${idx + 1}`;
        const removeBtn = block.querySelector('button[type="button"]');
        if (idx === 0) {
            if (removeBtn) removeBtn.remove();
        } else {
            if (!removeBtn) {
                const header = block.querySelector('div:first-child');
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.style.cssText = 'background: none; border: none; color: #dc2626; font-weight: bold; cursor: pointer; font-size: 13px;';
                btn.innerText = 'Remove';
                btn.onclick = function() { block.remove(); updateDesignLabels(); };
                header.appendChild(btn);
            }
        }
    });
}

function updateTopDesigns() {
    const designCounts = {};
    const displayNames = {};
    
    suitsData.forEach(record => {
        const designs = getRecordDesigns(record);
        designs.forEach(d => {
            const rawName = (d.design || '').trim();
            if (!rawName) return;
            
            const key = rawName.toLowerCase();
            let dQty = (parseInt(d.sizes.S) || 0) + (parseInt(d.sizes.M) || 0) + (parseInt(d.sizes.L) || 0) + (parseInt(d.sizes.XL) || 0);
            
            designCounts[key] = (designCounts[key] || 0) + dQty;
            
            if (!displayNames[key]) {
                displayNames[key] = toTitleCase(rawName);
            }
        });
    });

    const sortedDesigns = Object.entries(designCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

    const container = document.getElementById('topDesignsList');
    container.innerHTML = '';

    if (sortedDesigns.length === 0) {
        container.innerHTML = '<span style="color: #9ca3af; font-size: 14px; font-weight: normal;">No data available yet</span>';
        return;
    }

    sortedDesigns.forEach(([key, qty], idx) => {
        const displayName = displayNames[key];
        const badge = document.createElement('div');
        badge.style.cssText = 'background: #f8fafc; border: 1px solid var(--border-color); padding: 6px 12px; border-radius: 10px; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 6px; flex: 1; min-width: 130px; justify-content: space-between;';
        badge.innerHTML = `<span style="color: #374151;">#${idx + 1} ${displayName}</span> <span class="badge" style="padding: 2px 8px; font-size: 12px;">${qty} sold</span>`;
        container.appendChild(badge);
    });
}

function updateTodaySalesCounter() {
    const todayIso = new Date().toISOString().split('T')[0];
    let todayRevenue = 0;

    suitsData.forEach(record => {
        const recordIso = getRecordIsoDate(record);
        if (recordIso === todayIso) {
            const designs = getRecordDesigns(record);
            designs.forEach(d => {
                let dQty = (parseInt(d.sizes.S) || 0) + (parseInt(d.sizes.M) || 0) + (parseInt(d.sizes.L) || 0) + (parseInt(d.sizes.XL) || 0);
                todayRevenue += (parseFloat(d.price) || 0) * (dQty > 0 ? dQty : 1);
            });
        }
    });

    document.getElementById('todaySalesVal').innerText = `Rs. ${todayRevenue.toLocaleString()}`;
}

function renderTable(filterQuery = "") {
    const tableBody = document.getElementById('recordBody');
    
    const rawQuery = String(filterQuery).trim();
    const query = rawQuery.toLowerCase();
    const selectedMonth = document.getElementById('monthFilter').value;

    const filteredData = suitsData.filter(record => {
        const recordIso = getRecordIsoDate(record);
        const designs = getRecordDesigns(record);

        if (historyStartDate && historyEndDate) {
            if (!recordIso || recordIso < historyStartDate || recordIso > historyEndDate) return false;
        } else if (historyStartDate) {
            if (!recordIso || recordIso < historyStartDate) return false;
        } else if (historyEndDate) {
            if (!recordIso || recordIso > historyEndDate) return false;
        } else if (selectedMonth) {
            if (!record.date || !record.date.includes(selectedMonth)) return false;
        }

        if (!query) return true;
        const matchesDesign = designs.some(d => (d.design || '').toLowerCase().includes(query));
        return (record.orderCode || '').toLowerCase().includes(query) ||
               (record.name || '').toLowerCase().includes(query) ||
               matchesDesign ||
               (record.date || '').toLowerCase().includes(query) ||
               (record.paymentType || '').toLowerCase().includes(query);
    });

    if (rawQuery !== "" && filteredData.length === 0) {
        showAlertModal(`${rawQuery} records are not found`);
        document.getElementById('searchInput').value = "";
        renderTable(""); 
        return;
    }

    let totalRevenue = 0;
    let codRevenue = 0;
    let fragment = document.createDocumentFragment();

    filteredData.forEach(function(record, index) {
        const row = document.createElement('tr');
        const designs = getRecordDesigns(record);
        
        let designNamesHTML = '';
        let sizesHTML = '<div style="display: flex; flex-direction: column; gap: 6px;">';
        let totalQty = 0;
        let recordTotal = 0;

        designs.forEach((d, dIdx) => {
            if (dIdx > 0) designNamesHTML += ', ';
            designNamesHTML += toTitleCase(d.design);

            let dQty = (parseInt(d.sizes.S) || 0) + (parseInt(d.sizes.M) || 0) + (parseInt(d.sizes.L) || 0) + (parseInt(d.sizes.XL) || 0);
            totalQty += dQty;
            recordTotal += (parseFloat(d.price) || 0) * (dQty > 0 ? dQty : 1);

            let dSizesStr = '';
            if ((d.sizes.S || 0) > 0) dSizesStr += `S: ${d.sizes.S} `;
            if ((d.sizes.M || 0) > 0) dSizesStr += `M: ${d.sizes.M} `;
            if ((d.sizes.L || 0) > 0) dSizesStr += `L: ${d.sizes.L} `;
            if ((d.sizes.XL || 0) > 0) dSizesStr += `XL: ${d.sizes.XL} `;
            
            if (designs.length > 1) {
                sizesHTML += `<div style="font-size: 13px;"><span style="font-weight: 600; color: #4b5563;">${toTitleCase(d.design)}:</span> <span class="badge" style="display: inline-block; padding: 2px 6px; font-size: 12px;">${dSizesStr.trim() || 'No size'}</span></div>`;
            } else {
                let singleBadgeHTML = '<div class="size-badges">';
                if ((d.sizes.S || 0) > 0) singleBadgeHTML += `<span class="badge">S: ${d.sizes.S}</span>`;
                if ((d.sizes.M || 0) > 0) singleBadgeHTML += `<span class="badge">M: ${d.sizes.M}</span>`;
                if ((d.sizes.L || 0) > 0) singleBadgeHTML += `<span class="badge">L: ${d.sizes.L}</span>`;
                if ((d.sizes.XL || 0) > 0) singleBadgeHTML += `<span class="badge">XL: ${d.sizes.XL}</span>`;
                singleBadgeHTML += '</div>';
                sizesHTML = singleBadgeHTML;
            }
        });

        if (designs.length > 1) {
            sizesHTML += '</div>';
        }

        totalRevenue += recordTotal;
        if (record.paymentType === 'COD') {
            codRevenue += recordTotal;
        }

        const paymentBadgeClass = record.paymentType === 'COD' ? 'payment-cod' : 'payment-adv';
        const paymentText = record.paymentType === 'COD' ? 'COD' : 'ADP';
        const orderCodeDisplay = record.orderCode ? `<span class="order-code-badge">${record.orderCode}</span>` : '<span style="color: #9ca3af; font-size: 13px;">-</span>';

        row.innerHTML = `
            <td data-label="#"><strong>${index + 1}</strong></td>
            <td data-label="Date & Time">
                <div class="datetime-box">
                    <span class="date-part">${record.date}</span>
                    <span class="time-part">${record.time}</span>
                </div>
            </td>
            <td data-label="Order Code">${orderCodeDisplay}</td>
            <td data-label="Customer Name"><strong>${toTitleCase(record.name)}</strong></td>
            <td data-label="Design(s) Sold">${designNamesHTML}</td>
            <td data-label="Sizes">${sizesHTML}</td>
            <td data-label="Quantity"><span class="qty-badge">${totalQty}</span></td>
            <td data-label="Total"><strong>Rs. ${Number(recordTotal).toLocaleString()}</strong></td>
            <td data-label="Payment Mode"><span class="payment-badge ${paymentBadgeClass}">${paymentText}</span></td>
            <td data-label="Actions">
                <div class="action-cell">
                    <button class="edit-btn" onclick="editRecord(${record.id})">Edit</button>
                    <button class="delete-btn" onclick="promptDelete(${record.id})">Delete</button>
                </div>
            </td>
        `;
        
        fragment.appendChild(row);
    });

    tableBody.innerHTML = '';
    tableBody.appendChild(fragment);

    document.getElementById('codSalesAmount').innerText = `Rs. ${codRevenue.toLocaleString()}`;
    document.getElementById('totalSalesAmount').innerText = `Rs. ${totalRevenue.toLocaleString()}`;
    updateTopDesigns();
    updateTodaySalesCounter();
}

function openHistoryModal() {
    document.getElementById('historyStart').value = historyStartDate;
    document.getElementById('historyEnd').value = historyEndDate;
    document.getElementById('historyModal').style.display = 'flex';
}

function closeHistoryModal() {
    document.getElementById('historyModal').style.display = 'none';
}

function applyHistoryFilter() {
    historyStartDate = document.getElementById('historyStart').value;
    historyEndDate = document.getElementById('historyEnd').value;
    document.getElementById('monthFilter').value = "";
    closeHistoryModal();
    renderTable(document.getElementById('searchInput').value);
}

function clearHistoryFilter() {
    historyStartDate = "";
    historyEndDate = "";
    document.getElementById('historyStart').value = "";
    document.getElementById('historyEnd').value = "";
    document.getElementById('monthFilter').value = "Aug";
    closeHistoryModal();
    renderTable(document.getElementById('searchInput').value);
}

function exportData() {
    if (suitsData.length === 0) {
        showAlertModal("No records available to export.");
        return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(suitsData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `salesman_backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            if (Array.isArray(imported)) {
                if (confirm(`This will replace your current data with ${imported.length} records from the backup file. Proceed?`)) {
                    const transaction = db.transaction(["sales"], "readwrite");
                    const store = transaction.objectStore("sales");
                    store.clear();
                    
                    imported.forEach(item => {
                        delete item.id;
                        if (!item.isoDate) item.isoDate = getRecordIsoDate(item);
                        store.add(item);
                    });

                    transaction.oncomplete = function() {
                        loadAllRecords();
                        showAlertModal("Data successfully restored from backup!");
                    };
                }
            } else {
                showAlertModal("Invalid backup file format.");
            }
        } catch (err) {
            showAlertModal("Error reading backup file.");
        }
        event.target.value = ""; 
    };
    reader.readAsText(file);
}

function filterRecords() {
    historyStartDate = "";
    historyEndDate = "";
    renderTable(document.getElementById('searchInput').value);
}

document.getElementById('searchInput').addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        renderTable(this.value);
    }
});

function openModal() {
    document.getElementById('modalTitle').innerText = "New Sale Record";
    document.getElementById('saveBtn').innerText = "Save Sale";
    document.getElementById('editId').value = "";
    document.getElementById('suitForm').reset();
    
    document.getElementById('orderCodeWrapper').style.display = 'none';
    document.getElementById('orderCode').required = false;

    document.getElementById('designsContainer').innerHTML = '';
    addDesignBlock();

    document.getElementById('recordModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('recordModal').style.display = 'none';
    document.getElementById('suitForm').reset();
}

function editRecord(id) {
    const record = suitsData.find(r => r.id === id);
    if (!record) return;

    document.getElementById('modalTitle').innerText = "Edit Sale Record";
    document.getElementById('saveBtn').innerText = "Update Sale";
    document.getElementById('editId').value = record.id;

    const payType = record.paymentType === 'Advance Payment' ? 'ADP' : (record.paymentType || 'COD');
    document.getElementById('paymentType').value = payType;
    
    document.getElementById('paymentType').dispatchEvent(new Event('change'));

    if (payType === 'COD') {
        document.getElementById('orderCode').value = record.orderCode || '';
    }

    document.getElementById('personName').value = record.name;

    const container = document.getElementById('designsContainer');
    container.innerHTML = '';
    const designs = getRecordDesigns(record);
    designs.forEach(d => {
        addDesignBlock(d);
    });

    document.getElementById('recordModal').style.display = 'flex';
}

let pendingDeleteId = null;

function promptDelete(id) {
    pendingDeleteId = id;
    document.getElementById('pinInput').value = '';
    document.getElementById('pinError').style.display = 'none';
    document.getElementById('pinModal').style.display = 'flex';
    setTimeout(() => document.getElementById('pinInput').focus(), 100);
}

function closePinModal() {
    pendingDeleteId = null;
    document.getElementById('pinModal').style.display = 'none';
}

function verifyAndDelete(event) {
    event.preventDefault();
    const enteredPin = document.getElementById('pinInput').value;

    if (enteredPin === CORRECT_PIN) {
        if (pendingDeleteId !== null) {
            const transaction = db.transaction(["sales"], "readwrite");
            const store = transaction.objectStore("sales");
            store.delete(pendingDeleteId);

            transaction.oncomplete = function() {
                loadAllRecords();
            };
        }
        closePinModal();
    } else {
        document.getElementById('pinError').style.display = 'block';
        document.getElementById('pinInput').value = '';
        document.getElementById('pinInput').focus();
    }
}

function showAlertModal(message) {
    document.getElementById('alertMessage').innerText = message;
    document.getElementById('alertModal').style.display = 'flex';
}

function closeAlertModal() {
    document.getElementById('alertModal').style.display = 'none';
    document.getElementById('searchInput').value = '';
    document.getElementById('searchInput').focus();
}

document.getElementById('suitForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const editIdStr = document.getElementById('editId').value;
    const editId = editIdStr ? Number(editIdStr) : null;
    const paymentType = document.getElementById('paymentType').value;
    const orderCode = paymentType === 'COD' ? document.getElementById('orderCode').value : '';
    const name = toTitleCase(document.getElementById('personName').value);
    
    const designBlocks = document.querySelectorAll('.design-block');
    const designsArray = [];
    let totalAllQty = 0;

    designBlocks.forEach(block => {
        const rawDName = block.querySelector('.block-design-name').value;
        const dName = toTitleCase(rawDName);
        const dPrice = parseFloat(block.querySelector('.block-design-price').value) || 0;
        const qS = parseInt(block.querySelector('.q-s').value) || 0;
        const qM = parseInt(block.querySelector('.q-m').value) || 0;
        const qL = parseInt(block.querySelector('.q-l').value) || 0;
        const qXL = parseInt(block.querySelector('.q-xl').value) || 0;

        let dQty = qS + qM + qL + qXL;
        totalAllQty += dQty;

        designsArray.push({
            design: dName,
            price: dPrice,
            sizes: { S: qS, M: qM, L: qL, XL: qXL }
        });
    });

    if (totalAllQty === 0) {
        showAlertModal("Please enter a quantity for at least one size across the designs.");
        return;
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); 
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }); 
    const isoDateStr = now.toISOString().split('T')[0];

    const transaction = db.transaction(["sales"], "readwrite");
    const store = transaction.objectStore("sales");

    if (editId !== null) {
        const getReq = store.get(editId);
        getReq.onsuccess = function(e) {
            let record = e.target.result;
            if (record) {
                record.orderCode = orderCode;
                record.name = name;
                record.designs = designsArray;
                delete record.design; 
                delete record.price;
                record.paymentType = paymentType;
                record.isoDate = isoDateStr;
                store.put(record);
            }
        };
    } else {
        const newRecord = {
            date: dateStr,
            time: timeStr,
            isoDate: isoDateStr,
            orderCode: orderCode,
            name: name,
            paymentType: paymentType,
            designs: designsArray
        };
        store.add(newRecord);
    }

    transaction.oncomplete = function() {
        document.getElementById('searchInput').value = "";
        loadAllRecords();
        closeModal();
    };
});

window.onclick = function(event) {
    const recordModal = document.getElementById('recordModal');
    const alertModal = document.getElementById('alertModal');
    const pinModal = document.getElementById('pinModal');
    const historyModal = document.getElementById('historyModal');
    if (event.target === recordModal) closeModal();
    if (event.target === alertModal) closeAlertModal();
    if (event.target === pinModal) closePinModal();
    if (event.target === historyModal) closeHistoryModal();
};

window.onload = function() {
    initDB();
    setTimeout(() => {
        document.getElementById('startupPinInput').focus();
    }, 100);
};