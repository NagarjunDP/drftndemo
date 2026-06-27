import { z } from 'zod';

// Sizes allowed in the system
export const SizeEnum = z.enum(['XS', 'S', 'M', 'L', 'XL', 'XXL']);

// Product ID pattern (enforces valid UUID to prevent DB casting crashes)
export const ProductIdSchema = z.string().uuid('Invalid product ID format');

// POST /api/orders/create Schema
export const createOrderSchema = z.object({
  items: z.array(z.object({
    productId: ProductIdSchema,
    size: SizeEnum,
    quantity: z.number().int().min(1).max(10)
  })).min(1).max(20),
  discountCode: z.string().optional(),
  customerInfo: z.object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().email(),
    phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number'),
    address: z.object({
      line1: z.string().trim().min(5).max(200),
      line2: z.string().trim().optional(),
      city: z.string().trim().min(2).max(100),
      state: z.string().trim().min(2).max(100),
      pincode: z.string().trim().regex(/^\d{6}$/, 'Must be a 6-digit Indian PIN code')
    })
  })
});

// POST /api/orders/verify-payment Schema
export const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1)
});

// GET /api/orders/track Schema
export const trackOrderSchema = z.object({
  orderNumber: z.string().min(1),
  phone: z.string().min(4) // support partial/full phone matches safely
});

// POST /api/stock/check Schema
export const stockCheckSchema = z.object({
  productId: ProductIdSchema,
  size: SizeEnum
});

// POST /api/discount/validate Schema
export const discountValidateSchema = z.object({
  code: z.string().min(1),
  subtotal: z.number().nonnegative()
});

// POST /api/shipping/calculate Schema
export const shippingCalculateSchema = z.object({
  pincode: z.string().regex(/^\d{6}$/, 'Must be a 6-digit Indian PIN code'),
  subtotal: z.number().nonnegative()
});

// GET /api/shipping/track-shipment Schema
export const trackShipmentSchema = z.object({
  awb: z.string().min(1)
});

// Admin Product Create/Update Schema
export const adminProductSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric and hyphens'),
  description: z.string().min(10).max(1000),
  price: z.number().positive(),
  compare_price: z.number().positive().optional(),
  category: z.string().min(2),
  gender: z.string().min(2),
  images: z.array(z.string().url()).min(1),
  sizes: z.array(SizeEnum).min(1),
  stock_quantity: z.record(SizeEnum, z.number().int().nonnegative()),
  is_featured: z.boolean().default(false),
  is_active: z.boolean().default(true)
});

// Admin Order Status Update Schema
export const adminUpdateStatusSchema = z.object({
  status: z.enum(['placed', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'])
});
