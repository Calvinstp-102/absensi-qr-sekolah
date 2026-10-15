// Pembatas percobaan login sederhana (in-memory).
// Cukup untuk 1 instance server (Railway). Kalau nanti di-scale ke beberapa instance,
// pindahkan penyimpanan ke Redis/DB.

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 menit

interface Bucket {
    count: number;
    firstAttemptAt: number;
    lockedUntil: number | null;
}

const buckets = new Map<string, Bucket>();

function cleanup(now: number) {
    // Cegah Map tumbuh tanpa batas
    if (buckets.size < 1000) return;
    for (const [key, b] of buckets) {
        const expired = b.lockedUntil
            ? b.lockedUntil < now
            : now - b.firstAttemptAt > WINDOW_MS;
        if (expired) buckets.delete(key);
    }
}

/** Lempar 429 kalau kunci ini sedang dikunci. */
export function assertNotRateLimited(key: string) {
    const b = buckets.get(key);
    if (!b?.lockedUntil) return;

    const remainingMs = b.lockedUntil - Date.now();
    if (remainingMs <= 0) {
        buckets.delete(key);
        return;
    }
    const retryAfter = Math.ceil(remainingMs / 1000);
    const minutes = Math.ceil(retryAfter / 60);
    throw appError(
        429,
        `Terlalu banyak percobaan login yang gagal. Coba lagi dalam ${minutes} menit.`,
        { code: "TOO_MANY_ATTEMPTS", retryAfter },
    );
}

/** Catat 1 percobaan gagal. Mengembalikan sisa percobaan sebelum dikunci. */
export function recordFailedAttempt(key: string): number {
    const now = Date.now();
    cleanup(now);

    let b = buckets.get(key);
    if (!b || now - b.firstAttemptAt > WINDOW_MS) {
        b = { count: 0, firstAttemptAt: now, lockedUntil: null };
        buckets.set(key, b);
    }
    b.count++;
    if (b.count >= MAX_ATTEMPTS) {
        b.lockedUntil = now + WINDOW_MS;
    }
    return Math.max(0, MAX_ATTEMPTS - b.count);
}

export function resetAttempts(key: string) {
    buckets.delete(key);
}
