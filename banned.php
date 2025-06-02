<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Access Denied</title>
    <link rel="stylesheet" href="style.css">
    <style>
        body {
            font-family: 'Nunito', sans-serif;
            background: linear-gradient(135deg, #4c51ff, #6f74ff);
            color: #fff;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
            box-sizing: border-box;
            text-align: center;
        }
        .container {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            max-width: 600px;
            width: 100%;
        }
        h1 {
            font-size: 2.5em;
            margin-bottom: 20px;
            color: #fff;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        p {
            font-size: 1.1em;
            line-height: 1.6;
            margin-bottom: 15px;
        }
        .reason {
            font-weight: bold;
            color: #ffdd57;
        }
        .expiry {
            font-style: italic;
            color: #aaffaa;
        }
        .back-link {
            display: inline-block;
            margin-top: 30px;
            padding: 10px 25px;
            background: #fff;
            color: #4c51ff;
            text-decoration: none;
            border-radius: 12px;
            font-weight: 700;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .back-link:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.15);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Access Denied</h1>
        <?php
        $reason = $_GET['reason'] ?? 'Access to this service is restricted.';
        $expiry = $_GET['expiry'] ?? '';
        ?>
        <p>Your access has been denied. <span class="reason">Reason: <?= htmlspecialchars($reason) ?></span></p>
        <?php if (!empty($expiry)): ?>
            <p><span class="expiry">Your ban expires at: <?= htmlspecialchars($expiry) ?></span></p>
        <?php endif; ?>
        <p>If you believe this is an error, please contact support.</p>
        <a href="/" class="back-link">Go to Homepage</a>
    </div>
</body>
</html> 