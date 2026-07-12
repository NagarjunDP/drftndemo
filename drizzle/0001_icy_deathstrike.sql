CREATE TYPE "public"."auth_provider_enum" AS ENUM('phone', 'google');--> statement-breakpoint
CREATE TYPE "public"."order_status_enum" AS ENUM('placed', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled', 'pending_payment', 'payment_verifying', 'failed', 'expired', 'preparing', 'ready_for_pickup', 'collected', 'payment_mismatch');--> statement-breakpoint
CREATE TABLE "notification_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"url" text,
	"audience_type" text NOT NULL,
	"product_id" uuid,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"image_url" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"alt_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"product_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notified_at" timestamp with time zone,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"phone" text,
	"phone_verified" boolean DEFAULT false NOT NULL,
	"email" text,
	"email_verified" boolean DEFAULT false NOT NULL,
	"name" text NOT NULL,
	"notifications_opt_in" boolean DEFAULT true NOT NULL,
	"terms_accepted_at" timestamp with time zone,
	"auth_provider" "auth_provider_enum" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_phone_unique" UNIQUE("phone"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "contact_messages" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "contact_messages" ALTER COLUMN "email" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "contact_messages" ALTER COLUMN "message" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "shipping_address" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "order_status" SET DEFAULT 'pending_payment'::"public"."order_status_enum";--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "order_status" SET DATA TYPE "public"."order_status_enum" USING "order_status"::"public"."order_status_enum";--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "description" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "parent_id" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "fulfillment_type" text DEFAULT 'delivery' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "pickup_status" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "pickup_code" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_type" text DEFAULT 'prepaid' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "deposit_amount" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "remaining_amount" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "deposit_status" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "verified_phone" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "subcategory" text;--> statement-breakpoint
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;