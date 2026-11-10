import Image from "next/image";
import Link from "next/link";

export type PolicySection = {
  title: string;
  body: string;
};

type PolicyPageProps = {
  title: string;
  updatedAt: string;
  sections: PolicySection[];
  related: { href: string; label: string };
};

// Shared layout for the Terms of Use and Privacy Policy pages.
export default function PolicyPage({
  title,
  updatedAt,
  sections,
  related,
}: PolicyPageProps) {
  return (
    <main className="min-h-screen bg-blue-50 px-4 py-8 text-gray-900">
      <div className="mx-auto max-w-4xl rounded-md border border-gray-200 bg-white p-6 shadow-md md:p-8">
        <div className="border-b border-gray-200 pb-4">
          <Image
            src="/logo.png"
            alt="Tecova"
            width={160}
            height={37}
            className="h-auto w-[140px]"
          />
          <p className="mt-4 text-sm font-medium text-blue-600">Tecova Survey</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-950">{title}</h1>
          <p className="mt-2 text-sm text-gray-500">
            Cập nhật lần cuối: {updatedAt}
          </p>
        </div>

        <div className="mt-6 space-y-6 leading-7 text-gray-700">
          {sections.map((section, index) => (
            <section key={section.title}>
              <h2 className="text-xl font-semibold text-gray-950">
                {index + 1}. {section.title}
              </h2>
              <p className="mt-2">{section.body}</p>
            </section>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-4 border-t border-gray-200 pt-4 text-sm">
          <Link href="/login" className="text-blue-500 hover:underline">
            ← Quay lại đăng nhập
          </Link>
          <Link href={related.href} className="text-blue-500 hover:underline">
            {related.label}
          </Link>
        </div>
      </div>
    </main>
  );
}
