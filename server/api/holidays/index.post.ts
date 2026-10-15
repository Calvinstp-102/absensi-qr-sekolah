// Tambah hari libur (rentang tanggal, semua / sebagian jenjang)
export default defineEventHandler(async (event) => {
    const user = await requireRole(event, ADMIN_ROLES);
    const body = await parseBody(event, holidaySchema);
    const today = todayWibStr();

    if (body.tanggalMulai < today) {
        throw appError(422, "Tanggal mulai tidak boleh sebelum hari ini.", {
            code: "VALIDATION_ERROR",
            fieldErrors: { tanggalMulai: "Tanggal mulai tidak boleh sebelum hari ini." },
        });
    }

    const jenjang = formatJenjangLibur(body.jenjang);
    const jenjangList = parseJenjangLibur(jenjang);
    const termasukHariIni = body.tanggalMulai <= today && today <= body.tanggalSelesai;

    const { holiday, dikosongkan } = await prisma.$transaction(async (tx) => {
        await assertNoOverlap(tx, { ...body, jenjang });
        const holiday = await tx.holiday.create({
            data: {
                tanggalMulai: toDbDate(body.tanggalMulai),
                tanggalSelesai: toDbDate(body.tanggalSelesai),
                keterangan: body.keterangan,
                jenjang,
                createdBy: user.id,
                updatedBy: user.id,
            },
            include: holidayInclude,
        });
        await tx.auditLog.create({
            data: {
                teacherId: user.id,
                actionType: "create_holiday",
                entityType: "holiday",
                entityId: holiday.id,
                afterValue: {
                    tanggalMulai: body.tanggalMulai,
                    tanggalSelesai: body.tanggalSelesai,
                    keterangan: body.keterangan,
                    jenjang: labelJenjangLibur(jenjangList),
                },
                reason: `Tambah hari libur: ${body.keterangan}`,
            },
        });
        const dikosongkan = termasukHariIni ? await bersihkanAbsensiOtomatisHariIni(tx, jenjangList) : 0;
        return { holiday, dikosongkan };
    });

    logger.info("pengaturan", "Hari libur ditambahkan", {
        ...requestContext(event),
        holidayId: holiday.id,
        tanggalMulai: body.tanggalMulai,
        tanggalSelesai: body.tanggalSelesai,
        jenjang: jenjang ?? "semua",
        ...(termasukHariIni ? { absensiOtomatisDikosongkan: dikosongkan } : {}),
    });

    const hariSekolah = parseHariSekolah(await getSettingValue("hari_sekolah"));
    return {
        status: "ok",
        message: `Hari libur "${body.keterangan}" berhasil ditambahkan.`,
        holiday: holidayView(holiday, hariSekolah, today),
        absensiDikosongkan: dikosongkan,
    };
});
