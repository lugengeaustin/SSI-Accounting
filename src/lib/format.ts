export const num = (n: number | string | null | undefined): string =>
  (Number(n) || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const today = (): string => new Date().toISOString().slice(0, 10);

export const money = (
  n: number | string | null | undefined,
  symbol = "TSh"
): string => `${symbol} ${num(n)}`;

export function csvDownload(rows: (string | number | null | undefined)[][], name: string) {
  const csv = rows
    .map((r) =>
      r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = name;
  a.click();
}
