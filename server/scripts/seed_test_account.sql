INSERT INTO payers (
    id,
    username,
    password_hash,
    full_name,
    phone,
    email,
    available_balance,
    is_active,
    role
)
VALUES (
    '11111111-1111-4111-8111-111111111111',
    'payer1',
    '$argon2id$v=19$m=65536,t=3,p=4$pct590MIuVNwYe9PXaNBCw$0NpQS+zlPtf0FWzzbJr6YiecEit5grEG6Su1uDB8UGU',
    'Nguyen Van A',
    '0900000000',
    'payer@example.com',
    1000000.00,
    TRUE,
    'user'
);
