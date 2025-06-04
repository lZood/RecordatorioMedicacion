/*
  # Add Patient Profile Creation Trigger

  1. Changes
    - Add trigger to automatically create a profile for new patients
    - Add function to handle profile creation
    - Add foreign key constraint for profile_id in patients table
    
  2. Security
    - Maintain existing RLS policies
*/

-- Function to handle new patient profile creation
CREATE OR REPLACE FUNCTION handle_new_patient_profile()
RETURNS TRIGGER AS $$
DECLARE
  new_profile_id uuid;
BEGIN
  -- Create a new profile for the patient
  INSERT INTO profiles (id, name, email, role)
  VALUES (
    NEW.user_id, -- Use the patient's user_id as the profile id
    NEW.name,
    NEW.email,
    'patient'
  )
  RETURNING id INTO new_profile_id;

  -- Update the patient record with the new profile_id
  NEW.profile_id := new_profile_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER create_patient_profile
  BEFORE INSERT ON patients
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_patient_profile();

-- Add unique constraint for profile_id
ALTER TABLE patients ADD CONSTRAINT patients_profile_id_key UNIQUE (profile_id);

-- Add foreign key constraint
ALTER TABLE patients 
  ADD CONSTRAINT patients_profile_id_fkey 
  FOREIGN KEY (profile_id) 
  REFERENCES profiles(id) 
  ON DELETE SET NULL;