\echo 'Delete and recreate garage_sale db?'
\prompt 'Return for yes or control-C to cancel > ' foo

DROP DATABASE garage_sale;
CREATE DATABASE garage_sale;
\connect garage_sale

\i garage-sale-schema.sql
\i garage-sale-seed.sql

\echo 'Delete and recreate garage_sale_test db?'
\prompt 'Return for yes or control-C to cancel > ' foo

DROP DATABASE garage_sale_test;
CREATE DATABASE garage_sale_test;
\connect garage_sale_test

\i garage-sale-schema.sql
