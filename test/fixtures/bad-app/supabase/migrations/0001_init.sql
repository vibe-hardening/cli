create table public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  created_at timestamptz default now()
);

create table public.posts (
  id uuid primary key,
  author_id uuid references public.users(id),
  title text,
  body text
);

-- only one of the two gets RLS
alter table public.users enable row level security;
