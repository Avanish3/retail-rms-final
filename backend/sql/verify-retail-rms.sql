SELECT current_database() AS database_name, current_schema() AS schema_name;

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

SELECT COUNT(*) AS stores_count FROM public.stores;
SELECT COUNT(*) AS products_count FROM public.products;
SELECT COUNT(*) AS inventory_count FROM public.inventory;
SELECT COUNT(*) AS users_count FROM public.users;
