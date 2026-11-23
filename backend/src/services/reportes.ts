import fs from 'node:fs/promises';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  PageOrientation,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';

export interface FilaReporte {
  categoria: string;
  indicador: string;
  recomendacion: string;
  acciones: string;
  meta: string;
  areaResponsable: string;
  fechaCumplimiento: string;
  porcentajeAvance?: string;
  observaciones?: string;
  evidencias?: string;
}

export interface ModeloReporte {
  tipo: 'PLAN' | 'INFORME';
  licenciatura: string;
  organismo: string;
  fechaInicio: string;
  fechaFin: string;
  filas: FilaReporte[];
}

const AZUL = '0B2545';
const AZUL_CLARO = '134074';
const RAIZ_ASSETS = path.resolve(process.cwd(), '..', 'assets');
const LOGO_FES = path.join(RAIZ_ASSETS, 'FES_blanco.png');
const LOGO_UNAM = path.join(RAIZ_ASSETS, 'escudo-unam-blanco.png');

const COLUMNAS_PLAN = [
  { titulo: 'Categoría', clave: 'categoria' as const, width: 1100 },
  { titulo: 'Indicador', clave: 'indicador' as const, width: 1700 },
  { titulo: 'Recomendación', clave: 'recomendacion' as const, width: 2000 },
  { titulo: 'Acciones para atender la recomendación', clave: 'acciones' as const, width: 2300 },
  { titulo: 'Metas', clave: 'meta' as const, width: 1600 },
  { titulo: 'Área responsable', clave: 'areaResponsable' as const, width: 1600 },
  { titulo: 'Fecha de cumplimiento', clave: 'fechaCumplimiento' as const, width: 1100 },
];

const COLUMNAS_INFORME = [
  { titulo: 'Categoría', clave: 'categoria' as const, width: 850 },
  { titulo: 'Indicador', clave: 'indicador' as const, width: 1050 },
  { titulo: 'Recomendación', clave: 'recomendacion' as const, width: 1250 },
  { titulo: 'Acciones para atender la recomendación', clave: 'acciones' as const, width: 1450 },
  { titulo: 'Metas', clave: 'meta' as const, width: 1000 },
  { titulo: 'Área responsable', clave: 'areaResponsable' as const, width: 1050 },
  { titulo: 'Fecha de cumplimiento', clave: 'fechaCumplimiento' as const, width: 950 },
  { titulo: '% de avance', clave: 'porcentajeAvance' as const, width: 650 },
  { titulo: 'Observaciones', clave: 'observaciones' as const, width: 1050 },
  { titulo: 'Evidencias', clave: 'evidencias' as const, width: 1000 },
];

function textoFecha(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-');
  return anio && mes && dia ? `${dia}/${mes}/${anio}` : fecha;
}

function columnas(modelo: ModeloReporte) {
  return modelo.tipo === 'PLAN' ? COLUMNAS_PLAN : COLUMNAS_INFORME;
}

function celdasDocx(texto: string, ancho: number, encabezado = false): TableCell {
  return new TableCell({
    width: { size: ancho, type: WidthType.DXA },
    margins: { top: 80, bottom: 80, left: 80, right: 80 },
    shading: encabezado
      ? { type: ShadingType.SOLID, color: AZUL, fill: AZUL }
      : undefined,
    children: [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [
          new TextRun({
            text: texto || '—',
            bold: encabezado,
            color: encabezado ? 'FFFFFF' : '1F2937',
            size: encabezado ? 14 : 12,
          }),
        ],
      }),
    ],
  });
}

export async function generarWord(modelo: ModeloReporte): Promise<Buffer> {
  const [logoFes, logoUnam] = await Promise.all([
    fs.readFile(LOGO_FES),
    fs.readFile(LOGO_UNAM),
  ]);
  const definiciones = columnas(modelo);
  const encabezadoLogos = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 1800, type: WidthType.DXA },
            shading: { type: ShadingType.SOLID, color: AZUL, fill: AZUL },
            children: [new Paragraph({
              children: [new ImageRun({ type: 'png', data: logoFes, transformation: { width: 95, height: 45 } })],
            })],
          }),
          new TableCell({
            width: { size: 11200, type: WidthType.DXA },
            shading: { type: ShadingType.SOLID, color: AZUL, fill: AZUL },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'FACULTAD DE ESTUDIOS SUPERIORES ACATLÁN', bold: true, color: 'FFFFFF', size: 20 })],
            })],
          }),
          new TableCell({
            width: { size: 1800, type: WidthType.DXA },
            shading: { type: ShadingType.SOLID, color: AZUL, fill: AZUL },
            children: [new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new ImageRun({ type: 'png', data: logoUnam, transformation: { width: 48, height: 48 } })],
            })],
          }),
        ],
      }),
    ],
  });

  const filas = [
    new TableRow({ tableHeader: true, children: definiciones.map((col) => celdasDocx(col.titulo, col.width, true)) }),
    ...modelo.filas.map((fila) => new TableRow({
      children: definiciones.map((col) => celdasDocx(fila[col.clave] || '', col.width)),
    })),
  ];

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { orientation: PageOrientation.LANDSCAPE },
          margin: { top: 500, bottom: 500, left: 500, right: 500 },
        },
      },
      children: [
        encabezadoLogos,
        new Paragraph({ text: '' }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({
            text: modelo.tipo === 'PLAN' ? 'PLAN DE MEJORA CONTINUA' : 'INFORME DE SEGUIMIENTO',
            bold: true,
            color: AZUL,
            size: 24,
          })],
        }),
        new Paragraph({ children: [new TextRun({ text: `Programa educativo: ${modelo.licenciatura}`, bold: true, size: 16 })] }),
        new Paragraph({ children: [new TextRun({ text: `Organismo acreditador o IEVA: ${modelo.organismo}`, size: 16 })] }),
        new Paragraph({ children: [new TextRun({ text: `Fecha de acreditación: ${textoFecha(modelo.fechaInicio)} al ${textoFecha(modelo.fechaFin)}`, size: 16 })] }),
        new Paragraph({ text: '' }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: filas,
          borders: {
            top: { style: BorderStyle.SINGLE, size: 4, color: '64748B' },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: '64748B' },
            left: { style: BorderStyle.SINGLE, size: 4, color: '64748B' },
            right: { style: BorderStyle.SINGLE, size: 4, color: '64748B' },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: '94A3B8' },
            insideVertical: { style: BorderStyle.SINGLE, size: 2, color: '94A3B8' },
          },
        }),
      ],
    }],
  });

  return Packer.toBuffer(doc);
}

function pdfImagenes(doc: PDFKit.PDFDocument, fes: Buffer, unam: Buffer, modelo: ModeloReporte) {
  const ancho = doc.page.width;
  doc.save().rect(0, 0, ancho, 62).fill(AZUL);
  doc.image(fes, 30, 8, { fit: [115, 46] });
  doc.image(unam, ancho - 72, 5, { fit: [40, 50] });
  doc.fillColor('FFFFFF').font('Helvetica-Bold').fontSize(13)
    .text('FACULTAD DE ESTUDIOS SUPERIORES ACATLÁN', 160, 23, { width: ancho - 245, align: 'center' });
  doc.restore();
  doc.fillColor(AZUL).font('Helvetica-Bold').fontSize(13)
    .text(modelo.tipo === 'PLAN' ? 'PLAN DE MEJORA CONTINUA' : 'INFORME DE SEGUIMIENTO', 30, 75, { width: ancho - 60, align: 'center' });
  doc.fillColor('#1F2937').font('Helvetica').fontSize(8)
    .text(`Programa educativo: ${modelo.licenciatura}`, 30, 98)
    .text(`Organismo acreditador o IEVA: ${modelo.organismo}`, 30, 111)
    .text(`Fecha de acreditación: ${textoFecha(modelo.fechaInicio)} al ${textoFecha(modelo.fechaFin)}`, 30, 124);
}

export async function generarPdf(modelo: ModeloReporte): Promise<Buffer> {
  const [logoFes, logoUnam] = await Promise.all([
    fs.readFile(LOGO_FES),
    fs.readFile(LOGO_UNAM),
  ]);
  const doc = new PDFDocument({ size: 'LETTER', layout: 'landscape', margin: 30, bufferPages: true });
  const chunks: Buffer[] = [];
  const resultado = new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
  const defs = columnas(modelo);
  const totalWidth = doc.page.width - 60;
  const colWidths = defs.map((col) => col.width * totalWidth / defs.reduce((sum, item) => sum + item.width, 0));
  const fontSize = modelo.tipo === 'PLAN' ? 7 : 6;

  const drawHeader = () => {
    pdfImagenes(doc, logoFes, logoUnam, modelo);
    doc.y = 148;
  };
  const drawColumnHeaders = () => {
    let x = 30;
    const y = doc.y;
    doc.font('Helvetica-Bold').fontSize(fontSize);
    const heights = defs.map((col, i) => doc.heightOfString(col.titulo, { width: colWidths[i] - 8, align: 'left' }));
    const rowHeight = Math.max(24, ...heights.map((height) => height + 10));
    defs.forEach((col, i) => {
      doc.save().rect(x, y, colWidths[i], rowHeight).fill(AZUL);
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(fontSize)
        .text(col.titulo, x + 4, y + 5, { width: colWidths[i] - 8, height: rowHeight - 8 });
      doc.restore();
      x += colWidths[i];
    });
    doc.y = y + rowHeight;
  };
  const drawRow = (fila: FilaReporte) => {
    const valores = defs.map((col) => fila[col.clave] || '—');
    doc.font('Helvetica').fontSize(fontSize);
    const heights = valores.map((value, i) =>
      doc.heightOfString(value, { width: colWidths[i] - 8, align: 'left' })
    );
    const rowHeight = Math.max(26, ...heights.map((height) => height + 10));
    if (doc.y + rowHeight > doc.page.height - 30) {
      doc.addPage({ size: 'LETTER', layout: 'landscape', margin: 30 });
      drawHeader();
      drawColumnHeaders();
    }
    let x = 30;
    const y = doc.y;
    valores.forEach((value, i) => {
      doc.save().rect(x, y, colWidths[i], rowHeight).strokeColor('#94A3B8').lineWidth(0.5).stroke();
      doc.fillColor('#1F2937').font('Helvetica').fontSize(fontSize)
        .text(value, x + 4, y + 5, { width: colWidths[i] - 8, height: rowHeight - 8 });
      doc.restore();
      x += colWidths[i];
    });
    doc.y = y + rowHeight;
  };

  drawHeader();
  drawColumnHeaders();
  for (const fila of modelo.filas) drawRow(fila);

  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.fillColor('#64748B').font('Helvetica').fontSize(7)
      .text(`Página ${i + 1} de ${range.count}`, 30, doc.page.height - 22, { width: doc.page.width - 60, align: 'right' });
  }
  doc.end();
  return resultado;
}
