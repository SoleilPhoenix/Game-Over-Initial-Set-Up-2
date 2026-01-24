# Game Over Admin Guide

This guide covers administrative procedures for managing the Game Over app using Supabase Dashboard.

## Accessing the Admin Dashboard

1. Navigate to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select the Game Over project
3. Use the Table Editor for direct data management

## Common Administrative Tasks

### User Management

#### View All Users
```sql
SELECT
  id,
  email,
  raw_user_meta_data->>'full_name' as name,
  created_at,
  last_sign_in_at
FROM auth.users
ORDER BY created_at DESC;
```

#### Find User by Email
```sql
SELECT * FROM auth.users
WHERE email = 'user@example.com';
```

#### View User Profile
```sql
SELECT * FROM profiles
WHERE id = 'user-uuid-here';
```

### Event Management

#### View All Events
```sql
SELECT
  e.id,
  e.title,
  e.party_type,
  e.honoree_name,
  c.name as city,
  e.start_date,
  e.status,
  e.created_at
FROM events e
JOIN cities c ON e.city_id = c.id
ORDER BY e.created_at DESC;
```

#### View Event with Participants
```sql
SELECT
  e.*,
  COUNT(ep.id) as participant_count,
  c.name as city_name
FROM events e
LEFT JOIN event_participants ep ON e.id = ep.event_id
JOIN cities c ON e.city_id = c.id
WHERE e.id = 'event-uuid-here'
GROUP BY e.id, c.name;
```

#### Update Event Status
```sql
UPDATE events
SET status = 'cancelled'
WHERE id = 'event-uuid-here';
```

### Booking Management

#### View All Bookings
```sql
SELECT
  b.id,
  b.booking_reference,
  b.payment_status,
  b.total_amount_cents / 100.0 as total_amount,
  e.title as event_name,
  p.name as package_name,
  b.created_at
FROM bookings b
JOIN events e ON b.event_id = e.id
JOIN packages p ON b.package_id = p.id
ORDER BY b.created_at DESC;
```

#### View Bookings by Status
```sql
SELECT * FROM bookings
WHERE payment_status = 'pending'
ORDER BY created_at DESC;
```

#### Process Refund
```sql
UPDATE bookings
SET
  payment_status = 'refunded',
  updated_at = NOW()
WHERE id = 'booking-uuid-here';
```

#### Cancel Booking
```sql
UPDATE bookings
SET
  payment_status = 'cancelled',
  updated_at = NOW()
WHERE id = 'booking-uuid-here';
```

### Revenue & Analytics

#### Total Revenue (Paid Bookings)
```sql
SELECT
  SUM(total_amount_cents) / 100.0 as total_revenue,
  COUNT(*) as total_bookings
FROM bookings
WHERE payment_status = 'paid';
```

#### Revenue by City
```sql
SELECT
  c.name as city,
  SUM(b.total_amount_cents) / 100.0 as revenue,
  COUNT(b.id) as bookings
FROM bookings b
JOIN events e ON b.event_id = e.id
JOIN cities c ON e.city_id = c.id
WHERE b.payment_status = 'paid'
GROUP BY c.name
ORDER BY revenue DESC;
```

#### Revenue by Package Tier
```sql
SELECT
  p.tier,
  SUM(b.total_amount_cents) / 100.0 as revenue,
  COUNT(b.id) as bookings
FROM bookings b
JOIN packages p ON b.package_id = p.id
WHERE b.payment_status = 'paid'
GROUP BY p.tier
ORDER BY revenue DESC;
```

#### Monthly Revenue Report
```sql
SELECT
  DATE_TRUNC('month', b.created_at) as month,
  SUM(b.total_amount_cents) / 100.0 as revenue,
  COUNT(*) as bookings
FROM bookings b
WHERE b.payment_status = 'paid'
GROUP BY DATE_TRUNC('month', b.created_at)
ORDER BY month DESC;
```

### Package Management

#### View All Packages
```sql
SELECT
  p.id,
  p.name,
  p.tier,
  c.name as city,
  p.base_price_cents / 100.0 as base_price,
  p.price_per_person_cents / 100.0 as per_person,
  p.rating,
  p.review_count,
  p.is_active
FROM packages p
JOIN cities c ON p.city_id = c.id
ORDER BY c.name, p.tier;
```

#### Deactivate Package
```sql
UPDATE packages
SET is_active = false
WHERE id = 'package-uuid-here';
```

#### Update Package Pricing
```sql
UPDATE packages
SET
  base_price_cents = 149900,
  price_per_person_cents = 12500,
  updated_at = NOW()
WHERE id = 'package-uuid-here';
```

### City Management

#### View All Cities
```sql
SELECT * FROM cities ORDER BY name;
```

#### Deactivate City
```sql
UPDATE cities
SET is_active = false
WHERE id = 'city-uuid-here';
```

### Invite Codes

#### View Active Invite Codes
```sql
SELECT
  ic.code,
  ic.uses_remaining,
  ic.expires_at,
  e.title as event_name,
  p.full_name as created_by
FROM invite_codes ic
JOIN events e ON ic.event_id = e.id
JOIN profiles p ON ic.created_by = p.id
WHERE ic.expires_at > NOW()
  AND ic.uses_remaining > 0
ORDER BY ic.created_at DESC;
```

#### Invalidate Invite Code
```sql
UPDATE invite_codes
SET uses_remaining = 0
WHERE code = 'INVITE-CODE-HERE';
```

### Polls & Voting

#### View Poll Results
```sql
SELECT
  p.question,
  po.label as option,
  po.vote_count,
  ROUND(po.vote_count * 100.0 / NULLIF(SUM(po.vote_count) OVER (PARTITION BY p.id), 0), 1) as percentage
FROM polls p
JOIN poll_options po ON p.id = po.poll_id
WHERE p.id = 'poll-uuid-here'
ORDER BY po.vote_count DESC;
```

### Chat & Messages

#### View Recent Messages
```sql
SELECT
  m.content,
  p.full_name as sender,
  m.created_at
FROM messages m
JOIN profiles p ON m.user_id = p.id
WHERE m.channel_id = 'channel-uuid-here'
ORDER BY m.created_at DESC
LIMIT 50;
```

## Database Maintenance

### Cleanup Expired Invite Codes
```sql
DELETE FROM invite_codes
WHERE expires_at < NOW() - INTERVAL '30 days';
```

### Cleanup Old Draft Events
```sql
DELETE FROM events
WHERE status = 'draft'
  AND created_at < NOW() - INTERVAL '90 days';
```

## Emergency Procedures

### Disable User Account
```sql
-- In Supabase Dashboard, go to Authentication > Users
-- Find the user and click "Ban User"
-- Or use the API to sign out all sessions
```

### Rollback Recent Changes
Always check the Supabase audit log before making changes. For data recovery:
1. Go to Database > Backups in Supabase Dashboard
2. Contact Supabase support for point-in-time recovery if needed

## Environment-Specific Notes

### Production Checklist
- [ ] Stripe webhook endpoint configured
- [ ] Push notification credentials set
- [ ] Rate limiting enabled
- [ ] RLS policies verified
- [ ] Backup schedule confirmed

### Monitoring
- Use Supabase Dashboard > Database > Query Performance
- Monitor Edge Function invocations
- Check Realtime connection counts
