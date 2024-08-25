<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once("litecoin.php");

header('Content-Type: application/json');

try {
    // Initialize the Litecoin class
    $LITECOIN = new Litecoin();

    // Retrieve the raw transaction hex, private keys, and previous transactions from the POST request
    $rawTxHex = $_POST['rawTxHex'] ?? '';
    $privKeys = json_decode($_POST['privKeys'], true) ?? [];
    $prevTxs = json_decode($_POST['prevTxs'], true) ?? [];

    // Debugging: Output received input data
    error_log("Received Raw Transaction Hex: " . $rawTxHex);
    error_log("Received Private Keys: " . print_r($privKeys, true));
    error_log("Received Previous Transactions: " . print_r($prevTxs, true));

    if (empty($rawTxHex) || empty($privKeys)) {
        throw new Exception("Missing required data: rawTxHex or privKeys.");
    }

    // Sign the transaction
    $signedTx = $LITECOIN->signRawTransactionWithKey($rawTxHex, $privKeys, $prevTxs);

    // Debugging: Output the signed transaction details
    if (isset($signedTx['hex'])) {
        error_log("Signed Transaction Hex: " . $signedTx['hex']);
    } else {
        error_log("Failed to generate signed transaction hex.");
    }

    // Debugging: Output the complete status
    error_log("Is transaction completely signed? " . ($signedTx['complete'] ? 'Yes' : 'No'));

    // Ensure that the transaction was signed completely
    if (!$signedTx['complete']) {
        throw new Exception("Failed to sign transaction completely.");
    }

    // Broadcast the transaction
    $txid = $LITECOIN->sendRawTransaction($signedTx['hex']);

    // Debugging: Output the transaction ID
    if ($txid) {
        error_log("Broadcast TXID: " . $txid);
    } else {
        error_log("Failed to broadcast transaction. TXID is not returned.");
    }

    // Return success response
    echo json_encode([
        'success' => true,
        'txid' => $txid,
        'signedTxHex' => $signedTx['hex']
    ]);

} catch (Exception $e) {
    // Return error response
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);

    // Debugging: Log the error with more context
    error_log("Transaction Error: " . $e->getMessage());
    error_log("Debugging Data: " . print_r([
        'rawTxHex' => $rawTxHex,
        'privKeys' => $privKeys,
        'prevTxs' => $prevTxs,
    ], true));
}
?>
