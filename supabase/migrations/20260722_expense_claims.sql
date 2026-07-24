-- e-accounts "My Expenses" (self-service expense retirement + out-of-pocket claims).
-- Applied live to project eatygefbexdxrqmstkeu on 2026-07-22. Purely ADDITIVE +
-- reversible (drop table … cascade; delete from storage.buckets). The existing
-- accountant-side imprest RetireModal is untouched; this adds the self-service
-- submission path + accountant review queue on top.
--
-- Model: ONE unified table with a `kind` discriminator —
--   retirement → against an existing advance (imprest_id set)
--   claim      → out-of-pocket, no advance
-- Submissions are pending_review until an accountant approves + posts the journal
-- (Dr expense accounts / Cr 1300 Staff Imprest for retirements, or Cr 2100 Accrued
-- Expenses for claims) via fn_post_journal, or rejects with a note.
-- RLS: claimant sees only their own; accountant/admin see all + post. Guest
-- submissions (source='guest', claimant_id null) arrive via a SECURITY DEFINER RPC
-- added in WS3 — the columns are already present here so no further migration.

create table if not exists public.expense_claims (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('retirement','claim')),
  imprest_id uuid references public.imprests(id) on delete set null,
  claimant_id uuid references auth.users(id) on delete set null,
  claimant_name text not null,
  project_id uuid references public.projects(id) on delete set null,
  engagement_ref text,
  purpose text,
  currency text not null default 'TZS',
  fx_rate numeric not null default 1,
  total numeric not null default 0,
  status text not null default 'pending_review'
    check (status in ('pending_review','approved','rejected','posted')),
  source text not null default 'self' check (source in ('self','guest')),
  submitted_by uuid references auth.users(id) on delete set null,
  review_note text,
  journal_entry_id uuid references public.journal_entries(id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.expense_claim_lines (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.expense_claims(id) on delete cascade,
  description text not null,
  account_code text,
  receipt_no text,
  receipt_path text,
  amount numeric not null default 0,
  vat numeric not null default 0,
  remarks text
);
create index if not exists idx_expense_claim_lines_claim on public.expense_claim_lines(claim_id);
create index if not exists idx_expense_claims_claimant on public.expense_claims(claimant_id);
create index if not exists idx_expense_claims_status on public.expense_claims(status);

alter table public.expense_claims enable row level security;
alter table public.expense_claim_lines enable row level security;

drop policy if exists ec_read on public.expense_claims;
create policy ec_read on public.expense_claims for select to authenticated
  using (fn_role() = any(array['admin','accountant']) or claimant_id = auth.uid());
drop policy if exists ec_insert on public.expense_claims;
create policy ec_insert on public.expense_claims for insert to authenticated
  with check (fn_role() = any(array['admin','accountant','officer']) and claimant_id = auth.uid());
drop policy if exists ec_update on public.expense_claims;
create policy ec_update on public.expense_claims for update to authenticated
  using (fn_role() = any(array['admin','accountant']))
  with check (fn_role() = any(array['admin','accountant']));

drop policy if exists ecl_read on public.expense_claim_lines;
create policy ecl_read on public.expense_claim_lines for select to authenticated
  using (exists (select 1 from public.expense_claims c where c.id = claim_id
    and (fn_role() = any(array['admin','accountant']) or c.claimant_id = auth.uid())));
drop policy if exists ecl_write on public.expense_claim_lines;
create policy ecl_write on public.expense_claim_lines for all to authenticated
  using (exists (select 1 from public.expense_claims c where c.id = claim_id
    and (fn_role() = any(array['admin','accountant']) or c.claimant_id = auth.uid())))
  with check (exists (select 1 from public.expense_claims c where c.id = claim_id
    and (fn_role() = any(array['admin','accountant']) or c.claimant_id = auth.uid())));

insert into storage.buckets (id, name, public) values ('expense-receipts','expense-receipts', false)
  on conflict (id) do nothing;
drop policy if exists er_read on storage.objects;
create policy er_read on storage.objects for select to authenticated
  using (bucket_id = 'expense-receipts' and fn_role() = any(array['admin','accountant','officer']));
drop policy if exists er_write on storage.objects;
create policy er_write on storage.objects for insert to authenticated
  with check (bucket_id = 'expense-receipts' and fn_role() = any(array['admin','accountant','officer']));
