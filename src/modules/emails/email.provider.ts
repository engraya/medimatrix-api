export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  key: string;
}
export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}
