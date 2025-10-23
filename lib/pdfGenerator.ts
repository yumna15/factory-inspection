import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';



interface DefectRow {
  defectType: string;
  minor: number;
  major: number;
  images: File[];
}

interface FormDataType {
  [key: string]: any;
  defects: DefectRow[];
}

const compressImage = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxWidth = 500;
        const scale = maxWidth / img.width;
        canvas.width = maxWidth;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        } else {
          reject('Canvas context not found');
        }
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const getImageBase64 = async (src: string): Promise<string> => {
  const response = await fetch(src);
  const blob = await response.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export async function generateInspectionPDF(data: FormDataType): Promise<Uint8Array> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

// === Add IDEAS Logo ===
// === Add IDEAS Logo ===
const logoPath = `${window.location.origin}/logo.jpeg`;

let logoBase64 = '';
try {
  logoBase64 = await getImageBase64(logoPath);

  // Maintain natural aspect ratio — wider and cleaner
  const logoWidth = 60;   // increase width for better visibility
  const logoHeight = 28;   // proportional height (to avoid compression)

  // Position: top-left corner
  const x = 40;  // left margin
  const y = 20;  // top margin

  doc.addImage(logoBase64, 'JPEG', x, y, logoWidth, logoHeight);
} catch (err) {
  console.warn("Logo not found:", err);
}



  // Sampling plan table (same as in your frontend table)
  const samplingPlan: Record<string, { minorPass: number; minorReject: number; majorPass: number; majorReject: number }> = {
  '51–90': { minorPass: 1, minorReject: 2, majorPass: 0, majorReject: 1 },
  '91–150': { minorPass: 1, minorReject: 2, majorPass: 1, majorReject: 2 },
  '151–280': { minorPass: 2, minorReject: 3, majorPass: 1, majorReject: 2 },
  '281–500': { minorPass: 3, minorReject: 4, majorPass: 2, majorReject: 3 },
  '501–1200': { minorPass: 5, minorReject: 6, majorPass: 3, majorReject: 4 },
  '1201–3200': { minorPass: 7, minorReject: 8, majorPass: 4, majorReject: 5 },
  '3201–10000': { minorPass: 10, minorReject: 11, majorPass: 6, majorReject: 7 },
};

  






// Centered text
doc.text(
  "Final Inspection Report",
  doc.internal.pageSize.getWidth() / 2,
  50,
  { align: "center" }
);
// === General Info Table ===
const inspectionResult = data.inspectionResult || '';
let resultCell: any = { content: inspectionResult };

switch (inspectionResult.toUpperCase()) {
  case 'PASS':
    resultCell.styles = { textColor: [0, 128, 0], fontStyle: 'bold' }; // green
    break;
  case 'REWORK':
    resultCell.styles = { textColor: [200, 0, 0], fontStyle: 'bold' }; // red
    break;
  case 'HOLD':
    resultCell.styles = { textColor: [200, 200, 0], fontStyle: 'bold' }; // yellow
    break;
  case 'REJECT':
    resultCell.styles = { textColor: [0, 0, 200], fontStyle: 'bold' }; // blue
    break;
}





  // === General Info Table ===
  const generalInfo = [
    ['Inspection Date', data.date],
    ['Supplier Name', data.supplierName],
    ['Item Description', data.itemDescription],
    ['Design No', data.designNo],
    ['Colour', data.colour],
    ['Inspector Name', data.checkerName],
    ['Fabric Quality', data.fabricQuality],
    ['Merchandiser Name', data.merchandiserName],
    ['Order Quantity', data.orderQuantity],
    ['Presented Quantity', data.presentedQuantity],
    ['No. of Pieces Inspected', data.piecesInspected],
    ['Delivery Date', data.deliveryDate],
    ['Total Cartons' , data.totalCartons],
    ['Inspected Cartons', data.inspectedCartons],
    ['Product Category', data.productCategory],
    ['Sampling Range', data.samplingRange],
    ['Inspection Result', resultCell]
  ];

  autoTable(doc, {
    startY: 80,
    head: [['Field', 'Value']],
    body: generalInfo,
    styles: { fontSize: 10 },
  });

  // === Defects Table ===
if (data.defects?.length) {
  autoTable(doc, {
    startY: doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 20 : 60,
    head: [['Defect Type', 'Minor', 'Major']],
    body: [
      ...data.defects.map((d) => [
        d.defectType,
        d.minor.toString(),
        d.major.toString(),
      ]),
      // Add totals row with background color
      [
        { content: 'TOTAL', styles: { fontStyle: 'bold', fillColor: [220, 220, 220] } },
        { content: data.totalMinor.toString(), styles: { fontStyle: 'bold', fillColor: [220, 220, 220] } },
        { content: data.totalMajor.toString(), styles: { fontStyle: 'bold', fillColor: [220, 220, 220] } },
      ],
    ],
    styles: { fontSize: 10 },
  });
}

 // After defects table is drawn
const limits = samplingPlan[data.samplingRange];
if (limits) {
  const y = (doc as any).lastAutoTable?.finalY + 30 || 200;

  autoTable(doc, {
    startY: y,
    head: [['Defect Category', 'Accept Limit', 'Reject Limit', 'Actual']],
    body: [
      [
        'Minor Defects',
        limits.minorPass,
        limits.minorReject,
        {
          content: data.totalMinor ?? 0,
          styles: {
            textColor:
              (data.totalMinor ?? 0) <= limits.minorReject
                ? [0, 128, 0] // green if within reject limit
                : [200, 0, 0], // red if exceeds reject limit
            fontStyle: 'bold',
          },
        },
      ],
      [
        'Major Defects',
        limits.majorPass,
        limits.majorReject,
        {
          content: data.totalMajor ?? 0,
          styles: {
            textColor:
              (data.totalMajor ?? 0) <= limits.majorReject
                ? [0, 128, 0] // green if within reject limit
                : [200, 0, 0], // red if exceeds reject limit
            fontStyle: 'bold',
          },
        },
      ],
    ],
    theme: 'grid',
    styles: { halign: 'center' },
    headStyles: { fillColor: [41, 128, 185] }, // blue header
    columnStyles: {
      0: { halign: 'left' }, // Defect Type aligned left
    },
  });
}





  // === Final Comments ===
  const evalY = doc.lastAutoTable?.finalY || 200;
  doc.setFontSize(12);
  doc.text('Final Comments:', 40, evalY + 40);
  doc.setFontSize(10);
  const commentLines = doc.splitTextToSize(data.finalComments || 'N/A', 500);
  doc.text(commentLines, 40, evalY + 60);

  // === Evaluation Image Sections ===
  const imageGroups = [
    { label: 'Inline Pictures', field: 'inlinePictures' },
    { label: 'PP Sample Pictures', field: 'ppPictures' },
    { label: 'Packing List Pictures', field: 'packingListPictures' },
    { label: 'PO Pictures', field: 'poPictures' },
    { label: 'Storage Pictures', field: 'storagePictures' },
    { label: 'Test Report Pictures', field: 'testReportPictures' },
    { label: 'Carton Pictures', field: 'cartonPictures' },
  ];
  // Helper function: convert File → Base64 string (no compression)
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

  for (const group of imageGroups) {
  const files: File[] = data[group.field];
  if (!files?.length) continue;

  doc.addPage();
  doc.setFontSize(14);
  doc.text(group.label, 40, 40);

  let y = 80; // start position below title
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;

  for (const file of files) {
    const base64 = await fileToBase64(file);

    // Load image to get natural dimensions
    const img = new Image();
    img.src = base64;
    await new Promise(res => (img.onload = res));

    let imgWidth = img.width;
    let imgHeight = img.height;

    // Max usable area for a single page
    const maxWidth = pageWidth - margin * 2;
    const maxHeight = pageHeight - margin * 2;

    // Scale proportionally so it fits within one page (not leftover space)
    let ratio = Math.min(maxWidth / imgWidth, maxHeight / imgHeight, 1);
    let displayWidth = imgWidth * ratio;
    let displayHeight = imgHeight * ratio;

    // If image doesn’t fit in the remaining space, move to new page
    if (y + displayHeight > pageHeight - margin) {
      doc.addPage();
      y = 60; // reset y position for new page
    }

    // Center image horizontally
    const x = (pageWidth - displayWidth) / 2;

    // Add image
    doc.addImage(base64, 'JPEG', x, y, displayWidth, displayHeight);

    // Move down for next image
    y += displayHeight + 20;
  }
}



   // === Defect Images ===
  for (const [index, defect] of data.defects.entries()) {
    if (!defect.images?.length) continue;

    doc.addPage();
    doc.setFontSize(14);
    doc.text(`Defect Images: ${defect.defectType} (#${index + 1})`, 40, 40);

    let x = 40;
    let y = 60;

    for (const file of defect.images) {
      const base64 = await compressImage(file);
      doc.addImage(base64, 'JPEG', x, y, 200, 150);

      x += 220;
      if (x + 200 > 550) {
        x = 40;
        y += 170;
      }

      if (y + 150 > 750) {
        doc.addPage();
        x = 40;
        y = 60;
      }
    }
  }

  // === Signatures Section ===
  doc.addPage();
  doc.setFontSize(14);
  doc.text('Signatures', 40, 40);

  const roles = ['qc', 'supplier', 'aqm', 'merch'];
  let sigY = 60;

  for (const role of roles) {
    const sigData = data[`${role}Signature`];
    if (!sigData) continue;

    doc.text(`${role.toUpperCase()} Signature:`, 40, sigY);
    doc.addImage(sigData, 'PNG', 200, sigY - 20, 150, 60);
    sigY += 90;
  }

  const arrayBuffer = doc.output('arraybuffer') as ArrayBuffer;
  return new Uint8Array(arrayBuffer);
}

