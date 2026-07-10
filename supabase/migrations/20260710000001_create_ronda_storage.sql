-- Migration: Create Supabase Storage bucket for Ronda photos

-- ============================================================
-- 1. Create the storage bucket (private — access via signed URLs)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'ronda-photos',
    'ronda-photos',
    false,                          -- private bucket
    10485760,                       -- 10 MB max per file
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================
-- 2. RLS policies for Storage.objects (permissive for this internal tool)
-- ============================================================

-- Allow anyone to list/read files in ronda-photos bucket
DROP POLICY IF EXISTS "Allow public read ronda-photos" ON storage.objects;
CREATE POLICY "Allow public read ronda-photos"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'ronda-photos');

-- Allow anyone to upload files to ronda-photos bucket
DROP POLICY IF EXISTS "Allow public insert ronda-photos" ON storage.objects;
CREATE POLICY "Allow public insert ronda-photos"
    ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'ronda-photos');

-- Allow anyone to update files in ronda-photos bucket
DROP POLICY IF EXISTS "Allow public update ronda-photos" ON storage.objects;
CREATE POLICY "Allow public update ronda-photos"
    ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'ronda-photos');

-- Allow anyone to delete files in ronda-photos bucket
DROP POLICY IF EXISTS "Allow public delete ronda-photos" ON storage.objects;
CREATE POLICY "Allow public delete ronda-photos"
    ON storage.objects
    FOR DELETE
    USING (bucket_id = 'ronda-photos');
