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

function base58Encode(bytes) {
    const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    const BASE = ALPHABET.length;

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

// Convert a Uint8Array or ArrayBuffer to a hex string
function dataToHexString(data) {
    return Array.prototype.map.call(data, function (byte) {
        return ('0' + byte.toString(16)).slice(-2);
    }).join('');
}

// Generate a random 128-bit entropy for a 12-word mnemonic
function generateEntropy() {
    const entropy = new Uint8Array(16); // 128-bit entropy
    window.crypto.getRandomValues(entropy);
    return entropy;
}

// Convert entropy to mnemonic using the WORDLIST from word-list.js
function entropyToMnemonic(entropy) {
    const bits = Array.from(entropy).map(byte => byte.toString(2).padStart(8, '0')).join('');
    const checksum = sha256(bytesToHex(entropy)).slice(0, entropy.length / 4);
    const bitsWithChecksum = bits + checksum;
    const chunks = bitsWithChecksum.match(/.{1,11}/g);
    const words = chunks.map(chunk => WORDLIST[parseInt(chunk, 2)]);
    return words.join(' ');
}

// Derive a seed from the mnemonic
function mnemonicToSeedLTC(mnemonic, password = '') {
    const mnemonicBuffer = CryptoJS.enc.Utf8.parse(mnemonic);
    const saltBuffer = CryptoJS.enc.Utf8.parse('mnemonic' + password);
    const key = CryptoJS.PBKDF2(mnemonicBuffer, saltBuffer, {
        keySize: 512 / 32,
        iterations: 2048,
        hasher: CryptoJS.algo.SHA512
    });
    return CryptoJS.enc.Hex.stringify(key);
}

function bip32MasterKeyFromSeed(seed) {
    const I = CryptoJS.HmacSHA512(CryptoJS.enc.Hex.parse(seed), 'Bitcoin seed');
    const IL = I.toString(CryptoJS.enc.Hex).slice(0, 64);
    const IR = I.toString(CryptoJS.enc.Hex).slice(64);
    return {
        privateKey: IL,
        chainCode: IR
    };
}

function deriveKeyFromPath(masterKey, path) {
    const EC = elliptic.ec;
    const ec = new EC('secp256k1');

    let key = masterKey;
    const segments = path.split('/').slice(1).map(segment => {
        if (segment.endsWith("'")) {
            return parseInt(segment.slice(0, -1)) + 0x80000000;
        }
        return parseInt(segment);
    });

    for (let segment of segments) {
        const data = new Uint8Array(37);
        data.set([0]);
        data.set(hexToBytes(key.privateKey), 1);
        data.set(new Uint8Array(new Uint32Array([segment]).buffer).reverse(), 33);

        const I = CryptoJS.HmacSHA512(CryptoJS.enc.Hex.parse(dataToHexString(data)), CryptoJS.enc.Hex.parse(key.chainCode));
        const IL = I.toString(CryptoJS.enc.Hex).slice(0, 64);
        const IR = I.toString(CryptoJS.enc.Hex).slice(64);

        const childPrivateKey = ec.keyFromPrivate(IL).getPrivate().add(ec.keyFromPrivate(key.privateKey).getPrivate()).mod(ec.curve.n);
        key = {
            privateKey: childPrivateKey.toString('hex'),
            chainCode: IR
        };
    }

    return key;
}

document.addEventListener("DOMContentLoaded", async function () {
    const address = localStorage.getItem('address_LTC');
    const privateKey = localStorage.getItem('privateKey_LTC');
    const publicKey = localStorage.getItem('publicKey_LTC');
    const balance = localStorage.getItem('balance_LTC');

    const addressElement = document.getElementById('wallet-address-LTC');
    const balanceElement = document.getElementById('balance-LTC');
    const qrContainer = document.getElementById('selfCustodyQrCode-LTC');

    if (address && privateKey) {
        await initializeSelfCustodyLTC();
        document.getElementById('generate-keys-button-LTC').style.display = 'none';
        document.getElementById('restore-wallet-LTC').style.display = 'none';
        document.getElementById('wallet-info-LTC').style.display = 'block';
        document.getElementById('send-transaction-LTC').style.display = 'block';
        if (balance) {
            balanceElement.textContent = balance + ' LTC';
            balanceElement.style.display = 'block';
        }
        generateQrCodeLTC(address, qrContainer);
    }

    document.getElementById('restore-option-LTC').addEventListener('change', function () {
        const option = this.value;
        document.getElementById('restore-private-key-section-LTC').style.display = option === 'private-key' ? 'block' : 'none';
        document.getElementById('restore-mnemonic-section-LTC').style.display = option === 'mnemonic' ? 'block' : 'none';
    });

    document.getElementById('generate-keys-button-LTC').addEventListener('click', generateKeysLTC);
    document.getElementById('restore-wallet-button-LTC').addEventListener('click', restoreWalletLTC);

    // Hide sign out button if no relevant data in localStorage
    const signOutButton = document.getElementById('sign-out-ltc-btn');
    if (signOutButton) {
        const hasRelevantData = address || privateKey || publicKey || balance;
        if (hasRelevantData) {
            signOutButton.style.display = 'block';
        } else {
            signOutButton.style.display = 'none';
        }
        signOutButton.addEventListener('click', signOutLTC);
    }
});

async function initializeSelfCustodyLTC() {
    const address = localStorage.getItem('address_LTC');
    const publicKey = localStorage.getItem('publicKey_LTC');

    document.getElementById('wallet-address-LTC').textContent = address;
    await updateBalanceLTC(address);
}

async function updateBalanceLTC(address) {
    const balance = await getBalanceLTC(address);
    document.getElementById('balance-LTC').textContent = balance.toFixed(8) + ' LTC';
    document.getElementById('balance-LTC').style.display = 'block';
    localStorage.setItem('balance_LTC', balance.toFixed(8));
}

async function getBalanceLTC(address) {
    try {
        const response = await fetch(`get_balance_LTC.php?address=${encodeURIComponent(address)}`);
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }
        const data = await response.json();
        if (data.balance !== undefined) {
            return data.balance;
        } else {
            console.error('Error fetching balance:', data.error);
            return 0;
        }
    } catch (error) {
        console.error('Error fetching balance:', error);
        return 0;
    }
}

async function generateKeysLTC() {
    try {
        console.log("Generate Keys button clicked.");

        // Generate mnemonic
        const entropy = generateEntropy();
        const mnemonic = entropyToMnemonic(entropy);
        console.log("Generated Mnemonic:", mnemonic);

        // Derive key from mnemonic
        const seed = mnemonicToSeedLTC(mnemonic);
        const path = "m/44'/2'/0'/0/0";  // Standard path for Litecoin
        const masterKey = bip32MasterKeyFromSeed(seed);
        const derivedKey = deriveKeyFromPath(masterKey, path);

        const privateKeyHex = derivedKey.privateKey;

        const EC = elliptic.ec;
        const ec = new EC('secp256k1');
        const keyPair = ec.keyFromPrivate(privateKeyHex);
        const publicKey = keyPair.getPublic(true, 'hex');

        console.log("Private Key Hex:", privateKeyHex);
        console.log("Public Key:", publicKey);

        const publicKeyHash = ripemd160(sha256(publicKey));
        const addressWithPrefix = '30' + publicKeyHash;
        const checksum = sha256(sha256(addressWithPrefix)).slice(0, 8);
        const address = base58Encode(hexToBytes(addressWithPrefix + checksum));

        console.log("Generated Address:", address);

        const privateKeyWithPrefix = 'B0' + privateKeyHex + '01';
        const privateKeyChecksum = sha256(sha256(privateKeyWithPrefix)).slice(0, 8);
        const privateKeyWIF = base58Encode(hexToBytes(privateKeyWithPrefix + privateKeyChecksum));

        // Display the generated address
        document.getElementById('wallet-address-LTC').textContent = address;

        // Store the information in localStorage
        localStorage.setItem('address_LTC', address);
        localStorage.setItem('privateKey_LTC', privateKeyWIF);
        localStorage.setItem('publicKey_LTC', publicKey);
        localStorage.setItem('mnemonic_LTC', mnemonic);  // Store mnemonic in local storage

        console.log("Keys and mnemonic generated and stored in local storage.");

        await importPublicKeyLTC(publicKey);

        await updateBalanceLTC(address);
        location.reload();
    } catch (error) {
        console.error('Error generating keys:', error);
    }
}

async function importPublicKeyLTC(publicKey) {
    try {
        const response = await fetch('import_public_key_LTC.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `publicKey=${encodeURIComponent(publicKey)}`
        });

        const result = await response.json();
        if (result.success) {
            console.log("Public key imported successfully:", publicKey);
            console.log("Server message:", result.message);
        } else {
            console.error('Error importing public key:', result.error);
        }
    } catch (error) {
        console.error('Error importing public key:', error);
    }
}

async function restoreWalletLTC() {
    try {
        const restoreOption = document.getElementById('restore-option-LTC').value;
        let privateKeyWIF = '';
        let mnemonic = '';

        if (restoreOption === 'private-key') {
            privateKeyWIF = document.getElementById('restore-private-key-LTC').value.trim();
            if (privateKeyWIF) {
                console.log("Restoring using Private Key WIF:", privateKeyWIF);

                const privateKeyBytes = base58Decode(privateKeyWIF).slice(1, 33);
                const privateKeyHex = bytesToHex(privateKeyBytes);

                console.log("Decoded Private Key Hex:", privateKeyHex);

                const EC = elliptic.ec;
                const ec = new EC('secp256k1');
                const keyPair = ec.keyFromPrivate(privateKeyHex);
                const publicKey = keyPair.getPublic(true, 'hex');

                console.log("Derived Public Key:", publicKey);

                const publicKeyHash = ripemd160(sha256(publicKey));
                const addressWithPrefix = '30' + publicKeyHash;
                const checksum = sha256(sha256(addressWithPrefix)).slice(0, 8);
                const address = base58Encode(hexToBytes(addressWithPrefix + checksum));

                console.log("Restored Address:", address);

                localStorage.setItem('address_LTC', address);
                localStorage.setItem('privateKey_LTC', privateKeyWIF);
                localStorage.setItem('publicKey_LTC', publicKey);

                // Import the public key into the Litecoin node
                await importPublicKeyLTC(publicKey);

                console.log("Wallet restored and data stored in local storage.");
                await updateBalanceLTC(address);

                location.reload(); // Reload the page to update the UI
            } else {
                console.error("No private key provided for restoration.");
            }
        } else if (restoreOption === 'mnemonic') {
            mnemonic = document.getElementById('restore-mnemonic-LTC').value.trim();
            if (mnemonic) {
                console.log("Restoring using Mnemonic:", mnemonic);

                const seed = mnemonicToSeedLTC(mnemonic);
                const path = "m/44'/2'/0'/0/0";
                const masterKey = bip32MasterKeyFromSeed(seed);
                const derivedKey = deriveKeyFromPath(masterKey, path);

                const privateKeyHex = derivedKey.privateKey;

                console.log("Derived Private Key Hex from Mnemonic:", privateKeyHex);

                const EC = elliptic.ec;
                const ec = new EC('secp256k1');
                const keyPair = ec.keyFromPrivate(privateKeyHex);
                const publicKey = keyPair.getPublic(true, 'hex');

                console.log("Derived Public Key from Mnemonic:", publicKey);

                const publicKeyHash = ripemd160(sha256(publicKey));
                const addressWithPrefix = '30' + publicKeyHash;
                const checksum = sha256(sha256(addressWithPrefix)).slice(0, 8);
                const address = base58Encode(hexToBytes(addressWithPrefix + checksum));

                const privateKeyWithPrefix = 'B0' + privateKeyHex + '01';
                const privateKeyChecksum = sha256(sha256(privateKeyWithPrefix)).slice(0, 8);
                const privateKeyWIF = base58Encode(hexToBytes(privateKeyWithPrefix + privateKeyChecksum));

                console.log("Restored Address from Mnemonic:", address);

                localStorage.setItem('address_LTC', address);
                localStorage.setItem('privateKey_LTC', privateKeyWIF);
                localStorage.setItem('mnemonic_LTC', mnemonic);
                localStorage.setItem('publicKey_LTC', publicKey);

                // Import the public key into the Litecoin node
                await importPublicKeyLTC(publicKey);

                console.log("Wallet restored from mnemonic and data stored in local storage.");
                await updateBalanceLTC(address);

                location.reload(); // Reload the page to update the UI
            } else {
                console.error("No mnemonic provided for restoration.");
            }
        }
    } catch (error) {
        console.error('Error restoring wallet:', error);
    }
}

function signOutLTC() {
    localStorage.removeItem('address_LTC');
    localStorage.removeItem('privateKey_LTC');
    localStorage.removeItem('mnemonic_LTC');
    localStorage.removeItem('publicKey_LTC');
    localStorage.removeItem('balance_LTC');
    localStorage.removeItem('utxos_LTC');
    localStorage.removeItem('selectedUTXOs_LTC');

    Object.keys(localStorage).forEach((key) => {
        if (key.endsWith('_LTC')) {
            localStorage.removeItem(key);
        }
    });

    const walletAddressElement = document.getElementById('wallet-address-LTC');
    const balanceElement = document.getElementById('balance-LTC');
    const qrCodeElement = document.getElementById('selfCustodyQrCode-LTC');

    if (walletAddressElement) {
        walletAddressElement.textContent = '';
    }
    if (balanceElement) {
        balanceElement.style.display = 'none';
    }
    if (qrCodeElement) {
        qrCodeElement.src = '';
        qrCodeElement.style.display = 'none';
    }

    const generateKeysButton = document.getElementById('generate-keys-button-LTC');
    const restoreWalletSection = document.getElementById('restore-wallet-LTC');
    const signOutButton = document.getElementById('sign-out-ltc-btn');
    const sendForm = document.getElementById('selfcustody-send-form-LTC');

    if (generateKeysButton) {
        generateKeysButton.style.display = 'block';
    }
    if (restoreWalletSection) {
        restoreWalletSection.style.display = 'block';
    }
    if (signOutButton) {
        signOutButton.style.display = 'none';
    }
    if (sendForm) {
        sendForm.style.display = 'none';
    }

    location.reload();
}
document.addEventListener("DOMContentLoaded", async function() {
    const showSecretsBtn = document.getElementById('show-secrets-button-LTC');
    const secretsModal = document.getElementById('showLitecoinSecretsModal');
    const closeSecretsModal = document.getElementById('closeLitecoinSecretsModal');
    const confirmShowSecrets = document.getElementById('confirm-show-litecoin-secrets');
    const cancelShowSecrets = document.getElementById('cancel-show-litecoin-secrets');
    const secretsDisplay = document.getElementById('litecoinSecretsDisplay');

    if (showSecretsBtn && secretsModal) {
        showSecretsBtn.addEventListener('click', function() {
            secretsModal.style.display = 'block';
        });
    }

    if (closeSecretsModal) {
        closeSecretsModal.addEventListener('click', function() {
            secretsModal.style.display = 'none';
            secretsDisplay.style.display = 'none';
        });
    }

    if (confirmShowSecrets) {
        confirmShowSecrets.addEventListener('click', function() {
            const privateKey = localStorage.getItem('privateKey_LTC');
            const mnemonic = localStorage.getItem('mnemonic_LTC');
            const publicKey = localStorage.getItem('publicKey_LTC');

            if (secretsDisplay) {
                document.getElementById('litecoinPrivateKeyDisplay').textContent = privateKey || 'No Litecoin Private Key Available';
                document.getElementById('litecoinMnemonicDisplay').textContent = mnemonic || 'No Litecoin Mnemonic Available';
                document.getElementById('litecoinPublicKeyDisplay').textContent = publicKey || 'No Litecoin PubKey Available';

                secretsDisplay.style.display = 'block';
            }
        });
    }

    if (cancelShowSecrets) {
        cancelShowSecrets.addEventListener('click', function() {
            secretsModal.style.display = 'none';
            secretsDisplay.style.display = 'none';
        });
    }
});
