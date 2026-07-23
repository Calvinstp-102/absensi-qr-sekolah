interface ConfirmState {
    show: boolean;
    title: string;
    message: string;
    confirmText: string;
    danger: boolean;
    resolve: ((value: boolean) => void) | null;
}

export function useConfirm() {
    const state = useState<ConfirmState>("confirm-dialog", () => ({
        show: false,
        title: "",
        message: "",
        confirmText: "Ya, Lanjutkan",
        danger: false,
        resolve: null,
    }));

    function confirm(options: {
        title?: string;
        message: string;
        confirmText?: string;
        danger?: boolean;
    }): Promise<boolean> {
        return new Promise((resolve) => {
            state.value = {
                show: true,
                title: options.title || "Konfirmasi",
                message: options.message,
                confirmText: options.confirmText || "Ya, Lanjutkan",
                danger: options.danger ?? false,
                resolve,
            };
        });
    }

    return { state, confirm };
}
