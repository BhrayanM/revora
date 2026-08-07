import { Container } from "@/components/ui/container";

const stats = [
  { value: "10,000+", label: "Active Users" },
  { value: "2.4M+", label: "Leads Processed" },
  { value: "97.3%", label: "AI Accuracy" },
  { value: "850K+", label: "Meetings Booked" },
  { value: "99.9%", label: "Uptime SLA" },
];

export function TrustedBy() {
  return (
    <section className="border-y border-border bg-surface-secondary py-12">
      <Container>
        <p className="text-center text-sm font-medium text-zinc-500">
          Trusted by innovative companies worldwide
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-16 gap-y-6">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="mt-1 text-xs text-zinc-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
