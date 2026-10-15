// Format error API yang konsisten. Semua error yang dikirim ke frontend punya:
//   - statusCode            : kode HTTP
//   - message/statusMessage : pesan Bahasa Indonesia yang bisa langsung ditampilkan ke user
//   - data.code             : kode mesin (lihat ErrorCode) untuk penanganan khusus di frontend
//   - data.fieldErrors      : (opsional) pesan per-field untuk ditampilkan di bawah input form
//   - data.retryAfter       : (opsional) detik sebelum boleh mencoba lagi (rate limit)

export type ErrorCode =
    | "UNAUTHENTICATED"
    | "SESSION_EXPIRED"
    | "FORBIDDEN"
    | "VALIDATION_ERROR"
    | "TOO_MANY_ATTEMPTS"
    | "NOT_FOUND"
    | "CONFLICT"
    | "BAD_REQUEST"
    | "INVALID_CREDENTIALS"
    | "ACCOUNT_DISABLED"
    // Modul 2 (Scan)
    | "QR_NOT_FOUND"
    | "QR_EXPIRED"
    | "STUDENT_INACTIVE"
    | "NOT_SCHOOL_DAY"
    | "ALREADY_RECORDED"
    | "PULANG_BELUM_DIBUKA"
    | "ALREADY_COMPLETE"
    | "BELUM_MASUK"
    | "CANCEL_NOT_ALLOWED";

const DEFAULT_CODES: Record<number, ErrorCode> = {
    400: "BAD_REQUEST",
    401: "UNAUTHENTICATED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    409: "CONFLICT",
    422: "VALIDATION_ERROR",
    429: "TOO_MANY_ATTEMPTS",
};

export interface AppErrorExtra {
    code?: ErrorCode;
    fieldErrors?: Record<string, string>;
    retryAfter?: number;
    [key: string]: unknown;
}

export function appError(
    statusCode: number,
    message: string,
    extra: AppErrorExtra = {},
) {
    const code = extra.code ?? DEFAULT_CODES[statusCode] ?? "BAD_REQUEST";
    return createError({
        statusCode,
        statusMessage: message,
        message,
        data: { ...extra, code },
    });
}

// Label field yang tampil di pesan error unik, mis. { email: "Email", nisn: "NISN" }
type FieldLabels = Record<string, string>;

/**
 * Ubah error Prisma yang "wajar" jadi error API berpesan jelas.
 * Error lain dilempar ulang apa adanya (akan dicatat error-logger & jadi 500).
 */
export function handlePrismaError(
    e: unknown,
    labels: FieldLabels = {},
    values: Record<string, unknown> = {},
): never {
    const err = e as { code?: string; meta?: Record<string, any> };

    if (err?.code === "P2002") {
        const field = extractUniqueField(err.meta, Object.keys(labels));
        const label = field ? (labels[field] ?? field) : "Data";
        const value = field ? values[field] : undefined;
        const message = value
            ? `${label} "${value}" sudah terdaftar. Silakan gunakan yang lain.`
            : `${label} tersebut sudah terdaftar. Silakan gunakan yang lain.`;
        throw appError(409, message, {
            fieldErrors: field ? { [field]: message } : undefined,
        });
    }

    if (err?.code === "P2025") {
        throw appError(404, "Data tidak ditemukan atau sudah dihapus.");
    }

    throw e;
}

function extractUniqueField(
    meta: Record<string, any> | undefined,
    knownFields: string[],
): string | undefined {
    if (!meta) return undefined;
    // Format meta berbeda antar versi/adapter Prisma -> cari nama field yang dikenal
    const haystack = JSON.stringify(meta).toLowerCase();
    return knownFields.find(
        (f) =>
            haystack.includes(`"${f.toLowerCase()}"`) ||
            haystack.includes(toSnake(f)),
    );
}

function toSnake(s: string) {
    return s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}
