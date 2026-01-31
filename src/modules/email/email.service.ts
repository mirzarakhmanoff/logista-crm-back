import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EmailAccount } from './schemas/email-account.schema';
import { EmailMessage } from './schemas/email-message.schema';
import { EmailImapService } from './email-imap.service';
import { EmailSmtpService } from './email-smtp.service';
import { EmailOAuthService } from './email-oauth.service';
import { EmailSyncService } from './email-sync.service';
import { SocketGateway } from '../../socket/socket.gateway';
import { CreateEmailAccountDto } from './dto/create-email-account.dto';
import { UpdateEmailAccountDto } from './dto/update-email-account.dto';
import { SendEmailDto } from './dto/send-email.dto';
import { ReplyEmailDto } from './dto/reply-email.dto';
import { FilterEmailDto } from './dto/filter-email.dto';
import { LinkEmailDto } from './dto/link-email.dto';
import {
  EmailProvider,
  EmailAccountStatus,
  EmailDirection,
  EmailStatus,
  EmailSyncResult,
} from './interfaces/email.interfaces';

@Injectable()
export class EmailService {
  private logger = new Logger('EmailService');

  constructor(
    @InjectModel(EmailAccount.name)
    private accountModel: Model<EmailAccount>,
    @InjectModel(EmailMessage.name)
    private messageModel: Model<EmailMessage>,
    private emailImapService: EmailImapService,
    private emailSmtpService: EmailSmtpService,
    private emailOAuthService: EmailOAuthService,
    private emailSyncService: EmailSyncService,
    private socketGateway: SocketGateway,
    private configService: ConfigService,
  ) {}

  getFrontendUrl(): string {
    return this.configService.get<string>('CORS_ORIGIN', 'http://localhost:3001');
  }

  // ==================== ACCOUNT MANAGEMENT ====================

  async createAccount(
    dto: CreateEmailAccountDto,
    userId: string,
  ): Promise<EmailAccount> {
    // Auto-fill IMAP/SMTP configs for well-known providers
    const imapConfig = dto.imapConfig || this.getDefaultImapConfig(dto.provider);
    const smtpConfig = dto.smtpConfig || this.getDefaultSmtpConfig(dto.provider);

    if (!imapConfig || !smtpConfig) {
      throw new BadRequestException(
        'IMAP and SMTP configuration required for custom providers',
      );
    }

    // Test connections
    const imapOk = await this.emailImapService.testConnection(
      this.emailImapService.buildImapConfig(
        dto.provider,
        {
          user: dto.credentials.user,
          password: dto.credentials.password,
        },
        imapConfig,
      ),
    );

    if (!imapOk) {
      throw new BadRequestException(
        'IMAP ulanish muvaffaqiyatsiz. Login va parolni tekshiring.',
      );
    }

    const smtpOk = await this.emailSmtpService.testConnection(
      this.emailSmtpService.buildSmtpConfig(
        dto.provider,
        {
          user: dto.credentials.user,
          password: dto.credentials.password,
        },
        smtpConfig,
      ),
    );

    if (!smtpOk) {
      throw new BadRequestException(
        'SMTP ulanish muvaffaqiyatsiz. Login va parolni tekshiring.',
      );
    }

    const account = new this.accountModel({
      name: dto.name,
      emailAddress: dto.emailAddress,
      provider: dto.provider,
      imapConfig,
      smtpConfig,
      credentials: dto.credentials,
      syncEnabled: dto.syncEnabled ?? true,
      createdBy: userId,
    });

    const saved = await account.save();
    this.logger.log(`Email account created: ${dto.emailAddress}`);

    // Trigger initial sync in background
    this.emailSyncService
      .syncSingleAccount(saved._id.toString())
      .catch((err) =>
        this.logger.warn(
          `Initial sync failed for ${dto.emailAddress}: ${err.message}`,
        ),
      );

    // Return without credentials
    return this.accountModel.findById(saved._id).exec() as Promise<EmailAccount>;
  }

  async findAllAccounts(userId: string): Promise<EmailAccount[]> {
    const userObjectId = new Types.ObjectId(userId);
    return this.accountModel
      .find({
        $or: [
          { createdBy: userObjectId },
          { sharedWith: userObjectId },
        ],
      })
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findAccountById(accountId: string): Promise<EmailAccount> {
    const account = await this.accountModel
      .findById(accountId)
      .populate('createdBy', 'fullName email')
      .exec();

    if (!account) {
      throw new NotFoundException(`Email account ${accountId} topilmadi`);
    }

    return account;
  }

  async updateAccount(
    accountId: string,
    dto: UpdateEmailAccountDto,
  ): Promise<EmailAccount> {
    const account = await this.accountModel
      .findByIdAndUpdate(accountId, dto, { new: true })
      .exec();

    if (!account) {
      throw new NotFoundException(`Email account ${accountId} topilmadi`);
    }

    return account;
  }

  async deleteAccount(accountId: string): Promise<void> {
    const account = await this.accountModel.findById(accountId).exec();
    if (!account) {
      throw new NotFoundException(`Email account ${accountId} topilmadi`);
    }

    // Delete all messages for this account
    await this.messageModel.deleteMany({ accountId: account._id }).exec();

    // Delete the account
    await this.accountModel.findByIdAndDelete(accountId).exec();

    this.logger.log(`Email account deleted: ${account.emailAddress}`);
  }

  async testAccountConnection(
    accountId: string,
  ) {
    const account = await this.accountModel
      .findById(accountId)
      .select('+credentials')
      .exec();

    if (!account) {
      throw new NotFoundException(`Email account ${accountId} topilmadi`);
    }

    // Refresh token if expired
    if (
      account.provider === EmailProvider.GMAIL &&
      account.credentials?.refreshToken &&
      account.credentials.tokenExpiry &&
      this.emailOAuthService.isTokenExpired(account.credentials.tokenExpiry)
    ) {
      this.logger.log('Token expired, refreshing...');
      const newToken = await this.emailOAuthService.refreshAccessToken(
        account.credentials.refreshToken,
      );
      account.credentials.accessToken = newToken.accessToken;
      await this.accountModel.findByIdAndUpdate(account._id, {
        'credentials.accessToken': newToken.accessToken,
        'credentials.tokenExpiry': newToken.expiry,
      });
    }

    const imapConfig = this.emailImapService.buildImapConfig(
      account.provider,
      {
        user: account.credentials.user,
        password: account.credentials.password,
        accessToken: account.credentials.accessToken,
      },
      account.imapConfig,
    );

    const imapResult = await this.emailImapService.testConnection(imapConfig);

    return {
      account: account.emailAddress,
      provider: account.provider,
      authMethod: account.credentials.accessToken ? 'XOAUTH2' : 'PASSWORD',
      tokenExpiry: account.credentials.tokenExpiry,
      imap: imapResult,
    };
  }

  async triggerSync(accountId: string): Promise<EmailSyncResult> {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new BadRequestException('Sync timeout: 60 sekunddan oshdi')), 60000),
    );
    return Promise.race([
      this.emailSyncService.syncSingleAccount(accountId),
      timeout,
    ]);
  }

  // ==================== GMAIL OAUTH2 ====================

  getGmailAuthUrl(userId: string): string {
    return this.emailOAuthService.getAuthUrl(userId);
  }

  async handleGmailCallback(
    code: string,
    userId: string,
  ): Promise<EmailAccount> {
    try {
      this.logger.log(`Gmail OAuth callback: userId=${userId}`);

      const tokens = await this.emailOAuthService.getTokensFromCode(code);
      this.logger.log(`Tokens received: accessToken=${!!tokens.accessToken}, refreshToken=${!!tokens.refreshToken}`);

      const emailAddress = await this.emailOAuthService.getUserEmail(
        tokens.accessToken,
      );
      this.logger.log(`Gmail email resolved: ${emailAddress}`);

      const existing = await this.accountModel.findOne({ emailAddress }).exec();
      if (existing) {
        existing.credentials = {
          user: emailAddress,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenExpiry: tokens.expiry,
        };
        await existing.save();
        this.logger.log(`Gmail account updated via OAuth2: ${emailAddress}`);
        return existing;
      }

      const account = new this.accountModel({
        name: `Gmail - ${emailAddress}`,
        emailAddress,
        provider: EmailProvider.GMAIL,
        imapConfig: { host: 'imap.gmail.com', port: 993, secure: true },
        smtpConfig: { host: 'smtp.gmail.com', port: 465, secure: true },
        credentials: {
          user: emailAddress,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenExpiry: tokens.expiry,
        },
        syncEnabled: true,
        createdBy: new Types.ObjectId(userId),
      });

      const saved = await account.save();
      this.logger.log(`Gmail account connected via OAuth2: ${emailAddress}`);

      // Trigger initial sync
      this.emailSyncService
        .syncSingleAccount(saved._id.toString())
        .catch((err) =>
          this.logger.warn(`Initial sync failed: ${err.message}`),
        );

      return this.accountModel.findById(saved._id).exec() as Promise<EmailAccount>;
    } catch (error) {
      this.logger.error(`Gmail OAuth callback failed: ${error.message}`, error.stack);
      throw new BadRequestException(`Gmail OAuth failed: ${error.message}`);
    }
  }

  // ==================== MESSAGES ====================

  async findAllMessages(
    filterDto: FilterEmailDto,
  ): Promise<{
    data: EmailMessage[];
    total: number;
    page: number;
    limit: number;
  }> {
    const query: any = {};
    const page = filterDto.page || 1;
    const limit = filterDto.limit || 20;
    const skip = (page - 1) * limit;

    if (filterDto.accountId) {
      query.accountId = new Types.ObjectId(filterDto.accountId);
    }

    if (filterDto.direction) {
      query.direction = filterDto.direction;
    }

    if (filterDto.status) {
      query.status = filterDto.status;
    }

    if (filterDto.folder) {
      query.folder = filterDto.folder;
    }

    if (filterDto.search) {
      query.$or = [
        { subject: { $regex: filterDto.search, $options: 'i' } },
        { textBody: { $regex: filterDto.search, $options: 'i' } },
        { 'from.address': { $regex: filterDto.search, $options: 'i' } },
        { 'from.name': { $regex: filterDto.search, $options: 'i' } },
      ];
    }

    if (filterDto.clientId) {
      query['linkedEntities'] = {
        $elemMatch: {
          entityType: 'CLIENT',
          entityId: new Types.ObjectId(filterDto.clientId),
        },
      };
    }

    if (filterDto.requestId) {
      query['linkedEntities'] = {
        $elemMatch: {
          entityType: 'REQUEST',
          entityId: new Types.ObjectId(filterDto.requestId),
        },
      };
    }

    const [data, total] = await Promise.all([
      this.messageModel
        .find(query)
        .populate('accountId', 'name emailAddress provider')
        .populate('sentBy', 'fullName email')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.messageModel.countDocuments(query),
    ]);

    return { data, total, page, limit };
  }

  async findMessageById(messageId: string): Promise<EmailMessage> {
    const message = await this.messageModel
      .findById(messageId)
      .populate('accountId', 'name emailAddress provider')
      .populate('sentBy', 'fullName email')
      .exec();

    if (!message) {
      throw new NotFoundException(`Xat ${messageId} topilmadi`);
    }

    // Mark as read if unread
    if (message.status === EmailStatus.UNREAD) {
      message.status = EmailStatus.READ;
      await message.save();
    }

    return message;
  }

  async getThread(messageId: string): Promise<EmailMessage[]> {
    const message = await this.messageModel.findById(messageId).exec();
    if (!message) {
      throw new NotFoundException(`Xat ${messageId} topilmadi`);
    }

    if (!message.threadId) {
      return [message];
    }

    return this.messageModel
      .find({ threadId: message.threadId })
      .populate('accountId', 'name emailAddress provider')
      .populate('sentBy', 'fullName email')
      .sort({ date: 1 })
      .exec();
  }

  // ==================== SEND & REPLY ====================

  async sendEmail(
    dto: SendEmailDto,
    userId: string,
  ): Promise<EmailMessage> {
    const account = await this.accountModel
      .findById(dto.accountId)
      .select('+credentials')
      .exec();

    if (!account) {
      throw new NotFoundException(
        `Email account ${dto.accountId} topilmadi`,
      );
    }

    const smtpConfig = this.emailSmtpService.buildSmtpConfig(
      account.provider,
      {
        user: account.credentials.user,
        password: account.credentials.password,
        accessToken: account.credentials.accessToken,
      },
      account.smtpConfig,
    );

    const result = await this.emailSmtpService.sendMail(smtpConfig, {
      from: account.emailAddress,
      to: dto.to,
      cc: dto.cc,
      bcc: dto.bcc,
      subject: dto.subject,
      text: dto.textBody,
      html: dto.htmlBody,
    });

    // Save sent message to DB
    const message = new this.messageModel({
      accountId: account._id,
      messageId: result.messageId,
      direction: EmailDirection.OUTBOUND,
      status: EmailStatus.READ,
      from: { address: account.emailAddress },
      to: dto.to.map((addr) => ({ address: addr })),
      cc: dto.cc?.map((addr) => ({ address: addr })) || [],
      bcc: dto.bcc?.map((addr) => ({ address: addr })) || [],
      subject: dto.subject,
      textBody: dto.textBody,
      htmlBody: dto.htmlBody,
      date: new Date(),
      threadId: result.messageId,
      folder: 'SENT',
      sentBy: userId,
    });

    const savedMessage = await message.save();

    this.socketGateway.emitToAll('emailSent', {
      messageId: savedMessage._id,
      to: dto.to,
      subject: dto.subject,
    });

    return savedMessage;
  }

  async sendEmailWithAttachments(
    dto: SendEmailDto,
    files: Express.Multer.File[],
    userId: string,
  ): Promise<EmailMessage> {
    const account = await this.accountModel
      .findById(dto.accountId)
      .select('+credentials')
      .exec();

    if (!account) {
      throw new NotFoundException(
        `Email account ${dto.accountId} topilmadi`,
      );
    }

    const smtpConfig = this.emailSmtpService.buildSmtpConfig(
      account.provider,
      {
        user: account.credentials.user,
        password: account.credentials.password,
        accessToken: account.credentials.accessToken,
      },
      account.smtpConfig,
    );

    const attachments = files.map((f) => ({
      filename: f.originalname,
      path: f.path,
    }));

    const result = await this.emailSmtpService.sendMail(smtpConfig, {
      from: account.emailAddress,
      to: dto.to,
      cc: dto.cc,
      bcc: dto.bcc,
      subject: dto.subject,
      text: dto.textBody,
      html: dto.htmlBody,
      attachments,
    });

    const savedAttachments = files.map((f) => ({
      filename: f.originalname,
      path: f.path.replace(/\\/g, '/'),
      mimetype: f.mimetype,
      size: f.size,
    }));

    const message = new this.messageModel({
      accountId: account._id,
      messageId: result.messageId,
      direction: EmailDirection.OUTBOUND,
      status: EmailStatus.READ,
      from: { address: account.emailAddress },
      to: dto.to.map((addr) => ({ address: addr })),
      cc: dto.cc?.map((addr) => ({ address: addr })) || [],
      subject: dto.subject,
      textBody: dto.textBody,
      htmlBody: dto.htmlBody,
      date: new Date(),
      threadId: result.messageId,
      folder: 'SENT',
      attachments: savedAttachments,
      sentBy: userId,
    });

    const savedMessage = await message.save();

    this.socketGateway.emitToAll('emailSent', {
      messageId: savedMessage._id,
      to: dto.to,
      subject: dto.subject,
    });

    return savedMessage;
  }

  async replyToEmail(
    dto: ReplyEmailDto,
    userId: string,
  ): Promise<EmailMessage> {
    const original = await this.messageModel
      .findById(dto.originalMessageId)
      .exec();

    if (!original) {
      throw new NotFoundException(
        `Asl xat ${dto.originalMessageId} topilmadi`,
      );
    }

    const account = await this.accountModel
      .findById(original.accountId)
      .select('+credentials')
      .exec();

    if (!account) {
      throw new NotFoundException('Email account topilmadi');
    }

    // Determine recipients
    const replyTo = original.from.address;
    let toAddresses = [replyTo];
    let ccAddresses = dto.cc || [];

    if (dto.replyAll) {
      // Include all original recipients except self
      const originalTo = original.to
        .map((t) => t.address)
        .filter((a) => a !== account.emailAddress);
      const originalCc = original.cc
        .map((c) => c.address)
        .filter((a) => a !== account.emailAddress);

      toAddresses = [replyTo, ...originalTo];
      ccAddresses = [...ccAddresses, ...originalCc];
    }

    // Deduplicate
    toAddresses = [...new Set(toAddresses)];
    ccAddresses = [...new Set(ccAddresses.filter((a) => !toAddresses.includes(a)))];

    const subject = original.subject.startsWith('Re:')
      ? original.subject
      : `Re: ${original.subject}`;

    const references = [
      ...original.references,
      original.messageId,
    ];

    const smtpConfig = this.emailSmtpService.buildSmtpConfig(
      account.provider,
      {
        user: account.credentials.user,
        password: account.credentials.password,
        accessToken: account.credentials.accessToken,
      },
      account.smtpConfig,
    );

    const result = await this.emailSmtpService.sendMail(smtpConfig, {
      from: account.emailAddress,
      to: toAddresses,
      cc: ccAddresses.length > 0 ? ccAddresses : undefined,
      subject,
      text: dto.textBody,
      html: dto.htmlBody,
      inReplyTo: original.messageId,
      references,
    });

    const message = new this.messageModel({
      accountId: account._id,
      messageId: result.messageId,
      direction: EmailDirection.OUTBOUND,
      status: EmailStatus.READ,
      from: { address: account.emailAddress },
      to: toAddresses.map((addr) => ({ address: addr })),
      cc: ccAddresses.map((addr) => ({ address: addr })),
      subject,
      textBody: dto.textBody,
      htmlBody: dto.htmlBody,
      date: new Date(),
      inReplyTo: original.messageId,
      references,
      threadId: original.threadId || original.messageId,
      folder: 'SENT',
      linkedEntities: original.linkedEntities || [],
      sentBy: userId,
    });

    const savedMessage = await message.save();

    // Update original message status
    await this.messageModel.findByIdAndUpdate(original._id, {
      status: EmailStatus.REPLIED,
    });

    this.socketGateway.emitToAll('emailSent', {
      messageId: savedMessage._id,
      to: toAddresses,
      subject,
    });

    return savedMessage;
  }

  // ==================== CRM LINKING ====================

  async linkEmailToEntity(
    messageId: string,
    dto: LinkEmailDto,
  ): Promise<EmailMessage> {
    const message = await this.messageModel.findById(messageId).exec();
    if (!message) {
      throw new NotFoundException(`Xat ${messageId} topilmadi`);
    }

    // Check for duplicates
    const alreadyLinked = message.linkedEntities.some(
      (e) =>
        e.entityType === dto.entityType &&
        e.entityId.toString() === dto.entityId,
    );

    if (alreadyLinked) {
      return message;
    }

    const updated = await this.messageModel
      .findByIdAndUpdate(
        messageId,
        {
          $push: {
            linkedEntities: {
              entityType: dto.entityType,
              entityId: new Types.ObjectId(dto.entityId),
            },
          },
        },
        { new: true },
      )
      .populate('accountId', 'name emailAddress provider')
      .exec();

    this.socketGateway.emitToAll('emailLinked', {
      messageId,
      entityType: dto.entityType,
      entityId: dto.entityId,
    });

    return updated as EmailMessage;
  }

  async unlinkEmailFromEntity(
    messageId: string,
    entityType: string,
    entityId: string,
  ): Promise<EmailMessage> {
    const updated = await this.messageModel
      .findByIdAndUpdate(
        messageId,
        {
          $pull: {
            linkedEntities: {
              entityType,
              entityId: new Types.ObjectId(entityId),
            },
          },
        },
        { new: true },
      )
      .populate('accountId', 'name emailAddress provider')
      .exec();

    if (!updated) {
      throw new NotFoundException(`Xat ${messageId} topilmadi`);
    }

    return updated;
  }

  async getEmailsByClient(
    clientId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: EmailMessage[];
    total: number;
    page: number;
    limit: number;
  }> {
    const query = {
      linkedEntities: {
        $elemMatch: {
          entityType: 'CLIENT',
          entityId: new Types.ObjectId(clientId),
        },
      },
    };

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.messageModel
        .find(query)
        .populate('accountId', 'name emailAddress provider')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.messageModel.countDocuments(query),
    ]);

    return { data, total, page, limit };
  }

  async getEmailsByRequest(
    requestId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: EmailMessage[];
    total: number;
    page: number;
    limit: number;
  }> {
    const query = {
      linkedEntities: {
        $elemMatch: {
          entityType: 'REQUEST',
          entityId: new Types.ObjectId(requestId),
        },
      },
    };

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.messageModel
        .find(query)
        .populate('accountId', 'name emailAddress provider')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.messageModel.countDocuments(query),
    ]);

    return { data, total, page, limit };
  }

  // ==================== STATUS OPERATIONS ====================

  async markAsRead(messageId: string): Promise<EmailMessage> {
    const message = await this.messageModel
      .findByIdAndUpdate(
        messageId,
        { status: EmailStatus.READ },
        { new: true },
      )
      .exec();

    if (!message) {
      throw new NotFoundException(`Xat ${messageId} topilmadi`);
    }

    return message;
  }

  async markAsUnread(messageId: string): Promise<EmailMessage> {
    const message = await this.messageModel
      .findByIdAndUpdate(
        messageId,
        { status: EmailStatus.UNREAD },
        { new: true },
      )
      .exec();

    if (!message) {
      throw new NotFoundException(`Xat ${messageId} topilmadi`);
    }

    return message;
  }

  async archiveEmail(messageId: string): Promise<EmailMessage> {
    const message = await this.messageModel
      .findByIdAndUpdate(
        messageId,
        { status: EmailStatus.ARCHIVED },
        { new: true },
      )
      .exec();

    if (!message) {
      throw new NotFoundException(`Xat ${messageId} topilmadi`);
    }

    return message;
  }

  async deleteEmail(messageId: string): Promise<void> {
    const message = await this.messageModel.findById(messageId).exec();
    if (!message) {
      throw new NotFoundException(`Xat ${messageId} topilmadi`);
    }

    await this.messageModel.findByIdAndDelete(messageId).exec();
  }

  // ==================== STATS ====================

  async getEmailStats(userId: string): Promise<{
    totalAccounts: number;
    totalMessages: number;
    unreadCount: number;
    sentToday: number;
    receivedToday: number;
  }> {
    const accounts = await this.accountModel
      .find({
        $or: [{ createdBy: userId }, { sharedWith: userId }],
      })
      .exec();

    const accountIds = accounts.map((a) => a._id);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [totalMessages, unreadCount, sentToday, receivedToday] =
      await Promise.all([
        this.messageModel.countDocuments({
          accountId: { $in: accountIds },
        }),
        this.messageModel.countDocuments({
          accountId: { $in: accountIds },
          status: EmailStatus.UNREAD,
        }),
        this.messageModel.countDocuments({
          accountId: { $in: accountIds },
          direction: EmailDirection.OUTBOUND,
          date: { $gte: todayStart },
        }),
        this.messageModel.countDocuments({
          accountId: { $in: accountIds },
          direction: EmailDirection.INBOUND,
          date: { $gte: todayStart },
        }),
      ]);

    return {
      totalAccounts: accounts.length,
      totalMessages,
      unreadCount,
      sentToday,
      receivedToday,
    };
  }

  // ==================== HELPERS ====================

  private getDefaultImapConfig(
    provider: EmailProvider,
  ): { host: string; port: number; secure: boolean } | undefined {
    const configs: Partial<
      Record<EmailProvider, { host: string; port: number; secure: boolean }>
    > = {
      [EmailProvider.GMAIL]: {
        host: 'imap.gmail.com',
        port: 993,
        secure: true,
      },
      [EmailProvider.MAILRU]: {
        host: 'imap.mail.ru',
        port: 993,
        secure: true,
      },
    };
    return configs[provider];
  }

  private getDefaultSmtpConfig(
    provider: EmailProvider,
  ): { host: string; port: number; secure: boolean } | undefined {
    const configs: Partial<
      Record<EmailProvider, { host: string; port: number; secure: boolean }>
    > = {
      [EmailProvider.GMAIL]: {
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
      },
      [EmailProvider.MAILRU]: {
        host: 'smtp.mail.ru',
        port: 465,
        secure: true,
      },
    };
    return configs[provider];
  }
}
