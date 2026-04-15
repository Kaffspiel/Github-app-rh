-- ================================================
-- STORAGE: Criar buckets necessários para o app
-- ================================================

-- Bucket 'attachments' — fotos de atestados e comprovantes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'attachments',
    'attachments',
    true,
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Bucket 'documents' — PDFs de normas e diretrizes da empresa
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'documents',
    'documents',
    true,
    52428800, -- 50MB
    ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
)
ON CONFLICT (id) DO NOTHING;

-- ================================================
-- POLÍTICAS DE STORAGE
-- ================================================

-- attachments: qualquer autenticado pode fazer upload
CREATE POLICY "Authenticated users can upload attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'attachments');

-- attachments: qualquer um pode visualizar (bucket público)
CREATE POLICY "Public can view attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'attachments');

-- attachments: autenticados podem deletar seus próprios
CREATE POLICY "Authenticated users can delete attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'attachments');

-- documents: qualquer autenticado pode fazer upload
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- documents: qualquer um pode visualizar (bucket público)
CREATE POLICY "Public can view documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents');

-- documents: autenticados podem deletar
CREATE POLICY "Authenticated users can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents');
