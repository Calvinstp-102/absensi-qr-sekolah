export async function getSettingValue(key: string): Promise<string> {
    const setting = await prisma.settings.findUnique({ where: { key } });
    if (!setting) {
        throw createError({
            statusCode: 500,
            statusMessage: `Setting "${key}" belum diisi di database`,
        });
    }
    return setting.value;
}
