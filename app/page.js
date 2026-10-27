import LeadForm from '@/components/LeadForm';

export default function Home() {
  return (
    <main className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:items-start lg:py-20">
      <section className="lg:sticky lg:top-20">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Free consultation</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Buying, selling or renting? Let&apos;s talk.
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Share a few details and one of our local agents will reach out within one business day.
        </p>
        <ul className="mt-6 space-y-3 text-slate-700">
          {['Local market expertise', 'No obligation, no pressure', 'Your details are never shared'].map((item) => (
            <li key={item} className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                ✓
              </span>
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section id="contact">
        <LeadForm />
      </section>
    </main>
  );
}
