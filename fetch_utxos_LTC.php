<?php
require_once("litecoin.php");

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['address'])) {
    $address = $_POST['address'];
    $LITECOIN = new Litecoin();
    $unspentTx = $LITECOIN->listUnspent($address);
    
    if (!empty($unspentTx)) {
        echo json_encode(['success' => true, 'utxos' => $unspentTx]);
    } else {
        echo json_encode(['success' => false, 'error' => 'No unspent transactions found.']);
    }
} else {
    echo json_encode(['success' => false, 'error' => 'Address not provided.']);
}
?>
