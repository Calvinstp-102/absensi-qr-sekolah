// Aturan password akun guru — dipakai bersama oleh form (app/) dan validasi API (server/)

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72; // batas bcrypt

export const PASSWORD_RULES = [
    {
        label: `Minimal ${PASSWORD_MIN_LENGTH} karakter`,
        test: (p: string) => p.length >= PASSWORD_MIN_LENGTH,
    },
    { label: "Mengandung huruf", test: (p: string) => /[A-Za-z]/.test(p) },
    { label: "Mengandung angka", test: (p: string) => /[0-9]/.test(p) },
] as const;

/** Status tiap aturan untuk ditampilkan sebagai checklist. */
export function checkPassword(password: string) {
    return PASSWORD_RULES.map((r) => ({ label: r.label, ok: r.test(password) }));
}

/** Skor kekuatan password 1–4 untuk indikator. */
export function passwordStrength(password: string) {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
    const levels = [
        { label: "Sangat lemah", color: "bg-red-500" },
        { label: "Lemah", color: "bg-red-500" },
        { label: "Cukup", color: "bg-accent-500" },
        { label: "Kuat", color: "bg-green-500" },
        { label: "Sangat kuat", color: "bg-green-600" },
    ];
    return { score: Math.max(score, 1), ...levels[score]! };
}

/** Password acak 12 karakter (huruf besar/kecil + angka, tanpa karakter mirip seperti 0/O, 1/l). */
export function generatePassword(length = 12) {
    const letters = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
    const digits = "23456789";
    const all = letters + digits;
    const random = (n: number) => {
        const buf = new Uint32Array(1);
        globalThis.crypto.getRandomValues(buf);
        return buf[0]! % n;
    };
    const chars = [letters[random(letters.length)]!, digits[random(digits.length)]!];
    while (chars.length < length) chars.push(all[random(all.length)]!);
    // Acak posisi agar huruf/angka wajib tidak selalu di depan
    for (let i = chars.length - 1; i > 0; i--) {
        const j = random(i + 1);
        [chars[i], chars[j]] = [chars[j]!, chars[i]!];
    }
    return chars.join("");
}
