-- Update events to 2026 calendar dates with upcoming ticket release times
UPDATE events SET 
  date = '2026-02-15 13:30:00+00'::timestamptz,
  ticket_release_time = '2026-01-14 15:05:00+00'::timestamptz,
  status = 'coming_soon',
  name = 'India vs Australia T20'
WHERE id = '4b430f27-9fb1-49a1-8a9f-7d1177fc92a3';

UPDATE events SET 
  date = '2026-03-14 04:30:00+00'::timestamptz,
  ticket_release_time = '2026-01-14 15:10:00+00'::timestamptz,
  status = 'coming_soon',
  name = 'Comic Con India 2026'
WHERE id = 'f71d139b-e866-491b-b15e-716fbf572561';

UPDATE events SET 
  date = '2026-04-28 13:30:00+00'::timestamptz,
  ticket_release_time = '2026-01-14 15:15:00+00'::timestamptz,
  status = 'coming_soon'
WHERE id = '145094a0-8119-416b-8065-5c734fa6f7af';

UPDATE events SET 
  date = '2026-05-15 14:30:00+00'::timestamptz,
  ticket_release_time = '2026-01-14 15:20:00+00'::timestamptz,
  status = 'coming_soon'
WHERE id = '2994058d-4cd3-4324-a5e6-47a8156c2e56';

UPDATE events SET 
  date = '2026-06-22 14:30:00+00'::timestamptz,
  ticket_release_time = '2026-02-01 04:30:00+00'::timestamptz,
  status = 'coming_soon'
WHERE id = 'a99caff1-2bb4-4ad9-baf3-478e0398673e';

UPDATE events SET 
  date = '2026-07-10 14:00:00+00'::timestamptz,
  ticket_release_time = '2026-02-15 04:30:00+00'::timestamptz,
  status = 'coming_soon'
WHERE id = '21cdb784-e476-4d6c-b676-faae37189f82';

UPDATE events SET 
  date = '2026-08-25 14:00:00+00'::timestamptz,
  ticket_release_time = '2026-05-01 04:30:00+00'::timestamptz,
  status = 'coming_soon',
  name = 'IPL 2026 Final'
WHERE id = '2def01a0-5054-4e66-8f66-a961e7a7c95d';

UPDATE events SET 
  date = '2026-12-28 10:30:00+00'::timestamptz,
  ticket_release_time = '2026-10-01 04:30:00+00'::timestamptz,
  status = 'coming_soon',
  name = 'Sunburn Festival 2026'
WHERE id = '5de35035-340a-402b-84b7-c53adf595ff7';

-- Reset all auto_books to active status for testing
UPDATE auto_books SET status = 'active';