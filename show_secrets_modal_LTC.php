<div id="showLitecoinSecretsModal" class="modal" style="display:none">
    <div class="modal-content">
        <span id="closeLitecoinSecretsModal" class="close">&times;</span>
        <h2>Are you sure you want to see your Litecoin private keys?</h2>
        <p>Displaying your Litecoin private keys and mnemonic phrase (if available) is sensitive. Make sure you're in a secure environment.</p>
        
        <button id="confirm-show-litecoin-secrets" class="modal-button">YES, SHOW LITECOIN SECRETS</button>
        <button id="cancel-show-litecoin-secrets" class="modal-button">CANCEL</button>

        <div id="litecoinSecretsDisplay" style="display:none;">
            <h3>Your Litecoin Secrets</h3>
            <h4>Private Key:</h4><p id="litecoinPrivateKeyDisplay" class="truncated-text-secrets" data-full-value="No Litecoin Private Key Available" title="Click to copy">No Litecoin Private Key Available</p>
            <h4>Mneumonic:</h4><p id="litecoinMnemonicDisplay" class="text-secrets" data-full-value="No Litecoin Mnemonic Available" title="Click to copy">No Litecoin Mnemonic Available</p>
            <h4>Public Key:</h4><p id="litecoinPublicKeyDisplay" class="truncated-text-secrets" data-full-value="No Litecoin PubKey Available" title="Click to copy">No Litecoin PubKey Available</p>
        </div>
    </div>
</div>

<script>
document.getElementById('show-secrets-button-LTC').addEventListener('click', function() {
    const modal = document.getElementById('showLitecoinSecretsModal');
    if (modal) {
        modal.style.display = 'block';
    }
});

document.getElementById('confirm-show-litecoin-secrets').addEventListener('click', function() {
    const privateKey = localStorage.getItem('privateKey_LTC') || 'No Litecoin Private Key Available';
    const mnemonic = localStorage.getItem('mnemonic_LTC') || 'No Litecoin Mnemonic Available';
    const publicKey = localStorage.getItem('publicKey_LTC') || 'No Litecoin PubKey Available';

    document.getElementById('litecoinPrivateKeyDisplay').setAttribute('data-full-value', privateKey);
    document.getElementById('litecoinMnemonicDisplay').setAttribute('data-full-value', mnemonic);
    document.getElementById('litecoinPublicKeyDisplay').setAttribute('data-full-value', publicKey);

    document.getElementById('litecoinPrivateKeyDisplay').textContent = truncateSecret(privateKey);
    document.getElementById('litecoinPublicKeyDisplay').textContent = truncateSecret(publicKey);

    document.getElementById('litecoinSecretsDisplay').style.display = 'block';
});

document.getElementById('cancel-show-litecoin-secrets').addEventListener('click', function() {
    const modal = document.getElementById('showLitecoinSecretsModal');
    if (modal) {
        modal.style.display = 'none';
        document.getElementById('litecoinSecretsDisplay').style.display = 'none';
    }
});

document.getElementById('closeLitecoinSecretsModal').addEventListener('click', function() {
    const modal = document.getElementById('showLitecoinSecretsModal');
    if (modal) {
        modal.style.display = 'none';
        document.getElementById('litecoinSecretsDisplay').style.display = 'none';
    }
});

// Copy to clipboard functionality
function copyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    alert('Copied to clipboard!');
}

// Add click event listeners for copying
document.getElementById('litecoinPrivateKeyDisplay').addEventListener('click', function() {
    const fullValue = this.getAttribute('data-full-value');
    if (fullValue !== 'No Litecoin Private Key Available') {
        copyToClipboard(fullValue);
    }
});

document.getElementById('litecoinMnemonicDisplay').addEventListener('click', function() {
    const fullValue = this.getAttribute('data-full-value');
    if (fullValue !== 'No Litecoin Mnemonic Available') {
        copyToClipboard(fullValue);
    }
});

document.getElementById('litecoinPublicKeyDisplay').addEventListener('click', function() {
    const fullValue = this.getAttribute('data-full-value');
    if (fullValue !== 'No Litecoin PubKey Available') {
        copyToClipboard(fullValue);
    }
});

function truncateSecret(secret, maxLength = 20) {
    if (secret.length > maxLength) {
        return `${secret.substring(0, 10)}...${secret.substring(secret.length - 10)}`;
    }
    return secret;
}
document.addEventListener("DOMContentLoaded", function() {
    const walletGenerated = localStorage.getItem('walletGenerated_LTC');
    const secretsModal = document.getElementById('showLitecoinSecretsModal');

    if (walletGenerated && secretsModal) {
        secretsModal.style.display = 'block'; // Show the modal
        localStorage.removeItem('walletGenerated_LTC'); // Remove the flag
    }
});

</script>
