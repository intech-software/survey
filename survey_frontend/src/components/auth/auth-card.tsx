import Image from "next/image";

type AuthCardProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

// Shared frame for the login, register and forgot-password pages.
export default function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 px-4 py-8">
      <div className="w-full max-w-md flex flex-col p-6 bg-white rounded-lg shadow-lg">
        <Image
          src="/logo.png"
          alt="Tecova"
          width={220}
          height={50}
          priority
          className="mx-auto mb-4 h-auto w-[200px]"
        />
        <h1 className="text-2xl font-bold text-center">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-gray-500 text-center">{description}</p>
        )}
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
