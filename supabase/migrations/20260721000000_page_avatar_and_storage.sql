-- Coluna do avatar de cada árvore (independente do profile do dono, já que
-- um usuário pode ter várias árvores/personas diferentes).
alter table pages add column avatar_url text;

-- Bucket público (a foto precisa ser lida por qualquer visitante da página
-- pública) para o upload do avatar de cada árvore.
insert into storage.buckets (id, name, public)
values ('page-avatars', 'page-avatars', true)
on conflict (id) do nothing;

-- Leitura pública (mesma lógica de "página publicada é pública" já aplicada
-- em pages/links: aqui simplificamos para "todo o bucket é de leitura
-- pública", já que só guardamos avatares, sem dado sensível).
create policy "page_avatars_public_read"
on storage.objects for select
using (bucket_id = 'page-avatars');

-- Upload/edição/remoção só por quem é dono do arquivo: o caminho é sempre
-- "{auth.uid()}/{page_id}.{ext}", então a primeira pasta do caminho precisa
-- bater com quem está autenticado.
create policy "page_avatars_owner_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'page-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "page_avatars_owner_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'page-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "page_avatars_owner_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'page-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
