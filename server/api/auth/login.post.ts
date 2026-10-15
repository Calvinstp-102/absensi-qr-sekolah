import bcrypt from "bcryptjs";
import { z } from "zod";

const loginSchema = z.object({
    email: z
        .string({ error: "Email wajib diisi." })
        .trim()
        .toLowerCase()
        .min(1, "Email wajib diisi.")
        .pipe(z.email("Format email tidak valid. Contoh: nama@sekolah.com")),
    password: z
        .string({ error: "Password wajib diisi." })
        .min(1, "Password wajib diisi."),
    remember: z.boolean().optional().default(false),
});

// Hash dummy agar waktu respons sama untuk email terdaftar maupun tidak
// (mencegah penebakan email yang terdaftar lewat selisih waktu).
let dummyHash: string | null = null;
function getDummyHash() {
    dummyHash ??= bcrypt.hashSync("dummy-password-tidak-dipakai", 10);
    return dummyHash;
}

export default defineEventHandler(async (event) => {
    const body = await parseBody(event, loginSchema);

    const ip = getRequestIP(event, { xForwardedFor: true }) ?? "unknown";
    const limitKey = `${body.email}|${ip}`;
    try {
        assertNotRateLimited(limitKey);
    } catch (e) {
        logger.warn("auth", "Login ditolak: masih dikunci sementara", {
            email: body.email,
            ip,
        });
        throw e;
    }

    const teacher = await prisma.teacher.findUnique({
        where: { email: body.email },
    });
    const usable = teacher && !teacher.deleted;

    const passwordValid = await bcrypt.compare(
        body.password,
        usable ? teacher.passwordHash : getDummyHash(),
    );

    if (!usable || !passwordValid) {
        const remaining = recordFailedAttempt(limitKey);
        // Di log alasannya dibedakan (untuk investigasi); respons ke browser tetap sama
        const reason = !teacher
            ? "email tidak terdaftar"
            : teacher.deleted
              ? "akun sudah dihapus"
              : "password salah";
        logger.warn("auth", `Login gagal: ${reason}`, {
            email: body.email,
            ip,
            sisaPercobaan: remaining,
        });
        // Log Aktivitas (Modul 7): hanya akun terdaftar. Tidak di-await agar waktu respons
        // tetap sama dengan email tidak terdaftar (anti-enumerasi).
        if (usable) {
            void catatAktivitasAkun(event, teacher.id, "login_gagal", { alasanGagal: "Password salah", sisaPercobaan: remaining });
        }
        if (remaining === 0) {
            logger.warn("auth", "Login dikunci sementara: terlalu banyak percobaan gagal", {
                email: body.email,
                ip,
            });
            if (usable) {
                void catatAktivitasAkun(event, teacher.id, "login_dikunci", {}, "Terlalu banyak percobaan login gagal, dikunci 15 menit");
            }
            assertNotRateLimited(limitKey);
        }
        const hint =
            remaining <= 2
                ? ` Sisa ${remaining} percobaan sebelum login dikunci sementara.`
                : "";
        throw appError(401, `Email atau password salah.${hint}`, {
            code: "INVALID_CREDENTIALS",
        });
    }

    // Password benar -> aman memberi tahu status akun
    if (!teacher.isActive) {
        logger.warn("auth", "Login ditolak: akun nonaktif", {
            userId: teacher.id,
            email: teacher.email,
            ip,
        });
        await catatAktivitasAkun(event, teacher.id, "login_ditolak", {}, "Akun nonaktif");
        throw appError(
            403,
            "Akun Anda dinonaktifkan. Hubungi admin sekolah untuk mengaktifkan kembali.",
            { code: "ACCOUNT_DISABLED" },
        );
    }

    resetAttempts(limitKey);

    const updated = await prisma.teacher.update({
        where: { id: teacher.id },
        data: { lastLoginAt: new Date() },
    });

    await startUserSession(event, updated, body.remember);

    logger.info("auth", "Login berhasil", {
        userId: updated.id,
        email: updated.email,
        role: updated.role,
        ingatSaya: body.remember,
        ip,
    });
    await catatAktivitasAkun(event, updated.id, "login", { ingatSaya: body.remember });

    return {
        user: {
            uuid: updated.uuid,
            nama: updated.nama,
            email: updated.email,
            role: updated.role,
        },
    };
});
