// app/page.tsx
'use client';

import React from 'react';
import FinalInspectionForm from '@/components/FinalInspectionForm';

export default function HomePage() {
  return (
    <main className="max-w-5xl mx-auto bg-white p-8 rounded shadow-md">
      <h1 className="text-2xl font-bold mb-6">Final Inspection Form</h1>
      <FinalInspectionForm />
    </main>
  );
}
