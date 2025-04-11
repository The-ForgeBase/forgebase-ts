import { ForgebaseWebAuth, StorageType } from '@forgebase-ts/web-auth';

export const auth = new ForgebaseWebAuth({
  apiUrl: 'http://localhost:8000/api',
  storageType: StorageType.COOKIE,
  useCookies: true,
  withCredentials: true,
  secureCookies: false, // Set to true in production
  ssr: true,
});
