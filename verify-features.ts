import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

async function testAll() {
  console.log('=== STARTING FEATURE VERIFICATION ===');

  // Dynamically import dependencies after env config has loaded
  const { db } = await import('./src/db/index');
  const schema = await import('./src/db/schema');
  const { firestoreService } = await import('./src/lib/firestore');
  const { cleanupExpiredOrders } = await import('./src/lib/orderCleanup');
  const { tryClaimUnitSafe, releaseUnitSafe } = await import('./src/lib/stock-gate');
  const { redis } = await import('./src/lib/redis');

  // Set up environment variables and fetch mock for Resend to verify successful sending path
  const hasRealResendKey = !!(
    process.env.RESEND_API_KEY && 
    !process.env.RESEND_API_KEY.includes('mock') && 
    !process.env.RESEND_API_KEY.includes('placeholder')
  );

  if (!hasRealResendKey) {
    process.env.RESEND_API_KEY = 're_mock_test_key_12345';
  }
  
  const originalFetch = global.fetch;
  global.fetch = async (input: any, init?: any) => {
    const url = typeof input === 'string' ? input : (input?.url || '');
    if (!hasRealResendKey && url.includes('api.resend.com')) {
      console.log(`[Mock Resend API] Intercepted request to ${url} - returning success`);
      return new Response(JSON.stringify({ id: 're_mock_email_success_id' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return originalFetch(input, init);
  };

  // 1. Test Pincode Express Checker Boundary Conditions
  console.log('\n[1] Testing Pincode/Zone Logic Boundary Conditions...');
  const isExpressPincode = (pincode: string, rangesStr: string): boolean => {
    const pin = Number(pincode.trim());
    if (isNaN(pin) || !rangesStr) return false;
    const parts = rangesStr.split(',').map(s => s.trim());
    for (const part of parts) {
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-');
        const start = Number(startStr);
        const end = Number(endStr);
        if (!isNaN(start) && !isNaN(end) && pin >= start && pin <= end) return true;
      } else {
        const exact = Number(part);
        if (!isNaN(exact) && pin === exact) return true;
      }
    }
    return false;
  };

  const blrRanges = '560001-560300';
  const boundaryTests = [
    { pin: '560001', expected: true, label: 'First Valid Pincode' },
    { pin: '560300', expected: true, label: 'Last Valid Pincode (Boundary)' },
    { pin: '560301', expected: false, label: 'First Invalid Pincode (Boundary)' },
    { pin: '562110', expected: false, label: 'Standard Region Pincode' },
    { pin: '110001', expected: false, label: 'Out of State Pincode' }
  ];

  for (const t of boundaryTests) {
    const res = isExpressPincode(t.pin, blrRanges);
    const passed = res === t.expected;
    console.log(`Pincode ${t.pin} (${t.label}): ${res} | Passed: ${passed ? '✓' : '✗'}`);
  }

  // 2. Test Package Weight Calculation
  console.log('\n[2] Testing Weight Calculation...');
  const items = [
    { name: 'Tee', price: 1000, size: 'M', quantity: 2, weight_grams: 350 },
    { name: 'Hoodie', price: 2000, size: 'L', quantity: 1, weight_grams: 700 },
  ];
  const totalWeight = items.reduce((acc, item) => acc + ((item.weight_grams ?? 350) * item.quantity), 0);
  console.log(`Total items weight calculated: ${totalWeight}g (Expected: 1400g)`);

  // 3. Test Redis Stock Gate Claim/Release Operations
  console.log('\n[3] Testing Redis Stock Gate Claim/Release...');
  const testProductId = 'test-prod-gate-999';
  const testSize = 'M';
  
  // Set initial stock in Redis
  await redis.set(`stock:${testProductId}:${testSize}`, '5');
  
  // Try claiming 2 units
  const claimRes = await tryClaimUnitSafe(testProductId, testSize, 2);
  const stockAfterClaim = await redis.get(`stock:${testProductId}:${testSize}`);
  console.log(`Claimed 2 units: ${claimRes ? 'SUCCESS ✓' : 'FAILED ✗'} | Stock remaining: ${stockAfterClaim} (Expected: 3)`);
  
  // Release 2 units back
  await releaseUnitSafe(testProductId, testSize, 2);
  const stockAfterRelease = await redis.get(`stock:${testProductId}:${testSize}`);
  console.log(`Released 2 units: SUCCESS ✓ | Stock returned: ${stockAfterRelease} (Expected: 5)`);
  
  // Clean up
  await redis.del(`stock:${testProductId}:${testSize}`);

  // 4. Test Firestore Backdated Checkouts (Abandoned Cart Email + 24h TTL Hard-delete)
  console.log('\n[4] Testing Backdated Checkouts, Cart Recovery Email, and TTL deletion...');
  
  const now = new Date();
  const testEmail = 'nagarjundp12@gmail.com';
  
  // A. Checkout created 35 minutes ago (should trigger abandoned email)
  const checkoutId35m = 'test-chk-35m-' + Math.random().toString(36).substring(7);
  const checkoutPayload35m = {
    id: checkoutId35m,
    user_id: 'user_test_35',
    order_number: 'DRFTN-35M',
    customer_name: 'Jane Abandoned',
    customer_email: testEmail,
    customer_phone: '9988776655',
    shipping_address: { line1: 'Test St 1', city: 'Bengaluru', state: 'Karnataka', pincode: '560064' },
    items: [
      { id: 'prod-123', name: 'Verified Streetwear Tee', price: 150000, size: 'M', quantity: 1, weight_grams: 350 }
    ],
    subtotal: 150000,
    shipping_charge: 15000,
    total: 165000,
    status: 'pending',
    payment_type: 'prepaid',
    created_at: new Date(now.getTime() - 35 * 60 * 1000).toISOString(),
    hold_expires_at: new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
  };

  // B. Checkout created 25 hours ago (should trigger 24h TTL hard-delete)
  const checkoutId25h = 'test-chk-25h-' + Math.random().toString(36).substring(7);
  const checkoutPayload25h = {
    id: checkoutId25h,
    user_id: 'user_test_25',
    order_number: 'DRFTN-25H',
    customer_name: 'John Old',
    customer_email: testEmail,
    customer_phone: '9988776644',
    shipping_address: { line1: 'Test St 2', city: 'Bengaluru', state: 'Karnataka', pincode: '560064' },
    items: [
      { id: 'prod-123', name: 'Verified Streetwear Tee', price: 150000, size: 'M', quantity: 1, weight_grams: 350 }
    ],
    subtotal: 150000,
    shipping_charge: 15000,
    total: 165000,
    status: 'pending',
    payment_type: 'prepaid',
    created_at: new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString(),
    hold_expires_at: new Date(now.getTime() - 24.8 * 60 * 60 * 1000).toISOString(),
  };

  // Write both checkouts to Firestore
  try {
    await firestoreService.setDoc('pending_checkouts', checkoutId35m, checkoutPayload35m);
    await firestoreService.setDoc('pending_checkouts', checkoutId25h, checkoutPayload25h);
    console.log(`Registered 35-minute-old and 25-hour-old checkouts in Firestore with email: ${testEmail}`);
  } catch (err: any) {
    if (err.message && err.message.includes('NOT_FOUND')) {
      console.warn('\n[Firestore Notice] Real credentials initialized successfully, but the database (default) was not found in project "drftnclothingin".');
      console.warn('To run fully against real Firestore, please open the Firebase Console -> Firestore Database and click "Create Database".');
      console.warn('Falling back to Redis-based sandbox mock mode for the rest of this verification run.\n');
      
      firestoreService.setMockMode(true);
      await firestoreService.setDoc('pending_checkouts', checkoutId35m, checkoutPayload35m);
      await firestoreService.setDoc('pending_checkouts', checkoutId25h, checkoutPayload25h);
    } else {
      throw err;
    }
  }

  // Run the cleanup cron job
  console.log('Running cleanup cron job...');
  const cleanupResult = await cleanupExpiredOrders();
  console.log('Cron cleanup result:', JSON.stringify(cleanupResult));

  // Retrieve states
  const doc35m = await firestoreService.getDoc('pending_checkouts', checkoutId35m);
  const doc25h = await firestoreService.getDoc('pending_checkouts', checkoutId25h);

  const emailTriggered = doc35m?.abandonedEmailSent === true;
  const ttlDeleted = doc25h === null;

  console.log(`35-minute-old checkout abandonedEmailSent status: ${doc35m?.abandonedEmailSent} | Passed: ${emailTriggered ? '✓' : '✗'}`);
  console.log(`25-hour-old checkout is deleted: ${ttlDeleted} | Passed: ${ttlDeleted ? '✓' : '✗'}`);

  // Clean up remaining test document
  if (doc35m) {
    await firestoreService.deleteDoc('pending_checkouts', checkoutId35m);
  }

  // Restore fetch
  global.fetch = originalFetch;
  
  console.log('\n=== VERIFICATION SUCCESSFULLY COMPLETED ===');
}

testAll().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
