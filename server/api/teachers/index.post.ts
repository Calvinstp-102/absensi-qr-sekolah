import bcrypt from "bcryptjs";
import { z } from "zod";

const createTeacherSchema = z.object({
    nama: z.string().min(1),
    email: z.string().email(),
    noHp: z.string().optional(),
    password: z.string().min(6),
    role: z.enum(["admin", "guru_piket", "wali_kelas"]),
});

export default defineEventHandler(async (event) => {
    const session = await requireUserSession(event);
    if (session.user.role !== "superadmin") {
        throw createError({
            statusCode: 403,
            statusMessage: "Hanya superadmin yang bisa menambah guru",
        });
    }

    const body = await readValidatedBody(event, createTeacherSchema.parse);
    const passwordHash = await bcrypt.hash(body.password, 10);

    return await prisma.teacher.create({
        data: {
            nama: body.nama,
            email: body.email,
            noHp: body.noHp,
            passwordHash,
            role: body.role,
        },
    });
});
