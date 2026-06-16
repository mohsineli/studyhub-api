/**
 * Jest mock for `expo-server-sdk`.
 *
 * The real package is pure ESM (`"type": "module"`), which ts-jest (CommonJS)
 * cannot `require`, so importing it from the module graph breaks any suite that
 * transitively loads PushService. Unit tests never send real push notifications,
 * so we map the package to this lightweight stub via `moduleNameMapper`.
 */
export class Expo {
  static isExpoPushToken(_token: string): boolean {
    return true;
  }

  chunkPushNotifications(messages: unknown[]): unknown[][] {
    return messages.length ? [messages] : [];
  }

  async sendPushNotificationsAsync(_chunk: unknown[]): Promise<unknown[]> {
    return [];
  }
}

// Erased at runtime — only present so a `{ ExpoPushMessage }` value import resolves.
export type ExpoPushMessage = Record<string, unknown>;
