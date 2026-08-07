import { Container } from "@/components/ui/container";
import { SlideUp } from "@/components/ui/motion";

const companies = [
  "TechCorp",
  "DataVault",
  "CloudNine",
  "MetaShift",
  "NeuralPath",
  "QuantumLeap",
];

export function TrustedBy() {
  return (
    <section className="border-y border-border bg-surface-secondary py-12">
      <Container>
        <SlideUp>
          <p className="text-center text-sm font-medium text-zinc-500">
            Trusted by innovative companies worldwide
          </p>
        </SlideUp>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
          {companies.map((company) => (
            <div
              key={company}
              className="text-xl font-bold text-zinc-300 transition-colors hover:text-zinc-400"
            >
              {company}
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
