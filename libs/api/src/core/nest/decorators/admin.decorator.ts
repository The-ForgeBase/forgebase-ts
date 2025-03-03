import { SetMetadata } from '@nestjs/common';

export const ApiAdmin = () => SetMetadata('isApiAdmin', true);
