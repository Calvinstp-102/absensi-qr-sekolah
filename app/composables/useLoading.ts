// Overlay tampil minimal selama ini agar tidak hanya berkedip pada request cepat
const MIN_VISIBLE_MS = 300;

let shownAt = 0;
let hideTimer: ReturnType<typeof setTimeout> | undefined;

export function useLoading() {
    // counter = jumlah request yang sedang berjalan; visible = status overlay
    const counter = useState<number>("loading-counter", () => 0);
    const visible = useState<boolean>("loading-visible", () => false);
    const isLoading = computed(() => visible.value);

    function show() {
        counter.value++;
        clearTimeout(hideTimer);
        if (!visible.value) {
            visible.value = true;
            shownAt = Date.now();
        }
    }

    function hide() {
        counter.value = Math.max(0, counter.value - 1);
        if (counter.value > 0) return;
        const remaining = MIN_VISIBLE_MS - (Date.now() - shownAt);
        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => {
            if (counter.value === 0) visible.value = false;
        }, Math.max(0, remaining));
    }

    return { isLoading, show, hide };
}
