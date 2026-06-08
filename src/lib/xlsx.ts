import * as XLSX from "xlsx";

export function exportXlsx(rows: (string | number | null | undefined)[][], name: string, sheet = "Report") {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheet);
  XLSX.writeFile(wb, name.endsWith(".xlsx") ? name : name + ".xlsx");
}
