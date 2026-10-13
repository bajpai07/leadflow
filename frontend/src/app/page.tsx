import { AppHeader } from "@/components/AppHeader";
import { LeadBoard } from "@/components/leads/LeadBoard";

export default function Home() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-[1000px] flex-1 px-4 py-6">
        <LeadBoard />
      </main>
    </>
  );
}
