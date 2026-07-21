-- Migration to add idempotency keys
alter table public.orders add column if not exists idempotency_key text;
alter table public.orders add constraint orders_idempotency_key_key unique (idempotency_key);

alter table public.order_batches add column if not exists idempotency_key text;
alter table public.order_batches add constraint order_batches_idempotency_key_key unique (idempotency_key);
