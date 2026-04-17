import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "What documents do I need to open an account?",
    answer: "You'll need a valid government-issued ID, proof of address (utility bill or bank statement), and two passport-sized photos. For business accounts, additional business registration documents are required.",
  },
  {
    question: "How long does the loan approval process take?",
    answer: "Our streamlined process typically takes 24-48 hours for loan approval. Once approved, funds can be disbursed within 1-3 business days depending on the loan type and amount.",
  },
  {
    question: "What are the interest rates for savings accounts?",
    answer: "Our savings accounts offer competitive rates starting at 4.5% APY. Rates may vary based on account balance and type. Check with our representatives for current rates and special promotions.",
  },
  {
    question: "Can I access my account online?",
    answer: "Yes! Our internet banking platform and mobile app allow you to access your accounts 24/7, make transfers, pay bills, and manage your finances from anywhere.",
  },
  {
    question: "What is the minimum loan amount I can apply for?",
    answer: "Our microloans start from as low as $500, making financial assistance accessible to everyone. Maximum loan amounts depend on your credit profile and repayment capacity.",
  },
  {
    question: "Are my deposits insured?",
    answer: "Yes, all deposits are insured up to the maximum amount specified by the Deposit Insurance Corporation, ensuring your money is safe and secure.",
  },
];

const FAQ = () => {
  return (
    <section className="bg-[#f8f9fa] py-12 md:bg-secondary/30 md:py-24">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8 md:mb-16 md:text-center animate-fade-in">
            <h2 className="text-[18px] font-bold text-[var(--bank-navy)] md:text-4xl lg:text-5xl md:text-foreground">
              Frequently Asked Questions
            </h2>
            <p className="mt-2 text-[11px] leading-5 text-[var(--bank-muted)] md:mt-6 md:text-xl md:text-muted-foreground">
              Find answers to common questions about our services
            </p>
          </div>

          <div className="divide-y divide-slate-200 rounded-2xl bg-transparent md:hidden">
            {faqs.map((faq) => (
              <div key={faq.question} className="py-4">
                <h3 className="text-[12px] font-semibold text-[var(--bank-navy)]">{faq.question}</h3>
                <p className="mt-2 text-[11px] leading-6 text-[var(--bank-muted)]">{faq.answer}</p>
              </div>
            ))}
          </div>

          <Accordion type="single" collapsible className="hidden md:block space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card border border-border rounded-lg px-6 animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <AccordionTrigger className="text-lg font-semibold hover:text-primary">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
