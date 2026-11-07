-- Nosso Cantinho · modelo relacional v2
-- Execute em um projeto Supabase vazio. O schema mantém os registros do casal
-- separados e permite que o RPG consuma os mesmos dados futuramente.
create extension if not exists pgcrypto;
create table public.couples (id uuid primary key default gen_random_uuid(), name text not null default 'Nosso Cantinho', invite_code text unique not null default encode(gen_random_bytes(6),'hex'), created_at timestamptz not null default now());
create table public.couple_members (couple_id uuid not null references public.couples(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade, role text not null default 'member' check(role in ('owner','member')), joined_at timestamptz not null default now(), primary key(couple_id,user_id), unique(user_id));
create table public.memories (id uuid primary key default gen_random_uuid(), couple_id uuid not null references public.couples(id) on delete cascade, title text not null, description text not null default '', memory_date date not null, is_anniversary boolean not null default false, created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.memory_photos (id uuid primary key default gen_random_uuid(), memory_id uuid not null references public.memories(id) on delete cascade, couple_id uuid not null references public.couples(id) on delete cascade, storage_path text not null unique, is_cover boolean not null default false, position integer not null default 0, created_at timestamptz not null default now());
create unique index one_cover_per_memory on public.memory_photos(memory_id) where is_cover;
create table public.experiences (id uuid primary key default gen_random_uuid(), couple_id uuid not null references public.couples(id) on delete cascade, title text not null, category text not null default 'Outro', source_url text not null default '', description text not null default '', status text not null default 'wish' check(status in ('wish','planned','done')), planned_at timestamptz, location text not null default '', created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), constraint planned_fields_required check(status <> 'planned' or (planned_at is not null and length(trim(location))>0)));
alter table public.memories add column experience_id uuid references public.experiences(id) on delete set null;
create table public.feedbacks (id uuid primary key default gen_random_uuid(), couple_id uuid not null references public.couples(id) on delete cascade, feedback_date date not null default current_date, roberto_text text not null default '', tamiris_text text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), constraint feedback_has_content check(length(trim(roberto_text))>0 or length(trim(tamiris_text))>0));
create table public.feedback_memories (feedback_id uuid not null references public.feedbacks(id) on delete cascade, memory_id uuid not null references public.memories(id) on delete cascade, primary key(feedback_id,memory_id));
create table public.feedback_experiences (feedback_id uuid not null references public.feedbacks(id) on delete cascade, experience_id uuid not null references public.experiences(id) on delete cascade, primary key(feedback_id,experience_id));
create or replace function public.is_couple_member(target_couple uuid) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.couple_members where couple_id=target_couple and user_id=auth.uid()) $$;
alter table public.couples enable row level security;
alter table public.couple_members enable row level security;
alter table public.memories enable row level security;
alter table public.memory_photos enable row level security;
alter table public.experiences enable row level security;
alter table public.feedbacks enable row level security;
alter table public.feedback_memories enable row level security;
alter table public.feedback_experiences enable row level security;
create policy "members read own couple" on public.couples for select using(public.is_couple_member(id));
create policy "members read roster" on public.couple_members for select using(public.is_couple_member(couple_id));
create policy "members manage memories" on public.memories for all using(public.is_couple_member(couple_id)) with check(public.is_couple_member(couple_id));
create policy "members manage photos" on public.memory_photos for all using(public.is_couple_member(couple_id)) with check(public.is_couple_member(couple_id));
create policy "members manage experiences" on public.experiences for all using(public.is_couple_member(couple_id)) with check(public.is_couple_member(couple_id));
create policy "members manage feedbacks" on public.feedbacks for all using(public.is_couple_member(couple_id)) with check(public.is_couple_member(couple_id));
create policy "members manage feedback memory links" on public.feedback_memories for all using(exists(select 1 from public.feedbacks f join public.memories m on m.id=feedback_memories.memory_id where f.id=feedback_memories.feedback_id and f.couple_id=m.couple_id and public.is_couple_member(f.couple_id))) with check(exists(select 1 from public.feedbacks f join public.memories m on m.id=feedback_memories.memory_id where f.id=feedback_memories.feedback_id and f.couple_id=m.couple_id and public.is_couple_member(f.couple_id)));
create policy "members manage feedback experience links" on public.feedback_experiences for all using(exists(select 1 from public.feedbacks f join public.experiences e on e.id=feedback_experiences.experience_id where f.id=feedback_experiences.feedback_id and f.couple_id=e.couple_id and public.is_couple_member(f.couple_id))) with check(exists(select 1 from public.feedbacks f join public.experiences e on e.id=feedback_experiences.experience_id where f.id=feedback_experiences.feedback_id and f.couple_id=e.couple_id and public.is_couple_member(f.couple_id)));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('memory-photos','memory-photos',false,10485760,array['image/jpeg','image/png','image/webp','image/heic']) on conflict(id) do nothing;
create policy "couple members read photos" on storage.objects for select using(bucket_id='memory-photos' and exists(select 1 from public.memory_photos p where p.storage_path=name and public.is_couple_member(p.couple_id)));
create policy "couple members upload photos" on storage.objects for insert with check(bucket_id='memory-photos' and auth.uid() is not null);
create policy "couple members delete photos" on storage.objects for delete using(bucket_id='memory-photos' and exists(select 1 from public.memory_photos p where p.storage_path=name and public.is_couple_member(p.couple_id)));
-- Nota: a associação/criação do casal e o fluxo de upload devem usar couple_id
-- e paths no formato <couple_id>/<memory_id>/<uuid> antes de ativar dados reais.
