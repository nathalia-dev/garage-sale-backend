CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE
      CHECK (position('@' IN email) > 1),
    password TEXT NOT NULL,
    photo TEXT
);

CREATE TABLE address (
    id SERIAL PRIMARY KEY,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zipcode INTEGER NOT NULL CHECK (zipcode >= 0),
    user_id INTEGER NOT NULL
      REFERENCES users ON DELETE CASCADE,
    is_default BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE product_status (
    id SERIAL PRIMARY KEY,
    status TEXT NOT NULL
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL
      REFERENCES users ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    price DECIMAL (18,2) NOT NULL CHECK (price >= 0),
    quantity INTEGER NOT NULL CHECK (quantity >= 0),
    description TEXT,
    product_status_id INTEGER NOT NULL
      REFERENCES product_status ON DELETE CASCADE,
    active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE product_photos (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL
      REFERENCES products ON DELETE CASCADE,
    path TEXT NOT NULL
);

CREATE TABLE cart (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL
      REFERENCES users ON DELETE CASCADE,
    product_id INTEGER NOT NULL
      REFERENCES products ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity >= 1),
    date TIMESTAMP NOT NULL default now()
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    date TIMESTAMP NOT NULL default now(),
    buyer_id INTEGER NOT NULL
      REFERENCES users ON DELETE CASCADE,
    transaction_id TEXT NOT NULL,
    total DECIMAL (18,2) NOT NULL CHECK (total >= 0),
    subtotal DECIMAL (18,2) NOT NULL CHECK (subtotal >= 0),
    tax DECIMAL (18,2) NOT NULL DEFAULT 0,
    shipment_price DECIMAL (18,2) NOT NULL DEFAULT 0
);

CREATE TABLE product_orders (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL
      REFERENCES orders ON DELETE CASCADE,
    product_id INTEGER NOT NULL
      REFERENCES products ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity >= 1),
    total DECIMAL (18,2) NOT NULL CHECK (total >= 0)
)
