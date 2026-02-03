import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface InvitationEmailData {
  to: string;
  fullName: string;
  role: string;
  password: string;
  invitationCode: string;
  invitedByName: string;
}

@Injectable()
export class NotificationEmailService {
  private logger = new Logger('NotificationEmailService');
  private transporter: nodemailer.Transporter | null = null;

  constructor(private configService: ConfigService) {
    this.initTransporter();
  }

  private initTransporter(): void {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpPort = this.configService.get<number>('SMTP_PORT', 465);
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');

    if (smtpHost && smtpUser && smtpPass) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      this.transporter.verify((error) => {
        if (error) {
          this.logger.warn(`SMTP connection failed: ${error.message}`);
        } else {
          this.logger.log('SMTP notification service ready');
        }
      });
    } else {
      this.logger.warn(
        'SMTP credentials not configured. Email notifications will be logged only.',
      );
    }
  }

  private getRoleName(role: string): string {
    const roleNames: Record<string, string> = {
      admin: 'Administrator',
      director: 'Direktor',
      manager: 'Menedjer',
      accountant: 'Buxgalter',
      administrator: 'Administrator',
    };
    return roleNames[role] || role;
  }

  async sendInvitationEmail(data: InvitationEmailData): Promise<boolean> {
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3001',
    );
    const activationLink = `${frontendUrl}/auth/activate?code=${data.invitationCode}`;
    const roleName = this.getRoleName(data.role);

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .credentials { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
    .credentials p { margin: 10px 0; }
    .credentials strong { color: #667eea; }
    .code-box { background: #667eea; color: white; font-size: 24px; font-weight: bold; padding: 15px 30px; border-radius: 8px; text-align: center; margin: 20px 0; letter-spacing: 3px; }
    .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
    .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Logista CRM</h1>
      <p>Tizimga taklif</p>
    </div>
    <div class="content">
      <h2>Assalomu alaykum, ${data.fullName}!</h2>

      <p><strong>${data.invitedByName}</strong> sizni Logista CRM tizimiga taklif qildi.</p>

      <div class="credentials">
        <h3>Kirish ma'lumotlari:</h3>
        <p><strong>Email:</strong> ${data.to}</p>
        <p><strong>Parol:</strong> ${data.password}</p>
        <p><strong>Lavozim:</strong> ${roleName}</p>
      </div>

      <p>Tizimga kirish uchun quyidagi bir martalik kodni ishlating:</p>

      <div class="code-box">${data.invitationCode}</div>

      <p style="text-align: center;">
        <a href="${activationLink}" class="button">Tizimga kirish</a>
      </p>

      <div class="warning">
        <strong>Muhim:</strong> Bu kod faqat bir marta ishlatiladi va 24 soat ichida amal qiladi.
        Birinchi kirishdan so'ng parolingizni o'zgartirishingiz tavsiya etiladi.
      </div>

      <div class="footer">
        <p>Agar siz bu taklifni kutmagan bo'lsangiz, iltimos bu xabarni e'tiborsiz qoldiring.</p>
        <p>&copy; ${new Date().getFullYear()} Logista CRM. Barcha huquqlar himoyalangan.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    const textContent = `
Assalomu alaykum, ${data.fullName}!

${data.invitedByName} sizni Logista CRM tizimiga taklif qildi.

Kirish ma'lumotlari:
- Email: ${data.to}
- Parol: ${data.password}
- Lavozim: ${roleName}

Bir martalik aktivatsiya kodi: ${data.invitationCode}

Tizimga kirish uchun quyidagi havolaga o'ting:
${activationLink}

Muhim: Bu kod faqat bir marta ishlatiladi va 24 soat ichida amal qiladi.

© ${new Date().getFullYear()} Logista CRM
    `;

    if (!this.transporter) {
      this.logger.log('='.repeat(60));
      this.logger.log('INVITATION EMAIL (SMTP not configured - logging only)');
      this.logger.log('='.repeat(60));
      this.logger.log(`To: ${data.to}`);
      this.logger.log(`Full Name: ${data.fullName}`);
      this.logger.log(`Role: ${roleName}`);
      this.logger.log(`Password: ${data.password}`);
      this.logger.log(`Invitation Code: ${data.invitationCode}`);
      this.logger.log(`Activation Link: ${activationLink}`);
      this.logger.log('='.repeat(60));
      return true;
    }

    try {
      const smtpFrom = this.configService.get<string>(
        'SMTP_FROM',
        this.configService.get<string>('SMTP_USER', 'noreply@logista.uz'),
      );

      await this.transporter.sendMail({
        from: `"Logista CRM" <${smtpFrom}>`,
        to: data.to,
        subject: 'Logista CRM - Tizimga taklif',
        text: textContent,
        html: htmlContent,
      });

      this.logger.log(`Invitation email sent to ${data.to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send invitation email: ${error.message}`);
      return false;
    }
  }

  async sendPasswordResetEmail(
    to: string,
    fullName: string,
    resetCode: string,
  ): Promise<boolean> {
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3001',
    );
    const resetLink = `${frontendUrl}/auth/reset-password?code=${resetCode}`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .code-box { background: #667eea; color: white; font-size: 24px; font-weight: bold; padding: 15px 30px; border-radius: 8px; text-align: center; margin: 20px 0; letter-spacing: 3px; }
    .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Logista CRM</h1>
      <p>Parolni tiklash</p>
    </div>
    <div class="content">
      <h2>Assalomu alaykum, ${fullName}!</h2>
      <p>Parolni tiklash so'rovi qabul qilindi.</p>

      <div class="code-box">${resetCode}</div>

      <p style="text-align: center;">
        <a href="${resetLink}" class="button">Parolni tiklash</a>
      </p>

      <p>Bu kod 1 soat ichida amal qiladi.</p>

      <div class="footer">
        <p>Agar siz bu so'rovni yubormagan bo'lsangiz, iltimos bu xabarni e'tiborsiz qoldiring.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    if (!this.transporter) {
      this.logger.log(`Password reset email (logged): ${to}, code: ${resetCode}`);
      return true;
    }

    try {
      const smtpFrom = this.configService.get<string>(
        'SMTP_FROM',
        this.configService.get<string>('SMTP_USER', 'noreply@logista.uz'),
      );

      await this.transporter.sendMail({
        from: `"Logista CRM" <${smtpFrom}>`,
        to,
        subject: 'Logista CRM - Parolni tiklash',
        html: htmlContent,
      });

      this.logger.log(`Password reset email sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send password reset email: ${error.message}`);
      return false;
    }
  }
}
