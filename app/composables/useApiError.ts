// Ambil pesan error yang ramah dari error $fetch.
// Server mengirim: { statusCode, message, statusMessage, data: { code, fieldErrors, retryAfter } }

interface ApiErrorData {
    code?: string;
    fieldErrors?: Record<string, string>;
    retryAfter?: number;
}

function payload(err: any): {
    message?: string;
    statusMessage?: string;
    data?: ApiErrorData;
} {
    return err?.data ?? {};
}

export function getErrorStatus(err: any): number | undefined {
    return err?.statusCode ?? err?.status ?? err?.response?.status;
}

export function getErrorCode(err: any): string | undefined {
    return payload(err).data?.code;
}

export function getFieldErrors(err: any): Record<string, string> {
    return payload(err).data?.fieldErrors ?? {};
}

export function getRetryAfter(err: any): number | undefined {
    return payload(err).data?.retryAfter;
}

const STATUS_MESSAGES: Record<number, string> = {
    401: "Sesi Anda telah berakhir. Silakan login kembali.",
    403: "Anda tidak memiliki akses untuk melakukan tindakan ini.",
    404: "Data yang dicari tidak ditemukan atau sudah dihapus.",
    413: "Ukuran file terlalu besar.",
    429: "Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.",
    500: "Terjadi kesalahan pada server. Coba lagi beberapa saat lagi.",
    502: "Server sedang tidak dapat dihubungi. Coba lagi beberapa saat lagi.",
    503: "Server sedang sibuk atau dalam perbaikan. Coba lagi beberapa saat lagi.",
    504: "Server terlalu lama merespons. Coba lagi beberapa saat lagi.",
};

// Pesan bawaan framework (bahasa Inggris) yang tidak layak ditampilkan ke user
const GENERIC_MESSAGES = /^(internal server error|server error|unauthorized|forbidden|not found|bad request|fetch failed|\[.*\])/i;

/** Pesan error yang siap ditampilkan ke user. */
export function getErrorMessage(err: any, fallback = "Terjadi kesalahan."): string {
    const status = getErrorStatus(err);

    // Tidak ada respons sama sekali -> masalah jaringan
    if (!status && (err?.name === "FetchError" || err instanceof TypeError)) {
        return "Tidak dapat terhubung ke server. Periksa koneksi internet Anda lalu coba lagi.";
    }

    const p = payload(err);
    const serverMessage = p.message || p.statusMessage;
    if (serverMessage && !GENERIC_MESSAGES.test(serverMessage)) {
        return serverMessage;
    }

    if (status && status >= 500) return STATUS_MESSAGES[status] ?? STATUS_MESSAGES[500]!;
    if (status && STATUS_MESSAGES[status]) return STATUS_MESSAGES[status]!;
    return fallback;
}

export function useApiError() {
    return {
        getErrorMessage,
        getFieldErrors,
        getErrorCode,
        getErrorStatus,
        getRetryAfter,
    };
}
