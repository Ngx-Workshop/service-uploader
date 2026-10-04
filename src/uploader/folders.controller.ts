import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RemoteAuthGuard } from '@tmdjr/ngx-auth-client';
import { CreateFolderDto, FolderDto, UpdateFolderDto } from './dto/folder.dto';
import { FoldersService } from './folders.service';
import { ParseObjectIdPipe } from './pipes/parse-object-id.pipe';

@ApiTags('folders')
@ApiBearerAuth()
@ApiCookieAuth('accessToken')
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@ApiBadRequestResponse({
  description: 'Malformed ID or invalid folder metadata',
})
@UseGuards(RemoteAuthGuard)
@Controller('uploader/folders')
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @Post()
  @ApiCreatedResponse({ type: FolderDto })
  @ApiConflictResponse({ description: 'Folder name already exists' })
  create(@Body() dto: CreateFolderDto) {
    return this.foldersService.create(dto);
  }

  @Get()
  @ApiOkResponse({ type: FolderDto, isArray: true })
  findAll() {
    return this.foldersService.findAll();
  }

  @Get(':id')
  @ApiOkResponse({ type: FolderDto })
  @ApiNotFoundResponse({ description: 'Folder not found' })
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.foldersService.findOne(id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: FolderDto })
  @ApiNotFoundResponse({ description: 'Folder not found' })
  @ApiConflictResponse({ description: 'Folder name already exists' })
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateFolderDto
  ) {
    return this.foldersService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Folder not found' })
  @ApiConflictResponse({
    description: 'Folder contains assets (including archived)',
  })
  remove(@Param('id', ParseObjectIdPipe) id: string) {
    return this.foldersService.remove(id);
  }
}
