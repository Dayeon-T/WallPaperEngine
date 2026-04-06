ALTER TABLE todos ADD COLUMN is_important boolean NOT NULL DEFAULT false;

ALTER TABLE todos ADD COLUMN completed_at timestamptz;
UPDATE todos SET completed_at = NOW() WHERE is_done = true;

ALTER TABLE todos ADD COLUMN deleted_at timestamptz;