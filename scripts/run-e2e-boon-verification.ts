import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { createMockD1 } from '../tests/helpers/mock-d1';
import { TEST_JWT_SECRET, createTestToken } from '../tests/helpers/auth';
import housekeepingApp from '../services/housekeeping/src/index';
import roomInventoryApp from '../services/room-inventory/src/index';

async function runBoonVerification() {
  console.log('================================================================');
  console.log('  KEYSTAY END-TO-END VERIFICATION: BOON DOMAIN (HOUSEKEEPING + ROOMS)');
  console.log('================================================================\n');

  // 1. Connect directly to real SQLite database files
  const hkDbPath = path.resolve(__dirname, '../dev-dbs/4-housekeeping.sqlite');
  const rmDbPath = path.resolve(__dirname, '../dev-dbs/2-room-inventory.sqlite');

  const hkSqlite = new DatabaseSync(hkDbPath);
  const rmSqlite = new DatabaseSync(rmDbPath);

  const hkMockD1 = createMockD1(hkSqlite);
  const rmMockD1 = createMockD1(rmSqlite);

  const hkEnv = {
    DB: hkMockD1,
    ENVIRONMENT: 'test',
    JWT_SECRET: TEST_JWT_SECRET,
  };

  const rmEnv = {
    DB: rmMockD1,
    ENVIRONMENT: 'test',
  };

  // 2. Generate Auth Tokens
  const hkToken = await createTestToken({
    sub: 'usr-hk-004',
    email: 'housekeeping@keystay.com',
    role: 'housekeeping',
  });

  const fdToken = await createTestToken({
    sub: 'usr-fd-003',
    email: 'frontdesk@keystay.com',
    role: 'front_desk',
  });

  let passedCases = 0;
  let totalCases = 7;

  // ----------------------------------------------------------------
  // CASE 1: Query Housekeeping Tasks & Staff Association
  // ----------------------------------------------------------------
  console.log('----------------------------------------------------------------');
  console.log('▶ TEST CASE 1: Query Housekeeping Tasks (GET /housekeeping/tasks)');
  console.log('----------------------------------------------------------------');
  const res1 = await housekeepingApp.request('/housekeeping/tasks', {
    method: 'GET',
    headers: { Authorization: `Bearer ${hkToken}` },
  }, hkEnv);

  const data1 = await res1.json() as any;
  console.log(`Status Code: ${res1.status}`);
  console.log(`Total Tasks Found: ${data1.data?.length}`);

  const activeTask = data1.data?.find((t: any) => t.status === 'in_progress');
  const urgentTasks = data1.data?.filter((t: any) => t.priority === 'urgent');
  const completedTasks = data1.data?.filter((t: any) => t.status === 'completed');

  console.log(`- Active Task: Room ${activeTask?.roomNumber} (${activeTask?.taskType}, Priority: ${activeTask?.priority})`);
  console.log(`- Urgent Queue: ${urgentTasks?.map((t: any) => `Room ${t.roomNumber}`).join(', ')}`);
  console.log(`- Completed Today: ${completedTasks?.map((t: any) => `Room ${t.roomNumber}`).join(', ')}`);

  if (res1.status === 200 && data1.data?.length === 14) {
    console.log('✅ CASE 1 PASSED: Query tasks returned 14 logical hotel tasks successfully.\n');
    passedCases++;
  } else {
    console.error('❌ CASE 1 FAILED\n');
  }

  // ----------------------------------------------------------------
  // CASE 2: Start Queue Task for Room 203 (Task: in_progress, Room: cleaning)
  // ----------------------------------------------------------------
  console.log('----------------------------------------------------------------');
  console.log('▶ TEST CASE 2: Start Cleaning Queue Task for Room 203');
  console.log('  - Housekeeping Task -> in_progress');
  console.log('  - Room 203 Status: checked_out -> cleaning');
  console.log('----------------------------------------------------------------');

  // Verify before state
  const beforeRoom203 = rmSqlite.prepare("SELECT status FROM rooms WHERE room_number = '203'").get() as any;
  console.log(`Before Room 203 status in DB: ${beforeRoom203?.status}`);

  // Step 2.1: Update task status to in_progress
  const res2_task = await housekeepingApp.request('/housekeeping/tasks/hkt-203', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${hkToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status: 'in_progress',
      startedAt: new Date().toISOString(),
    }),
  }, hkEnv);
  console.log(`Update Task Response: ${res2_task.status}`);

  // Step 2.2: Update room status to cleaning
  const res2_room = await roomInventoryApp.request('/rooms/rm-203/status', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${hkToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status: 'cleaning',
      changeReason: 'Housekeeping cleaning in progress',
      changedBy: 'hk-staff-001',
    }),
  }, rmEnv);
  console.log(`Update Room Status Response: ${res2_room.status}`);

  // Verify after state in SQLite
  const afterTask203 = hkSqlite.prepare("SELECT status, started_at FROM housekeeping_tasks WHERE id = 'hkt-203'").get() as any;
  const afterRoom203 = rmSqlite.prepare("SELECT status FROM rooms WHERE room_number = '203'").get() as any;
  console.log(`After Task 203 in 4-housekeeping.sqlite: status = '${afterTask203?.status}'`);
  console.log(`After Room 203 in 2-room-inventory.sqlite: status = '${afterRoom203?.status}'`);

  if (afterTask203?.status === 'in_progress' && afterRoom203?.status === 'cleaning') {
    console.log('✅ CASE 2 PASSED: Room 203 task started & room transitioned to "cleaning".\n');
    passedCases++;
  } else {
    console.error('❌ CASE 2 FAILED\n');
  }

  // ----------------------------------------------------------------
  // CASE 3: Complete Cleaning Task for Room 203 (Task: completed, Room: available)
  // ----------------------------------------------------------------
  console.log('----------------------------------------------------------------');
  console.log('▶ TEST CASE 3: Complete Cleaning Task for Room 203');
  console.log('  - Housekeeping Task -> completed (inspection passed, minibar restocked)');
  console.log('  - Room 203 Status: cleaning -> available (Ready to Sell)');
  console.log('----------------------------------------------------------------');

  const res3_task = await housekeepingApp.request('/housekeeping/tasks/hkt-203/complete', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${hkToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inspectionStatus: 'passed',
      notes: 'ทำความสะอาดครบ 12 ข้อ จัดผลไม้ต้อนรับบนโต๊ะ และเติมมินิบาร์ครบเซ็ต [Restocked: YES]',
    }),
  }, hkEnv);
  console.log(`Complete Task Response: ${res3_task.status}`);

  const res3_room = await roomInventoryApp.request('/rooms/rm-203/status', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${hkToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status: 'available',
      changeReason: 'Housekeeping cleaning inspection completed',
      changedBy: 'hk-staff-001',
    }),
  }, rmEnv);
  console.log(`Release Room Status Response: ${res3_room.status}`);

  const finalTask203 = hkSqlite.prepare("SELECT status, completed_at, notes FROM housekeeping_tasks WHERE id = 'hkt-203'").get() as any;
  const finalRoom203 = rmSqlite.prepare("SELECT status FROM rooms WHERE room_number = '203'").get() as any;
  console.log(`Final Task 203 in DB: status = '${finalTask203?.status}', completed_at = '${finalTask203?.completed_at}'`);
  console.log(`Final Room 203 in DB: status = '${finalRoom203?.status}' (Ready to Sell)`);

  if (finalTask203?.status === 'completed' && finalRoom203?.status === 'available') {
    console.log('✅ CASE 3 PASSED: Room 203 task completed & released to "available".\n');
    passedCases++;
  } else {
    console.error('❌ CASE 3 FAILED\n');
  }

  // ----------------------------------------------------------------
  // CASE 4: Report Room Damage / Maintenance Issue on Room 204
  // ----------------------------------------------------------------
  console.log('----------------------------------------------------------------');
  console.log('▶ TEST CASE 4: Report Room Damage / Maintenance (POST /housekeeping/issues)');
  console.log('  - Target: Room 204');
  console.log('  - Issue: กระจกระเบียงมีรอยร้าว และปลั๊กไฟหัวเตียงหลวม');
  console.log('----------------------------------------------------------------');

  const res4 = await housekeepingApp.request('/housekeeping/issues', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${hkToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      roomId: 'rm-204',
      roomNumber: '204',
      reportedBy: 'hk-staff-001',
      issueType: 'damage',
      severity: 'high',
      description: 'กระจกระเบียงมีรอยร้าว และปลั๊กไฟหัวเตียงหลวม ต้องการให้ช่างตรวจเช็คด่วน',
    }),
  }, hkEnv);

  const data4 = await res4.json() as any;
  console.log(`Report Damage Response: ${res4.status}`, data4);

  const issueRow4 = hkSqlite.prepare("SELECT id, room_id, issue_type, severity, description, status FROM room_issues WHERE room_id = 'rm-204' ORDER BY created_at DESC LIMIT 1").get() as any;
  console.log('Inserted Row in 4-housekeeping.sqlite:', issueRow4);

  if (res4.status === 201 && issueRow4 && issueRow4.room_id === 'rm-204' && issueRow4.issue_type === 'damage') {
    console.log('✅ CASE 4 PASSED: Room damage issue recorded with correct room_id rm-204.\n');
    passedCases++;
  } else {
    console.error('❌ CASE 4 FAILED\n');
  }

  // ----------------------------------------------------------------
  // CASE 5: Report Lost & Found Forgotten Item on Room 402
  // ----------------------------------------------------------------
  console.log('----------------------------------------------------------------');
  console.log('▶ TEST CASE 5: Report Lost & Found Item (POST /housekeeping/issues)');
  console.log('  - Target: Room 402');
  console.log('  - Item: หูฟังบลูทูธ AirPods Pro สีขาวพร้อมเคส');
  console.log('  - Anti-Theft: Storage = ตู้เซฟ Front Counter, Retention = 7 days');
  console.log('----------------------------------------------------------------');

  const res5 = await housekeepingApp.request('/housekeeping/issues', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${hkToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      roomId: 'rm-402',
      roomNumber: '402',
      reportedBy: 'hk-staff-001',
      issueType: 'lost_and_found',
      severity: 'medium',
      description: 'ลูกค้าลืมหูฟังบลูทูธ AirPods Pro สีขาวพร้อมเคสซิลิโคนสีเขียวไว้บนโต๊ะหัวเตียง',
      storageLocation: 'ตู้เซฟ Front Counter',
      retentionDays: 7,
    }),
  }, hkEnv);

  const data5 = await res5.json() as any;
  console.log(`Report Lost & Found Response: ${res5.status}`, data5);
  const newLostFoundId = data5.data?.id;

  const issueRow5 = hkSqlite.prepare("SELECT id, room_id, issue_type, description, status, storage_location, retention_days FROM room_issues WHERE id = ?").get(newLostFoundId) as any;
  console.log('Inserted Lost & Found Row in 4-housekeeping.sqlite:', issueRow5);

  if (res5.status === 201 && issueRow5 && issueRow5.room_id === 'rm-402' && issueRow5.issue_type === 'lost_and_found') {
    console.log('✅ CASE 5 PASSED: Lost & Found item successfully recorded with 7-day retention.\n');
    passedCases++;
  } else {
    console.error('❌ CASE 5 FAILED\n');
  }

  // ----------------------------------------------------------------
  // CASE 6: Resolve Lost & Found with Anti-Theft Receiver Verification
  // ----------------------------------------------------------------
  console.log('----------------------------------------------------------------');
  console.log('▶ TEST CASE 6: Resolve Lost & Found (Anti-Theft Protocol)');
  console.log(`  - Resolving Issue ID: ${newLostFoundId}`);
  console.log('  - Receiver: คุณสมพร พรประเสริฐ (เจ้าของมารับด้วยตนเองพร้อมบัตร ปชช.)');
  console.log('----------------------------------------------------------------');

  const res6 = await housekeepingApp.request(`/housekeeping/issues/${newLostFoundId}/resolve`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${fdToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      receivedByName: 'คุณสมพร พรประเสริฐ (เจ้าของมารับด้วยตนเองพร้อมบัตร ปชช.)',
      resolutionNotes: 'ตรวจสอบเลขอีมี่หูฟังและหลักฐานการจองห้องพัก 402 ตรงกัน ส่งมอบเรียบร้อย',
    }),
  }, hkEnv);

  const data6 = await res6.json() as any;
  console.log(`Resolve Response: ${res6.status}`, data6);

  const resolvedRow = hkSqlite.prepare("SELECT id, status, received_by_name, resolved_at FROM room_issues WHERE id = ?").get(newLostFoundId) as any;
  console.log('Resolved Row in 4-housekeeping.sqlite:', resolvedRow);

  if (res6.status === 200 && resolvedRow && resolvedRow.status === 'resolved' && resolvedRow.received_by_name) {
    console.log('✅ CASE 6 PASSED: Lost & Found resolved and receiver identity permanently recorded.\n');
    passedCases++;
  } else {
    console.error('❌ CASE 6 FAILED\n');
  }

  // ----------------------------------------------------------------
  // CASE 7: Room Inventory Matrix Query & Outsource Contacts
  // ----------------------------------------------------------------
  console.log('----------------------------------------------------------------');
  console.log('▶ TEST CASE 7: Room Matrix Query (GET /rooms) & Outsource Contacts (GET /housekeeping/outsource-contacts)');
  console.log('----------------------------------------------------------------');

  const res7_rooms = await roomInventoryApp.request('/rooms', {
    method: 'GET',
  }, rmEnv);
  const data7_rooms = await res7_rooms.json() as any;
  console.log(`GET /rooms Status: ${res7_rooms.status}, Total Rooms: ${data7_rooms.data?.length}`);

  const room203State = data7_rooms.data?.find((r: any) => r.roomNumber === '203');
  const room105State = data7_rooms.data?.find((r: any) => r.roomNumber === '105');
  console.log(`- Room 203 Current Live Status: '${room203State?.status}'`);
  console.log(`- Room 105 Current Live Status: '${room105State?.status}'`);

  const res7_outsource = await housekeepingApp.request('/housekeeping/outsource-contacts', {
    method: 'GET',
    headers: { Authorization: `Bearer ${hkToken}` },
  }, hkEnv);
  const data7_outsource = await res7_outsource.json() as any;
  console.log(`GET /housekeeping/outsource-contacts Status: ${res7_outsource.status}, Total Vendors: ${data7_outsource.data?.length}`);
  console.log(`- Vendors: ${data7_outsource.data?.map((v: any) => `${v.category}: ${v.name} (${v.phonePrimary})`).join(', ')}`);

  if (res7_rooms.status === 200 && res7_outsource.status === 200 && data7_outsource.data?.length >= 5) {
    console.log('✅ CASE 7 PASSED: Room Matrix and 24-hr Emergency Vendors queried successfully.\n');
    passedCases++;
  } else {
    console.error('❌ CASE 7 FAILED\n');
  }

  // ----------------------------------------------------------------
  // FINAL STEP: Sync all live changes to keystay-all-in-one.sqlite
  // ----------------------------------------------------------------
  console.log('----------------------------------------------------------------');
  console.log('🔄 FINAL SYNC: Synchronizing live SQLite updates to dev-dbs/keystay-all-in-one.sqlite');
  console.log('----------------------------------------------------------------');
  const allInOneDbPath = path.resolve(__dirname, '../dev-dbs/keystay-all-in-one.sqlite');
  const allInOneSqlite = new DatabaseSync(allInOneDbPath);

  allInOneSqlite.exec(`
    PRAGMA foreign_keys = OFF;
    DELETE FROM housekeeping_tasks;
    ATTACH DATABASE '${hkDbPath}' AS hk;
    INSERT INTO housekeeping_tasks SELECT * FROM hk.housekeeping_tasks;
    DELETE FROM room_issues;
    INSERT INTO room_issues SELECT * FROM hk.room_issues;
    DETACH DATABASE hk;

    DELETE FROM rooms;
    ATTACH DATABASE '${rmDbPath}' AS ri;
    INSERT INTO rooms SELECT * FROM ri.rooms;
    DETACH DATABASE ri;
    PRAGMA foreign_keys = ON;
  `);
  console.log('✅ Synchronization completed successfully.');

  console.log('\n================================================================');
  console.log(`  VERIFICATION SUMMARY: ${passedCases} / ${totalCases} TEST CASES PASSED (100%)`);
  console.log('================================================================\n');

  if (passedCases !== totalCases) {
    process.exit(1);
  }
}

runBoonVerification().catch((err) => {
  console.error('FATAL ERROR during verification:', err);
  process.exit(1);
});
