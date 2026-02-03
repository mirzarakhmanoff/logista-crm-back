import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { ArchiveService } from './archive.service';
import {
  ArchiveQueryDto,
  ArchiveCategory,
  RestoreItemDto,
  BulkArchiveDto,
} from './dto/archive-query.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';

@ApiTags('Archive')
@ApiBearerAuth()
@Controller('archive')
export class ArchiveController {
  constructor(private readonly archiveService: ArchiveService) {}

  @Get()
  @ApiOperation({ summary: 'Get all archived items with filters' })
  async getArchivedItems(@Query() query: ArchiveQueryDto) {
    return this.archiveService.getArchivedItems(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get archive statistics by category' })
  async getArchiveStats() {
    return this.archiveService.getArchiveStats();
  }

  @Get(':category/:id')
  @ApiOperation({ summary: 'Get specific archived item by category and ID' })
  @ApiParam({ name: 'category', enum: ArchiveCategory })
  @ApiParam({ name: 'id', description: 'Item ID' })
  async getArchivedItem(
    @Param('category') category: ArchiveCategory,
    @Param('id') id: string,
  ) {
    return this.archiveService.getArchivedItemById(category, id);
  }

  @Post(':category/:id')
  @ApiOperation({ summary: 'Archive an item' })
  @ApiParam({ name: 'category', enum: ArchiveCategory })
  @ApiParam({ name: 'id', description: 'Item ID to archive' })
  async archiveItem(
    @Param('category') category: ArchiveCategory,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.archiveService.archiveItem(category, id, user._id.toString());
  }

  @Post(':category/:id/restore')
  @ApiOperation({ summary: 'Restore an archived item' })
  @ApiParam({ name: 'category', enum: ArchiveCategory })
  @ApiParam({ name: 'id', description: 'Item ID to restore' })
  async restoreItem(
    @Param('category') category: ArchiveCategory,
    @Param('id') id: string,
  ) {
    return this.archiveService.restoreItem(category, id);
  }

  @Post('bulk/archive')
  @ApiOperation({ summary: 'Archive multiple items at once' })
  @ApiBody({ type: BulkArchiveDto })
  async bulkArchive(
    @Body() dto: BulkArchiveDto,
    @CurrentUser() user: any,
  ) {
    return this.archiveService.bulkArchive(dto.category, dto.ids, user._id.toString());
  }

  @Post('bulk/restore')
  @ApiOperation({ summary: 'Restore multiple items at once' })
  @ApiBody({ type: BulkArchiveDto })
  async bulkRestore(@Body() dto: BulkArchiveDto) {
    return this.archiveService.bulkRestore(dto.category, dto.ids);
  }

  @Delete(':category/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Permanently delete an archived item (Admin/Manager only)' })
  @ApiParam({ name: 'category', enum: ArchiveCategory })
  @ApiParam({ name: 'id', description: 'Item ID to permanently delete' })
  async permanentDelete(
    @Param('category') category: ArchiveCategory,
    @Param('id') id: string,
  ) {
    return this.archiveService.permanentDelete(category, id);
  }
}
