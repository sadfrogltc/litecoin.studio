<?php
require_once __DIR__ . '/access_logger.php';
log_access();
?>
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
            <button id="sign-out-ltc-btn" title="Sign Out">&#x23FB;</button>
            <!-- <a href="https://doge.litecoin.studio"><button id="switch-to-doge-btn">Đ</button></a> -->
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

   
    </div>



    <script>
        // Alphabet map for address encoding
        (function() {
            const ALPHABET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
            const ALPHABET_MAP = {};
            for (let z = 0; z < ALPHABET.length; z++) {
                ALPHABET_MAP[ALPHABET.charAt(z)] = z;
            }
        })();

        // Remove sensitive data from localStorage on unload
        window.addEventListener('beforeunload', function () {
            localStorage.removeItem('rawTxHex_LTC');
            localStorage.removeItem('selectedUTXOs_LTC');
            localStorage.removeItem('rawTxOutputs_LTC');
        });

        document.addEventListener('DOMContentLoaded', function () {
            // Show/Hide Show Secrets button
            function toggleShowSecretsButton() {
                const btn = document.getElementById('show-secrets-button-LTC');
                if (!btn) return;
                const walletDataExists = localStorage.getItem('walletAddress_LTC') || localStorage.getItem('privateKey_LTC') || localStorage.getItem('mnemonic_LTC');
                btn.style.display = walletDataExists ? 'block' : 'none';
            }
            toggleShowSecretsButton();
            const genBtn = document.getElementById('generate-keys-button-LTC');
            if (genBtn) genBtn.addEventListener('click', toggleShowSecretsButton);
            const restoreBtn = document.getElementById('restore-wallet-button-LTC');
            if (restoreBtn) restoreBtn.addEventListener('click', toggleShowSecretsButton);

            // Copy to clipboard helper
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

            // Wallet address click-to-copy and long-press to show full (mobile)
            const walletAddressElement = document.getElementById('wallet-address-LTC');
            if (walletAddressElement) {
                const fullAddress = walletAddressElement.dataset.fullValue || walletAddressElement.textContent.trim();
                function isMobile() {
                    return window.innerWidth <= 700;
                }
                if (isMobile()) {
                    const start = fullAddress.slice(0, 6);
                    const end = fullAddress.slice(-6);
                    walletAddressElement.innerHTML = `<span class="ellipsis address-clip" title="${fullAddress}">${start}...${end}</span>`;
                } else {
                    walletAddressElement.innerHTML = `<span class="ellipsis address-clip" title="${fullAddress}">${fullAddress}</span>`;
                }
                walletAddressElement.dataset.fullValue = fullAddress;
                // Tap to copy
                walletAddressElement.addEventListener('click', function() {
                    navigator.clipboard.writeText(fullAddress);
                    alert('Copied to clipboard: ' + fullAddress);
                });
                // Long-press to show full address
                let pressTimer;
                walletAddressElement.addEventListener('touchstart', function(e) {
                    pressTimer = setTimeout(function() {
                        alert('Full address:\n' + fullAddress);
                    }, 600); // 600ms for long-press
                });
                walletAddressElement.addEventListener('touchend', function(e) {
                    clearTimeout(pressTimer);
                });
                walletAddressElement.addEventListener('touchmove', function(e) {
                    clearTimeout(pressTimer);
                });
            }

            // Truncated text click-to-copy
            function setupTruncatedText(elementId, fullValue) {
                const element = document.getElementById(elementId);
                if (element) {
                    const start = fullValue.slice(0, 6);
                    const end = fullValue.slice(-6);
                    element.innerHTML = `<span class="ellipsis" title="${fullValue}">${start}...${end}</span>`;
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

            // Hide ordinal context menu item
            const ordinalMenu = document.getElementById('context-send-ordinal');
            if (ordinalMenu) ordinalMenu.style.display = 'none';

            // Info modal logic
            const infoIcon = document.getElementById('info-icon');
            const modal = document.getElementById('utxo-modal');
            const closeModal = document.getElementById('close-modal');
            if (infoIcon && modal && closeModal) {
                infoIcon.addEventListener('click', function() {
                    modal.style.display = 'flex';
                });
                closeModal.addEventListener('click', function() {
                    modal.style.display = 'none';
                });
                window.addEventListener('click', function(event) {
                    if (event.target === modal) {
                        modal.style.display = 'none';
                    }
                });
            }

            // Tap-to-expand/copy for all .ellipsis
            document.querySelectorAll('.ellipsis').forEach(function(el) {
                el.addEventListener('click', function(e) {
                    const value = el.title || el.textContent;
                    if (navigator.clipboard) {
                        navigator.clipboard.writeText(value);
                        alert('Copied to clipboard: ' + value);
                    } else {
                        alert(value);
                    }
                    e.stopPropagation();
                });
            });
        });
    </script>

</body>
</html>
