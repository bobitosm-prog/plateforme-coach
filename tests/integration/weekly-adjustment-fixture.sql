-- Completes the existing disposable nutrition fixture, never production data.
ALTER TABLE public.coach_clients ADD COLUMN id uuid DEFAULT gen_random_uuid();
ALTER TABLE public.meal_plans ADD COLUMN total_calories integer;
ALTER TABLE public.meal_plans ADD COLUMN protein_g integer;
ALTER TABLE public.meal_plans ADD COLUMN carbs_g integer;
ALTER TABLE public.meal_plans ADD COLUMN fat_g integer;
CREATE TABLE public.custom_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL,name text,
  days jsonb,phases jsonb,is_active boolean DEFAULT true,updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.weekly_diagnostics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES public.profiles(id),
  week_start date,ajustements jsonb,applied_at timestamptz,applied_changes jsonb,UNIQUE(user_id,week_start)
);
ALTER TABLE public.weekly_diagnostics ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_diagnostic ON public.weekly_diagnostics FOR ALL TO authenticated
  USING (user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.weekly_diagnostics TO authenticated;
GRANT ALL ON public.custom_programs,public.meal_plans,public.coach_clients TO service_role;
