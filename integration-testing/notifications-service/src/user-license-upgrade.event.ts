import { BaseEvent } from 'nestjs-google-pubsub-cqrs';

export interface UserLicenseUpgradeEventPayload {
  userId: string;
  licenseType: string;
  upgradeDate: string;
}

export class UserLicenseUpgradeEvent implements BaseEvent {
  public readonly payload: UserLicenseUpgradeEventPayload;

  constructor(payload: UserLicenseUpgradeEventPayload) {
    this.payload = payload;
  }
} 