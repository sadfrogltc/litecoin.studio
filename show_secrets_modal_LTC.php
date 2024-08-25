<div id="showLitecoinSecretsModal" class="modal" style="display:none">
    <div class="modal-content">
        <span id="closeLitecoinSecretsModal" class="close">&times;</span>
        <h2>Are you sure you want to see your Litecoin private keys?</h2>
        <p>Displaying your Litecoin private keys and mnemonic phrase (if available) is sensitive. Make sure you're in a secure environment.</p>
        
        <button id="confirm-show-litecoin-secrets" class="modal-button">YES, SHOW LITECOIN SECRETS</button>
        <button id="cancel-show-litecoin-secrets" class="modal-button">CANCEL</button>

        <div id="litecoinSecretsDisplay" style="display:none;">
            <h3>Your Litecoin Secrets</h3>
            <p id="litecoinPrivateKeyDisplay" class="truncated-text">No Litecoin Private Key Available</p>
            <p id="litecoinMnemonicDisplay" class="truncated-text">No Litecoin Mnemonic Available</p>
            <p id="litecoinPublicKeyDisplay" class="truncated-text">No Litecoin PubKey Available</p>
        </div>
    </div>
</div>
