import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersServiceService {
  getHello(): string {
    return 'Hello World!';
  }
}
