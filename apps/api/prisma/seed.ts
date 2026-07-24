/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, createCipheriv, randomBytes } from 'node:crypto';
import { seedLoyalFriendsCampaign } from './seeds/loyal-friends-campaign';

const prisma = new PrismaClient();

const ENCRYPTION_KEY = Buffer.from(
  process.env.ENCRYPTION_KEY ?? '0'.repeat(64),
  'hex',
);

const hash = (v: string) => createHash('sha256').update(v).digest('hex');

function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}

async function main() {
  console.log('🌱 Seeding Amstel Rewards Platform...');

  // ── Permissions ─────────────────────────────────────────────
  const permissionKeys = [
    'campaign:create', 'campaign:update', 'tournament:manage',
    'reward:approve', 'report:view', 'user:manage', 'outlet:manage',
  ];
  await prisma.permission.createMany({
    data: permissionKeys.map((key) => ({ key })),
    skipDuplicates: true,
  });

  // ── Rwanda Geography (5 provinces · 30 districts) ──────────
  const RWANDA: Record<string, { code: string; districts: string[] }> = {
    'Kigali City':       { code: 'KGL', districts: ['Gasabo', 'Kicukiro', 'Nyarugenge'] },
    'Northern Province': { code: 'NOR', districts: ['Burera', 'Gakenke', 'Gicumbi', 'Musanze', 'Rulindo'] },
    'Southern Province': { code: 'SOU', districts: ['Gisagara', 'Huye', 'Kamonyi', 'Muhanga', 'Nyamagabe', 'Nyanza', 'Nyaruguru', 'Ruhango'] },
    'Eastern Province':  { code: 'EAS', districts: ['Bugesera', 'Gatsibo', 'Kayonza', 'Kirehe', 'Ngoma', 'Nyagatare', 'Rwamagana'] },
    'Western Province':  { code: 'WES', districts: ['Karongi', 'Ngororero', 'Nyabihu', 'Nyamasheke', 'Rubavu', 'Rusizi', 'Rutsiro'] },
  };

  // Single national region record (Rwanda uses provinces as primary admin units)
  const region = await prisma.region.upsert({
    where: { code: 'RW' },
    update: {},
    create: { name: 'Rwanda', code: 'RW' },
  });

  // Seed provinces + districts
  const provinceMap: Record<string, { id: string }> = {};
  const districtMap: Record<string, { id: string }> = {};

  for (const [provinceName, { districts }] of Object.entries(RWANDA)) {
    const prov = await prisma.province.upsert({
      where: { regionId_name: { regionId: region.id, name: provinceName } },
      update: {},
      create: { name: provinceName, regionId: region.id },
    });
    provinceMap[provinceName] = prov;

    for (const districtName of districts) {
      const dist = await prisma.district.upsert({
        where: { provinceId_name: { provinceId: prov.id, name: districtName } },
        update: {},
        create: { name: districtName, provinceId: prov.id },
      });
      districtMap[districtName] = dist;
    }
  }

  // Convenience aliases for seeding outlets/users below
  const province = provinceMap['Kigali City'];
  const district = districtMap['Gasabo'];

  // ── Users ───────────────────────────────────────────────────
  const password = await argon2.hash('Password123!');
  const mkUser = (
    phone: string,
    role: any,
    email: string,
    extra: Record<string, unknown> = {},
  ) =>
    prisma.user.upsert({
      where: { phone },
      update: {},
      create: {
        phone, email, passwordHash: password, role,
        status: 'ACTIVE', phoneVerified: true, emailVerified: true,
        ...extra,
      },
    });

  const superAdmin = await mkUser('+254700000001', 'SUPER_ADMIN', 'admin@amstel.com', {
    firstName: 'Super', lastName: 'Admin',
  });
  await mkUser('+254700000002', 'CAMPAIGN_MANAGER', 'campaign@amstel.com', {
    firstName: 'Campaign', lastName: 'Manager',
  });
  await mkUser('+254700000003', 'REGIONAL_MANAGER', 'regional@amstel.com', {
    firstName: 'Regional', lastName: 'Manager', regionId: region.id,
  });
  const outletManager = await mkUser('+254700000004', 'OUTLET_MANAGER', 'outlet@amstel.com', {
    firstName: 'Outlet', lastName: 'Manager',
  });
  await mkUser('+254700000005', 'PROMOTER', 'promoter@amstel.com', {
    firstName: 'Field', lastName: 'Promoter',
  });

  const outlet = await prisma.outlet.upsert({
    where: { code: 'OUT-001' },
    update: {},
    create: {
      name: 'The Tap House', code: 'OUT-001', status: 'ACTIVE',
      regionId: region.id, provinceId: province.id, districtId: district.id,
      managerId: outletManager.id,
    },
  });

  // Customers + wallets
  for (let i = 1; i <= 5; i++) {
    const phone = `+25471100000${i}`;
    const customer = await prisma.user.upsert({
      where: { phone },
      update: {},
      create: {
        phone, email: `customer${i}@example.com`, passwordHash: password,
        firstName: `Customer`, lastName: `#${i}`, role: 'CUSTOMER',
        status: 'ACTIVE', phoneVerified: true, registeredOutletId: outlet.id,
        wallet: { create: { availablePoints: i * 50, lifetimePoints: i * 50 } },
      },
    });
    void customer;
  }

  // ── Campaign ────────────────────────────────────────────────
  const campaign = await prisma.campaign.upsert({
    where: { slug: 'amstel-summer-2026' },
    update: {},
    create: {
      name: 'Amstel Summer Championship 2026',
      slug: 'amstel-summer-2026',
      description: 'Buy Amstel, earn points, win pool tournaments nationwide.',
      status: 'ACTIVE',
      startsAt: new Date('2026-06-01'),
      endsAt: new Date('2026-09-30'),
      // 1 point per beer/code; a voucher reward costs 2 points (= 2 beers).
      pointsPerCode: 1,
      pointsExpiryDays: 180,
      createdById: superAdmin.id,
    },
  });

  // ── Loyalty codes (encrypted, one-time use) ─────────────────
  const sampleCodes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const raw = `AMSTEL-${randomBytes(2).toString('hex').toUpperCase()}-${randomBytes(2)
      .toString('hex')
      .toUpperCase()}`;
    sampleCodes.push(raw);
    await prisma.loyaltyCode.upsert({
      where: { codeHash: hash(raw) },
      update: {},
      create: {
        campaignId: campaign.id,
        type: i % 2 === 0 ? 'QR' : 'BOTTLE',
        codeHash: hash(raw),
        codeCipher: encrypt(raw),
        pointsValue: 1,
        status: 'ACTIVE',
      },
    });
  }

  // ── Rewards ─────────────────────────────────────────────────
  // The real reward catalog (consumer + outlet tiers) is seeded by
  // seedLoyalFriendsCampaign below. No demo/sample rewards are created here —
  // the client-facing catalog must contain only the campaign's actual prizes.

  // ── Tournament ──────────────────────────────────────────────
  await prisma.tournament.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      campaignId: campaign.id,
      name: 'Downtown Pool Showdown',
      venue: 'The Tap House',
      city: 'Capital City',
      status: 'REGISTRATION_OPEN',
      maxPlayers: 16,
      entryPointsCost: 100,
      registrationDeadline: new Date('2026-07-15'),
      startsAt: new Date('2026-07-20'),
    },
  });

  // ── Loyal Friends of Amstel (client production campaign) ────
  const loyalFriends = await seedLoyalFriendsCampaign(prisma);
  console.log(`   Loyal Friends campaign: ${loyalFriends.campaignId}`);

  console.log('✅ Seed complete.');
  console.log('   Admin login: admin@amstel.com / Password123!');
  console.log('   Sample redeemable codes:');
  sampleCodes.forEach((c) => console.log(`     - ${c}`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
