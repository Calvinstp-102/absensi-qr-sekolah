// Format angka & warna untuk Dashboard/Laporan (Modul 5)

/** 85.5 -> "85,5%", null -> "–" */
export function fmtPersen(v: number | null | undefined) {
    if (v === null || v === undefined) return "–";
    return `${v.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;
}

/** Warna bar kehadiran: >= 90 hijau, >= 80 kuning, sisanya merah. */
export function barColor(persen: number) {
    return persen >= 90 ? "bg-green-500" : persen >= 80 ? "bg-amber-400" : "bg-red-500";
}

export function textColor(persen: number) {
    return persen >= 90 ? "text-green-700" : persen >= 80 ? "text-amber-700" : "text-red-600";
}

/** No HP (08xx / +628xx / 628xx) -> link WhatsApp, atau null bila format tidak dikenali. */
export function waLink(noHp: string | null | undefined, pesan?: string) {
    if (!noHp) return null;
    const digits = noHp.replace(/\D/g, "");
    const nomor = digits.startsWith("0") ? `62${digits.slice(1)}` : digits.startsWith("62") ? digits : null;
    if (!nomor || nomor.length < 10) return null;
    return `https://wa.me/${nomor}${pesan ? `?text=${encodeURIComponent(pesan)}` : ""}`;
}
