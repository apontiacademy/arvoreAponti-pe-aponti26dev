alter view public.analytics_summary set (security_invoker = true);

drop policy "analytics_public_insert" on analytics;

create policy "analytics_public_insert" on analytics for insert
with check (
  exists (select 1 from pages where pages.id = analytics.page_id and pages.is_published = true)
);
