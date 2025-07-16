import { Controller, Get, Body, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { EventBus } from '@nestjs/cqrs';
import { UserCreatedEvent } from './user-created.event';
import { logArtifact } from '../../shared/artifact-logger';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly eventBus: EventBus,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('users/create')
  async createUser(@Body() body: { userId: string; email: string }) {
    const event = new UserCreatedEvent({
      userId: body.userId,
      email: body.email,
    });
    this.eventBus.publish(event);
    await logArtifact(
      'users-service',
      `UserCreatedEvent published: ${body.userId}, ${body.email}`,
    );
    return { status: 'published' };
  }
}
