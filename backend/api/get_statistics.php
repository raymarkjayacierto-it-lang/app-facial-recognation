<?php
/**
 * Get Statistics API
 * Returns detection statistics from database
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
require_once '../config.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$conn = getDBConnection();

// Get statistics
$sql = "SELECT * FROM statistics WHERE id = 1";
$result = $conn->query($sql);

if ($result && $result->num_rows > 0) {
    $stats = $result->fetch_assoc();

    // Get recent detections
    $sql = "SELECT * FROM detections ORDER BY created_at DESC LIMIT 10";
    $detectionsResult = $conn->query($sql);

    $recentDetections = [];
    if ($detectionsResult && $detectionsResult->num_rows > 0) {
        while ($row = $detectionsResult->fetch_assoc()) {
            $recentDetections[] = $row;
        }
    }

    // Get expression breakdown
    $sql = "SELECT dominant_expression, COUNT(*) as count FROM detections 
            WHERE dominant_expression != '' GROUP BY dominant_expression";
    $expressionResult = $conn->query($sql);

    $expressions = [];
    if ($expressionResult && $expressionResult->num_rows > 0) {
        while ($row = $expressionResult->fetch_assoc()) {
            $expressions[$row['dominant_expression']] = $row['count'];
        }
    }

    echo json_encode([
        'success' => true,
        'statistics' => $stats,
        'recent_detections' => $recentDetections,
        'expressions' => $expressions
    ]);
} else {
    echo json_encode([
        'success' => false,
        'message' => 'No statistics found'
    ]);
}

$conn->close();
