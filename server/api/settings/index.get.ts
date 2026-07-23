export default defineEventHandler(async (event) => {
    const session = await requireUserSession(event);
    if (session.user.role !== "admin") {
        throw createError({
            statusCode: 403,
            statusMessage: "Hanya admin yang bisa mengakses ini",
        });
    }
    return await prisma.settings.findMany({ orderBy: { key: "asc" } });
});
    