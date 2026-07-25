-- WS3 cross-app: tokenized GUEST expense submission (a facilitator who signed a
-- contract in e-proposals retires expenses here without an e-accounts login).
-- Applied live to eatygefbexdxrqmstkeu 2026-07-22. Additive + reversible.
--
-- e-proposals (a different Supabase project) mints a token via
-- create_expense_guest_token(secret, …) — secret held in private.expense_relay_secret
-- + the e-proposals server env (HCS-register relay pattern). The guest opens
-- ssi-accounting.vercel.app/retire/<token> (public, no login); the Vite page calls
-- resolve_expense_guest_token (context) then submit_guest_expense (writes an
-- expense_claim with source='guest', claimant_id null). All three are SECURITY
-- DEFINER so anon can call them; the token is the authorization (single-use,
-- 45-day expiry). Guest submissions surface in the accountant review queue tagged
-- "Guest" and post through the same approveAndPost path.

create table if not exists public.expense_guest_tokens (
  token text primary key,
  claimant_name text not null,
  engagement_ref text,
  purpose text,
  kind text not null default 'claim' check (kind in ('retirement','claim')),
  used boolean not null default false,
  claim_id uuid references public.expense_claims(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '45 days')
);
alter table public.expense_guest_tokens enable row level security; -- definer-only; no policies

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.expense_relay_secret (
  id boolean primary key default true check (id),
  secret text not null
);

create or replace function public.create_expense_guest_token(
  p_secret text, p_claimant_name text, p_engagement_ref text, p_purpose text, p_kind text default 'claim'
) returns text
language plpgsql security definer set search_path = public, private, pg_catalog as $$
declare v_token text;
begin
  if not exists (select 1 from private.expense_relay_secret s where s.secret = p_secret) then return null; end if;
  if p_claimant_name is null or length(btrim(p_claimant_name)) < 2 then return null; end if;
  v_token := replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','');
  insert into public.expense_guest_tokens (token, claimant_name, engagement_ref, purpose, kind)
  values (v_token, btrim(p_claimant_name), p_engagement_ref, p_purpose,
          case when p_kind in ('retirement','claim') then p_kind else 'claim' end);
  return v_token;
end$$;

create or replace function public.resolve_expense_guest_token(p_token text)
returns jsonb language sql security definer set search_path = public, pg_catalog as $$
  select case when t.token is null then jsonb_build_object('valid', false)
    else jsonb_build_object(
      'valid', (not t.used and t.expires_at > now()),
      'used', t.used, 'expired', (t.expires_at <= now()),
      'claimant_name', t.claimant_name, 'engagement_ref', t.engagement_ref,
      'purpose', t.purpose, 'kind', t.kind)
  end
  from (select * from public.expense_guest_tokens where token = p_token) t
  right join (select 1) x on true;
$$;

create or replace function public.submit_guest_expense(p_token text, p_lines jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_catalog as $$
declare v_tok public.expense_guest_tokens; v_total numeric; v_claim uuid;
begin
  select * into v_tok from public.expense_guest_tokens where token = p_token;
  if v_tok.token is null then return jsonb_build_object('ok', false, 'error', 'invalid'); end if;
  if v_tok.used then return jsonb_build_object('ok', false, 'error', 'used'); end if;
  if v_tok.expires_at <= now() then return jsonb_build_object('ok', false, 'error', 'expired'); end if;
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    return jsonb_build_object('ok', false, 'error', 'no_lines'); end if;
  select coalesce(sum((l->>'amount')::numeric), 0) into v_total from jsonb_array_elements(p_lines) l;
  insert into public.expense_claims (kind, claimant_name, engagement_ref, purpose, currency, fx_rate, total, status, source)
  values (v_tok.kind, v_tok.claimant_name, v_tok.engagement_ref, v_tok.purpose, 'TZS', 1, v_total, 'pending_review', 'guest')
  returning id into v_claim;
  insert into public.expense_claim_lines (claim_id, description, account_code, receipt_no, amount)
  select v_claim, coalesce(l->>'description','Expense'), coalesce(l->>'account_code','5100'),
         l->>'receipt_no', coalesce((l->>'amount')::numeric, 0)
  from jsonb_array_elements(p_lines) l;
  update public.expense_guest_tokens set used = true, claim_id = v_claim where token = p_token;
  return jsonb_build_object('ok', true, 'claim_id', v_claim);
end$$;

revoke execute on function public.create_expense_guest_token(text,text,text,text,text) from public;
grant execute on function public.create_expense_guest_token(text,text,text,text,text) to anon, service_role;
grant execute on function public.resolve_expense_guest_token(text) to anon, authenticated;
grant execute on function public.submit_guest_expense(text, jsonb) to anon, authenticated;
