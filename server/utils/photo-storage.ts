import { writeFile, unlink, readFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { H3Event } from "h3";

const PHOTO_DIR = join(process.cwd(), "storage", "photos");

export async function savePhoto(
    type: "students" | "teachers",
    uuid: string,
    buffer: Buffer,
    ext: string,
    // Opsional: akhiran unik agar nama file berubah setiap ganti foto (cache browser ikut berganti)
    suffix?: string,
) {
    await mkdir(join(PHOTO_DIR, type), { recursive: true });
    const filename = suffix ? `${uuid}-${suffix}.${ext}` : `${uuid}.${ext}`;
    await writeFile(join(PHOTO_DIR, type, filename), buffer);
    return filename;
}

export async function readPhoto(
    type: "students" | "teachers",
    filename: string,
): Promise<Buffer> {
    return await readFile(join(PHOTO_DIR, type, filename));
}

export async function deletePhoto(
    type: "students" | "teachers",
    filename: string,
) {
    const filePath = join(PHOTO_DIR, type, filename);
    if (existsSync(filePath)) {
        await unlink(filePath);
    }
}

export function extFromMimeType(mimeType: string): string | null {
    const map: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
    };
    return map[mimeType] ?? null;
}

export const PHOTO_MAX_BYTES = 2 * 1024 * 1024;

/** Tentukan jenis gambar dari isi file (magic bytes), bukan dari MIME kiriman browser. */
export function detectImageType(buffer: Buffer): "jpg" | "png" | "webp" | null {
    if (buffer.length < 12) return null;
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return "jpg";
    }
    const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    if (pngSignature.every((b, i) => buffer[i] === b)) return "png";
    if (
        buffer.toString("ascii", 0, 4) === "RIFF" &&
        buffer.toString("ascii", 8, 12) === "WEBP"
    ) {
        return "webp";
    }
    return null;
}

/**
 * Baca file foto dari form multipart (field "photo") dan validasi ukuran & jenisnya.
 * Error -> 422 dengan fieldErrors.photo.
 */
export async function readPhotoUpload(event: H3Event) {
    const formData = await readMultipartFormData(event).catch(() => {
        throw appError(400, "Format data yang dikirim tidak valid.");
    });
    const file = formData?.find((f) => f.name === "photo");

    const fail = (message: string) =>
        appError(422, message, { fieldErrors: { photo: message } });

    if (!file || !file.data.length) {
        throw fail("Pilih file foto terlebih dahulu.");
    }
    if (file.data.length > PHOTO_MAX_BYTES) {
        const mb = (file.data.length / 1024 / 1024).toFixed(1);
        throw fail(`Ukuran foto ${mb} MB terlalu besar. Maksimal 2 MB.`);
    }
    const ext = detectImageType(file.data);
    if (!ext) {
        throw fail("File bukan gambar yang didukung. Gunakan foto JPG, PNG, atau WEBP.");
    }
    return { data: file.data, ext };
}
