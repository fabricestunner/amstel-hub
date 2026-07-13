import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as argon2 from 'argon2';

import { paginate } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { normalizePhone } from '../../common/utils/phone.util';
import { AuditService } from '../audit/audit.service';
import {
  ChangePasswordDto,
  CreateUserDto,
  ListUsersQueryDto,
  RegisterOutletCustomerDto,
  UpdateProfileDto,
  UpdateUserDto,
  UpdateUserRoleDto,
  UpdateUserStatusDto,
} from './dto/user.dto';

const PUBLIC_USER_FIELDS = {
  id: true,
  email: true,
  phone: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  role: true,
  status: true,
  emailVerified: true,
  phoneVerified: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findById(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: PUBLIC_USER_FIELDS,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /** Admin — create a staff user (manager, promoter). Customers self-register. */
  async create(dto: CreateUserDto) {
    const phone = normalizePhone(dto.phone);
    const email = dto.email?.trim().toLowerCase();
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          ...(phone ? [{ phone }] : []),
          ...(email ? [{ email }] : []),
        ],
      },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException(
        'A user with this phone or email already exists',
      );
    }

    if (dto.outletId) {
      const outlet = await this.prisma.outlet.findUnique({
        where: { id: dto.outletId },
        select: { managerId: true },
      });
      if (!outlet) throw new NotFoundException('Outlet not found');
      // Only a manager occupies the 1:1 manager slot; promoters (many per
      // outlet) don't conflict on it.
      if (dto.role === 'OUTLET_MANAGER' && outlet.managerId) {
        throw new BadRequestException('That outlet already has a manager');
      }
    }

    const passwordHash = await argon2.hash(dto.password);

    const isCustomer = dto.role === 'CUSTOMER';
    const status = isCustomer ? 'PENDING' : 'ACTIVE';
    // A promoter is assigned to an outlet and can redeem codes like a customer
    // (except at their own outlet), so they need a wallet and an outlet link.
    const isPromoter = dto.role === 'PROMOTER';

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: phone || null,
          email: email || null,
          role: dto.role,
          passwordHash,
          status,
          // staff accounts are pre-verified by the admin who creates them; customers start pending
          phoneVerified: !isCustomer && Boolean(phone),
          emailVerified: !isCustomer && Boolean(email),
          regionId: dto.regionId,
          ...(isPromoter && dto.outletId
            ? { assignedOutletId: dto.outletId }
            : {}),
          ...(isPromoter ? { wallet: { create: {} } } : {}),
        },
        select: PUBLIC_USER_FIELDS,
      });

      // Wire a freshly created OUTLET_MANAGER to their outlet (1:1).
      if (dto.role === 'OUTLET_MANAGER' && dto.outletId) {
        await tx.outlet.update({
          where: { id: dto.outletId },
          data: { managerId: user.id },
        });
      }

      return user;
    });
  }

  /**
   * Outlet manager — register a walk-in CUSTOMER onto their OWN outlet.
   * The outlet is taken from the authenticated manager (`outletId`); it is
   * never accepted from the request. Because a staffer onboards the customer in
   * person, the account is created ACTIVE with its contact channels pre-verified.
   */
  async registerOutletCustomer(outletId: string, dto: RegisterOutletCustomerDto) {
    const phone = normalizePhone(dto.phone);
    const email = dto.email?.trim().toLowerCase();
    if (!phone && !email) {
      throw new BadRequestException(
        'Provide a phone number or email for the customer',
      );
    }

    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          ...(phone ? [{ phone }] : []),
          ...(email ? [{ email }] : []),
        ],
      },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException(
        'A user with this phone or email already exists',
      );
    }

    const passwordHash = await argon2.hash(dto.password);

    return this.prisma.user.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: phone || null,
        email: email || null,
        gender: dto.gender,
        yearOfBirth: dto.yearOfBirth,
        role: 'CUSTOMER',
        passwordHash,
        status: 'ACTIVE',
        // Onboarded in person by outlet staff, so their contact is pre-verified.
        phoneVerified: Boolean(phone),
        emailVerified: Boolean(email),
        registeredOutletId: outletId,
        wallet: { create: {} },
      },
      select: PUBLIC_USER_FIELDS,
    });
  }

  /** Admin — soft-delete a user. SUPER_ADMINs cannot be removed. */
  async remove(actorId: string, targetId: string) {
    if (actorId === targetId) {
      throw new BadRequestException('You cannot delete your own account');
    }
    const target = await this.prisma.user.findFirst({
      where: { id: targetId, deletedAt: null },
      select: {
        id: true,
        role: true,
        email: true,
        phone: true,
        managedOutlet: { select: { id: true } },
      },
    });
    if (!target) throw new NotFoundException('User not found');
    if (target.role === 'SUPER_ADMIN') {
      throw new BadRequestException('Cannot delete a SUPER_ADMIN');
    }

    await this.prisma.$transaction(async (tx) => {
      // Release the outlet they manage so it can be reassigned.
      if (target.managedOutlet) {
        await tx.outlet.update({
          where: { id: target.managedOutlet.id },
          data: { managerId: null },
        });
      }
      // `email` and `phone` are unique columns. The soft-deleted row keeps
      // occupying them unless we clear them, which would lock the person out
      // of ever signing up again. The row (and its points history) survives;
      // only the identifiers are released. Originals go to the audit log.
      await tx.user.update({
        where: { id: targetId },
        data: {
          deletedAt: new Date(),
          status: 'SUSPENDED',
          email: null,
          phone: null,
        },
      });
    });

    await this.audit.record({
      actorId,
      action: 'user.delete',
      entityType: 'User',
      entityId: targetId,
      before: { email: target.email, phone: target.phone },
    });

    return { success: true };
  }

  async list(query: ListUsersQueryDto) {
    const where = {
      deletedAt: null,
      ...(query.role
        ? { role: query.role }
        : query.staffOnly
          ? { role: { not: 'CUSTOMER' as const } }
          : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.outletId ? { outletId: query.outletId } : {}),
      ...(query.search
        ? {
            OR: [
              {
                firstName: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                lastName: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
              { phone: { contains: query.search } },
              {
                email: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: { ...PUBLIC_USER_FIELDS, wallet: { select: { availablePoints: true } } },
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: query.sortOrder },
      }),
      this.prisma.user.count({ where }),
    ]);
    const mapped = items.map(({ wallet, ...u }) => ({
      ...u,
      points: wallet ? Number(wallet.availablePoints) : 0,
    }));
    return paginate(mapped, total, query);
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    await this.findById(id);
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: PUBLIC_USER_FIELDS,
    });
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    await this.findById(id);
    const data: Prisma.UserUpdateInput = {
      ...(dto.firstName !== undefined ? { firstName: dto.firstName } : {}),
      ...(dto.lastName !== undefined ? { lastName: dto.lastName } : {}),
      ...(dto.phone !== undefined ? { phone: normalizePhone(dto.phone) } : {}),
      ...(dto.email !== undefined ? { email: dto.email.trim().toLowerCase() } : {}),
    };
    return this.prisma.user.update({
      where: { id },
      data,
      select: PUBLIC_USER_FIELDS,
    });
  }

  async updateStatus(targetId: string, dto: UpdateUserStatusDto) {
    const target = await this.prisma.user.findFirst({
      where: { id: targetId, deletedAt: null },
      select: { id: true, role: true },
    });
    if (!target) throw new NotFoundException('User not found');
    if (target.role === 'SUPER_ADMIN') {
      throw new BadRequestException('Cannot change the status of a SUPER_ADMIN');
    }
    return this.prisma.user.update({
      where: { id: targetId },
      data: { status: dto.status },
      select: PUBLIC_USER_FIELDS,
    });
  }

  async updateRole(actorId: string, targetId: string, dto: UpdateUserRoleDto) {
    if (actorId === targetId) {
      throw new BadRequestException('You cannot change your own role');
    }
    const target = await this.prisma.user.findFirst({
      where: { id: targetId, deletedAt: null },
      select: { id: true },
    });
    if (!target) throw new NotFoundException('User not found');
    return this.prisma.user.update({
      where: { id: targetId },
      data: { role: dto.role },
      select: PUBLIC_USER_FIELDS,
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true, passwordHash: true },
    });
    if (!user) throw new NotFoundException('User not found');

    if (!user.passwordHash) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    const valid = await argon2.verify(user.passwordHash, dto.currentPassword);
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const newHash = await argon2.hash(dto.newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    return { success: true };
  }

  async getWallet(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        wallet: {
          select: {
            availablePoints: true,
            redeemedPoints: true,
            lifetimePoints: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    if (!user.wallet) {
      return { availablePoints: 0, redeemedPoints: 0, lifetimePoints: 0 };
    }
    return {
      availablePoints: Number(user.wallet.availablePoints),
      redeemedPoints: Number(user.wallet.redeemedPoints),
      lifetimePoints: Number(user.wallet.lifetimePoints),
    };
  }
}
