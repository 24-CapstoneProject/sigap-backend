import { query } from '../config/database.js';

const DEFAULT_ROOMS = [
  { id: 'room-001', name: 'F.F 01', capacity: 40, floor: 1, location: 'Gedung SG Lantai 1' },
  { id: 'room-002', name: 'F.F 02', capacity: 40, floor: 1, location: 'Gedung SG Lantai 1' },
  { id: 'room-003', name: 'F.F 03', capacity: 35, floor: 1, location: 'Gedung SG Lantai 1' },
  { id: 'room-004', name: 'F.F 04', capacity: 40, floor: 1, location: 'Gedung SG Lantai 1' },
  { id: 'room-005', name: 'F.F 05', capacity: 30, floor: 1, location: 'Gedung SG Lantai 1' },
  { id: 'room-006', name: 'F.F 06', capacity: 40, floor: 1, location: 'Gedung SG Lantai 1' },
  { id: 'room-007', name: 'F.F 07', capacity: 40, floor: 2, location: 'Gedung SG Lantai 2' },
  { id: 'room-008', name: 'F.F 08', capacity: 35, floor: 2, location: 'Gedung SG Lantai 2' },
  { id: 'room-009', name: 'F.F 09', capacity: 40, floor: 2, location: 'Gedung SG Lantai 2' },
  { id: 'room-010', name: 'F.F 10', capacity: 40, floor: 2, location: 'Gedung SG Lantai 2' },
  { id: 'room-011', name: 'F.F 11', capacity: 30, floor: 2, location: 'Gedung SG Lantai 2' },
  { id: 'room-012', name: 'F.F 12', capacity: 40, floor: 2, location: 'Gedung SG Lantai 2' },
];

export const ensureDefaultRooms = async () => {
  const existing = await query('SELECT COUNT(*) as total FROM rooms');
  if (existing[0].total > 0) return;

  for (const room of DEFAULT_ROOMS) {
    await query(
      `INSERT INTO rooms (id, name, capacity, floor, location, features, status)
       VALUES (?, ?, ?, ?, ?, ?, 'available')`,
      [room.id, room.name, room.capacity, room.floor, room.location, '["Proyektor", "AC"]']
    );
  }
};
