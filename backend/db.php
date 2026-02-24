<?php
/**
 * Database Setup Script
 * Run this file once to create the database and tables
 */

require_once 'config.php';

$conn = getDBConnection();

// Create detections table
$sql = "CREATE TABLE IF NOT EXISTS detections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    male_count INT NOT NULL DEFAULT 0,
    female_count INT NOT NULL DEFAULT 0,
    pair_result VARCHAR(50) NOT NULL,
    expressions_json TEXT,
    dominant_expression VARCHAR(50),
    average_age DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";

if ($conn->query($sql) === TRUE) {
    echo "Table 'detections' created successfully<br>";
} else {
    echo "Error creating detections table: " . $conn->error . "<br>";
}

// Create statistics table
$sql = "CREATE TABLE IF NOT EXISTS statistics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    total_detections INT NOT NULL DEFAULT 0,
    matches INT NOT NULL DEFAULT 0,
    not_matches INT NOT NULL DEFAULT 0,
    neutral INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";

if ($conn->query($sql) === TRUE) {
    echo "Table 'statistics' created successfully<br>";
} else {
    echo "Error creating statistics table: " . $conn->error . "<br>";
}

// Insert initial statistics record if not exists
$sql = "INSERT INTO statistics (id, total_detections, matches, not_matches, neutral) 
        SELECT 1, 0, 0, 0, 0 
        WHERE NOT EXISTS (SELECT 1 FROM statistics WHERE id = 1)";

if ($conn->query($sql) === TRUE) {
    echo "Initial statistics record created<br>";
} else {
    echo "Error creating initial statistics: " . $conn->error . "<br>";
}

// Create registered faces table
$sql = "CREATE TABLE IF NOT EXISTS registered_faces (
    id INT AUTO_INCREMENT PRIMARY KEY,
    person_name VARCHAR(150) DEFAULT NULL,
    person_notes TEXT,
    descriptor_json LONGTEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";

if ($conn->query($sql) === TRUE) {
    echo "Table 'registered_faces' created successfully<br>";
} else {
    echo "Error creating registered_faces table: " . $conn->error . "<br>";
}

echo "<br>Database setup completed!";
$conn->close();
