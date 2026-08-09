import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";

const faqs = [
  {
    question: "What does Revora focus on?",
    answer:
      "Revora focuses on the revenue workflow around lead qualification, pipeline visibility, team coordination, and automation activity.",
  },
  {
    question: "Can Revora support multiple organizations?",
    answer:
      "Yes. The workspace supports active organization selection and validates the selected context on the server for every dashboard request.",
  },
  {
    question: "How is team access managed?",
    answer:
      "Teams use organization-scoped roles, invitation workflows, and permission-aware controls. Sensitive membership changes are independently authorized by the database.",
  },
  {
    question: "Which systems can the workflow connect to?",
    answer:
      "The current product surface includes GoHighLevel, HubSpot, Slack, n8n, and OpenAI-related workflow configuration. Available configuration depends on your organization permissions.",
  },
  {
    question: "How does Revora approach security?",
    answer:
      "Revora keeps organization access scoped through server validation and database policies, with existing support for consent checks, MFA requirements, and protected invitation and ownership-transfer flows.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="scroll-mt-24 py-24 sm:py-32">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <Badge
            variant="outline"
            className="mb-4 border-border bg-surface text-foreground"
          >
            FAQ
          </Badge>
          <h2 className="text-balance text-3xl font-semibold tracking-[-0.045em] text-foreground sm:text-5xl">
            Answers for the revenue operating team.
          </h2>
        </div>

        <div className="mx-auto mt-14 max-w-3xl divide-y divide-border border-y border-border">
          {faqs.map((faq) => (
            <details key={faq.question} className="group py-5">
              <summary className="flex w-full cursor-pointer items-center justify-between gap-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <span className="text-base font-semibold text-foreground">
                  {faq.question}
                </span>
                <span
                  className="relative flex size-6 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground"
                  aria-hidden="true"
                >
                  <span className="absolute h-px w-2.5 bg-current" />
                  <span className="h-2.5 w-px bg-current transition-transform group-open:scale-y-0" />
                </span>
              </summary>
              <p className="max-w-2xl pt-3 text-sm leading-7 text-muted-foreground">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
