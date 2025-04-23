// utils/web-standard.ts
import {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from 'express';

export function expressToFetchRequest(req: ExpressRequest, body?: any) {
  const { method, url, headers } = req;
  console.log({
    method,
    url,
    body,
  });
  const noBody = method === 'GET' || method === 'HEAD';
  const r = new Request(new URL(url, `http://${req.headers.host}`), {
    method,
    headers: Object.fromEntries(
      Object.entries(headers).map(([key, value]) => [
        key.toLowerCase(),
        Array.isArray(value) ? value.join(', ') : value,
      ])
    ),
    body: noBody ? undefined : JSON.stringify(body),
  });

  return r;
}

export function fetchResponseToExpress(
  res: ExpressResponse,
  fetchResponse: Response
) {
  res.status(fetchResponse.status);
  fetchResponse.headers.forEach((value, name) => {
    res.setHeader(name, value);
  });
  if (fetchResponse.body) {
    const reader = fetchResponse.body.getReader();
    // Stream the response
    const processStream = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        res.end();
      } catch (err) {
        console.error('Stream error:', err);
        res.end();
      }
    };

    processStream();
  } else {
    res.end();
  }
}
