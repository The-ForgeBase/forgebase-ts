import { RealtimeAdapter, UserContext } from '@the-forgebase/database';

export async function websseHandler(
  req: Request,
  userContext: UserContext,
  realtimeAdapter: RealtimeAdapter,
) {
  const { headers } = req;
  const newHeaders = new Headers(headers);
  newHeaders.set('userContext', JSON.stringify(userContext));
  const request = new Request(req.url, {
    headers: newHeaders,
    ...req,
  });

  const response = await realtimeAdapter.handleRequest(request);
  return response;
}
