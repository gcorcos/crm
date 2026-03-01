import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminPassword = await bcrypt.hash('Admin1234!', 10)
  const salesPassword = await bcrypt.hash('Sales1234!', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@crm.dev' },
    update: {},
    create: {
      email: 'admin@crm.dev',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'CRM',
      role: Role.ADMIN,
    },
  })

  const manager = await prisma.user.upsert({
    where: { email: 'manager@crm.dev' },
    update: {},
    create: {
      email: 'manager@crm.dev',
      password: salesPassword,
      firstName: 'Marie',
      lastName: 'Dupont',
      role: Role.MANAGER,
    },
  })

  const sales = await prisma.user.upsert({
    where: { email: 'sales@crm.dev' },
    update: {},
    create: {
      email: 'sales@crm.dev',
      password: salesPassword,
      firstName: 'Jean',
      lastName: 'Martin',
      role: Role.SALES,
    },
  })

  // Sample accounts
  const account1 = await prisma.account.upsert({
    where: { name: 'Acme Corp' },
    update: {},
    create: {
      name: 'Acme Corp',
      industry: 'Tech',
      size: '50-200',
      website: 'https://acme.example.com',
      city: 'Paris',
      country: 'France',
      ownerId: sales.id,
    },
  })

  const account2 = await prisma.account.upsert({
    where: { name: 'Global Industries' },
    update: {},
    create: {
      name: 'Global Industries',
      industry: 'Industrie',
      size: '200+',
      city: 'Lyon',
      country: 'France',
      ownerId: manager.id,
    },
  })

  // Sample contacts
  await prisma.contact.upsert({
    where: { email_accountId: { email: 'alice@acme.example.com', accountId: account1.id } },
    update: {},
    create: {
      firstName: 'Alice',
      lastName: 'Leroy',
      email: 'alice@acme.example.com',
      phone: '+33 6 12 34 56 78',
      title: 'Directrice Achat',
      role: 'Décideur',
      accountId: account1.id,
      ownerId: sales.id,
    },
  })

  // Sample leads
  await prisma.lead.createMany({
    skipDuplicates: true,
    data: [
      {
        firstName: 'Pierre',
        lastName: 'Durand',
        email: 'pierre@startup.io',
        company: 'Startup.io',
        source: 'WEBSITE',
        status: 'NEW',
        score: 35,
        ownerId: sales.id,
      },
      {
        firstName: 'Sophie',
        lastName: 'Bernard',
        email: 'sophie@bigcorp.fr',
        phone: '+33 1 23 45 67 89',
        company: 'BigCorp',
        source: 'REFERRAL',
        status: 'CONTACTED',
        score: 65,
        ownerId: sales.id,
      },
      {
        firstName: 'Marc',
        lastName: 'Petit',
        email: 'marc@industrie.fr',
        company: 'Industrie SA',
        source: 'COLD_CALL',
        status: 'QUALIFIED',
        score: 80,
        ownerId: manager.id,
      },
    ],
  })

  // Sample opportunities
  const opp1 = await prisma.opportunity.create({
    data: {
      name: 'Acme — Licence annuelle',
      amount: 24000,
      currency: 'EUR',
      stage: 'PROPOSAL',
      probability: 40,
      closeDate: new Date('2026-03-31'),
      accountId: account1.id,
      ownerId: sales.id,
    },
  })

  await prisma.opportunity.create({
    data: {
      name: 'Global — Intégration ERP',
      amount: 85000,
      currency: 'EUR',
      stage: 'NEGOTIATION',
      probability: 60,
      closeDate: new Date('2026-04-15'),
      accountId: account2.id,
      ownerId: manager.id,
    },
  })

  // Sample activity
  await prisma.activity.create({
    data: {
      type: 'CALL',
      subject: 'Appel de suivi proposal',
      status: 'TODO',
      dueDate: new Date(Date.now() + 86400000),
      relatedType: 'OPPORTUNITY',
      relatedId: opp1.id,
      opportunityId: opp1.id,
      ownerId: sales.id,
    },
  })

  console.log('✅ Seed terminé')
  console.log('  admin@crm.dev / Admin1234!')
  console.log('  manager@crm.dev / Sales1234!')
  console.log('  sales@crm.dev / Sales1234!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
