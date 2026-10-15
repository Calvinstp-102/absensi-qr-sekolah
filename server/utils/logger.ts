import { appendFile, mkdir, readdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import type { H3Event } from "h3";

// Logger aplikasi: 1 file per hari (tanggal WIB) di storage/logs/app-YYYY-MM-DD.log,
// disimpan LOG_RETENTION_DAYS hari lalu dihapus oleh cron (lihat server/plugins/cron.ts).
// Setiap baris juga dicetak ke console agar tetap muncul di log Railway.

export const LOG_RETENTION_DAYS = 7;
const LOG_DIR = process.env.LOG_DIR || join(process.cwd(), "storage", "logs");
const LOG_FILE_PATTERN = /^app-(\d{4}-\d{2}-\d{2})\.log$/;
const TIMEZONE = "Asia/Jakarta";

type LogLevel = "debug" | "info" | "warn" | "error";
export type LogContext = Record<string, unknown>;

const LEVEL_ORDER: Record<LogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
};
const MIN_LEVEL: LogLevel =
    process.env.LOG_LEVEL?.toLowerCase() === "debug" ? "debug" : "info";

// Key yang isinya tidak boleh masuk log (dicek tanpa beda huruf besar/kecil)
const SENSITIVE_KEYS = new Set(
    [
        "password",
        "currentPassword",
        "newPassword",
        "confirmPassword",
        "passwordHash",
        "token",
        "qrToken",
        "cookie",
        "authorization",
        "session",
    ].map((k) => k.toLowerCase()),
);

// Tanggal & jam selalu WIB, tidak tergantung timezone server (Railway = UTC)
const wibFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
});

function wibParts(date: Date) {
    const p: Record<string, string> = {};
    for (const { type, value } of wibFormatter.formatToParts(date)) {
        p[type] = value;
    }
    return {
        date: `${p.year}-${p.month}-${p.day}`,
        time: `${p.hour}:${p.minute}:${p.second}.${String(date.getMilliseconds()).padStart(3, "0")}`,
    };
}

function redact(value: unknown, depth = 0): unknown {
    if (value === null || typeof value !== "object") return value;
    if (depth > 5) return "[terlalu dalam]";
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));

    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value)) {
        out[key] = SENSITIVE_KEYS.has(key.toLowerCase())
            ? "[disembunyikan]"
            : redact(v, depth + 1);
    }
    return out;
}

function stringifyContext(context?: LogContext) {
    if (!context) return "";
    const cleaned = Object.fromEntries(
        Object.entries(redact(context) as LogContext).filter(
            ([, v]) => v !== undefined,
        ),
    );
    if (Object.keys(cleaned).length === 0) return "";
    try {
        return " " + JSON.stringify(cleaned);
    } catch {
        return " [context tidak bisa diserialisasi]";
    }
}

function formatError(error: unknown) {
    const text =
        error instanceof Error
            ? (error.stack ?? `${error.name}: ${error.message}`)
            : String(error);
    return text
        .split("\n")
        .map((line) => "    " + line)
        .join("\n");
}

// Antrean tulis berurutan: baris tidak saling tumpang & request tidak menunggu disk
let writeQueue: Promise<void> = Promise.resolve();
let dirReady = false;
const reportedWriteErrors = new Set<string>();

function writeToFile(fileDate: string, text: string) {
    writeQueue = writeQueue
        .then(async () => {
            if (!dirReady) {
                await mkdir(LOG_DIR, { recursive: true });
                dirReady = true;
            }
            await appendFile(join(LOG_DIR, `app-${fileDate}.log`), text, "utf8");
        })
        .catch((e: NodeJS.ErrnoException) => {
            // Folder bisa saja terhapus saat server jalan -> coba buat ulang di tulisan berikutnya
            dirReady = false;
            const key = e.code ?? e.message;
            if (!reportedWriteErrors.has(key)) {
                reportedWriteErrors.add(key);
                console.error(`[logger] Gagal menulis file log (${LOG_DIR}):`, e);
            }
        });
}

function write(
    level: LogLevel,
    scope: string,
    message: string,
    context?: LogContext,
    error?: unknown,
) {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[MIN_LEVEL]) return;
    try {
        const { date, time } = wibParts(new Date());
        let line = `${date} ${time} WIB [${level.toUpperCase().padEnd(5)}] [${scope}] ${message}${stringifyContext(context)}`;
        if (error !== undefined) line += "\n" + formatError(error);

        const print =
            level === "error"
                ? console.error
                : level === "warn"
                  ? console.warn
                  : console.log;
        print(line);
        writeToFile(date, line + "\n");
    } catch (e) {
        // Logger tidak boleh membuat aplikasi error
        console.error("[logger] Gagal membuat baris log:", e);
    }
}

export const logger = {
    debug: (scope: string, message: string, context?: LogContext) =>
        write("debug", scope, message, context),
    info: (scope: string, message: string, context?: LogContext) =>
        write("info", scope, message, context),
    warn: (scope: string, message: string, context?: LogContext) =>
        write("warn", scope, message, context),
    error: (
        scope: string,
        message: string,
        context?: LogContext,
        error?: unknown,
    ) => write("error", scope, message, context, error),
};

/** Konteks standar dari request: id guru yang login (bila ada) & IP. */
export function requestContext(event: H3Event): LogContext {
    return {
        userId: (event.context.authUser as { id?: number } | undefined)?.id,
        ip: getRequestIP(event, { xForwardedFor: true }) ?? "unknown",
    };
}

/** Tunggu semua baris log selesai ditulis (dipakai sebelum server berhenti). */
export function flushLogs() {
    return writeQueue;
}

/**
 * Hapus file log yang lebih tua dari LOG_RETENTION_DAYS hari
 * (yang tersisa: hari ini + 6 hari sebelumnya). File lain di folder tidak disentuh.
 */
export async function cleanupOldLogs() {
    let files: string[];
    try {
        files = await readdir(LOG_DIR);
    } catch (e) {
        if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
        throw e;
    }

    // Batas = tanggal WIB hari ini dikurangi (retensi - 1) hari, dibandingkan sebagai string YYYY-MM-DD
    const today = wibParts(new Date()).date;
    const [y, m, d] = today.split("-").map(Number) as [number, number, number];
    const oldest = new Date(Date.UTC(y, m - 1, d - (LOG_RETENTION_DAYS - 1)))
        .toISOString()
        .slice(0, 10);

    const deleted: string[] = [];
    for (const file of files) {
        const fileDate = LOG_FILE_PATTERN.exec(file)?.[1];
        if (!fileDate || fileDate >= oldest) continue;
        await unlink(join(LOG_DIR, file));
        deleted.push(file);
    }
    return deleted;
}
