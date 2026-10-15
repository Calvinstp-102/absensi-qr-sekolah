// Aman dipanggil walau sesi sudah habis — hasilnya tetap "sudah keluar".
export default defineEventHandler(async (event) => {
    const session = await getUserSession(event);
    await clearUserSession(event);
    logger.info("auth", "Logout", {
        userId: session.user?.id,
        email: session.user?.email,
        ip: requestContext(event).ip,
    });
    // Log Aktivitas (Modul 7): hanya bila memang ada sesi
    if (session.user?.id) await catatAktivitasAkun(event, session.user.id, "logout");
    return { status: "ok" };
});
