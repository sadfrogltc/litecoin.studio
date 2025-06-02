<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once("node.php");

class Litecoin {
    private static $_rpc_user = 'yours';
    private static $_rpc_password = 'yours';
    private static $_rpc_host = '127.0.0.1';
    private static $_rpc_port = '9332';
    private static $_node;

    function __construct(){
        try {
            self::$_node = new Node(self::$_rpc_user, self::$_rpc_password, self::$_rpc_host, self::$_rpc_port);
        } catch (\Throwable $th) {
            echo "Node Error - Failed to initialize Litecoin node.";
            die();
        }
    }

    function help($command = ''){
        return self::$_node->help($command);
    }

    function getBalance($account){
        return self::$_node->getbalance($account);
    }

    function getAddressesByAccount($account){
        return self::$_node->getaddressesbyaccount($account);
    }

    function sendFrom($fromaccount, $toaddress, $amount){
        return self::$_node->sendfrom($fromaccount, $toaddress, $amount);
    }
    
    function createRawTransaction($inputs, $outputs){
        return self::$_node->createrawtransaction($inputs, $outputs);
    }

    function signRawTransactionWithKey($hexstring, $privkeys = [], $prevtxs = [], $sighashtype = "ALL"){
        return self::$_node->signrawtransactionwithkey($hexstring, $privkeys, $prevtxs, $sighashtype);
    }

    function sendRawTransaction($hexstring){
        return self::$_node->sendrawtransaction($hexstring);
    }

    function decodeRawTransaction($hexstring){
        return self::$_node->decoderawtransaction($hexstring);
    }

    function listUnspent($address){
        return self::$_node->listunspent(0, 99999, array($address));
    }

    function getTxOut($txid, $vout, $includeMempool = true){
        return self::$_node->gettxout($txid, $vout, $includeMempool);
    }

    function getBlockCount(){
        return self::$_node->getblockcount();
    }

    function getNewAddress($account){
        return self::$_node->getnewaddress($account);
    }

    function getNetworkHashps(){
        return self::$_node->getnetworkhashps();
    }

    function getTransaction($txid){
        return self::$_node->gettransaction($txid);
    }

    function getBlockHash($index){
        return self::$_node->getblockhash($index);
    }

    function getDifficulty(){
        return self::$_node->getdifficulty();
    }

    function getMiningInfo(){
        return self::$_node->getmininginfo();
    }

    function sendToAddress($address, $amount){
        return self::$_node->sendtoaddress($address, $amount);
    }

    function getBlock($blockhash){
        return self::$_node->getblock($blockhash);
    }

    function getBestBlockHash(){
        return self::$_node->getbestblockhash();
    }

    function estimateFee($nblocks){
        return self::$_node->estimatefee($nblocks);
    }

    function getNetworkInfo(){
        return self::$_node->getnetworkinfo();
    }
   
    function importPublicKey($publicKey, $label, $rescan=false){
        return self::$_node->importpubkey($publicKey, $label, $rescan);    
    }

    function getRawTransaction($txid, $verbose = true) {
        return self::$_node->getrawtransaction($txid, $verbose);
    }
    function rescan1year() {
        $currentBlock = $this->getBlockCount(); // Retrieve current block count
        $blocksPerYear = 110240; // Number of blocks in a 6months for Litecoin
        $startBlock = max(0, $currentBlock - $blocksPerYear); // Block height from one year ago
        return self::$_node->rescanblockchain($startBlock); // Start rescan from the calculated block
    }
    function checkBalance($address) {
        try {
            $unspentTxs = $this->listUnspent($address);
            $balance = 0.0;
            if (!empty($unspentTxs)) {
                foreach ($unspentTxs as $utxo) {
                    $balance += $utxo['amount'];
                }
            }
            return $balance;
        } catch (Exception $e) {
            echo "Error checking balance: " . $e->getMessage();
            return 0;
        }
    }
    function isOrdinalUTXO($txid, $vout) {
        // Fetch the raw transaction details for the given txid
        $rawTransaction = $this->getRawTransaction($txid, true);
        
        if (!$rawTransaction || !isset($rawTransaction['vout'])) {
            return ['isOrdinal' => false];
        }
        
        // Debugging: Log the raw transaction details
        error_log("[DEBUG] Raw transaction data for txid {$txid}: " . json_encode($rawTransaction));
        
        // Analyze the vout for ordinals
        foreach ($rawTransaction['vout'] as $output) {
            if ($output['n'] == $vout) {
                // Logic to detect ordinals (adjust this based on actual criteria)
                $scriptType = $output['scriptPubKey']['type'];
                $value = $output['value'];
        
                // Example condition for ordinals (you can modify this based on your logic)
                if ($value <= 0.0001 && ($scriptType === 'witness_v0_keyhash' || $scriptType === 'nulldata')) {
                    // Find the correct inscription ID using your logic
                    $inscriptionID = $this->findInscriptionID($txid, $vout);
                    
                    // Ensure $inscriptionID is correctly formatted as a string
                    if (is_array($inscriptionID) && isset($inscriptionID['inscriptionID'])) {
                        $inscriptionID = $inscriptionID['inscriptionID'];  // Extract the ID as a string
                    }
                    
                    // Return the response correctly as JSON, ensuring no array issues
                    return [
                        'isOrdinal' => true,
                        'inscriptionID' => $inscriptionID,
                        'website' => "https://litecoin.studio/inscription/{$inscriptionID}"
                    ];
                }
            }
        }
        
        return ['isOrdinal' => false];
    }
    
    
    
    function findInscriptionID($txid, $vout) {
        // Example URL to the output page where the inscription can be found
        $outputUrl = "https://litecoin.studio/output/{$txid}:{$vout}";
        
        // Fetch the output page HTML to search for the inscription link
        $outputPage = file_get_contents($outputUrl);
        
        // Use a regex or DOM parser to extract the inscription ID from the HTML
        if (preg_match('/\/inscription\/([a-zA-Z0-9]+i[0-9]+)/', $outputPage, $matches)) {
            $inscriptionID = $matches[1]; // Extract the inscription ID from the page
            return [
                'isOrdinal' => true,
                'inscriptionID' => $inscriptionID,
                'website' => "https://litecoin.studio/inscription/{$inscriptionID}"
            ];
        }
        
        // If no inscription found, return as not an ordinal
        return ['isOrdinal' => false];
    }
    
    
    
  
}
    
    // Add a request handler
    if (isset($_POST['txid']) && isset($_POST['vout'])) {
        $txid = $_POST['txid'];
        $vout = (int) $_POST['vout'];
    
        $litecoin = new Litecoin();
        $response = $litecoin->isOrdinalUTXO($txid, $vout);
    
        echo json_encode($response);
        exit();
    }
?>
