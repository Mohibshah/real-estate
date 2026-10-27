import './globals.css';

export const metadata = {
  title: 'Find Your Next Home | Contact an Agent',
  description: 'Tell us what you are looking for and a local real estate agent will get in touch.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">{children}</body>
    </html>
  );
}
