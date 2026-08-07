import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";

const faqs = [
  {
    question: "How does the AI lead qualification work?",
    answer:
      "Our AI analyzes multiple data points including lead behavior, demographic information, engagement patterns, and historical conversion data to assign a qualification score. The model continuously learns from your sales outcomes, becoming more accurate over time. You can customize scoring criteria and thresholds to match your ideal customer profile.",
  },
  {
    question: "Which CRMs do you integrate with?",
    answer:
      "We offer native integrations with GoHighLevel and HubSpot, with bidirectional sync for contacts, deals, and activities. Additionally, through our n8n workflow engine, you can connect to virtually any CRM with an API including Salesforce, Pipedrive, Zoho, and more. Custom integrations can be built on our Enterprise plan.",
  },
  {
    question: "Can I customize the AI automation workflows?",
    answer:
      "Absolutely. Our Professional and Enterprise plans include access to the n8n workflow builder, which lets you create custom automation sequences visually — no code required. You can define triggers, conditions, actions, and AI-powered decision nodes to match your exact business processes.",
  },
  {
    question: "Is there a limit on SMS or email sends?",
    answer:
      "Starter plans include up to 5,000 email sends and 500 SMS messages per month. Professional plans include up to 50,000 email sends and 5,000 SMS messages. Enterprise plans are fully customizable. All messages are sent through your own Twilio and email provider accounts, so you maintain full control and compliance.",
  },
  {
    question: "How long does implementation take?",
    answer:
      "Most customers are fully operational within 1-2 weeks. Our guided onboarding walks you through connecting your tools, configuring your AI scoring model, and setting up your first automation workflow. Enterprise customers receive a dedicated implementation specialist for a white-glove setup.",
  },
  {
    question: "What kind of support do you offer?",
    answer:
      "All plans include email support with a 24-hour response time. Professional plans add priority support with a 4-hour response time. Enterprise customers get a dedicated account manager, phone support, and a guaranteed SLA. We also maintain comprehensive documentation and video tutorials.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="py-24 sm:py-32 bg-surface-secondary">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="secondary" className="mb-4">
            FAQ
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Frequently Asked{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Questions
            </span>
          </h2>
        </div>

        <div className="mt-16 mx-auto max-w-3xl divide-y divide-border">
          {faqs.map((faq, index) => (
            <details key={index} className="group py-4">
              <summary className="flex w-full cursor-pointer items-center justify-between gap-4 text-left list-none">
                <span className="text-base font-medium text-foreground">
                  {faq.question}
                </span>
                <svg
                  className="size-5 shrink-0 text-zinc-500 transition-transform duration-200 group-open:rotate-180"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
