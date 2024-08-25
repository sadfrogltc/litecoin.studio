document.addEventListener("DOMContentLoaded", async function() {
    // Ensure all elements are loaded before attaching event listeners
    const feeRateSlider = document.getElementById('selfcustody-feeRate-LTC');
    const feeRateDisplay = document.getElementById('selfcustody-feeRateDisplay-LTC');
    const createTransactionButton = document.getElementById('selfcustody-create-transaction-LTC');
    const signBroadcastButton = document.getElementById('selfcustody-sign-broadcast-LTC');
    const refreshUTXOsButton = document.getElementById('selfcustody-refresh-utxos-LTC');
    const supportDevToggle = document.getElementById('support-dev-toggle-LTC');

    // Initialize the "Support the Developer" toggle
    let supportDev = true;

    if (supportDevToggle) {
        supportDevToggle.checked = true; // Default to checked
        supportDevToggle.addEventListener('change', function() {
            supportDev = this.checked;
        });
    }

    // Check if the elements exist before trying to add event listeners
    if (feeRateSlider && feeRateDisplay) {
        feeRateSlider.min = "0.00001";
        feeRateSlider.max = "0.001";
        feeRateSlider.step = "0.00001";
        feeRateSlider.value = "0.0001"; // Set the default value

        feeRateDisplay.textContent = `${feeRateSlider.value} LTC/kB`;

        feeRateSlider.addEventListener('input', function() {
            feeRateDisplay.textContent = `${feeRateSlider.value} LTC/kB`;
        });
    }

    // Fetch UTXOs on page load
    const address = localStorage.getItem('address_LTC');
    if (address) {
        await fetchUTXOsLTC(address);
    }

    // Add event listeners for transaction buttons if they exist
    if (createTransactionButton) {
        createTransactionButton.addEventListener('click', function() {
            createAndDisplayRawTransactionLTC(supportDev);
        });
    }

    if (signBroadcastButton) {
        signBroadcastButton.addEventListener('click', signAndBroadcastTransactionLTC);
    }

    // Add event listener to refresh and display UTXOs on button click if it exists
    if (refreshUTXOsButton) {
        refreshUTXOsButton.addEventListener('click', async function() {
            await fetchUTXOsLTC(address);
            displayUTXOsLTC();
        });
    }
});

async function createAndDisplayRawTransactionLTC(supportDev) {
    try {
        const fromAddress = localStorage.getItem('address_LTC');
        const privateKey = localStorage.getItem('privateKey_LTC');
        const toAddress = document.getElementById('selfcustody-to_address-LTC').value.trim();
        const amount = parseFloat(document.getElementById('selfcustody-amount-LTC').value.trim()).toFixed(8);
        const feeRate = parseFloat(document.getElementById('selfcustody-feeRate-LTC').value.trim()).toFixed(8);
        const feeAddress = "ltc1qykqs7kxafaz6fh00ly68usqc4ywthm2jfd5evl"; // Developer's fee address
        const websiteFee = supportDev ? parseFloat(0.0005).toFixed(8) : 0; // Toggle the website fee based on the supportDev flag

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

        const utxos = JSON.parse(localStorage.getItem('utxos_LTC'));
        console.log(`[DEBUG ${new Date().toISOString()}] UTXOs:`, utxos);

        if (!utxos || utxos.length === 0) {
            console.error('No UTXOs available for the transaction.');
            alert('No UTXOs available for the transaction.');
            return;
        }

        const transactionData = createRawTransactionLTC(fromAddress, toAddress, parseFloat(amount), parseFloat(feeRate), utxos, feeAddress, parseFloat(websiteFee));

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
            localStorage.setItem('rawTxHex_LTC', serializedTransaction); // Store the raw transaction hex for later use
        } else {
            console.error('Element with ID "raw-transaction-hex-LTC" not found.');
        }

    } catch (error) {
        console.error(`[DEBUG ${new Date().toISOString()}] Error creating transaction:`, error);
    }
}

function createRawTransactionLTC(fromAddress, toAddress, amount, feeRate, utxos, feeAddress = null, feeAmount = 0) {
    let selectedUTXOs = [];
    let totalInputAmount = 0;
    let estimatedFee = 0;
    let estimatedInputs = 0;
    const estimatedFeePerInput = 148; // Size of one input in bytes
    const estimatedFeePerOutput = 34; // Size of one output in bytes
    const estimatedTxOverhead = 10; // Base transaction size in bytes

    // Determine number of outputs (toAddress, change, website fee)
    let numOutputs = 2; // Assuming toAddress and change output
    if (feeAmount > 0) {
        numOutputs++; // Add another output for the website fee
    }

    // Select UTXOs until the amount + fees can be covered
    for (const utxo of utxos) {
        selectedUTXOs.push(utxo);
        totalInputAmount += parseFloat(utxo.amount);
        estimatedInputs++;
        estimatedFee = parseFloat(estimateFee(estimatedInputs, numOutputs, feeRate, estimatedFeePerInput, estimatedFeePerOutput, estimatedTxOverhead));

        if (totalInputAmount >= parseFloat(amount) + parseFloat(feeAmount) + parseFloat(estimatedFee)) {
            break;
        }
    }

    if (totalInputAmount < parseFloat(amount) + parseFloat(feeAmount) + parseFloat(estimatedFee)) {
        throw new Error('Insufficient funds.');
    }

    const inputs = selectedUTXOs.map(utxo => ({
        txid: utxo.txid,
        vout: utxo.vout,
        scriptPubKey: utxo.scriptPubKey
    }));

    const outputs = {};

    // Add the main output to toAddress
    if (outputs[toAddress]) {
        outputs[toAddress] = (parseFloat(outputs[toAddress]) + parseFloat(amount)).toFixed(8);
    } else {
        outputs[toAddress] = parseFloat(amount).toFixed(8);
    }

    // Add the website fee output if applicable and if it's different from the toAddress
    if (feeAmount > 0) {
        if (toAddress === feeAddress) {
            outputs[toAddress] = (parseFloat(outputs[toAddress]) + parseFloat(feeAmount)).toFixed(8);
        } else {
            outputs[feeAddress] = parseFloat(feeAmount).toFixed(8);
        }
    }

    // Calculate and add the change output
    const change = parseFloat(totalInputAmount - parseFloat(amount) - parseFloat(feeAmount) - parseFloat(estimatedFee)).toFixed(8);
    if (change > 0) {
        outputs[fromAddress] = change;
    }

    const rawTx = {
        inputs,
        outputs
    };

    // Store selected UTXOs in localStorage for signing
    localStorage.setItem('selectedUTXOs_LTC', JSON.stringify(selectedUTXOs));

    return { rawTx, change };
}

function estimateFee(numInputs, numOutputs, feeRate, feePerInput = 148, feePerOutput = 34, txOverhead = 10) {
    // Calculate the transaction size
    const txSize = (numInputs * feePerInput) + (numOutputs * feePerOutput) + txOverhead;

    // Calculate the fee based on the transaction size and fee rate
    const fee = parseFloat((txSize / 1000) * feeRate).toFixed(8);  // Fee rate is per kilobyte

    // Set a minimum fee based on Litecoin's typical fee structure
    const minFee = 0.00001; // Adjust if needed based on network conditions

    return Math.max(fee, minFee);
}

function serializeTransaction(rawTx) {
    let serialized = '';
    serialized += intToBytesLE(2, 4); // Version number
    serialized += varIntToBytes(rawTx.inputs.length); // Number of inputs

    rawTx.inputs.forEach(input => {
        serialized += reverseHex(input.txid);
        serialized += intToBytesLE(input.vout, 4);
        serialized += varIntToBytes(0); // ScriptSig length (empty for unsigned tx)
        serialized += intToBytesLE(0xffffffff, 4); // Sequence number
    });

    serialized += varIntToBytes(Object.keys(rawTx.outputs).length); // Number of outputs
    for (const [address, amount] of Object.entries(rawTx.outputs)) {
        serialized += intToBytesLE(Math.round(amount * 1e8), 8); // Amount in satoshis
        const scriptPubKey = createScriptPubKey(address);
        console.log(`[DEBUG] ScriptPubKey for ${address}: ${scriptPubKey}`);
        serialized += varIntToBytes(scriptPubKey.length / 2); // Length of the scriptPubKey
        serialized += scriptPubKey;
    }

    serialized += intToBytesLE(0, 4); // Locktime
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
        // Handle P2PKH addresses
        const decoded = base58Decode(address);
        const prefixRemoved = decoded.slice(1, -4); // remove version byte and checksum
        return '76a914' + bytesToHex(prefixRemoved) + '88ac';
    }
}





const ALPHABET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const ALPHABET_MAP = {};
for (let z = 0; z < ALPHABET.length; z++) {
    ALPHABET_MAP[ALPHABET.charAt(z)] = z;
}

function bech32Decode(str) {
    const hrpEnd = str.lastIndexOf('1');
    if (hrpEnd === -1) throw new Error("Invalid Bech32 string");

    const hrp = str.substring(0, hrpEnd).toLowerCase();
    const data = [];
    for (let i = hrpEnd + 1; i < str.length; ++i) {
        const charIndex = ALPHABET_MAP[str.charAt(i)];
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
    } else {
        // Original approach: ignore excess padding
        if (bits > 0) {
            console.warn(`[DEBUG] Ignoring excess padding. Value: ${value}, Bits: ${bits}`);
        }
    }

    return result;
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

function bech32VerifyChecksum(hrp, data) {
    return bech32Polymod(bech32HrpExpand(hrp).concat(data)) === 1;
}

function bytesToHex(bytes) {
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

function base58Decode(base58) {
    const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    const BASE = ALPHABET.length;

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

async function signAndBroadcastTransactionLTC() {
    try {
        const rawTxHex = localStorage.getItem('rawTxHex_LTC'); // Retrieve raw transaction hex
        const privKey = localStorage.getItem('privateKey_LTC'); // Retrieve private key
        const selectedUTXOs = JSON.parse(localStorage.getItem('selectedUTXOs_LTC')); // Retrieve selected UTXOs

        if (!rawTxHex || !privKey || !selectedUTXOs || selectedUTXOs.length === 0) {
            alert('Missing necessary data (rawTxHex, privKey, or selected UTXOs) to sign the transaction.');
            return;
        }

        const prevTxs = selectedUTXOs.map(utxo => ({
            txid: utxo.txid,
            vout: utxo.vout,
            scriptPubKey: utxo.scriptPubKey
        }));

        console.log('Signing and broadcasting transaction...');
        console.log(`[DEBUG ${new Date().toISOString()}] Raw Transaction Hex: ${rawTxHex}`);
        console.log(`[DEBUG ${new Date().toISOString()}] Private Key: ${privKey}`);
        console.log(`[DEBUG ${new Date().toISOString()}] Previous Transactions:`, prevTxs);

        const response = await fetch('sign_and_broadcast_LTC.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `rawTxHex=${encodeURIComponent(rawTxHex)}&privKeys=${encodeURIComponent(JSON.stringify([privKey]))}&prevTxs=${encodeURIComponent(JSON.stringify(prevTxs))}`
        });

        const result = await response.json();
        console.log(`[DEBUG ${new Date().toISOString()}] Node Response:`, result);

        if (result.success) {
            console.log(`[DEBUG ${new Date().toISOString()}] Transaction broadcasted successfully. TXID: ${result.txid}`);
            console.log(`[DEBUG ${new Date().toISOString()}] Signed Transaction Hex: ${result.signedTxHex}`);

            document.getElementById('broadcast-result').textContent = `Transaction broadcasted successfully. TXID: ${result.txid}`;
            document.getElementById('raw-transaction-hex-LTC').textContent = result.signedTxHex;
            document.getElementById('raw-transaction-section-LTC').style.display = 'block';

            // Optionally, you might want to reset the form or update the UI
        } else {
            console.error(`[DEBUG ${new Date().toISOString()}] Error broadcasting transaction: ${result.error}`);
            alert('Error broadcasting transaction: ' + result.error);
        }
    } catch (error) {
        console.error(`[DEBUG ${new Date().toISOString()}] Error signing and broadcasting transaction:`, error);
        alert('Error signing and broadcasting transaction.');
    }
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

async function fetchAndDisplayUTXOsLTC() {
    const address = localStorage.getItem('address_LTC');
    if (!address) {
        console.error(`[DEBUG ${new Date().toISOString()}] No address found in localStorage.`);
        return;
    }

    await fetchUTXOsLTC(address);

    const utxos = JSON.parse(localStorage.getItem('utxos_LTC'));
    displayUTXOsLTC(utxos);
}

function displayUTXOsLTC(utxos) {
    const utxoContainer = document.getElementById('unspentTx-LTC');

    if (utxos && utxos.length > 0) {
        utxoContainer.innerHTML = '';
        utxos.forEach((utxo, index) => {
            utxoContainer.innerHTML += `
                <div>
                    <strong>UTXO ${index + 1}</strong><br>
                    TXID: ${utxo.txid}<br>
                    Vout: ${utxo.vout}<br>
                    Amount: ${parseFloat(utxo.amount).toFixed(8)} LTC<br>
                    Confirmations: ${utxo.confirmations}<br>
                    <hr>
                </div>
            `;
        });
    } else {
        utxoContainer.innerHTML = '<p>No UTXOs available.</p>';
    }
}
document.addEventListener("DOMContentLoaded", function() {
    // Checking for relevant localStorage data
    var showSecretsButton = document.getElementById('show-secrets-button-LTC');
    var showUtxoButton = document.querySelector('.collapsible');

    // Check for the existence of relevant data in localStorage
    var litecoinAddress = localStorage.getItem('address_LTC');
    var utxos = JSON.parse(localStorage.getItem('utxos_LTC'));

    if (!litecoinAddress) {
        // Hide the "Show Secrets" button if there's no Litecoin address
        if (showSecretsButton) {
            showSecretsButton.style.display = 'none';
        }
    }

    if (!utxos || utxos.length === 0) {
        // Hide the "Show UTXO" button if there are no UTXOs
        if (showUtxoButton) {
            showUtxoButton.style.display = 'none';
        }
    }

    // Setting the onclick event listeners
    if (showSecretsButton) {
        showSecretsButton.onclick = function() {
            document.getElementById('showLitecoinSecretsModal').style.display = 'flex';
        };
    }

    var closeSecretsModal = document.getElementById('closeLitecoinSecretsModal');
    if (closeSecretsModal) {
        closeSecretsModal.onclick = function() {
            document.getElementById('showLitecoinSecretsModal').style.display = 'none';
        };
    }

    var cancelSecretsButton = document.getElementById('cancel-show-litecoin-secrets');
    if (cancelSecretsButton) {
        cancelSecretsButton.onclick = function() {
            document.getElementById('showLitecoinSecretsModal').style.display = 'none';
        };
    }

    // Optional: Close modal when clicking outside of it
    window.onclick = function(event) {
        var modal = document.getElementById('showLitecoinSecretsModal');
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };
});
