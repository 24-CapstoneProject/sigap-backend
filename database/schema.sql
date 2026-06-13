-- =============================================
-- SIGAP Database Schema
-- Universitas Tadulako - Gedung SG
-- =============================================

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS sigap_db;
USE sigap_db;

SET FOREIGN_KEY_CHECKS = 0;

-- =============================================
-- Users Table
-- =============================================
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  nim VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  prodi VARCHAR(100),
  address TEXT,
  avatar VARCHAR(255),
  role ENUM('mahasiswa', 'admin') DEFAULT 'mahasiswa',
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_nim (nim),
  INDEX idx_email (email),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Rooms Table
-- =============================================
CREATE TABLE IF NOT EXISTS rooms (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  capacity INT NOT NULL,
  floor INT NOT NULL,
  location VARCHAR(255),
  features JSON,
  status ENUM('available', 'maintenance', 'unavailable') DEFAULT 'available',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_floor (floor),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Bookings Table
-- =============================================
CREATE TABLE IF NOT EXISTS bookings (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  room_id VARCHAR(36) NOT NULL,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration INT,
  course_code VARCHAR(50),
  course_name VARCHAR(255),
  lecturer VARCHAR(100),
  status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
  reject_reason TEXT,
  admin_notes TEXT,
  approved_at TIMESTAMP NULL,
  rejected_at TIMESTAMP NULL,
  cancelled_at TIMESTAMP NULL,
  proof_image VARCHAR(255) NULL,
  rescheduled_from_booking_id VARCHAR(36) NULL,
  reschedule_reason TEXT NULL,
  wants_infocus TINYINT(1) DEFAULT 0,
  assigned_infocus_id VARCHAR(36) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (rescheduled_from_booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_infocus_id) REFERENCES inventory(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_room_id (room_id),
  INDEX idx_booking_date (booking_date),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Inventory Table
-- =============================================
CREATE TABLE IF NOT EXISTS inventory (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  quantity INT DEFAULT 0,
  category VARCHAR(100),
  location VARCHAR(255),
  status ENUM('available', 'maintenance', 'unavailable') DEFAULT 'available',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Inventory Loans Table
-- =============================================
CREATE TABLE IF NOT EXISTS inventory_loans (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  inventory_id VARCHAR(36) NOT NULL,
  ktp_number VARCHAR(50),
  status ENUM('borrowed', 'returned', 'lost', 'damaged') DEFAULT 'borrowed',
  condition_borrowed VARCHAR(100),
  condition_returned VARCHAR(100),
  borrowed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  returned_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_inventory_id (inventory_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Lost & Found Table
-- =============================================
CREATE TABLE IF NOT EXISTS lost_found (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  type ENUM('lost', 'found') NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  description TEXT,
  location VARCHAR(255),
  date_occurred DATE,
  category VARCHAR(100) DEFAULT 'Dititipkan di penjaga SG',
  status ENUM('pending', 'claimed', 'returned', 'archived') DEFAULT 'pending',
  admin_notes TEXT,
  image VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_type (type),
  INDEX idx_status (status),
  INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Lost & Found Claims Table
-- =============================================
CREATE TABLE IF NOT EXISTS lost_found_claims (
  id VARCHAR(36) PRIMARY KEY,
  lost_found_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  message TEXT,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  reject_reason TEXT,
  approved_at TIMESTAMP NULL,
  rejected_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (lost_found_id) REFERENCES lost_found(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_lost_found_id (lost_found_id),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  UNIQUE KEY unique_claim (lost_found_id, user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Create Indexes for Better Performance
-- =============================================
CREATE INDEX idx_bookings_user_date ON bookings(user_id, booking_date);
CREATE INDEX idx_loans_borrowed_date ON inventory_loans(borrowed_at);
CREATE INDEX idx_lostfound_date ON lost_found(date_occurred);

-- =============================================
-- Create Views for Common Queries
-- =============================================

-- View for available rooms today
CREATE OR REPLACE VIEW available_rooms_today AS
SELECT DISTINCT r.* FROM rooms r
LEFT JOIN bookings b ON r.id = b.room_id 
  AND DATE(b.booking_date) = CURDATE() 
  AND b.status IN ('approved', 'pending')
WHERE b.id IS NULL AND r.status = 'available';

-- View for pending bookings
CREATE OR REPLACE VIEW pending_bookings AS
SELECT 
  b.*,
  r.name as room_name,
  r.capacity,
  u.name as user_name,
  u.nim
FROM bookings b
JOIN rooms r ON b.room_id = r.id
JOIN users u ON b.user_id = u.id
WHERE b.status = 'pending'
ORDER BY b.created_at DESC;

-- View for active loans
CREATE OR REPLACE VIEW active_loans AS
SELECT 
  il.*,
  i.name as item_name,
  u.name as user_name,
  u.nim,
  u.email
FROM inventory_loans il
JOIN inventory i ON il.inventory_id = i.id
JOIN users u ON il.user_id = u.id
WHERE il.status = 'borrowed'
ORDER BY il.borrowed_at DESC;
