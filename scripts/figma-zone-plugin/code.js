// Figma Plugin: Keystay Auto Zone Splitter
// จัดกลุ่ม Frame และสร้างกรอบสี่เหลี่ยมพร้อมข้อความกำกับสำหรับ เขต, บุญ, เดียร์

async function run() {
  await figma.loadFontAsync({ family: "Inter", style: "Bold" });
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });

  const nodes = figma.currentPage.children.filter(n => n.type === "FRAME" || n.type === "COMPONENT" || n.type === "INSTANCE" || n.type === "GROUP");

  if (nodes.length === 0) {
    figma.notify("❌ ไม่พบ Frame บนหน้าปัจจุบัน กรุณาตรวจสอบว่าอยู่ในหน้าที่ถูกต้อง");
    figma.closePlugin();
    return;
  }

  // กำหนดกฎการจับคู่หน้าจอตามชื่อ
  const zones = [
    {
      name: "เขต — Role: Manager & System Admin",
      role: "ผู้จัดการโรงแรมและผู้ดูแลระบบ (Auth, Dashboard, Reports, CRM)",
      color: { r: 0.95, g: 0.45, b: 0.1 }, // ส้ม
      match: (name) => {
        const n = name.toLowerCase();
        return (
          n.includes("เข้าสู่ระบบ") ||
          n.includes("ลงทะเบียน") ||
          n.includes("รหัสผ่าน") ||
          n.includes("403") ||
          n.includes("ภาพรวม") ||
          n.includes("สถิติ") ||
          n.includes("แขกและประ") ||
          n.includes("รายการแขก") ||
          (n.includes("บิลและบัญชี") && !n.includes("ห้องพัก"))
        );
      }
    },
    {
      name: "บุญ — Role: Housekeeping & Room Inventory",
      role: "แม่บ้านและคลังห้องพัก (Room Matrix, Floor Plan, Room Inspection, Maintenance)",
      color: { r: 0.96, g: 0.7, b: 0.1 }, // เหลือง/อำพัน
      match: (name) => {
        const n = name.toLowerCase();
        return (
          n.includes("ผังห้อง") ||
          n.includes("แผนผัง") ||
          n.includes("201") ||
          n.includes("203") ||
          n.includes("ห้องและราคา")
        );
      }
    },
    {
      name: "เดียร์ — Role: Front Desk & Cashier",
      role: "พนักงานต้อนรับและการเงิน (Reservations, Check-in/out, Folio, Invoices)",
      color: { r: 0.2, g: 0.5, b: 0.95 }, // น้ำเงิน/ฟ้า
      match: (name) => {
        const n = name.toLowerCase();
        return (
          n.includes("จอง") ||
          n.includes("walk-in") ||
          n.includes("เช็คอิน") ||
          n.includes("เช็คเอาท์") ||
          n.includes("ใบเสร็จ") ||
          n.includes("เพิ่มรายการ") ||
          (n.includes("บิล") && !n.includes("บิลและบัญชี"))
        );
      }
    }
  ];

  let createdCount = 0;

  for (const zone of zones) {
    const matchedNodes = nodes.filter(n => zone.match(n.name));
    if (matchedNodes.length === 0) continue;

    // คำนวณ Bounding Box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const node of matchedNodes) {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + node.width);
      maxY = Math.max(maxY, node.y + node.height);
    }

    const padding = 80;
    const boxX = minX - padding;
    const boxY = minY - padding - 90; // เว้นที่ให้ Header Label
    const boxW = (maxX - minX) + (padding * 2);
    const boxH = (maxY - minY) + (padding * 2) + 90;

    // 1. สร้างกรอบสี่เหลี่ยมครอบ (Rectangle)
    const rect = figma.createRectangle();
    rect.name = `[โซน] ${zone.name}`;
    rect.x = boxX;
    rect.y = boxY;
    rect.resize(boxW, boxH);
    rect.cornerRadius = 24;

    // Fill สีโปร่งแสง 6%
    rect.fills = [{
      type: 'SOLID',
      color: zone.color,
      opacity: 0.06
    }];

    // เส้นขอบ (Stroke) หนา 4px
    rect.strokes = [{
      type: 'SOLID',
      color: zone.color
    }];
    rect.strokeWeight = 4;
    rect.strokeAlign = 'OUTSIDE';

    // 2. ป้ายหัวข้อ (Badge Background)
    const badge = figma.createRectangle();
    badge.name = `Badge - ${zone.name}`;
    badge.x = boxX + 24;
    badge.y = boxY + 20;
    badge.resize(Math.max(500, boxW - 48), 54);
    badge.cornerRadius = 12;
    badge.fills = [{
      type: 'SOLID',
      color: zone.color,
      opacity: 0.18
    }];

    // 3. ตัวหนังสือ Title
    const titleText = figma.createText();
    titleText.fontName = { family: "Inter", style: "Bold" };
    titleText.characters = `📌 ${zone.name}`;
    titleText.fontSize = 24;
    titleText.fills = [{
      type: 'SOLID',
      color: { r: 0.08, g: 0.08, b: 0.08 }
    }];
    titleText.x = boxX + 40;
    titleText.y = boxY + 26;

    // 4. ตัวหนังสือ Subtitle / Description
    const subText = figma.createText();
    subText.fontName = { family: "Inter", style: "Regular" };
    subText.characters = `• บทบาท: ${zone.role} | รวม ${matchedNodes.length} หน้า`;
    subText.fontSize = 14;
    subText.fills = [{
      type: 'SOLID',
      color: { r: 0.35, g: 0.35, b: 0.35 }
    }];
    subText.x = boxX + 40;
    subText.y = boxY + 54;

    // นำ layer กรอบไปไว้ด้านหลังสุดของหน้าจอ เพื่อไม่บังหน้า design
    figma.currentPage.appendChild(rect);
    figma.currentPage.appendChild(badge);
    figma.currentPage.appendChild(titleText);
    figma.currentPage.appendChild(subText);

    // ย้ายไปข้างหลังสุด
    figma.currentPage.insertChild(0, rect);

    createdCount++;
  }

  if (createdCount > 0) {
    figma.notify(`🎉 สำเร็จ! ครอบสี่เหลี่ยมและเขียนประกอบให้ครบทั้ง 3 โซนแล้ว (${createdCount} โซน)`);
  } else {
    figma.notify("⚠️ ไม่พบ Frame ที่ตรงกับชื่อหน้าจอ");
  }

  figma.closePlugin();
}

run();
