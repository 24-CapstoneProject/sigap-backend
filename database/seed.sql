-- =============================================
-- SIGAP Database Seed Data
-- =============================================

USE sigap_db;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE lost_found_claims;
TRUNCATE TABLE lost_found;
TRUNCATE TABLE inventory_loans;
TRUNCATE TABLE inventory;
TRUNCATE TABLE bookings;
TRUNCATE TABLE rooms;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- =============================================
-- Admin User (password: admin123)
-- =============================================
INSERT INTO users (id, nim, email, name, password_hash, phone, prodi, role) VALUES
('admin-001', 'ADMIN001', 'admin@untad.ac.id', 'Administrator', '$2a$10$5FaXnqbQFV2jN63eU60mxeQDtmIFWFtc5SHY9oVRLgzsz61dLH3KW', '081234567890', 'Administrasi', 'admin');

-- =============================================
-- Student Users (password: 123456)
-- =============================================
INSERT INTO users (id, nim, email, name, password_hash, phone, prodi, role) VALUES
('user-001', 'F55123064', 'syaif.ali@student.untad.ac.id', 'Syaif Ali M. Risal', '$2a$10$5FaXnqbQFV2jN63eU60mxej7f1VPjR6blqoSVEBHkZazvslgXI9Wy', '081234567890', 'Teknik Informatika', 'mahasiswa'),
('user-002', 'F52123083', 'safana.annisa@student.untad.ac.id', 'Safana Annisa Salsabilah', '$2a$10$5FaXnqbQFV2jN63eU60mxej7f1VPjR6blqoSVEBHkZazvslgXI9Wy', '081234567891', 'Teknik Informatika', 'mahasiswa'),
('user-003', 'F52123084', 'roni.wijaya@student.untad.ac.id', 'Roni Wijaya', '$2a$10$5FaXnqbQFV2jN63eU60mxej7f1VPjR6blqoSVEBHkZazvslgXI9Wy', '081234567892', 'Teknik Informatika', 'mahasiswa'),
('user-004', 'F55123015', 'andi.pratama@student.untad.ac.id', 'Andi Pratama', '$2a$10$5FaXnqbQFV2jN63eU60mxej7f1VPjR6blqoSVEBHkZazvslgXI9Wy', '081234567893', 'Teknik Informatika', 'mahasiswa');

-- =============================================
-- Rooms
-- =============================================
INSERT INTO rooms (id, name, capacity, floor, location, features, status) VALUES
('room-001', 'F.F 01', 40, 1, 'Gedung SG Lantai 1', '["Proyektor", "AC", "Papan Tulis"]', 'available'),
('room-002', 'F.F 02', 40, 1, 'Gedung SG Lantai 1', '["Proyektor", "AC", "Papan Tulis"]', 'available'),
('room-003', 'F.F 03', 35, 1, 'Gedung SG Lantai 1', '["Proyektor", "AC"]', 'available'),
('room-004', 'F.F 04', 40, 1, 'Gedung SG Lantai 1', '["Proyektor", "AC", "Papan Tulis"]', 'available'),
('room-005', 'F.F 05', 30, 1, 'Gedung SG Lantai 1', '["Proyektor", "AC"]', 'available'),
('room-006', 'F.F 06', 40, 1, 'Gedung SG Lantai 1', '["Proyektor", "AC", "Papan Tulis", "Lab Komputer"]', 'available'),
('room-007', 'F.F 07', 40, 2, 'Gedung SG Lantai 2', '["Proyektor", "AC", "Papan Tulis"]', 'available'),
('room-008', 'F.F 08', 35, 2, 'Gedung SG Lantai 2', '["Proyektor", "AC"]', 'available'),
('room-009', 'F.F 09', 40, 2, 'Gedung SG Lantai 2', '["Proyektor", "AC", "Papan Tulis"]', 'available'),
('room-010', 'F.F 10', 40, 2, 'Gedung SG Lantai 2', '["Proyektor", "AC", "Papan Tulis"]', 'available'),
('room-011', 'F.F 11', 30, 2, 'Gedung SG Lantai 2', '["Proyektor", "AC", "Lab Komputer"]', 'available'),
('room-012', 'F.F 12', 40, 2, 'Gedung SG Lantai 2', '["Proyektor", "AC", "Papan Tulis"]', 'available');

-- =============================================
-- Bookings
-- =============================================
INSERT INTO bookings (id, user_id, room_id, booking_date, start_time, end_time, duration, course_code, course_name, lecturer, status) VALUES
('booking-001', 'user-001', 'room-001', DATE_ADD(CURDATE(), INTERVAL 1 DAY), '08:00:00', '10:00:00', 2, 'IF001', 'Capstone Project', 'Dr. Ir. Ahmad Fauzi, M.T.', 'approved'),
('booking-002', 'user-001', 'room-007', DATE_ADD(CURDATE(), INTERVAL 2 DAY), '10:00:00', '13:00:00', 3, 'IF002', 'Rekayasa Sistem Lanjutan', 'Dr. Siti Rahma, S.Kom., M.Cs.', 'pending'),
('booking-003', 'user-002', 'room-002', DATE_ADD(CURDATE(), INTERVAL 1 DAY), '13:00:00', '15:00:00', 2, 'IF003', 'Sistem Informasi Manajemen', 'Prof. Hariyanto, Ph.D.', 'approved'),
('booking-004', 'user-002', 'room-006', DATE_ADD(CURDATE(), INTERVAL 3 DAY), '08:00:00', '11:00:00', 3, 'IF004', 'Algoritma dan Pemrograman', 'Rina Susanti, M.T.', 'pending');

-- =============================================
-- Inventory Items
-- =============================================
INSERT INTO inventory (id, name, description, quantity, category, location, status) VALUES
('inv-001', 'Proyektor', 'Proyektor Epson EB-X51', 5, 'Elektronik', 'Ruang Penyimpanan Gedung SG', 'available'),
('inv-002', 'Laptop', 'Laptop Dell Inspiron 15', 3, 'Komputer', 'Ruang Lab Lantai 2', 'available'),
('inv-003', 'Papan Tulis', 'Papan Tulis Whiteboard', 10, 'Alat Tulis', 'Ruang Penyimpanan', 'available'),
('inv-004', 'AC', 'Pendingin Ruangan', 8, 'Elektronik', 'Ruang Teknis', 'available'),
('inv-005', 'Kamera Dokumentasi', 'Kamera Canon EOS 600D', 2, 'Elektronik', 'Ruang Penyimpanan Gedung SG', 'available'),
('inv-006', 'Speaker Portabel', 'Speaker Bose SoundLink', 4, 'Audio', 'Ruang Penyimpanan', 'available'),
('inv-007', 'Microphone', 'Microphone Wireless Shure', 6, 'Audio', 'Ruang Penyimpanan', 'available');

-- =============================================
-- Inventory Loans (Sample)
-- =============================================
INSERT INTO inventory_loans (id, user_id, inventory_id, ktp_number, status, condition_borrowed, borrowed_at, returned_at) VALUES
('loan-001', 'user-001', 'inv-001', '1234567890123456', 'borrowed', 'Baik', DATE_SUB(NOW(), INTERVAL 2 DAY), NULL),
('loan-002', 'user-002', 'inv-002', '1234567890123457', 'returned', 'Baik', DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY));

-- =============================================
-- Lost & Found Reports
-- =============================================
INSERT INTO lost_found (id, user_id, type, item_name, description, location, date_occurred, category, status) VALUES
('lf-001', 'user-001', 'lost', 'Dompet Hitam', 'Dompet kulit warna hitam dengan inisial SAR', 'Lantai 1 Gedung SG', DATE_SUB(CURDATE(), INTERVAL 2 DAY), 'Barang Pribadi', 'pending'),
('lf-002', 'user-002', 'found', 'Topi Merah', 'Topi olahraga warna merah dengan logo universitas', 'Kamar Mandi Lantai 2', DATE_SUB(CURDATE(), INTERVAL 1 DAY), 'Pakaian', 'pending'),
('lf-003', 'user-003', 'lost', 'Flash Disk', 'Flash disk 64GB warna biru', 'Ruang Kelas SG-05', DATE_SUB(CURDATE(), INTERVAL 3 DAY), 'Elektronik', 'claimed');

-- =============================================
-- Lost & Found Claims
-- =============================================
INSERT INTO lost_found_claims (id, lost_found_id, user_id, message, status) VALUES
('claim-001', 'lf-001', 'user-004', 'Saya melihat dompet ini di meja informasi', 'pending'),
('claim-002', 'lf-003', 'user-001', 'Itu milik saya, terima kasih sudah menemukan', 'approved');

-- =============================================
-- Display count of inserted data
-- =============================================
SELECT 'Users:' as entity, COUNT(*) as count FROM users
UNION ALL
SELECT 'Rooms', COUNT(*) FROM rooms
UNION ALL
SELECT 'Bookings', COUNT(*) FROM bookings
UNION ALL
SELECT 'Inventory', COUNT(*) FROM inventory
UNION ALL
SELECT 'Inventory Loans', COUNT(*) FROM inventory_loans
UNION ALL
SELECT 'Lost & Found', COUNT(*) FROM lost_found
UNION ALL
SELECT 'Lost & Found Claims', COUNT(*) FROM lost_found_claims;
