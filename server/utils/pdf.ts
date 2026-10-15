import type { PDFFont } from "pdf-lib";

// Helper teks PDF (font standar Helvetica) — dipakai export kartu QR (Modul 4) & laporan (Modul 5)

/**
 * Font standar PDF hanya mendukung huruf Latin (WinAnsi): buang aksen & ganti karakter lain.
 * Tanda baca WinAnsi yang dipakai aplikasi (· – — … • ‘ ’ “ ”) tetap dipertahankan.
 */
export function pdfSafe(text: string) {
    return text
        .replace(/→/g, "->")
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^\x20-\x7E·–—…•‘’“”]/g, "?");
}

/** Pecah teks jadi maksimal `maxLines` baris; baris terakhir dipotong dengan "...". */
export function wrapText(text: string, font: PDFFont, size: number, maxWidth: number, maxLines: number) {
    const fits = (s: string) => font.widthOfTextAtSize(s, size) <= maxWidth;
    const truncate = (s: string) => {
        while (s && !fits(`${s}...`)) s = s.slice(0, -1);
        return `${s.trimEnd()}...`;
    };

    const words = pdfSafe(text).split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let i = 0;
    while (i < words.length && lines.length < maxLines) {
        let line = words[i++]!;
        while (i < words.length && fits(`${line} ${words[i]}`)) line += ` ${words[i++]}`;
        lines.push(line);
    }
    // Kata yang terlalu panjang dipotong; sisa kata yang tidak muat -> "..." di baris terakhir
    const last = lines.length - 1;
    return lines.map((line, n) =>
        !fits(line) || (n === last && i < words.length) ? truncate(line) : line,
    );
}
