import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Namespace, Socket } from 'socket.io';
import { PrismaService } from '../../prisma.service';
import { UsersService } from '../users/users.service';
import { SurveyRecordsService } from './survey-records.service';

const roomFor = (recordId: number) => `survey-record:${recordId}`;
const socketError = (code: string) =>
  Object.assign(new Error(code), { data: { code } });

type SocketData = { recordId: number; expiresAt: number };

/**
 * Realtime channel per survey record. Clients connect with
 * `auth: { accessToken, recordId }` and receive `survey-record:changed`
 * after any REST mutation, then re-fetch the record.
 */
@WebSocketGateway({ namespace: '/survey-records', cors: { origin: '*' } })
export class SurveyRecordsGateway
  implements OnGatewayInit, OnGatewayConnection
{
  @WebSocketServer() server!: Namespace;
  private readonly logger = new Logger(SurveyRecordsGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly users: UsersService,
    private readonly prisma: PrismaService,
    private readonly records: SurveyRecordsService,
  ) {}

  afterInit(server: Namespace) {
    server.use((socket, next) => {
      this.authenticate(socket)
        .then(() => next())
        .catch((error: unknown) => {
          next(
            error instanceof Error && 'data' in error
              ? error
              : socketError('UNAVAILABLE'),
          );
        });
    });
  }

  async authenticate(socket: Socket) {
    const { accessToken, recordId } = (socket.handshake.auth ?? {}) as {
      accessToken?: unknown;
      recordId?: unknown;
    };
    if (typeof accessToken !== 'string' || !accessToken) {
      throw socketError('AUTH_INVALID');
    }

    let payload: { sub?: unknown; exp?: unknown; token_use?: unknown };
    try {
      payload = await this.jwt.verifyAsync(accessToken, {
        secret: process.env.JWT_SECRET,
        algorithms: ['HS256'],
      });
    } catch (error) {
      throw socketError(
        error instanceof Error && error.name === 'TokenExpiredError'
          ? 'AUTH_EXPIRED'
          : 'AUTH_INVALID',
      );
    }
    // Refresh tokens must never authorize a socket connection.
    const exp = Number(payload?.exp);
    if (
      payload?.token_use !== 'access' ||
      !Number.isFinite(exp) ||
      exp * 1000 <= Date.now()
    ) {
      throw socketError('AUTH_INVALID');
    }

    const userId = Number(payload.sub);
    const id = Number(recordId);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      throw socketError('AUTH_INVALID');
    }
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw socketError('RECORD_NOT_FOUND');
    }
    if (!(await this.users.findById(userId))) {
      throw socketError('AUTH_INVALID');
    }
    const record = await this.prisma.surveyRecords.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!record) throw socketError('RECORD_NOT_FOUND');

    const data = socket.data as SocketData;
    data.recordId = id;
    data.expiresAt = exp * 1000;
  }

  async handleConnection(socket: Socket) {
    const data = socket.data as SocketData;
    if (data.expiresAt <= Date.now()) {
      socket.emit('auth:expired');
      socket.disconnect(true);
      return;
    }
    await socket.join(roomFor(data.recordId));
    if (!socket.connected) return;

    const remaining = data.expiresAt - Date.now();
    const timer = setTimeout(
      () => {
        socket.emit('auth:expired');
        socket.disconnect(true);
      },
      Math.max(0, Math.min(remaining, 2_147_483_647)),
    );
    timer.unref();
    socket.once('disconnect', () => clearTimeout(timer));
    // Sent after joining so a REST resync cannot miss a change during connect.
    socket.emit('survey-record:ready', { recordId: data.recordId });
  }

  async notifyMutation(result: Record<string, unknown>, deleted: boolean) {
    try {
      const recordId = await this.records.resolveRecordId(result);
      if (recordId && this.server) {
        this.server.to(roomFor(recordId)).emit('survey-record:changed', {
          recordId,
          deleted: deleted && 'template_code' in result,
        });
      }
    } catch {
      // A notification failure must not turn a committed REST write into an error.
      this.logger.error('Unable to notify survey record subscribers');
    }
  }
}
