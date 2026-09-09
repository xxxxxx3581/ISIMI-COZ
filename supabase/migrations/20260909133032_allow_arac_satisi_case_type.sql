alter table public.hallet_cases
  drop constraint if exists hallet_cases_case_type_check;

alter table public.hallet_cases
  add constraint hallet_cases_case_type_check
  check (case_type = any (array[
    'konut_satisi'::text,
    'kurum_basvurusu'::text,
    'arac_satisi'::text
  ]));
