import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const SECTIONS = [
  {
    title: 'Information We Collect',
    body: 'We may collect your full name, phone number, email address, date of birth, gender, district or location, account details, purchase and points history, tournament registrations, and any information you voluntarily provide.',
  },
  {
    title: 'How We Use Your Information',
    body: 'Your information is used to create and manage your account, verify purchases, award loyalty points, administer the tournament, process reward redemptions, provide customer support, prevent fraud, improve the platform, and communicate campaign updates.',
  },
  {
    title: 'Legal Basis',
    body: 'By registering and using the platform, you consent to the processing of your personal information for the purposes described in this policy.',
  },
  {
    title: 'Sharing Your Information',
    body: 'Your information may be shared with Bralirwa, authorized campaign agencies, technology providers, logistics partners, or service providers only where necessary to operate the campaign or where required by law.',
  },
  {
    title: 'Data Security',
    body: 'Reasonable technical and organizational measures are implemented to safeguard your personal information against unauthorized access, loss, misuse, or disclosure.',
  },
  {
    title: 'Data Retention',
    body: 'Your information will be retained only for as long as necessary to administer the campaign, meet legal obligations, resolve disputes, or enforce our agreements.',
  },
  {
    title: 'Cookies',
    body: 'The platform may use cookies and similar technologies to improve functionality, remember preferences, analyze usage, and enhance the user experience.',
  },
  {
    title: 'Your Rights',
    body: 'Where permitted by applicable law, you may request access to your personal information, request corrections, request deletion, or withdraw marketing consent without affecting essential service communications.',
  },
  {
    title: 'Marketing Communications',
    body: 'You may receive promotional SMS, email, or other marketing messages if you have consented. You may opt out at any time while continuing to receive important account notifications.',
  },
  {
    title: 'Children',
    body: 'The platform is intended only for persons aged 18 years and above. Personal information from minors is not knowingly collected.',
  },
  {
    title: 'Changes',
    body: 'This Privacy Policy may be updated from time to time. Updated versions will be published on the platform.',
  },
  {
    title: 'Contact',
    body: 'For questions or requests relating to your personal information, please contact the campaign support team using the contact information provided on the platform.',
  },
] as const;

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p className="mt-4 text-muted-foreground">
            This Privacy Policy explains how the Amstel Pool Tournament &amp;
            Rewards Platform collects, uses, stores, shares, and protects
            your personal information when you register or use the platform.
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
          <Link href="/terms" className="font-medium hover:text-foreground">
            Terms and Conditions
          </Link>
        </div>
      </footer>
    </div>
  );
}
