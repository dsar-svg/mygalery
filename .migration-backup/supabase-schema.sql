-- Supabase Schema for MyGalery
-- Run this in the Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create artworks table
create table artworks (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  technique text,
  price numeric not null,
  image_url text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create settings table
create table settings (
  id uuid primary key default uuid_generate_v4(),
  gallery_name text not null default 'Gallería D''Arte',
  hero_line1 text not null default 'EL ARTE DE',
  hero_line2 text not null default 'LA CREACIÓN',
  hero_image_url text,
  footer_description text default 'Curaduría de arte contemporáneo para coleccionistas con visión. Elevando la experiencia estética a través de la exclusividad.',
  currency text not null default 'EUR',
  updated_at timestamptz default now()
);

-- Insert default settings
insert into settings (id, gallery_name, hero_line1, hero_line2, footer_description, currency)
values ('00000000-0000-0000-0000-000000000001', 'Gallería D''Arte', 'EL ARTE DE', 'LA CREACIÓN', 'Curaduría de arte contemporáneo para coleccionistas con visión. Elevando la experiencia estética a través de la exclusividad.', 'EUR')
on conflict (id) do nothing;

-- Create indexes
create index artworks_owner_id_idx on artworks(owner_id);
create index artworks_created_at_idx on artworks(created_at desc);

-- Enable Row Level Security (RLS)
alter table artworks enable row level security;
alter table settings enable row level security;

-- Policies for artworks
create policy "Artworks are viewable by everyone"
  on artworks for select
  using (true);

create policy "Users can create their own artworks"
  on artworks for insert
  with check (auth.uid() = owner_id);

create policy "Users can update their own artworks"
  on artworks for update
  using (auth.uid() = owner_id);

create policy "Users can delete their own artworks"
  on artworks for delete
  using (auth.uid() = owner_id);

-- Policy for admin to manage all artworks (optional - replace email with your admin email)
create policy "Admin can manage all artworks"
  on artworks for all
  using (auth.jwt() ->> 'email' = 'dariomedina2619@gmail.com');

-- Policies for settings
create policy "Settings are viewable by everyone"
  on settings for select
  using (true);

create policy "Only admin can update settings"
  on settings for update
  using (auth.jwt() ->> 'email' = 'dariomedina2619@gmail.com');

create policy "Only admin can insert settings"
  on settings for insert
  with check (auth.jwt() ->> 'email' = 'dariomedina2619@gmail.com');

-- Create function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create triggers for updated_at
create trigger update_artworks_updated_at
  before update on artworks
  for each row
  execute function update_updated_at_column();

create trigger update_settings_updated_at
  before update on settings
  for each row
  execute function update_updated_at_column();
