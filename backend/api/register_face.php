<?php
/**
 * Register Face API
 * Saves a face descriptor first, then details can be attached in a second step.
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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$conn = getDBConnection();
$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['descriptor']) || !is_array($input['descriptor']) || count($input['descriptor']) === 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Face descriptor is required']);
    exit;
}

$descriptor = array_map('floatval', $input['descriptor']);
$descriptorJson = $conn->real_escape_string(json_encode($descriptor));

$sql = "INSERT INTO registered_faces (descriptor_json) VALUES ('$descriptorJson')";

if ($conn->query($sql) === TRUE) {
    echo json_encode([
        'success' => true,
        'message' => 'Face registered. Add person details next.',
        'person_id' => intval($conn->insert_id)
    ]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error registering face: ' . $conn->error]);
}

$conn->close();
