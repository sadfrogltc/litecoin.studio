<?php
require_once("litecoin.php");

class Ordinals {
    private $litecoin;

    public function __construct() {
        $this->litecoin = new Litecoin();
    }

    public function scanUTXOForOrdinal($txid, $vout) {
        $result = $this->litecoin->isOrdinalUTXO($txid, $vout);
        
        if ($result['isOrdinal']) {
            return [
                'isOrdinal' => true,
                'inscriptionID' => $result['inscriptionID'],
                'website' => $result['website']
            ];
        } else {
            return ['isOrdinal' => false];
        }
    }
}

// Process the request
if (isset($_POST['txid']) && isset($_POST['vout'])) {
    $txid = $_POST['txid'];
    $vout = (int) $_POST['vout'];

    $ordinals = new Ordinals();
    $response = $ordinals->scanUTXOForOrdinal($txid, $vout);

    echo json_encode($response);
} else {
    echo json_encode(['error' => 'Missing txid or vout']);
}
