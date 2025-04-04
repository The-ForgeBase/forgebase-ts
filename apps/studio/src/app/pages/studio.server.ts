import { PageServerLoad } from '@analogjs/router';
import { sendRedirect, getRequestURL } from 'h3';

export const load = async ({
  params,
  req,
  res,
  fetch,
  event,
}: PageServerLoad) => {
  const user = event.context['auth'];
  console.log('user', user);
  return {
    loaded: true,
    user: user,
  };
};
