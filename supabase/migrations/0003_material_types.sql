-- PhaseForge — add 'syllabus' to the allowed material types.
-- Additive change to the Phase 1 schema (no data migration needed).

alter table public.materials drop constraint if exists materials_type_check;
alter table public.materials
  add constraint materials_type_check
  check (type in ('syllabus', 'lecture', 'notes', 'past_exam'));
