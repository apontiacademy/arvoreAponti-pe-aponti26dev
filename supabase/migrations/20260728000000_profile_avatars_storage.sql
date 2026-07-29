-- Bucket de avatar de perfil (um por usuario, path "{user_id}/avatar.{ext}").
-- Segue o mesmo padrao hardened de page-avatars (20260721000000/20260721000001),
-- mas sem a logica de "so pagina publicada" -- profiles nao tem esse conceito.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-avatars', 'profile-avatars', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create policy "profile_avatars_public_read"
on storage.objects for select
using (bucket_id = 'profile-avatars');

create policy "profile_avatars_owner_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "profile_avatars_owner_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "profile_avatars_owner_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "profile_avatars_admin_all"
on storage.objects for all
using (bucket_id = 'profile-avatars' and is_admin())
with check (bucket_id = 'profile-avatars' and is_admin());
