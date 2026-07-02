-- ============================================================================
-- HomeLog — seed the global service-provider directory.
-- Run in Supabase → SQL Editor after schema.sql. Safe to re-run (skips existing
-- providers by name). Providers are global (not per-user).
-- ============================================================================
insert into public.service_providers (name, trade, phone, email, city, state, description)
select v.name, v.trade, v.phone, v.email, v.city, v.state, v.description
from (values
  ('Lone Star Plumbing','plumber','512-555-0101','hello@lonestarplumbing.example','Austin','TX','Licensed plumbers for leaks, water heaters, and repipes. 24/7 emergency service.'),
  ('BrightSpark Electric','electrician','512-555-0102','service@brightspark.example','Austin','TX','Panel upgrades, EV charger installs, and lighting. Family-owned since 2004.'),
  ('CoolBreeze HVAC','hvac','512-555-0103','support@coolbreeze.example','Round Rock','TX','AC tune-ups, furnace repair, and full system replacements.'),
  ('GreenThumb Landscaping','landscaper','512-555-0104','team@greenthumb.example','Austin','TX','Lawn care, irrigation, and seasonal cleanups.'),
  ('TopShield Roofing','roofer','512-555-0105','quotes@topshield.example','Cedar Park','TX','Roof inspections, repairs, and replacements. Free storm-damage assessments.')
) as v(name, trade, phone, email, city, state, description)
where not exists (
  select 1 from public.service_providers p where p.name = v.name
);
