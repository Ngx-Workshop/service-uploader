import {
  ConflictException,
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { RemoteAuthGuard } from '@tmdjr/ngx-auth-client';
import * as request from 'supertest';
import { Server } from 'node:http';
import { FoldersController } from './folders.controller';
import { FoldersService } from './folders.service';
import { UploaderController } from './uploader.controller';
import { UploaderService } from './uploader.service';

describe('folder HTTP contract', () => {
  let app: INestApplication;
  let server: Server;
  const id = '507f1f77bcf86cd799439011';
  const folders = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const uploader = {
    update: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    receiveUpload: jest.fn(),
    create: jest.fn(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [FoldersController, UploaderController],
      providers: [
        { provide: FoldersService, useValue: folders },
        { provide: UploaderService, useValue: uploader },
      ],
    })
      .overrideGuard(RemoteAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context
            .switchToHttp()
            .getRequest<{ headers: Record<string, unknown> }>();
          if (req.headers.authorization !== 'Bearer test') {
            throw new UnauthorizedException();
          }
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    app.useGlobalGuards({
      canActivate: (context: ExecutionContext) => {
        const req = context
          .switchToHttp()
          .getRequest<{ headers: Record<string, unknown> }>();
        if (!req.headers.authorization) {
          throw new UnauthorizedException();
        }
        return true;
      },
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      })
    );
    await app.init();
    server = app.getHttpServer() as Server;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    folders.create.mockResolvedValue({ _id: id, name: 'Workshop', version: 1 });
    folders.findAll.mockResolvedValue([{ _id: id, name: 'Workshop' }]);
    folders.findOne.mockResolvedValue({ _id: id, name: 'Workshop' });
    folders.update.mockResolvedValue({ _id: id, name: 'Renamed' });
    folders.remove.mockReset().mockResolvedValue(undefined);
    uploader.update.mockImplementation((_id: string, dto: unknown) =>
      Promise.resolve(dto)
    );
    uploader.findAll.mockResolvedValue([]);
    uploader.receiveUpload
      .mockReset()
      .mockRejectedValue(
        new ConflictException('An asset with identical content already exists')
      );
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([
    ['get', '/uploader/folders'],
    ['post', '/uploader/folders'],
    ['get', `/uploader/folders/${id}`],
    ['patch', `/uploader/folders/${id}`],
    ['delete', `/uploader/folders/${id}`],
    ['patch', `/uploader/${id}`],
  ] as const)('requires authentication for %s %s', async (method, path) => {
    await request(server)[method](path).expect(401);
  });

  it('routes folder listing before the asset-ID route', async () => {
    await request(server)
      .get('/uploader/folders')
      .set('Authorization', 'Bearer test')
      .expect(200);
    expect(folders.findAll).toHaveBeenCalledTimes(1);
    expect(uploader.findOne).not.toHaveBeenCalled();
  });

  it('supports folder CRUD and trimmed create inputs', async () => {
    await request(server)
      .post('/uploader/folders')
      .set('Authorization', 'Bearer test')
      .send({ name: '  Workshop  ' })
      .expect(201);
    expect(folders.create).toHaveBeenCalledWith({ name: 'Workshop' });
    await request(server)
      .get(`/uploader/folders/${id}`)
      .set('Authorization', 'Bearer test')
      .expect(200);
    await request(server)
      .patch(`/uploader/folders/${id}`)
      .set('Authorization', 'Bearer test')
      .send({ name: 'Renamed' })
      .expect(200);
    await request(server)
      .delete(`/uploader/folders/${id}`)
      .set('Authorization', 'Bearer test')
      .expect(204);
  });

  it('returns 409 for nonempty folder deletion', async () => {
    folders.remove.mockRejectedValueOnce(
      new ConflictException('Move assets out before deleting this folder')
    );
    await request(server)
      .delete(`/uploader/folders/${id}`)
      .set('Authorization', 'Bearer test')
      .expect(409);
  });

  it('validates folder names, IDs, and unknown fields', async () => {
    await request(server)
      .post('/uploader/folders')
      .set('Authorization', 'Bearer test')
      .send({ name: '   ' })
      .expect(400);
    await request(server)
      .patch('/uploader/folders/invalid')
      .set('Authorization', 'Bearer test')
      .send({ name: 'Renamed' })
      .expect(400);
    await request(server)
      .post('/uploader/folders')
      .set('Authorization', 'Bearer test')
      .send({ name: 'Workshop', parentId: id })
      .expect(400);
  });

  it('supports moves and explicit null for root without accepting storage changes', async () => {
    await request(server)
      .patch(`/uploader/${id}`)
      .set('Authorization', 'Bearer test')
      .send({ folderId: id })
      .expect(200, { folderId: id });
    await request(server)
      .patch(`/uploader/${id}`)
      .set('Authorization', 'Bearer test')
      .send({ folderId: null })
      .expect(200, { folderId: null });
    await request(server)
      .patch(`/uploader/${id}`)
      .set('Authorization', 'Bearer test')
      .send({ folderId: 'invalid' })
      .expect(400);
    await request(server)
      .patch(`/uploader/${id}`)
      .set('Authorization', 'Bearer test')
      .send({ storageKey: 'arbitrary' })
      .expect(400);
  });

  it('parses list filters strictly', async () => {
    await request(server)
      .get(`/uploader?folderId=${id}&archived=false`)
      .set('Authorization', 'Bearer test')
      .expect(200);
    expect(uploader.findAll).toHaveBeenLastCalledWith(false, id, undefined);
    await request(server)
      .get('/uploader?root=true')
      .set('Authorization', 'Bearer test')
      .expect(200);
    expect(uploader.findAll).toHaveBeenLastCalledWith(
      undefined,
      undefined,
      true
    );
    await request(server)
      .get('/uploader?folderId=invalid')
      .set('Authorization', 'Bearer test')
      .expect(400);
    await request(server)
      .get('/uploader?root=maybe')
      .set('Authorization', 'Bearer test')
      .expect(400);
  });

  it('validates multipart folder metadata and exposes duplicate upload 409', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    await request(server)
      .post('/uploader/upload')
      .set('Authorization', 'Bearer test')
      .field('folderId', id)
      .attach('file', svg, {
        filename: 'test.svg',
        contentType: 'image/svg+xml',
      })
      .expect(409);
    expect(uploader.receiveUpload).toHaveBeenCalledWith(
      expect.objectContaining({ buffer: svg }),
      { folderId: id }
    );
    uploader.receiveUpload.mockClear();
    await request(server)
      .post('/uploader/upload')
      .set('Authorization', 'Bearer test')
      .field('folderId', 'invalid')
      .attach('file', svg, {
        filename: 'test.svg',
        contentType: 'image/svg+xml',
      })
      .expect(400);
    expect(uploader.receiveUpload).not.toHaveBeenCalled();
  });
});
