export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
    id: number;
    type: ToastType;
    title: string;
    message?: string;
    duration: number;
}

const DEFAULT_DURATION: Record<ToastType, number> = {
    success: 4000,
    info: 4500,
    warning: 6000,
    error: 6500,
};
const MAX_TOASTS = 4;

let nextId = 1;

export function useToast() {
    const toasts = useState<ToastItem[]>("toasts", () => []);

    function dismiss(id: number) {
        toasts.value = toasts.value.filter((t) => t.id !== id);
    }

    function show(
        type: ToastType,
        title: string,
        message?: string,
        duration = DEFAULT_DURATION[type],
    ) {
        // Hindari toast kembar (mis. banyak request gagal bersamaan)
        const dup = toasts.value.find(
            (t) => t.type === type && t.title === title && t.message === message,
        );
        if (dup) return dup.id;

        const id = nextId++;
        toasts.value = [
            ...toasts.value.slice(-(MAX_TOASTS - 1)),
            { id, type, title, message, duration },
        ];
        if (import.meta.client && duration > 0) {
            setTimeout(() => dismiss(id), duration);
        }
        return id;
    }

    return {
        toasts,
        dismiss,
        success: (title: string, message?: string) =>
            show("success", title, message),
        error: (title: string, message?: string) =>
            show("error", title, message),
        warning: (title: string, message?: string) =>
            show("warning", title, message),
        info: (title: string, message?: string) => show("info", title, message),
    };
}
