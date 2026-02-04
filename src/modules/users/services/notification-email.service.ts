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
      const port = Number(smtpPort);
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port,
        secure: port === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        tls: {
          rejectUnauthorized: false,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
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
      admin: 'Администратор',
      director: 'Директор',
      manager: 'Менеджер',
      accountant: 'Бухгалтер',
      administrator: 'Администратор',
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
      <p>Приглашение в систему</p>
    </div>
    <div class="content">
      <h2>Здравствуйте, ${data.fullName}!</h2>

      <p><strong>${data.invitedByName}</strong> пригласил(а) вас в систему Logista CRM.</p>

      <div class="credentials">
        <h3>Данные для входа:</h3>
        <p><strong>Email:</strong> ${data.to}</p>
        <p><strong>Пароль:</strong> ${data.password}</p>
        <p><strong>Должность:</strong> ${roleName}</p>
      </div>

      <p>Для входа в систему используйте одноразовый код активации:</p>

      <div class="code-box">${data.invitationCode}</div>

      <p style="text-align: center;">
        <a href="${activationLink}" class="button">Войти в систему</a>
      </p>

      <div class="warning">
        <strong>Важно:</strong> Данный код можно использовать только один раз. Срок действия — 24 часа.
        После первого входа рекомендуется сменить пароль.
      </div>

      <div class="footer">
        <p>Если вы не ожидали это приглашение, просто проигнорируйте данное сообщение.</p>
        <p>&copy; ${new Date().getFullYear()} Logista CRM. Все права защищены.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    const textContent = `
Здравствуйте, ${data.fullName}!

${data.invitedByName} пригласил(а) вас в систему Logista CRM.

Данные для входа:
- Email: ${data.to}
- Пароль: ${data.password}
- Должность: ${roleName}

Одноразовый код активации: ${data.invitationCode}

Для входа в систему перейдите по ссылке:
${activationLink}

Важно: Данный код можно использовать только один раз. Срок действия — 24 часа.

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

    const smtpFrom = this.configService.get<string>(
      'SMTP_FROM',
      this.configService.get<string>('SMTP_USER', 'noreply@logista.uz'),
    );

    await this.transporter.sendMail({
      from: `"Logista CRM" <${smtpFrom}>`,
      to: data.to,
      subject: 'Logista CRM - Приглашение в систему',
      text: textContent,
      html: htmlContent,
    });

    this.logger.log(`Invitation email sent to ${data.to}`);
    return true;
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
      <p>Сброс пароля</p>
    </div>
    <div class="content">
      <h2>Здравствуйте, ${fullName}!</h2>
      <p>Получен запрос на сброс пароля.</p>

      <div class="code-box">${resetCode}</div>

      <p style="text-align: center;">
        <a href="${resetLink}" class="button">Сбросить пароль</a>
      </p>

      <p>Код действителен в течение 1 часа.</p>

      <div class="footer">
        <p>Если вы не отправляли этот запрос, просто проигнорируйте данное сообщение.</p>
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
        subject: 'Logista CRM - Сброс пароля',
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
