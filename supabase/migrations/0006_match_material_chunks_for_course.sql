-- PhaseForge — course-wide retrieval helper for question generation.
-- Like match_material_chunks_for_material (0005) but fans out across every
-- material in a course, so generation can ground questions on the whole course.
-- Apply via Supabase SQL Editor (paste + Run)

create or replace function public.match_material_chunks_for_course(
  target_course_id uuid,
  query_embedding vector(1536),
  match_count int default 6
)
returns table (
  id uuid,
  material_id uuid,
  chunk_index int,
  content text,
  distance float
)
language sql
stable
as $$
  select
    mc.id,
    mc.material_id,
    mc.chunk_index,
    mc.content,
    mc.embedding <=> query_embedding as distance
  from public.material_chunks mc
  join public.materials m on m.id = mc.material_id
  where m.course_id = target_course_id
    and mc.embedding is not null
  order by mc.embedding <=> query_embedding
  limit match_count;
$$;

grant execute on function public.match_material_chunks_for_course(uuid, vector, int) to authenticated;
