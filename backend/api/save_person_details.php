<?php
/**
 * Save Person Details API
 * Updates an existing registered face with person details such as name.
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

$personId = isset($input['person_id']) ? intval($input['person_id']) : 0;
$personName = isset($input['person_name']) ? trim($input['person_name']) : '';
$personNotes = isset($input['person_notes']) ? trim($input['person_notes']) : '';

if ($personId <= 0 || $personName === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'person_id and person_name are required']);
    exit;
}

$personNameEscaped = $conn->real_escape_string($personName);
$personNotesEscaped = $conn->real_escape_string($personNotes);

$sql = "UPDATE registered_faces
        SET person_name = '$personNameEscaped', person_notes = '$personNotesEscaped'
        WHERE id = $personId";

if ($conn->query($sql) === TRUE) {
    if ($conn->affected_rows > 0) {
        echo json_encode(['success' => true, 'message' => 'Person details saved successfully']);
    } else {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Registered face not found']);
    }
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error saving person details: ' . $conn->error]);
}

$conn->close();
