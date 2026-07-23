export default defineNuxtPlugin(() => {
    const { show, hide } = useLoading();

    const customFetch = $fetch.create({
        onRequest() {
            show();
        },
        onResponse() {
            hide();
        },
        onRequestError() {
            hide();
        },
        onResponseError() {
            hide();
        },
    });

    globalThis.$fetch = customFetch as typeof $fetch;
});
