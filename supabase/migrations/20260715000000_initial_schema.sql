create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now()
);

create table themes (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  base_settings jsonb not null default '{}'::jsonb
);

create table pages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  slug text unique not null,
  title text not null,
  description text,
  is_published boolean not null default false,
  theme_id uuid references themes(id),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index pages_owner_id_idx on pages(owner_id);

create table links (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references pages(id) on delete cascade,
  type text not null check (type in (
    'title','text','link','whatsapp','instagram','tiktok','telegram',
    'youtube','spotify','pix','email','phone','image','video'
  )),
  "order" integer not null default 0,
  label text,
  url text,
  payload jsonb not null default '{}'::jsonb,
  is_active boolean not null default true
);
create index links_page_id_idx on links(page_id);

create table social_links (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references pages(id) on delete cascade,
  platform text not null,
  url text not null,
  "order" integer not null default 0
);
create index social_links_page_id_idx on social_links(page_id);

create table analytics (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references pages(id) on delete cascade,
  link_id uuid references links(id) on delete cascade,
  event_type text not null check (event_type in ('view','click')),
  device text,
  os text,
  browser text,
  referrer text,
  created_at timestamptz not null default now()
);
create index analytics_page_created_idx on analytics(page_id, created_at);
create index analytics_link_created_idx on analytics(link_id, created_at);

create view analytics_summary as
select
  page_id,
  count(*) filter (where event_type = 'view') as total_views,
  count(*) filter (where event_type = 'click') as total_clicks
from analytics
group by page_id;

alter table profiles enable row level security;
alter table pages enable row level security;
alter table links enable row level security;
alter table social_links enable row level security;
alter table themes enable row level security;
alter table analytics enable row level security;

create policy "profiles_select_own" on profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);

create policy "pages_owner_all" on pages for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "pages_public_select_published" on pages for select using (is_published = true);

create policy "links_owner_all" on links for all using (
  auth.uid() = (select owner_id from pages where pages.id = links.page_id)
) with check (
  auth.uid() = (select owner_id from pages where pages.id = links.page_id)
);
create policy "links_public_select_published" on links for select using (
  is_active = true and exists (select 1 from pages where pages.id = links.page_id and pages.is_published = true)
);

create policy "social_links_owner_all" on social_links for all using (
  auth.uid() = (select owner_id from pages where pages.id = social_links.page_id)
) with check (
  auth.uid() = (select owner_id from pages where pages.id = social_links.page_id)
);
create policy "social_links_public_select_published" on social_links for select using (
  exists (select 1 from pages where pages.id = social_links.page_id and pages.is_published = true)
);

create policy "themes_public_read" on themes for select using (true);

create policy "analytics_owner_select" on analytics for select using (
  auth.uid() = (select owner_id from pages where pages.id = analytics.page_id)
);
create policy "analytics_public_insert" on analytics for insert with check (true);

insert into themes (slug, name) values
  ('minimal', 'Minimal'),
  ('dark', 'Dark'),
  ('glass', 'Glass'),
  ('corporate', 'Corporate'),
  ('modern', 'Modern');
