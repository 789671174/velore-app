import { redirect } from 'next/navigation';
export default function Page({ searchParams }: { searchParams: { t?: string } }) {
  const t = searchParams.t ?? '';
  redirect(\/entrepreneur?t=\#settings\);
}