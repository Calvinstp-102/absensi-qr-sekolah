import ExcelJS from "exceljs";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { KodeStatus } from "#shared/utils/attendance-status";

// Renderer export laporan (Modul 5): satu definisi dokumen -> Excel (exceljs) & PDF (pdf-lib)

export type ExportValue = string | number | null;

export type ExportColumn = {
    key: string;
    /** "\n" = header 2 baris */
    label: string;
    /** Lebar kolom Excel (karakter). Di PDF dipakai sebagai bobot lebar. */
    width: number;
    align?: "left" | "center" | "right";
    /** int = angka bulat, persen = 0–100 (null = "–"), kode = kode status berwarna */
    format?: "text" | "int" | "persen" | "kode";
};

export type ExportSection = {
    title?: string;
    /** Nama sheet Excel (default: judul dokumen) */
    sheetName?: string;
    columns: ExportColumn[];
    rows: Record<string, ExportValue>[];
    total?: Record<string, ExportValue>;
    /** PDF: mulai di halaman baru */
    newPage?: boolean;
    /** Teks bila tidak ada baris */
    empty?: string;
};

export type ExportDoc = {
    judul: string;
    periode: string;
    filter: string[];
    orientation: "portrait" | "landscape";
    ringkasan?: { label: string; value: string }[];
    sections: ExportSection[];
    legenda?: KodeStatus[];
    catatan?: string[];
    dicetakOleh: string;
    dicetakPada: Date;
    sekolah: { nama: string; alamat: string; npsn: string };
};

const PRIMARY = "1E3A5F";

/** Identitas sekolah dari Pengaturan ("-" dianggap kosong). */
export async function identitasSekolah() {
    const s = await getSettings(["nama_sekolah", "alamat_sekolah", "npsn"] as const);
    const clean = (v: string) => (v.trim() === "-" ? "" : v.trim());
    return { nama: clean(s.nama_sekolah) || "Sekolah", alamat: clean(s.alamat_sekolah), npsn: clean(s.npsn) };
}

export function formatPersen(v: ExportValue) {
    if (v === null || v === undefined || v === "") return "–";
    return `${Number(v).toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function teksSel(v: ExportValue, col: ExportColumn) {
    if (col.format === "persen") return formatPersen(v);
    if (v === null || v === undefined) return "";
    if (col.format === "int" && typeof v === "number") return v.toLocaleString("id-ID");
    return String(v);
}

/** Perataan kolom: angka & persen kanan, kode tengah, lainnya kiri (kecuali diatur). */
function alignKolom(c: ExportColumn) {
    return c.align ?? (c.format === "int" || c.format === "persen" ? "right" : c.format === "kode" ? "center" : "left");
}

function dicetakLabel(doc: ExportDoc) {
    const t = wibInfo(doc.dicetakPada);
    return `Dicetak oleh ${doc.dicetakOleh} pada ${formatTanggalPanjang(t.tanggal)} pukul ${t.jam} WIB`;
}

// ============================================================ PDF

const hex = (h: string) => rgb(parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255);

const C = {
    primary: hex(PRIMARY),
    text: hex("1F2937"),
    muted: hex("6B7280"),
    line: hex("D1D5DB"),
    zebra: hex("F9FAFB"),
    total: hex("E5E7EB"),
    white: rgb(1, 1, 1),
};

/** Potong teks agar muat lebar (tambah "..."). */
function fit(text: string, font: PDFFont, size: number, maxW: number) {
    let s = pdfSafe(text);
    if (font.widthOfTextAtSize(s, size) <= maxW) return s;
    while (s && font.widthOfTextAtSize(`${s}...`, size) > maxW) s = s.slice(0, -1);
    return s ? `${s.trimEnd()}...` : "";
}

export async function renderPdf(doc: ExportDoc): Promise<Uint8Array> {
    const pdf = await PDFDocument.create();
    pdf.setTitle(pdfSafe(`${doc.judul} - ${doc.periode}`));
    pdf.setAuthor(pdfSafe(doc.sekolah.nama));
    pdf.setCreator("Absensi QR Sekolah");
    pdf.setProducer("Absensi QR Sekolah");
    pdf.setCreationDate(doc.dicetakPada);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

    const [W, H] = doc.orientation === "landscape" ? [841.89, 595.28] : [595.28, 841.89];
    const M = 28;
    const BOTTOM = 40;
    const innerW = W - M * 2;
    let page!: PDFPage;
    let y = 0;

    const text = (t: string, x: number, yy: number, size: number, f: PDFFont = font, color = C.text) =>
        page.drawText(pdfSafe(t), { x, y: yy, size, font: f, color });

    function newPage(lanjutan?: string) {
        page = pdf.addPage([W, H]);
        y = H - M;
        if (lanjutan) {
            text(fit(`${doc.judul} · ${lanjutan}`, bold, 8, innerW), M, y - 8, 8, bold, C.muted);
            y -= 18;
        }
    }

    // --- Kop & judul (halaman pertama)
    newPage();
    text(fit(doc.sekolah.nama, bold, 14, innerW), M, y - 13, 14, bold, C.primary);
    y -= 18;
    const info = [doc.sekolah.alamat, doc.sekolah.npsn ? `NPSN ${doc.sekolah.npsn}` : ""].filter(Boolean).join("  ·  ");
    if (info) {
        text(fit(info, font, 8, innerW), M, y - 8, 8, font, C.muted);
        y -= 12;
    }
    page.drawLine({ start: { x: M, y: y - 3 }, end: { x: W - M, y: y - 3 }, thickness: 1.2, color: C.primary });
    y -= 18;
    text(fit(doc.judul.toUpperCase(), bold, 12, innerW), M, y - 10, 12, bold);
    y -= 16;
    text(fit(`Periode: ${doc.periode}`, font, 8.5, innerW), M, y - 8, 8.5);
    y -= 12;
    for (const fl of doc.filter) {
        text(fit(fl, font, 8, innerW), M, y - 8, 8, font, C.muted);
        y -= 11;
    }
    y -= 4;

    // --- Ringkasan (kotak-kotak)
    if (doc.ringkasan?.length) {
        // Satu baris bila muat (landscape <= 8, portrait <= 4), selain itu dibagi rata 2 baris
        const n = doc.ringkasan.length;
        const maks = doc.orientation === "landscape" ? 8 : 4;
        const perRow = n <= maks ? n : Math.min(maks, Math.ceil(n / 2));
        const gap = 6;
        const boxW = (innerW - gap * (perRow - 1)) / perRow;
        doc.ringkasan.forEach((r, i) => {
            const col = i % perRow;
            if (col === 0 && i > 0) y -= 36;
            const x = M + col * (boxW + gap);
            page.drawRectangle({ x, y: y - 32, width: boxW, height: 32, color: C.zebra, borderColor: C.line, borderWidth: 0.6 });
            text(fit(r.label, font, 7, boxW - 10), x + 5, y - 11, 7, font, C.muted);
            text(fit(r.value, bold, 11, boxW - 10), x + 5, y - 26, 11, bold);
        });
        y -= 44;
    }

    // --- Tabel
    sections: for (const [si, section] of doc.sections.entries()) {
        if (section.newPage && si > 0) newPage(section.title);
        else if (section.title) {
            if (y - 40 < BOTTOM) newPage(section.title);
            else {
                text(fit(section.title, bold, 10, innerW), M, y - 10, 10, bold, C.primary);
                y -= 16;
            }
        }

        const cols = section.columns;
        const totalW = cols.reduce((n, c) => n + c.width, 0);
        const widths = cols.map((c) => (c.width / totalW) * innerW);
        const xs = widths.map((_, i) => M + widths.slice(0, i).reduce((n, w) => n + w, 0));
        const dua = cols.some((c) => c.label.includes("\n"));
        const headH = dua ? 22 : 16;
        const many = cols.length > 20;
        const size = many ? 6.5 : 7.5;
        const headSize = many ? 6 : 7.5;
        const rowH = many ? 11.5 : 13;

        const drawHeader = () => {
            page.drawRectangle({ x: M, y: y - headH, width: innerW, height: headH, color: C.primary });
            cols.forEach((c, i) => {
                const lines = c.label.split("\n");
                lines.forEach((ln, n) => {
                    const t = fit(ln, bold, headSize, widths[i]! - (many ? 1.5 : 4));
                    const tw = bold.widthOfTextAtSize(t, headSize);
                    const align = alignKolom(c);
                    const x =
                        align === "right"
                            ? xs[i]! + widths[i]! - tw - 3
                            : align === "center"
                              ? xs[i]! + (widths[i]! - tw) / 2
                              : xs[i]! + 3;
                    const yy = y - (dua ? 9 + n * 9 : 11);
                    page.drawText(t, { x, y: yy, size: headSize, font: bold, color: C.white });
                });
            });
            y -= headH;
        };

        const drawRow = (row: Record<string, ExportValue>, n: number, isTotal: boolean) => {
            if (y - rowH < BOTTOM) {
                newPage(section.title ? `${section.title} (lanjutan)` : "lanjutan");
                drawHeader();
            }
            if (isTotal) page.drawRectangle({ x: M, y: y - rowH, width: innerW, height: rowH, color: C.total });
            else if (n % 2 === 1) page.drawRectangle({ x: M, y: y - rowH, width: innerW, height: rowH, color: C.zebra });
            cols.forEach((c, i) => {
                const v = row[c.key];
                if (c.format === "kode" && typeof v === "string" && v && v in KODE_STATUS) {
                    const info = KODE_STATUS[v as KodeStatus];
                    page.drawRectangle({ x: xs[i]! + 0.5, y: y - rowH + 0.5, width: widths[i]! - 1, height: rowH - 1, color: hex(info.bg) });
                }
                const f = isTotal ? bold : font;
                const raw = c.format === "kode" && v === "-" ? "" : teksSel(v ?? null, c);
                const t = fit(raw, f, size, widths[i]! - 5);
                if (!t) return;
                const tw = f.widthOfTextAtSize(t, size);
                const align = alignKolom(c);
                const x = align === "right" ? xs[i]! + widths[i]! - tw - 3 : align === "center" ? xs[i]! + (widths[i]! - tw) / 2 : xs[i]! + 3;
                const color = c.format === "kode" && typeof v === "string" && v in KODE_STATUS ? hex(KODE_STATUS[v as KodeStatus].fg) : C.text;
                page.drawText(t, { x, y: y - rowH + (rowH - size) / 2 + 1, size, font: f, color });
            });
            page.drawLine({ start: { x: M, y: y - rowH }, end: { x: W - M, y: y - rowH }, thickness: 0.3, color: C.line });
            y -= rowH;
        };

        if (y - headH - rowH < BOTTOM) newPage(section.title);
        drawHeader();
        if (!section.rows.length) {
            text(section.empty ?? "Tidak ada data.", M + 4, y - 12, 8, font, C.muted);
            y -= 22;
            continue sections;
        }
        section.rows.forEach((r, n) => drawRow(r, n, false));
        if (section.total) drawRow(section.total, 0, true);
        y -= 14;
    }

    // --- Legenda & catatan
    if (doc.legenda?.length) {
        const itemW = 118;
        const perRow = Math.max(1, Math.floor(innerW / itemW));
        const needed = 16 + Math.ceil(doc.legenda.length / perRow) * 13;
        if (y - needed < BOTTOM) newPage("Keterangan");
        text("Keterangan kode:", M, y - 8, 8, bold, C.muted);
        y -= 14;
        doc.legenda.forEach((k, i) => {
            const col = i % perRow;
            if (col === 0 && i > 0) y -= 13;
            const x = M + col * itemW;
            const info = KODE_STATUS[k];
            page.drawRectangle({ x, y: y - 10, width: 14, height: 10, color: hex(info.bg), borderColor: C.line, borderWidth: 0.4 });
            const kode = k === "-" ? "" : k;
            if (kode) page.drawText(kode, { x: x + 7 - bold.widthOfTextAtSize(kode, 7) / 2, y: y - 8, size: 7, font: bold, color: hex(info.fg) });
            text(fit(info.label, font, 7.5, itemW - 20), x + 18, y - 8, 7.5);
        });
        y -= 18;
    }
    for (const c of doc.catatan ?? []) {
        if (y - 12 < BOTTOM) newPage("Catatan");
        text(fit(c, font, 7.5, innerW), M, y - 8, 7.5, font, C.muted);
        y -= 11;
    }

    // --- Footer setiap halaman
    const pages = pdf.getPages();
    const kiri = dicetakLabel(doc);
    pages.forEach((p, i) => {
        p.drawLine({ start: { x: M, y: 30 }, end: { x: W - M, y: 30 }, thickness: 0.5, color: C.line });
        const kanan = `Halaman ${i + 1} dari ${pages.length}`;
        p.drawText(fit(`${kiri}  ·  Absensi QR Sekolah`, font, 7, innerW - 90), { x: M, y: 19, size: 7, font, color: C.muted });
        p.drawText(kanan, { x: W - M - font.widthOfTextAtSize(kanan, 7), y: 19, size: 7, font, color: C.muted });
    });

    return pdf.save();
}

// ============================================================ Excel

/** Nama sheet Excel: maks 31 karakter, tanpa []:*?/\ dan unik. */
function namaSheet(nama: string, used: Set<string>) {
    const base = nama.replace(/[[\]:*?/\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 31) || "Laporan";
    let name = base;
    for (let n = 2; used.has(name.toLowerCase()); n++) name = `${base.slice(0, 27)} (${n})`;
    used.add(name.toLowerCase());
    return name;
}

const thin = { style: "thin" as const, color: { argb: "FFD1D5DB" } };
const BORDER = { top: thin, left: thin, bottom: thin, right: thin };
const fill = (h: string) => ({ type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: `FF${h}` } });

function tulisKop(ws: ExcelJS.Worksheet, doc: ExportDoc, ncol: number, subjudul?: string) {
    const merge = (r: number) => ncol > 1 && ws.mergeCells(r, 1, r, ncol);
    const baris: [string, Partial<ExcelJS.Font>][] = [
        [doc.sekolah.nama, { bold: true, size: 14, color: { argb: `FF${PRIMARY}` } }],
        [[doc.sekolah.alamat, doc.sekolah.npsn ? `NPSN ${doc.sekolah.npsn}` : ""].filter(Boolean).join("  ·  "), { size: 9, color: { argb: "FF6B7280" } }],
        [doc.judul.toUpperCase(), { bold: true, size: 12 }],
        [`Periode: ${doc.periode}`, { size: 10 }],
        ...doc.filter.map((f): [string, Partial<ExcelJS.Font>] => [f, { size: 9, color: { argb: "FF6B7280" } }]),
        [dicetakLabel(doc), { size: 9, italic: true, color: { argb: "FF6B7280" } }],
        ...(subjudul ? [[subjudul, { bold: true, size: 11, color: { argb: `FF${PRIMARY}` } }] as [string, Partial<ExcelJS.Font>]] : []),
    ];
    for (const [t, f] of baris) {
        if (!t) continue;
        const row = ws.addRow([t]);
        row.getCell(1).font = f;
        merge(row.number);
    }
    ws.addRow([]);
}

export async function renderExcel(doc: ExportDoc): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = "Absensi QR Sekolah";
    wb.company = doc.sekolah.nama;
    wb.title = `${doc.judul} - ${doc.periode}`;
    wb.created = doc.dicetakPada;
    const used = new Set<string>();
    const pageSetup = (orientation: ExportDoc["orientation"]): Partial<ExcelJS.PageSetup> => ({
        paperSize: 9, // A4
        orientation,
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        horizontalCentered: true,
        margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.6, header: 0.3, footer: 0.3 },
    });
    const footer = `&L&8${doc.judul.replace(/&/g, "&&")} · ${doc.periode}&R&8Halaman &P dari &N`;

    // --- Sheet Ringkasan (ringkasan angka + legenda)
    if (doc.ringkasan?.length || doc.legenda?.length) {
        const ws = wb.addWorksheet(namaSheet("Ringkasan", used), { pageSetup: pageSetup("portrait") });
        ws.columns = [{ width: 32 }, { width: 22 }, { width: 44 }];
        tulisKop(ws, doc, 3);
        if (doc.ringkasan?.length) {
            const head = ws.addRow(["Ringkasan", "Nilai"]);
            head.eachCell((c) => {
                c.font = { bold: true, color: { argb: "FFFFFFFF" } };
                c.fill = fill(PRIMARY);
                c.border = BORDER;
            });
            for (const r of doc.ringkasan) {
                const row = ws.addRow([r.label, r.value]);
                row.getCell(1).border = BORDER;
                row.getCell(2).border = BORDER;
                row.getCell(2).font = { bold: true };
                row.getCell(2).alignment = { horizontal: "right" };
            }
            ws.addRow([]);
        }
        if (doc.legenda?.length) {
            const head = ws.addRow(["Kode", "Arti", "Keterangan"]);
            head.eachCell((c) => {
                c.font = { bold: true, color: { argb: "FFFFFFFF" } };
                c.fill = fill(PRIMARY);
                c.border = BORDER;
            });
            for (const k of doc.legenda) {
                const info = KODE_STATUS[k];
                const row = ws.addRow([k === "-" ? "(kosong)" : k, info.label, info.keterangan]);
                row.eachCell((c) => (c.border = BORDER));
                row.getCell(1).fill = fill(info.bg);
                row.getCell(1).font = { bold: true, color: { argb: `FF${info.fg}` } };
                row.getCell(1).alignment = { horizontal: "center" };
            }
            ws.addRow([]);
        }
        for (const c of doc.catatan ?? []) {
            const row = ws.addRow([c]);
            row.getCell(1).font = { size: 9, italic: true, color: { argb: "FF6B7280" } };
            ws.mergeCells(row.number, 1, row.number, 3);
        }
        ws.headerFooter.oddFooter = footer;
    }

    // --- Sheet tabel
    for (const section of doc.sections) {
        const ncol = section.columns.length;
        const ws = wb.addWorksheet(namaSheet(section.sheetName ?? doc.judul, used), { pageSetup: pageSetup(doc.orientation) });
        ws.columns = section.columns.map((c) => ({ width: c.width }));
        tulisKop(ws, doc, ncol, section.title);

        const dua = section.columns.some((c) => c.label.includes("\n"));
        const head = ws.addRow(section.columns.map((c) => c.label));
        const headerRow = head.number;
        head.height = dua ? 30 : 20;
        head.eachCell((cell) => {
            cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
            cell.fill = fill(PRIMARY);
            cell.border = BORDER;
        });
        section.columns.forEach((c, i) => {
            head.getCell(i + 1).alignment = { vertical: "middle", horizontal: alignKolom(c), wrapText: true };
        });

        const tulisBaris = (r: Record<string, ExportValue>, isTotal: boolean, n: number) => {
            const row = ws.addRow(
                section.columns.map((c) => {
                    const v = r[c.key];
                    if (v === null || v === undefined) return null;
                    if (c.format === "persen") return Number(v) / 100;
                    if (c.format === "kode" && v === "-") return "";
                    return v;
                }),
            );
            section.columns.forEach((c, i) => {
                const cell = row.getCell(i + 1);
                cell.border = BORDER;
                const align = alignKolom(c);
                cell.alignment = { vertical: "middle", horizontal: align, wrapText: c.format === "text" || !c.format };
                if (c.format === "persen") cell.numFmt = "0.0%";
                if (c.format === "int") cell.numFmt = "#,##0";
                const v = r[c.key];
                if (c.format === "kode" && typeof v === "string" && v in KODE_STATUS && v !== "-") {
                    const info = KODE_STATUS[v as KodeStatus];
                    cell.fill = fill(info.bg);
                    cell.font = { bold: true, color: { argb: `FF${info.fg}` } };
                } else if (isTotal) {
                    cell.fill = fill("E5E7EB");
                    cell.font = { bold: true };
                } else if (n % 2 === 1) {
                    cell.fill = fill("F9FAFB");
                }
            });
        };

        if (!section.rows.length) {
            const row = ws.addRow([section.empty ?? "Tidak ada data."]);
            row.getCell(1).font = { italic: true, color: { argb: "FF6B7280" } };
            if (ncol > 1) ws.mergeCells(row.number, 1, row.number, ncol);
        } else {
            section.rows.forEach((r, n) => tulisBaris(r, false, n));
            if (section.total) tulisBaris(section.total, true, 0);
            ws.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: headerRow + section.rows.length, column: ncol } };
        }

        ws.views = [{ state: "frozen", ySplit: headerRow, xSplit: section.columns.findIndex((c) => c.key === "nama") + 1 || 0 }];
        ws.pageSetup.printTitlesRow = `${headerRow}:${headerRow}`;
        ws.headerFooter.oddFooter = footer;
    }

    return Buffer.from(await wb.xlsx.writeBuffer());
}
