<?php
header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once("litecoin.php");
require_once 'logger.php';

$publicKey = $_POST['publicKey'] ?? '';
if (empty($publicKey)) {
    log_action('unknown', 'import_public_key', 'No public key provided');
    echo json_encode(['success' => false, 'error' => 'No public key provided']);
    exit;
}

// Instantiate the Litecoin class
$LITECOIN = new Litecoin();

// Import the public key into the Litecoin node
$importResult = $LITECOIN->importPublicKey($publicKey, 'User Generated watch-only', false);

if (isset($importResult['error']) && $importResult['error'] !== null) {
    log_action($publicKey, 'import_public_key', 'Error: ' . $importResult['error']);
    echo json_encode(['success' => false, 'error' => $importResult['error']]);
} else {
    log_action($publicKey, 'import_public_key', 'Public key imported successfully');
    echo json_encode(['success' => true, 'message' => 'Public key imported successfully']);
}
?>
