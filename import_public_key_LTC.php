<?php
header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once("litecoin.php");

$publicKey = $_POST['publicKey'] ?? '';
if (empty($publicKey)) {
    echo json_encode(['success' => false, 'error' => 'No public key provided']);
    exit;
}

// Instantiate the Litecoin class
$LITECOIN = new Litecoin();

// Import the public key into the Litecoin node
$importResult = $LITECOIN->importPublicKey($publicKey, 'User Generated watch-only', false);

if (isset($importResult['error']) && $importResult['error'] !== null) {
    echo json_encode(['success' => false, 'error' => $importResult['error']]);
} else {
    echo json_encode(['success' => true, 'message' => 'Public key imported successfully']);
}
?>
