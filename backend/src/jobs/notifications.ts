import cron from 'node-cron'
import { prisma } from '../lib/prisma'
import { sendMail } from '../lib/mailer'

// ─── US-21 : Rappels tâches J-1 et J0 ────────────────────────────────────────

async function sendActivityReminders() {
  const now = new Date()

  // J-1 : activités dues demain
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStart = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate())
  const tomorrowEnd = new Date(tomorrowStart.getTime() + 86400000)

  // J0 : activités dues aujourd'hui
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(todayStart.getTime() + 86400000)

  const activities = await prisma.activity.findMany({
    where: {
      status: { notIn: ['DONE', 'CANCELLED'] },
      dueDate: { in: [] },  // override below
      OR: [
        { dueDate: { gte: tomorrowStart, lt: tomorrowEnd } },
        { dueDate: { gte: todayStart, lt: todayEnd } },
      ],
    },
    include: { owner: { select: { email: true, firstName: true } } },
  })

  for (const activity of activities) {
    if (!activity.owner?.email) continue

    const dueDate = new Date(activity.dueDate!)
    const isToday = dueDate >= todayStart && dueDate < todayEnd
    const label = isToday ? "aujourd'hui" : 'demain'

    await sendMail(
      activity.owner.email,
      `[CRM] Rappel : ${activity.subject} — ${label}`,
      `
      <p>Bonjour ${activity.owner.firstName},</p>
      <p>Cette activité arrive à échéance <strong>${label}</strong> :</p>
      <ul>
        <li><strong>Type :</strong> ${activity.type}</li>
        <li><strong>Sujet :</strong> ${activity.subject}</li>
        ${activity.description ? `<li><strong>Description :</strong> ${activity.description}</li>` : ''}
      </ul>
      <p>Connectez-vous au CRM pour la traiter.</p>
      `
    )
  }

  if (activities.length > 0) {
    console.log(`[cron] ${activities.length} rappel(s) d'activité envoyé(s)`)
  }
}

// ─── US-22 : Alertes contrats expirant dans 30j ───────────────────────────────

async function sendContractExpiryAlerts() {
  const now = new Date()
  const in30days = new Date(now.getTime() + 30 * 86400000)

  const contracts = await prisma.contract.findMany({
    where: {
      status: { in: ['ACTIVE', 'SIGNED'] },
      endDate: { gte: now, lte: in30days },
    },
    include: {
      account: { select: { name: true } },
      owner: { select: { email: true, firstName: true } },
    },
  })

  for (const contract of contracts) {
    if (!contract.owner?.email || !contract.endDate) continue

    const daysLeft = Math.ceil((contract.endDate.getTime() - now.getTime()) / 86400000)

    await sendMail(
      contract.owner.email,
      `[CRM] Contrat ${contract.number} expire dans ${daysLeft} jour(s)`,
      `
      <p>Bonjour ${contract.owner.firstName},</p>
      <p>Le contrat suivant expire dans <strong>${daysLeft} jour(s)</strong> :</p>
      <ul>
        <li><strong>N° :</strong> ${contract.number}</li>
        <li><strong>Compte :</strong> ${contract.account?.name}</li>
        <li><strong>Date d'expiration :</strong> ${contract.endDate.toLocaleDateString('fr-FR')}</li>
        <li><strong>Montant :</strong> ${Number(contract.amount).toLocaleString('fr-FR')} €</li>
      </ul>
      <p>Pensez à le renouveler ou à contacter le client.</p>
      `
    )
  }

  if (contracts.length > 0) {
    console.log(`[cron] ${contracts.length} alerte(s) d'expiration contrat envoyée(s)`)
  }
}

// ─── Enregistrement des crons ─────────────────────────────────────────────────

export function registerCronJobs() {
  // Rappels activités : tous les jours à 8h00
  cron.schedule('0 8 * * *', () => {
    sendActivityReminders().catch((e) => console.error('[cron] erreur rappels activités:', e))
  })

  // Alertes contrats : tous les jours à 8h30
  cron.schedule('30 8 * * *', () => {
    sendContractExpiryAlerts().catch((e) => console.error('[cron] erreur alertes contrats:', e))
  })

  console.log('[cron] Jobs de notification enregistrés (8h00 et 8h30 chaque jour)')
}
