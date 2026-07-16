-- System / brand broadcast notifications (TravelerPin.com → active members).

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'follow',
    'pin_country',
    'pin_city',
    'pin_park',
    'pin_media',
    'system'
  ));

create table if not exists public.yp_system_broadcasts (
  id uuid primary key default gen_random_uuid(),
  title text,
  message text not null,
  href text,
  recipient_count integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint yp_system_broadcasts_message_len check (
    char_length(trim(message)) between 1 and 500
  ),
  constraint yp_system_broadcasts_title_len check (
    title is null or char_length(trim(title)) between 1 and 120
  )
);

alter table public.yp_system_broadcasts enable row level security;
