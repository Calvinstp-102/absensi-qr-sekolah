/**
 * Unduh file dari API lewat useApi() (bukan <a href>), supaya loading overlay,
 * penanganan sesi habis, dan pesan error (toast) tetap berjalan.
 */
export function useDownload() {
    const api = useApi();
    const toast = useToast();

    async function download(
        url: string,
        options: { query?: Record<string, unknown>; fallbackName: string; errorTitle?: string },
    ) {
        try {
            const res = await api.raw<Blob>(url, { query: options.query, responseType: "blob" });
            const disposition = res.headers.get("content-disposition") ?? "";
            const name = /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? options.fallbackName;

            const href = URL.createObjectURL(res._data as Blob);
            const link = document.createElement("a");
            link.href = href;
            link.download = name;
            link.click();
            setTimeout(() => URL.revokeObjectURL(href), 1000);
            return true;
        } catch (err: any) {
            // Respons error juga berupa Blob -> ubah ke JSON agar pesannya bisa dibaca
            // (err.data di ofetch membaca response._data)
            if (err?.response?._data instanceof Blob) {
                err.response._data = await err.response._data
                    .text()
                    .then((t: string) => JSON.parse(t))
                    .catch(() => undefined);
            }
            toast.error(options.errorTitle ?? "Gagal mengunduh", getErrorMessage(err));
            return false;
        }
    }

    return { download };
}
