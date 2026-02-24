/*
  # Seed Product Data

  This migration adds sample products and pricing tiers for the shop.
*/

DO $$
DECLARE
  void_spoofer_id uuid;
  hwid_cleaner_id uuid;
BEGIN
  -- Insert Void Spoofer product
  INSERT INTO products (name, slug, description, long_description, features, is_active)
  VALUES (
    'Void Spoofer',
    'void-spoofer',
    'Military-grade hardware ID masking and anti-cheat evasion',
    'Complete identity shift with undetectable spoofing. Void Spoofer masks your HWID, motherboard, CPU, GPU, MAC address, and system fingerprints. Works with all major anti-cheat systems.',
    '[
      {"title": "Hardware ID Masking", "description": "Motherboard, CPU, GPU fingerprint obfuscation"},
      {"title": "Anti-Cheat Evasion", "description": "Works against EAC, BattlEye, Vanguard"},
      {"title": "Registry Protection", "description": "Dynamic registry key generation and cleanup"},
      {"title": "One-Click Activation", "description": "Single button deployment with auto-rollback"},
      {"title": "Stealth Mode", "description": "Process hiding and anti-debugging protection"},
      {"title": "Network Masking", "description": "MAC address randomization with vendor assignment"}
    ]'::jsonb,
    true
  ) RETURNING id INTO void_spoofer_id;

  -- Insert Nameless HWID Cleaner product
  INSERT INTO products (name, slug, description, long_description, features, is_active)
  VALUES (
    'Nameless HWID Cleaner',
    'hwid-cleaner',
    'Advanced system profile randomization and memory protection',
    'Complete system identity reset. Randomize BIOS serials, disk signatures, RAM fingerprints. Zero traces left behind.',
    '[
      {"title": "BIOS Serial Randomization", "description": "Change motherboard identification"},
      {"title": "Disk Signature Reset", "description": "Modify drive identification"},
      {"title": "Memory Protection", "description": "RAM fingerprint masking"},
      {"title": "System Profile Reset", "description": "Complete identity shift"},
      {"title": "Auto-Cleanup", "description": "Remove traces automatically"},
      {"title": "Safe Rollback", "description": "Easy restoration if needed"}
    ]'::jsonb,
    true
  ) RETURNING id INTO hwid_cleaner_id;

  -- Insert pricing tiers for Void Spoofer
  INSERT INTO pricing_tiers (product_id, duration_type, price, stock)
  VALUES
    (void_spoofer_id, 'day'::duration_type, 4.99, -1),
    (void_spoofer_id, 'week'::duration_type, 12.99, -1),
    (void_spoofer_id, 'month'::duration_type, 29.99, -1),
    (void_spoofer_id, 'lifetime'::duration_type, 79.99, -1);

  -- Insert pricing tiers for HWID Cleaner
  INSERT INTO pricing_tiers (product_id, duration_type, price, stock)
  VALUES
    (hwid_cleaner_id, 'day'::duration_type, 3.99, -1),
    (hwid_cleaner_id, 'week'::duration_type, 9.99, -1),
    (hwid_cleaner_id, 'month'::duration_type, 19.99, -1),
    (hwid_cleaner_id, 'lifetime'::duration_type, 49.99, -1);
END $$;