import { writeFile, unlink, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import QRCode from "qrcode";

const QR_DIR = join(process.cwd(), "storage", "qrcodes");

export async function saveQrImage(qrUuid: string, token: string) {
    const buffer = await QRCode.toBuffer(token, { margin: 1, width: 300 });
    await writeFile(join(QR_DIR, `${qrUuid}.png`), buffer);
}

export async function readQrImage(qrUuid: string): Promise<Buffer> {
    return await readFile(join(QR_DIR, `${qrUuid}.png`));
}

export async function deleteQrImage(qrUuid: string) {
    const filePath = join(QR_DIR, `${qrUuid}.png`);
    if (existsSync(filePath)) {
        await unlink(filePath);
    }
}
