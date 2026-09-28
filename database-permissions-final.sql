-- Sera Time permanent server permissions.
-- Safe to run on the Sera Time database. This does not weaken anon/authenticated access.
-- The app server uses service_role / sb_secret only; browser access remains server-mediated.

grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select, update on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

alter default privileges in schema public
grant select, insert, update, delete on tables to service_role;

alter default privileges in schema public
grant usage, select, update on sequences to service_role;

alter default privileges in schema public
grant execute on functions to service_role;
