import type { H3Event } from "h3";

export type TeacherRole = "superadmin" | "admin" | "guru_piket" | "wali_kelas";

export const ADMIN_ROLES: TeacherRole[] = ["superadmin", "admin"];
export const SUPERADMIN_ONLY: TeacherRole[] = ["superadmin"];

export const ROLE_LABELS: Record<TeacherRole, string> = {
    superadmin: "Superadmin",
    admin: "Admin",
    guru_piket: "Guru Piket",
    wali_kelas: "Wali Kelas",
};

// Durasi sesi login
export const SESSION_MAX_AGE_DEFAULT = 60 * 60 * 12; // 12 jam
export const SESSION_MAX_AGE_REMEMBER = 60 * 60 * 24 * 30; // 30 hari

const authUserSelect = {
    id: true,
    uuid: true,
    nama: true,
    email: true,
    role: true,
    fotoPath: true,
    isActive: true,
    deleted: true,
    sessionVersion: true,
} as const;

export type AuthUser = {
    id: number;
    uuid: string;
    nama: string;
    email: string;
    role: TeacherRole;
    fotoPath: string | null;
};

/**
 * Pastikan request berasal dari guru yang login DAN akunnya masih valid di database.
 * Role yang dikembalikan selalu dari database (bukan dari cookie), jadi perubahan role
 * langsung berlaku tanpa perlu login ulang.
 */
export async function requireAuth(event: H3Event): Promise<AuthUser> {
    // Cache per-request: kalau dipanggil berkali-kali di request yang sama, cukup 1 query
    if (event.context.authUser) return event.context.authUser as AuthUser;

    const session = await getUserSession(event);
    if (!session.user?.id) {
        throw appError(401, "Silakan login terlebih dahulu.", {
            code: "UNAUTHENTICATED",
        });
    }

    const teacher = await prisma.teacher.findUnique({
        where: { id: session.user.id },
        select: authUserSelect,
    });

    // Cookie bisa saja masih ada di browser, tapi batas sesi tetap ditegakkan di server
    const maxAgeMs =
        (session.remember ? SESSION_MAX_AGE_REMEMBER : SESSION_MAX_AGE_DEFAULT) *
        1000;
    const sessionTooOld =
        typeof session.loggedInAt !== "number" ||
        Date.now() - session.loggedInAt > maxAgeMs;

    let expiredReason: string | null = null;
    if (sessionTooOld) {
        expiredReason = "Sesi login Anda telah berakhir. Silakan login kembali.";
    } else if (!teacher || teacher.deleted) {
        expiredReason = "Akun Anda sudah tidak terdaftar. Hubungi admin sekolah.";
    } else if (!teacher.isActive) {
        expiredReason = "Akun Anda telah dinonaktifkan. Hubungi admin sekolah.";
    } else if (teacher.sessionVersion !== (session.sessionVersion ?? 0)) {
        expiredReason =
            "Data login akun Anda telah berubah (misalnya password diganti). Silakan login kembali.";
    }

    if (expiredReason || !teacher) {
        logger.warn("auth", `Sesi dicabut: ${expiredReason}`, {
            userId: session.user.id,
            email: session.user.email,
            path: event.path,
            ip: requestContext(event).ip,
        });
        await clearUserSession(event);
        throw appError(401, expiredReason!, { code: "SESSION_EXPIRED" });
    }

    const user: AuthUser = {
        id: teacher.id,
        uuid: teacher.uuid,
        nama: teacher.nama,
        email: teacher.email,
        role: teacher.role,
        fotoPath: teacher.fotoPath,
    };
    event.context.authUser = user;
    return user;
}

/** Seperti requireAuth, plus wajib punya salah satu role yang diizinkan. */
export async function requireRole(
    event: H3Event,
    roles: TeacherRole[],
): Promise<AuthUser> {
    const user = await requireAuth(event);
    if (!roles.includes(user.role)) {
        const allowed = roles.map((r) => ROLE_LABELS[r]).join(" atau ");
        logger.warn("auth", "Akses ditolak: role tidak diizinkan", {
            ...requestContext(event),
            role: user.role,
            butuhRole: roles,
            path: `${event.method} ${event.path}`,
        });
        throw appError(
            403,
            `Akses ditolak. Fitur ini hanya dapat digunakan oleh ${allowed}.`,
            { code: "FORBIDDEN" },
        );
    }
    return user;
}

/** Simpan sesi login (dipakai saat login & setelah ganti password). */
export async function startUserSession(
    event: H3Event,
    teacher: AuthUser & { sessionVersion: number },
    remember: boolean,
) {
    await replaceUserSession(
        event,
        {
            user: {
                id: teacher.id,
                uuid: teacher.uuid,
                nama: teacher.nama,
                email: teacher.email,
                role: teacher.role,
                fotoPath: teacher.fotoPath,
            },
            sessionVersion: teacher.sessionVersion,
            remember,
            loggedInAt: Date.now(),
        },
        {
            maxAge: remember
                ? SESSION_MAX_AGE_REMEMBER
                : SESSION_MAX_AGE_DEFAULT,
        },
    );
}
