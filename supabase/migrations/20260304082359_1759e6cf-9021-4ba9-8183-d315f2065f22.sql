-- Update password for angelika@momentum-mindset.sg to Test123!@#ABC
-- The password is hashed using bcrypt with Supabase's standard format
UPDATE auth.users 
SET 
  encrypted_password = crypt('Test123!@#ABC', gen_salt('bf')),
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  updated_at = now()
WHERE email = 'angelika@momentum-mindset.sg';
