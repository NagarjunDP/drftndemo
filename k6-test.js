import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    flash_drop: {
      executor: 'shared-iterations',
      vus: 1000,          // 1000 concurrent virtual users
      iterations: 1000,   // each fires once, simultaneously, at the same variant
      maxDuration: '30s',
    },
  },
};

export default function () {
  const url = 'https://drftndemo-5ybwxcyxc-nagarjundps-projects.vercel.app/api/orders/create';
  
  const payload = JSON.stringify({
    items: [
      {
        productId: 'dd82dff7-1b47-4bb4-9c68-288f04ae73e5', // Washed Crewneck Tee
        size: 'M',
        quantity: 1
      }
    ],
    fulfillmentType: 'pickup',
    paymentMethod: 'razorpay',
    verifiedPhone: '9999999999',
    verifiedPhoneToken: 'mock_token_9999999999',
    customerInfo: {
      name: 'Load Test User',
      email: `test-user-${__VU}@example.com`,
      phone: '9999999999'
    }
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'x-load-test-user-id': `test-user-${__VU}`, // bypass auth and uniquely identify VU
      'x-vercel-protection-bypass': 'NFaqP3ePKOp26UIeDoScq5MHYKrMQKqH', // bypass deployment protection
    },
  };

  const res = http.post(url, payload, params);

  check(res, {
    'status is 200 or 410': (r) => r.status === 200 || r.status === 410,
  });
}
