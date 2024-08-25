<?php
require_once("litecoin.php");

$LITECOIN = new Litecoin();
$address = $_GET['address'] ?? '';

if (!empty($address)) {
    $balance = $LITECOIN->checkBalance($address);
    echo json_encode(['balance' => $balance]);
} else {
    echo json_encode(['error' => 'No address provided']);
}
?>
