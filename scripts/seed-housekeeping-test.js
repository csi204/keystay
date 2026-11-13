const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DEV_DBS_DIR = path.resolve(__dirname, '../dev-dbs');
if (!fs.existsSync(DEV_DBS_DIR)) {
  fs.mkdirSync(DEV_DBS_DIR, { recursive: true });
}

function findD1Sqlite(serviceDir) {
  const d1Dir = path.resolve(__dirname, `../services/${serviceDir}/.wrangler/state/v3/d1/miniflare-D1DatabaseObject`);
  if (!fs.existsSync(d1Dir)) return null;
  const files = fs.readdirSync(d1Dir);
  const dbFile = files.find(f => f.endsWith('.sqlite') && !f.includes('metadata'));
  return dbFile ? path.join(d1Dir, dbFile) : null;
}

const HK_DB_PATH = path.resolve(DEV_DBS_DIR, '4-housekeeping.sqlite');
const ROOM_DB_PATH = path.resolve(DEV_DBS_DIR, '2-room-inventory.sqlite');
const ALL_IN_ONE_PATH = path.resolve(DEV_DBS_DIR, 'keystay-all-in-one.sqlite');

const d1HkPath = findD1Sqlite('housekeeping');
const d1RoomPath = findD1Sqlite('room-inventory');

// If dev-dbs files don't exist yet but wrangler D1 does, copy for live-watch sync
if (!fs.existsSync(HK_DB_PATH) && d1HkPath) {
  fs.copyFileSync(d1HkPath, HK_DB_PATH);
}
if (!fs.existsSync(ROOM_DB_PATH) && d1RoomPath) {
  fs.copyFileSync(d1RoomPath, ROOM_DB_PATH);
}

const hkDbTargets = [HK_DB_PATH, d1HkPath].filter(p => p && fs.existsSync(p));
const roomDbTargets = [ROOM_DB_PATH, d1RoomPath].filter(p => p && fs.existsSync(p));

console.log('[Seed] Seeding fresh Housekeeping & Room Inventory data for testing...');

const today = new Date().toISOString().split('T')[0];
const nowIso = new Date().toISOString();

// 1. Seed Housekeeping Tasks
const tasks = [
  {
    id: 'hkt-105',
    roomId: 'rm-105',
    roomNumber: '105',
    assignedTo: 'hk-staff-001',
    taskType: 'checkout_clean',
    priority: 'high',
    status: 'pending',
    notes: 'เช็คเอาท์แล้ว 11:00 น. • แขกใหม่เข้า 14:00 น. ทำความสะอาดเช็คเอาท์และตรวจมินิบาร์',
    scheduledDate: today,
    startedAt: null,
    completedAt: null,
    eventSource: 'manual',
    beforePhotoUrl: null,
    afterPhotoUrl: null
  },
  {
    id: 'hkt-203',
    roomId: 'rm-203',
    roomNumber: '203',
    assignedTo: 'hk-staff-001',
    taskType: 'checkout_clean',
    priority: 'urgent',
    status: 'pending',
    notes: 'แขกเพิ่งเช็คเอาท์ 11:30 น. (รอมัดจำหน้าเคาน์เตอร์) • แขกใหม่เข้า 12:30 น. ด่วนพิเศษ จัดผลไม้ต้อนรับบนโต๊ะ',
    scheduledDate: today,
    startedAt: null,
    completedAt: null,
    eventSource: 'event_bus',
    beforePhotoUrl: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800',
    afterPhotoUrl: null
  },
  {
    id: 'hkt-205',
    roomId: 'rm-205',
    roomNumber: '205',
    assignedTo: 'hk-staff-001',
    taskType: 'checkout_clean',
    priority: 'urgent',
    status: 'pending',
    notes: 'แขกเพิ่งเช็คเอาท์ 11:45 น. (รอมัดจำหน้าเคาน์เตอร์) • แขกใหม่เข้า 13:00 น. ห้องว่างพร้อมเข้าทำ',
    scheduledDate: today,
    startedAt: null,
    completedAt: null,
    eventSource: 'event_bus',
    beforePhotoUrl: null,
    afterPhotoUrl: null
  },
  {
    id: 'hkt-104',
    roomId: 'rm-104',
    roomNumber: '104',
    assignedTo: 'hk-staff-001',
    taskType: 'checkout_clean',
    priority: 'high',
    status: 'pending',
    notes: 'เช็คเอาท์แล้ว 11:00 น. • แขกใหม่เข้า 14:00 น. เปลี่ยนชุดผ้าปูเตียงและผ้าเช็ดตัว',
    scheduledDate: today,
    startedAt: null,
    completedAt: null,
    eventSource: 'manual',
    beforePhotoUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800',
    afterPhotoUrl: null
  },
  {
    id: 'hkt-106',
    roomId: 'rm-106',
    roomNumber: '106',
    assignedTo: 'hk-staff-001',
    taskType: 'checkout_clean',
    priority: 'high',
    status: 'pending',
    notes: 'เช็คเอาท์แล้ว 10:45 น. • แขกใหม่เข้า 14:00 น. ตรวจสอบกลิ่นควันบุหรี่ที่ระเบียงและเติมของใช้',
    scheduledDate: today,
    startedAt: null,
    completedAt: null,
    eventSource: 'manual',
    beforePhotoUrl: null,
    afterPhotoUrl: null
  },
  {
    id: 'hkt-204',
    roomId: 'rm-204',
    roomNumber: '204',
    assignedTo: 'hk-staff-001',
    taskType: 'checkout_clean',
    priority: 'normal',
    status: 'pending',
    notes: 'เช็คเอาท์แล้ว • มีกระเป๋าฝากส่งขึ้นห้องพักช่วง 15:00 น.',
    scheduledDate: today,
    startedAt: null,
    completedAt: null,
    eventSource: 'manual',
    beforePhotoUrl: null,
    afterPhotoUrl: null
  },
  {
    id: 'hkt-401',
    roomId: 'rm-401',
    roomNumber: '401',
    assignedTo: 'hk-staff-001',
    taskType: 'checkout_clean',
    priority: 'normal',
    status: 'pending',
    notes: 'เช็คเอาท์แล้ว 10:30 น. • แขกใหม่เช็คอินพรุ่งนี้ ตรวจเช็คเครื่องปรับอากาศ',
    scheduledDate: today,
    startedAt: null,
    completedAt: null,
    eventSource: 'manual',
    beforePhotoUrl: null,
    afterPhotoUrl: null
  },
  {
    id: 'hkt-301',
    roomId: 'rm-301',
    roomNumber: '301',
    assignedTo: 'hk-staff-001',
    taskType: 'inspection',
    priority: 'high',
    status: 'pending',
    notes: 'รอตรวจรับงานก่อนปล่อยห้อง • แขกใหม่จองผ่านระบบเข้าพัก 13:30 น.',
    scheduledDate: today,
    startedAt: null,
    completedAt: null,
    eventSource: 'manual',
    beforePhotoUrl: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800',
    afterPhotoUrl: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800'
  },
  {
    id: 'hkt-302',
    roomId: 'rm-302',
    roomNumber: '302',
    assignedTo: 'hk-staff-001',
    taskType: 'daily_clean',
    priority: 'normal',
    status: 'pending',
    notes: 'แขกพักต่อเนื่อง 3 คืน • เติมน้ำดื่มและเปลี่ยนผ้าเช็ดตัว ไม่รบกวนเตียง',
    scheduledDate: today,
    startedAt: null,
    completedAt: null,
    eventSource: 'manual',
    beforePhotoUrl: null,
    afterPhotoUrl: null
  },
  {
    id: 'hkt-402',
    roomId: 'rm-402',
    roomNumber: '402',
    assignedTo: 'hk-staff-001',
    taskType: 'daily_clean',
    priority: 'normal',
    status: 'pending',
    notes: 'แขกพักต่อเนื่อง • เติมของใช้ สบู่ แชมพู และเก็บขยะ',
    scheduledDate: today,
    startedAt: null,
    completedAt: null,
    eventSource: 'manual',
    beforePhotoUrl: null,
    afterPhotoUrl: null
  },
  {
    id: 'hkt-303',
    roomId: 'rm-303',
    roomNumber: '303',
    assignedTo: 'hk-staff-001',
    taskType: 'deep_clean',
    priority: 'normal',
    status: 'pending',
    notes: 'ทำความสะอาดใหญ่ประจำสัปดาห์ (Deep Clean) ฟอกพรมและขัดคราบห้องน้ำ',
    scheduledDate: today,
    startedAt: null,
    completedAt: null,
    eventSource: 'manual',
    beforePhotoUrl: null,
    afterPhotoUrl: null
  },
  {
    id: 'hkt-101',
    roomId: 'rm-101',
    roomNumber: '101',
    assignedTo: 'hk-staff-001',
    taskType: 'checkout_clean',
    priority: 'high',
    status: 'completed',
    notes: 'ทำความสะอาดเสร็จและตรวจรับเรียบร้อยเมื่อ 08:30 น. ปล่อยห้องพร้อมขาย',
    scheduledDate: today,
    startedAt: today + 'T08:00:00Z',
    completedAt: today + 'T08:30:00Z',
    eventSource: 'manual',
    beforePhotoUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800',
    afterPhotoUrl: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800'
  },
  {
    id: 'hkt-102',
    roomId: 'rm-102',
    roomNumber: '102',
    assignedTo: 'hk-staff-001',
    taskType: 'daily_clean',
    priority: 'normal',
    status: 'completed',
    notes: 'ทำความสะอาดรอบเช้าเรียบร้อย 09:15 น. มินิบาร์ครบเซ็ต ตรวจรับผ่าน',
    scheduledDate: today,
    startedAt: today + 'T08:45:00Z',
    completedAt: today + 'T09:15:00Z',
    eventSource: 'manual',
    beforePhotoUrl: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800',
    afterPhotoUrl: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=800'
  },
  {
    id: 'hkt-305',
    roomId: 'rm-305',
    roomNumber: '305',
    assignedTo: 'hk-staff-001',
    taskType: 'checkout_clean',
    priority: 'normal',
    status: 'completed',
    notes: 'ทำความสะอาดเช็คเอาท์เสร็จเรียบร้อย ปล่อยห้องพร้อมขาย',
    scheduledDate: today,
    startedAt: today + 'T09:00:00Z',
    completedAt: today + 'T09:35:00Z',
    eventSource: 'manual',
    beforePhotoUrl: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800',
    afterPhotoUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800'
  }
];

for (const targetPath of hkDbTargets) {
  try {
    const hkDb = new DatabaseSync(targetPath);
    hkDb.exec(`
      PRAGMA foreign_keys = OFF;
      DELETE FROM housekeeping_tasks;
      PRAGMA foreign_keys = ON;
    `);

    const insertTask = hkDb.prepare(`
      INSERT INTO housekeeping_tasks (
        id, room_id, room_number, assigned_to, task_type, priority, status, notes,
        scheduled_date, started_at, completed_at, event_source, created_at, updated_at,
        before_photo_url, after_photo_url
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?
      )
    `);

    for (const t of tasks) {
      insertTask.run(
        t.id, t.roomId, t.roomNumber, t.assignedTo, t.taskType, t.priority, t.status, t.notes,
        t.scheduledDate, t.startedAt, t.completedAt, t.eventSource, nowIso, nowIso,
        t.beforePhotoUrl || null, t.afterPhotoUrl || null
      );
    }
    hkDb.close();
    console.log(`[Seed] Seeded ${tasks.length} tasks into ${path.basename(targetPath)}.`);
  } catch (err) {
    console.error(`[Seed] Warning seeding ${targetPath}:`, err.message);
  }
}

// 2. Align Rooms in 2-room-inventory.sqlite
const roomStatuses = {
  '105': 'checked_out',
  '203': 'checked_out',
  '205': 'checked_out',
  '104': 'checked_out',
  '106': 'checked_out',
  '204': 'checked_out',
  '401': 'checked_out',
  '301': 'cleaning',
  '302': 'occupied',
  '402': 'occupied',
  '303': 'cleaning',
  '101': 'available',
  '102': 'available',
  '305': 'available',
};

for (const targetPath of roomDbTargets) {
  try {
    const roomDb = new DatabaseSync(targetPath);
    const updateRoom = roomDb.prepare('UPDATE rooms SET status = ? WHERE room_number = ?');
    for (const [rNum, st] of Object.entries(roomStatuses)) {
      updateRoom.run(st, rNum);
    }
    roomDb.close();
    console.log(`[Seed] Aligned room statuses in ${path.basename(targetPath)}.`);
  } catch (err) {
    console.error(`[Seed] Warning updating rooms in ${targetPath}:`, err.message);
  }
}

// 3. Sync to keystay-all-in-one.sqlite
if (!fs.existsSync(ALL_IN_ONE_PATH) && fs.existsSync(HK_DB_PATH)) {
  fs.copyFileSync(HK_DB_PATH, ALL_IN_ONE_PATH);
}

if (fs.existsSync(ALL_IN_ONE_PATH) && fs.existsSync(HK_DB_PATH)) {
  const hkDb = new DatabaseSync(HK_DB_PATH);
  const targetDb = new DatabaseSync(ALL_IN_ONE_PATH);

  targetDb.exec('PRAGMA foreign_keys = OFF;');
  targetDb.exec('DELETE FROM housekeeping_tasks;');

  const allTasks = hkDb.prepare('SELECT * FROM housekeeping_tasks').all();
  if (allTasks.length > 0) {
    const cols = Object.keys(allTasks[0]);
    const placeholders = cols.map(() => '?').join(', ');
    const insertStmt = targetDb.prepare(
      `INSERT INTO housekeeping_tasks (${cols.join(', ')}) VALUES (${placeholders})`
    );

    for (const row of allTasks) {
      insertStmt.run(...cols.map((col) => row[col]));
    }
  }

  // Also sync rooms table
  if (fs.existsSync(ROOM_DB_PATH)) {
    const roomDb = new DatabaseSync(ROOM_DB_PATH);
    const targetHasRooms = targetDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='rooms'").get();
    if (!targetHasRooms) {
      const roomTableDef = roomDb.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='rooms'").get();
      if (roomTableDef && roomTableDef.sql) {
        targetDb.exec(roomTableDef.sql);
      }
    }
    targetDb.exec('DELETE FROM rooms;');
    const allRooms = roomDb.prepare('SELECT * FROM rooms').all();
    if (allRooms.length > 0) {
      const cols = Object.keys(allRooms[0]);
      const placeholders = cols.map(() => '?').join(', ');
      const insertRoomStmt = targetDb.prepare(
        `INSERT INTO rooms (${cols.join(', ')}) VALUES (${placeholders})`
      );
      for (const row of allRooms) {
        insertRoomStmt.run(...cols.map((col) => row[col]));
      }
    }
    roomDb.close();
  }

  targetDb.exec('PRAGMA foreign_keys = ON;');
  targetDb.close();
  console.log('[Seed] Synchronized fresh data to keystay-all-in-one.sqlite.');
}

console.log('[Seed] Seeding completed successfully!');
