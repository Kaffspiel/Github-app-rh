
-- Add extension_status column to tasks table
ALTER TABLE tasks 
ADD COLUMN extension_status TEXT DEFAULT 'none' CHECK (extension_status IN ('none', 'pending', 'approved', 'rejected'));

-- Comment on column
COMMENT ON COLUMN tasks.extension_status IS 'Status of the deadline extension request: none, pending, approved, rejected';
