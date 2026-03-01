import clsx from 'clsx'

const STATUS_COLORS: Record<string, string> = {
  // Lead
  NEW: 'bg-blue-100 text-blue-700',
  CONTACTED: 'bg-yellow-100 text-yellow-700',
  QUALIFIED: 'bg-purple-100 text-purple-700',
  CONVERTED: 'bg-green-100 text-green-700',
  LOST: 'bg-red-100 text-red-700',
  // Opportunity
  PROSPECTING: 'bg-gray-100 text-gray-700',
  QUALIFICATION: 'bg-blue-100 text-blue-700',
  PROPOSAL: 'bg-yellow-100 text-yellow-700',
  NEGOTIATION: 'bg-orange-100 text-orange-700',
  WON: 'bg-green-100 text-green-700',
  // Activity
  TODO: 'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  DONE: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  // Contract
  DRAFT: 'bg-gray-100 text-gray-700',
  REVIEW: 'bg-yellow-100 text-yellow-700',
  SIGNED: 'bg-blue-100 text-blue-700',
  ACTIVE: 'bg-green-100 text-green-700',
  EXPIRED: 'bg-red-100 text-red-700',
  TERMINATED: 'bg-red-100 text-red-700',
  // Order
  PENDING: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-green-100 text-green-700',
}

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Nouveau', CONTACTED: 'Contacté', QUALIFIED: 'Qualifié', CONVERTED: 'Converti',
  LOST: 'Perdu', PROSPECTING: 'Prospection', QUALIFICATION: 'Qualification',
  PROPOSAL: 'Proposition', NEGOTIATION: 'Négociation', WON: 'Gagné',
  TODO: 'À faire', IN_PROGRESS: 'En cours', DONE: 'Terminé', CANCELLED: 'Annulé',
  DRAFT: 'Brouillon', REVIEW: 'En révision', SIGNED: 'Signé', ACTIVE: 'Actif',
  EXPIRED: 'Expiré', TERMINATED: 'Résilié', PENDING: 'En attente',
  CONFIRMED: 'Confirmée', DELIVERED: 'Livrée',
}

interface Props { status: string; className?: string }

export default function StatusBadge({ status, className }: Props) {
  return (
    <span className={clsx('badge', STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600', className)}>
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}
