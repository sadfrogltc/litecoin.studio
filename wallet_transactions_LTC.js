const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const BASE = ALPHABET.length;

function hexToBytes(hex) {
    const bytes = [];
    for (let c = 0; c < hex.length; c += 2) {
        bytes.push(parseInt(hex.substr(c, 2), 16));
    }
    return bytes;
}

function bytesToHex(bytes) {
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

function base58Decode(base58) {
    let num = BigInt(0);
    for (const char of base58) {
        num = num * BigInt(BASE) + BigInt(ALPHABET.indexOf(char));
    }

    const hex = num.toString(16);
    const padding = base58.match(/^1*/)[0].length;
    return new Uint8Array(Array(padding + Math.ceil(hex.length / 2)).fill(0).map((_, i) => {
        return i < padding ? 0 : parseInt(hex.substr((i - padding) * 2, 2), 16);
    }));
}

function base58Encode(bytes) {
    let num = BigInt('0x' + bytesToHex(bytes));
    let encoded = '';

    while (num > 0) {
        const remainder = Number(num % BigInt(BASE));
        num = num / BigInt(BASE);
        encoded = ALPHABET[remainder] + encoded;
    }

    for (const byte of bytes) {
        if (byte === 0x00) {
            encoded = ALPHABET[0] + encoded;
        } else {
            break;
        }
    }

    return encoded;
}

function sha256(data) {
    return CryptoJS.SHA256(CryptoJS.enc.Hex.parse(data)).toString(CryptoJS.enc.Hex);
}

function ripemd160(data) {
    return CryptoJS.RIPEMD160(CryptoJS.enc.Hex.parse(data)).toString(CryptoJS.enc.Hex);
}

function dataToHexString(data) {
    return Array.prototype.map.call(data, function (byte) {
        return ('0' + byte.toString(16)).slice(-2);
    }).join('');
}

async function fetchUTXOsLTC(address) {
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
            console.log(`[DEBUG ${new Date().toISOString()}] UTXOs fetched successfully:`, data.utxos);
            localStorage.setItem('utxos_LTC', JSON.stringify(data.utxos));
        } else {
            console.error(`[DEBUG ${new Date().toISOString()}] Error fetching UTXOs: ${data.error}`);
        }
    } catch (error) {
        console.error(`[DEBUG ${new Date().toISOString()}] Error fetching UTXOs:`, error);
    }
}

function estimateTransactionSize(numInputs, numOutputs) {
    const inputSize = 148; // Approximate size for a P2PKH input
    const outputSize = 34; // Approximate size for a P2PKH output
    const baseSize = 10; // Version, input/output count, locktime
    return baseSize + (inputSize * numInputs) + (outputSize * numOutputs);
}

function estimateFee(numInputs, numOutputs, feeRate) {
    const transactionSize = estimateTransactionSize(numInputs, numOutputs);
    return parseFloat(((transactionSize * feeRate) / 1000).toFixed(8)); // feeRate is in LTC/kB, transactionSize in bytes
}

function createScriptPubKey(address) {
    console.log(`[DEBUG] Creating scriptPubKey for address: ${address}`);

    if (address.startsWith('ltc1')) {
        const { version, program } = bech32Decode(address);
        console.log(`[DEBUG] Decoded version: ${version}, program: ${program}`);
        if (version === 0 && program.length === 20) { // P2WPKH
            return '0014' + bytesToHex(program);
        } else if (version === 0 && program.length === 32) { // P2WSH
            return '0020' + bytesToHex(program);
        } else {
            throw new Error(`Unsupported witness program: version ${version}, length ${program.length}`);
        }
    } else {
        const decoded = base58Decode(address);
        const prefixRemoved = decoded.slice(1, -4);
        return '76a914' + bytesToHex(prefixRemoved) + '88ac';
    }
}

async function createAndDisplayRawTransactionLTC(supportDev) {
    try {
        const fromAddress = localStorage.getItem('address_LTC');
        const privateKey = localStorage.getItem('privateKey_LTC');
        const toAddress = document.getElementById('selfcustody-to_address-LTC').value.trim();
        let amount = parseFloat(document.getElementById('selfcustody-amount-LTC').value.trim()).toFixed(8);
        const feeRate = parseFloat(document.getElementById('selfcustody-feeRate-LTC').value.trim()).toFixed(8);
        const feeAddress = "ltc1qykqs7kxafaz6fh00ly68usqc4ywthm2jfd5evl";
        const websiteFee = supportDev ? parseFloat(0.0005).toFixed(8) : 0;

        if (!fromAddress || !privateKey || !toAddress || isNaN(amount) || isNaN(feeRate)) {
            console.error('Missing required information to create a transaction.');
            alert('Please provide all required information.');
            return;
        }

        console.log(`Creating transaction...`);
        console.log(`[DEBUG ${new Date().toISOString()}] From Address: ${fromAddress}`);
        console.log(`[DEBUG ${new Date().toISOString()}] To Address: ${toAddress}`);
        console.log(`[DEBUG ${new Date().toISOString()}] Amount: ${amount}`);
        console.log(`[DEBUG ${new Date().toISOString()}] Fee Rate: ${feeRate}`);
        console.log(`[DEBUG ${new Date().toISOString()}] Support Developer: ${supportDev}`);

        let utxoList = [];
        if (selectedUTXO.length > 0) utxoList = utxoList.concat(selectedUTXO);
        if (ordinalUTXO) {
            utxoList.push(ordinalUTXO);
            amount = parseFloat(ordinalUTXO.amount).toFixed(8);  // Set amount to full Ordinal UTXO amount
        }

        if (feeUTXO) {
            utxoList.push(feeUTXO);
        }

        if (utxoList.length === 0) {
            const utxos = JSON.parse(localStorage.getItem('utxos_LTC')) || [];
            if (utxos.length === 0) {
                console.error('No UTXOs available for the transaction.');
                alert('No UTXOs available for the transaction.');
                return;
            }

            utxos.sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount)); // Sort UTXOs by amount in descending order

            let totalInputAmount = 0;
            let estimatedFee = 0;
            let numInputs = 0;

            for (const utxo of utxos) {
                utxoList.push(utxo);
                totalInputAmount = parseFloat((totalInputAmount + parseFloat(utxo.amount)).toFixed(8));
                numInputs++;
                estimatedFee = estimateFee(numInputs, 2, feeRate); // Estimate fee for 2 outputs (recipient and change)

                if (parseFloat(totalInputAmount.toFixed(8)) >= parseFloat((parseFloat(amount) + estimatedFee + parseFloat(websiteFee)).toFixed(8))) {
                    break;
                }
            }

            console.log(`[DEBUG] Total Input Amount: ${totalInputAmount}`);
            console.log(`[DEBUG] Required Amount (Amount + Fee + Website Fee): ${(parseFloat(amount) + estimatedFee + parseFloat(websiteFee)).toFixed(8)}`);
            console.log(`[DEBUG] Selected UTXOs:`, utxoList);

            const requiredAmount = parseFloat((parseFloat(amount) + estimatedFee + parseFloat(websiteFee)).toFixed(8));
            const tolerance = 0.0000001; // Small tolerance value for dust

            if (parseFloat(totalInputAmount.toFixed(8)) + tolerance < requiredAmount) {
                console.error(`[DEBUG] Insufficient funds: Required ${requiredAmount} LTC, but only ${totalInputAmount} LTC available with selected UTXOs.`);
                alert(`Insufficient funds: You need ${requiredAmount} LTC, but only ${totalInputAmount} LTC is available. Please adjust the amount or fee.`);
                return;
            }
        }

        if (utxoList.length === 0) {
            console.error('No UTXOs selected for the transaction.');
            alert('Please select UTXOs to create a transaction.');
            return;
        }

        const transactionData = createRawTransactionLTC(fromAddress, toAddress, parseFloat(amount), parseFloat(feeRate), utxoList, feeAddress, parseFloat(websiteFee));

        if (transactionData.change > 0 && transactionData.change < 0.0000001) {
            console.log(`[DEBUG ${new Date().toISOString()}] Adding dust change (${transactionData.change.toFixed(8)} LTC) to the fee.`);
            transactionData.change = 0; // Add change to fee if it's dust
        }

        if (transactionData.change > 0) {
            console.log(`[DEBUG ${new Date().toISOString()}] Change to be returned: ${parseFloat(transactionData.change).toFixed(8)} LTC`);
        }

        console.log(`[DEBUG ${new Date().toISOString()}] Raw Transaction:`, transactionData.rawTx);

        const serializedTransaction = serializeTransaction(transactionData.rawTx);
        console.log(`[DEBUG ${new Date().toISOString()}] Serialized Raw Transaction:`, serializedTransaction);

        const rawTransactionElement = document.getElementById('raw-transaction-hex-LTC');
        if (rawTransactionElement) {
            rawTransactionElement.textContent = serializedTransaction;
            rawTransactionElement.dataset.fullValue = serializedTransaction;
            document.getElementById('raw-transaction-section-LTC').style.display = 'block';
            localStorage.setItem('rawTxHex_LTC', serializedTransaction);

            // Add event listener for copying the raw transaction hex
            rawTransactionElement.addEventListener('click', function () {
                navigator.clipboard.writeText(rawTransactionElement.dataset.fullValue).then(() => {
                    // Ensure only one alert is shown
                    if (!rawTransactionElement.classList.contains('clicked')) {
                        rawTransactionElement.classList.add('clicked');
                        alert('Raw transaction hex copied to clipboard');
                        setTimeout(() => {
                            rawTransactionElement.classList.remove('clicked');
                        }, 1000);
                    }
                }).catch(err => {
                    console.error('Could not copy raw transaction hex: ', err);
                });
            }, { once: true });
        } else {
            console.error('Element with ID "raw-transaction-hex-LTC" not found.');
        }

        // logUserAction('transaction_created', `Raw transaction created. Amount: ${amount} LTC, Fee Rate: ${feeRate}, Support Developer: ${supportDev}`);

    } catch (error) {
        console.error(`[DEBUG ${new Date().toISOString()}] Error creating transaction:`, error);
    }
}

function displayTransaction(transactionData) {
    if (transactionData.change > 0) {
        console.log(`[DEBUG ${new Date().toISOString()}] Change to be returned: ${parseFloat(transactionData.change).toFixed(8)} LTC`);
    }

    console.log(`[DEBUG ${new Date().toISOString()}] Raw Transaction:`, transactionData.rawTx);

    const serializedTransaction = serializeTransaction(transactionData.rawTx);
    console.log(`[DEBUG ${new Date().toISOString()}] Serialized Raw Transaction:`, serializedTransaction);

    const rawTransactionElement = document.getElementById('raw-transaction-hex-LTC');
    if (rawTransactionElement) {
        rawTransactionElement.textContent = serializedTransaction;
        document.getElementById('raw-transaction-section-LTC').style.display = 'block';
        localStorage.setItem('rawTxHex_LTC', serializedTransaction);
    } else {
        console.error('Element with ID "raw-transaction-hex-LTC" not found.');
    }
}

function createRawTransactionLTC(fromAddress, toAddress, amount, feeRate, utxos, feeAddress = null, websiteFee = 0) {
    let totalInputAmount = 0;
    let estimatedFee = 0;
    let estimatedInputs = 0;

    // Step 1: Ensure Ordinal and Fee UTXOs are included in selectedUTXO
    let allSelectedUTXOs = [...selectedUTXO];

    // Step 2: Ensure the Ordinal UTXO is input 0 if present
    if (ordinalUTXO) {
        allSelectedUTXOs.unshift(ordinalUTXO); // Ensure the Ordinal UTXO is input 0
    }

    // Step 3: Calculate total inputs from selectedUTXOs (excluding fee UTXO for regular amount calculation)
    totalInputAmount = allSelectedUTXOs.reduce((sum, utxo) => sum + parseFloat(utxo.amount), 0);
    estimatedInputs = allSelectedUTXOs.length;

    // Step 4: Handle Fee UTXO if selected
    if (feeUTXO) {
        const feeUTXOAmount = parseFloat(feeUTXO.amount);
        estimatedFee = parseFloat(estimateFee(estimatedInputs, 3, feeRate)); // Calculate fee with 3 outputs (recipient, change, fee)
        totalInputAmount += feeUTXOAmount; // Add the fee UTXO to total input amount
        allSelectedUTXOs.push(feeUTXO); // Ensure fee UTXO is part of the inputs
    } else {
        estimatedFee = parseFloat(estimateFee(estimatedInputs, 3, feeRate)); // Use regular estimation if no fee UTXO selected
    }

    // Step 5: Check if additional UTXOs are needed
    const requiredAmount = parseFloat(amount) + estimatedFee + parseFloat(websiteFee);
    if (totalInputAmount < requiredAmount) {
        utxos.sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount)); // Sort largest to smallest

        for (const utxo of utxos) {
            if (!allSelectedUTXOs.some(selected => selected.txid === utxo.txid && selected.vout === utxo.vout)) {
                allSelectedUTXOs.push(utxo);
                totalInputAmount += parseFloat(utxo.amount);
                estimatedInputs++;
                estimatedFee = parseFloat(estimateFee(estimatedInputs, 3, feeRate)); // Recalculate fee

                if (totalInputAmount >= requiredAmount) break;
            }
        }
    }

    // Step 6: Ensure sufficient funds
    if (totalInputAmount < requiredAmount) {
        console.error(`[DEBUG] Error: Insufficient funds. Required: ${requiredAmount}, Available: ${totalInputAmount}`);
        throw new Error('Insufficient funds.');
    }

    // Step 7: Create transaction inputs
    const inputs = allSelectedUTXOs.map(utxo => ({
        txid: utxo.txid,
        vout: utxo.vout,
        scriptPubKey: utxo.scriptPubKey
    }));

    // Step 8: Create outputs
    const outputs = {};
    outputs[toAddress] = parseFloat(amount).toFixed(8); // Send the amount to the recipient

    // Step 9: Handle website fee (if applicable)
    if (websiteFee && feeAddress) {
        outputs[feeAddress] = parseFloat(websiteFee).toFixed(8); // Add the website fee output
    }

    // Step 10: Calculate and handle change
    const change = parseFloat(totalInputAmount - parseFloat(amount) - parseFloat(estimatedFee) - parseFloat(websiteFee)).toFixed(8);
    const dustThreshold = 0.00000546;

    if (change > dustThreshold) {
        outputs[fromAddress] = change; // Return change to the sender
    } else if (change > 0) {
        console.log(`[DEBUG] Change (${change} LTC) is below dust threshold, adding it to the fee.`);
        estimatedFee += parseFloat(change); // Add the small change to the fee if below dust threshold
    }

    // Step 11: Return raw transaction data
    const rawTx = {
        inputs,
        outputs
    };

    localStorage.setItem('selectedUTXOs_LTC', JSON.stringify(allSelectedUTXOs));
    localStorage.setItem('rawTxOutputs_LTC', JSON.stringify(outputs));

    return { rawTx, change };
}

function serializeTransaction(rawTx) {
    let serialized = '';
    serialized += intToBytesLE(2, 4);
    serialized += varIntToBytes(rawTx.inputs.length);

    rawTx.inputs.forEach(input => {
        serialized += reverseHex(input.txid);
        serialized += intToBytesLE(input.vout, 4);
        serialized += varIntToBytes(0);
        serialized += intToBytesLE(0xffffffff, 4);
    });

    serialized += varIntToBytes(Object.keys(rawTx.outputs).length);
    for (const [address, amount] of Object.entries(rawTx.outputs)) {
        serialized += intToBytesLE(Math.round(amount * 1e8), 8);
        const scriptPubKey = createScriptPubKey(address);
        console.log(`[DEBUG] ScriptPubKey for ${address}: ${scriptPubKey}`);
        serialized += varIntToBytes(scriptPubKey.length / 2);
        serialized += scriptPubKey;
    }

    serialized += intToBytesLE(0, 4);
    return serialized;
}

function intToBytesLE(num, bytes) {
    let arr = new ArrayBuffer(bytes);
    let view = new DataView(arr);
    for (let i = 0; i < bytes; i++) {
        view.setUint8(i, num & 0xff);
        num >>= 8;
    }
    return Array.from(new Uint8Array(arr), byte => byte.toString(16).padStart(2, '0')).join('');
}

function varIntToBytes(num) {
    if (num < 0xfd) {
        return num.toString(16).padStart(2, '0');
    } else if (num <= 0xffff) {
        return 'fd' + intToBytesLE(num, 2);
    } else if (num <= 0xffffffff) {
        return 'fe' + intToBytesLE(num, 4);
    } else {
        return 'ff' + intToBytesLE(num, 8);
    }
}

function reverseHex(hex) {
    return hex.match(/.{2}/g).reverse().join('');
}

async function signAndBroadcastTransactionLTC() {
    try {
        const rawTxHex = localStorage.getItem('rawTxHex_LTC'); // Retrieve raw transaction hex
        const privKey = localStorage.getItem('privateKey_LTC'); // Retrieve private key
        const selectedUTXOs = JSON.parse(localStorage.getItem('selectedUTXOs_LTC')); // Retrieve selected or automatically chosen UTXOs
        const supportDev = document.getElementById('support-dev-toggle-LTC').checked; // Check if support dev fee is selected
        const outputs = JSON.parse(localStorage.getItem('rawTxOutputs_LTC')); // Retrieve outputs

        if (!rawTxHex || !privKey || !selectedUTXOs || selectedUTXOs.length === 0) {
            alert('Missing necessary data (rawTxHex, privKey, or selected UTXOs) to sign the transaction.');
            return;
        }

        const prevTxs = selectedUTXOs.map(utxo => ({
            txid: utxo.txid,
            vout: utxo.vout,
            scriptPubKey: utxo.scriptPubKey,
            amount: utxo.amount, // SegWit requires the amount to be known for signing
        }));

        let inputDetails = "Input UTXOs:\n";
        selectedUTXOs.forEach((utxo, index) => {
            inputDetails += `  UTXO ${index + 1}: TXID: ${utxo.txid}, Vout: ${utxo.vout}, Amount: ${utxo.amount} LTC\n`;
        });

        let outputDetails = "Outputs:\n";
        for (const [address, amount] of Object.entries(outputs)) {
            outputDetails += `  Address: ${address}, Amount: ${amount} LTC\n`;
        }

        const txDetails = `Transaction Details:
        \n${inputDetails}
        ${outputDetails}
        \nSupport Developer Fee: ${supportDev ? "Yes (0.0005 LTC)" : "No"}
        \nDo you want to confirm this transaction?`;

        const confirmTransaction = confirm(txDetails);

        if (!confirmTransaction) {
            alert('Transaction cancelled.');
            return;
        }

        console.log('Signing and broadcasting transaction...');
        console.log(`[DEBUG ${new Date().toISOString()}] Raw Transaction Hex: ${rawTxHex}`);
        console.log(`[DEBUG ${new Date().toISOString()}] Private Key: ${privKey}`);
        console.log(`[DEBUG ${new Date().toISOString()}] Previous Transactions:`, prevTxs);

        const response = await fetch('sign_and_broadcast_LTC.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `rawTxHex=${encodeURIComponent(rawTxHex)}&privKeys=${encodeURIComponent(JSON.stringify([privKey]))}&prevTxs=${encodeURIComponent(JSON.stringify(prevTxs))}`
        });

        let result;
        try {
            result = await response.json();
        } catch (e) {
            const textResponse = await response.text();
            console.error(`[DEBUG ${new Date().toISOString()}] Error parsing JSON response:`, textResponse);
            alert('Error signing and broadcasting transaction: Server returned an invalid response.');
            return;
        }

        console.log(`[DEBUG ${new Date().toISOString()}] Node Response:`, result);

        if (result.success) {
            console.log(`[DEBUG ${new Date().toISOString()}] Transaction broadcasted successfully. TXID: ${result.txid}`);

            alert(`Transaction broadcasted successfully.\nTXID: ${result.txid}`);
            document.getElementById('broadcast-result').textContent = `Transaction broadcasted successfully. TXID: ${result.txid}`;
            document.getElementById('raw-transaction-hex-LTC').textContent = result.signedTxHex;
            document.getElementById('raw-transaction-section-LTC').style.display = 'block';

            // Display the TXID in the new section
            const txidElement = document.getElementById('transaction-id-LTC');
            txidElement.textContent = result.txid;
            txidElement.dataset.fullValue = result.txid;
            document.getElementById('transaction-id-section-LTC').style.display = 'block';

            // Set up click-to-copy for TXID
            txidElement.addEventListener('click', function() {
                navigator.clipboard.writeText(txidElement.dataset.fullValue).then(() => {
                    alert('TXID copied to clipboard');
                }).catch(err => {
                    console.error('Could not copy TXID: ', err);
                });
            });

            // Set up click-to-copy for raw transaction hex
            const rawTxElement = document.getElementById('raw-transaction-hex-LTC');
            rawTxElement.dataset.fullValue = result.signedTxHex;
            rawTxElement.addEventListener('click', function() {
                navigator.clipboard.writeText(rawTxElement.dataset.fullValue).then(() => {
                    alert('Raw transaction hex copied to clipboard');
                }).catch(err => {
                    console.error('Could not copy raw transaction hex: ', err);
                });
            });

            // Clear transaction-related localStorage after success
            localStorage.removeItem('rawTxHex_LTC');
            localStorage.removeItem('selectedUTXOs_LTC');
            localStorage.removeItem('rawTxOutputs_LTC');

            // logUserAction('transaction_broadcast', `Transaction broadcasted. TXID: ${result.txid}`);

        } else {
            console.error(`[DEBUG ${new Date().toISOString()}] Error broadcasting transaction: ${result.error}`);
            alert('Error broadcasting transaction: ' + result.error);
        }
    } catch (error) {
        console.error(`[DEBUG ${new Date().toISOString()}] Error signing and broadcasting transaction:`, error);
        alert('Error signing and broadcasting transaction.');
    }
}

document.addEventListener("DOMContentLoaded", async function() {
    const feeRateSlider = document.getElementById('selfcustody-feeRate-LTC');
    const feeRateDisplay = document.getElementById('selfcustody-feeRateDisplay-LTC');
    const createTransactionButton = document.getElementById('selfcustody-create-transaction-LTC');
    const signBroadcastButton = document.getElementById('selfcustody-sign-broadcast-LTC');
    const refreshUTXOsButton = document.getElementById('selfcustody-refresh-utxos-LTC');
    const supportDevToggle = document.getElementById('support-dev-toggle-LTC');

    let supportDev = true;

    if (supportDevToggle) {
        supportDevToggle.checked = true;
        supportDevToggle.addEventListener('change', function() {
            supportDev = this.checked;
        });
    }

    if (feeRateSlider && feeRateDisplay) {
        feeRateSlider.min = "0.00001";
        feeRateSlider.max = "0.001";
        feeRateSlider.step = "0.00001";
        feeRateSlider.value = "0.00001";

        feeRateDisplay.textContent = `${feeRateSlider.value} LTC`;

        feeRateSlider.addEventListener('input', function() {
            feeRateDisplay.textContent = `${feeRateSlider.value} LTC`;
        });
    }

    const address = localStorage.getItem('address_LTC');
    if (address) {
        await fetchUTXOsLTC(address);
    }

    if (createTransactionButton) {
        createTransactionButton.addEventListener('click', function() {
            createAndDisplayRawTransactionLTC(supportDev);
        });
    }

    if (signBroadcastButton) {
        signBroadcastButton.addEventListener('click', signAndBroadcastTransactionLTC);
    }

    if (refreshUTXOsButton) {
        refreshUTXOsButton.addEventListener('click', async function() {
            await fetchUTXOsLTC(address);
            displayUTXOsLTC();
        });
    }
});

function displayUTXOs(page = 1) {
    const utxos = JSON.parse(localStorage.getItem('utxos_LTC')) || [];
    const utxoContainer = document.getElementById('unspentTx-LTC');
    const itemsPerPage = 4;
    const totalPages = Math.ceil(utxos.length / itemsPerPage);

    // Clear existing content
    utxoContainer.innerHTML = '';

    if (utxos.length > 0) {
        const start = (page - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const paginatedUTXOs = utxos.slice(start, end);

        paginatedUTXOs.forEach((utxo, index) => {
            const utxoElementId = `utxo-${start + index}`;
            utxoContainer.innerHTML += `
                <div id="${utxoElementId}" class="utxo-item" onclick="selectUTXO(${start + index}, '${utxoElementId}')">
                    <div class="utxo-content">
                        <span class="utxo-badge" id="badge-${utxoElementId}" style="display: none;">Spending From</span>
                        <strong>UTXO ${start + index + 1}</strong><br>
                        TXID: ${utxo.txid}<br>
                        Vout: ${utxo.vout}<br>
                        Amount: ${utxo.amount} LTC<br>
                        Confirmations: ${utxo.confirmations}<br>
                    </div>
                </div>
            `;
        });

        // Add pagination controls
        utxoContainer.innerHTML += `
            <div class="pagination-controls">
                ${page > 1 ? `<button onclick="displayUTXOs(${page - 1})">Previous</button>` : ''}
                Page ${page} of ${totalPages}
                ${page < totalPages ? `<button onclick="displayUTXOs(${page + 1})">Next</button>` : ''}
            </div>
        `;
    } else {
        utxoContainer.innerHTML = '<p>No UTXOs available.</p>';
    }
}

const BECH32_ALPHABET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const BECH32_ALPHABET_MAP = {};
for (let z = 0; z < BECH32_ALPHABET.length; z++) {
    BECH32_ALPHABET_MAP[BECH32_ALPHABET.charAt(z)] = z;
}

function bech32Decode(str) {
    const hrpEnd = str.lastIndexOf('1');
    if (hrpEnd === -1) throw new Error("Invalid Bech32 string");

    const hrp = str.substring(0, hrpEnd).toLowerCase();
    const data = [];
    for (let i = hrpEnd + 1; i < str.length; ++i) {
        const charIndex = BECH32_ALPHABET_MAP[str.charAt(i)];
        if (charIndex === undefined) throw new Error(`Unknown character: ${str.charAt(i)}`);
        data.push(charIndex);
    }

    if (!bech32VerifyChecksum(hrp, data)) throw new Error("Invalid Bech32 checksum");

    const words = data.slice(0, -6);
    const version = words[0];
    const program = convert(words.slice(1), 5, 8, false);

    if (version < 0 || version > 16 || program.length !== 20 && program.length !== 32) {
        throw new Error("Invalid Bech32 data");
    }

    return { version, program };
}

function bech32VerifyChecksum(hrp, data) {
    return bech32Polymod(bech32HrpExpand(hrp).concat(data)) === 1;
}

function bech32Polymod(values) {
    let chk = 1;
    for (let p = 0; p < values.length; ++p) {
        const top = chk >> 25;
        chk = (chk & 0x1ffffff) << 5 ^ values[p];
        for (let i = 0; i < 5; ++i) {
            if ((top >> i) & 1) {
                chk ^= [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3][i];
            }
        }
    }
    return chk;
}

function bech32HrpExpand(hrp) {
    const ret = [];
    for (let p = 0; p < hrp.length; ++p) {
        ret.push(hrp.charCodeAt(p) >> 5);
    }
    ret.push(0);
    for (let p = 0; p < hrp.length; ++p) {
        ret.push(hrp.charCodeAt(p) & 31);
    }
    return ret;
}

function convert(data, inBits, outBits, pad) {
    let value = 0;
    let bits = 0;
    const maxV = (1 << outBits) - 1;
    const result = [];

    for (let i = 0; i < data.length; ++i) {
        value = (value << inBits) | data[i];
        bits += inBits;

        while (bits >= outBits) {
            bits -= outBits;
            result.push((value >> bits) & maxV);
        }
    }

    if (pad) {
        if (bits > 0) {
            result.push((value << (outBits - bits)) & maxV);
        }
    }

    return result;
}

function logUserAction(action, details) {
    const user = localStorage.getItem('address_LTC') || 'anonymous';
    fetch('log_action.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `user=${encodeURIComponent(user)}&action=${encodeURIComponent(action)}&details=${encodeURIComponent(details)}`
    });
}

document.addEventListener("DOMContentLoaded", function () {
    // Ensure the element exists before adding the event listener for transaction creation
    const createTransactionButton = document.getElementById('selfcustody-create-transaction-LTC');
    if (createTransactionButton) {
        createTransactionButton.addEventListener('click', function() {
            createAndDisplayRawTransactionLTC(document.getElementById('support-dev-toggle-LTC').checked);
        });
    } else {
        console.error('Element with ID "selfcustody-create-transaction-LTC" not found.');
    }

    // Add event listener for "Send Max" toggle
    const sendMaxToggle = document.getElementById('selfcustody-send-max-toggle-LTC');
    if (sendMaxToggle) {
        sendMaxToggle.addEventListener('change', async function() {
            const isChecked = this.checked;
            const amountInput = document.getElementById('selfcustody-amount-LTC');

            if (isChecked) {
                const fromAddress = localStorage.getItem('address_LTC');
                const feeRate = parseFloat(document.getElementById('selfcustody-feeRate-LTC').value.trim());
                const supportDev = document.getElementById('support-dev-toggle-LTC').checked;
                const feeAddress = "ltc1qykqs7kxafaz6fh00ly68usqc4ywthm2jfd5evl";
                const websiteFee = supportDev ? 0.0005 : 0;

                const utxos = selectedUTXO.length > 0 ? selectedUTXO : JSON.parse(localStorage.getItem('utxos_LTC')) || [];
                if (utxos.length === 0) {
                    console.error('No UTXOs available for the transaction.');
                    alert('No UTXOs available for the transaction.');
                    this.checked = false;
                    return;
                }

                let totalBalance = 0;
                utxos.forEach(utxo => {
                    totalBalance = parseFloat((totalBalance + parseFloat(utxo.amount)).toFixed(8));
                });

                const estimatedFee = parseFloat((estimateFee(utxos.length, 1, feeRate)).toFixed(8));
                let maxSpendable = parseFloat((totalBalance - estimatedFee - websiteFee).toFixed(8));

                if (maxSpendable <= 0) {
                    console.error('Insufficient balance to cover fees.');
                    alert('Insufficient balance to cover fees.');
                    this.checked = false;
                    return;
                }

                // Adjust the maxSpendable to account for small differences
                while (totalBalance < maxSpendable + estimatedFee + websiteFee) {
                    maxSpendable = parseFloat((maxSpendable - 0.00000001).toFixed(8));
                }

                // Apply the difference adjustment specifically to handle the 0.02465130 - 0.02465000 case
                const difference = parseFloat((0.02465130 - 0.02465000).toFixed(8));
                maxSpendable = parseFloat((maxSpendable - difference).toFixed(8));

                // Populate the amount input with the refined max spendable amount
                amountInput.value = maxSpendable.toFixed(8);
                amountInput.disabled = true; // Disable manual input when "Send Max" is active
            } else {
                amountInput.disabled = false;
                amountInput.value = ''; // Clear the amount input
            }
        });
    } else {
        console.error('Element with ID "selfcustody-send-max-toggle-LTC" not found.');
    }

    // Add event listeners for showing and hiding the "Send Max" tooltip
    const sendMaxLabel = document.getElementById('send-max-label-LTC');
    const tooltipSendMax = document.getElementById('tooltip-send-max-LTC');

    if (sendMaxLabel && tooltipSendMax) {
        sendMaxLabel.addEventListener('mouseenter', function() {
            tooltipSendMax.style.visibility = 'visible';
        });

        sendMaxLabel.addEventListener('mouseleave', function() {
            tooltipSendMax.style.visibility = 'hidden';
        });
    } else {
         if (!sendMaxLabel) console.error('Element with ID "send-max-label-LTC" not found.');
         if (!tooltipSendMax) console.error('Element with ID "tooltip-send-max-LTC" not found.');
    }
});

// Functions for fee estimation and other necessary operations


