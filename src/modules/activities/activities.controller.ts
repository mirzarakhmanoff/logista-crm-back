import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ActivitiesService } from './activities.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';

@ApiTags('Activities')
@ApiBearerAuth()
@Controller('documents/:documentId/activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Post('comments')
  @ApiOperation({ summary: 'Add a comment to document' })
  @ApiResponse({
    status: 201,
    description: 'Comment created successfully',
  })
  async createComment(
    @Param('documentId') documentId: string,
    @Body() createCommentDto: CreateCommentDto,
    @CurrentUser() user: any,
  ) {
    return this.activitiesService.createComment(
      documentId,
      user.userId,
      createCommentDto,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Get recent activities for a document (last 10)',
    description: 'Returns the last 10 activities for the timeline',
  })
  @ApiResponse({
    status: 200,
    description: 'List of recent activities (max 10)',
  })
  async findRecent(@Param('documentId') documentId: string) {
    return this.activitiesService.findAllByDocument(documentId, 10);
  }

  @Get('all')
  @ApiOperation({
    summary: 'Get ALL activities for a document (unlimited)',
    description: 'Returns all activities without limit',
  })
  @ApiResponse({
    status: 200,
    description: 'Complete list of all activities',
  })
  async findAll(@Param('documentId') documentId: string) {
    return this.activitiesService.findAllByDocumentUnlimited(documentId);
  }

  @Get('comments')
  @ApiOperation({ summary: 'Get only comments for a document' })
  @ApiResponse({
    status: 200,
    description: 'List of comments',
  })
  async findComments(@Param('documentId') documentId: string) {
    return this.activitiesService.findCommentsByDocument(documentId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a comment (only own comments)' })
  @ApiResponse({
    status: 204,
    description: 'Comment deleted successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'You can only delete your own comments',
  })
  @ApiResponse({
    status: 404,
    description: 'Comment not found',
  })
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    await this.activitiesService.remove(id, user.userId);
  }
}
