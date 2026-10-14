"use client";

import { useState } from "react";

import { AppHeader } from "@/components/AppHeader";
import { AddLeadDialog } from "@/components/leads/AddLeadDialog";
import { LeadBoard } from "@/components/leads/LeadBoard";

export function LeadWorkspace() {
  const [isAddingLead, setIsAddingLead] = useState(false);

  return (
    <>
      <AppHeader onAddLead={() => setIsAddingLead(true)} />
      <main className="mx-auto w-full max-w-[1000px] flex-1 px-4 py-6">
        <LeadBoard />
      </main>
      {isAddingLead ? (
        <AddLeadDialog onClose={() => setIsAddingLead(false)} />
      ) : null}
    </>
  );
}
