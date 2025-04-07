'use client';

import { useState, useEffect } from 'react';
import { useDatabase } from '../hooks/useDatabase';
import { useAuth } from '../hooks/useAuth';
import Link from 'next/link';
import LogoutButton from '../components/LogoutButton';
import { v4 as uuidv4 } from 'uuid';

// Define a type for our test data
interface TestData {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  [key: string]: string | number | boolean | null;
}

export default function DatabaseTestComp() {
  const db = useDatabase();
  const { user } = useAuth();

  const [records, setRecords] = useState<TestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newRecord, setNewRecord] = useState({ name: '', description: '' });
  const [tableName, setTableName] = useState('test_table');
  const [apiUrl, setApiUrl] = useState('http://localhost:8000/api/db');

  // Fetch records when the component mounts or API URL changes
  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableName]);

  // Function to fetch records
  const fetchRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await db.getRecords<TestData>(tableName);
      console.log('Fetched records:', response);
      setRecords(response.records || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching records:', err);
    } finally {
      setLoading(false);
    }
  };

  // Function to create a new record
  const createRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecord.name) {
      setError('Name is required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await db.createRecord<TestData>(tableName, {
        ...newRecord,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        id: uuidv4(),
      });
      setNewRecord({ name: '', description: '' }); // Reset form
      fetchRecords(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error creating record:', err);
    } finally {
      setLoading(false);
    }
  };

  // Function to delete a record
  const deleteRecord = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await db.deleteRecord(tableName, id);
      fetchRecords(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error deleting record:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Database Test</h1>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-blue-500 hover:underline">
              Dashboard
            </Link>
            <LogoutButton />
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-md mb-6">
          <h2 className="text-lg font-semibold mb-2">
            Welcome, {user?.name || user?.email}!
          </h2>
          <p>This page demonstrates the DatabaseSDK functionality.</p>
        </div>

        {/* API URL and Table Name Selection */}
        <div className="mb-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                className="flex-1 p-2 border rounded-md"
                placeholder="Enter API URL"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Table Name
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                className="flex-1 p-2 border rounded-md"
                placeholder="Enter table name"
              />
              <button
                onClick={fetchRecords}
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Create New Record Form */}
        <div className="border-t pt-4 mb-6">
          <h3 className="text-lg font-semibold mb-2">Create New Record</h3>
          <form onSubmit={createRecord} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={newRecord.name}
                onChange={(e) =>
                  setNewRecord({ ...newRecord, name: e.target.value })
                }
                className="w-full p-2 border rounded-md"
                placeholder="Enter name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={newRecord.description}
                onChange={(e) =>
                  setNewRecord({ ...newRecord, description: e.target.value })
                }
                className="w-full p-2 border rounded-md"
                placeholder="Enter description"
                rows={3}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:bg-gray-400"
            >
              {loading ? 'Creating...' : 'Create Record'}
            </button>
          </form>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p>{error}</p>
          </div>
        )}

        {/* Records Table */}
        <div className="border-t pt-4">
          <h3 className="text-lg font-semibold mb-2">Records</h3>
          {loading ? (
            <p className="text-gray-500">Loading records...</p>
          ) : records.length === 0 ? (
            <p className="text-gray-500">No records found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {records.map((record) => (
                    <tr key={record.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {record.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {record.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {record.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(record.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => deleteRecord(record.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Advanced Configuration Section */}
        <div className="border-t pt-4 mt-6">
          <h3 className="text-lg font-semibold mb-2">Advanced Configuration</h3>
          <p className="text-gray-600 mb-4">
            This section demonstrates how to configure the DatabaseSDK.
          </p>

          <div className="mb-6">
            <h4 className="text-md font-semibold mb-2">
              Change Axios Instance
            </h4>
            <p className="text-gray-600 mb-2">
              You can replace the axios instance used by the DatabaseSDK. This
              is useful when you need to add custom headers or interceptors.
            </p>
            <button
              onClick={() => {
                // Create a new axios instance with custom configuration
                const axios = db.getAxiosInstance();

                // Add a request interceptor
                axios.interceptors.request.use(
                  (config) => {
                    // Add a custom header to all requests
                    config.headers['X-Custom-Header'] = 'CustomValue';
                    return config;
                  },
                  (error) => Promise.reject(error)
                );

                // Update the axios instance
                db.setAxiosInstance(axios);

                // Show success message
                setError('Successfully added custom header to axios instance');

                // Fetch records to test the new configuration
                fetchRecords();
              }}
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
            >
              Add Custom Header
            </button>
          </div>
        </div>

        {/* Advanced Query Section */}
        <div className="border-t pt-4 mt-6">
          <h3 className="text-lg font-semibold mb-2">Advanced Queries</h3>
          <p className="text-gray-600 mb-4">
            This section demonstrates more advanced query capabilities of the
            DatabaseSDK.
          </p>

          {/* Add advanced query examples here */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={async () => {
                try {
                  const response = await db
                    .table<TestData>(tableName)
                    .orderBy('created_at', 'desc')
                    .limit(5)
                    .execute();
                  setRecords(response.records || []);
                } catch (err) {
                  setError(
                    err instanceof Error ? err.message : 'An error occurred'
                  );
                }
              }}
              className="bg-purple-500 text-white p-3 rounded-md hover:bg-purple-600"
            >
              Latest 5 Records
            </button>

            <button
              onClick={async () => {
                try {
                  const response = await db
                    .table<TestData>(tableName)
                    .where('name', 'like', '%test%')
                    .execute();
                  setRecords(response.records || []);
                } catch (err) {
                  setError(
                    err instanceof Error ? err.message : 'An error occurred'
                  );
                }
              }}
              className="bg-indigo-500 text-white p-3 rounded-md hover:bg-indigo-600"
            >
              Records with {'"test"'} in name
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
