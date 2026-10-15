// Nomor HP Indonesia — dipakai bersama oleh form (app/) dan validasi API (server/)

export const PHONE_PATTERN = /^(\+62|62|0)8\d{7,12}$/;
export const PHONE_ERROR = "Format No HP tidak valid. Contoh: 081234567890";

/** Buang spasi, tanda hubung, titik, dan kurung: "0812-3456 7890" -> "081234567890". */
export function normalizePhone(value: string) {
    return value.replace(/[\s\-.()]/g, "");
}

export function isValidPhone(value: string) {
    return PHONE_PATTERN.test(normalizePhone(value));
}
