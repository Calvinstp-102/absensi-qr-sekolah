const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PHOTO_MAX_BYTES = 2 * 1024 * 1024;
export const PHOTO_ACCEPT = PHOTO_TYPES.join(",");

/** Upload / hapus foto profil guru, lengkap dengan validasi & toast. */
export function useTeacherPhoto() {
    const toast = useToast();
    const api = useApi();
    const { user, fetch: refreshSession } = useUserSession();
    const busyUuid = ref<string | null>(null);

    function validate(file: File) {
        if (!PHOTO_TYPES.includes(file.type)) {
            return "File harus berupa foto JPG, PNG, atau WEBP.";
        }
        if (file.size > PHOTO_MAX_BYTES) {
            const mb = (file.size / 1024 / 1024).toFixed(1);
            return `Ukuran foto ${mb} MB terlalu besar. Maksimal 2 MB.`;
        }
        return null;
    }

    // Foto sendiri berubah -> ambil ulang sesi agar foto di sidebar ikut berubah
    async function afterChange(uuid: string) {
        if (uuid === user.value?.uuid) await refreshSession();
    }

    async function upload(uuid: string, file: File) {
        const invalid = validate(file);
        if (invalid) {
            toast.error("Foto tidak dapat diunggah", invalid);
            return false;
        }
        const body = new FormData();
        body.append("photo", file);
        busyUuid.value = uuid;
        try {
            const res = await api(`/api/teachers/${uuid}/photo`, {
                method: "POST",
                body,
            });
            await afterChange(uuid);
            toast.success("Foto diperbarui", res.message);
            return true;
        } catch (err) {
            toast.error("Gagal mengunggah foto", getErrorMessage(err));
            return false;
        } finally {
            busyUuid.value = null;
        }
    }

    async function remove(uuid: string) {
        busyUuid.value = uuid;
        try {
            const res = await api(`/api/teachers/${uuid}/photo`, {
                method: "DELETE",
            });
            await afterChange(uuid);
            toast.success("Foto dihapus", res.message);
            return true;
        } catch (err) {
            toast.error("Gagal menghapus foto", getErrorMessage(err));
            return false;
        } finally {
            busyUuid.value = null;
        }
    }

    return { upload, remove, busyUuid };
}
