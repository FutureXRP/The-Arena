-- Optional picture on an ad. An https link for now; uploads come later.
alter table ads add column if not exists image_url text not null default '';
