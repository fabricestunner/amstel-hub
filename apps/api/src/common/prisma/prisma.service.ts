import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Thin wrapper around PrismaClient with lifecycle hooks and a
 * soft-delete-aware helper. Inject this everywhere instead of `new PrismaClient`.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication): Promise<void> {
    process.on('beforeExit', async () => {
      await app.close();
    });
  }

  /** Convenience filter for models that use the `deletedAt` soft-delete column. */
  get notDeleted() {
    return { deletedAt: null };
  }
}
