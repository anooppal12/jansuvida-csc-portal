-- Run once against the jansuvida database before enabling profile updates.
ALTER TABLE customers
  ADD COLUMN address VARCHAR(255) NULL AFTER email,
  ADD COLUMN pincode VARCHAR(6) NULL AFTER address;
