'use client';

import React, { useState, useRef, useEffect } from 'react';
import SignaturePad from 'signature_pad';
import { generateInspectionPDF } from '@/lib/pdfGenerator';
import { uploadRowToSheet } from '@/lib/sheetsUploader';
import { Listbox } from '@headlessui/react';
import Image from 'next/image';
import logo from '@/images/logo.jpeg';

interface DefectRow {
    defectType: string;
    minor: number;
    major: number;
    images: File[];
}

const categories = ['Men', 'Women', 'Fragrances', 'Home Textile', 'Ladies', 'Salt'];

export default function FinalInspectionForm() {
    const [formData, setFormData] = useState<any>({
        date: '',
        productCategory: '',
        supplierName: '',
        itemDescription: '',
        designNo: '',
        colour: '',
        checkerName: '',
        fabricQuality: '',
        merchandiserName: '',
        orderQuantity: '',
        presentedQuantity: '',
        piecesInspected: '',
        deliveryDate: '',
        samplingRange: '',
        inlineInspection: '',
        inlinePictures: [] as File[],
        ppApproved: '',
        ppPictures: [] as File[],
        packingList: '',
        packingListPictures: [] as File[],
        poSame: '',
        poPictures: [] as File[],
        storageOk: '',
        storagePictures: [] as File[],
        testReportAvailable: '',
        testReportPictures: [] as File[],
        totalCartons: '',
        inspectedCartons: '',
        cartonPictures: [] as File[],
        defects: [] as DefectRow[],
        totalMinor: 0,
        totalMajor: 0,
        inspectionResult: '',
        finalComments: '',
        qcSignature: '',
        supplierSignature: '',
        aqmSignature: '',
        merchSignature: '',
    });

    const padRefs = {
        qc: useRef<HTMLCanvasElement>(null),
        supplier: useRef<HTMLCanvasElement>(null),
        aqm: useRef<HTMLCanvasElement>(null),
        merch: useRef<HTMLCanvasElement>(null),
    };

    const pads = useRef<any>({});
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        Object.entries(padRefs).forEach(([role, ref]) => {
            const canvas = ref.current;
            if (canvas) {
                const ratio = window.devicePixelRatio || 1;
                canvas.width = canvas.offsetWidth * ratio;
                canvas.height = canvas.offsetHeight * ratio;
                canvas.getContext('2d')?.scale(ratio, ratio);
                pads.current[role] = new SignaturePad(canvas, {
                    backgroundColor: '#fff',
                    penColor: '#111',
                });
            }
        });
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev: any) => ({ ...prev, [name]: value }));
    };

    const handleMultiFile = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
        const files = e.target.files;
        if (!files) return;
        setFormData((prev: any) => ({ ...prev, [field]: Array.from(files) }));
    };

    const addDefect = () =>
        setFormData((prev: any) => ({
            ...prev,
            defects: [...prev.defects, { defectType: '', minor: 0, major: 0, images: [] }],
        }));

    const updateDefectField = (index: number, field: keyof DefectRow, value: any) => {
        const defects = [...formData.defects];
        defects[index] = { ...defects[index], [field]: value };
        setFormData((prev: any) => ({ ...prev, defects }));
    };

    useEffect(() => {
        const totalMinor = formData.defects.reduce((sum: number, d: DefectRow) => sum + (d.minor || 0), 0);
        const totalMajor = formData.defects.reduce((sum: number, d: DefectRow) => sum + (d.major || 0), 0);
        setFormData((prev: any) => ({ ...prev, totalMinor, totalMajor }));
    }, [formData.defects]);

    const clearPad = (role: keyof typeof padRefs) => {
        pads.current[role]?.clear();
        setFormData((prev: any) => ({ ...prev, [`${role}Signature`]: '' }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setUploading(true);

        try {
            // 1) gather signatures as before
            const signatures: any = {};
            (Object.keys(pads.current) as Array<keyof typeof padRefs>).forEach(role => {
                if (!pads.current[role].isEmpty()) {
                    signatures[`${role}Signature`] = pads.current[role].toDataURL("image/png");
                }
            });

            // 2) generate PDF bytes in browser
            const fullData = { ...formData, ...signatures };
            const pdfBytes = await generateInspectionPDF(fullData);
            const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });

            // 3) create a friendly base name for uniqueness (server will add timestamp+rand)
            const baseName =
                `${formData.designNo || "inspection"}_${(formData.date || "").replaceAll("-", "")}`
                    .replace(/\s+/g, "-");

            // 4) upload to server -> get permanent URL back
            const fd = new FormData();
            fd.append("file", pdfBlob, "inspection.pdf"); // the “name” here doesn’t matter much
            fd.append("name", baseName);

            const res = await fetch("/api/upload", { method: "POST", body: fd });
            if (!res.ok) throw new Error("Upload failed");
            const { fileUrl } = await res.json();

            // 5) save the permanent URL and send to Sheet
            formData.fileLink = fileUrl;
            await uploadRowToSheet(formData);

            // 6) trigger instant download for customer
            // Option A: navigate directly to file (browser will show/view PDF)
            // window.location.href = fileUrl;

            // Option B: force download via an anchor
            const a = document.createElement("a");
            a.href = fileUrl;
            a.download = ""; // letting browser infer name from URL
            document.body.appendChild(a);
            a.click();
            a.remove();

            alert("✅ PDF generated, uploaded, and downloaded!");
        } catch (err) {
            console.error("❌ Submit failed:", err);
            alert("❌ Something went wrong while creating or uploading the PDF.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <main className="bg-gray-50 py-12 px-4 sm:px-8 lg:px-12">
            <div className="max-w-5xl mx-auto bg-white p-8 rounded-lg shadow-md ring-1 ring-gray-200">
                {/* Logo + Header */}
                <div className="flex justify-start items-center mb-8">
                    <Image src={logo} alt="Logo" width={140} height={50} />
                    <h1 className="ml-4 text-3xl font-bold text-gray-900">Final Inspection Form</h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-10">
                    {/* General Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[
                            ['Inspection Date', 'date', 'date'],
                            ['Supplier Name', 'supplierName'],
                            ['Item Description', 'itemDescription'],
                            ['Design No.', 'designNo'],
                            ['Colour', 'colour'],
                            ['Inspector Name', 'checkerName'],
                            ['Fabric Quality', 'fabricQuality'],
                            ['Merchandiser Name', 'merchandiserName'],
                            ['Delivery Date', 'deliveryDate', 'date'],
                            ['Order Quantity', 'orderQuantity'],
                            ['Presented Quantity', 'presentedQuantity'],
                            ['Pieces Inspected', 'piecesInspected'],
                        ].map(([label, name, type = 'text']) => (
                            <label key={name} className="block text-sm font-medium text-gray-700">
                                {label}
                                <input
                                    type={type}
                                    name={name}
                                    value={formData[name]}
                                    onChange={handleChange}
                                    className="mt-1 w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                />
                            </label>
                        ))}
                        

                        {/* Sampling Range Table */}
                        <div className="bg-white p-6 rounded-lg shadow ring-1 ring-gray-200">
                            <h2 className="text-lg font-semibold mb-4 text-gray-800">
                                Sampling Range Table
                            </h2>
                            <table className="w-full text-sm text-center border border-gray-300 rounded-md overflow-hidden">
                                <thead className="bg-gray-50 text-gray-700">
                                    <tr>
                                        <th className="border px-3 py-2">Select</th>
                                        <th className="border px-3 py-2">Range</th>
                                        <th className="border px-3 py-2">Inspect</th>
                                        <th className="border px-3 py-2">Pass</th>
                                        <th className="border px-3 py-2">Reject</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { range: '51–90', inspect: 13, pass: 1, reject: 2 },
                                        { range: '91–150', inspect: 20, pass: 1, reject: 2 },
                                        { range: '151–280', inspect: 32, pass: 2, reject: 3 },
                                        { range: '281–500', inspect: 50, pass: 3, reject: 4 },
                                        { range: '501–1200', inspect: 80, pass: 5, reject: 6 },
                                        { range: '1201–3200', inspect: 125, pass: 7, reject: 8 },
                                        { range: '3201–10000', inspect: 200, pass: 10, reject: 11 },
                                    ].map((opt) => (
                                        <tr
                                            key={opt.range}
                                            className={`transition hover:bg-indigo-50 ${formData.samplingRange === opt.range ? 'bg-indigo-100' : ''
                                                }`}
                                        >
                                            <td className="border px-2 py-2">
                                                <input
                                                    type="radio"
                                                    name="samplingRange"
                                                    value={opt.range}
                                                    checked={formData.samplingRange === opt.range}
                                                    onChange={handleChange}
                                                    className="accent-indigo-600"
                                                />
                                            </td>
                                            <td className="border px-2 py-2 font-medium text-gray-700">{opt.range}</td>
                                            <td className="border px-2 py-2">{opt.inspect}</td>
                                            <td className="border px-2 py-2">{opt.pass}</td>
                                            <td className="border px-2 py-2">{opt.reject}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>


                        {/* Product Category (Listbox) */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Product Category
                            </label>
                            <Listbox
                                value={formData.productCategory}
                                onChange={(v) => setFormData((prev: any) => ({ ...prev, productCategory: v }))}
                            >
                                <div className="relative">
                                    <Listbox.Button className="w-full rounded-md border border-gray-300 px-4 py-2 text-left shadow-sm focus:ring-2 focus:ring-indigo-500">
                                        {formData.productCategory || 'Select Category'}
                                    </Listbox.Button>
                                    <Listbox.Options className="absolute mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
                                        {categories.map((cat) => (
                                            <Listbox.Option
                                                key={cat}
                                                value={cat}
                                                className="cursor-pointer px-4 py-2 hover:bg-indigo-100"
                                            >
                                                {cat}
                                            </Listbox.Option>
                                        ))}
                                    </Listbox.Options>
                                </div>
                            </Listbox>
                        </div>
                    </div>

                    {/* Evaluation Sections */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[
                            ['Inline Inspection Done?', 'inlineInspection', 'inlinePictures'],
                            ['PP Sample Approved?', 'ppApproved', 'ppPictures'],
                            ['Packing List Available?', 'packingList', 'packingListPictures'],
                            ['PO Same?', 'poSame', 'poPictures'],
                            ['Storage OK?', 'storageOk', 'storagePictures'],
                            ['Test Report Available?', 'testReportAvailable', 'testReportPictures'],
                        ].map(([label, field, upload]) => (
                            <div key={field}>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                                <select
                                    name={field}
                                    value={formData[field]}
                                    onChange={handleChange}
                                    className="w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm"
                                >
                                    <option value="">Select</option>
                                    <option value="Yes">Yes</option>
                                    <option value="No">No</option>
                                </select>
                                {formData[field] === 'Yes' && (
                                    <input
                                        type="file"
                                        multiple
                                        onChange={(e) => handleMultiFile(e, upload)}
                                        className="mt-2 w-full text-sm text-gray-700 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                    />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Cartons */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            ['Total Cartons', 'totalCartons'],
                            ['Inspected Cartons', 'inspectedCartons'],
                        ].map(([label, name]) => (
                            <label key={name} className="block text-sm font-medium text-gray-700">
                                {label}
                                <input
                                    type="number"
                                    name={name}
                                    value={formData[name]}
                                    onChange={handleChange}
                                    className="mt-1 w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm"
                                />
                            </label>
                        ))}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Upload Carton Images
                            </label>
                            <input
                                type="file"
                                multiple
                                onChange={(e) => handleMultiFile(e, 'cartonPictures')}
                                className="mt-1 w-full text-sm file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                            />
                        </div>
                    </div>

                    {/* Defect Table */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4 text-gray-800">Defects</h3>
                        {formData.defects.map((def: DefectRow, i: number) => (
                            <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                <input
                                    type="text"
                                    placeholder="Defect Type"
                                    value={def.defectType}
                                    onChange={(e) => updateDefectField(i, 'defectType', e.target.value)}
                                    className="rounded-md border border-gray-300 px-3 py-2"
                                />
                                <input
                                    type="number"
                                    placeholder="Minor"
                                    value={def.minor}
                                    onChange={(e) => updateDefectField(i, 'minor', +e.target.value || 0)}
                                    className="rounded-md border border-gray-300 px-3 py-2"
                                />
                                <input
                                    type="number"
                                    placeholder="Major"
                                    value={def.major}
                                    onChange={(e) => updateDefectField(i, 'major', +e.target.value || 0)}
                                    className="rounded-md border border-gray-300 px-3 py-2"
                                />
                                <input
                                    type="file"
                                    multiple
                                    onChange={(e) =>
                                        updateDefectField(i, 'images', Array.from(e.target.files || []))
                                    }
                                />
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={addDefect}
                            className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                        >
                            Add Defect
                        </button>
                    </div>

                    {/* Results */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <label className="block text-sm font-medium text-gray-700">
                            Inspection Result
                            <select
                                name="inspectionResult"
                                value={formData.inspectionResult}
                                onChange={handleChange}
                                className="mt-1 w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm"
                            >
                                <option value="">Select Result</option>
                                <option value="PASS">PASS</option>
                                <option value="REWORK">REWORK</option>
                                <option value="HOLD">HOLD</option>
                                <option value="REJECT">REJECT</option>
                            </select>
                        </label>
                        <label className="block text-sm font-medium text-gray-700">
                            Final Comments
                            <textarea
                                name="finalComments"
                                value={formData.finalComments}
                                onChange={handleChange}
                                rows={4}
                                className="mt-1 w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm resize-y"
                            />
                        </label>
                    </div>

                    {/* Signatures */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {(['qc', 'supplier', 'aqm', 'merch'] as const).map((role) => (
                            <div key={role}>
                                <label className="block text-sm font-medium text-gray-700 capitalize">
                                    {role} Signature
                                </label>
                                <canvas
                                    ref={padRefs[role]}
                                    className="border border-gray-300 rounded-md w-full h-32 bg-white"
                                />
                                <button
                                    type="button"
                                    onClick={() => clearPad(role)}
                                    className="mt-2 text-sm text-red-500 hover:underline"
                                >
                                    Clear Signature
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Submit Button */}
                    <div className="pt-6">
                        <button
                            type="submit"
                            disabled={uploading}
                            className={`w-full py-3 px-6 rounded-md font-semibold shadow-md transition ${uploading
                                    ? 'bg-gray-400 text-white cursor-not-allowed'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                }`}
                        >
                            {uploading ? 'Uploading...' : 'Submit Final Inspection Report'}
                        </button>
                    </div>
                </form>
            </div>
        </main>
    );
}
