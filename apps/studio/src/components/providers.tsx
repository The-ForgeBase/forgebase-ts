'use client';
import { Toaster } from '@forgebase-ts/studio-ui/toaster';

import { Provider } from 'jotai';

export const Providers = ({ children }: { children: any }) => {
  return (
    <Provider>
      {children}
      <Toaster />
    </Provider>
  );
};
