import { Controller, Get, Body, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { EventBus } from '@nestjs/cqrs';
import { UserCreatedEvent } from './user-created.event';
import { UserLicenseUpgradeEvent, UserLicenseUpgradeEventPayload } from './user-license-upgrade.event';
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

  @Post('users/update-license')
  async updateUserLicense() {
    const licenseTypes = ['basic', 'premium', 'enterprise'];
    const results: Array<{ userId: string; licenseType: string; upgradeDate: string }> = [];

    for (let i = 1; i <= 100; i++) {
      const userId = `user${i}`;
      const licenseType = licenseTypes[i % licenseTypes.length];
      const upgradeDate = new Date().toISOString();

      const payload: UserLicenseUpgradeEventPayload = {
        userId,
        licenseType,
        upgradeDate,
      };
      const event = new UserLicenseUpgradeEvent(payload);
      
      this.eventBus.publish(event);
      await logArtifact(
        'users-service',
        `UserLicenseUpgradeEvent published: ${userId}, ${licenseType}`,
      );
      
      results.push({ userId, licenseType, upgradeDate });
    }

    return { status: 'published', count: results.length, results };
  }
}
