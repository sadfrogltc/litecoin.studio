<?php
function get_tempbans() {
    $file = __DIR__ . '/logs/tempbans.json';
    if (!file_exists($file)) return [];
    $data = json_decode(file_get_contents($file), true);
    return is_array($data) ? $data : [];
}
function save_tempbans($bans) {
    $file = __DIR__ . '/logs/tempbans.json';
    file_put_contents($file, json_encode($bans));
}
function add_tempban($ip, $duration, $reason = '') {
    $bans = get_tempbans();
    $expiry = time() + $duration;
    $bans[$ip] = ['expiry' => $expiry, 'reason' => $reason];
    save_tempbans($bans);
}
function remove_tempban($ip) {
    $bans = get_tempbans();
    unset($bans[$ip]);
    save_tempbans($bans);
}
function log_access($username = '', $note = '') {
    $logDir = __DIR__ . '/logs';
    $logfile = $logDir . '/access.log';
    $banlist = $logDir . '/banlist.txt';
    $whitelist = $logDir . '/whitelist.txt';
    if (!is_dir($logDir)) {
        mkdir($logDir, 0775, true);
    }
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
    // Banlist check (permanent)
    if (file_exists($banlist)) {
        $banned = array_map('trim', file($banlist, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES));
        if (in_array($ip, $banned)) {
            header('Location: /banned.php?reason=Permanent+ban');
            exit();
        }
    }
    // Tempban check
    $tempbans = get_tempbans();
    if (isset($tempbans[$ip])) {
        if ($tempbans[$ip]['expiry'] > time()) {
            $expiry = date('Y-m-d H:i:s', $tempbans[$ip]['expiry']);
            $reason = urlencode($tempbans[$ip]['reason'] ?? 'Temporary ban');
            header('Location: /banned.php?reason=' . $reason . '&expiry=' . urlencode($expiry));
            exit();
        } else {
            // Ban expired, remove
            remove_tempban($ip);
        }
    }
    // Whitelist check
    $isWhitelisted = false;
    if (file_exists($whitelist)) {
        $whitelisted = array_map('trim', file($whitelist, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES));
        if (in_array($ip, $whitelisted)) {
            $isWhitelisted = true;
        }
    }
    $entry = date('Y-m-d H:i:s') . " | IP: $ip | UA: $ua | User: $username | Note: ";
    if ($isWhitelisted) {
        $entry .= 'Whitelisted';
    } else {
        $entry .= $note;
    }
    $entry .= "\n";
    file_put_contents($logfile, $entry, FILE_APPEND);
}
?> 