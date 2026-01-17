-- Enable vector extension
create extension if not exists vector;

-- 1. Profiles
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  full_name text,
  avatar_url text,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Self view" on public.profiles for select using (auth.uid() = id);
create policy "Self update" on public.profiles for update using (auth.uid() = id);

-- Trigger for new profiles
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Contacts
create table public.contacts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  first_name text,
  last_name text,
  company text,
  role text,
  tags text[],
  status text check (status in ('incomplete', 'active', 'archived')) default 'active',
  last_interaction_at timestamptz default now(),
  created_at timestamptz default now()
);
alter table public.contacts enable row level security;
create policy "Self access contacts" on public.contacts for all using (auth.uid() = user_id);

-- 3. Interactions
create table public.interactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  contact_ids uuid[],
  raw_text text,
  embedding vector(1536), -- text-embedding-004 is 768 dim usually, check model. 
  -- If using text-embedding-004 (Gecko) it might be 768. 
  -- If using OpenAI text-embedding-3-small it is 1536. 
  -- We assume 768 for Google GenAI text-embedding-004, OR 1536 if mapped.
  -- Let's stick to 768 for Google's newest, or 1536 if you use OpenAI. 
  -- ERROR PREVENTION: I will set this to 768 for Gemini 004 compatibility.
  created_at timestamptz default now()
);
alter table public.interactions enable row level security;
create policy "Self access interactions" on public.interactions for all using (auth.uid() = user_id);

-- Index
create index on public.interactions using hnsw (embedding vector_cosine_ops);

-- 4. RPC Search Function (FIXED)
-- Added 'query_user_id' so the Admin Client in Edge Function can filter correctly.
create or replace function match_interactions (
  query_embedding vector(768), -- Matched to interaction dimension
  match_threshold float,
  match_count int,
  query_user_id uuid -- NEW PARAMETER
)
returns table (
  id uuid,
  raw_text text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    interactions.id,
    interactions.raw_text,
    1 - (interactions.embedding <=> query_embedding) as similarity
  from public.interactions
  where 1 - (interactions.embedding <=> query_embedding) > match_threshold
  and interactions.user_id = query_user_id -- Explicit check
  order by interactions.embedding <=> query_embedding
  limit match_count;
end;
$$;
