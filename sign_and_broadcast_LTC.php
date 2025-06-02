<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once("litecoin.php");
require_once 'logger.php';

header('Content-Type: application/json');

try {
    $LITECOIN = new Litecoin();

    $rawTxHex = $_POST['rawTxHex'] ?? '';
    $privKeys = json_decode($_POST['privKeys'], true) ?? [];
    $prevTxs = json_decode($_POST['prevTxs'], true) ?? [];

    if (empty($rawTxHex) || empty($privKeys)) {
        throw new Exception("Missing required data: rawTxHex or privKeys.");
    }

    $signedTx = $LITECOIN->signRawTransactionWithKey($rawTxHex, $privKeys, $prevTxs);

    if (!$signedTx['complete']) {
        throw new Exception("Failed to sign transaction completely.");
    }

    $txid = $LITECOIN->sendRawTransaction($signedTx['hex']);

    log_action('server', 'transaction_signed', 'Transaction signed for LTC');
    log_action('server', 'transaction_broadcast', 'Transaction broadcasted for LTC');

    echo json_encode([
        'success' => true,
        'txid' => $txid,
        'signedTxHex' => $signedTx['hex']
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
    error_log("Transaction Error: " . $e->getMessage());
}
?>
