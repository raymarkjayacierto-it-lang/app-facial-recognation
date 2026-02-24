<?php
/**
 * Database Configuration
 * Update these values according to your MySQL setup
 */

define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'facial_recognition');

// Create database connection
function getDBConnection()
{
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS);

    if ($conn->connect_error) {
        die("Connection failed: " . $conn->connect_error);
    }

    // Create database if not exists
    $sql = "CREATE DATABASE IF NOT EXISTS " . DB_NAME;
    if ($conn->query($sql) === TRUE) {
        $conn->select_db(DB_NAME);
    } else {
        die("Error creating database: " . $conn->error);
    }

    return $conn;
}
