export function useLoading() {
    const counter = useState<number>("loading-counter", () => 0);
    const isLoading = computed(() => counter.value > 0);

    function show() {
        counter.value++;
    }
    function hide() {
        counter.value = Math.max(0, counter.value - 1);
    }

    return { isLoading, show, hide };
}
