import { Controller, Get, Req, Res, Post, Body } from '@nestjs/common';
import { Request as ExpRequest, Response } from 'express';
import { SSEService } from './sse.service';
import {
  expressToFetchRequest,
  fetchResponseToExpress,
} from '../utils/webStandard';

@Controller('sse')
export class SSEController {
  constructor(private readonly sseService: SSEService) {}

  @Get()
  async handleSSE(@Req() req: ExpRequest, @Res() res: Response): Promise<void> {
    const request = expressToFetchRequest(req);

    try {
      // Use the SSEManager to handle the request
      const response = await this.sseService.handleRequest(request);

      return fetchResponseToExpress(res, response);
    } catch (error) {
      console.error('Error handling SSE request:', error);
      res.status(500).send('Internal Server Error');
    }
  }

  @Post()
  async handleSSEPost(
    @Req() req: ExpRequest,
    @Res() res: Response,
    @Body() body: any
  ): Promise<void> {
    console.log('body', req.body);
    // Convert Express request to Fetch API Request
    const request = expressToFetchRequest(req, { id: 1 });

    try {
      // Use the SSEManager to handle the request
      const response = await this.sseService.handleRequest(request);

      return fetchResponseToExpress(res, response);
    } catch (error) {
      console.error('Error handling SSE request:', error);
      res.status(500).send('Internal Server Error');
    }
  }
}
