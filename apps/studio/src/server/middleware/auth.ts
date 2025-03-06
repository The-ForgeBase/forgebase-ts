import {
  defineEventHandler,
  sendRedirect,
  setHeaders,
  getRequestURL,
  parseCookies,
} from 'h3';

export default defineEventHandler(async (event) => {
  const cookies = parseCookies(event);
  console.log('cookies', cookies);
  // Only execute for /home routes
  // if (getRequestURL(event).pathname.startsWith('/home')) {
  //   const cookies = parseCookies(event);
  //   const isLoggedIn = cookies['authToken'];
  //   // check auth and redirect
  //   if (!isLoggedIn) {
  //     sendRedirect(event, '/signin', 401);
  //   } else {
  //     setHeaders(event, {
  //       'X-Logged-In': 'true',
  //     });
  //     console.log('User is logged in:', isLoggedIn);
  //   }
  // }
});
