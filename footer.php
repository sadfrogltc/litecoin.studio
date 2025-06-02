<?php echo "
    <p>Litecoin Self-Custody node.</p>
    <br>
    Made Possible by the Supporters at <a href='https://chikun.market/collections/sadFrog' target=_blank>SadFrogLTC 🐸</a>
    <br>
    <br>
    <a href='#' onclick='openFaqModal()'>FAQ</a>
"; ?>

<!-- FAQ Modal Structure -->
<div id="faqModal" class="modal" style="display:none">
<div class="modal-content">
    <span class="close" onclick="closeFaqModal()">&times;</span>
    
    <h2>Frequently Asked Questions (FAQ)</h2>
    <br>
    <h3>1. What is Litecoin, and why should I trust it?</h3>
    <p>Litecoin is one of the oldest and most reputable cryptocurrencies, launched in 2011. It is known for its fast transaction times and low fees, making it a reliable choice for digital payments. Over the years, Litecoin has proven its stability, with a robust network and widespread adoption, making it a trusted option for users who value security and longevity.</p>
    <br>
    <h3>2. What is this application?</h3>
    <p>This is a self-custody Litecoin wallet application designed to allow users to manage their Litecoin securely without relying on third-party custodians.</p>
    <br>
    <h3>3. What is the difference between SegWit and Legacy addresses?</h3>
    <p>SegWit (Segregated Witness) is a newer address format that enhances the scalability and security of the Litecoin network. It reduces transaction size, allowing for more transactions per block, and decreases fees. Legacy addresses are the original format used by Litecoin. While both are secure, SegWit is generally recommended for lower fees and faster processing.</p>
    <br>
    <h3>4. What are the goals of this application?</h3>
    <p>The primary goal is to provide a secure, easy-to-use platform for managing Litecoin, where users have complete control over their private keys and funds.</p>
    <br>
    <h3>5. How secure is this application?</h3>
    <p>The application is designed to perform all cryptographic operations client-side, ensuring that your private keys are only processed for signing transactions and never stored on any external node or server. They are not retained by any external systems. The application does not store your private keys or mnemonics on any server, ensuring that only you have control over your funds. However, it is crucial to ensure that your device is secure and free from malware, as this could compromise your wallet.</p>
    <br>
    <h3>6. What happens if I lose my private key or mnemonic?</h3>
    <p>If you lose your private key or mnemonic, you will lose access to your Litecoin. It is vital to keep your private key and mnemonic safe and secure, as they are the only means to access and recover your wallet.</p>
    <br>
    <h3>7. Can I recover my wallet if I lose my device?</h3>
    <p>Yes, as long as you have your mnemonic or private key, you can restore your wallet on any compatible device.</p>
    <br>
    <h3>8. How does the optional development fee support the project?</h3>
    <p>The optional development fee helps maintain and improve the application. By opting to support the developers, you contribute to ongoing development, ensuring the platform remains secure, user-friendly, and up-to-date with the latest features and security enhancements.</p>
</div>

</div>

<script>
// Ensure the FAQ modal is hidden initially
document.addEventListener("DOMContentLoaded", function () {
    const faqModal = document.getElementById("faqModal");
    const closeFaqButton = document.querySelector("#faqModal .close");

    // Function to open the FAQ modal
    function openFaqModal() {
        faqModal.style.display = "flex"; // Ensure flex display to center the modal
    }

    // Function to close the FAQ modal
    function closeFaqModal() {
        faqModal.style.display = "none";
    }

    // Event listener for the FAQ link
    document.querySelector('a[href="#"]').addEventListener("click", function (event) {
        event.preventDefault(); // Prevent default link behavior
        openFaqModal(); // Open the modal
    });

    // Close the modal when the close button is clicked
    closeFaqButton.addEventListener("click", closeFaqModal);

    // Close the modal if the user clicks outside of the modal content
    window.addEventListener("click", function (event) {
        if (event.target === faqModal) {
            closeFaqModal();
        }
    });
});

</script>
