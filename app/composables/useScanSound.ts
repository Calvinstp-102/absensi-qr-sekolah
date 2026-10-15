// Bunyi & getar umpan balik scan. Dibuat dengan WebAudio (tanpa file suara).
import type { ScanTone } from "~/types/scan";

const STORAGE_KEY = "scan-sound-muted";

// [frekuensi Hz, durasi ms] per nada; dimainkan berurutan
const PATTERNS: Record<ScanTone, [number, number][]> = {
    hadir: [[880, 90], [1320, 140]],
    terlambat: [[880, 90], [660, 160]],
    pulang: [[1320, 90], [880, 140]],
    pulang_awal: [[1100, 90], [1100, 90], [880, 140]],
    peringatan: [[660, 200]],
    gagal: [[220, 180], [180, 260]],
};

const VIBRATE: Record<ScanTone, number[]> = {
    hadir: [60],
    terlambat: [60, 60, 60],
    pulang: [60],
    pulang_awal: [60, 60, 60],
    peringatan: [150],
    gagal: [250, 80, 250],
};

let ctx: AudioContext | null = null;

export function useScanSound() {
    const muted = useState<boolean>("scan-sound-muted", () => false);

    onMounted(() => {
        muted.value = localStorage.getItem(STORAGE_KEY) === "1";
    });

    function toggleMute() {
        muted.value = !muted.value;
        localStorage.setItem(STORAGE_KEY, muted.value ? "1" : "0");
        if (!muted.value) play("hadir");
    }

    function play(tone: ScanTone) {
        if (!import.meta.client) return;
        navigator.vibrate?.(VIBRATE[tone]);
        if (muted.value) return;
        try {
            ctx ??= new AudioContext();
            if (ctx.state === "suspended") void ctx.resume();
            let t = ctx.currentTime;
            for (const [freq, ms] of PATTERNS[tone]) {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = tone === "gagal" ? "square" : "sine";
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0.0001, t);
                gain.gain.exponentialRampToValueAtTime(0.25, t + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
                osc.connect(gain).connect(ctx.destination);
                osc.start(t);
                osc.stop(t + ms / 1000 + 0.02);
                t += ms / 1000 + 0.03;
            }
        } catch {
            // Browser tanpa WebAudio: cukup tanpa suara
        }
    }

    return { muted, toggleMute, play };
}
