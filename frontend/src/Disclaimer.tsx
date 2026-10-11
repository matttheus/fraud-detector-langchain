const IGNORED_IMPROVEMENTS = [
  'Synchronous requests (the LLM fraud review runs inside the HTTP request, with no queue)',
  'Authentication',
  'Domain level custom exceptions',
  'Timezone support',
  'Full project test coverage',
  'Production setup',
  'Hardening configurations',
  'External storage for rate limit (counters are kept in memory)',
  'HTTP client layer for frontend',
  'Any other best practice for a modern fullstack web application',
]

const MODEL_CONCERNS = [
  {
    label: 'Not specialized',
    text: "it isn't trained on fraud patterns or on your own transaction data. Production systems use dedicated models (for example gradient-boosted trees or graph models) trained on labeled fraud and chargeback history.",
  },
  {
    label: 'Slow',
    text: 'each review here takes about 6 to 10 seconds (two model calls plus reasoning). Card authorization usually has to answer in well under a second.',
  },
  {
    label: 'Expensive at scale',
    text: 'about $0.017 per review in this project (around 2,900 input and 300 output tokens). Millions of payments a day would cost thousands of dollars a day, where a traditional model costs a fraction of a cent per decision.',
  },
  {
    label: 'Non-deterministic',
    text: 'the same payment can get a different decision or risk score on another run, which makes results hard to reproduce, test and audit.',
  },
  {
    label: 'Uncalibrated scores',
    text: "the risk score is the model's opinion, not a measured probability, so thresholds can't be tuned against real fraud rates.",
  },
  {
    label: "Explanations aren't guaranteed to be faithful",
    text: 'the reasons are generated text that sounds plausible, not a trace of how the decision was made.',
  },
  {
    label: 'Attack surface',
    text: 'customer-controlled text, like the merchant name, goes into the prompt. Fraudsters can attempt prompt injection, or probe the model to learn what gets through.',
  },
  {
    label: "Doesn't learn from outcomes",
    text: "confirmed fraud and chargebacks don't feed back into it, while traditional models are retrained on them.",
  },
  {
    label: 'External dependency',
    text: 'outages, rate limits, latency spikes and safety refusals at the provider directly affect payments.',
  },
  {
    label: 'Data privacy',
    text: "customers' financial history is sent to a third-party API, which raises data protection and residency questions (LGPD, GDPR).",
  },
  {
    label: 'Behavior can change',
    text: 'providers update and retire models, so decisions can shift and the system needs to be re-validated each time.',
  },
]

export function Disclaimer() {
  return (
    <aside className="disclaimer" aria-label="Disclaimer">
      <p>
        <strong>Disclaimer:</strong> this is a didactic project. Its main purpose is to exercise the use and
        understanding of LangChain. It is not meant to be a production-ready application.
      </p>
      <p>Improvements that I deliberately ignored:</p>
      <ul>
        {IGNORED_IMPROVEMENTS.map((improvement) => (
          <li key={improvement}>{improvement}</li>
        ))}
      </ul>
      <p>
        <strong>Why the model used here is not recommended for production:</strong> the fraud review uses Claude Opus
        5.5, a general-purpose LLM. Neither it nor any similar model is a good fit for real-time fraud decisions:
      </p>
      <ul>
        {MODEL_CONCERNS.map(({ label, text }) => (
          <li key={label}>
            <strong>{label}:</strong> {text}
          </li>
        ))}
      </ul>
      <p>I just want to explore the use of LangChain.</p>
    </aside>
  )
}
