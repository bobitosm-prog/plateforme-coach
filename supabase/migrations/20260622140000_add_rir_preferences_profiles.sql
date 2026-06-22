-- Preferences auto-regulation RIR. Opt-in (desactive par defaut). Pattern aligne sur cardio_enabled.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rir_tracking_enabled boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rir_scale_advanced boolean DEFAULT false;
