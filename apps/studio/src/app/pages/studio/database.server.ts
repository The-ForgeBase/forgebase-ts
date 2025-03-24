import { PageServerLoad } from '@analogjs/router';
import { parseCookies } from 'h3';

export const load = async ({ event }: PageServerLoad) => {
  const cookies = parseCookies(event);
  const response = await fetch('http://localhost:8000/api/db/schema/tables', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `AdminBearer ${cookies['admin_token']}`, // Include the admin_token cookie in the request
    },
    credentials: 'include',
  });
  const tables = await response.json();
  // console.log('tables', tables);
  return {
    loaded: true,
    tables,
  };
};
