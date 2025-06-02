<?php
function log_action($user, $action, $details = '', $ip = null) {
    $logDir = __DIR__ . '/logs';
    $logfile = $logDir . '/actions.log';
    if (!is_dir($logDir)) {
        mkdir($logDir, 0775, true);
    }
    // Log rotation: 5MB max
    if (file_exists($logfile) && filesize($logfile) > 5 * 1024 * 1024) {
        $archive = $logDir . '/actions_' . date('Ymd_His') . '.log';
        rename($logfile, $archive);
    }
    if ($ip === null) {
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    }
    $entry = date('Y-m-d H:i:s') . " | User: $user | Action: $action | Details: $details | IP: $ip\n";
    file_put_contents($logfile, $entry, FILE_APPEND);
}
?> 