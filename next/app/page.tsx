import { Suspense } from "react";
import AuthButton from "./components/AuthButton";
import AuthStatus from "./components/AuthStatus";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-center py-32 px-16 bg-white dark:bg-black">
        <div className="flex flex-col items-center gap-8 text-center w-full">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-black dark:text-zinc-50">
            Авторизация через Last.fm
          </h1>
          
          <Suspense fallback={null}>
            <AuthStatus />
          </Suspense>
          
          <AuthButton />
        </div>
      </main>
    </div>
  );
}
