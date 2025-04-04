import { defineEventHandler, getCookie, parseCookies } from 'h3';

export default defineEventHandler(async (event) => {
  const cookies = parseCookies(event);
  console.log('cookies', cookies);
  // console.log('cookies hello', cookies);
  const res = await fetch('http://localhost:8000/api/admin/admins', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `AdminBearer ${cookies['admin_token']}`, // Include the admin_token cookie in the request
    },
    credentials: 'include',
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('Error fetching data:', data);
    return {
      message: 'Error fetching data',
    };
  }

  if (!data) {
    return {
      message: 'No data found',
    };
  }

  return {
    message: 'Hello from the server!',
    data: data,
  };
});
