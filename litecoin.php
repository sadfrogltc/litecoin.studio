<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once("node.php");

class Litecoin {
    private static $_rpc_user = 'x';
    private static $_rpc_password = 'x';
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
}
?>
