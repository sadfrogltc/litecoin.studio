<br><br><br><br>
<h2>Litecoin.Studio</h2>
<!-- Wallet Sections -->
<div id="generate-keys-LTC" class="wallet-section">
    <h3>Generate New Keys</h3>
    <label><input type="radio" name="address-type-LTC" value="segwit" checked> SegWit (P2WPKH)</label>
    <label><input type="radio" name="address-type-LTC" value="legacy"> Legacy (P2PKH)</label>
    <button id="generate-keys-button-LTC">Generate Keys</button>
</div>
<div id="restore-wallet-LTC" class="wallet-section">
    <h3>Restore Wallet</h3>
    <label for="restore-option-LTC">Restore Using:</label>
    <select id="restore-option-LTC">
        <option value="private-key">Private Key</option>
        <option value="mnemonic">Mnemonic</option>
    </select>
    <label>Address Type:</label>
    <input type="radio" id="restore-segwit-LTC" name="restore-address-type-LTC" value="segwit" checked>
    <label for="restore-segwit-LTC">SegWit</label>
    <input type="radio" id="restore-legacy-LTC" name="restore-address-type-LTC" value="legacy">
    <label for="restore-legacy-LTC">Legacy</label>
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
    <h3>Info</h3>
    <div class="balance-qr-container">
        <div id="selfCustodyQrCode-LTC" style="display:block;"></div>
        <div class="info-wrapper">
            <div id="address-label-LTC">
                <span id="wallet-address-LTC" data-full-value=""></span>
            </div>
            <div class="balance-wrapper">
                <div id="balance-LTC" style="display:block;">0.01000000 LTC</div>
            </div>
        </div>
    </div>
</div>
<div id="utxo-info-LTC" class="wallet-section">
    <button class="collapsible" onclick="toggleUTXOSection()">Show UTXOs</button>
    <div class="content" id="unspentTx-LTC" style="display: none;"></div>
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
            Support Development <span style="font-size:0.7em">(5k Lits)</span>
        </label>
        <label class="switch">
            <input type="checkbox" id="selfcustody-send-max-toggle-LTC">
            <span class="slider round"></span>
        </label>
        <span id="send-max-label-LTC" style="position: relative; cursor: pointer;">
            Send Max
            <span id="tooltip-send-max-LTC" style="visibility: hidden; background-color: #555; color: #fff; text-align: center; border-radius: 6px; padding: 5px; position: absolute; z-index: 1; bottom: 125%; left: 50%; transform: translateX(-50%); white-space: nowrap;">
                Send Max to Self for UTXO consolidation
                <span style="position: absolute; top: 100%; left: 50%; margin-left: -5px; border-width: 5px; border-style: solid; border-color: #555 transparent transparent transparent;"></span>
            </span>
        </span>
        <h3>Selected UTXOs:</h3>
        <div id="selected-utxos" style="margin-top: 20px;"></div>
        <label for="selfcustody-feeRate-LTC">Fee:</label>
        <input type="range" id="selfcustody-feeRate-LTC" name="feeRate-LTC">
        <span id="selfcustody-feeRateDisplay-LTC">1 LTC</span>
        <button type="button" id="selfcustody-create-transaction-LTC" class="transaction-button">Create Transaction</button>
        <button type="button" id="selfcustody-sign-broadcast-LTC" class="transaction-button">Sign and Broadcast</button>
    </form>
</div>
<!-- Raw Transaction Section -->
<div id="raw-transaction-section-LTC" style="display:none;">
    <h3>Raw Transaction</h3>
    <p id="raw-transaction-hex-LTC" class="truncated-transaction" data-full-value=""></p>
</div>
<!-- Transaction ID Section -->
<div id="transaction-id-section-LTC" style="display:none;">
    <h3>Transaction ID</h3>
    <p id="transaction-id-LTC" class="truncated-transaction" data-full-value=""></p>
</div>
<div id="broadcast-result" style="display: none;"></div>
<div class="info-icon" id="info-icon">ℹ️</div>
<script src="wallet_generation_LTC.js"></script>
<script src="wallet_transactions_LTC.js"></script>
<script src="qrCode.js"></script>
<script src="display_utxos.js"></script>
