-- Hardening fix found via get_advisors (security lint) right after
-- 20260728000000_profile_avatars_storage.sql: profile_avatars_public_read
-- was a fully-open SELECT policy (using (bucket_id = 'profile-avatars')),
-- which flagged as "Public Bucket Allows Listing" -- it lets any client
-- enumerate every file in the bucket via storage.list()/the storage API.
--
-- This policy has no functional purpose: the bucket is public = true, so
-- the actual avatar reads (<img src={avatarUrl}>, via getPublicUrl()) are
-- served over the public CDN path, which bypasses RLS entirely -- same
-- documented behavior as page-avatars (see 20260721000001_page_avatars_hardening.sql).
-- Nothing in the app calls .list()/.select() on this bucket (only
-- .upload() + .getPublicUrl(), see useUploadProfileAvatar.ts), so dropping
-- the SELECT policy closes the enumeration gap with no functional impact.
--
-- Unlike page-avatars' equivalent fix, we can't narrow this to "only
-- published pages" instead of dropping it outright -- profiles have no
-- publish concept -- so removal is the correct fix here, not a rewrite.

drop policy "profile_avatars_public_read" on storage.objects;
