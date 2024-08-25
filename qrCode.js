function generateQrCodeLTC(address, qrContainer) {
    if (address) {
        qrContainer.innerHTML = ""; 
        const qrCode = new QRCode(qrContainer, {
            text: address,
            width: 128,
            height: 128
        });
        qrContainer.style.display = 'block';
    } else {
        alert('No address found to generate QR Code.');
    }
}