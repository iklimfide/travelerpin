-- Preference for post-pin social share prompts.

alter table public.profiles
  add column if not exists share_prompt_mode text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'share_prompt_enabled'
  ) then
    update public.profiles
    set share_prompt_mode = case
      when share_prompt_enabled = false then 'never'
      else 'every_pin'
    end
    where share_prompt_mode is null;

    alter table public.profiles drop column share_prompt_enabled;
  end if;
end $$;

update public.profiles
set share_prompt_mode = 'every_pin'
where share_prompt_mode is null;

alter table public.profiles
  alter column share_prompt_mode set default 'every_pin';

alter table public.profiles
  alter column share_prompt_mode set not null;

alter table public.profiles
  drop constraint if exists profiles_share_prompt_mode_check;

alter table public.profiles
  add constraint profiles_share_prompt_mode_check
  check (share_prompt_mode in ('every_pin', 'after_30m', 'never'));

comment on column public.profiles.share_prompt_mode is
  'every_pin: prompt after each pin; after_30m: prompt 30 minutes after last pin; never: no prompts.';
