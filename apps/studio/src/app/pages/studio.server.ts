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
  if (!user || !user.id) {
    console.log('User is not authenticated');
    console.log('Current URL:', getRequestURL(event).pathname);
    try {
      console.log('Attempting to redirect to /signin');
      const redirectResult = await sendRedirect(event, '/signin', 401);
      console.log('Redirect result:', redirectResult);
      return redirectResult;
    } catch (error) {
      console.error('Error during redirect:', error);
      throw error;
    }
  } else {
    console.log('User is authenticated');
    event.context['auth'] = user;
    console.log('Auth context set:', event.context['auth']);
  }
  return {
    loaded: true,
  };
};
