import { Controller, Get, Req, Res, Post, Body } from '@nestjs/common';
import { Request, Response } from 'express';
import { SSEService } from './sse.service';

@Controller('sse')
export class SSEController {
  constructor(private readonly sseService: SSEService) {}

  @Get()
  async handleSSE(@Req() req: Request, @Res() res: Response): Promise<void> {
    // Convert Express request to Fetch API Request
    const url = new URL(req.url, `http://${req.headers.host}`);

    const headers = new Headers();

    Object.entries(req.headers).forEach(([key, value]) => {
      if (value)
        headers.set(
          key,
          Array.isArray(value) ? value.join(', ') : value.toString()
        );
    });

    const request = new Request(url.toString(), {
      method: req.method,
      headers,
    });

    try {
      // Use the SSEManager to handle the request
      const response = await this.sseService.handleRequest(request);

      res.status(response.status);
      response.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });
      res.send(await response.text());
    } catch (error) {
      console.error('Error handling SSE request:', error);
      res.status(500).send('Internal Server Error');
    }
  }

  @Post()
  async handleSSEPost(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: any
  ): Promise<void> {
    // Convert Express request to Fetch API Request
    const url = new URL(req.url, `http://${req.headers.host}`);

    const requestHeaders = new Headers();
    Object.entries(req.headers).forEach(([key, value]) => {
      if (value)
        requestHeaders.set(
          key,
          Array.isArray(value) ? value.join(', ') : value.toString()
        );
    });

    const request = new Request(url.toString(), {
      method: req.method,
      headers: requestHeaders,
      body: JSON.stringify(body),
    });

    try {
      // Use the SSEManager to handle the request
      const response = await this.sseService.handleRequest(request);

      res.status(response.status);
      response.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });
      res.send(await response.text());
    } catch (error) {
      console.error('Error handling SSE request:', error);
      res.status(500).send('Internal Server Error');
    }
  }
}
