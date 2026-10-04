import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseBoolPipe,
  ParseFilePipeBuilder,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiServiceUnavailableResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RemoteAuthGuard } from '@tmdjr/ngx-auth-client';
import {
  AssetDto,
  CreateAssetDto,
  UpdateAssetDto,
  UploadAssetDto,
} from './dto/asset.dto';
import { ParseObjectIdPipe } from './pipes/parse-object-id.pipe';
import { ReceivedAssetFile, UploaderService } from './uploader.service';

export const MAX_ASSET_FILE_SIZE_BYTES = 25 * 1024 * 1024;

@ApiTags('uploader')
@ApiBearerAuth()
@ApiCookieAuth('accessToken')
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@UseGuards(RemoteAuthGuard)
@Controller('uploader')
export class UploaderController {
  constructor(private readonly uploaderService: UploaderService) {}

  @Post()
  @ApiCreatedResponse({ type: AssetDto })
  @ApiBadRequestResponse({ description: 'Invalid asset metadata' })
  create(@Body() createAssetDto: CreateAssetDto) {
    return this.uploaderService.create(createAssetDto);
  }

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_ASSET_FILE_SIZE_BYTES, files: 1 },
    })
  )
  @ApiOperation({
    summary: 'Persist a file in Spaces and record its asset metadata',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        name: { type: 'string', maxLength: 120 },
        description: { type: 'string', maxLength: 2000 },
      },
    },
  })
  @ApiCreatedResponse({
    type: AssetDto,
    description: 'File persisted in Spaces and asset metadata saved as READY',
  })
  @ApiBadRequestResponse({
    description: 'File is missing, empty, too large, or metadata is invalid',
  })
  @ApiServiceUnavailableResponse({
    description: 'Spaces upload failed; caller must upload the file again',
  })
  upload(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: MAX_ASSET_FILE_SIZE_BYTES })
        .build({ fileIsRequired: true })
    )
    file: ReceivedAssetFile,
    @Body() uploadAssetDto: UploadAssetDto
  ) {
    return this.uploaderService.receiveUpload(file, uploadAssetDto);
  }

  @Get()
  @ApiQuery({ name: 'archived', required: false, type: Boolean })
  @ApiOkResponse({ type: AssetDto, isArray: true })
  findAll(
    @Query('archived', new ParseBoolPipe({ optional: true }))
    archived?: boolean
  ) {
    return this.uploaderService.findAll(archived);
  }

  @Get(':id')
  @ApiOkResponse({ type: AssetDto })
  @ApiBadRequestResponse({ description: 'Malformed asset ID' })
  @ApiNotFoundResponse({ description: 'Asset not found' })
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.uploaderService.findOne(id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: AssetDto })
  @ApiBadRequestResponse({ description: 'Malformed ID or invalid metadata' })
  @ApiNotFoundResponse({ description: 'Asset not found' })
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() updateAssetDto: UpdateAssetDto
  ) {
    return this.uploaderService.update(id, updateAssetDto);
  }

  @Patch(':id/archive')
  @ApiOkResponse({ type: AssetDto })
  @ApiBadRequestResponse({ description: 'Malformed asset ID' })
  @ApiNotFoundResponse({ description: 'Asset not found' })
  archive(@Param('id', ParseObjectIdPipe) id: string) {
    return this.uploaderService.archive(id);
  }

  @Patch(':id/unarchive')
  @ApiOkResponse({ type: AssetDto })
  @ApiBadRequestResponse({ description: 'Malformed asset ID' })
  @ApiNotFoundResponse({ description: 'Asset not found' })
  unarchive(@Param('id', ParseObjectIdPipe) id: string) {
    return this.uploaderService.unarchive(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  @ApiBadRequestResponse({ description: 'Malformed asset ID' })
  @ApiNotFoundResponse({ description: 'Asset not found' })
  remove(@Param('id', ParseObjectIdPipe) id: string) {
    return this.uploaderService.remove(id);
  }
}
