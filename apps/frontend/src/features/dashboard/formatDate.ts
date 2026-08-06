export function formatDate(timestamp?: string | number): string {
  if (!timestamp) return "-";
  return new Date(timestamp).toLocaleString("pt-BR");
}
