<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Litecoin Wallet</title>
    
    <!-- Include necessary CSS for styling -->
    <link rel="stylesheet" href="style.css">

    <!-- Include necessary JavaScript libraries for cryptographic operations -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/3.1.9-1/crypto-js.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/elliptic/6.5.4/elliptic.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/qrcodejs2/qrcode.min.js"></script>
    <script src="word-list.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bip39@3.0.4/index.min.js"></script>
    
</head>
<body>

    <div class="container">
        <div class="column left">
            <!-- You can add any additional elements here -->
        </div>
        <div class="column center">
            <h2>Litecoin Self-Custody Wallet</h2>

            <!-- Wallet Sections -->
            <div id="generate-keys-LTC" class="wallet-section">
                <h3>Generate New Keys</h3>
                <button id="generate-keys-button-LTC">Generate Keys</button>
            </div>

            <div id="restore-wallet-LTC" class="wallet-section">
                <h3>Restore Wallet</h3>
                <label for="restore-option-LTC">Restore Using:</label>
                <select id="restore-option-LTC">
                    <option value="private-key">Private Key</option>
                    <option value="mnemonic">Mnemonic</option>
                </select>
                <div id="restore-private-key-section-LTC">
                    <label for="restore-private-key-LTC">Enter Private Key:</label>
                    <input type="text" id="restore-private-key-LTC" name="restore-private-key-LTC">
                </div>
                <div id="restore-mnemonic-section-LTC" style="display: none;">
                    <label for="restore-mnemonic-LTC">Enter Mnemonic:</label>
                    <input type="text" id="restore-mnemonic-LTC" name="restore-mnemonic-LTC">
                </div>
                <button id="restore-wallet-button-LTC">Restore LTC Wallet</button>
            </div>

            <div id="wallet-info-LTC" class="wallet-section" style="display:none;">
                <h3>Wallet Info</h3>
                <p>Address: <span id="wallet-address-LTC"></span></p>
                <p>Balance: <span id="balance-LTC" style="display:none;">0.00 LTC</span></p>
                <div id="selfCustodyQrCode-LTC" style="display:none;"></div>
            </div>

            <div id="send-transaction-LTC" class="wallet-section" style="display:none;">
                <h3>Send Transaction</h3>
                <form id="selfcustody-send-form-LTC">
                    <label for="selfcustody-to_address-LTC">Recipient Address:</label>
                    <input type="text" id="selfcustody-to_address-LTC" name="to_address-LTC" required>
                    <label for="selfcustody-amount-LTC">Amount (LTC):</label>
                    <input type="text" id="selfcustody-amount-LTC" name="amount-LTC" required>
                    <label for="support-dev-toggle-LTC">
    <input type="checkbox" id="support-dev-toggle-LTC" checked>
    Support the Developer
</label>
                    <label for="selfcustody-feeRate-LTC">Fee Rate (LTC per kB):</label>
                    <input type="range" id="selfcustody-feeRate-LTC" name="feeRate-LTC" min="0.05" max="3" step="0.1" value="1">
                    <span id="selfcustody-feeRateDisplay-LTC">1 LTC/kB</span> <!-- This display will update as the slider is moved -->
                    <button type="button" id="selfcustody-create-transaction-LTC" class="transaction-button">Create Transaction</button>
                    
                    <button type="button" id="selfcustody-sign-broadcast-LTC" class="transaction-button">Sign and Broadcast</button>
                </form>
            </div>

            <div id="raw-transaction-section-LTC" style="display:none;">
                <h3>Raw Transaction</h3>
                <p id="raw-transaction-hex-LTC"></p>
            </div>

            <div id="broadcast-result" style="display: none;"></div>

            <div id="utxo-info-LTC" class="wallet-section">
                
                <button class="collapsible" onclick="toggleUTXOSection()">Show UTXOs</button>
                <div class="content" id="unspentTx-LTC"></div>
            </div>
        </div>
        <div class="column right">
    <button id="show-secrets-button-LTC">Show Secrets</button>
    <button id="sign-out-ltc-btn"></button>
    <p>This is a self-custody wallet. Please keep your private keys secure.</p>
</div>

    </div>
  
    <script src="wallet_generation_LTC.js"></script>
    <script src="wallet_transactions_LTC.js"></script>
    <script src="qrCode.js"></script>
    
    <script>
        document.addEventListener("DOMContentLoaded", async function() {
            const address = localStorage.getItem('address_LTC');
            if (address) {
                await fetchUTXOsLTC(address);
                displayUTXOs(); // Display UTXOs after fetching
            }

            // Collapsible section for UTXOs
            const coll = document.getElementsByClassName("collapsible");
            for (let i = 0; i < coll.length; i++) {
                coll[i].addEventListener("click", function() {
                    this.classList.toggle("active");
                    const content = this.nextElementSibling;
                    if (content.style.display === "block") {
                        content.style.display = "none";
                    } else {
                        content.style.display = "block";
                    }
                });
            }
        });

        async function toggleUTXOSection() {
            const address = localStorage.getItem('address_LTC');
            if (address) {
                await fetchUTXOsLTC(address);
                displayUTXOs(); // Refresh UTXO display on click
            }
        }

        function displayUTXOs() {
            const utxos = JSON.parse(localStorage.getItem('utxos_LTC'));
            const utxoContainer = document.getElementById('unspentTx-LTC');

            if (utxos && utxos.length > 0) {
                utxoContainer.innerHTML = '';
                utxos.forEach((utxo, index) => {
                    utxoContainer.innerHTML += `
                        <div>
                            <strong>UTXO ${index + 1}</strong><br>
                            TXID: ${utxo.txid}<br>
                            Vout: ${utxo.vout}<br>
                            Amount: ${utxo.amount} LTC<br>
                            Confirmations: ${utxo.confirmations}<br>
                            <hr>
                        </div>
                    `;
                });
            } else {
                utxoContainer.innerHTML = '<p>No UTXOs available.</p>';
            }
        }
    </script>
    <?php include 'show_secrets_modal_LTC.php'; ?>
    <?php include('footer.php');?>
</body>
</html>
<!-- Include the secrets modal -->

