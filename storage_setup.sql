-- Create the 'documents' bucket
insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do nothing;

-- Set up RLS policies for the documents bucket

-- Allow public read access to documents
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'documents' );

-- Allow authenticated users to upload files
create policy "Authenticated Upload"
  on storage.objects for insert
  with check ( bucket_id = 'documents' and auth.role() = 'authenticated' );

-- Allow users to delete their own uploaded files (optional, good practice)
-- OR allow admins to delete files (better for this use case)
create policy "Admin Delete"
  on storage.objects for delete
  using ( bucket_id = 'documents' and 
    exists (
      select 1 from public.user_roles 
      where user_id = auth.uid() 
      and role in ('admin', 'gestor')
    )
  );
