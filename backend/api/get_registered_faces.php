<?php
/**
 * Get Registered Faces API
 * Returns registered faces that have person names for live recognition.
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

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$conn = getDBConnection();
$sql = "SELECT id, person_name, person_notes, descriptor_json, created_at, updated_at
        FROM registered_faces
        WHERE person_name IS NOT NULL AND person_name != ''
        ORDER BY updated_at DESC";

$result = $conn->query($sql);
$faces = [];

if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $descriptor = json_decode($row['descriptor_json'], true);
        if (!is_array($descriptor)) {
            $descriptor = [];
        }

        $faces[] = [
            'id' => intval($row['id']),
            'person_name' => $row['person_name'],
            'person_notes' => $row['person_notes'],
            'descriptor' => $descriptor,
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at']
        ];
    }
}

echo json_encode([
    'success' => true,
    'faces' => $faces
]);

$conn->close();
