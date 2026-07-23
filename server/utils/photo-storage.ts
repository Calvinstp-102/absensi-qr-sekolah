import { writeFile, unlink, readFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const PHOTO_DIR = join(process.cwd(), "storage", "photos");

export async function savePhoto(
    type: "students" | "teachers",
    uuid: string,
    buffer: Buffer,
    ext: string,
) {
    await mkdir(join(PHOTO_DIR, type), { recursive: true });
    const filename = `${uuid}.${ext}`;
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
