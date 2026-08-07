-- Avatar uploads have been failing with "new row violates row-level security
-- policy" for months. The INSERT policy was never the problem: Supabase Storage
-- writes the object row with INSERT ... RETURNING, and RETURNING needs read
-- access to the new row. There was no SELECT policy on storage.objects at all,
-- so every upload was rejected while the INSERT check itself passed. Public
-- reads kept working because a public bucket is served over the CDN path, which
-- never evaluates RLS - which is why this looked like a write-permission bug.
--
-- Verified against the live project: as role `authenticated`, a plain INSERT
-- into storage.objects succeeded while the same INSERT ... RETURNING failed
-- with exactly the error the app reported.
--
-- While fixing it, the write policies move from "any authenticated user may
-- write anywhere in the bucket" to per-user folders. Avatars are now stored as
-- <user id>/<timestamp>.jpg, so a user can only touch their own. The two client
-- call sites (src/components/profile/AvatarUpload.tsx and app/invite/[code].tsx)
-- build that path.

drop policy if exists avatar_auth_insert on storage.objects;
drop policy if exists avatar_auth_update on storage.objects;
drop policy if exists avatar_auth_delete on storage.objects;

-- The bucket is public, so this grants nothing that the CDN path does not
-- already expose. It exists so INSERT ... RETURNING can read back the new row.
create policy avatars_public_read on storage.objects
  for select to public
  using (bucket_id = 'avatars');

create policy avatars_owner_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy avatars_owner_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy avatars_owner_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
