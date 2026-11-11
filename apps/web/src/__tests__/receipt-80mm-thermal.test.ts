import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('Task 5: Transform ReceiptTaxInvoiceModal to authentic 80mm POS thermal receipt slip', () => {
  const modalPath = path.resolve(
    process.cwd(),
    'apps/web/src/components/front-desk/ReceiptTaxInvoiceModal.tsx'
  );

  it('verifies ReceiptTaxInvoiceModal.tsx exists and is readable', () => {
    assert.strictEqual(fs.existsSync(modalPath), true, 'ReceiptTaxInvoiceModal.tsx must exist');
  });

  it('verifies backdrop styling and container adhering to dark translucent glass design', () => {
    const code = fs.readFileSync(modalPath, 'utf-8');
    assert.match(
      code,
      /fixed\s+inset-0\s+z-50\s+flex\s+items-center\s+justify-center\s+p-4\s+bg-slate-900\/60\s+backdrop-blur-xs\s+overflow-y-auto/,
      'Must contain exact backdrop classes'
    );
  });

  it('verifies top action toolbar with 80mm preview title, language toggle, active scale print button, and accessible close button', () => {
    const code = fs.readFileSync(modalPath, 'utf-8');

    // Title in toolbar
    assert.match(code, /ตัวอย่างสลิปใบเสร็จรับเงิน\s*\(80mm\s+Thermal\s+POS\s+Slip\)/);

    // Language toggle TH / EN
    assert.match(code, /invoiceLocale/);
    assert.match(code, /setInvoiceLocale\('th'\)/);
    assert.match(code, /setInvoiceLocale\('en'\)/);

    // Print button with Printer icon and active:scale-[0.98]
    assert.match(
      code,
      /<Printer[^>]*className=["'][^"']*w-4\s+h-4\s+mr-1\.5[^"']*["'][^>]*strokeWidth=\{1\.75\}[^>]*\/>/
    );
    assert.match(code, /พิมพ์สลิปใบเสร็จ\s*\(80mm\)/);
    assert.match(code, /active:scale-\[0\.98\]/);

    // Close button with min-h-[44px]
    assert.match(code, /min-h-\[44px\]/);
  });

  it('verifies 80mm Thermal Receipt paper dimensions, typography, and paper styling', () => {
    const code = fs.readFileSync(modalPath, 'utf-8');

    // receipt-80mm-paper class
    assert.match(code, /receipt-80mm-paper/);

    // Dimensions: w-[360px] max-w-[360px] on screen, 80mm in print
    assert.match(code, /w-\[360px\]\s+max-w-\[360px\]/);
    assert.match(code, /print:w-\[80mm\]\s+print:max-w-\[80mm\]/);

    // Pure white bg, shadow, font-mono tabular-nums text-xs leading-relaxed
    assert.match(code, /bg-white/);
    assert.match(code, /text-slate-900\s+print:text-black/);
    assert.match(code, /shadow-2xl/);
    assert.match(code, /font-mono/);
    assert.match(code, /tabular-nums/);
    assert.match(code, /text-xs/);
    assert.match(code, /leading-relaxed/);
  });

  it('verifies @media print page size is set to 80mm auto with 0 margin and tuned 4mm 3mm padding', () => {
    const code = fs.readFileSync(modalPath, 'utf-8');

    // @page { size: 80mm auto; margin: 0; }
    assert.match(code, /size:\s*80mm\s+auto;/);
    assert.match(code, /margin:\s*0(mm)?;/);

    // Tuning padding in print: 4mm 3mm
    assert.match(code, /padding:\s*4mm\s+3mm\s*!important;/);
  });

  it('verifies 100% print isolation rules hiding background DOM and showing only receipt paper', () => {
    const code = fs.readFileSync(modalPath, 'utf-8');

    // Hide all background elements in the DOM
    assert.match(
      code,
      /body\s+\*\s*\{\s*visibility:\s*hidden\s*!important;\s*\}/,
      'Must hide all body elements during print'
    );

    // Keep receipt paper and all its children visible
    assert.match(
      code,
      /\.receipt-80mm-paper,\s*\.receipt-80mm-paper\s+\*\s*\{\s*visibility:\s*visible\s*!important;\s*\}/,
      'Must keep receipt-80mm-paper and its children visible during print'
    );

    // Absolute positioning at top left with 80mm width
    assert.match(
      code,
      /position:\s*absolute\s*!important;/,
      'receipt paper must be absolutely positioned for print'
    );
    assert.match(
      code,
      /left:\s*0\s*!important;/,
      'receipt paper must align to left: 0'
    );
    assert.match(
      code,
      /top:\s*0\s*!important;/,
      'receipt paper must align to top: 0'
    );
  });

  it('verifies Header branding contains Keystay hotel branding, Tax ID, and POS-01 station', () => {
    const code = fs.readFileSync(modalPath, 'utf-8');

    // Centered hotel branding: *** โรงแรม คีย์สเตย์ (KEYSTAY HOTEL) ***
    assert.match(code, /\*\*\*\s*โรงแรม\s+คีย์สเตย์\s+\(KEYSTAY\s+HOTEL\)\s*\*\*\*/);

    // Hotel address
    assert.match(code, /999\s+ถ\.พหลโยธิน\s+แขวงลาดยาว\s+เขตจตุจักร\s+กรุงเทพฯ\s+10900/);

    // Tax ID: 0-1055-67091-23-4
    assert.match(code, /เลขประจำตัวผู้เสียภาษี\s*\(TAX\s*ID\):\s*0-1055-67091-23-4/);

    // POS station: POS-01 (Front Desk)
    assert.match(code, /เครื่อง\s*POS:\s*POS-01\s*\(Front\s*Desk\)/);
  });

  it('verifies dashed dividers format border-t border-dashed border-slate-300 print:border-black my-2.5', () => {
    const code = fs.readFileSync(modalPath, 'utf-8');
    assert.match(
      code,
      /border-t\s+border-dashed\s+border-slate-300\s+print:border-black\s+my-2\.5/
    );
  });

  it('verifies receipt title contains ใบเสร็จรับเงิน / ใบกำกับภาษีอย่างย่อ and TAX INVOICE (ABB) / RECEIPT', () => {
    const code = fs.readFileSync(modalPath, 'utf-8');
    assert.match(code, /ใบเสร็จรับเงิน\s*\/\s*ใบกำกับภาษีอย่างย่อ/);
    assert.match(code, /TAX\s+INVOICE\s+\(ABB\)\s*\/\s*RECEIPT/);
  });

  it('verifies metadata block displays invoice number, formatted date DD/MM/YYYY HH:mm, room, guest, and cashier', () => {
    const code = fs.readFileSync(modalPath, 'utf-8');

    // Metadata labels
    assert.match(code, /เลขที่\s*\/\s*NO\s*:/);
    assert.match(code, /วันที่\s*\/\s*DATE\s*:/);
    assert.match(code, /ห้อง\s*\/\s*ROOM\s*:/);
    assert.match(code, /ลูกค้า\s*\/\s*GUEST\s*:/);
    assert.match(code, /แคชเชียร์\s*\/\s*CASHIER\s*:/);

    // Dynamic cashier resolution
    assert.match(code, /resolvedCashier/);
    assert.match(code, /cashierRoleTitle/);
  });

  it('verifies items section follows 2-line POS slip format: Line 1 description, Line 2 qty x price and total', () => {
    const code = fs.readFileSync(modalPath, 'utf-8');

    // Item numbering and localized description
    assert.match(code, /localizeFolioDescription/);

    // Quantity x unitPrice and item total layout
    assert.match(code, /item\.quantity\s*\}\s*x\s*\{formatAmount\(item\.unitPrice/);
    assert.match(code, /formatAmount\(itemTotal\)/);
  });

  it('verifies Calculations section details SUBTOTAL, VAT 7%, TOTAL NET, payment method, amount paid, and change', () => {
    const code = fs.readFileSync(modalPath, 'utf-8');

    // Subtotal and VAT 7%
    assert.match(code, /ยอดรวมก่อนภาษี\s*\(SUBTOTAL\)\s*:/);
    assert.match(code, /ภาษีมูลค่าเพิ่ม\s*7%\s*\(VAT\s*7%\)\s*:/);

    // Net total bold
    assert.match(code, /ยอดรวมสุทธิ\s*\(TOTAL\s*NET\)\s*:/);

    // Payment details
    assert.match(code, /ชำระโดย\s*\(PAID\s*BY\)\s*:/);
    assert.match(code, /รับเงินมา\s*\(AMOUNT\s*PAID\)\s*:/);
    assert.match(code, /เงินทอน\s*\(CHANGE\)\s*:/);

    // Payment method formatting
    assert.match(code, /formatPaymentMethod/);
  });

  it('verifies Footer section contains VAT included notice, authentic SVG barcode, and thank you message', () => {
    const code = fs.readFileSync(modalPath, 'utf-8');

    // VAT 7% included notice
    assert.match(code, /\(ราคารวมภาษีมูลค่าเพิ่ม\s*7%\s*แล้ว\s*\/\s*VAT\s*7%\s*INCLUDED\)/);

    // Barcode SVG & text simulation
    assert.match(code, /<svg[^>]*viewBox=["']0\s+0\s+200\s+40["']/);
    assert.match(code, /\|\|\|\|\s*\|\s*\|\|\|\|\|\s*\|\|\s*\|\|\|\|\|\|\|\|\s*\|\|\|\|/);

    // Thank you message
    assert.match(code, /\*\*\*\s*ขอบคุณที่ใช้บริการ\s*\/\s*THANK\s*YOU\s*\*\*\*/);

    // Cashier signature reference
    assert.match(code, /invoice\.cashierSignature/);
    assert.match(code, /resolvedCashier/);
  });

  it('verifies backward compatibility exports', () => {
    const code = fs.readFileSync(modalPath, 'utf-8');
    assert.match(code, /export\s+const\s+TaxInvoiceAbbModal\s*=\s*ReceiptTaxInvoiceModal/);
    assert.match(code, /export\s+type\s+TaxInvoiceAbbModalProps\s*=\s*ReceiptTaxInvoiceModalProps/);
    assert.match(code, /export\s+default\s+ReceiptTaxInvoiceModal/);
  });
});
