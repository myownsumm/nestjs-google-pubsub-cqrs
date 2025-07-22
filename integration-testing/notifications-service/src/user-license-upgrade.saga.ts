import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { UserLicenseUpgradeEvent } from './user-license-upgrade.event';
import { logArtifact } from '../../shared/artifact-logger';

@EventsHandler(UserLicenseUpgradeEvent)
export class UserLicenseUpgradeSaga
  implements IEventHandler<UserLicenseUpgradeEvent>
{
  async handle(event: UserLicenseUpgradeEvent) {
    await logArtifact(
      'notifications-service',
      `UserLicenseUpgradeEvent received: ${event.payload.userId}, ${event.payload.licenseType}, ${event.payload.upgradeDate}`,
    );
  }
} 