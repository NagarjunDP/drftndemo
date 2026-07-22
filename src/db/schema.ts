import { pgTable, uuid, text, integer, boolean, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// 0. Order Status Enum
export const orderStatusEnum = pgEnum('order_status_enum', [
  'placed',
  'confirmed',
  'packed',
  'shipped',
  'delivered',
  'cancelled',
  'pending_payment',
  'payment_verifying',
  'failed',
  'expired',
  'preparing',
  'ready_for_pickup',
  'collected',
  'payment_mismatch'
]);

// 1. Categories Table
export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  image_url: text('image_url'),
  description: text('description'),
  parent_id: uuid('parent_id').references((): any => categories.id, { onDelete: 'cascade' }),
  is_active: boolean('is_active').notNull().default(true),
  display_order: integer('display_order').notNull().default(0),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// 2. Products Table
export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  description: text('description').notNull(),
  price: integer('price').notNull(), // stored in paise, e.g. 129900 for ₹1299
  compare_price: integer('compare_price'), // strikethrough MRP in paise
  category: text('category').notNull(), // main category slug, e.g. 't-shirts'
  subcategory: text('subcategory'), // subcategory slug, e.g. 'boxy-fit-t-shirts'
  gender: text('gender').notNull(), // 'unisex' | 'men' | 'women'
  images: text('images').array().notNull().default(sql`'{}'::text[]`), // Array of Cloudinary URLs
  sizes: text('sizes').array().notNull().default(sql`'{"XS", "S", "M", "L", "XL", "XXL"}'::text[]`),
  stock_quantity: jsonb('stock').$type<Record<string, number>>().notNull().default(sql`'{"XS": 0, "S": 0, "M": 0, "L": 0, "XL": 0, "XXL": 0}'::jsonb`),
  is_featured: boolean('is_featured').notNull().default(false),
  is_active: boolean('is_active').notNull().default(true),
  weight_grams: integer('weight_grams').notNull().default(0),
  length_cm: integer('length_cm'),
  breadth_cm: integer('breadth_cm'),
  height_cm: integer('height_cm'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// 3. Orders Table
export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: text('user_id'), // Clerk User ID
  order_number: text('order_number').unique().notNull(), // format: DRFTN-1001
  customer_name: text('customer_name').notNull(),
  customer_email: text('customer_email').notNull(),
  customer_phone: text('customer_phone').notNull(), // 10-digit Indian mobile
  shipping_address: jsonb('shipping_address').$type<{
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
  }>(), // Nullable for store pickup orders
  items: jsonb('items').$type<Array<{
    id: string; // product ID
    name: string;
    size: string;
    quantity: number;
    price: number; // in paise
    image: string;
    slug: string;
  }>>().notNull(),
  subtotal: integer('subtotal').notNull(), // in paise
  shipping_charge: integer('shipping_charge').notNull(), // in paise
  discount_code: text('discount_code'),
  discount_amount: integer('discount_amount'), // in paise
  total: integer('total').notNull(), // in paise
  payment_status: text('payment_status').$type<'pending' | 'paid' | 'failed' | 'refunded'>().notNull().default('pending'),
  razorpay_order_id: text('razorpay_order_id'),
  payment_id: text('razorpay_payment_id'), // Razorpay Payment ID
  order_status: orderStatusEnum('order_status').notNull().default('pending_payment'),
  fulfillment_type: text('fulfillment_type').$type<'delivery' | 'pickup'>().notNull().default('delivery'),
  pickup_status: text('pickup_status').$type<'awaiting_pickup' | 'ready_for_pickup' | 'collected'>(),
  pickup_code: text('pickup_code'),
  tracking_number: text('tracking_number'), // Shiprocket AWB
  courier_partner: text('courier_partner'),
  shiprocket_order_id: text('shiprocket_order_id'),
  courier_provider: text('courier_provider'), // 'borzo' | 'shiprocket' | null
  zone: text('zone'), // 'BLR_EXPRESS' | 'STANDARD' | null
  invoice_number: text('invoice_number'),
  payment_type: text('payment_type').$type<'prepaid' | 'cod_with_deposit'>().notNull().default('prepaid'),
  deposit_amount: integer('deposit_amount'), // in paise, for COD orders (₹200 = 20000)
  remaining_amount: integer('remaining_amount'), // in paise, due at delivery (total - deposit_amount)
  deposit_status: text('deposit_status').$type<'pending' | 'paid' | 'failed'>(),
  verified_phone: text('verified_phone'), // Phone number verified via phone.email
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  holdExpiresAt: timestamp('hold_expires_at', { withTimezone: true }),
  reminderSent: boolean('reminder_sent').notNull().default(false),
});

// 4. Discount Codes Table
export const discountCodes = pgTable('discount_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').unique().notNull(), // UPPERCASE
  discount_type: text('discount_type').$type<'percent' | 'flat'>().notNull(),
  discount_value: integer('discount_value').notNull(), // percent: 0-100, flat: paise
  min_order_value: integer('min_order_value').notNull().default(0), // paise
  usage_limit: integer('usage_limit'),
  used_count: integer('used_count').notNull().default(0),
  is_active: boolean('is_active').notNull().default(true),
  expires_at: timestamp('expires_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 5. Settings Table
export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// 6. Contact Messages Table
export const contactMessages = pgTable('contact_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  message: text('message').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 7. Product Images Table
export const productImages = pgTable('product_images', {
  id: uuid('id').primaryKey().defaultRandom(),
  product_id: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  image_url: text('image_url').notNull(),
  sort_order: integer('sort_order').notNull().default(0),
  alt_text: text('alt_text'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 8. Push Subscriptions Table
export const pushSubscriptions = pgTable('push_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  endpoint: text('endpoint').unique().notNull(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  product_id: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  notified_at: timestamp('notified_at', { withTimezone: true }),
});

// 9. Notification Logs Table
export const notificationLogs = pgTable('notification_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  url: text('url'),
  audience_type: text('audience_type').$type<'general' | 'product'>().notNull(),
  product_id: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
  sent_count: integer('sent_count').notNull().default(0),
  failed_count: integer('failed_count').notNull().default(0),
  sent_at: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
});

// 10. Auth Provider Enum
export const authProviderEnum = pgEnum('auth_provider_enum', ['phone', 'google']);

// 11. Users Table
export const users = pgTable('users', {
  id: text('id').primaryKey(), // Clerk ID or custom generated ID
  phone: text('phone').unique(),
  phoneVerified: boolean('phone_verified').notNull().default(false),
  email: text('email').unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  name: text('name').notNull(),
  notificationsOptIn: boolean('notifications_opt_in').notNull().default(true),
  termsAcceptedAt: timestamp('terms_accepted_at', { withTimezone: true }),
  authProvider: authProviderEnum('auth_provider').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastActiveAt: timestamp('last_active_at', { withTimezone: true }),
});
