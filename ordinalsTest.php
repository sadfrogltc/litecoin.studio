<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $inscription = htmlspecialchars($_POST["inscription"]);

    // URL of the local server from which to fetch the content
    $local_url = "http://192.168.1.13:8080/content/" . urlencode($inscription);

    // Fetch the content from the local server
    $content = file_get_contents($local_url);

    if ($content !== false) {
        // Detect MIME type
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime_type = $finfo->buffer($content);

        // Serve the content back to the user
        header("Content-Type: $mime_type");
        echo $content;
    } else {
        http_response_code(404);
        echo "Content not found or failed to fetch.";
    }
} else {
    // Display a simple form for input
    echo '<form method="post">
            <label for="inscription">Enter Inscription ID:</label><br><br>
            <input type="text" id="inscription" name="inscription" placeholder="Paste the inscription ID here" required><br><br>
            <input type="submit" value="Fetch Content">
          </form>';
}
?>
