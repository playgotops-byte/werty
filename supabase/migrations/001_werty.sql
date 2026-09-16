
-- All financial writes are server-only RPCs; users receive read-only RLS access.
create table public.permissions (code text primary key);
create table public.role_permissions (role text not null check(role in ('user','moderator','developer','admin')), permission text references public.permissions, primary key(role,permission));
insert into public.permissions values ('users.read'),('usage.read'),('billing.read'),('keys.read'),('balance.credit'),('balance.debit'),('models.manage'),('roles.manage'),('system.read'),('audit.read');
insert into public.role_permissions select 'admin',code from public.permissions;
insert into public.role_permissions select 'moderator',code from public.permissions where code in ('users.read','usage.read','billing.read','keys.read');
insert into public.role_permissions select 'developer',code from public.permissions where code in ('users.read','usage.read','system.read','keys.read');

create table public.profiles (
 id uuid primary key references auth.users(id), email text not null,
 role text not null default 'user' check(role in ('user','moderator','developer','admin')),
 status text not null default 'active' check(status in ('active','suspended')),
 created_at timestamptz not null default now(), last_active_at timestamptz
);
create index profiles_email on public.profiles(lower(email));
create table public.wallets (user_id uuid primary key references public.profiles, available bigint not null default 0 check(available>=0), reserved bigint not null default 0 check(reserved>=0));
create table public.api_keys (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles, hash text not null unique, last4 text not null, created_at timestamptz not null default now(), revoked_at timestamptz);
create unique index one_active_key on public.api_keys(user_id) where revoked_at is null;
create table public.models (
 id text primary key, display_name text not null, provider text not null check(provider in ('deepseek','nex','unconfigured')),
 enabled boolean not null default true, input_rate bigint not null default 1000 check(input_rate between 1 and 1000000),
 output_rate bigint not null default 1000 check(output_rate between 1 and 1000000), version integer not null default 1
);
insert into public.models(id,display_name,provider,enabled) values
 ('gpt-6-astra','ChatGPT 6 Astra','deepseek',true),
 ('claude-fable-5','Claude Fable 5','deepseek',true),
 ('claude-fable-5-1','Claude Fable 5.1','deepseek',true),
 ('gpt-5-6-sol','ChatGPT 5.6 Sol','nex',true),
 ('gpt-5-6-terra','ChatGPT 5.6 Terra','nex',true),
 ('claude-opus-5','Claude Opus 5','nex',true),
 ('claude-opus-4-8','Claude Opus 4.8','nex',true),
 ('deepseek-v4-1-flash','DeepSeek V4.1 Flash','deepseek',true),
 ('kimi-k3','Kimi K3','unconfigured',false);

create table public.api_requests (
 id uuid primary key, user_id uuid not null references public.profiles, key_id uuid not null references public.api_keys,
 model_id text not null references public.models, idempotency_key text not null, fingerprint text not null,
 status text not null check(status in ('reserved','dispatched','settled','released','reconciliation_required')),
 reservation bigint not null check(reservation>0), input_rate bigint not null, output_rate bigint not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(user_id,idempotency_key)
);
create table public.usage (
 request_id uuid primary key references public.api_requests, user_id uuid not null references public.profiles,
 model_id text not null references public.models, input_tokens bigint not null check(input_tokens>=0),
 output_tokens bigint not null check(output_tokens>=0), charged bigint not null check(charged>=0),
 latency_ms integer not null check(latency_ms>=0), created_at timestamptz not null default now()
);
create table public.payments (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles,
 idempotency_key uuid not null, provider_id text unique, amount_kopecks bigint not null check(amount_kopecks between 5000 and 10000000),
 credit_units bigint not null check(credit_units>0), status text not null default 'pending' check(status in ('pending','credited','canceled')),
 created_at timestamptz not null default now(), unique(user_id,idempotency_key)
);
create table public.transactions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles,
 kind text not null check(kind in ('payment','usage','token_credit','token_debit')), units bigint not null,
 source text not null unique, reason text, created_at timestamptz not null default now()
);
create table public.audit_logs (
 id uuid primary key default gen_random_uuid(), actor_id uuid not null references public.profiles,
 action text not null, target text not null, metadata jsonb not null default '{}',
 idempotency_key uuid not null, created_at timestamptz not null default now(), unique(actor_id,idempotency_key)
);
create table public.rate_limits (scope text not null, bucket bigint not null, hits integer not null, primary key(scope,bucket));
create table public.system_events (id uuid primary key default gen_random_uuid(), request_id uuid, code text not null, created_at timestamptz not null default now());
create index usage_user_date on public.usage(user_id,created_at desc);
create index usage_model_date on public.usage(model_id,created_at desc);
create index usage_date on public.usage(created_at desc);
create index requests_status_date on public.api_requests(status,updated_at);
create index transactions_user_date on public.transactions(user_id,created_at desc);
create index transactions_kind_date on public.transactions(kind,created_at desc);
create index payments_status_date on public.payments(status,created_at);
create index audit_date on public.audit_logs(created_at desc);
create index events_date on public.system_events(created_at desc);

create function public.provision_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,email) values(new.id,new.email);
 insert into public.wallets(user_id) values(new.id);
 return new;
end $$;
create trigger provision_werty after insert on auth.users for each row execute function public.provision_user();

create function public.allowed(p_actor uuid,p_permission text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles p join public.role_permissions rp on rp.role=p.role where p.id=p_actor and p.status='active' and rp.permission=p_permission)
$$;
create function public.require_permission(p_actor uuid,p_permission text) returns void language plpgsql security definer set search_path='' as $$
begin if not public.allowed(p_actor,p_permission) then raise exception 'forbidden'; end if; end $$;
create function public.rate_limit(p_scope text,p_limit integer,p_seconds integer) returns boolean language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 insert into public.rate_limits values(p_scope,floor(extract(epoch from now())/p_seconds)::bigint,1)
 on conflict(scope,bucket) do update set hits=public.rate_limits.hits+1 returning hits into n;
 return n<=p_limit;
end $$;

create function public.rotate_key(p_user uuid,p_hash text,p_last4 text,p_initial boolean default false) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 perform 1 from public.profiles p join auth.users u on u.id=p.id where p.id=p_user and p.status='active' and u.email_confirmed_at is not null for update of p;
 if not found then raise exception 'forbidden'; end if;
 if p_initial and exists(select 1 from public.api_keys where user_id=p_user) then return null; end if;
 update public.api_keys set revoked_at=now() where user_id=p_user and revoked_at is null;
 insert into public.api_keys(user_id,hash,last4) values(p_user,p_hash,p_last4) returning id into result;
 return result;
end $$;
create function public.revoke_key(p_user uuid,p_key uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.profiles where id=p_user for update;
 update public.api_keys set revoked_at=now() where id=p_key and user_id=p_user and revoked_at is null;
end $$;

create function public.reserve_request(p_id uuid,p_key uuid,p_model text,p_idempotency text,p_fingerprint text,p_input_limit bigint,p_output_limit bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare k public.api_keys; m public.models; previous public.api_requests; amount bigint;
begin
 select * into k from public.api_keys where id=p_key;
 if not found then raise exception 'invalid_api_key'; end if;
 perform 1 from public.profiles p join auth.users u on u.id=p.id where p.id=k.user_id and p.status='active' and u.email_confirmed_at is not null for update of p;
 if not found then raise exception 'forbidden'; end if;
 perform 1 from public.api_keys where id=p_key and revoked_at is null for share;
 if not found then raise exception 'invalid_api_key'; end if;
 select * into previous from public.api_requests where user_id=k.user_id and idempotency_key=p_idempotency;
 if found then
  if previous.fingerprint<>p_fingerprint then raise exception 'idempotency_conflict'; end if;
  return jsonb_build_object('duplicate',true,'id',previous.id,'status',previous.status);
 end if;
 select * into m from public.models where id=p_model and enabled for share;
 if not found then raise exception 'model_unavailable'; end if;
 if p_input_limit<1 or p_input_limit>10000000 or p_output_limit<1 or p_output_limit>32768 then raise exception 'invalid_limit'; end if;
 amount := p_input_limit*m.input_rate+p_output_limit*m.output_rate;
 update public.wallets set available=available-amount,reserved=reserved+amount where user_id=k.user_id and available>=amount;
 if not found then raise exception 'insufficient_balance'; end if;
 insert into public.api_requests values(p_id,k.user_id,p_key,p_model,p_idempotency,p_fingerprint,'reserved',amount,m.input_rate,m.output_rate,now(),now());
 update public.profiles set last_active_at=now() where id=k.user_id;
 return jsonb_build_object('duplicate',false,'id',p_id,'reserved',amount::text);
end $$;

create function public.finish_request(p_id uuid,p_input bigint,p_output bigint,p_latency integer) returns void language plpgsql security definer set search_path='' as $$
declare r public.api_requests; charged bigint;
begin
 select * into r from public.api_requests where id=p_id for update;
 if not found then raise exception 'request_not_found'; end if;
 if r.status='settled' then return; end if;
 if r.status not in ('dispatched','reconciliation_required') then raise exception 'invalid_state'; end if;
 if p_input<0 or p_output<0 or p_input+p_output<=0 then raise exception 'invalid_usage'; end if;
 charged:=p_input*r.input_rate+p_output*r.output_rate;
 if charged>r.reservation then raise exception 'usage_exceeds_reservation'; end if;
 update public.wallets set reserved=reserved-r.reservation,available=available+r.reservation-charged where user_id=r.user_id;
 insert into public.usage values(r.id,r.user_id,r.model_id,p_input,p_output,charged,p_latency,now());
 insert into public.transactions(user_id,kind,units,source) values(r.user_id,'usage',-charged,'request:'||r.id);
 update public.api_requests set status='settled',updated_at=now() where id=r.id;
end $$;
create function public.release_request(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare r public.api_requests;
begin
 select * into r from public.api_requests where id=p_id for update;
 if r.status='released' then return; end if;
 if r.status<>'reserved' then raise exception 'invalid_state'; end if;
 update public.wallets set available=available+r.reservation,reserved=reserved-r.reservation where user_id=r.user_id;
 update public.api_requests set status='released',updated_at=now() where id=r.id;
end $$;

create function public.payment_intent(p_user uuid,p_key uuid,p_kopecks bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.payments;
begin
 if p_kopecks<5000 or p_kopecks>10000000 then raise exception 'invalid_amount'; end if;
 insert into public.payments(user_id,idempotency_key,amount_kopecks,credit_units)
 values(p_user,p_key,p_kopecks,p_kopecks*200000) on conflict(user_id,idempotency_key) do nothing;
 select * into p from public.payments where user_id=p_user and idempotency_key=p_key;
 if p.amount_kopecks<>p_kopecks then raise exception 'idempotency_conflict'; end if;
 return jsonb_build_object('id',p.id,'provider_id',p.provider_id,'status',p.status,'amount_kopecks',p.amount_kopecks::text);
end $$;
create function public.credit_payment(p_id uuid,p_provider text,p_kopecks bigint) returns void language plpgsql security definer set search_path='' as $$
declare p public.payments;
begin
 select * into p from public.payments where id=p_id for update;
 if not found or p.amount_kopecks<>p_kopecks or (p.provider_id is not null and p.provider_id<>p_provider) then raise exception 'payment_mismatch'; end if;
 if p.status='credited' then return; end if;
 if p.status<>'pending' then raise exception 'invalid_state'; end if;
 update public.wallets set available=available+p.credit_units where user_id=p.user_id;
 insert into public.transactions(user_id,kind,units,source) values(p.user_id,'payment',p.credit_units,'payment:'||p.id);
 update public.payments set provider_id=p_provider,status='credited' where id=p.id;
end $$;

create function public.adjust_balance(p_actor uuid,p_target uuid,p_tokens bigint,p_reason text,p_key uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare prior public.audit_logs; new_balance bigint;
begin
 perform 1 from public.profiles where id=p_actor for share;
 perform public.require_permission(p_actor,case when p_tokens>0 then 'balance.credit' else 'balance.debit' end);
 if p_tokens=0 or abs(p_tokens)>1000000000 or length(trim(p_reason))<3 or length(p_reason)>500 then raise exception 'invalid_amount'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_actor::text||p_key::text,0));
 select * into prior from public.audit_logs where actor_id=p_actor and idempotency_key=p_key;
 if found then
  if prior.action<>'BALANCE_ADJUST' or prior.target<>p_target::text or prior.metadata->>'tokens'<>p_tokens::text or prior.metadata->>'reason'<>p_reason then raise exception 'idempotency_conflict'; end if;
  return prior.metadata;
 end if;
 update public.wallets set available=available+p_tokens*1000 where user_id=p_target and available+p_tokens*1000>=0 returning available into new_balance;
 if not found then raise exception 'insufficient_balance'; end if;
 insert into public.transactions(user_id,kind,units,source,reason) values(p_target,case when p_tokens>0 then 'token_credit' else 'token_debit' end,p_tokens*1000,'admin:'||p_actor||':'||p_key,p_reason);
 insert into public.audit_logs(actor_id,action,target,metadata,idempotency_key) values(p_actor,'BALANCE_ADJUST',p_target::text,jsonb_build_object('tokens',p_tokens::text,'reason',p_reason,'new_balance_units',new_balance::text),p_key);
 return jsonb_build_object('tokens',p_tokens::text,'reason',p_reason,'new_balance_units',new_balance::text);
end $$;
create function public.change_role(p_actor uuid,p_target uuid,p_role text,p_key uuid) returns void language plpgsql security definer set search_path='' as $$
declare old_role text; prior public.audit_logs;
begin
 perform pg_advisory_xact_lock(717171);
 perform public.require_permission(p_actor,'roles.manage');
 if p_actor=p_target or p_role not in ('user','moderator','developer','admin') then raise exception 'forbidden'; end if;
 select * into prior from public.audit_logs where actor_id=p_actor and idempotency_key=p_key;
 if found then
  if prior.action<>'ROLE_CHANGE' or prior.target<>p_target::text or prior.metadata->>'to'<>p_role then raise exception 'idempotency_conflict'; end if;
  return;
 end if;
 select role into old_role from public.profiles where id=p_target for update;
 if not found then raise exception 'user_not_found'; end if;
 update public.profiles set role=p_role where id=p_target;
 insert into public.audit_logs(actor_id,action,target,metadata,idempotency_key) values(p_actor,'ROLE_CHANGE',p_target::text,jsonb_build_object('from',old_role,'to',p_role),p_key);
end $$;
create function public.update_model(p_actor uuid,p_model text,p_enabled boolean,p_input bigint,p_output bigint,p_key uuid) returns void language plpgsql security definer set search_path='' as $$
declare prior public.audit_logs; details jsonb;
begin
 perform 1 from public.profiles where id=p_actor for share;
 perform public.require_permission(p_actor,'models.manage');
 details:=jsonb_build_object('enabled',p_enabled,'input_rate',p_input::text,'output_rate',p_output::text);
 perform pg_advisory_xact_lock(hashtextextended(p_actor::text||p_key::text,0));
 select * into prior from public.audit_logs where actor_id=p_actor and idempotency_key=p_key;
 if found then
  if prior.action<>'MODEL_UPDATE' or prior.target<>p_model or prior.metadata<>details then raise exception 'idempotency_conflict'; end if;
  return;
 end if;
 update public.models set enabled=p_enabled,input_rate=p_input,output_rate=p_output,version=version+1 where id=p_model;
 if not found then raise exception 'model_not_found'; end if;
 insert into public.audit_logs(actor_id,action,target,metadata,idempotency_key) values(p_actor,'MODEL_UPDATE',p_model,details,p_key);
end $$;

-- RLS ownership is independent of frontend behavior.
do $$ declare t text; begin
 foreach t in array array['profiles','wallets','api_keys','models','api_requests','usage','payments','transactions','audit_logs','permissions','role_permissions','rate_limits','system_events'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon, authenticated',t);
  execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;
grant select on public.profiles,public.wallets,public.usage,public.payments,public.transactions to authenticated;
create policy own_profile on public.profiles for select to authenticated using(id=auth.uid());
create policy own_wallet on public.wallets for select to authenticated using(user_id=auth.uid());
create policy own_usage on public.usage for select to authenticated using(user_id=auth.uid());
create policy own_payments on public.payments for select to authenticated using(user_id=auth.uid());
create policy own_transactions on public.transactions for select to authenticated using(user_id=auth.uid());
-- Explicitly revoke PUBLIC execute for every function introduced here.
do $$ declare f record; begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in ('provision_user','allowed','require_permission','rate_limit','rotate_key','revoke_key','reserve_request','finish_request','release_request','payment_intent','credit_payment','adjust_balance','change_role','update_model') loop
  execute format('revoke all on function %s from public,anon,authenticated',f.signature);
  execute format('grant execute on function %s to service_role',f.signature);
 end loop;
end $$;
