import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ShadingType,
} from "docx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { sanitizeForPdf, parseBoldSegments } from "./textFormatting.js";

// Brand palette (matches the app's own OKLCH brand tokens, converted to
// sRGB/hex) so exported reports look like they came from the same product
// rather than a generic default jsPDF/docx document.
const BRAND = { hex: "009E99", rgb: [0, 158, 153] };
const VIOLET = { hex: "8857E0", rgb: [136, 87, 224] };
const CORAL = { hex: "F0555B", rgb: [240, 85, 91] };
const INK = { hex: "151E37", rgb: [21, 30, 55] };
const SUCCESS = { hex: "00A45C", rgb: [0, 164, 92] };
const WARN = { hex: "D57700", rgb: [213, 119, 0] };
const DANGER = { hex: "D7253A", rgb: [215, 37, 58] };
const MUTED_HEX = "64748B";
const MUTED_RGB = [100, 116, 139];

const CELL_BORDER = {
  top: { style: BorderStyle.SINGLE, size: 2, color: "E2E8F0" },
  bottom: { style: BorderStyle.SINGLE, size: 2, color: "E2E8F0" },
  left: { style: BorderStyle.SINGLE, size: 2, color: "E2E8F0" },
  right: { style: BorderStyle.SINGLE, size: 2, color: "E2E8F0" },
};

function headerCell(text) {
  return new TableCell({
    borders: CELL_BORDER,
    shading: { type: ShadingType.CLEAR, fill: BRAND.hex },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 18, color: "FFFFFF" })] })],
  });
}

function cell(text, { color, bold } = {}) {
  return new TableCell({
    borders: CELL_BORDER,
    children: [new Paragraph({ children: [new TextRun({ text: String(text ?? ""), size: 18, color, bold })] })],
  });
}

function fmtDate() {
  return new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

// Renders a block of AI-generated text (possibly containing **bold**
// markdown and multiple lines) as docx paragraphs with real bold runs.
function renderTextBlockDocx(text, { size = 20 } = {}) {
  return text
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const segments = parseBoldSegments(line);
      return new Paragraph({
        children: segments.map((seg) => new TextRun({ text: seg.text, bold: seg.bold, size })),
        spacing: { after: 120 },
      });
    });
}

function severityColorDocx(severity) {
  if (severity === "high") return DANGER.hex;
  if (severity === "medium") return WARN.hex;
  return SUCCESS.hex;
}

function severityColorPdf(severity) {
  if (severity === "high") return DANGER.rgb;
  if (severity === "medium") return WARN.rgb;
  return SUCCESS.rgb;
}

// ---------------------- DOCX ----------------------

export async function exportDocx({ antibiogram, flags, remedies, narrative, trendsInsight, meta, branding }) {
  const instituteName = branding?.instituteName?.trim();
  const logoDataUrl = branding?.logoDataUrl;
  const children = [];

  if (logoDataUrl) {
    try {
      const base64 = logoDataUrl.split(",")[1];
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      children.push(
        new Paragraph({
          children: [new ImageRun({ data: bytes, transformation: { width: 64, height: 64 }, type: "png" })],
          spacing: { after: 120 },
        })
      );
    } catch {
      // If the logo can't be decoded, skip it silently rather than failing the whole export.
    }
  }

  if (instituteName) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: instituteName, bold: true, size: 22, color: BRAND.hex })],
        spacing: { after: 60 },
      })
    );
  }

  children.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [new TextRun({ text: "Antibiotic Policy Surveillance Report", bold: true, color: INK.hex })],
    }),
    new Paragraph({
      children: [new TextRun({ text: `Generated ${fmtDate()}`, italics: true, color: MUTED_HEX, size: 20 })],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Records analyzed: ${meta?.recordCount ?? "—"}`, size: 20, color: INK.hex })],
      spacing: { after: 300 },
    })
  );

  if (narrative) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: "Executive Summary", bold: true, size: 26, color: BRAND.hex })],
        spacing: { before: 200, after: 40 },
      }),
      new Paragraph({
        children: [new TextRun({ text: "AI-assisted synthesis, grounded in the data below", italics: true, size: 16, color: MUTED_HEX })],
        spacing: { after: 150 },
      }),
      ...renderTextBlockDocx(narrative)
    );
  }

  if (trendsInsight) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: "Global Trends & Literature Context", bold: true, size: 26, color: VIOLET.hex })],
        spacing: { before: 300, after: 40 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "AI-generated synthesis, not a live database query — verify against primary sources.",
            italics: true,
            color: MUTED_HEX,
            size: 16,
          }),
        ],
        spacing: { after: 150 },
      }),
      ...renderTextBlockDocx(trendsInsight)
    );
  }

  children.push(
    new Paragraph({
      children: [new TextRun({ text: "Flagged Patterns", bold: true, size: 26, color: CORAL.hex })],
      spacing: { before: 300, after: 150 },
    })
  );
  if (flags.length === 0) {
    children.push(new Paragraph({ text: "No concerning patterns flagged in the current dataset." }));
  } else {
    flags.forEach((f) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `[${f.severity.toUpperCase()}] `, bold: true, color: severityColorDocx(f.severity) }),
            new TextRun({ text: f.title, bold: true, color: INK.hex }),
          ],
          spacing: { before: 200 },
        }),
        new Paragraph({ text: f.detail, spacing: { after: 100 } })
      );
    });
  }

  children.push(
    new Paragraph({
      children: [new TextRun({ text: "Antibiogram", bold: true, size: 26, color: BRAND.hex })],
      spacing: { before: 300, after: 150 },
    })
  );
  if (antibiogram.length === 0) {
    children.push(new Paragraph({ text: "No susceptibility data available." }));
  } else {
    const rows = [
      new TableRow({
        children: [headerCell("Organism"), headerCell("Antimicrobial"), headerCell("n"), headerCell("% Susceptible"), headerCell("% Resistant")],
      }),
      ...antibiogram.map(
        (r) =>
          new TableRow({
            children: [
              cell(r.organism, { bold: true }),
              cell(r.antimicrobial),
              cell(r.n),
              cell(`${r.pctSusceptible}%`, { color: r.pctSusceptible >= 80 ? SUCCESS.hex : r.pctSusceptible >= 50 ? WARN.hex : DANGER.hex, bold: true }),
              cell(`${r.pctResistant}%`, { color: r.pctResistant >= 30 ? DANGER.hex : undefined }),
            ],
          })
      ),
    ];
    children.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }));
  }

  children.push(
    new Paragraph({
      children: [new TextRun({ text: "Remedy Suggestions", bold: true, size: 26, color: VIOLET.hex })],
      spacing: { before: 300, after: 150 },
    })
  );
  if (remedies.length === 0) {
    children.push(new Paragraph({ text: "No remedy suggestions available." }));
  } else {
    remedies.forEach((r) => {
      children.push(new Paragraph({ text: `• ${r.message}`, spacing: { after: 80 } }));
    });
  }

  children.push(
    new Paragraph({
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0", space: 12 } },
      spacing: { before: 400 },
      children: [
        new TextRun({
          text:
            (narrative || trendsInsight
              ? "Sections marked AI-assisted were generated with AI support and grounded in the uploaded data; "
              : "") + "verify against primary clinical judgment and current local antibiogram before acting on this report.",
          italics: true,
          size: 15,
          color: MUTED_HEX,
        }),
      ],
    })
  );

  const doc = new Document({
    sections: [{ properties: {}, children }],
    styles: {
      default: {
        document: { run: { font: "Calibri" } },
      },
    },
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `amr-surveillance-report-${Date.now()}.docx`);
}

// ---------------------- PDF ----------------------

// Renders a block of possibly-multiline, possibly-**bold**-marked text into
// a jsPDF document, wrapping each bold/plain segment independently so bold
// spans render as real bold font weight instead of literal asterisks, and
// sanitizing text first so characters outside jsPDF's default font
// encoding don't corrupt rendering.
function renderTextBlockPdf(doc, text, { marginX, maxWidth, startY }) {
  let y = startY;
  const clean = sanitizeForPdf(text);
  const paragraphLines = clean.split("\n").filter(Boolean);

  paragraphLines.forEach((line) => {
    const segments = parseBoldSegments(line);
    let cursorX = marginX;
    doc.setFontSize(10);

    // Word-wrap manually across segments so bold/plain runs can sit on the
    // same visual line without losing correct wrapping.
    segments.forEach((seg) => {
      doc.setFont(undefined, seg.bold ? "bold" : "normal");
      const words = seg.text.split(" ");
      words.forEach((word, wi) => {
        const piece = word + (wi < words.length - 1 ? " " : "");
        const pieceWidth = doc.getTextWidth(piece);
        if (cursorX + pieceWidth > marginX + maxWidth) {
          y += 13;
          cursorX = marginX;
          if (y > 780) {
            doc.addPage();
            y = 50;
          }
        }
        doc.text(piece, cursorX, y);
        cursorX += pieceWidth;
      });
    });
    y += 15; // paragraph spacing
  });

  return y;
}

export function exportPdf({ antibiogram, flags, remedies, narrative, trendsInsight, meta, branding }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 40;
  const pageWidth = 595; // A4 width in pt
  const contentWidth = pageWidth - marginX * 2;
  let y = 50;

  const instituteName = branding?.instituteName?.trim();
  const logoDataUrl = branding?.logoDataUrl;

  // Header band
  doc.setFillColor(...BRAND.rgb);
  doc.rect(0, 0, pageWidth, 74, "F");

  let titleX = marginX;
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", marginX, 12, 48, 48);
      titleX = marginX + 60;
    } catch {
      // Skip logo silently if it fails to decode/embed.
    }
  }

  doc.setTextColor(255, 255, 255);
  if (instituteName) {
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.text(sanitizeForPdf(instituteName), titleX, 24);
    doc.setFontSize(16);
    doc.text("Antibiotic Policy Surveillance Report", titleX, 44);
  } else {
    doc.setFontSize(17);
    doc.setFont(undefined, "bold");
    doc.text("Antibiotic Policy Surveillance Report", titleX, 34);
  }
  doc.setFontSize(9);
  doc.setFont(undefined, "normal");
  doc.text(`Generated ${fmtDate()}  |  Records analyzed: ${meta?.recordCount ?? "-"}`, titleX, instituteName ? 60 : 56);

  doc.setTextColor(...INK.rgb);
  y = 100;

  function sectionHeading(text, color) {
    if (y > 740) {
      doc.addPage();
      y = 50;
    }
    doc.setFontSize(13);
    doc.setFont(undefined, "bold");
    doc.setTextColor(...color);
    doc.text(text, marginX, y);
    doc.setDrawColor(...color);
    doc.setLineWidth(1.2);
    doc.line(marginX, y + 4, marginX + doc.getTextWidth(text), y + 4);
    doc.setTextColor(...INK.rgb);
    y += 20;
  }

  if (narrative) {
    sectionHeading("Executive Summary", BRAND.rgb);
    doc.setFontSize(8.5);
    doc.setFont(undefined, "italic");
    doc.setTextColor(...MUTED_RGB);
    doc.text("AI-assisted synthesis, grounded in the data below", marginX, y);
    doc.setTextColor(...INK.rgb);
    y += 14;
    doc.setFont(undefined, "normal");
    y = renderTextBlockPdf(doc, narrative, { marginX, maxWidth: contentWidth, startY: y });
    y += 10;
  }

  if (trendsInsight) {
    sectionHeading("Global Trends & Literature Context", VIOLET.rgb);
    doc.setFontSize(8.5);
    doc.setFont(undefined, "italic");
    doc.setTextColor(...MUTED_RGB);
    doc.text("AI-generated synthesis, not a live database query - verify against primary sources.", marginX, y);
    doc.setTextColor(...INK.rgb);
    y += 14;
    doc.setFont(undefined, "normal");
    y = renderTextBlockPdf(doc, trendsInsight, { marginX, maxWidth: contentWidth, startY: y });
    y += 10;
  }

  sectionHeading("Flagged Patterns", CORAL.rgb);
  if (flags.length === 0) {
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.text("No concerning patterns flagged in the current dataset.", marginX, y);
    y += 20;
  } else {
    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [["Severity", "Pattern", "Detail"]],
      body: flags.map((f) => [f.severity.toUpperCase(), sanitizeForPdf(f.title), sanitizeForPdf(f.detail)]),
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: CORAL.rgb, textColor: [255, 255, 255] },
      columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 160 }, 2: { cellWidth: 300 } },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 0) {
          const sev = String(data.cell.raw).toLowerCase();
          data.cell.styles.textColor = sev === "high" ? DANGER.rgb : sev === "medium" ? WARN.rgb : SUCCESS.rgb;
          data.cell.styles.fontStyle = "bold";
        }
      },
    });
    y = doc.lastAutoTable.finalY + 25;
  }

  if (y > 700) {
    doc.addPage();
    y = 50;
  }
  sectionHeading("Antibiogram", BRAND.rgb);

  if (antibiogram.length === 0) {
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.text("No susceptibility data available.", marginX, y);
    y += 20;
  } else {
    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [["Organism", "Antimicrobial", "n", "% Susceptible", "% Resistant"]],
      body: antibiogram.map((r) => [sanitizeForPdf(r.organism), sanitizeForPdf(r.antimicrobial), r.n, `${r.pctSusceptible}%`, `${r.pctResistant}%`]),
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: BRAND.rgb, textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [240, 249, 249] },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 3) {
          const pct = parseInt(data.cell.raw, 10);
          data.cell.styles.textColor = pct >= 80 ? SUCCESS.rgb : pct >= 50 ? WARN.rgb : DANGER.rgb;
          data.cell.styles.fontStyle = "bold";
        }
        if (data.section === "body" && data.column.index === 4) {
          const pct = parseInt(data.cell.raw, 10);
          if (pct >= 30) {
            data.cell.styles.textColor = DANGER.rgb;
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
    });
    y = doc.lastAutoTable.finalY + 25;
  }

  if (y > 700) {
    doc.addPage();
    y = 50;
  }
  sectionHeading("Remedy Suggestions", VIOLET.rgb);
  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  if (remedies.length === 0) {
    doc.text("No remedy suggestions available.", marginX, y);
    y += 15;
  } else {
    remedies.forEach((r) => {
      const lines = doc.splitTextToSize(`- ${sanitizeForPdf(r.message)}`, contentWidth);
      lines.forEach((line) => {
        if (y > 780) {
          doc.addPage();
          y = 50;
        }
        doc.text(line, marginX, y);
        y += 13;
      });
    });
  }

  // Footer disclosure + page numbers on every page
  const pageCount = doc.internal.getNumberOfPages();
  const hasAiContent = !!(narrative || trendsInsight);
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(marginX, 812, pageWidth - marginX, 812);
    doc.setFontSize(7.5);
    doc.setFont(undefined, "italic");
    doc.setTextColor(...MUTED_RGB);
    const footerText = hasAiContent
      ? "Sections marked AI-assisted were generated with AI support and grounded in the uploaded data; verify against primary clinical judgment and current local antibiogram."
      : "Verify against primary clinical judgment and current local antibiogram before acting on this report.";
    doc.text(footerText, marginX, 824, { maxWidth: contentWidth - 60 });
    doc.setFont(undefined, "normal");
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - marginX - 55, 824);
  }

  doc.save(`amr-surveillance-report-${Date.now()}.pdf`);
}
