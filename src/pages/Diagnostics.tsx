import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { testAllEndpoints } from '@/lib/testApi';

const Diagnostics = () => {
  const { currentUser, isLoading } = useAuth();
  const [results, setResults] = useState<any>(null);
  const [testRunning, setTestRunning] = useState(false);

  useEffect(() => {
    const runTests = async () => {
      if (!currentUser || isLoading) return;
      
      setTestRunning(true);
      const testResults = await testAllEndpoints();
      setResults(testResults);
      setTestRunning(false);
    };

    if (currentUser && !isLoading) {
      runTests();
    }
  }, [currentUser, isLoading]);

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!currentUser) {
    return <div className="p-8">Please log in first</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">API Diagnostics</h1>
        <p className="text-muted-foreground">Checking API connectivity and data flow</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current User</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>Username:</strong> {currentUser.username}</p>
            <p><strong>Name:</strong> {currentUser.name}</p>
            <p><strong>Role:</strong> {currentUser.role}</p>
          </div>
        </CardContent>
      </Card>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Endpoint Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(results.endpoints).map(([endpoint, data]: [string, any]) => (
                <div key={endpoint} className="border rounded p-4">
                  <div className="flex items-center justify-between mb-2">
                    <code className="text-sm font-mono">{endpoint}</code>
                    <span className={`text-xs font-bold px-2 py-1 rounded ${
                      data.status === 'success' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {data.status.toUpperCase()}
                    </span>
                  </div>
                  {data.status === 'success' && (
                    <div className="text-sm text-muted-foreground">
                      <p>Records: {data.count}</p>
                      {data.sample && (
                        <pre className="mt-2 bg-slate-50 p-2 rounded text-xs overflow-auto max-h-40">
                          {JSON.stringify(data.sample, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                  {data.status === 'failed' && (
                    <p className="text-sm text-red-600">{data.error}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {testRunning && (
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-2">Running tests...</p>
        </div>
      )}
    </div>
  );
};

export default Diagnostics;
