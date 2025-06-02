<?php
require_once 'logger.php';
header('Content-Type: application/json');

$user = $_POST['user'] ?? 'anonymous';
$action = $_POST['action'] ?? 'unknown_action';
$details = $_POST['details'] ?? '';

if ($user && $action) {
    log_action($user, $action, $details);
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'error' => 'Missing user or action']);
} 