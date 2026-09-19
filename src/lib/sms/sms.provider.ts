export interface SmsProvider {
  send(to: string, body: string): Promise<void>;
}
