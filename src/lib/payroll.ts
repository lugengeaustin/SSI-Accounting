import { supabase } from "./supabase";

const sb = supabase as any;
function ok<X>(r: { data: X | null; error: { message: string } | null }): X {
  if (r.error) throw new Error(r.error.message);
  return r.data as X;
}

export type Employee = { id: string; name: string; position: string | null; gross_salary: number | null; tin: string | null; nssf_no: string | null; active: boolean | null };
export const listEmployees = async () => ok<Employee[]>(await sb.from("employees").select("*").order("name"));
export const insertEmployee = async (row: Record<string, unknown>) => ok<Employee[]>(await sb.from("employees").insert(row).select());
export const updateEmployee = async (id: string, patch: Record<string, unknown>) => ok<Employee[]>(await sb.from("employees").update(patch).eq("id", id).select());

export type PayrollRun = { id: string; period: string | null; run_date: string | null; gross: number | null; paye: number | null; nssf_employee: number | null; nssf_employer: number | null; sdl: number | null; wcf: number | null; net: number | null };
export const listPayrollRuns = async () => ok<PayrollRun[]>(await sb.from("payroll_runs").select("*").order("period", { ascending: false }));

export type Payslip = { id: string; run_id: string; name: string | null; gross: number | null; taxable: number | null; paye: number | null; nssf_employee: number | null; net: number | null };
export const listPayslips = async (runId: string) => ok<Payslip[]>(await sb.from("payslips").select("*").eq("run_id", runId));

export const runPayroll = async (period: string) => ok<string>(await sb.rpc("fn_run_payroll", { p_period: period }));
