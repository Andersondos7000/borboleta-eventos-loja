
      SELECT setval('cart_items_id_seq', COALESCE(MAX(id), 1)) FROM cart_items;
      SELECT setval('customers_id_seq', COALESCE(MAX(id), 1)) FROM customers;
      SELECT setval('orders_id_seq', COALESCE(MAX(id), 1)) FROM orders;
      SELECT setval('order_items_id_seq', COALESCE(MAX(id), 1)) FROM order_items;
      SELECT setval('tickets_id_seq', COALESCE(MAX(id), 1)) FROM tickets;
    