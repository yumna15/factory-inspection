'use client';

import React, { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';

type Props = {
  onSave: (dataUrl: string) => void;
};

export default function SignaturePad({ onSave }: Props) {
  const sigRef = useRef<SignatureCanvas>(null);

  const clear = () => {
    sigRef.current?.clear();
    onSave('');
  };

  const save = () => {
    if (!sigRef.current || sigRef.current.isEmpty()) {
      alert('Please sign first.');
      return;
    }

    const dataUrl = sigRef.current!.toDataURL(); // 👈 fixed here
    onSave(dataUrl);
  };

  return (
    <div className="mb-4">
      <h2 className="font-bold mb-2">Signature</h2>
      <div className="border border-gray-300">
        <SignatureCanvas
          penColor="black"
          canvasProps={{ width: 400, height: 150, className: 'bg-white' }}
          ref={sigRef}
        />
      </div>
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={clear} className="px-3 py-1 bg-gray-500 text-white rounded">Clear</button>
        <button type="button" onClick={save} className="px-3 py-1 bg-green-600 text-white rounded">Save</button>
      </div>
    </div>
  );
}
