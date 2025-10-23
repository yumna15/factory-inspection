'use client';

import React, { useState } from 'react';

type Props = {
  onUpload: (files: File[]) => void;
};

export default function ImageUploader({ onUpload }: Props) {
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    onUpload(fileArray);

    const urls = fileArray.map(file => URL.createObjectURL(file));
    setPreviewUrls(urls);
  };

  return (
    <div className="mb-4">
      <h2 className="font-bold mb-2">Upload Images</h2>
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={handleChange}
        className="mb-2"
      />
      <div className="grid grid-cols-3 gap-2">
        {previewUrls.map((url, index) => (
          <img key={index} src={url} alt={`Preview ${index + 1}`} className="w-full h-auto rounded shadow" />
        ))}
      </div>
    </div>
  );
}
