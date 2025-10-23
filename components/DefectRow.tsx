'use client';

import React, { useState } from 'react';

type Defect = {
  type: string;
  minor: string;
  major: string;
  image: File | null;
};

export default function DefectsSection() {
  const [defects, setDefects] = useState<Defect[]>([
    { type: '', minor: '', major: '', image: null },
  ]);

  const handleUpdate = (index: number, updated: Partial<Defect>) => {
    const newDefects = [...defects];
    newDefects[index] = { ...newDefects[index], ...updated };
    setDefects(newDefects);
  };

  const handleAddDefect = () => {
    setDefects([...defects, { type: '', minor: '', major: '', image: null }]);
  };

  return (
    <div className="border p-4 rounded bg-gray-50">
      <h2 className="font-semibold text-lg mb-3">Defects</h2>

      {/* Header Row */}
      <div className="grid grid-cols-3 md:grid-cols-4 font-semibold text-gray-700 border-b pb-1 mb-2">
        <span>Defect Type</span>
        <span>Minor</span>
        <span>Major</span>
        <span className="hidden md:block">Image</span>
      </div>

      {/* Defect Rows */}
      {defects.map((defect, index) => (
        <div
          key={index}
          className="grid grid-cols-3 md:grid-cols-4 gap-4 mb-2 border-b pb-2"
        >
          <input
            type="text"
            placeholder="Defect Type"
            value={defect.type}
            onChange={(e) => handleUpdate(index, { type: e.target.value })}
            className="border p-2 rounded"
            required
          />
          <input
            type="number"
            placeholder="Minor"
            value={defect.minor}
            onChange={(e) => handleUpdate(index, { minor: e.target.value })}
            className="border p-2 rounded"
            required
          />
          <input
            type="number"
            placeholder="Major"
            value={defect.major}
            onChange={(e) => handleUpdate(index, { major: e.target.value })}
            className="border p-2 rounded"
            required
          />
          <input
            type="file"
            accept="image/*"
            onChange={(e) =>
              handleUpdate(index, { image: e.target.files?.[0] || null })
            }
            className="p-2"
          />
        </div>
      ))}

      <button
        type="button"
        onClick={handleAddDefect}
        className="mt-3 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
      >
        Add Defect
      </button>
    </div>
  );
}



