-- PhaseForge — Phase 1 schema
-- Tables: profiles, courses, categories, materials, material_chunks
-- Plus pgvector, RLS (owner-scoped), and profile auto-creation on signup.
-- Apply via Supabase SQL Editor (paste + Run) or `supabase db push`.

-- Extensions ---------------------------------------------------------------
create extension if not exists vector;

-- profiles -----------------------------------------------------------------
-- One row per auth user (the professor). Mirrors auth.users via a trigger.
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        text not null default 'professor',
  name        text not null default '',
  institution text not null default '',
  created_at  timestamptz not null default now()
);

-- courses ------------------------------------------------------------------
create table public.courses (
  id           uuid primary key default gen_random_uuid(),
  professor_id uuid not null references public.profiles (id) on delete cascade,
  title        text not null,
  description  text,
  created_at   timestamptz not null default now()
);
create index courses_professor_id_idx on public.courses (professor_id);

-- categories (units/topics within a course) --------------------------------
create table public.categories (
  id                   uuid primary key default gen_random_uuid(),
  course_id            uuid not null references public.courses (id) on delete cascade,
  name                 text not null,
  difficulty_bands_json jsonb not null default '["Easy","Medium","Hard"]'::jsonb,
  created_at           timestamptz not null default now()
);
create index categories_course_id_idx on public.categories (course_id);

-- materials (uploaded source files) ----------------------------------------
create table public.materials (
  id            uuid primary key default gen_random_uuid(),
  course_id     uuid not null references public.courses (id) on delete cascade,
  category_id   uuid references public.categories (id) on delete set null,
  type          text not null check (type in ('lecture', 'notes', 'past_exam')),
  filename      text not null,
  storage_path  text not null,
  status        text not null default 'uploaded'
                  check (status in ('uploaded', 'processing', 'done', 'error')),
  error_message text,
  created_at    timestamptz not null default now()
);
create index materials_course_id_idx on public.materials (course_id);
create index materials_category_id_idx on public.materials (category_id);

-- material_chunks (retrieval-friendly segments + embeddings) ----------------
create table public.material_chunks (
  id          uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materials (id) on delete cascade,
  chunk_index int not null,
  content     text not null,
  embedding   vector(1536),
  created_at  timestamptz not null default now(),
  unique (material_id, chunk_index)
);
create index material_chunks_material_id_idx on public.material_chunks (material_id);
-- Approximate-nearest-neighbour index for RAG retrieval (cosine distance).
create index material_chunks_embedding_idx
  on public.material_chunks using hnsw (embedding vector_cosine_ops);

-- Row-Level Security -------------------------------------------------------
-- A professor can only touch their own rows (directly or via the owning course).
alter table public.profiles        enable row level security;
alter table public.courses         enable row level security;
alter table public.categories      enable row level security;
alter table public.materials       enable row level security;
alter table public.material_chunks enable row level security;

create policy "own profile"
  on public.profiles for all
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "own courses"
  on public.courses for all
  using (professor_id = auth.uid())
  with check (professor_id = auth.uid());

create policy "own categories"
  on public.categories for all
  using (exists (
    select 1 from public.courses c
    where c.id = categories.course_id and c.professor_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.courses c
    where c.id = categories.course_id and c.professor_id = auth.uid()
  ));

create policy "own materials"
  on public.materials for all
  using (exists (
    select 1 from public.courses c
    where c.id = materials.course_id and c.professor_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.courses c
    where c.id = materials.course_id and c.professor_id = auth.uid()
  ));

create policy "own material_chunks"
  on public.material_chunks for all
  using (exists (
    select 1 from public.materials m
    join public.courses c on c.id = m.course_id
    where m.id = material_chunks.material_id and c.professor_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.materials m
    join public.courses c on c.id = m.course_id
    where m.id = material_chunks.material_id and c.professor_id = auth.uid()
  ));

-- Profile auto-creation on signup ------------------------------------------
-- Mirrors name/institution/role from auth user_metadata into public.profiles.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name, institution, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'institution', ''),
    coalesce(new.raw_user_meta_data ->> 'role', 'professor')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
