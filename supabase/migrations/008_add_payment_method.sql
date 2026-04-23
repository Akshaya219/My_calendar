-- Add payment_method column to finance_entries
ALTER TABLE finance_entries ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'UPI';

-- Update existing rows to have a default value if needed (though DEFAULT handles it)
UPDATE finance_entries SET payment_method = 'UPI' WHERE payment_method IS NULL;
