import { MfaService } from '../types';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import twilio from 'twilio';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

export class TotpMfaService implements MfaService {
  async generateSecret(
    email: string
  ): Promise<{ secret: string; uri: string }> {
    const secret = speakeasy.generateSecret({
      name: `MyApp:${email}`,
      length: 20,
    });

    const qrCode = await QRCode.toDataURL(secret.otpauth_url!);
    return {
      secret: secret.base32,
      uri: qrCode,
    };
  }

  verifyCode(secret: string, code: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 1,
    });
  }

  generateRecoveryCodes() {
    return Array.from({ length: 10 }, () =>
      crypto.randomBytes(8).toString('hex')
    );
  }
}

export class SmsMfaService {
  private twilioClient = twilio(
    process.env.TWILIO_SID,
    process.env.TWILIO_TOKEN
  );

  async sendCode(phoneNumber: string): Promise<string> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await this.twilioClient.messages.create({
      body: `Your MFA code: ${code}`,
      to: phoneNumber,
      from: process.env.TWILIO_PHONE,
    });
    return code;
  }
}

export class EmailMfaService {
  private transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  async sendCode(email: string): Promise<string> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await this.transporter.sendMail({
      to: email,
      subject: 'Your MFA Code',
      text: `Your MFA code: ${code}`,
    });
    return code;
  }
}
