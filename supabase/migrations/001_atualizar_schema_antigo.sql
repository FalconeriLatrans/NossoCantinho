-- =============================================================================
-- Nosso Cantinho · ATUALIZAÇÃO do schema antigo (v2) para o atual (v4)
-- -----------------------------------------------------------------------------
-- Use este arquivo SE você já rodou a versão antiga do schema.sql.
-- (Projeto novo/vazio? Rode apenas supabase/schema.sql.)
--
-- • Não apaga tabelas nem dados.
-- • Pode ser executado mais de uma vez sem problema.
-- Supabase → SQL Editor → New query → cole tudo → Run.
-- =============================================================================

-- 1. updated_at automático -----------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists experiences_updated_at on public.experiences;
create trigger experiences_updated_at before update on public.experiences
  for each row execute function public.set_updated_at();
drop trigger if exists memories_updated_at on public.memories;
create trigger memories_updated_at before update on public.memories
  for each row execute function public.set_updated_at();
drop trigger if exists feedbacks_updated_at on public.feedbacks;
create trigger feedbacks_updated_at before update on public.feedbacks
  for each row execute function public.set_updated_at();

-- 2. Colunas e regras que faltavam ----------------------------------------------
alter table public.feedbacks
  add column if not exists created_by uuid references auth.users (id) on delete set null;

-- Excluir um usuário não deve ser bloqueado pelos registros que ele criou.
alter table public.experiences drop constraint if exists experiences_created_by_fkey;
alter table public.experiences add constraint experiences_created_by_fkey
  foreign key (created_by) references auth.users (id) on delete set null;
alter table public.memories drop constraint if exists memories_created_by_fkey;
alter table public.memories add constraint memories_created_by_fkey
  foreign key (created_by) references auth.users (id) on delete set null;

alter table public.experiences drop constraint if exists experiences_title_not_blank;
alter table public.experiences add constraint experiences_title_not_blank check (length(trim(title)) > 0);
alter table public.memories drop constraint if exists memories_title_not_blank;
alter table public.memories add constraint memories_title_not_blank check (length(trim(title)) > 0);

-- Foto e memória sempre do MESMO casal (FK composta no lugar da simples).
alter table public.memory_photos drop constraint if exists memory_photos_memory_id_fkey;
alter table public.memory_photos drop constraint if exists memory_photos_memory_id_couple_id_fkey;
alter table public.memories drop constraint if exists memories_id_couple_id_key;
alter table public.memories add constraint memories_id_couple_id_key unique (id, couple_id);
alter table public.memory_photos add constraint memory_photos_memory_id_couple_id_fkey
  foreign key (memory_id, couple_id) references public.memories (id, couple_id) on delete cascade;
alter table public.memory_photos drop constraint if exists storage_path_in_couple_folder;
alter table public.memory_photos add constraint storage_path_in_couple_folder
  check (storage_path like couple_id::text || '/%');

-- 3. Índices -------------------------------------------------------------------
create index if not exists experiences_couple_idx on public.experiences (couple_id, status);
create index if not exists memories_couple_idx on public.memories (couple_id, memory_date desc);
create index if not exists memories_experience_idx on public.memories (experience_id);
create index if not exists memory_photos_memory_idx on public.memory_photos (memory_id, position);
create index if not exists feedbacks_couple_idx on public.feedbacks (couple_id, feedback_date desc);
create index if not exists feedback_memories_memory_idx on public.feedback_memories (memory_id);
create index if not exists feedback_experiences_experience_idx on public.feedback_experiences (experience_id);

-- 4. Criar casal / entrar com código de convite ---------------------------------
--    (o schema antigo não permitia criar o casal pelo app)
--    Remove versões anteriores dessas funções (com outro retorno ou parâmetros),
--    que impediriam o "create or replace".
do $$
declare
  fn regprocedure;
begin
  for fn in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('create_couple', 'join_couple')
  loop
    execute format('drop function %s', fn);
  end loop;
end;
$$;

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

-- 5. Políticas que faltavam ------------------------------------------------------
drop policy if exists "members rename own couple" on public.couples;
create policy "members rename own couple" on public.couples
  for update to authenticated using (public.is_couple_member(id)) with check (public.is_couple_member(id));

drop policy if exists "members can leave" on public.couple_members;
create policy "members can leave" on public.couple_members
  for delete to authenticated using (user_id = auth.uid());

-- 6. Storage: acesso às fotos pela pasta do casal -------------------------------
--    Antes, QUALQUER usuário logado podia enviar arquivos para qualquer pasta.
update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'memory-photos';

drop policy if exists "couple members read photos" on storage.objects;
drop policy if exists "couple members upload photos" on storage.objects;
drop policy if exists "couple members delete photos" on storage.objects;
drop function if exists public.can_access_photo_path(text);

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

-- Pronto! Confira se não apareceu nenhum erro em vermelho no resultado.
