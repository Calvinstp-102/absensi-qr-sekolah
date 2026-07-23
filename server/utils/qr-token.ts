import { randomBytes } from "node:crypto";

export function generateQrToken(): string {
    return randomBytes(16).toString("hex");
}
