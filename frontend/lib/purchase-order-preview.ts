import { getStoredCompany } from '@/lib/company'

type PurchaseOrderPreviewItem = {
  item: string
  quantity: string | number
  unit: string
  rate: string | number
  currency?: string
  vatPercent?: string | number
  vatAmount?: string | number
  vat?: string | number
  amount?: string | number
}

type VendorDetails = {
  supplierName: string
  contactPersonName?: string
  mobileNumber?: string
  companyTelephone?: string
  country?: string
  city?: string
}

export type PurchaseOrderPreviewData = {
  poNumber: string
  poDateOriginal: string
  supplier: VendorDetails
  items: PurchaseOrderPreviewItem[]
  remarks?: string
  modeOfPayment?: string
  poAmount?: string | number
  vatAed?: string | number
  poAmountIncVatAed?: string | number
  currency?: string
}

const companyDetails = {
  ARM: {
    title: 'AL RIYADA METAL INDUSTRIAL LLC',
    address: [
      'Warehouse No. 5, Emirates Industrial City,',
      'Sajja, Sharjah, United Arab Emirates',
      'Tele: (971) 653 872 21',
      'Website: www.alriyadametals.com',
    ],
    trn: '104102165800003',
  },
  AKR: {
    title: 'AKR METAL INDUSTRIAL LLC',
    address: [
      'Warehouse No. 5, Emirates Industrial City,',
      'Sajja, Sharjah, United Arab Emirates',
      'Tele: (971) 653 872 21',
      'Website: www.alriyadametals.com',
    ],
    trn: '',
  },
} as const

export function openPurchaseOrderPreview(
  data: PurchaseOrderPreviewData,
  options?: { autoPrint?: boolean }
) {
  if (typeof window === 'undefined') return

  const company = getStoredCompany() || 'ARM'
  const previewWindow = window.open('', '_blank')

  if (!previewWindow) {
    throw new Error('Please allow popups to open the draft PDF preview.')
  }

  const html = buildPurchaseOrderPreviewHtml(
    data,
    company,
    options?.autoPrint ?? false,
    window.location.origin
  )
  previewWindow.document.open()
  previewWindow.document.write(html)
  previewWindow.document.close()
  previewWindow.focus()
}

function buildPurchaseOrderPreviewHtml(
  data: PurchaseOrderPreviewData,
  company: 'ARM' | 'AKR',
  autoPrint: boolean,
  origin: string
) {
  const selectedCompany = companyDetails[company]
  const logoUrl = company === 'ARM' ? `${origin}/al-riyada-logo.jpeg` : ''
  const logoMarkup = getCompanyLogoMarkup(company, origin)
  const items = normalizeItems(data)
  const currencyLabel =
    data.currency ||
    items.find((item) => item.currency)?.currency ||
    'AED'
  const pdfFilename = getPdfFilename(data.poNumber)
  const subtotal = toNumber(data.poAmount) || items.reduce((sum, item) => sum + item.amount, 0)
  const vatTotal = toNumber(data.vatAed) || items.reduce((sum, item) => sum + item.vat, 0)
  const total = toNumber(data.poAmountIncVatAed) || subtotal + vatTotal
  const amountWords = numberToWords(total, currencyLabel)
  const pdfData = jsonForScript({
    filename: pdfFilename,
    companyTitle: selectedCompany.title,
    address: selectedCompany.address,
    trn: selectedCompany.trn || '-',
    logoUrl,
    poNumber: data.poNumber,
    poDate: formatDateDisplay(data.poDateOriginal),
    supplier: data.supplier,
    items,
    remarks: data.remarks || '-',
    modeOfPayment: data.modeOfPayment || '-',
    subtotal,
    vatTotal,
    total,
    currency: currencyLabel,
    amountWords,
  })
  const emptyRowCount = Math.max(0, 8 - items.length)
  const tableRows = [
    ...items.map((item, index) => `
      <tr>
        <td class="center">${index + 1}</td>
        <td>${escapeHtml(item.item)}</td>
        <td class="center">${formatNumber(item.quantity)}</td>
        <td class="center">${escapeHtml(item.unit)}</td>
        <td class="right">${formatMoney(item.rate)}</td>
        <td class="right">${formatMoney(item.vatPercent)}</td>
        <td class="right">${formatMoney(item.vatAmount)}</td>
        <td class="right">${formatMoney(item.amount)}</td>
      </tr>
    `),
    ...Array.from({ length: emptyRowCount }, () => `
      <tr class="empty-row">
        <td>&nbsp;</td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
    `),
  ].join('')

  const buttons = autoPrint
    ? ''
    : `<div class="toolbar">
        <button onclick="window.print()">Print</button>
        <button onclick="downloadPurchaseOrderPdf(event)">Download PDF</button>
      </div>`

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(pdfFilename)}</title>
        <style>
          :root {
            --blue: #2e36d2;
            --line: #3b3b3b;
            --fill: #d7d7d7;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            background: #f4f6fb;
            font-family: Arial, Helvetica, sans-serif;
            color: #111;
          }
          .toolbar {
            display: flex;
            gap: 12px;
            justify-content: center;
            padding: 18px;
          }
          .toolbar button {
            border: 0;
            border-radius: 999px;
            background: #111827;
            color: #fff;
            padding: 10px 18px;
            font-size: 14px;
            cursor: pointer;
          }
          .sheet {
            width: 840px;
            margin: 20px auto;
            background: #fff;
            border: 4px solid var(--blue);
            padding: 0;
          }
          .header {
            display: grid;
            grid-template-columns: 1fr 230px;
            border-bottom: 2px solid var(--line);
          }
          .company {
            padding: 18px 18px 10px;
            font-size: 13px;
            line-height: 1.35;
          }
          .logo {
            margin-bottom: 12px;
            line-height: 1;
          }
          .logo-img {
            display: block;
            width: 430px;
            max-width: 100%;
            height: auto;
          }
          .logo-main {
            display: flex;
            align-items: flex-end;
            gap: 10px;
            font-size: 42px;
            font-weight: 800;
            letter-spacing: 0.15em;
            white-space: nowrap;
          }
          .logo-blue {
            color: #1f2cff;
          }
          .logo-gray {
            color: #777a7d;
          }
          .logo-sub {
            margin-top: 4px;
            color: #111;
            font-size: 23px;
            font-weight: 800;
            letter-spacing: 0.13em;
            white-space: nowrap;
          }
          .title-box {
            border-left: 2px solid var(--line);
            display: grid;
            grid-template-rows: auto auto auto;
          }
          .title {
            color: var(--blue);
            font-size: 24px;
            font-weight: 700;
            text-align: center;
            padding: 12px 8px 8px;
          }
          .meta-row {
            display: grid;
            grid-template-columns: 78px 1fr;
            border-top: 1px solid #bdbdbd;
          }
          .meta-row div {
            padding: 6px 8px;
            font-size: 12px;
          }
          .meta-row .label {
            font-weight: 700;
            text-align: right;
          }
          .meta-row .value {
            border-left: 1px solid #bdbdbd;
            text-align: center;
          }
          .trn {
            color: var(--blue);
            font-size: 12px;
            font-weight: 700;
            text-align: right;
            padding: 8px 10px 10px;
            border-top: 1px solid #bdbdbd;
          }
          .blocks {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0;
          }
          .block {
            border-right: 2px solid var(--line);
            border-bottom: 2px solid var(--line);
            min-height: 136px;
          }
          .block:last-child {
            border-right: 0;
          }
          .block-title {
            background: #9ca3af;
            color: #111;
            font-weight: 700;
            padding: 4px 8px;
            font-size: 13px;
            border-bottom: 1px solid var(--line);
          }
          .block-body {
            padding: 8px;
            font-size: 12px;
            line-height: 1.35;
          }
          .po-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            font-size: 12px;
          }
          .po-table th,
          .po-table td {
            border: 2px solid var(--line);
            padding: 5px 6px;
            vertical-align: top;
          }
          .po-table th {
            background: #7c7c7c;
            color: #fff;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.02em;
            font-size: 11px;
          }
          .po-table .center { text-align: center; }
          .po-table .right { text-align: right; }
          .po-table .empty-row td {
            height: 40px;
          }
          .footer-grid {
            display: grid;
            grid-template-columns: 1fr 250px;
            gap: 18px;
            padding: 10px 14px 14px;
          }
          .comments {
            border: 2px solid #b9b9b9;
            min-height: 165px;
          }
          .comments-title {
            background: #d1d5db;
            font-weight: 700;
            padding: 4px 8px;
            border-bottom: 1px solid #b9b9b9;
          }
          .comments-body {
            padding: 6px 8px;
            font-size: 12px;
          }
          .totals {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-top: auto;
          }
          .totals td {
            border: 2px solid var(--line);
            padding: 4px 8px;
          }
          .totals .label {
            text-align: right;
            font-weight: 700;
          }
          .totals .value {
            text-align: right;
            width: 110px;
          }
          .totals .grand td {
            font-size: 18px;
            font-weight: 700;
          }
          .amount-words {
            border: 2px solid var(--line);
            margin-top: 8px;
            padding: 6px 8px;
            font-size: 12px;
            font-weight: 700;
          }
          .signatures {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            padding: 34px 18px 18px;
            font-weight: 700;
            font-size: 14px;
          }
          @media print {
            body { background: #fff; }
            .toolbar { display: none; }
            .sheet { margin: 0 auto; }
          }
        </style>
      </head>
      <body>
        ${buttons}
        <div class="sheet">
          <div class="header">
            <div class="company">
              ${logoMarkup}
              ${selectedCompany.address.map((line) => `<div>${escapeHtml(line)}</div>`).join('')}
            </div>
            <div class="title-box">
              <div class="title">PURCHASE ORDER</div>
              <div class="meta-row">
                <div class="label">DATE</div>
                <div class="value">${escapeHtml(formatDateDisplay(data.poDateOriginal))}</div>
              </div>
              <div class="meta-row">
                <div class="label">PO #</div>
                <div class="value">${escapeHtml(data.poNumber)}</div>
              </div>
              <div class="trn">TRN : ${escapeHtml(selectedCompany.trn || '-')}</div>
            </div>
          </div>

          <div class="blocks">
            <div class="block">
              <div class="block-title">VENDOR</div>
              <div class="block-body">
                <div><strong>${escapeHtml(data.supplier.supplierName || '-')}</strong></div>
                <div>Contact: ${escapeHtml(data.supplier.contactPersonName || '-')}</div>
                <div>City: ${escapeHtml(data.supplier.city || '-')}</div>
                <div>Country: ${escapeHtml(data.supplier.country || '-')}</div>
                <div>Phone: ${escapeHtml(data.supplier.mobileNumber || data.supplier.companyTelephone || '-')}</div>
              </div>
            </div>
            <div class="block">
              <div class="block-title">DELIVER TO</div>
              <div class="block-body">
                <div><strong>${escapeHtml(selectedCompany.title)}</strong></div>
                ${selectedCompany.address.map((line) => `<div>${escapeHtml(line)}</div>`).join('')}
              </div>
            </div>
          </div>

          <table class="po-table">
            <thead>
              <tr>
                <th style="width: 56px;">Item #</th>
                <th>Description</th>
                <th style="width: 72px;">Qty</th>
                <th style="width: 72px;">Unit</th>
                <th style="width: 100px;">Unit Price</th>
                <th style="width: 78px;">VAT %</th>
                <th style="width: 100px;">VAT Amount</th>
                <th style="width: 110px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <div class="footer-grid">
            <div class="comments">
              <div class="comments-title">Comments or Special Instructions</div>
              <div class="comments-body">
                <div><strong>Payment Term</strong> : ${escapeHtml(data.modeOfPayment || '-')}</div>
                <div style="margin-top: 8px;">${escapeHtml(data.remarks || '-')}</div>
              </div>
            </div>
            <div>
              <table class="totals">
                <tr>
                  <td class="label">SUBTOTAL</td>
                  <td class="value">${formatMoney(subtotal)}</td>
                </tr>
                <tr>
                  <td class="label">VAT</td>
                  <td class="value">${formatMoney(vatTotal)}</td>
                </tr>
                <tr class="grand">
                  <td class="label">TOTAL ${escapeHtml(currencyLabel)}</td>
                  <td class="value">${formatMoney(total)}</td>
                </tr>
              </table>
              <div class="amount-words">${escapeHtml(amountWords)} only.</div>
            </div>
          </div>

          <div class="signatures">
            <div>Purchaser</div>
            <div style="text-align:center;">Projects Manager</div>
            <div style="text-align:right;">General Manager</div>
          </div>
        </div>
        <script>
          const purchaseOrderPdfData = ${pdfData};

          async function downloadPurchaseOrderPdf(event) {
            const button = event && event.currentTarget;
            const originalText = button ? button.textContent : '';

            if (button) {
              button.disabled = true;
              button.textContent = 'Downloading...';
            }

            try {
              const pdfBytes = await buildPurchaseOrderPdfBytes(purchaseOrderPdfData);
              const blob = new Blob([pdfBytes], { type: 'application/pdf' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');

              link.href = url;
              link.download = purchaseOrderPdfData.filename;
              document.body.appendChild(link);
              link.click();
              link.remove();
              URL.revokeObjectURL(url);
            } catch (error) {
              console.error(error);
              alert('Could not download the PDF. Please try Print for now.');
            } finally {
              if (button) {
                button.disabled = false;
                button.textContent = originalText || 'Download PDF';
              }
            }
          }

          async function buildPurchaseOrderPdfBytes(data) {
            const pageWidth = 595;
            const pageHeight = 842;
            const content = [];
            const logoBytes = data.logoUrl ? await loadBytes(data.logoUrl) : null;

            function pdfY(top, height = 0) {
              return pageHeight - top - height;
            }

            function line(x1, y1, x2, y2) {
              content.push(x1 + ' ' + pdfY(y1) + ' m ' + x2 + ' ' + pdfY(y2) + ' l S');
            }

            function rect(x, y, width, height) {
              content.push(x + ' ' + pdfY(y, height) + ' ' + width + ' ' + height + ' re S');
            }

            function fillRect(x, y, width, height, gray) {
              content.push(gray + ' g ' + x + ' ' + pdfY(y, height) + ' ' + width + ' ' + height + ' re f 0 g');
            }

            function text(value, x, y, size, options) {
              const align = options && options.align ? options.align : 'left';
              const maxWidth = options && options.maxWidth ? options.maxWidth : 0;
              const color = options && options.color ? options.color : [0, 0, 0];
              const stringValue = cleanPdfText(value);
              const displayValue =
                maxWidth > 0 ? fitText(stringValue, maxWidth, size) : stringValue;
              const approxWidth = measureTextWidth(displayValue, size);
              const textX =
                align === 'right'
                  ? x - approxWidth
                  : align === 'center'
                    ? x - approxWidth / 2
                    : x;

              content.push(
                formatColor(color) +
                  ' BT /F1 ' +
                  size +
                  ' Tf ' +
                  textX.toFixed(2) +
                  ' ' +
                  pdfY(y + size).toFixed(2) +
                  ' Td ' +
                  pdfString(displayValue) +
                  ' Tj ET'
              );
            }

            function textBlock(value, x, y, size, options) {
              const maxWidth = options && options.maxWidth ? options.maxWidth : 0;
              const maxLines = options && options.maxLines ? options.maxLines : 2;
              const lineHeight = options && options.lineHeight ? options.lineHeight : size + 2;
              const align = options && options.align ? options.align : 'left';
              const lines = wrapText(cleanPdfText(value), maxWidth, size, maxLines);

              lines.forEach(function (lineText, index) {
                text(lineText, x, y + index * lineHeight, size, {
                  align: align,
                  maxWidth: maxWidth,
                });
              });
            }

            function money(value) {
              const number = Number(value);
              return Number.isFinite(number) ? number.toFixed(2) : '0.00';
            }

            function quantity(value) {
              const raw = String(value || '0');
              const number = Number(raw);

              if (!Number.isFinite(number)) return '0';

              return raw.replace(/(\\.\\d*?[1-9])0+$/, '$1').replace(/\\.0+$/, '');
            }

            content.push('0.18 0.21 0.82 RG 3 w');
            rect(18, 18, 559, 806);
            content.push('0 0 0 RG 1 w');

            rect(18, 18, 559, 122);
            line(397, 18, 397, 140);

            if (logoBytes) {
              content.push('q 250 0 0 59 28 ' + pdfY(26, 59) + ' cm /Logo Do Q');
            } else {
              text(data.companyTitle, 30, 32, 22, { maxWidth: 340 });
            }

            data.address.forEach(function (lineText, index) {
              text(lineText, 30, 92 + index * 12, 9, { maxWidth: 340 });
            });

            text('PURCHASE ORDER', 476, 34, 15, {
              align: 'center',
              maxWidth: 176,
              color: [0.18, 0.21, 0.82],
            });
            line(397, 58, 577, 58);
            text('DATE', 436, 66, 9, { align: 'right' });
            line(450, 58, 450, 82);
            text(data.poDate, 514, 66, 9, { align: 'center', maxWidth: 110 });
            line(397, 82, 577, 82);
            text('PO #', 436, 90, 9, { align: 'right' });
            line(450, 82, 450, 106);
            text(data.poNumber, 514, 90, 9, { align: 'center', maxWidth: 110 });
            line(397, 106, 577, 106);
            text('TRN : ' + data.trn, 570, 118, 9, { align: 'right', maxWidth: 160 });

            rect(18, 140, 279.5, 96);
            rect(297.5, 140, 279.5, 96);
            fillRect(18, 140, 279.5, 16, 0.72);
            fillRect(297.5, 140, 279.5, 16, 0.72);
            text('VENDOR', 26, 144, 10);
            text('DELIVER TO', 306, 144, 10);
            text(data.supplier.supplierName || '-', 26, 164, 10, { maxWidth: 250 });
            text('Contact: ' + (data.supplier.contactPersonName || '-'), 26, 178, 9, { maxWidth: 250 });
            text('City: ' + (data.supplier.city || '-'), 26, 192, 9, { maxWidth: 250 });
            text('Country: ' + (data.supplier.country || '-'), 26, 206, 9, { maxWidth: 250 });
            text('Phone: ' + (data.supplier.mobileNumber || data.supplier.companyTelephone || '-'), 26, 220, 9, { maxWidth: 250 });
            text(data.companyTitle, 306, 164, 10, { maxWidth: 250 });
            data.address.forEach(function (lineText, index) {
              text(lineText, 306, 178 + index * 12, 9, { maxWidth: 250 });
            });

            const tableX = 18;
            const tableY = 236;
            const columns = [38, 180, 42, 42, 60, 48, 72, 77];
            const headers = ['Item #', 'Description', 'Qty', 'Unit', 'Unit Price', 'VAT %', 'VAT Amount', 'Total'];
            const rowHeight = 20;
            let currentX = tableX;

            fillRect(tableX, tableY, 559, rowHeight, 0.48);
            headers.forEach(function (header, index) {
              rect(currentX, tableY, columns[index], rowHeight);
              text(header, currentX + columns[index] / 2, tableY + 6, 7, {
                align: 'center',
                maxWidth: columns[index] - 4,
              });
              currentX += columns[index];
            });

            const rows = data.items.slice(0, 14);
            const minimumRows = Math.max(8, rows.length);

            for (let rowIndex = 0; rowIndex < minimumRows; rowIndex += 1) {
              const rowTop = tableY + rowHeight + rowIndex * rowHeight;
              const item = rows[rowIndex];
              currentX = tableX;

              columns.forEach(function (width) {
                rect(currentX, rowTop, width, rowHeight);
                currentX += width;
              });

              if (!item) continue;

              currentX = tableX;
              text(String(rowIndex + 1), currentX + columns[0] / 2, rowTop + 6, 8, { align: 'center' });
              currentX += columns[0];
              text(item.item || '-', currentX + 4, rowTop + 6, 8, { maxWidth: columns[1] - 8 });
              currentX += columns[1];
              text(quantity(item.quantity), currentX + columns[2] / 2, rowTop + 6, 8, { align: 'center' });
              currentX += columns[2];
              text(item.unit || '-', currentX + columns[3] / 2, rowTop + 6, 8, { align: 'center' });
              currentX += columns[3];
              text(money(item.rate), currentX + columns[4] - 4, rowTop + 6, 8, { align: 'right' });
              currentX += columns[4];
              text(money(item.vatPercent), currentX + columns[5] - 4, rowTop + 6, 8, { align: 'right' });
              currentX += columns[5];
              text(money(item.vatAmount), currentX + columns[6] - 4, rowTop + 6, 8, { align: 'right' });
              currentX += columns[6];
              text(money(item.amount), currentX + columns[7] - 4, rowTop + 6, 8, { align: 'right' });
            }

            const footerTop = tableY + rowHeight + minimumRows * rowHeight + 12;
            rect(18, footerTop, 310, 128);
            fillRect(18, footerTop, 310, 16, 0.82);
            text('Comments or Special Instructions', 24, footerTop + 4, 10);
            textBlock('Payment Term : ' + data.modeOfPayment, 24, footerTop + 22, 9, {
              maxWidth: 285,
              maxLines: 2,
              lineHeight: 11,
            });
            textBlock(data.remarks || '-', 24, footerTop + 46, 9, {
              maxWidth: 285,
              maxLines: 7,
              lineHeight: 11,
            });

            const totalX = 360;
            const totalW = 217;
            const labelW = 122;
            const totalRows = [
              ['SUBTOTAL', money(data.subtotal)],
              ['VAT', money(data.vatTotal)],
              ['TOTAL ' + data.currency, money(data.total)],
            ];

            totalRows.forEach(function (totalRow, index) {
              const top = footerTop + index * 18;
              rect(totalX, top, labelW, 18);
              rect(totalX + labelW, top, totalW - labelW, 18);
              text(totalRow[0], totalX + labelW - 6, top + 5, index === 4 ? 11 : 9, { align: 'right' });
              text(totalRow[1], totalX + totalW - 6, top + 5, index === 4 ? 11 : 9, { align: 'right' });
            });

            rect(totalX, footerTop + 60, totalW, 34);
            textBlock(data.amountWords + ' only.', totalX + 8, footerTop + 66, 9, {
              maxWidth: totalW - 16,
              maxLines: 2,
              lineHeight: 11,
            });

            text('Purchaser', 34, 784, 10);
            text('Projects Manager', 297, 784, 10, { align: 'center' });
            text('General Manager', 560, 784, 10, { align: 'right' });

            const contentStream = content.join('\\n');
            return createPdfDocument(contentStream, logoBytes);
          }

          async function loadBytes(url) {
            let response;

            try {
              response = await fetch(url);
            } catch {
              return null;
            }

            if (!response.ok) {
              return null;
            }

            return new Uint8Array(await response.arrayBuffer());
          }

          function createPdfDocument(contentStream, logoBytes) {
            const encoder = new TextEncoder();
            const chunks = [];
            const offsets = [];
            let length = 0;
            const hasLogo = Boolean(logoBytes);
            const contentObjectId = hasLogo ? 6 : 5;

            function pushBytes(bytes) {
              chunks.push(bytes);
              length += bytes.length;
            }

            function pushString(value) {
              pushBytes(encoder.encode(value));
            }

            function addObject(id, parts) {
              offsets[id] = length;
              pushString(id + ' 0 obj\\n');
              parts.forEach(function (part) {
                if (typeof part === 'string') {
                  pushString(part);
                } else {
                  pushBytes(part);
                }
              });
              pushString('\\nendobj\\n');
            }

            pushString('%PDF-1.4\\n%PDF-DOWNLOAD\\n');
            addObject(1, ['<< /Type /Catalog /Pages 2 0 R >>']);
            addObject(2, ['<< /Type /Pages /Kids [3 0 R] /Count 1 >>']);
            addObject(3, [
              '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] ',
              '/Resources << /Font << /F1 4 0 R >> ',
              hasLogo ? '/XObject << /Logo 5 0 R >> ' : '',
              '>> /Contents ' + contentObjectId + ' 0 R >>',
            ]);
            addObject(4, ['<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>']);

            if (hasLogo) {
              addObject(5, [
                '<< /Type /XObject /Subtype /Image /Width 448 /Height 106 ',
                '/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode ',
                '/Length ' + logoBytes.length + ' >>\\nstream\\n',
                logoBytes,
                '\\nendstream',
              ]);
            }

            const contentBytes = encoder.encode(contentStream);
            addObject(contentObjectId, [
              '<< /Length ' + contentBytes.length + ' >>\\nstream\\n',
              contentBytes,
              '\\nendstream',
            ]);

            const xrefOffset = length;
            pushString('xref\\n0 ' + (contentObjectId + 1) + '\\n');
            pushString('0000000000 65535 f \\n');

            for (let index = 1; index <= contentObjectId; index += 1) {
              pushString(String(offsets[index]).padStart(10, '0') + ' 00000 n \\n');
            }

            pushString(
              'trailer\\n<< /Size ' +
                (contentObjectId + 1) +
                ' /Root 1 0 R >>\\nstartxref\\n' +
                xrefOffset +
                '\\n%%EOF'
            );

            const output = new Uint8Array(length);
            let offset = 0;
            chunks.forEach(function (chunk) {
              output.set(chunk, offset);
              offset += chunk.length;
            });

            return output;
          }

          function cleanPdfText(value) {
            return String(value == null ? '' : value).replace(/[^\\x20-\\x7E]/g, ' ');
          }

          function formatColor(color) {
            return color
              .map(function (value) {
                const parsed = Number(value);
                const safeValue = Number.isFinite(parsed) ? parsed : 0;
                return safeValue.toFixed(3);
              })
              .join(' ') + ' rg';
          }

          function pdfString(value) {
            return (
              '(' +
              cleanPdfText(value)
                .replace(/\\\\/g, '\\\\\\\\')
                .replace(/\\(/g, '\\\\(')
                .replace(/\\)/g, '\\\\)') +
              ')'
            );
          }

          function measureTextWidth(value, size) {
            return String(value).split('').reduce(function (total, character) {
              if (character === ' ') return total + size * 0.26;
              if (/[A-Z0-9]/.test(character)) return total + size * 0.62;
              if (/[a-z]/.test(character)) return total + size * 0.48;
              if (/[.,:;|!]/.test(character)) return total + size * 0.24;
              if (/[()/#&-]/.test(character)) return total + size * 0.34;
              return total + size * 0.52;
            }, 0);
          }

          function fitText(value, maxWidth, size) {
            if (measureTextWidth(value, size) <= maxWidth) {
              return value;
            }

            let fitted = value;

            while (fitted.length > 1 && measureTextWidth(fitted + '...', size) > maxWidth) {
              fitted = fitted.slice(0, -1);
            }

            return fitted.trimEnd() + '...';
          }

          function wrapText(value, maxWidth, size, maxLines) {
            if (!value) {
              return ['-'];
            }

            const words = value.split(/\\s+/).filter(Boolean);
            const lines = [];
            let currentLine = '';

            words.forEach(function (word) {
              const nextLine = currentLine ? currentLine + ' ' + word : word;

              if (measureTextWidth(nextLine, size) <= maxWidth) {
                currentLine = nextLine;
                return;
              }

              if (currentLine) {
                lines.push(currentLine);
                currentLine = '';
              }

              if (measureTextWidth(word, size) <= maxWidth) {
                currentLine = word;
                return;
              }

              lines.push(fitText(word, maxWidth, size));
            });

            if (currentLine) {
              lines.push(currentLine);
            }

            if (lines.length <= maxLines) {
              return lines;
            }

            const visibleLines = lines.slice(0, maxLines);
            visibleLines[maxLines - 1] = fitText(
              visibleLines[maxLines - 1] + '...',
              maxWidth,
              size
            );
            return visibleLines;
          }
          ${
            autoPrint
              ? `window.onload = function(){ setTimeout(function(){ window.print(); }, 250); };`
              : ''
          }
        </script>
      </body>
    </html>
  `
}

function getCompanyLogoMarkup(company: 'ARM' | 'AKR', origin: string) {
  if (company === 'ARM') {
    return `
      <div class="logo">
        <img
          class="logo-img"
          src="${escapeHtml(`${origin}/al-riyada-logo.jpeg`)}"
          alt="Al Riyada Metal Industrial LLC"
        />
      </div>
    `
  }

  if (company === 'AKR') {
    return `
      <div class="logo" aria-label="AKR Metal Industrial LLC">
        <div class="logo-main">
          <span class="logo-blue">AKR</span>
          <span class="logo-gray">METAL</span>
        </div>
        <div class="logo-sub">METAL INDUSTRIAL LLC</div>
      </div>
    `
  }

  return ''
}

function jsonForScript(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

function normalizeItems(data: PurchaseOrderPreviewData) {
  const subtotal = toNumber(data.poAmount)
  const totalVat = toNumber(data.vatAed)
  const vatRate = subtotal > 0 ? totalVat / subtotal : 0

  return data.items.map((item) => {
    const quantity = toNumber(item.quantity)
    const rate = toNumber(item.rate)
    const amount = toNumber(item.amount) || quantity * rate
    const vatPercent =
      item.vatPercent !== undefined
        ? toNumber(item.vatPercent)
        : amount > 0 && item.vat !== undefined
          ? (toNumber(item.vat) / amount) * 100
          : vatRate * 100
    const vatAmount =
      item.vatAmount !== undefined
        ? toNumber(item.vatAmount)
        : item.vat !== undefined
          ? toNumber(item.vat)
          : amount * (vatPercent / 100)

    return {
      ...item,
      quantity,
      rate,
      amount,
      currency: item.currency || data.currency || 'AED',
      vatPercent,
      vatAmount,
      vat: vatAmount,
    }
  })
}

function toNumber(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function formatMoney(value: number) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatNumber(value: number) {
  return formatQuantity(value)
}

function formatQuantity(value: string | number) {
  const parsed = Number(String(value ?? '').trim())

  if (!Number.isFinite(parsed)) return '0'

  return parsed.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  })
}

function getPdfFilename(poNumber: string) {
  const safeName = poNumber.trim() || 'purchase-order'
  return safeName.toLowerCase().endsWith('.pdf') ? safeName : `${safeName}.pdf`
}

function formatDateDisplay(value: string) {
  if (!value) return '-'

  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  })
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function numberToWords(value: number, currencyLabel: string) {
  const rounded = Math.round(value * 100) / 100
  const whole = Math.floor(rounded)
  const fraction = Math.round((rounded - whole) * 100)

  const wholeWords = convertWholeNumberToWords(whole)
  const normalizedCurrency = normalizeCurrencyLabel(currencyLabel)

  if (!fraction) return `${wholeWords} ${normalizedCurrency}`

  return `${wholeWords} and ${String(fraction).padStart(2, '0')}/100 ${normalizedCurrency}`
}

function normalizeCurrencyLabel(value: string) {
  const normalized = String(value || 'AED').trim().toUpperCase()
  return normalized || 'AED'
}

function convertWholeNumberToWords(value: number) {
  if (value === 0) return 'Zero'

  const ones = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ]
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  function convertUnderThousand(number: number): string {
    if (number < 20) return ones[number]
    if (number < 100) {
      return `${tens[Math.floor(number / 10)]}${number % 10 ? ` ${ones[number % 10]}` : ''}`
    }

    return `${ones[Math.floor(number / 100)]} Hundred${
      number % 100 ? ` ${convertUnderThousand(number % 100)}` : ''
    }`
  }

  const scales = [
    { value: 1000000000, label: 'Billion' },
    { value: 1000000, label: 'Million' },
    { value: 1000, label: 'Thousand' },
  ]

  let remaining = value
  const parts: string[] = []

  for (const scale of scales) {
    if (remaining >= scale.value) {
      parts.push(`${convertUnderThousand(Math.floor(remaining / scale.value))} ${scale.label}`)
      remaining %= scale.value
    }
  }

  if (remaining > 0) {
    parts.push(convertUnderThousand(remaining))
  }

  return parts.join(' ')
}
