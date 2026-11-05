-- Nosso Cantinho — esquema inicial
-- Execute no SQL Editor do Supabase.
-- IMPORTANTE: revise as políticas antes de inserir dados reais.

create extension if not exists pgcrypto;

create table if not exists public.couples (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Nosso Cantinho',
  invite_code text not null unique default upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 10)),
  created_at timestamptz not null default now()
);

create table if not exists public.couple_members (
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  created_at timestamptz not null default now(),
  primary key (couple_id, user_id)
);

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  author_id uuid not null default auth.uid() references auth.users(id),
  title text not null,
  description text not null default '',
  memory_date date,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.experiences (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  author_id uuid not null default auth.uid() references auth.users(id),
  title text not null,
  category text not null default 'Outro',
  source_url text not null default '',
  description text not null default '',
  status text not null default 'wish' check (status in ('wish','planned','done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists memories_couple_date_idx on public.memories(couple_id, memory_date desc);
create index if not exists experiences_couple_created_idx on public.experiences(couple_id, created_at desc);

create or replace function public.is_couple_member(target_couple uuid)
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.couple_members
    where couple_id = target_couple and user_id = auth.uid()
  );
$$;

alter table public.couples enable row level security;
alter table public.couple_members enable row level security;
alter table public.memories enable row level security;
alter table public.experiences enable row level security;

drop policy if exists "Members can read their couple" on public.couples;
create policy "Members can read their couple" on public.couples
for select to authenticated using (public.is_couple_member(id));

drop policy if exists "Members can read memberships" on public.couple_members;
create policy "Members can read memberships" on public.couple_members
for select to authenticated using (public.is_couple_member(couple_id));

drop policy if exists "Members can read memories" on public.memories;
create policy "Members can read memories" on public.memories
for select to authenticated using (public.is_couple_member(couple_id));
drop policy if exists "Members can add memories" on public.memories;
create policy "Members can add memories" on public.memories
for insert to authenticated with check (public.is_couple_member(couple_id) and author_id = auth.uid());
drop policy if exists "Members can edit memories" on public.memories;
create policy "Members can edit memories" on public.memories
for update to authenticated using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));
drop policy if exists "Members can delete memories" on public.memories;
create policy "Members can delete memories" on public.memories
for delete to authenticated using (public.is_couple_member(couple_id));

drop policy if exists "Members can read experiences" on public.experiences;
create policy "Members can read experiences" on public.experiences
for select to authenticated using (public.is_couple_member(couple_id));
drop policy if exists "Members can add experiences" on public.experiences;
create policy "Members can add experiences" on public.experiences
for insert to authenticated with check (public.is_couple_member(couple_id) and author_id = auth.uid());
drop policy if exists "Members can edit experiences" on public.experiences;
create policy "Members can edit experiences" on public.experiences
for update to authenticated using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));
drop policy if exists "Members can delete experiences" on public.experiences;
create policy "Members can delete experiences" on public.experiences
for delete to authenticated using (public.is_couple_member(couple_id));

-- Função para criar o espaço privado do casal após o primeiro login.
create or replace function public.create_couple(couple_name text default 'Nosso Cantinho')
returns table (couple_id uuid, invite_code text)
language plpgsql security definer set search_path = public
as $$
declare new_id uuid;
declare new_code text;
begin
  if auth.uid() is null then raise exception 'É necessário estar autenticado'; end if;
  if exists (select 1 from public.couple_members where user_id = auth.uid()) then
    raise exception 'Este usuário já pertence a um espaço';
  end if;
  insert into public.couples(name) values (coalesce(nullif(trim(couple_name), ''), 'Nosso Cantinho'))
  returning id, couples.invite_code into new_id, new_code;
  insert into public.couple_members(couple_id, user_id, role) values (new_id, auth.uid(), 'owner');
  return query select new_id, new_code;
end;
$$;

-- A segunda pessoa entra usando o código de convite gerado acima.
create or replace function public.join_couple(code text)
returns uuid language plpgsql security definer set search_path = public
as $$
declare target_id uuid;
begin
  if auth.uid() is null then raise exception 'É necessário estar autenticado'; end if;
  if exists (select 1 from public.couple_members where user_id = auth.uid()) then
    raise exception 'Este usuário já pertence a um espaço';
  end if;
  select id into target_id from public.couples where invite_code = upper(trim(code));
  if target_id is null then raise exception 'Código de convite inválido'; end if;
  if (select count(*) from public.couple_members where couple_id = target_id) >= 2 then
    raise exception 'Este espaço já possui dois participantes';
  end if;
  insert into public.couple_members(couple_id, user_id, role) values (target_id, auth.uid(), 'member');
  return target_id;
end;
$$;

grant execute on function public.create_couple(text) to authenticated;
grant execute on function public.join_couple(text) to authenticated;

-- Bucket privado para fotografias.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('memory-photos', 'memory-photos', false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- O caminho do arquivo deve começar com o UUID do casal: <couple_id>/<filename>.
drop policy if exists "Couple members read memory photos" on storage.objects;
create policy "Couple members read memory photos" on storage.objects
for select to authenticated using (
  bucket_id = 'memory-photos'
  and public.is_couple_member((storage.foldername(name))[1]::uuid)
);
drop policy if exists "Couple members upload memory photos" on storage.objects;
create policy "Couple members upload memory photos" on storage.objects
for insert to authenticated with check (
  bucket_id = 'memory-photos'
  and public.is_couple_member((storage.foldername(name))[1]::uuid)
);
drop policy if exists "Couple members delete memory photos" on storage.objects;
create policy "Couple members delete memory photos" on storage.objects
for delete to authenticated using (
  bucket_id = 'memory-photos'
  and public.is_couple_member((storage.foldername(name))[1]::uuid)
);
