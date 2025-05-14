/*
  # Initial Schema Setup

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `name` (text)
      - `specialty` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `patients`
      - `id` (uuid, primary key)
      - `name` (text)
      - `phone` (text)
      - `address` (text)
      - `email` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `medications`
      - `id` (uuid, primary key)
      - `name` (text)
      - `active_ingredient` (text)
      - `expiration_date` (date)
      - `description` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `medication_intakes`
      - `id` (uuid, primary key)
      - `patient_id` (uuid, references patients)
      - `medication_id` (uuid, references medications)
      - `date` (date)
      - `time` (time)
      - `taken` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `vital_signs`
      - `id` (uuid, primary key)
      - `patient_id` (uuid, references patients)
      - `type` (text)
      - `value` (numeric)
      - `unit` (text)
      - `date` (date)
      - `time` (time)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `appointments`
      - `id` (uuid, primary key)
      - `patient_id` (uuid, references patients)
      - `doctor_id` (uuid, references profiles)
      - `specialty` (text)
      - `date` (date)
      - `time` (time)
      - `diagnosis` (text)
      - `status` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create profiles table
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users,
  name text NOT NULL,
  specialty text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create patients table
CREATE TABLE patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  email text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create medications table
CREATE TABLE medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  active_ingredient text NOT NULL,
  expiration_date date NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create medication_intakes table
CREATE TABLE medication_intakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients ON DELETE CASCADE NOT NULL,
  medication_id uuid REFERENCES medications ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  time time NOT NULL,
  taken boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create vital_signs table
CREATE TABLE vital_signs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  value numeric NOT NULL,
  unit text NOT NULL,
  date date NOT NULL,
  time time NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create appointments table
CREATE TABLE appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients ON DELETE CASCADE NOT NULL,
  doctor_id uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  specialty text NOT NULL,
  date date NOT NULL,
  time time NOT NULL,
  diagnosis text,
  status text NOT NULL DEFAULT 'scheduled',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_intakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vital_signs ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Profiles are viewable by authenticated users" ON profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Patients are viewable by authenticated users" ON patients
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Medications are viewable by authenticated users" ON medications
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Medication intakes are viewable by authenticated users" ON medication_intakes
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Vital signs are viewable by authenticated users" ON vital_signs
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Appointments are viewable by authenticated users" ON appointments
  FOR ALL TO authenticated USING (true);

-- Create function to handle profile updates
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON medications
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON medication_intakes
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON vital_signs
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();