import type { H3Event } from "h3";
import type { z } from "zod";

const VALIDATION_MESSAGE = "Periksa kembali data yang diisi.";

/** Ubah ZodError jadi { field: pesan } — ambil pesan pertama per field. */
export function zodFieldErrors(error: z.ZodError): Record<string, string> {
    const fieldErrors: Record<string, string> = {};
    for (const issue of error.issues) {
        const key = issue.path.length ? issue.path.join(".") : "_form";
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return fieldErrors;
}

function fail(error: z.ZodError): never {
    const fieldErrors = zodFieldErrors(error);
    const messages = Object.values(fieldErrors);
    // Kalau cuma 1 error, tampilkan langsung pesannya agar toast lebih informatif
    const message = messages.length === 1 ? messages[0]! : VALIDATION_MESSAGE;
    throw appError(422, message, { code: "VALIDATION_ERROR", fieldErrors });
}

/** Baca & validasi body JSON. Error -> 422 dengan fieldErrors. */
export async function parseBody<T extends z.ZodType>(
    event: H3Event,
    schema: T,
): Promise<z.infer<T>> {
    const raw = await readBody(event).catch(() => {
        throw appError(400, "Format data yang dikirim tidak valid.");
    });
    const result = schema.safeParse(raw ?? {});
    if (!result.success) fail(result.error);
    return result.data;
}

/** Validasi query string. Error -> 422 dengan fieldErrors. */
export function parseQuery<T extends z.ZodType>(
    event: H3Event,
    schema: T,
): z.infer<T> {
    const result = schema.safeParse(getQuery(event));
    if (!result.success) fail(result.error);
    return result.data;
}
