-- =============================================================================
-- Nosso Cantinho · schema Supabase (v4)
-- -----------------------------------------------------------------------------
-- Execute em um projeto Supabase VAZIO (SQL Editor → New query → Run).
--
-- Modelo:
--   couples / couple_members  → o casal e seus 2 membros (auth.users)
--   experiences               → desejos (wish | planned | done)
--   memories / memory_photos  → memórias e fotos (bucket privado "memory-photos")
--   feedbacks                 → feedbacks com texto de cada parceiro
--   feedback_memories / feedback_experiences → vínculos N:N
--
-- Segurança: RLS em todas as tabelas; cada registro carrega couple_id e só é
-- visível/alterável por membros daquele casal. Fotos ficam em
-- <couple_id>/<memory_id>/<uuid>.<ext> e as políticas do Storage usam esse prefixo.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Utilitários
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Casal
-- -----------------------------------------------------------------------------
create table public.couples (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default 'Nosso Cantinho',
  invite_code text not null unique default encode(gen_random_bytes(6), 'hex'),
  created_at  timestamptz not null default now()
);

create table public.couple_members (
  couple_id uuid not null references public.couples (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  role      text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (couple_id, user_id),
  unique (user_id) -- cada usuário pertence a um único casal
);

-- SECURITY DEFINER evita recursão de RLS ao consultar couple_members nas políticas.
create or replace function public.is_couple_member(target_couple uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.couple_members
    where couple_id = target_couple and user_id = auth.uid()
  );
$$;

-- -----------------------------------------------------------------------------
-- Desejos
-- -----------------------------------------------------------------------------
create table public.experiences (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references public.couples (id) on delete cascade,
  title       text not null check (length(trim(title)) > 0),
  category    text not null default 'Outro',
  source_url  text not null default '',
  description text not null default '',
  status      text not null default 'wish' check (status in ('wish', 'planned', 'done')),
  planned_at  timestamptz,
  location    text not null default '',
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint planned_fields_required
    check (status <> 'planned' or (planned_at is not null and length(trim(location)) > 0))
);

-- -----------------------------------------------------------------------------
-- Memórias e fotos
-- -----------------------------------------------------------------------------
create table public.memories (
  id             uuid primary key default gen_random_uuid(),
  couple_id      uuid not null references public.couples (id) on delete cascade,
  title          text not null check (length(trim(title)) > 0),
  description    text not null default '',
  memory_date    date not null,
  is_anniversary boolean not null default false,
  experience_id  uuid references public.experiences (id) on delete set null,
  created_by     uuid references auth.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (id, couple_id) -- permite FK composta a partir de memory_photos
);

create table public.memory_photos (
  id           uuid primary key default gen_random_uuid(),
  memory_id    uuid not null,
  couple_id    uuid not null,
  storage_path text not null unique,
  is_cover     boolean not null default false,
  position     integer not null default 0,
  created_at   timestamptz not null default now(),
  -- garante que a foto pertence ao MESMO casal da memória
  foreign key (memory_id, couple_id) references public.memories (id, couple_id) on delete cascade,
  -- o caminho no Storage precisa começar com o couple_id
  constraint storage_path_in_couple_folder check (storage_path like couple_id::text || '/%')
);

create unique index one_cover_per_memory on public.memory_photos (memory_id) where is_cover;

-- -----------------------------------------------------------------------------
-- Feedbacks
-- -----------------------------------------------------------------------------
create table public.feedbacks (
  id            uuid primary key default gen_random_uuid(),
  couple_id     uuid not null references public.couples (id) on delete cascade,
  feedback_date date not null default current_date,
  roberto_text  text not null default '',
  tamiris_text  text not null default '',
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint feedback_has_content
    check (length(trim(roberto_text)) > 0 or length(trim(tamiris_text)) > 0)
);

create table public.feedback_memories (
  feedback_id uuid not null references public.feedbacks (id) on delete cascade,
  memory_id   uuid not null references public.memories (id) on delete cascade,
  primary key (feedback_id, memory_id)
);

create table public.feedback_experiences (
  feedback_id   uuid not null references public.feedbacks (id) on delete cascade,
  experience_id uuid not null references public.experiences (id) on delete cascade,
  primary key (feedback_id, experience_id)
);

-- -----------------------------------------------------------------------------
-- Índices (consultas sempre filtram por couple_id) e triggers de updated_at
-- -----------------------------------------------------------------------------
create index experiences_couple_idx on public.experiences (couple_id, status);
create index memories_couple_idx on public.memories (couple_id, memory_date desc);
create index memories_experience_idx on public.memories (experience_id);
create index memory_photos_memory_idx on public.memory_photos (memory_id, position);
create index feedbacks_couple_idx on public.feedbacks (couple_id, feedback_date desc);
create index feedback_memories_memory_idx on public.feedback_memories (memory_id);
create index feedback_experiences_experience_idx on public.feedback_experiences (experience_id);

create trigger experiences_updated_at before update on public.experiences
  for each row execute function public.set_updated_at();
create trigger memories_updated_at before update on public.memories
  for each row execute function public.set_updated_at();
create trigger feedbacks_updated_at before update on public.feedbacks
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Fluxo de criação/convite do casal (antes não havia como criar um casal pelo app)
-- -----------------------------------------------------------------------------
drop function if exists public.create_couple(text);
drop function if exists public.join_couple(text);

create or replace function public.create_couple(couple_name text default 'Nosso Cantinho')
returns public.couples
language plpgsql
security definer
set search_path = public
as $$
declare
  new_couple public.couples;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;
  if exists (select 1 from public.couple_members where user_id = auth.uid()) then
    raise exception 'Você já faz parte de um casal';
  end if;

  insert into public.couples (name) values (coalesce(nullif(trim(couple_name), ''), 'Nosso Cantinho'))
  returning * into new_couple;
  insert into public.couple_members (couple_id, user_id, role) values (new_couple.id, auth.uid(), 'owner');
  return new_couple;
end;
$$;

create or replace function public.join_couple(code text)
returns public.couples
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.couples;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;
  if exists (select 1 from public.couple_members where user_id = auth.uid()) then
    raise exception 'Você já faz parte de um casal';
  end if;

  select * into target from public.couples where invite_code = lower(trim(code));
  if target.id is null then
    raise exception 'Código de convite inválido';
  end if;
  if (select count(*) from public.couple_members where couple_id = target.id) >= 2 then
    raise exception 'Este casal já está completo';
  end if;

  insert into public.couple_members (couple_id, user_id, role) values (target.id, auth.uid(), 'member');
  return target;
end;
$$;

revoke all on function public.create_couple(text) from public, anon;
revoke all on function public.join_couple(text) from public, anon;
grant execute on function public.create_couple(text) to authenticated;
grant execute on function public.join_couple(text) to authenticated;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.couples enable row level security;
alter table public.couple_members enable row level security;
alter table public.experiences enable row level security;
alter table public.memories enable row level security;
alter table public.memory_photos enable row level security;
alter table public.feedbacks enable row level security;
alter table public.feedback_memories enable row level security;
alter table public.feedback_experiences enable row level security;

-- Casal: membros leem e renomeiam. Criação e entrada só pelas funções acima.
create policy "members read own couple" on public.couples
  for select to authenticated using (public.is_couple_member(id));
create policy "members rename own couple" on public.couples
  for update to authenticated using (public.is_couple_member(id)) with check (public.is_couple_member(id));

create policy "members read roster" on public.couple_members
  for select to authenticated using (public.is_couple_member(couple_id));
create policy "members can leave" on public.couple_members
  for delete to authenticated using (user_id = auth.uid());

-- Registros do casal
create policy "members manage experiences" on public.experiences
  for all to authenticated
  using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));

create policy "members manage memories" on public.memories
  for all to authenticated
  using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));

create policy "members manage photos" on public.memory_photos
  for all to authenticated
  using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));

create policy "members manage feedbacks" on public.feedbacks
  for all to authenticated
  using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));

-- Vínculos N:N: os dois lados precisam ser do mesmo casal do usuário.
create policy "members manage feedback memory links" on public.feedback_memories
  for all to authenticated
  using (exists (
    select 1 from public.feedbacks f join public.memories m on m.id = feedback_memories.memory_id
    where f.id = feedback_memories.feedback_id and f.couple_id = m.couple_id and public.is_couple_member(f.couple_id)
  ))
  with check (exists (
    select 1 from public.feedbacks f join public.memories m on m.id = feedback_memories.memory_id
    where f.id = feedback_memories.feedback_id and f.couple_id = m.couple_id and public.is_couple_member(f.couple_id)
  ));

create policy "members manage feedback experience links" on public.feedback_experiences
  for all to authenticated
  using (exists (
    select 1 from public.feedbacks f join public.experiences e on e.id = feedback_experiences.experience_id
    where f.id = feedback_experiences.feedback_id and f.couple_id = e.couple_id and public.is_couple_member(f.couple_id)
  ))
  with check (exists (
    select 1 from public.feedbacks f join public.experiences e on e.id = feedback_experiences.experience_id
    where f.id = feedback_experiences.feedback_id and f.couple_id = e.couple_id and public.is_couple_member(f.couple_id)
  ));

-- -----------------------------------------------------------------------------
-- Storage: bucket privado de fotos
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('memory-photos', 'memory-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Helper: o primeiro segmento do caminho é um couple_id do qual o usuário é membro.
-- (Antes, QUALQUER usuário autenticado podia enviar arquivos para qualquer pasta.)
create or replace function public.can_access_photo_path(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  folder text := split_part(object_name, '/', 1);
begin
  if folder !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  return public.is_couple_member(folder::uuid);
end;
$$;

create policy "couple members read photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'memory-photos' and public.can_access_photo_path(name));

create policy "couple members upload photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'memory-photos' and public.can_access_photo_path(name));

create policy "couple members delete photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'memory-photos' and public.can_access_photo_path(name));
