create index pages_theme_id_idx on pages(theme_id);

drop policy "profiles_select_own" on profiles;
create policy "profiles_select_own" on profiles for select using ((select auth.uid()) = id);

drop policy "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles for update using ((select auth.uid()) = id);

drop policy "profiles_insert_own" on profiles;
create policy "profiles_insert_own" on profiles for insert with check ((select auth.uid()) = id);

drop policy "pages_owner_all" on pages;
create policy "pages_owner_all" on pages for all using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

drop policy "links_owner_all" on links;
create policy "links_owner_all" on links for all using (
  (select auth.uid()) = (select owner_id from pages where pages.id = links.page_id)
) with check (
  (select auth.uid()) = (select owner_id from pages where pages.id = links.page_id)
);

drop policy "social_links_owner_all" on social_links;
create policy "social_links_owner_all" on social_links for all using (
  (select auth.uid()) = (select owner_id from pages where pages.id = social_links.page_id)
) with check (
  (select auth.uid()) = (select owner_id from pages where pages.id = social_links.page_id)
);

drop policy "analytics_owner_select" on analytics;
create policy "analytics_owner_select" on analytics for select using (
  (select auth.uid()) = (select owner_id from pages where pages.id = analytics.page_id)
);
