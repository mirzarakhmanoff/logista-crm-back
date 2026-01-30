import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';

@Injectable()
export class EmailOAuthService {
  private logger = new Logger('EmailOAuthService');
  private oauth2Client;

  constructor(private configService: ConfigService) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID', '');
    const clientSecret = this.configService.get<string>(
      'GOOGLE_CLIENT_SECRET',
      '',
    );
    const redirectUri = this.configService.get<string>(
      'GOOGLE_REDIRECT_URI',
      'http://localhost:3000/api/email/oauth/google/callback',
    );

    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri,
    );
  }

  getAuthUrl(state?: string): string {
    const url = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['https://mail.google.com/'],
      state: state || '',
    });
    this.logger.log('Generated Google OAuth2 auth URL');
    return url;
  }

  async getTokensFromCode(
    code: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiry: Date;
  }> {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.logger.log('Exchanged authorization code for tokens');

    return {
      accessToken: tokens.access_token || '',
      refreshToken: tokens.refresh_token || '',
      expiry: new Date(tokens.expiry_date || Date.now() + 3600 * 1000),
    };
  }

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; expiry: Date }> {
    this.oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await this.oauth2Client.refreshAccessToken();
    this.logger.log('Refreshed Google OAuth2 access token');

    return {
      accessToken: credentials.access_token || '',
      expiry: new Date(
        credentials.expiry_date || Date.now() + 3600 * 1000,
      ),
    };
  }

  isTokenExpired(expiry: Date): boolean {
    return new Date() >= new Date(expiry);
  }

  async getUserEmail(accessToken: string): Promise<string> {
    this.oauth2Client.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    return profile.data.emailAddress || '';
  }
}
