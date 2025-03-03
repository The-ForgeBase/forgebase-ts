export interface EmailService {
  sendMagicLinkEmail(toEmail: string, magicLink: string): Promise<void>;
}

// Basic implementation - in real world, you'd use a proper email service
export class DefaultEmailService implements EmailService {
  async sendMagicLinkEmail(toEmail: string, magicLink: string): Promise<void> {
    console.log(`[EMAIL SERVICE] Sending magic link to ${toEmail}:`);
    console.log(`[EMAIL SERVICE] Magic Link: ${magicLink}`);
    console.log(
      `[EMAIL SERVICE] In a real implementation, this would send an actual email.`
    );
  }
}
