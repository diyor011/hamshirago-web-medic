interface StatusBadgeProps {
  status: string;
}

const statusMap: Record<string, { label: string; className: string }> = {
  CREATED: { label: "Создан", className: "status-badge status-created" },
  ASSIGNED: { label: "Назначен", className: "status-badge status-active" },
  ACCEPTED: { label: "Принят", className: "status-badge status-active" },
  ON_THE_WAY: { label: "В пути", className: "status-badge status-active" },
  ARRIVED: { label: "Прибыл", className: "status-badge status-active" },
  SERVICE_STARTED: { label: "Выполняется", className: "status-badge status-active" },
  DONE: { label: "Завершён", className: "status-badge status-done" },
  CANCELED: { label: "Отменён", className: "status-badge status-canceled" },
  PENDING: { label: "Ожидает", className: "status-badge status-pending" },
  APPROVED: { label: "Одобрен", className: "status-badge status-approved" },
  REJECTED: { label: "Отклонён", className: "status-badge status-rejected" },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const s = statusMap[status] || { label: status, className: "status-badge bg-muted text-muted-foreground" };
  return <span className={s.className}>{s.label}</span>;
}
