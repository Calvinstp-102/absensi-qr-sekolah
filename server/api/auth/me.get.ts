export default defineEventHandler(async (event) => {
    const user = await requireAuth(event);
    const session = await getUserSession(event);

    const teacher = await prisma.teacher.findUniqueOrThrow({
        where: { id: user.id },
        select: {
            uuid: true,
            nama: true,
            email: true,
            noHp: true,
            role: true,
            fotoPath: true,
            lastLoginAt: true,
            dateCreated: true,
        },
    });

    return {
        ...teacher,
        roleLabel: ROLE_LABELS[teacher.role],
        session: {
            remember: Boolean(session.remember),
            loggedInAt: session.loggedInAt ?? null,
        },
    };
});
