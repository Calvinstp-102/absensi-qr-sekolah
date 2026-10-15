// Semua pengaturan yang dikenal + siapa & kapan terakhir diubah (halaman Pengaturan)
export default defineEventHandler(async (event) => {
    await requireRole(event, ADMIN_ROLES);
    return await getAllSettings();
});
