const SB_URL = import.meta.env.VITE_SUPABASE_URL;

export type DocPayload = {
  filename: string;
  title: string;
  ref?: string;
  meta?: { label: string; value: string }[];
  table?: { headers: string[]; rows: string[][]; aligns?: string[] };
  totals?: { label: string; value: string; bold?: boolean }[];
  notes?: string;
  signatures?: string[];
};

export async function generateDocx(p: DocPayload) {
  const res = await fetch(`${SB_URL}/functions/v1/docgen`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(p),
  });
  if (!res.ok) throw new Error("DOCX generation failed (" + res.status + ")");
  const { filename, b64 } = await res.json();
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

export async function reportDocx(opts: { title: string; ref?: string; headers: string[]; rows: string[][]; aligns?: string[]; totals?: { label: string; value: string; bold?: boolean }[] }) {
  await generateDocx({ filename: opts.title.replace(/\s+/g, "_"), title: opts.title, ref: opts.ref, table: { headers: opts.headers, rows: opts.rows, aligns: opts.aligns }, totals: opts.totals });
}
