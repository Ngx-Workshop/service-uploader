import { Reflector } from '@nestjs/core';
import {
  AuthenticationGuard,
  RemoteAuthGuard,
  RolesGuard,
} from '@tmdjr/ngx-auth-client';
import type { Server } from 'node:http';
import {
  Controller,
  Get,
  INestApplication,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Match callable Supertest in CommonJS service builds.
import request = require('supertest');
import { ObservabilityModule } from './observability.module';
import {
  createServiceLogger,
  currentOperationContext,
  httpLoggingMiddleware,
  observeOperation,
} from './observability';

const domain = {
  log: jest.fn<void, [unknown]>(),
  warn: jest.fn<void, [unknown]>(),
};

@Controller('items')
class TestController {
  @Get('operation/:id')
  operation() {
    return observeOperation(domain, 'asset_upload', () =>
      observeOperation(domain, 'spaces_put', async () => {
        const before = currentOperationContext();
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { before, after: currentOperationContext() };
      })
    );
  }

  @Get('failure')
  failure() {
    return observeOperation(domain, 'asset_upload', () =>
      Promise.reject(new ServiceUnavailableException('private-upstream-token'))
    );
  }

  @Get(':id')
  get() {
    return { ok: true };
  }
}

describe('Service observability', () => {
  let app: INestApplication<Server>;
  const log = jest.fn<void, [unknown]>();
  const warn = jest.fn<void, [unknown]>();
  const error = jest.fn<void, [unknown]>();

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ObservabilityModule],
      controllers: [TestController],
    }).compile();
    app = module.createNestApplication({ logger: false });
    app.use(httpLoggingMiddleware({ log, warn, error }));
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('serves an anonymous, non-cached heartbeat without database or auth providers', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body).toEqual({
      status: 'ok',
      info: { heartbeat: { status: 'up' } },
      error: {},
      details: { heartbeat: { status: 'up' } },
    });
    expect(log).not.toHaveBeenCalled();
    await request(app.getHttpServer()).head('/health').expect(200);
    expect(log).not.toHaveBeenCalled();
    expect(domain.log).not.toHaveBeenCalled();
    expect(domain.warn).not.toHaveBeenCalled();
  });

  it('logs route templates and timings without request data or concrete identifiers', async () => {
    const response = await request(app.getHttpServer())
      .get('/items/private-person?token=private-query')
      .set('Authorization', 'Bearer private-auth')
      .set('Cookie', 'session=private-cookie')
      .expect(200);
    expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'http_request',
        method: 'GET',
        route: '/items/:id',
        statusCode: 200,
        durationMs: expect.any(Number) as unknown,
        requestId: response.headers['x-request-id'],
      })
    );
    expect(JSON.stringify(log.mock.calls)).not.toContain('private-');
  });

  it('logs unknown routes without their raw paths or query values', async () => {
    await request(app.getHttpServer())
      .get('/private-missing?secret=private-query')
      .expect(404);
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({ route: '/unmatched', statusCode: 404 })
    );
    expect(JSON.stringify(warn.mock.calls)).not.toContain('private-');
  });

  it('does not provide a write endpoint for heartbeat', async () => {
    await request(app.getHttpServer())
      .post('/health')
      .send({ secret: 'private-body' })
      .expect(404);
    expect(warn).toHaveBeenCalled();
    expect(JSON.stringify(warn.mock.calls)).not.toContain('private-body');
  });

  it('isolates concurrent async domain operations and correlates nested storage events', async () => {
    const ids = [
      '14f7cf25-e527-4a2c-8a5d-488c8733b49c',
      'd151ad20-2eb6-4d01-9c9f-2780c27c9f7d',
    ];
    const responses = await Promise.all(
      ids.map((id) =>
        request(app.getHttpServer())
          .get('/items/operation/private-file?token=private-query')
          .set('X-Request-ID', id)
          .set('Cookie', 'session=private-cookie')
          .expect(200)
      )
    );
    const operationIds = new Set<string>();
    responses.forEach((response, index) => {
      const body = response.body as {
        before: { requestId: string; operationId: string };
        after: { requestId: string; operationId: string };
      };
      expect(body.before).toEqual(body.after);
      expect(body.before.requestId).toBe(ids[index]);
      expect(response.headers['x-request-id']).toBe(ids[index]);
      operationIds.add(body.before.operationId);
      for (const event of ['asset_upload', 'spaces_put']) {
        expect(domain.log).toHaveBeenCalledWith(
          expect.objectContaining({
            event,
            requestId: ids[index],
            operationId: body.before.operationId,
            outcome: 'success',
          })
        );
      }
    });
    expect(operationIds.size).toBe(2);
    expect(
      JSON.stringify([...domain.log.mock.calls, ...log.mock.calls])
    ).not.toContain('private-');
    expect(currentOperationContext()).toEqual({});
  });

  it.each(['private-token', 'a'.repeat(200), 'not-a-uuid'])(
    'replaces invalid incoming request IDs without logging them',
    async (incoming) => {
      const response = await request(app.getHttpServer())
        .get('/items/operation/private-file')
        .set('X-Request-ID', incoming)
        .expect(200);
      expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
      expect(response.headers['x-request-id']).not.toBe(incoming);
      expect(JSON.stringify(domain.log.mock.calls)).not.toContain(incoming);
    }
  );

  it('preserves failure HTTP levels and logs only a bounded domain reason', async () => {
    const response = await request(app.getHttpServer())
      .get('/items/failure')
      .expect(503);
    expect(domain.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'asset_upload',
        outcome: 'failure',
        reason: 'unavailable',
        requestId: response.headers['x-request-id'],
      })
    );
    expect(domain.log).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'http_request', statusCode: 503 })
    );
    expect(
      JSON.stringify([...domain.warn.mock.calls, ...error.mock.calls])
    ).not.toContain('private-');
  });

  it('emits parseable success/failure JSON outside HTTP without retaining caller context', async () => {
    const write = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    const canary = new Error('private-provider-credential');
    try {
      const logger = createServiceLogger();
      await expect(
        observeOperation(logger, 'spaces_put', () =>
          Promise.resolve('private-file-content')
        )
      ).resolves.toBe('private-file-content');
      await expect(
        observeOperation(logger, 'spaces_put', () => Promise.reject(canary))
      ).rejects.toBe(canary);
      const entries: unknown[] = write.mock.calls.map(
        ([line]) => JSON.parse(String(line)) as unknown
      );
      expect(entries).toEqual([
        expect.objectContaining({
          level: 'log',
          message: expect.objectContaining({
            event: 'spaces_put',
            outcome: 'success',
            operationId: expect.any(String) as unknown,
            durationMs: expect.any(Number) as unknown,
          }) as unknown,
        }) as unknown,
        expect.objectContaining({
          level: 'warn',
          message: expect.objectContaining({
            event: 'spaces_put',
            outcome: 'failure',
            reason: 'unexpected_error',
          }) as unknown,
        }),
      ]);
      expect(JSON.stringify(entries)).not.toContain('private-');
      expect(JSON.stringify(entries)).not.toContain('requestId');
      expect(currentOperationContext()).toEqual({});
    } finally {
      write.mockRestore();
    }
  });

  it('uses native Nest JSON logging with a contextual, structured message', () => {
    const write = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    try {
      createServiceLogger().log({ event: 'test_event' }, 'ObservabilityTest');
      expect(write).toHaveBeenCalled();
      const entry: unknown = JSON.parse(String(write.mock.calls[0][0]));
      expect(entry).toEqual(
        expect.objectContaining({
          level: 'log',
          context: 'ObservabilityTest',
          message: { event: 'test_event' },
        })
      );
    } finally {
      write.mockRestore();
    }
  });
});

describe('Heartbeat with production authentication guards', () => {
  let app: INestApplication<Server>;
  const remote = { canActivate: jest.fn(() => false) };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ObservabilityModule],
      controllers: [TestController],
    }).compile();
    app = module.createNestApplication({ logger: false });
    const reflector = new Reflector();
    app.useGlobalGuards(
      new AuthenticationGuard(reflector, remote as unknown as RemoteAuthGuard),
      new RolesGuard(reflector)
    );
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  it('allows GET/HEAD heartbeat while protected routes still require authentication', async () => {
    await request(app.getHttpServer()).get('/health').expect(200);
    await request(app.getHttpServer()).head('/health').expect(200);
    expect(remote.canActivate).not.toHaveBeenCalled();
    await request(app.getHttpServer()).get('/items/private').expect(401);
    expect(remote.canActivate).toHaveBeenCalled();
    await request(app.getHttpServer()).post('/health').expect(404);
  });
});
