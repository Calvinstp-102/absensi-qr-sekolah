import bcrypt from "bcryptjs";
import { z } from "zod";

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

export default defineEventHandler(async (event) => {
    const body = await readValidatedBody(event, loginSchema.parse);

    const teacher = await prisma.teacher.findUnique({
        where: { email: body.email },
    });

    if (!teacher || !teacher.isActive) {
        throw createError({
            statusCode: 401,
            statusMessage: "Email atau password salah",
        });
    }

    const isValid = await bcrypt.compare(body.password, teacher.passwordHash);
    if (!isValid) {
        throw createError({
            statusCode: 401,
            statusMessage: "Email atau password salah",
        });
    }

    await setUserSession(event, {
        user: {
            id: teacher.id,
            nama: teacher.nama,
            email: teacher.email,
            role: teacher.role,
        },
    });

    return { status: "ok" };
});
