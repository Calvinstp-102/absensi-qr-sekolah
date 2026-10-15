/** Item menu titik tiga (BaseActionMenu). */
export interface ActionMenuItem<T extends string = string> {
    key: T;
    label: string;
    /** Path SVG ikon (viewBox 24) */
    icon: string[];
    danger?: boolean;
    divider?: boolean;
    /** Diisi -> item abu-abu & tidak bisa diklik, alasan tampil di bawah label */
    disabledReason?: string;
}
