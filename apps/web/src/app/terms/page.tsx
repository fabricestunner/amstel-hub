import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const SECTIONS = [
  {
    title: 'Eligibility',
    body: 'The platform is intended for individuals who are at least 18 years of age and legally eligible to participate in the campaign and tournament. Participation may be limited to residents of Rwanda unless otherwise communicated by the organizer.',
  },
  {
    title: 'Account Registration',
    body: 'Users must provide accurate and complete information during registration and keep their account credentials secure. The organizer may suspend or terminate accounts that contain false information or are used fraudulently.',
  },
  {
    title: 'Tournament Participation',
    body: 'Registering on the platform does not automatically guarantee participation in the tournament. Participation remains subject to eligibility verification, available capacity, and compliance with tournament rules.',
  },
  {
    title: 'Loyalty Points',
    body: 'Users may earn loyalty points through qualifying purchases of Amstel products at participating outlets. Points are awarded only after successful verification where applicable. Points cannot be transferred, exchanged for cash, or sold and may expire at the end of the campaign.',
  },
  {
    title: 'Reward Redemption',
    body: 'Rewards are subject to availability and may only be redeemed after the required number of points has been accumulated. The organizer reserves the right to substitute rewards with alternatives of equal or greater value where necessary.',
  },
  {
    title: 'Responsible Use',
    body: 'Users agree not to misuse the platform, create multiple accounts, manipulate the points system, or engage in fraudulent activity. Violations may result in account suspension, loss of points, or disqualification.',
  },
  {
    title: 'Communications',
    body: 'Users may receive essential notifications relating to their account, tournament participation, points balance, rewards, and campaign updates.',
  },
  {
    title: 'Intellectual Property',
    body: 'All platform content, including logos, graphics, text, software, and trademarks, remains the property of the organizer or its licensors and may not be reproduced without permission.',
  },
  {
    title: 'Platform Availability',
    body: 'The organizer does not guarantee uninterrupted access to the platform and shall not be responsible for temporary outages or technical failures beyond its control.',
  },
  {
    title: 'Fraud Prevention',
    body: 'The organizer reserves the right to investigate suspicious activity and suspend accounts while investigations are conducted. Fraudulent activity may lead to permanent disqualification.',
  },
  {
    title: 'Limitation of Liability',
    body: 'To the maximum extent permitted by law, the organizer shall not be liable for indirect or consequential losses arising from participation in the platform, tournament, or rewards programme.',
  },
  {
    title: 'Changes to These Terms',
    body: 'These Terms and Conditions may be updated from time to time. Continued use of the platform after updates constitutes acceptance of the revised Terms.',
  },
  {
    title: 'Termination',
    body: 'The organizer may suspend or terminate access to the platform for users who breach these Terms and Conditions.',
  },
  {
    title: 'Governing Law',
    body: 'These Terms and Conditions shall be governed by the laws of the Republic of Rwanda, and any disputes shall be resolved by the competent courts of Rwanda.',
  },
  {
    title: 'Contact',
    body: 'Questions regarding the platform or these Terms and Conditions should be directed to the campaign support contact details provided on the platform.',
  },
  {
    title: 'Acceptance',
    body: "By selecting the checkbox labelled 'I have read and agree to the Terms and Conditions,' you confirm that you have read, understood, and accepted these Terms.",
  },
] as const;

export default function TermsPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b bg-white/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-white/70 sm:px-6 md:px-8 dark:bg-card/90">
        <Link
          href="/"
          aria-label="Amstel Rewards home"
          className="inline-flex items-center gap-2.5"
        >
          <Image
            src="/amstel-logo.jpg"
            alt="Amstel"
            width={32}
            height={32}
            className="rounded-full"
            priority
          />
          <span className="hidden text-sm font-extrabold tracking-tight text-amstel-gradient sm:inline">
            AMSTEL REWARDS
          </span>
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-amstel-red"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </header>

      <main className="flex-1">
        <div className="container max-w-3xl py-12 md:py-16">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Terms and Conditions
          </h1>
          <p className="mt-4 text-muted-foreground">
            Welcome to the Amstel Pool Tournament &amp; Rewards Platform. By
            creating an account or using this platform, you agree to these
            Terms and Conditions. If you do not agree, please do not register
            or use the platform.
          </p>

          <div className="mt-10 space-y-8">
            {SECTIONS.map((section) => (
              <section key={section.title}>
                <h2 className="text-lg font-semibold tracking-tight text-amstel-red">
                  {section.title}
                </h2>
                <p className="mt-2 leading-relaxed text-muted-foreground">
                  {section.body}
                </p>
              </section>
            ))}
          </div>

          <p className="mt-12 text-xs text-muted-foreground">
            Last updated: {new Date().getFullYear()}
          </p>
        </div>
      </main>

      <footer className="border-t">
        <div className="container flex flex-col items-center justify-between gap-2 py-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} Amstel Rewards. All rights reserved.</p>
          <Link href="/privacy" className="font-medium hover:text-foreground">
            Privacy Policy
          </Link>
        </div>
      </footer>
    </div>
  );
}
