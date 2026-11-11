-- =============================================================================
-- Nosso Cantinho · CORREÇÃO das permissões dos vínculos de feedback
-- -----------------------------------------------------------------------------
-- Sintoma: criar feedback funciona, mas vincular memórias/desejos a ele dá
-- "Sem permissão para essa ação".
--
-- O script refaz do zero as regras (RLS) das tabelas feedback_memories e
-- feedback_experiences, seja qual for a versão que existe hoje no banco.
-- • Não apaga dados. • Pode ser executado mais de uma vez.
-- Supabase → SQL Editor → New query → cole tudo → Run.
-- =============================================================================

-- 1. Funções de verificação (SECURITY DEFINER: checam direto nas tabelas,
--    sem depender das regras de leitura de feedbacks/memórias/desejos).
create or replace function public.can_link_feedback_memory(p_feedback uuid, p_memory uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.feedbacks f
    join public.memories m on m.couple_id = f.couple_id
    join public.couple_members cm on cm.couple_id = f.couple_id
    where f.id = p_feedback and m.id = p_memory and cm.user_id = auth.uid()
  );
$$;

create or replace function public.can_link_feedback_experience(p_feedback uuid, p_experience uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.feedbacks f
    join public.experiences e on e.couple_id = f.couple_id
    join public.couple_members cm on cm.couple_id = f.couple_id
    where f.id = p_feedback and e.id = p_experience and cm.user_id = auth.uid()
  );
$$;

revoke all on function public.can_link_feedback_memory(uuid, uuid) from public, anon;
revoke all on function public.can_link_feedback_experience(uuid, uuid) from public, anon;
grant execute on function public.can_link_feedback_memory(uuid, uuid) to authenticated;
grant execute on function public.can_link_feedback_experience(uuid, uuid) to authenticated;

-- 2. Remove TODAS as regras atuais dessas duas tabelas (qualquer nome) e
--    colunas extras obrigatórias que o app não envia (ex.: couple_id NOT NULL).
do $$
declare
  pol record;
  col record;
begin
  for pol in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public' and tablename in ('feedback_memories', 'feedback_experiences')
  loop
    execute format('drop policy %I on public.%I', pol.policyname, pol.tablename);
  end loop;

  for col in
    select table_name, column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name in ('feedback_memories', 'feedback_experiences')
      and column_name not in ('feedback_id', 'memory_id', 'experience_id')
      and is_nullable = 'NO'
      and column_default is null
  loop
    execute format('alter table public.%I alter column %I drop not null', col.table_name, col.column_name);
  end loop;
end;
$$;

-- 3. Regras novas: só membros do casal, e feedback + item precisam ser do mesmo casal.
alter table public.feedback_memories enable row level security;
alter table public.feedback_experiences enable row level security;

create policy "members manage feedback memory links" on public.feedback_memories
  for all to authenticated
  using (public.can_link_feedback_memory(feedback_id, memory_id))
  with check (public.can_link_feedback_memory(feedback_id, memory_id));

create policy "members manage feedback experience links" on public.feedback_experiences
  for all to authenticated
  using (public.can_link_feedback_experience(feedback_id, experience_id))
  with check (public.can_link_feedback_experience(feedback_id, experience_id));

-- 4. Permissões de tabela (normalmente o Supabase já dá; garante caso tenham sido removidas).
grant select, insert, delete on public.feedback_memories to authenticated;
grant select, insert, delete on public.feedback_experiences to authenticated;

-- 5. Conferência: deve listar exatamente 2 linhas, uma por tabela.
select tablename as tabela, policyname as regra, cmd as comando
from pg_policies
where schemaname = 'public' and tablename in ('feedback_memories', 'feedback_experiences')
order by tablename;
