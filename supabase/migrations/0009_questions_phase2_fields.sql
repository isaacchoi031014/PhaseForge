-- PhaseForge — align generated questions with the phase2.generated_question.v1
-- contract: each seed question gets a category, a learning objective, and a
-- professor review status. Apply via Supabase SQL Editor (paste + Run).

alter table public.questions
  add column if not exists category_id uuid references public.categories (id) on delete set null,
  add column if not exists learning_objective text not null default '',
  add column if not exists professor_review_status text not null default 'draft'
    check (professor_review_status in ('draft', 'approved', 'rejected'));

create index if not exists questions_category_id_idx on public.questions (category_id);
