-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create user_profiles table
create table if not exists public.user_profiles (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    first_name text not null,
    last_name text not null,
    email text not null,
    phone text,
    address text,
    is_mureed boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    
    -- Constraints
    unique(user_id),
    unique(email),
    constraint email_format check (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Create indexes for better query performance
create index if not exists user_profiles_user_id_idx on public.user_profiles(user_id);
create index if not exists user_profiles_email_idx on public.user_profiles(email);

-- Enable Row Level Security
alter table public.user_profiles enable row level security;

-- Create policies
-- Allow users to view their own profile
create policy "Users can view own profile" 
    on public.user_profiles for select 
    using (auth.uid() = user_id);

-- Allow users to update their own profile
create policy "Users can update own profile" 
    on public.user_profiles for update 
    using (auth.uid() = user_id);

-- Allow new signups to create their profile
create policy "Enable insert for authentication users only" 
    on public.user_profiles for insert 
    with check (auth.role() = 'authenticated');

-- Create function to handle updated_at
create or replace function handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Create trigger for updated_at
create trigger handle_updated_at
    before update on public.user_profiles
    for each row
    execute function handle_updated_at();

-- Grant necessary permissions
grant usage on schema public to authenticated, anon;
grant all on public.user_profiles to authenticated;
grant insert on public.user_profiles to anon;
grant usage, select on sequence public.user_profiles_id_seq to authenticated;

-- Function to automatically create profile after signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.user_profiles (user_id, first_name, last_name, email)
    values (
        new.id,
        new.raw_user_meta_data->>'first_name',
        new.raw_user_meta_data->>'last_name',
        new.email
    );
    return new;
end;
$$ language plpgsql security definer;

-- Trigger to call handle_new_user after auth.users insert
create or replace trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();

-- Comments for documentation
comment on table public.user_profiles is 'Stores additional profile information for authenticated users';
comment on column public.user_profiles.user_id is 'References the auth.users table';
comment on column public.user_profiles.is_mureed is 'Indicates if the user is a Mureed';
