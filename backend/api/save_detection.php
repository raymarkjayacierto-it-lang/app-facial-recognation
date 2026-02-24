<?php
/**
 * Save Detection API
 * Receives detection data from frontend and saves to database
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
require_once '../config.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$conn = getDBConnection();

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

// Validate input
if (!isset($input['male_count']) || !isset($input['female_count']) || !isset($input['pair_result'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing required fields']);
    exit;
}

$maleCount = intval($input['male_count']);
$femaleCount = intval($input['female_count']);
$pairResult = $conn->real_escape_string($input['pair_result']);
$expressionsJson = isset($input['expressions_json']) ? $conn->real_escape_string($input['expressions_json']) : '';
$dominantExpression = isset($input['dominant_expression']) ? $conn->real_escape_string($input['dominant_expression']) : '';
$averageAge = isset($input['average_age']) ? floatval($input['average_age']) : 0;

// Insert detection record
$sql = "INSERT INTO detections (male_count, female_count, pair_result, expressions_json, dominant_expression, average_age) 
        VALUES ($maleCount, $femaleCount, '$pairResult', '$expressionsJson', '$dominantExpression', $averageAge)";

if ($conn->query($sql) === TRUE) {
    $detectionId = $conn->insert_id;

    // Update statistics
    updateStatistics($conn, $pairResult);

    echo json_encode(['success' => true, 'message' => 'Detection saved successfully', 'id' => $detectionId]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error saving detection: ' . $conn->error]);
}

$conn->close();

/**
 * Update statistics table based on pair result
 */
function updateStatistics($conn, $pairResult)
{
    // Get current statistics
    $sql = "SELECT * FROM statistics WHERE id = 1";
    $result = $conn->query($sql);

    if ($result && $result->num_rows > 0) {
        $stats = $result->fetch_assoc();

        $totalDetections = $stats['total_detections'] + 1;
        $matches = $stats['matches'];
        $notMatches = $stats['not_matches'];
        $neutral = $stats['neutral'];

        if ($pairResult === 'Match') {
            $matches++;
        } elseif ($pairResult === 'Not Match') {
            $notMatches++;
        } else {
            $neutral++;
        }

        // Update statistics
        $sql = "UPDATE statistics SET 
                total_detections = $totalDetections, 
                matches = $matches, 
                not_matches = $notMatches, 
                neutral = $neutral 
                WHERE id = 1";

        $conn->query($sql);
    }
}
