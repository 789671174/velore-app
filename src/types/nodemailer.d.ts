declare module "nodemailer" {
  export interface TransportAuth {
    user: string;
    pass: string;
  }

  export interface TransportOptions {
    host: string;
    port: number;
    secure?: boolean;
    auth?: TransportAuth;
  }

  export interface SendMailOptions {
    from?: string;
    to: string | string[];
    subject?: string;
    html?: string;
    text?: string;
  }

  export interface SentMessageInfo {
    messageId: string;
    [key: string]: unknown;
  }

  export interface Transporter {
    sendMail(options: SendMailOptions): Promise<SentMessageInfo>;
  }

  export function createTransport(options: TransportOptions): Transporter;
}
