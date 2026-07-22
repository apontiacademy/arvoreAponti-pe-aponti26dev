-- Three hardening fixes found in code review of the page-avatars migration
-- (20260721000000_page_avatar_and_storage.sql), all real gaps on the live project:
--
-- 1. The page-avatars bucket had no file_size_limit/allowed_mime_types, so any
--    authenticated user could upload arbitrarily large or non-image files to a
--    bucket that gets served publicly. Fix: cap at 5 MB, restrict to common
--    image mime types.
--
-- 2. Every other table with owner-scoped RLS in this schema (pages, links,
--    social_links) also has an is_admin()-based "for all" policy so admins can
--    manage anyone's data (see pages_admin_all/links_admin_all/social_links_admin_all
--    in 20260720000000_user_roles.sql). storage.objects for page-avatars had no
--    equivalent, so an admin couldn't manage another user's avatar file. Fix:
--    mirror that same pattern, scoped to bucket_id = 'page-avatars'.
--
-- 3. page_avatars_public_read only checked bucket_id = 'page-avatars', with no
--    equivalent to the "only published pages are public" restriction already
--    applied to pages/links/social_links (see pages_public_select_published /
--    links_public_select_published / social_links_public_select_published in
--    20260715000000_initial_schema.sql). This let storage.list()/authenticated
--    reads enumerate avatar files for unpublished/draft pages too. Fix: require
--    a matching pages row with is_published = true, keyed off the page id
--    encoded in the object path ("{owner_id}/{page_id}.{ext}").
--
--    Note: because this bucket is public = true, the direct public CDN URL
--    (what <img src={avatarUrl}> actually uses, via getPublicUrl()) bypasses
--    RLS entirely — Supabase serves public-bucket objects over a public HTTP
--    path with no RLS check at all. This fix does NOT (and cannot) prevent
--    someone with a direct URL from viewing an unpublished page's avatar; it
--    only closes the narrower gap of programmatic enumeration via
--    storage.list()/authenticated reads, consistent with the rest of the schema.
--
--    storage.filename(name) (confirmed to exist in this project's storage
--    schema) returns the last path segment including the extension, e.g.
--    "{page_id}.{ext}" — split_part(..., '.', 1) extracts the page id, since
--    UUIDs never contain a dot themselves, so the first dot is always the
--    extension separator.

update storage.buckets
set file_size_limit = 5242880, -- 5 MB
    allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
where id = 'page-avatars';

create policy "page_avatars_admin_all"
on storage.objects for all
using (bucket_id = 'page-avatars' and is_admin())
with check (bucket_id = 'page-avatars' and is_admin());

drop policy "page_avatars_public_read" on storage.objects;
create policy "page_avatars_public_read"
on storage.objects for select
using (
  bucket_id = 'page-avatars'
  and exists (
    select 1 from pages
    where pages.id::text = split_part(storage.filename(name), '.', 1)
    and pages.is_published = true
  )
);
