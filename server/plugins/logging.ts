// Logging tingkat server: start/stop server, setiap request (API & halaman), dan error.
// Baris request: method, path, status, durasi, user, IP. 2xx/3xx = INFO, 4xx = WARN,
// 5xx = ERROR + stack trace. Aset statis tidak dicatat.
// Penghapusan log lama ada di server/plugins/cron.ts.
import type { H3Event } from "h3";

const SKIP_PREFIXES = ["/_nuxt/", "/__nuxt", "/_ipx/", "/favicon"];
const STATIC_FILE =
    /\.(js|mjs|css|map|png|jpe?g|gif|svg|ico|webp|woff2?|ttf|txt|json)$/i;

function shouldSkip(path: string) {
    const pathname = path.split("?")[0] ?? path;
    return (
        SKIP_PREFIXES.some((p) => pathname.startsWith(p)) ||
        STATIC_FILE.test(pathname)
    );
}

function logRequest(event: H3Event, status: number, error?: unknown) {
    // Satu baris per request (hook error & afterResponse bisa sama-sama terpanggil)
    if (event.context.requestLogged) return;
    event.context.requestLogged = true;
    if (status < 500 && shouldSkip(event.path)) return;

    const startedAt = event.context.requestStartedAt as number | undefined;
    const duration = startedAt ? ` (${Date.now() - startedAt} ms)` : "";
    const message = `${event.method} ${event.path} -> ${status}${duration}`;
    const context = requestContext(event);

    if (status >= 500) logger.error("http", message, context, error);
    else if (status >= 400) logger.warn("http", message, context);
    else logger.info("http", message, context);
}

export default defineNitroPlugin((nitroApp) => {
    logger.info("system", "Server dimulai", {
        env: process.env.NODE_ENV,
        node: process.version,
        pid: process.pid,
    });

    nitroApp.hooks.hook("close", async () => {
        logger.info("system", "Server berhenti");
        await flushLogs();
    });

    nitroApp.hooks.hook("request", (event) => {
        event.context.requestStartedAt = Date.now();
    });

    // Request sukses (respons error tidak lewat sini, ditangani hook "error")
    nitroApp.hooks.hook("afterResponse", (event) => {
        logRequest(event, getResponseStatus(event));
    });

    // Request error: 4xx = error "wajar" (validasi, akses ditolak, dll) cukup 1 baris WARN;
    // 5xx dicatat lengkap dengan stack trace. Error di luar request (cron, plugin) juga dicatat.
    nitroApp.hooks.hook("error", (error, { event }) => {
        const statusCode = (error as { statusCode?: number }).statusCode ?? 500;
        const cause = (error as Error).cause ?? error;
        if (event) {
            logRequest(event, statusCode, cause);
        } else {
            logger.error("system", "Error tak terduga di luar request", undefined, cause);
        }
    });
});
