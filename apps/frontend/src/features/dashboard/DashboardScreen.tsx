import { EventsTable } from "./EventsTable";
import { MessagesTable } from "./MessagesTable";

export function DashboardScreen() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <h2 className="text-lg font-semibold text-neutral-100">Dashboard</h2>
      <EventsTable />
      <MessagesTable />
    </div>
  );
}
