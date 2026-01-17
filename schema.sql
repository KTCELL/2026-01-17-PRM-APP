-- Enable the pgvector extension to work with embeddings
create extension if not exists vector;

-- 1. Create profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  full_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Enable RLS for profiles
alter table public.profiles enable row level security;

-- Policies for profiles
create policy "Users can view their own profile" 
  on public.profiles for select 
  using (auth.uid() = id);

create policy "Users can update their own profile" 
  on public.profiles for update 
  using (auth.uid() = id);

-- Function and trigger to automatically create profile on signup
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

-- 2. Create contacts table
create table public.contacts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  first_name text,
  last_name text,
  company text,
  role text,
  tags text[], -- Array of strings
  status text check (status in ('incomplete', 'active', 'archived')) default 'active',
  last_interaction_at timestamptz,
  created_at timestamptz default now()
);

-- Enable RLS for contacts
alter table public.contacts enable row level security;

-- Policies for contacts
create policy "Users can view their own contacts" 
  on public.contacts for select 
  using (auth.uid() = user_id);

create policy "Users can insert their own contacts" 
  on public.contacts for insert 
  with check (auth.uid() = user_id);

create policy "Users can update their own contacts" 
  on public.contacts for update 
  using (auth.uid() = user_id);

create policy "Users can delete their own contacts" 
  on public.contacts for delete 
  using (auth.uid() = user_id);

-- 3. Create interactions table
create table public.interactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  contact_ids uuid[], -- Array of contact IDs associated with this note
  raw_text text,
  audio_url text,
  embedding vector(1536), -- Vector size for text-embedding-3-small
  created_at timestamptz default now()
);

-- Enable RLS for interactions
alter table public.interactions enable row level security;

-- Policies for interactions
create policy "Users can view their own interactions" 
  on public.interactions for select 
  using (auth.uid() = user_id);

create policy "Users can insert their own interactions" 
  on public.interactions for insert 
  with check (auth.uid() = user_id);

create policy "Users can update their own interactions" 
  on public.interactions for update 
  using (auth.uid() = user_id);

create policy "Users can delete their own interactions" 
  on public.interactions for delete 
  using (auth.uid() = user_id);

-- Create HNSW index on embedding for faster similarity search
-- Note: 'vector_cosine_ops' is generally best for embeddings created by OpenAI
create index on public.interactions using hnsw (embedding vector_cosine_ops);

-- Function to match interactions via embedding similarity
create or replace function match_interactions (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
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
  and interactions.user_id = auth.uid() -- CRITICAL: Ensure users only search their own data
  order by interactions.embedding <=> query_embedding
  limit match_count;
end;
$$;