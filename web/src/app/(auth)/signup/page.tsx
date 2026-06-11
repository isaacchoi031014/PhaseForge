import Link from "next/link";

import { signup } from "@/app/(auth)/actions";

const labelCls =
  "font-label-cosmic mb-2 block text-[10px] uppercase tracking-widest text-[#c4c7c8]";
const inputCls =
  "font-body-cosmic w-full rounded-lg border border-[#444748]/40 bg-[#1b1c1d] px-4 py-3 text-sm text-[#e3e2e3] outline-none transition placeholder:text-[#c4c7c8]/40 focus:border-white/40 focus:ring-1 focus:ring-white/20";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="glass-panel rounded-2xl p-8 shadow-[inset_0_0_90px_rgba(46,64,140,0.14)] sm:p-10">
      <h1 className="font-display text-3xl">Create your account</h1>
      <p className="mt-2 text-sm text-[#c4c7c8]">
        For instructors building adaptive assessments.
      </p>

      <form action={signup} className="mt-8 flex flex-col gap-5">
        {error && (
          <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}
        <div>
          <label htmlFor="name" className={labelCls}>
            Full name
          </label>
          <input
            id="name"
            name="name"
            placeholder="Jane Doe"
            required
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="institution" className={labelCls}>
            Institution
          </label>
          <input
            id="institution"
            name="institution"
            placeholder="State University"
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="email" className={labelCls}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="you@university.edu"
            autoComplete="email"
            required
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="password" className={labelCls}>
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={6}
            required
            className={inputCls}
          />
        </div>
        <button
          type="submit"
          className="active-glow mt-2 w-full rounded-xl bg-white py-3 text-sm font-semibold text-[#16181a] transition hover:opacity-90 active:scale-[0.98]"
        >
          Sign up
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-[#c4c7c8]/80">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-[#e3e2e3] underline-offset-4 hover:underline"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
