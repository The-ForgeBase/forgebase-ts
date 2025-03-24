import { PageServerLoad } from '@analogjs/router';
import { sendRedirect } from 'h3';

export const load = async ({
  params, // params/queryParams from the request
  req, // H3 Request
  res, // H3 Response handler
  fetch, // internal fetch for direct API calls,
  event, // full request event
}: PageServerLoad) => {
  const user = event.context['auth'];
  if (!user) {
    sendRedirect(event, '/signin', 401);
  }
  return {
    loaded: true,
  };
};
