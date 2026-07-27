import { zipSync, strToU8 } from "npm:fflate@0.8.2";

const BRAND = "1E3FA0";
const cors: Record<string,string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
};
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, "content-type": "application/json" } });

function esc(s: unknown): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
}
function para(text: string, o: { b?: boolean; size?: number; color?: string; align?: string; space?: number } = {}): string {
  const { b = false, size = 22, color = "000000", align = "left", space = 0 } = o;
  return `<w:p><w:pPr><w:spacing w:after=\"${space}\"/><w:jc w:val=\"${align}\"/></w:pPr><w:r><w:rPr>${b ? "<w:b/>" : ""}<w:sz w:val=\"${size}\"/><w:color w:val=\"${color}\"/><w:rFonts w:ascii=\"Arial\" w:hAnsi=\"Arial\"/></w:rPr><w:t xml:space=\"preserve\">${esc(text)}</w:t></w:r></w:p>`;
}
function cell(text: string, o: { b?: boolean; align?: string; w?: number; shade?: string } = {}): string {
  const { b = false, align = "left", w = 1800, shade } = o;
  return `<w:tc><w:tcPr><w:tcW w:w=\"${w}\" w:type=\"dxa\"/>${shade ? `<w:shd w:val=\"clear\" w:fill=\"${shade}\"/>` : ""}</w:tcPr><w:p><w:pPr><w:jc w:val=\"${align}\"/></w:pPr><w:r><w:rPr>${b ? "<w:b/>" : ""}<w:sz w:val=\"20\"/><w:rFonts w:ascii=\"Arial\" w:hAnsi=\"Arial\"/></w:rPr><w:t xml:space=\"preserve\">${esc(text)}</w:t></w:r></w:p></w:tc>`;
}
function table(headers: string[], rows: string[][], aligns: string[] = []): string {
  const head = `<w:tr>${headers.map((h, i) => cell(h, { b: true, shade: "F0F2F7", align: aligns[i] || "left" })).join("")}</w:tr>`;
  const body = rows.map((r) => `<w:tr>${r.map((c, i) => cell(c, { align: aligns[i] || "left" })).join("")}</w:tr>`).join("");
  return `<w:tbl><w:tblPr><w:tblW w:w=\"0\" w:type=\"auto\"/><w:tblBorders><w:top w:val=\"single\" w:sz=\"4\" w:color=\"D9DCE3\"/><w:left w:val=\"single\" w:sz=\"4\" w:color=\"D9DCE3\"/><w:bottom w:val=\"single\" w:sz=\"4\" w:color=\"D9DCE3\"/><w:right w:val=\"single\" w:sz=\"4\" w:color=\"D9DCE3\"/><w:insideH w:val=\"single\" w:sz=\"4\" w:color=\"D9DCE3\"/><w:insideV w:val=\"single\" w:sz=\"4\" w:color=\"D9DCE3\"/></w:tblBorders></w:tblPr>${head}${body}</w:tbl>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  let d: any;
  try { d = await req.json(); } catch { return json({ error: "invalid json" }, 400); }

  const body: string[] = [];
  body.push(para("SUB-SAHARA INSTITUTE", { b: true, size: 36, color: BRAND }));
  body.push(para("Management Development Consulting · Research · Training", { size: 18, color: "5C6470", space: 120 }));
  body.push(para(String(d.title || "Document").toUpperCase(), { b: true, size: 30, space: 40 }));
  if (d.ref) body.push(para(String(d.ref), { size: 20, color: "5C6470", space: 160 }));
  for (const m of d.meta || []) body.push(para(`${m.label}: ${m.value}`, { size: 20, space: 40 }));
  if ((d.meta || []).length) body.push(para("", { space: 80 }));
  if (d.table && d.table.headers) body.push(table(d.table.headers, d.table.rows || [], d.table.aligns || []));
  if ((d.totals || []).length) {
    body.push(para("", { space: 80 }));
    for (const t of d.totals) body.push(para(`${t.label}:  ${t.value}`, { b: !!t.bold, align: "right", size: 22 }));
  }
  if (d.notes) { body.push(para("", { space: 80 })); body.push(para(String(d.notes), { size: 19, color: "5C6470" })); }
  if ((d.signatures || []).length) {
    body.push(para("", { space: 300 }));
    body.push(table(d.signatures, [d.signatures.map(() => "")], d.signatures.map(() => "center")));
  }

  const documentXml = `<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n<w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\"><w:body>${body.join("")}<w:sectPr><w:pgSz w:w=\"11906\" w:h=\"16838\"/><w:pgMar w:top=\"1134\" w:right=\"1134\" w:bottom=\"1134\" w:left=\"1134\"/></w:sectPr></w:body></w:document>`;
  const contentTypes = `<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\"><Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/><Default Extension=\"xml\" ContentType=\"application/xml\"/><Override PartName=\"/word/document.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml\"/></Types>`;
  const rels = `<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"word/document.xml\"/></Relationships>`;

  const zipped = zipSync({
    "[Content_Types].xml": strToU8(contentTypes),
    "_rels/.rels": strToU8(rels),
    "word/document.xml": strToU8(documentXml),
  }, { level: 0 });

  let bin = "";
  const CH = 0x8000;
  for (let i = 0; i < zipped.length; i += CH) bin += String.fromCharCode.apply(null, Array.from(zipped.subarray(i, i + CH)) as any);
  const b64 = btoa(bin);
  return json({ filename: (d.filename || "document") + ".docx", b64 });
});
