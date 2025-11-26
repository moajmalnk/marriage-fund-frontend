import api from '@/lib/api';

/**
 * DIAGNOSTIC: Test all API endpoints with real data
 */
export const testAllEndpoints = async () => {
  const results = {
    status: 'pending',
    endpoints: {} as Record<string, any>
  };

  try {
    // Test 1: Users endpoint
    try {
      const usersRes = await api.get('/users/');
      results.endpoints['GET /api/users/'] = {
        status: 'success',
        count: usersRes.data?.length || 0,
        sample: usersRes.data?.[0]
      };
    } catch (e) {
      results.endpoints['GET /api/users/'] = { status: 'failed', error: String(e) };
    }

    // Test 2: Fund Requests endpoint
    try {
      const fundRes = await api.get('/fund-requests/');
      results.endpoints['GET /api/fund-requests/'] = {
        status: 'success',
        count: fundRes.data?.length || 0,
        sample: fundRes.data?.[0]
      };
    } catch (e) {
      results.endpoints['GET /api/fund-requests/'] = { status: 'failed', error: String(e) };
    }

    // Test 3: Payments endpoint
    try {
      const paymentsRes = await api.get('/payments/');
      results.endpoints['GET /api/payments/'] = {
        status: 'success',
        count: paymentsRes.data?.length || 0,
        sample: paymentsRes.data?.[0]
      };
    } catch (e) {
      results.endpoints['GET /api/payments/'] = { status: 'failed', error: String(e) };
    }

    results.status = 'complete';
  } catch (e) {
    results.status = 'error';
  }

  return results;
};
