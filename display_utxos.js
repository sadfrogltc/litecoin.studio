document.addEventListener("DOMContentLoaded", async function () {
    const address = localStorage.getItem('address_LTC');
    if (address) {
        await fetchUTXOsLTC(address);
        selectHighestAmountUTXO(); // Select the UTXO with the highest amount by default
        displayUTXOs(); // Display UTXOs after fetching and selection
        updateSelectedUTXOsDisplay(); // Update the selected UTXOs display
    }

    // Collapsible section for UTXOs
    const coll = document.getElementsByClassName("collapsible");
    for (let i = 0; i < coll.length; i++) {
        coll[i].addEventListener("click", function () {
            this.classList.toggle("active");
            const content = this.nextElementSibling;
            if (content) {
                content.style.display = content.style.display === "block" ? "none" : "block";
            }
        });
    }
});

// Added the definition for toggleUTXOSection to prevent the error
function toggleUTXOSection() {
    const utxoSection = document.getElementById('utxo-section');
    if (utxoSection) {
        utxoSection.style.display = utxoSection.style.display === 'none' ? 'block' : 'none';
    }
}

let utxosFetched = false;
let rightClickedElement = null;
let selectedUTXO = []; // Array of selected UTXOs for "Spending From"
let ordinalUTXO = null; // JSON object of the selected UTXO for "Send Ordinal"
let feeUTXO = null; // JSON object of the selected UTXO for "Spend Fee"
let defaultSelectedUTXO = null; // The default selected UTXO (highest amount)
let currentPage = 1; // Track the current page number

async function fetchUTXOsLTC(address) {
    if (utxosFetched) return; // Prevent multiple fetches
    utxosFetched = true;
    try {
        const response = await fetch('fetch_utxos_LTC.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `address=${encodeURIComponent(address)}`
        });
        const data = await response.json();
        if (data.success && data.utxos) {
            localStorage.setItem('utxos_LTC', JSON.stringify(data.utxos));
            await scanUTXOsForOrdinals(data.utxos); // Scan UTXOs for ordinals
            // Note: displayUTXOs() is called after scanning inside scanUTXOsForOrdinals
        } else {
            console.error(`[DEBUG ${new Date().toISOString()}] Error fetching UTXOs: ${data.error}`);
        }
    } catch (error) {
        console.error(`[DEBUG ${new Date().toISOString()}] Error fetching UTXOs:`, error);
    }
}

async function scanUTXOsForOrdinals(utxos) {
    for (let utxo of utxos) {
        try {
            console.log(`[DEBUG] Scanning UTXO: ${utxo.txid}:${utxo.vout}`);
            const response = await fetch('litecoin.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: `txid=${utxo.txid}&vout=${utxo.vout}`
            });

            const textData = await response.text(); // Get raw text
            try {
                const data = JSON.parse(textData); // Try to parse JSON
                console.log(`[DEBUG] Ordinals API Response for ${utxo.txid}:${utxo.vout}:`, data);

                if (data.isOrdinal) {
                    console.log(`UTXO ${utxo.txid}:${utxo.vout} is an ordinal. Inscription ID: ${data.inscriptionID}`);
                    console.log(`See it at: ${data.website}`);

                    // Update the UTXO object
                    utxo.isOrdinal = true;
                    utxo.inscriptionID = data.inscriptionID;
                    utxo.website = data.website;
                } else {
                    utxo.isOrdinal = false;
                    console.log(`UTXO ${utxo.txid}:${utxo.vout} is not an ordinal.`);
                }
            } catch (error) {
                console.error(`[DEBUG] Error parsing JSON for UTXO ${utxo.txid}:${utxo.vout}:`, textData);
            }
        } catch (error) {
            console.error(`Error checking UTXO ${utxo.txid}:${utxo.vout} for ordinals:`, error);
        }
    }

    // After scanning, update localStorage
    localStorage.setItem('utxos_LTC', JSON.stringify(utxos));

    // Select the highest amount UTXO by default
    selectHighestAmountUTXO();

    // Refresh the UTXO display with updated data
    displayUTXOs();
    updateSelectedUTXOsDisplay();
}

function selectHighestAmountUTXO() {
    const utxos = JSON.parse(localStorage.getItem('utxos_LTC')) || [];
    if (utxos.length > 0) {
        // Find the UTXO with the highest amount
        const highestAmountUTXO = utxos.reduce((max, utxo) => {
            return parseFloat(utxo.amount) > parseFloat(max.amount) ? utxo : max;
        }, utxos[0]);

        // Clear previous selections
        selectedUTXO = [];
        ordinalUTXO = null;
        feeUTXO = null;
        localStorage.removeItem('selectedUTXOs_LTC');
        localStorage.removeItem('ordinalUTXO_LTC');
        localStorage.removeItem('feeUTXO_LTC');

        // Select the highest amount UTXO
        selectedUTXO.push(highestAmountUTXO);
        defaultSelectedUTXO = highestAmountUTXO; // Mark as default selected UTXO
        localStorage.setItem('selectedUTXOs_LTC', JSON.stringify(selectedUTXO));
    }
}

async function displayUTXOs(page = currentPage) {
    currentPage = page; // Update the current page
    const utxos = JSON.parse(localStorage.getItem('utxos_LTC')) || [];
    const utxoContainer = document.getElementById('unspentTx-LTC');
    const itemsPerPage = 4;
    const totalPages = Math.ceil(utxos.length / itemsPerPage);

    if (utxoContainer) {
        utxoContainer.innerHTML = '';

        if (utxos.length > 0) {
            const start = (page - 1) * itemsPerPage;
            const end = start + itemsPerPage;
            const paginatedUTXOs = utxos.slice(start, end);

            paginatedUTXOs.forEach((utxo, index) => {
                const utxoElementId = `utxo-${utxo.txid}-${utxo.vout}`;
                let ordinalLink = '';
                let ordinalImage = ''; // Image for the inscription content

                if (utxo.isOrdinal && utxo.website && utxo.inscriptionID) {
                    ordinalLink = `<a href="${utxo.website}" target="_blank" onclick="event.stopPropagation()">View Ordinal Inscription</a><br>`;
                    ordinalImage = `<div style="width:100%; max-width:300px; height:auto;">
                                      <img src="/content/${utxo.inscriptionID}" alt="Ordinal" style="width:100%; height:auto; object-fit:contain;">
                                    </div>`;
                }

                const txidStart = utxo.txid.substring(0, 6);
                const txidEnd = utxo.txid.substring(utxo.txid.length - 6);
                const truncatedTxid = `${txidStart}...${txidEnd}`;

                const txidHtml = `
                    <div class="truncated-text" onclick="copyToClipboard('${utxo.txid}')" title="Click to copy TXID" style="cursor:pointer; display:inline-block; padding:2px 6px; border:1px solid #4A4A4A; border-radius:5px; background:#f0f0f0;">
                        ${truncatedTxid}
                    </div>
                `;

                let utxoClasses = 'utxo-item';
                let badgesHtml = '';

                // Badge and class logic
                if (ordinalUTXO && ordinalUTXO.txid === utxo.txid && ordinalUTXO.vout === utxo.vout) {
                    utxoClasses += ' selected-utxo-ordinal';
                    badgesHtml += '<div class="ordinal-badge">Send Ordinal</div>';
                } else if (feeUTXO && feeUTXO.txid === utxo.txid && feeUTXO.vout === utxo.vout) {
                    utxoClasses += ' selected-utxo-fee';
                    badgesHtml += '<div class="fee-badge">Spend Fee</div>';
                } else if (selectedUTXO.some(selUtxo => selUtxo.txid === utxo.txid && selUtxo.vout === utxo.vout)) {
                    utxoClasses += ' selected-utxo';
                    // Do not display badge for default selected UTXO
                    if (!(defaultSelectedUTXO && utxo.txid === defaultSelectedUTXO.txid && utxo.vout === defaultSelectedUTXO.vout)) {
                        badgesHtml += '<div class="spending-badge">Spending From</div>';
                    }
                }

                utxoContainer.innerHTML += `
                    <div id="${utxoElementId}" class="${utxoClasses}" onclick="selectUTXO(${utxos.findIndex(u => u.txid === utxo.txid && u.vout === utxo.vout)}, '${utxoElementId}')" style="padding:15px; margin-bottom:15px; border:1px solid #ccc; border-radius:15px; background-color:#f9f9f9;">
                        ${badgesHtml}
                        <strong style="font-size:1.2em;">UTXO ${utxos.findIndex(u => u.txid === utxo.txid && u.vout === utxo.vout) + 1}</strong><br>
                        TXID: ${txidHtml}<br>
                        ${ordinalLink}
                        Vout: ${utxo.vout}<br>
                        Amount: ${utxo.amount} LTC <br>
                        Confirmations: ${utxo.confirmations}<br>
                        ${ordinalImage} <!-- Display the image here -->
                        <hr>
                    </div>
                `;
            });

            // Add pagination controls with selectable page numbers
            let paginationHtml = `<div class="pagination-controls" style="text-align:center; margin-top:10px;">`;

            // Previous button
            if (page > 1) {
                paginationHtml += `<button onclick="displayUTXOs(${page - 1});" style="padding:5px 10px; margin-right:5px;">Previous</button>`;
            }

            // Logic for displaying page numbers
            const maxPageButtons = 7; // Maximum number of page buttons to display
            let startPage = Math.max(1, page - Math.floor(maxPageButtons / 2));
            let endPage = startPage + maxPageButtons - 1;

            if (endPage > totalPages) {
                endPage = totalPages;
                startPage = Math.max(1, endPage - maxPageButtons + 1);
            }

            if (startPage > 1) {
                paginationHtml += `<button onclick="displayUTXOs(1);" style="padding:5px 10px; margin:0 2px;">1</button>`;
                if (startPage > 2) {
                    paginationHtml += `<span style="margin:0 2px;">...</span>`;
                }
            }

            for (let i = startPage; i <= endPage; i++) {
                if (i === page) {
                    paginationHtml += `<span style="padding:5px 10px; margin:0 2px; font-weight:bold;">${i}</span>`;
                } else {
                    paginationHtml += `<button onclick="displayUTXOs(${i});" style="padding:5px 10px; margin:0 2px;">${i}</button>`;
                }
            }

            if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                    paginationHtml += `<span style="margin:0 2px;">...</span>`;
                }
                paginationHtml += `<button onclick="displayUTXOs(${totalPages});" style="padding:5px 10px; margin:0 2px;">${totalPages}</button>`;
            }

            // Next button
            if (page < totalPages) {
                paginationHtml += `<button onclick="displayUTXOs(${page + 1});" style="padding:5px 10px; margin-left:5px;">Next</button>`;
            }

            paginationHtml += `</div>`;
            utxoContainer.innerHTML += paginationHtml;
        } else {
            utxoContainer.innerHTML = '<p>No UTXOs available.</p>';
        }
    }
}

function selectUTXO(index, elementId) {
    const utxos = JSON.parse(localStorage.getItem('utxos_LTC')) || [];
    const utxo = utxos[index];

    if (!utxo) {
        console.error(`[DEBUG] UTXO at index ${index} is undefined or does not exist.`);
        return;
    }

    if (ordinalUTXO && ordinalUTXO.txid === utxo.txid && ordinalUTXO.vout === utxo.vout) {
        // If the clicked UTXO is already selected as "Send Ordinal", deselect it
        deselectOrdinalUTXO();
    } else if (feeUTXO && feeUTXO.txid === utxo.txid && feeUTXO.vout === utxo.vout) {
        // If the clicked UTXO is already selected as "Spend Fee", deselect it
        deselectFeeUTXO();
    } else if (selectedUTXO.some(selUtxo => selUtxo.txid === utxo.txid && selUtxo.vout === utxo.vout)) {
        // If the clicked UTXO is already selected as "Spending From", deselect it
        selectedUTXO = selectedUTXO.filter(selUtxo => selUtxo.txid !== utxo.txid || selUtxo.vout !== utxo.vout);
        localStorage.setItem('selectedUTXOs_LTC', JSON.stringify(selectedUTXO));

        // If no UTXOs are selected, reselect the default UTXO without a badge
        if (selectedUTXO.length === 0) {
            selectHighestAmountUTXO();
        }
    } else {
        // Remove default selected UTXO if it's in selectedUTXO
        if (defaultSelectedUTXO) {
            selectedUTXO = selectedUTXO.filter(selUtxo => selUtxo.txid !== defaultSelectedUTXO.txid || selUtxo.vout !== defaultSelectedUTXO.vout);
            defaultSelectedUTXO = null;
        }

        // If a different UTXO is clicked, select it as "Spending From"
        if (ordinalUTXO) {
            deselectOrdinalUTXO(); // Deselect any selected "Send Ordinal" UTXO
        }

        if (feeUTXO) {
            deselectFeeUTXO(); // Deselect any selected "Spend Fee" UTXO
        }

        selectedUTXO.push(utxo); // Add the selected UTXO JSON object to the array
        localStorage.setItem('selectedUTXOs_LTC', JSON.stringify(selectedUTXO));
    }

    displayUTXOs(); // Refresh the UTXO display with updated data
    updateSelectedUTXOsDisplay(); // Update the selected UTXOs display
}

function selectAsOrdinal() {
    if (rightClickedElement) {
        const utxos = JSON.parse(localStorage.getItem('utxos_LTC')) || [];
        const elementId = rightClickedElement.id;
        const [_, txid, vout] = elementId.split('-');

        let utxo = utxos.find(utxo => utxo.txid === txid && utxo.vout === parseInt(vout));

        if (!utxo) {
            console.error('Ordinal UTXO not found or UTXO data is missing');
            return;
        }

        if (ordinalUTXO && ordinalUTXO.txid === utxo.txid && ordinalUTXO.vout === utxo.vout) {
            deselectOrdinalUTXO();
            const amountInput = document.getElementById('selfcustody-amount-LTC');
            if (amountInput) {
                amountInput.value = '0';
                amountInput.disabled = false;
            }
        } else {
            if (ordinalUTXO) deselectOrdinalUTXO();

            // Remove default selected UTXO if it's in selectedUTXO
            if (defaultSelectedUTXO) {
                selectedUTXO = selectedUTXO.filter(utxo => utxo.txid !== defaultSelectedUTXO.txid || utxo.vout !== defaultSelectedUTXO.vout);
                defaultSelectedUTXO = null;
            }

            ordinalUTXO = utxo;
            localStorage.setItem('ordinalUTXO_LTC', JSON.stringify(ordinalUTXO));

            const amountInput = document.getElementById('selfcustody-amount-LTC');
            if (amountInput && ordinalUTXO.amount) {
                amountInput.value = parseFloat(ordinalUTXO.amount).toFixed(8);
                amountInput.disabled = true;
            }

            // Remove the ordinal UTXO from selectedUTXO if it's there
            selectedUTXO = selectedUTXO.filter(u => u.txid !== ordinalUTXO.txid || u.vout !== ordinalUTXO.vout);
            localStorage.setItem('selectedUTXOs_LTC', JSON.stringify(selectedUTXO));
        }

        displayUTXOs(); // Refresh the UTXO display with updated data
        updateSelectedUTXOsDisplay(); // Update the selected UTXOs display
    }
}

function deselectOrdinalUTXO() {
    if (ordinalUTXO) {
        const prevOrdinalUTXO = ordinalUTXO;
        ordinalUTXO = null;
        localStorage.removeItem('ordinalUTXO_LTC');

        const amountInput = document.getElementById('selfcustody-amount-LTC');
        if (amountInput) {
            amountInput.value = '0';
            amountInput.disabled = false;
        }

        // Remove from selectedUTXO if present
        selectedUTXO = selectedUTXO.filter(utxo => utxo.txid !== prevOrdinalUTXO.txid || utxo.vout !== prevOrdinalUTXO.vout);
        localStorage.setItem('selectedUTXOs_LTC', JSON.stringify(selectedUTXO));

        displayUTXOs(); // Refresh the UTXO display
        updateSelectedUTXOsDisplay(); // Update the selected UTXOs display
    }
}

function selectAsFee() {
    if (rightClickedElement) {
        const utxos = JSON.parse(localStorage.getItem('utxos_LTC')) || [];
        const elementId = rightClickedElement.id;
        const [_, txid, vout] = elementId.split('-');

        let utxo = utxos.find(utxo => utxo.txid === txid && utxo.vout === parseInt(vout));

        if (!utxo) {
            console.error('Fee UTXO not found or UTXO data is missing');
            return;
        }

        if (feeUTXO && feeUTXO.txid === utxo.txid && feeUTXO.vout === parseInt(vout)) {
            deselectFeeUTXO();
        } else {
            if (feeUTXO) deselectFeeUTXO();

            // Remove default selected UTXO if it's in selectedUTXO
            if (defaultSelectedUTXO) {
                selectedUTXO = selectedUTXO.filter(utxo => utxo.txid !== defaultSelectedUTXO.txid || utxo.vout !== defaultSelectedUTXO.vout);
                defaultSelectedUTXO = null;
            }

            feeUTXO = utxo;
            localStorage.setItem('feeUTXO_LTC', JSON.stringify(feeUTXO));

            // Remove the fee UTXO from selectedUTXO if it's there
            selectedUTXO = selectedUTXO.filter(u => u.txid !== feeUTXO.txid || u.vout !== feeUTXO.vout);
            localStorage.setItem('selectedUTXOs_LTC', JSON.stringify(selectedUTXO));
        }

        displayUTXOs(); // Refresh the UTXO display with updated data
        updateSelectedUTXOsDisplay(); // Update the selected UTXOs display
    }
}

function deselectFeeUTXO() {
    if (feeUTXO) {
        const prevFeeUTXO = feeUTXO;
        feeUTXO = null;
        localStorage.removeItem('feeUTXO_LTC');

        // Remove from selectedUTXO if present
        selectedUTXO = selectedUTXO.filter(utxo => utxo.txid !== prevFeeUTXO.txid || utxo.vout !== prevFeeUTXO.vout);
        localStorage.setItem('selectedUTXOs_LTC', JSON.stringify(selectedUTXO));

        displayUTXOs(); // Refresh the UTXO display
        updateSelectedUTXOsDisplay(); // Update the selected UTXOs display
    }
}

// Function to update the selected UTXOs display
function updateSelectedUTXOsDisplay() {
    const selectedUtxosContainer = document.getElementById('selected-utxos');
    if (selectedUtxosContainer) {
        selectedUtxosContainer.innerHTML = '';

        // Collect all selected UTXOs
        let selectedUTXOsToDisplay = [];

        // Ordinal UTXO
        if (ordinalUTXO) {
            selectedUTXOsToDisplay.push({ utxo: ordinalUTXO, type: 'ordinal' });
        }

        // Fee UTXO
        if (feeUTXO) {
            selectedUTXOsToDisplay.push({ utxo: feeUTXO, type: 'fee' });
        }

        // Spending From UTXOs
        selectedUTXO.forEach(utxo => {
            if ((!ordinalUTXO || (utxo.txid !== ordinalUTXO.txid || utxo.vout !== ordinalUTXO.vout)) &&
                (!feeUTXO || (utxo.txid !== feeUTXO.txid || utxo.vout !== feeUTXO.vout))) {
                selectedUTXOsToDisplay.push({ utxo: utxo, type: 'spending' });
            }
        });

        // Display each selected UTXO
        selectedUTXOsToDisplay.forEach(item => {
            const utxo = item.utxo;
            const type = item.type;

            const utxoElement = document.createElement('div');
            utxoElement.textContent = `UTXO ${getUTXOIndex(utxo) + 1}`;

            // Apply CSS classes for styling
            utxoElement.classList.add('selected-utxo-item');
            if (type === 'spending') {
                utxoElement.classList.add('spending-utxo');
            } else if (type === 'ordinal') {
                utxoElement.classList.add('ordinal-utxo');
            } else if (type === 'fee') {
                utxoElement.classList.add('fee-utxo');
            }

            selectedUtxosContainer.appendChild(utxoElement);
        });
    }
}

function getUTXOIndex(utxo) {
    const utxos = JSON.parse(localStorage.getItem('utxos_LTC')) || [];
    return utxos.findIndex(u => u.txid === utxo.txid && u.vout === utxo.vout);
}

document.addEventListener('DOMContentLoaded', function () {
    const utxoContainer = document.getElementById('unspentTx-LTC');

    if (utxoContainer) {
        utxoContainer.addEventListener('contextmenu', function (e) {
            e.preventDefault();

            const target = e.target.closest('.utxo-item');
            if (target) {
                rightClickedElement = target;

                const menu = document.getElementById('context-menu');
                const spendFromOption = document.getElementById('context-spend-from');
                const sendOrdinalOption = document.getElementById('context-send-ordinal');
                const spendFeeOption = document.getElementById('context-spend-fee');

                if (menu && spendFromOption && sendOrdinalOption && spendFeeOption) {
                    spendFromOption.style.display = 'block';
                    sendOrdinalOption.style.display = 'block';
                    spendFeeOption.style.display = 'block';

                    const utxoId = target.id;
                    const [_, txid, vout] = utxoId.split('-');

                    const utxos = JSON.parse(localStorage.getItem('utxos_LTC')) || [];
                    const utxo = utxos.find(u => u.txid === txid && u.vout === parseInt(vout));

                    const isSelected = selectedUTXO.some(utxo => utxo.txid === txid && utxo.vout === parseInt(vout));
                    const isOrdinal = ordinalUTXO && ordinalUTXO.txid === txid && ordinalUTXO.vout === parseInt(vout);
                    const isFee = feeUTXO && feeUTXO.txid === txid && feeUTXO.vout === parseInt(vout);

                    if (isSelected) {
                        spendFromOption.style.display = 'none';
                    }
                    if (isOrdinal) {
                        sendOrdinalOption.style.display = 'none';
                    }
                    if (isFee) {
                        spendFromOption.style.display = 'none';
                        sendOrdinalOption.style.display = 'none';
                        spendFeeOption.style.display = 'none';
                    }
                    if (utxo.isOrdinal) {
                        // If the UTXO is an ordinal, it cannot be selected as fee
                        spendFeeOption.style.display = 'none';
                    }

                    const menuWidth = menu.offsetWidth;
                    const menuHeight = menu.offsetHeight;
                    const documentWidth = document.documentElement.scrollWidth;
                    const documentHeight = document.documentElement.scrollHeight;

                    let clickX = e.pageX;
                    let clickY = e.pageY;

                    if (clickX + menuWidth > documentWidth) {
                        clickX = documentWidth - menuWidth - 10;
                    }
                    if (clickY + menuHeight > documentHeight) {
                        clickY = documentHeight - menuHeight - 10;
                    }

                    if (clickX < 10) clickX = 10;
                    if (clickY < 10) clickY = 10;

                    menu.style.left = `${clickX}px`;
                    menu.style.top = `${clickY}px`;

                    menu.style.display = 'block';
                }
            }
        });

        document.addEventListener('click', function () {
            const menu = document.getElementById('context-menu');
            if (menu) {
                menu.style.display = 'none';
            }
        });
    }
});

function selectAsSpendingFrom() {
    if (rightClickedElement) {
        const utxoId = rightClickedElement.id;
        const [_, txid, vout] = utxoId.split('-');
        const utxos = JSON.parse(localStorage.getItem('utxos_LTC')) || [];

        const index = utxos.findIndex(utxo => utxo.txid === txid && utxo.vout === parseInt(vout));

        if (ordinalUTXO) {
            deselectOrdinalUTXO();
        }

        selectUTXO(index, utxoId);
    }
}

function sendAsOrdinal() {
    selectAsOrdinal();
}

function sendMaxUTXOLTC(utxo, toAddress) {
    const fromAddress = localStorage.getItem('address_LTC');
    const feeRate = parseFloat(document.getElementById('selfcustody-feeRate-LTC').value.trim()).toFixed(8);

    const estimatedFee = parseFloat(estimateFee(1, 1, feeRate));
    const maxSpendable = parseFloat(utxo.amount) - estimatedFee;

    if (maxSpendable <= 0) {
        alert('Insufficient UTXO amount to cover fees.');
        return;
    }

    const transactionData = createRawTransactionLTC(fromAddress, toAddress, maxSpendable, feeRate, [utxo]);
    const serializedTransaction = serializeTransaction(transactionData.rawTx);

    const rawTransactionElement = document.getElementById('raw-transaction-hex-LTC');
    if (rawTransactionElement) {
        rawTransactionElement.textContent = serializedTransaction;
        document.getElementById('raw-transaction-section-LTC').style.display = 'block';
        localStorage.setItem('rawTxHex_LTC', serializedTransaction);
    }
}

// Utility functions for adding/removing badges (no changes needed here)
function addSpendingBadge(element) {
    if (element) {
        const badge = document.createElement('div');
        badge.className = 'spending-badge';
        badge.textContent = 'Spending From';
        element.appendChild(badge);
    }
}

function removeSpendingBadge(element) {
    if (element) {
        const badge = element.querySelector('.spending-badge');
        if (badge) {
            element.removeChild(badge);
        }
    }
}

function addOrdinalBadge(element) {
    if (element) {
        const badge = document.createElement('div');
        badge.className = 'ordinal-badge';
        badge.textContent = 'Send Ordinal';
        element.appendChild(badge);
    }
}

function removeOrdinalBadge(element) {
    if (element) {
        const badge = element.querySelector('.ordinal-badge');
        if (badge) {
            element.removeChild(badge);
        }
    }
}

function addFeeBadge(element) {
    if (element) {
        const badge = document.createElement('div');
        badge.className = 'fee-badge';
        badge.textContent = 'Spend Fee';
        element.appendChild(badge);
    }
}

function removeFeeBadge(element) {
    if (element) {
        const badge = element.querySelector('.fee-badge');
        if (badge) {
            element.removeChild(badge);
        }
    }
}
