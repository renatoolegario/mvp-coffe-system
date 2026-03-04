const MIME_TYPE_XLSX =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const RELS_NS = "http://schemas.openxmlformats.org/package/2006/relationships";
const MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const DOC_REL_NS =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

const textEncoder = new TextEncoder();

const XML_ENTITIES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

const escapeXml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => XML_ENTITIES[char] || char);

const sanitizeSheetName = (name, fallback = "Planilha") => {
  const clean = String(name || fallback).replace(/[:\\/?*\[\]]/g, " ").trim();
  if (!clean) return fallback;
  return clean.slice(0, 31);
};

const toColumnCode = (index) => {
  let result = "";
  let current = index + 1;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    current = Math.floor((current - 1) / 26);
  }
  return result;
};

const toCellReference = (rowIndex, columnIndex) =>
  `${toColumnCode(columnIndex)}${rowIndex + 1}`;

const toDisplayValue = (value) => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "boolean") return value ? "Sim" : "Nao";
  return value;
};

const buildCellXml = (value, rowIndex, columnIndex) => {
  const reference = toCellReference(rowIndex, columnIndex);
  const normalized = toDisplayValue(value);
  if (typeof normalized === "number" && Number.isFinite(normalized)) {
    return `<c r="${reference}"><v>${normalized}</v></c>`;
  }
  return `<c r="${reference}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(
    normalized,
  )}</t></is></c>`;
};

const buildWorksheetXml = (matrix = []) => {
  const rowsXml = matrix
    .map((row, rowIndex) => {
      const cellsXml = row
        .map((value, columnIndex) => buildCellXml(value, rowIndex, columnIndex))
        .join("");
      return `<row r="${rowIndex + 1}">${cellsXml}</row>`;
    })
    .join("");

  return `${XML_HEADER}<worksheet xmlns="${MAIN_NS}"><sheetData>${rowsXml}</sheetData></worksheet>`;
};

const normalizeSheetMatrix = (sheet) => {
  const columns = Array.isArray(sheet?.columns) ? sheet.columns : [];
  const rows = Array.isArray(sheet?.rows) ? sheet.rows : [];

  if (!rows.length && !columns.length) return [[]];

  if (rows.length && Array.isArray(rows[0])) {
    return rows;
  }

  const headers = columns.map((column) => column.header || column.key || "");
  const keys = columns.map((column) => column.key || "");
  const body = rows.map((row) => keys.map((key) => row?.[key]));
  return [headers, ...body];
};

const buildStylesXml = () =>
  `${XML_HEADER}<styleSheet xmlns="${MAIN_NS}"><fonts count="1"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

const buildWorkbookXml = (sheets) => {
  const sheetsXml = sheets
    .map(
      (sheet, index) =>
        `<sheet name="${escapeXml(
          sanitizeSheetName(sheet.name, `Planilha ${index + 1}`),
        )}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`,
    )
    .join("");
  return `${XML_HEADER}<workbook xmlns="${MAIN_NS}" xmlns:r="${DOC_REL_NS}"><sheets>${sheetsXml}</sheets></workbook>`;
};

const buildWorkbookRelsXml = (sheetCount) => {
  const sheetRels = Array.from({ length: sheetCount }, (_, index) => {
    const relId = index + 1;
    return `<Relationship Id="rId${relId}" Type="${DOC_REL_NS}/worksheet" Target="worksheets/sheet${relId}.xml"/>`;
  }).join("");
  const stylesRel = `<Relationship Id="rId${sheetCount + 1}" Type="${DOC_REL_NS}/styles" Target="styles.xml"/>`;
  return `${XML_HEADER}<Relationships xmlns="${RELS_NS}">${sheetRels}${stylesRel}</Relationships>`;
};

const buildRootRelsXml = () =>
  `${XML_HEADER}<Relationships xmlns="${RELS_NS}"><Relationship Id="rId1" Type="${DOC_REL_NS}/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

const buildContentTypesXml = (sheetCount) => {
  const sheetOverrides = Array.from({ length: sheetCount }, (_, index) => {
    const id = index + 1;
    return `<Override PartName="/xl/worksheets/sheet${id}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`;
  }).join("");
  return `${XML_HEADER}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheetOverrides}</Types>`;
};

const concatBytes = (parts) => {
  const size = parts.reduce((total, current) => total + current.length, 0);
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  return bytes;
};

const createDosDateTime = () => {
  const date = new Date();
  const year = Math.max(1980, date.getFullYear());
  const dosDate =
    ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  const dosTime =
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    Math.floor(date.getSeconds() / 2);
  return { dosDate, dosTime };
};

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

const crc32 = (bytes) => {
  let crc = 0xffffffff;
  for (let index = 0; index < bytes.length; index += 1) {
    crc = crcTable[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const createLocalFileHeader = ({
  fileNameBytes,
  crc,
  compressedSize,
  uncompressedSize,
  dosDate,
  dosTime,
}) => {
  const bytes = new Uint8Array(30 + fileNameBytes.length);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, dosTime, true);
  view.setUint16(12, dosDate, true);
  view.setUint32(14, crc, true);
  view.setUint32(18, compressedSize, true);
  view.setUint32(22, uncompressedSize, true);
  view.setUint16(26, fileNameBytes.length, true);
  view.setUint16(28, 0, true);
  bytes.set(fileNameBytes, 30);
  return bytes;
};

const createCentralDirectoryHeader = ({
  fileNameBytes,
  crc,
  compressedSize,
  uncompressedSize,
  localHeaderOffset,
  dosDate,
  dosTime,
}) => {
  const bytes = new Uint8Array(46 + fileNameBytes.length);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, dosTime, true);
  view.setUint16(14, dosDate, true);
  view.setUint32(16, crc, true);
  view.setUint32(20, compressedSize, true);
  view.setUint32(24, uncompressedSize, true);
  view.setUint16(28, fileNameBytes.length, true);
  view.setUint16(30, 0, true);
  view.setUint16(32, 0, true);
  view.setUint16(34, 0, true);
  view.setUint16(36, 0, true);
  view.setUint32(38, 0, true);
  view.setUint32(42, localHeaderOffset, true);
  bytes.set(fileNameBytes, 46);
  return bytes;
};

const createEndOfCentralDirectory = ({
  entriesCount,
  centralDirectorySize,
  centralDirectoryOffset,
}) => {
  const bytes = new Uint8Array(22);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(4, 0, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, entriesCount, true);
  view.setUint16(10, entriesCount, true);
  view.setUint32(12, centralDirectorySize, true);
  view.setUint32(16, centralDirectoryOffset, true);
  view.setUint16(20, 0, true);
  return bytes;
};

const buildZip = (entries) => {
  const localParts = [];
  const centralParts = [];
  const metadata = [];
  let offset = 0;
  const { dosDate, dosTime } = createDosDateTime();

  for (const entry of entries) {
    const fileNameBytes = textEncoder.encode(entry.name);
    const contentBytes = textEncoder.encode(entry.content);
    const checksum = crc32(contentBytes);
    const localHeader = createLocalFileHeader({
      fileNameBytes,
      crc: checksum,
      compressedSize: contentBytes.length,
      uncompressedSize: contentBytes.length,
      dosDate,
      dosTime,
    });
    localParts.push(localHeader, contentBytes);
    metadata.push({
      fileNameBytes,
      checksum,
      size: contentBytes.length,
      offset,
    });
    offset += localHeader.length + contentBytes.length;
  }

  const centralDirectoryOffset = offset;
  for (const item of metadata) {
    const centralHeader = createCentralDirectoryHeader({
      fileNameBytes: item.fileNameBytes,
      crc: item.checksum,
      compressedSize: item.size,
      uncompressedSize: item.size,
      localHeaderOffset: item.offset,
      dosDate,
      dosTime,
    });
    centralParts.push(centralHeader);
    offset += centralHeader.length;
  }

  const centralDirectorySize = offset - centralDirectoryOffset;
  const eocd = createEndOfCentralDirectory({
    entriesCount: metadata.length,
    centralDirectorySize,
    centralDirectoryOffset,
  });

  return concatBytes([...localParts, ...centralParts, eocd]);
};

const sanitizeFileName = (fileName) => {
  const clean = String(fileName || "exportacao")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, "_");
  return clean.endsWith(".xlsx") ? clean : `${clean}.xlsx`;
};

export const downloadWorkbookXlsx = ({ fileName, sheets = [] }) => {
  if (!Array.isArray(sheets) || !sheets.length) return;

  const normalizedSheets = sheets.map((sheet, index) => ({
    name: sanitizeSheetName(sheet?.name, `Planilha ${index + 1}`),
    matrix: normalizeSheetMatrix(sheet),
  }));

  const zipEntries = [
    {
      name: "[Content_Types].xml",
      content: buildContentTypesXml(normalizedSheets.length),
    },
    {
      name: "_rels/.rels",
      content: buildRootRelsXml(),
    },
    {
      name: "xl/workbook.xml",
      content: buildWorkbookXml(normalizedSheets),
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      content: buildWorkbookRelsXml(normalizedSheets.length),
    },
    {
      name: "xl/styles.xml",
      content: buildStylesXml(),
    },
    ...normalizedSheets.map((sheet, index) => ({
      name: `xl/worksheets/sheet${index + 1}.xml`,
      content: buildWorksheetXml(sheet.matrix),
    })),
  ];

  const bytes = buildZip(zipEntries);
  const blob = new Blob([bytes], { type: MIME_TYPE_XLSX });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = sanitizeFileName(fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};
