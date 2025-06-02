<?php
require_once __DIR__ . '/access_logger.php';
log_access('admin');

session_start();

// --- CONFIG ---
$ADMIN_USER = 'admin';
$ADMIN_PASS = 'admin123'; // Change this!
$LOG_FILE = __DIR__ . '/logs/actions.log';

// --- HANDLE LOGOUT ---
if (isset($_GET['logout'])) {
    require_once __DIR__ . '/logger.php';
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    log_action($ADMIN_USER, 'admin_logout', 'Admin logged out', $ip);
    session_destroy();
    header('Location: admin.php');
    exit();
}

// --- HANDLE LOGIN ---
if (isset($_POST['username'], $_POST['password'])) {
    if ($_POST['username'] === $ADMIN_USER && $_POST['password'] === $ADMIN_PASS) {
        $_SESSION['admin_logged_in'] = true;
    } else {
        $login_error = 'Invalid username or password';
    }
}

// --- Parse access logs ---
$accessLogs = [];
$ipCounts = [];
if (file_exists(__DIR__ . '/logs/access.log')) {
    $lines = array_reverse(file(__DIR__ . '/logs/access.log', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES));
    foreach ($lines as $line) {
        if (preg_match('/^(.*?) \| IP: (.*?) \| UA: (.*?) \| User: (.*?) \| Note: (.*)$/', $line, $m)) {
            $accessLogs[] = [
                'datetime' => $m[1],
                'ip' => $m[2],
                'ua' => $m[3],
                'user' => $m[4],
                'note' => $m[5],
            ];
            $ipCounts[$m[2]] = ($ipCounts[$m[2]] ?? 0) + 1;
        }
    }
}
function threat_level($log, $ipCounts) {
    $ua = strtolower($log['ua']);
    $ip = $log['ip'];
    $badUAs = ['sqlmap', 'curl', 'python-requests', 'nmap', 'nikto', 'wpscan', 'fuzz', 'acunetix', 'dirbuster', 'masscan', 'zmeu', 'havij', 'netsparker', 'w3af', 'nessus', 'openvas', 'arachni', 'libwww-perl', 'winhttp', 'wininet', 'scan', 'bot', 'crawler', 'spider'];
    foreach ($badUAs as $bad) {
        if (strpos($ua, $bad) !== false) return 'High';
    }
    if ($ua === '' || $ua === 'unknown') return 'High';
    if ($ipCounts[$ip] > 5) return 'High';
    if ($ipCounts[$ip] > 3) return 'Medium';
    if (strpos($ua, 'python') !== false || strpos($ua, 'java') !== false || strpos($ua, 'go-http-client') !== false) return 'Medium';
    return 'Low';
}

// --- Whitelist/Banlist Management ---

// Handle add/remove IPs
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['ip_action'], $_POST['ip_value'])) {
    $ip = trim($_POST['ip_value']);
    if (filter_var($ip, FILTER_VALIDATE_IP)) {
        if ($_POST['ip_action'] === 'add_whitelist' && !in_array($ip, $whitelist)) {
            file_put_contents($whitelistFile, $ip."\n", FILE_APPEND);
            $whitelist[] = $ip;
        } elseif ($_POST['ip_action'] === 'remove_whitelist') {
            $whitelist = array_diff($whitelist, [$ip]);
            file_put_contents($whitelistFile, implode("\n", $whitelist) . "\n");
        } elseif ($_POST['ip_action'] === 'remove_banlist') {
            $banlist = array_diff($banlist, [$ip]);
            file_put_contents($banlistFile, implode("\n", $banlist) . "\n");
        } elseif ($_POST['ip_action'] === 'add_ban') {
            $duration = (int)($_POST['ban_duration'] ?? 600);
            $reason = trim($_POST['ban_reason'] ?? 'Temporary ban');
            if ($duration === 0) { // Permanent ban
                if (!in_array($ip, $banlist)) {
                    file_put_contents($banlistFile, $ip."\n", FILE_APPEND);
                    $banlist[] = $ip;
                }
            } else { // Temporary ban
                add_tempban($ip, $duration, $reason);
            }
        }
    }
    // Refresh to avoid resubmission
    header('Location: admin.php');
    exit();
}

// --- Whitelist/Banlist Management (data initialization) ---
require_once __DIR__ . '/access_logger.php';
$tempbans = get_tempbans();

$logDir = __DIR__ . '/logs';
$whitelistFile = $logDir . '/whitelist.txt';
$banlistFile = $logDir . '/banlist.txt';
$whitelist = file_exists($whitelistFile) ? array_filter(array_map('trim', file($whitelistFile))) : [];
$banlist = file_exists($banlistFile) ? array_filter(array_map('trim', file($banlistFile))) : [];

// --- Server Stats ---
function get_server_stats() {
    $stats = [];
    // CPU Load
    $load = sys_getloadavg();
    $stats['cpu'] = $load[0];
    // Memory
    $meminfo = @file_get_contents('/proc/meminfo');
    if ($meminfo) {
        preg_match('/MemTotal:\s+(\d+)/', $meminfo, $mt);
        preg_match('/MemAvailable:\s+(\d+)/', $meminfo, $ma);
        $stats['mem_total'] = round($mt[1]/1024, 1);
        $stats['mem_avail'] = round($ma[1]/1024, 1);
        $stats['mem_used'] = $stats['mem_total'] - $stats['mem_avail'];
    }
    // Disk
    $stats['disk_total'] = round(disk_total_space("/")/1024/1024/1024, 2);
    $stats['disk_free'] = round(disk_free_space("/")/1024/1024/1024, 2);
    $stats['disk_used'] = $stats['disk_total'] - $stats['disk_free'];
    // Uptime
    $uptime = @file_get_contents('/proc/uptime');
    if ($uptime) {
        $secs = (int)floatval(explode(' ', $uptime)[0]);
        $days = floor($secs/86400);
        $hours = floor(($secs%86400)/3600);
        $mins = floor(($secs%3600)/60);
        $stats['uptime'] = "$days d $hours h $mins m";
    }
    // Network
    $net = @file_get_contents('/proc/net/dev');
    if ($net) {
        $lines = explode("\n", $net);
        $rx = $tx = 0;
        foreach ($lines as $line) {
            if (preg_match('/^(eth\d|enp|wlan\d|eno|ens|br-\w+|docker\w+|veth\w+):/', trim($line))) {
                $cols = preg_split('/\s+/', trim($line));
                $rx += (int)$cols[1];
                $tx += (int)$cols[9];
            }
        }
        $stats['net_rx'] = round($rx/1024/1024, 2);
        $stats['net_tx'] = round($tx/1024/1024, 2);
    }
    return $stats;
}
$serverStats = get_server_stats();

?><!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard</title>
    <link rel="stylesheet" href="style.css">
    <style>
        .admin-container { max-width: 900px; margin: 40px auto; background: #fff; border-radius: 24px; box-shadow: 0 2px 12px 0 rgba(76,81,255,0.06); padding: 32px; }
        .admin-title { font-size: 2rem; font-weight: 700; margin-bottom: 24px; text-align: center; }
        .admin-form { display: flex; flex-direction: column; gap: 18px; }
        .admin-table { width: 100%; border-collapse: collapse; margin-top: 24px; }
        .admin-table th, .admin-table td { padding: 10px 8px; border-bottom: 1px solid #eee; text-align: left; }
        .admin-table th { background: #f3f4f6; }
        .logout-btn { float: right; margin-top: -10px; }
        .login-error { color: #ff5858; text-align: center; margin-bottom: 12px; }
        .user-tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
        .user-tab { background: #e0e7ff; color: #222; border-radius: 16px; padding: 6px 18px; cursor: pointer; border: none; font-weight: 600; transition: background 0.2s; }
        .user-tab.active, .user-tab:hover { background: #4c51ff; color: #fff; }
        .search-box { margin-bottom: 16px; padding: 8px 14px; border-radius: 12px; border: 1px solid #ddd; width: 100%; max-width: 350px; font-size: 1rem; }
        @media (max-width: 700px) { .admin-container { padding: 10px; } }
    </style>
</head>
<body>
<div class="admin-container">
<?php if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true): ?>
    <div class="admin-title">Admin Login</div>
    <?php if (!empty($login_error)): ?><div class="login-error"><?= htmlspecialchars($login_error) ?></div><?php endif; ?>
    <form method="post" class="admin-form">
        <label for="username">Username</label>
        <input type="text" name="username" id="username" required autofocus>
        <label for="password">Password</label>
        <input type="password" name="password" id="password" required>
        <button type="submit" class="modal-button">Login</button>
    </form>
<?php else: ?>
    <div class="admin-title">Admin Dashboard
        <a href="?logout=1" class="modal-button logout-btn" style="width:auto;padding:8px 18px;font-size:1rem;">Logout</a>
    </div>
    <div class="admin-tabs" style="display:flex;gap:12px;margin-bottom:18px;">
        <button id="tabUserActions" class="admin-tab active">User Actions</button>
        <button id="tabAccessLogs" class="admin-tab">Access Logs</button>
    </div>
    <div id="userActionsSection">
        <h3>Recent User Actions</h3>
        <?php
        // Parse logs for unique users and all logs
        $logs = [];
        $users = [];
        if (file_exists($LOG_FILE)) {
            $lines = array_reverse(file($LOG_FILE, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES));
            foreach (array_slice($lines, 0, 1000) as $line) {
                if (preg_match('/^(.*?) \| User: (.*?) \| Action: (.*?) \| Details: (.*?) \| IP: (.*)$/', $line, $m)) {
                    $logs[] = [
                        'datetime' => $m[1],
                        'user' => $m[2],
                        'action' => $m[3],
                        'details' => $m[4],
                        'ip' => $m[5],
                    ];
                    $users[$m[2]] = true;
                }
            }
        }
        $userList = array_keys($users);
        ?>
        <div class="user-tabs" id="userTabs">
            <button class="user-tab active" data-user="all">All Users</button>
            <?php
            $MAX_USERS = 5;
            $userCount = count($userList);
            $mainUsers = array_slice($userList, 0, $MAX_USERS);
            $extraUsers = array_slice($userList, $MAX_USERS);
            foreach ($mainUsers as $user): ?>
                <button class="user-tab" data-user="<?= htmlspecialchars($user) ?>"><?= htmlspecialchars($user) ?></button>
            <?php endforeach; ?>
            <?php if (count($extraUsers) > 0): ?>
                <button class="user-tab" id="moreUsersTab" type="button">More...</button>
            <?php endif; ?>
        </div>
        <?php if (count($extraUsers) > 0): ?>
        <div class="user-tabs" id="extraUserTabs" style="display:none; margin-top:8px;">
            <?php foreach ($extraUsers as $user): ?>
                <button class="user-tab" data-user="<?= htmlspecialchars($user) ?>"><?= htmlspecialchars($user) ?></button>
            <?php endforeach; ?>
        </div>
        <?php endif; ?>
        <input type="text" class="search-box" id="logSearch" placeholder="Search by address, action, or IP..." />
        <div style="max-height:400px;overflow:auto;border-radius:12px;border:1px solid #eee;background:#fafbfc;">
        <table class="admin-table" id="logsTable">
            <thead><tr><th>Date/Time</th><th>User</th><th>Action</th><th>Details</th><th>IP</th></tr></thead>
            <tbody id="logsTableBody">
            <!-- Rows will be rendered by JS -->
            </tbody>
        </table>
        </div>
        <p style="margin-top:24px;color:#888;font-size:0.95em;">Tip: Monitor wallet generations, logins, transactions, and failed attempts for security. Use the search and user tabs to quickly filter logs.</p>
    </div>
    <div id="accessLogsSection" style="display:none;">
        <input type="text" class="search-box" id="accessLogSearch" placeholder="Search by IP, UA, or Threat Level..." />
        <div style="max-height:400px;overflow:auto;border-radius:12px;border:1px solid #eee;background:#fafbfc;">
        <table class="admin-table" id="accessLogsTable">
            <thead><tr><th>Date/Time</th><th>IP</th><th>User Agent</th><th>User</th><th>Note</th><th>Threat Level</th></tr></thead>
            <tbody id="accessLogsTableBody">
            <!-- Rows rendered by JS -->
            </tbody>
        </table>
        </div>
    </div>
    <div class="admin-ip-section" style="margin-top:32px;">
        <h3>Whitelist & Banlist Management</h3>
        <div style="display:flex;gap:32px;flex-wrap:wrap;">
            <div>
                <h4>Whitelisted IPs</h4>
                <form method="post" style="margin-bottom:12px;display:flex;gap:8px;">
                    <input type="text" name="ip_value" placeholder="Add IP" required pattern="^([0-9]{1,3}\.){3}[0-9]{1,3}$" style="padding:6px 12px;border-radius:8px;border:1px solid #ccc;">
                    <button type="submit" name="ip_action" value="add_whitelist" class="modal-button" style="width:auto;padding:8px 18px;font-size:1rem;">Add</button>
                </form>
                <ul style="list-style:none;padding:0;">
                    <?php foreach ($whitelist as $ip): ?>
                    <li style="margin-bottom:6px;display:flex;align-items:center;gap:8px;">
                        <span><?= htmlspecialchars($ip) ?></span>
                        <form method="post" style="display:inline;">
                            <input type="hidden" name="ip_value" value="<?= htmlspecialchars($ip) ?>">
                            <button type="submit" name="ip_action" value="remove_whitelist" style="background:#ff5858;color:#fff;border:none;border-radius:6px;padding:2px 10px;cursor:pointer;">Remove</button>
                        </form>
                    </li>
                    <?php endforeach; ?>
                </ul>
            </div>
            <div>
                <h4>Banned IPs</h4>
                <form method="post" style="margin-bottom:12px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                    <input type="text" name="ip_value" placeholder="Add IP" required pattern="^([0-9]{1,3}\.){3}[0-9]{1,3}$" style="padding:6px 12px;border-radius:8px;border:1px solid #ccc;">
                    <select name="ban_duration" style="padding:6px 8px;border-radius:8px;border:1px solid #ccc;">
                        <option value="600">10 minutes</option>
                        <option value="3600">1 hour</option>
                        <option value="86400">1 day</option>
                        <option value="604800">1 week</option>
                        <option value="2592000">30 days</option>
                        <option value="0">Permanent</option>
                    </select>
                    <input type="text" name="ban_reason" placeholder="Reason (optional)" style="padding:6px 12px;border-radius:8px;border:1px solid #ccc;">
                    <button type="submit" name="ip_action" value="add_ban" class="modal-button" style="width:auto;padding:8px 18px;font-size:1rem;">Ban</button>
                </form>
                <ul style="list-style:none;padding:0;">
                    <?php foreach ($banlist as $ip): ?>
                    <li style="margin-bottom:6px;display:flex;align-items:center;gap:8px;">
                        <span><?= htmlspecialchars($ip) ?> (Permanent)</span>
                        <form method="post" style="display:inline;">
                            <input type="hidden" name="ip_value" value="<?= htmlspecialchars($ip) ?>">
                            <button type="submit" name="ip_action" value="remove_banlist" style="background:#ff5858;color:#fff;border:none;border-radius:6px;padding:2px 10px;cursor:pointer;">Remove</button>
                        </form>
                    </li>
                    <?php endforeach; ?>
                    <?php foreach ($tempbans as $ip => $ban): ?>
                    <li style="margin-bottom:6px;display:flex;align-items:center;gap:8px;">
                        <span><?= htmlspecialchars($ip) ?> (Until <?= htmlspecialchars(date('Y-m-d H:i:s', $ban['expiry'])) ?>)</span>
                        <?php if (!empty($ban['reason'])): ?><span style="color:#888;">Reason: <?= htmlspecialchars($ban['reason']) ?></span><?php endif; ?>
                        <form method="post" style="display:inline;">
                            <input type="hidden" name="ip_value" value="<?= htmlspecialchars($ip) ?>">
                            <button type="submit" name="ip_action" value="remove_tempban" style="background:#ffb347;color:#fff;border:none;border-radius:6px;padding:2px 10px;cursor:pointer;">Unban</button>
                        </form>
                    </li>
                    <?php endforeach; ?>
                </ul>
            </div>
        </div>
    </div>
    <div class="admin-server-stats" style="margin-top:32px;">
        <h3>Server & Network Statistics</h3>
        <div style="display:flex;gap:32px;flex-wrap:wrap;">
            <div>
                <strong>CPU Load:</strong> <?= htmlspecialchars($serverStats['cpu']) ?><br>
                <strong>Memory Used:</strong> <?= htmlspecialchars($serverStats['mem_used'] ?? '?') ?> MB / <?= htmlspecialchars($serverStats['mem_total'] ?? '?') ?> MB<br>
                <strong>Disk Used:</strong> <?= htmlspecialchars($serverStats['disk_used']) ?> GB / <?= htmlspecialchars($serverStats['disk_total']) ?> GB<br>
                <strong>Uptime:</strong> <?= htmlspecialchars($serverStats['uptime'] ?? '?') ?><br>
            </div>
            <div>
                <strong>Network RX:</strong> <?= htmlspecialchars($serverStats['net_rx'] ?? '?') ?> MB<br>
                <strong>Network TX:</strong> <?= htmlspecialchars($serverStats['net_tx'] ?? '?') ?> MB<br>
            </div>
        </div>
        <form method="get" style="margin-top:12px;">
            <button type="submit" class="modal-button" style="width:auto;padding:8px 18px;font-size:1rem;">Refresh Stats</button>
        </form>
    </div>
    <script>
    const logs = <?php echo json_encode($logs); ?>;
    let currentUser = 'all';
    let currentSearch = '';
    const MAX_LOGS = 100; // Maximum number of logs to display
    function renderLogs() {
        const tbody = document.getElementById('logsTableBody');
        tbody.innerHTML = '';
        let count = 0;
        let shown = 0;
        logs.forEach(log => {
            if ((currentUser === 'all' || log.user === currentUser) &&
                (currentSearch === '' || log.user.toLowerCase().includes(currentSearch) || log.action.toLowerCase().includes(currentSearch) || log.details.toLowerCase().includes(currentSearch) || log.ip.toLowerCase().includes(currentSearch))) {
                if (shown < MAX_LOGS) {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `<td>${log.datetime}</td><td>${log.user}</td><td>${log.action}</td><td>${log.details}</td><td>${log.ip}</td>`;
                    tbody.appendChild(tr);
                    shown++;
                }
                count++;
            }
        });
        if (shown === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td colspan="5">No logs found.</td>';
            tbody.appendChild(tr);
        }
    }
    document.querySelectorAll('.user-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.user-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            currentUser = this.dataset.user;
            renderLogs();
        });
    });
    document.getElementById('logSearch').addEventListener('input', function() {
        currentSearch = this.value.trim().toLowerCase();
        renderLogs();
    });
    renderLogs();
    // More users tab toggle
    const moreTab = document.getElementById('moreUsersTab');
    const extraTabs = document.getElementById('extraUserTabs');
    if (moreTab && extraTabs) {
        moreTab.addEventListener('click', function() {
            if (extraTabs.style.display === 'none') {
                extraTabs.style.display = 'flex';
                moreTab.textContent = 'Less...';
            } else {
                extraTabs.style.display = 'none';
                moreTab.textContent = 'More...';
            }
        });
    }
    // Tab switching
    const tabUserActions = document.getElementById('tabUserActions');
    const tabAccessLogs = document.getElementById('tabAccessLogs');
    const userActionsSection = document.getElementById('userActionsSection');
    const accessLogsSection = document.getElementById('accessLogsSection');
    tabUserActions.addEventListener('click', function() {
        tabUserActions.classList.add('active');
        tabAccessLogs.classList.remove('active');
        userActionsSection.style.display = '';
        accessLogsSection.style.display = 'none';
    });
    tabAccessLogs.addEventListener('click', function() {
        tabAccessLogs.classList.add('active');
        tabUserActions.classList.remove('active');
        userActionsSection.style.display = 'none';
        accessLogsSection.style.display = '';
    });
    // Render access logs
    const accessLogs = <?php echo json_encode($accessLogs); ?>;
    const ipCounts = <?php echo json_encode($ipCounts); ?>;
    function threatLevelJS(log) {
        const ua = (log.ua||'').toLowerCase();
        const ip = log.ip;
        const badUAs = ['sqlmap','curl','python-requests','nmap','nikto','wpscan','fuzz','acunetix','dirbuster','masscan','zmeu','havij','netsparker','w3af','nessus','openvas','arachni','libwww-perl','winhttp','wininet','scan','bot','crawler','spider'];
        for (let i=0; i<badUAs.length; i++) {
            if (ua.includes(badUAs[i])) return 'High';
        }
        if (ua === '' || ua === 'unknown') return 'High';
        if (ipCounts[ip] > 5) return 'High';
        if (ipCounts[ip] > 3) return 'Medium';
        if (ua.includes('python') || ua.includes('java') || ua.includes('go-http-client')) return 'Medium';
        return 'Low';
    }
    function renderAccessLogs() {
        const tbody = document.getElementById('accessLogsTableBody');
        const search = (document.getElementById('accessLogSearch').value||'').toLowerCase();
        tbody.innerHTML = '';
        let count = 0;
        accessLogs.forEach(log => {
            const threat = threatLevelJS(log);
            if (
                search === '' ||
                log.ip.toLowerCase().includes(search) ||
                log.ua.toLowerCase().includes(search) ||
                threat.toLowerCase().includes(search)
            ) {
                const tr = document.createElement('tr');
                let color = threat === 'High' ? '#ff5858' : (threat === 'Medium' ? '#ffb347' : '#43e97b');
                tr.innerHTML = `<td>${log.datetime}</td><td>${log.ip}</td><td style="max-width:180px;overflow-x:auto;">${log.ua}</td><td>${log.user}</td><td>${log.note}</td><td style="font-weight:bold;color:${color}">${threat}</td>`;
                tbody.appendChild(tr);
                count++;
            }
        });
        if (count === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td colspan="6">No access logs found.</td>';
            tbody.appendChild(tr);
        }
    }
    document.getElementById('accessLogSearch').addEventListener('input', renderAccessLogs);
    renderAccessLogs();
    </script>
<?php endif; ?>
</div>
</body>
</html> 