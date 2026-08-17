import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
} from "docx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const CELL_BORDER = {
  top: { style: BorderStyle.SINGLE, size: 2, color: "CBD5E1" },
  bottom: { style: BorderStyle.SINGLE, size: 2, color: "CBD5E1" },
  left: { style: BorderStyle.SINGLE, size: 2, color: "CBD5E1" },
  right: { style: BorderStyle.SINGLE, size: 2, color: "CBD5E1" },
};

function headerCell(text) {
  return new TableCell({
    borders: CELL_BORDER,
    shading: { fill: "F1F5F9" },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 18 })] })],
  });
}

function cell(text) {
  return new TableCell({
    borders: CELL_BORDER,
    children: [new Paragraph({ children: [new TextRun({ text: String(text ?? ""), size: 18 })] })],
  });
}

function fmtDate() {
  return new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

// ---------------------- DOCX ----------------------

export async function exportDocx({ antibiogram, flags, remedies, narrative, meta }) {
  const children = [];

  children.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [new TextRun({ text: "Antibiotic Policy Surveillance Report", bold: true })],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Generated ${fmtDate()}`, italics: true, color: "64748B", size: 20 }),
      ],
      spacing: { after: 300 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Records analyzed: ${meta?.recordCount ?? "—"}`, size: 20 }),
      ],
      spacing: { after: 300 },
    })
  );

  if (narrative) {
    children.push(
      new Paragraph({ heading: HeadingLevel.HEADING_1, text: "AI-Generated Summary" }),
      ...narrative.split("\n").filter(Boolean).map(
        (line) => new Paragraph({ children: [new TextRun({ text: line, size: 20 })], spacing: { after: 120 } })
      )
    );
  }

  children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, text: "Flagged Patterns", spacing: { before: 300 } }));
  if (flags.length === 0) {
    children.push(new Paragraph({ text: "No concerning patterns flagged in the current dataset." }));
  } else {
    flags.forEach((f) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `[${f.severity.toUpperCase()}] `, bold: true, color: f.severity === "high" ? "B91C1C" : "B45309" }),
            new TextRun({ text: f.title, bold: true }),
          ],
          spacing: { before: 200 },
        }),
        new Paragraph({ text: f.detail, spacing: { after: 100 } })
      );
    });
  }

  children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, text: "Antibiogram", spacing: { before: 300 } }));
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
            children: [cell(r.organism), cell(r.antimicrobial), cell(r.n), cell(`${r.pctSusceptible}%`), cell(`${r.pctResistant}%`)],
          })
      ),
    ];
    children.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }));
  }

  children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, text: "Remedy Suggestions", spacing: { before: 300 } }));
  if (remedies.length === 0) {
    children.push(new Paragraph({ text: "No remedy suggestions available." }));
  } else {
    remedies.forEach((r) => {
      children.push(new Paragraph({ text: `• ${r.message}`, spacing: { after: 80 } }));
    });
  }

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

export function exportPdf({ antibiogram, flags, remedies, narrative, meta }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 40;
  let y = 50;

  doc.setFontSize(18);
  doc.setFont(undefined, "bold");
  doc.text("Antibiotic Policy Surveillance Report", marginX, y);
  y += 20;

  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  doc.setTextColor(100);
  doc.text(`Generated ${fmtDate()}  |  Records analyzed: ${meta?.recordCount ?? "—"}`, marginX, y);
  doc.setTextColor(0);
  y += 25;

  if (narrative) {
    doc.setFontSize(13);
    doc.setFont(undefined, "bold");
    doc.text("AI-Generated Summary", marginX, y);
    y += 16;
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    const lines = doc.splitTextToSize(narrative, 515);
    lines.forEach((line) => {
      if (y > 780) {
        doc.addPage();
        y = 50;
      }
      doc.text(line, marginX, y);
      y += 13;
    });
    y += 15;
  }

  doc.setFontSize(13);
  doc.setFont(undefined, "bold");
  doc.text("Flagged Patterns", marginX, y);
  y += 8;

  if (flags.length === 0) {
    y += 12;
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.text("No concerning patterns flagged in the current dataset.", marginX, y);
    y += 20;
  } else {
    autoTable(doc, {
      startY: y + 6,
      margin: { left: marginX, right: marginX },
      head: [["Severity", "Pattern", "Detail"]],
      body: flags.map((f) => [f.severity.toUpperCase(), f.title, f.detail]),
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [15, 23, 42] },
      columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 160 }, 2: { cellWidth: 300 } },
    });
    y = doc.lastAutoTable.finalY + 25;
  }

  if (y > 700) {
    doc.addPage();
    y = 50;
  }
  doc.setFontSize(13);
  doc.setFont(undefined, "bold");
  doc.text("Antibiogram", marginX, y);

  if (antibiogram.length === 0) {
    y += 20;
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.text("No susceptibility data available.", marginX, y);
    y += 20;
  } else {
    autoTable(doc, {
      startY: y + 6,
      margin: { left: marginX, right: marginX },
      head: [["Organism", "Antimicrobial", "n", "% Susceptible", "% Resistant"]],
      body: antibiogram.map((r) => [r.organism, r.antimicrobial, r.n, `${r.pctSusceptible}%`, `${r.pctResistant}%`]),
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [15, 23, 42] },
    });
    y = doc.lastAutoTable.finalY + 25;
  }

  if (y > 700) {
    doc.addPage();
    y = 50;
  }
  doc.setFontSize(13);
  doc.setFont(undefined, "bold");
  doc.text("Remedy Suggestions", marginX, y);
  y += 16;
  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  if (remedies.length === 0) {
    doc.text("No remedy suggestions available.", marginX, y);
  } else {
    remedies.forEach((r) => {
      const lines = doc.splitTextToSize(`• ${r.message}`, 515);
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

  doc.save(`amr-surveillance-report-${Date.now()}.pdf`);
}
