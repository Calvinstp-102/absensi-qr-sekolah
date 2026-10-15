import { z } from "zod";

// Potongan schema Zod yang dipakai ulang di banyak endpoint (pesan Bahasa Indonesia)

/** Password baru sesuai PASSWORD_RULES (shared/utils/password.ts). */
export function newPasswordSchema(label = "Password baru") {
    return z
        .string({ error: `${label} wajib diisi.` })
        .min(PASSWORD_MIN_LENGTH, `${label} minimal ${PASSWORD_MIN_LENGTH} karakter.`)
        .max(PASSWORD_MAX_LENGTH, `${label} maksimal ${PASSWORD_MAX_LENGTH} karakter.`)
        .regex(/[A-Za-z]/, `${label} harus mengandung huruf.`)
        .regex(/[0-9]/, `${label} harus mengandung angka.`);
}

export const namaSchema = z
    .string({ error: "Nama wajib diisi." })
    .trim()
    .min(1, "Nama wajib diisi.")
    .min(2, "Nama minimal 2 karakter.")
    .max(100, "Nama maksimal 100 karakter.");

export const emailSchema = z
    .string({ error: "Email wajib diisi." })
    .trim()
    .toLowerCase()
    .min(1, "Email wajib diisi.")
    .max(191, "Email terlalu panjang.")
    .pipe(z.email("Format email tidak valid. Contoh: nama@sekolah.com"));

/** No HP opsional: kosong -> null, selain itu dinormalisasi lalu dicek formatnya. */
export const phoneSchema = z
    .string({ error: "No HP harus berupa teks." })
    .nullish()
    .transform((v) => (v ? normalizePhone(v) : ""))
    .refine((v) => v === "" || PHONE_PATTERN.test(v), PHONE_ERROR)
    .transform((v) => v || null);
