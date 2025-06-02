<?php
require_once("litecoin.php");
require_once 'logger.php';

$LITECOIN = new Litecoin();
$address = $_GET['address'] ?? '';

if (!empty($address)) {
    $balance = $LITECOIN->checkBalance($address);
    log_action($address, 'check_balance', 'Balance checked');
    echo json_encode(['balance' => $balance]);
} else {
    log_action('unknown', 'check_balance', 'No address provided');
    echo json_encode(['error' => 'No address provided']);
}
?>
