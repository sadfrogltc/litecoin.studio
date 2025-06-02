<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Litecoin Wallet</title>

    <!-- Include necessary CSS for styling -->
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="style2.css">  <!-- Corrected 'rel' attribute -->

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
           <?php include('wallet_display.php') ?>
        </div>

        <div class="column right">
            <button id="show-secrets-button-LTC">Show Secrets</button>
            <button id="sign-out-ltc-btn"></button>
            <a href="https://doge.litecoin.studio"><button id="switch-to-doge-btn">Đ</button></a>
            <p>This is a self-custody wallet. Please keep your private keys secure.</p>
        </div>

        <div id="context-menu">
            <ul>
                <li id="context-spend-from" onclick="selectAsSpendingFrom()">Select as Spending From</li>
                <li id="context-send-ordinal" onclick="sendAsOrdinal()">Send as Ordinal</li>
                <li id="context-spend-fee" onclick="selectAsFee()">Spend as Fee</li>
            </ul>
        </div>
    </div>

    <!-- Include modals -->
    <?php include('info_modal.php'); ?>
    <?php include('show_secrets_modal_LTC.php'); ?>
    <?php include('footer.php'); ?>

    <!-- Drawing and Payment Logic Embedded -->
    <div id="drawing-container">
        <div class="toggle-toolbar">
            <button id="freeDrawButton" class="active">Free Drawing</button>
            <button id="pixelDrawButton">Pixel Drawing</button>
        </div>

        <!-- Free Drawing Container -->
        <div id="freeDrawContainer" class="drawing-container">
            <div class="toolbar">
                <input type="color" id="colorPicker" value="#000000">
                <select id="toolSelect">
                    <option value="brush">Brush</option>
                    <option value="eraser">Eraser</option>
                </select>
                <label for="sizeRange">Size: </label>
                <input type="range" id="sizeRange" min="1" max="50" value="10">
                <button id="clearButton">Clear Canvas</button>
                <button id="saveButton">Inscribe to Litecoin</button>
                <label>
                    <input type="checkbox" id="bgToggle"> White Background
                </label>
            </div>
            <div class="canvas-container">
                <canvas id="drawingCanvas"></canvas>
            </div>
        </div>

        <!-- Pixel Drawing Container -->
        <div id="pixelDrawContainer" class="drawing-container hidden">
            <div class="toolbar">
                <input type="color" id="pixelColorPicker" value="#000000">
                <label for="pixelSizeRange">Pixel Size: </label>
                <input type="range" id="pixelSizeRange" min="5" max="50" value="20">
                <button id="pixelClearButton">Clear Pixel Canvas</button>
                <button id="pixelSaveButton">Inscribe to Litecoin</button>
                <label>
                    <input type="checkbox" id="pixelBgToggle"> White Background
                </label>
            </div>
            <div class="canvas-container">
                <canvas id="pixelCanvas"></canvas>
            </div>
        </div>
    </div>

    <script src="javascript/script.js"></script>

    <script>
        (function() {
            const ALPHABET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
            const ALPHABET_MAP = {};
            for (let z = 0; z < ALPHABET.length; z++) {
                ALPHABET_MAP[ALPHABET.charAt(z)] = z;
            }
        })();

        window.addEventListener('beforeunload', function () {
            localStorage.removeItem('rawTxHex_LTC');
            localStorage.removeItem('selectedUTXOs_LTC');
            localStorage.removeItem('rawTxOutputs_LTC');
        });

        document.addEventListener('DOMContentLoaded', function () {
            // Function to handle the display of the "Show Secrets" button
            function toggleShowSecretsButton() {
                const showSecretsButton = document.getElementById('show-secrets-button-LTC');
                
                // Check if relevant local storage data is present
                const walletDataExists = localStorage.getItem('walletAddress_LTC') || localStorage.getItem('privateKey_LTC') || localStorage.getItem('mnemonic_LTC');

                if (walletDataExists) {
                    showSecretsButton.style.display = 'block'; // Show the button
                } else {
                    showSecretsButton.style.display = 'none'; // Hide the button
                }
            }

            // Call the function on page load
            toggleShowSecretsButton();

            // Call the function after wallet generation or restoration
            document.getElementById('generate-keys-button-LTC').addEventListener('click', toggleShowSecretsButton);
            document.getElementById('restore-wallet-button-LTC').addEventListener('click', toggleShowSecretsButton);

            // Handle click-to-copy
            function handleCopy(element) {
                const fullValue = element.dataset.fullValue;
                if (fullValue) {
                    navigator.clipboard.writeText(fullValue).then(function() {
                        alert('Copied to clipboard: ' + fullValue);
                    }).catch(function(err) {
                        console.error('Failed to copy: ', err);
                    });
                } else {
                    alert('Failed to copy: No value available.');
                }
            }

            // Wallet address click-to-copy
            const walletAddressElement = document.getElementById('wallet-address-LTC');
            if (walletAddressElement) {
                const fullAddress = walletAddressElement.dataset.fullValue || walletAddressElement.textContent.trim();
                walletAddressElement.textContent = fullAddress;
                walletAddressElement.dataset.fullValue = fullAddress;

                walletAddressElement.addEventListener('click', function() {
                    handleCopy(walletAddressElement);
                });
            }

            // Handle truncated text elements
            function setupTruncatedText(elementId, fullValue) {
                const element = document.getElementById(elementId);
                if (element) {
                    const start = fullValue.slice(0, 6);
                    const end = fullValue.slice(-6);
                    element.textContent = `${start}...${end}`;
                    element.title = fullValue;
                    element.dataset.fullValue = fullValue;

                    element.addEventListener('click', function() {
                        handleCopy(element);
                    });
                }
            }

            const rawTxElement = document.getElementById('raw-transaction-hex-LTC');
            if (rawTxElement) {
                const rawTxHash = rawTxElement.dataset.fullValue || rawTxElement.textContent.trim();
                setupTruncatedText('raw-transaction-hex-LTC', rawTxHash);
            }

            const txIdElement = document.getElementById('transaction-id-LTC');
            if (txIdElement) {
                const txId = txIdElement.dataset.fullValue || txIdElement.textContent.trim();
                setupTruncatedText('transaction-id-LTC', txId);
            }
        });

        document.getElementById('context-send-ordinal').style.display = 'none';  // Hides it

        document.addEventListener('DOMContentLoaded', function() {
            const infoIcon = document.getElementById('info-icon');
            const modal = document.getElementById('utxo-modal');
            const closeModal = document.getElementById('close-modal');

            // Show the modal when the information icon is clicked
            infoIcon.addEventListener('click', function() {
                modal.style.display = 'flex';
            });

            // Close the modal when the "x" button is clicked
            closeModal.addEventListener('click', function() {
                modal.style.display = 'none';
            });

            // Close the modal when clicking outside the modal content
            window.addEventListener('click', function(event) {
                if (event.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });
    </script>

</body>
</html>
