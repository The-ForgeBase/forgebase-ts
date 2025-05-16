import { SetMetadata } from '@nestjs/common';

export const ApiPublic = () => SetMetadata('isApiPublic', true);
