import { LoginForm } from '@/components/admin/LoginForm';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center bg-ink px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3 text-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://res.cloudinary.com/dtvjiura5/image/upload/f_auto,q_auto,w_400,c_limit/v1791837791/coastal-carnival/wildlings-logo-transparent" alt="" className="h-11 w-9 object-contain invert" />
          <div>
            <p className="text-sm font-extrabold tracking-[.1em]">EVENT DASHBOARD</p>
            <p className="text-xs text-white/60">Organiser sign in</p>
          </div>
        </div>
        <LoginForm next={next?.startsWith('/admin') ? next : '/admin'} />
      </div>
    </main>
  );
}
