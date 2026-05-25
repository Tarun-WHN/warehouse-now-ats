'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Upload, FileText, Table, CheckCircle, AlertCircle,
  X, FileSpreadsheet, Loader2
} from 'lucide-react';

interface UploadResult {
  filename: string;
  candidate: { id: string; full_name: string; email: string; phone: string };
  parsed_fields: string[];
}

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [source, setSource] = useState('Manual Upload');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const [excelResult, setExcelResult] = useState<{ total_rows: number; imported: number; skipped: number; mapped_fields: string[] } | null>(null);
  const [excelUploading, setExcelUploading] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFiles = Array.from(e.dataTransfer.files).filter(f =>
      f.name.match(/\.(pdf|doc|docx|txt)$/i)
    );
    setFiles(prev => [...prev, ...droppedFiles]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setResults([]);

    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    formData.append('source', source);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      setResults(data.results);
      setFiles([]);
    } catch {
      alert('Upload failed. Please try again.');
    }
    setUploading(false);
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelUploading(true);
    setExcelResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload/excel', { method: 'POST', body: formData });
      const data = await res.json();
      setExcelResult(data);
    } catch {
      alert('Excel import failed. Please try again.');
    }
    setExcelUploading(false);
    if (excelInputRef.current) excelInputRef.current.value = '';
  };

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy">Upload Resumes</h1>
        <p className="text-text-secondary mt-1">Upload resumes individually or in bulk. Supports PDF, DOC, DOCX, and TXT files.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Resume Upload */}
        <div className="bg-white rounded-xl border border-whn-border p-6">
          <h2 className="font-semibold text-navy mb-4 flex items-center gap-2">
            <FileText size={20} />
            Resume Upload
          </h2>

          <div className="mb-4">
            <label className="text-sm text-text-secondary font-medium">Source</label>
            <select
              value={source}
              onChange={e => setSource(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-whn-border rounded-lg text-sm focus:ring-2 focus:ring-gold"
            >
              <option>Manual Upload</option>
              <option>Naukri</option>
              <option>Indeed</option>
              <option>iimjobs</option>
              <option>Email</option>
              <option>WhatsApp</option>
              <option>Referral</option>
              <option>Walk-in</option>
              <option>LinkedIn</option>
              <option>Shine</option>
              <option>Apna</option>
              <option>WorkIndia</option>
            </select>
          </div>

          <div
            className={`drop-zone rounded-xl p-8 text-center cursor-pointer mb-4 ${dragActive ? 'active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={40} className={`mx-auto mb-3 ${dragActive ? 'text-gold' : 'text-gray-300'}`} />
            <p className="text-sm font-medium text-navy">Drag & drop resumes here</p>
            <p className="text-xs text-text-secondary mt-1">or click to browse (PDF, DOC, DOCX, TXT)</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {files.length > 0 && (
            <div className="space-y-2 mb-4">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-navy" />
                    <span className="text-sm text-navy truncate max-w-[200px]">{f.name}</span>
                    <span className="text-xs text-text-secondary">({(f.size / 1024).toFixed(0)} KB)</span>
                  </div>
                  <button onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500">
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={files.length === 0 || uploading}
            className="w-full bg-gold text-navy-dark py-2.5 rounded-lg text-sm font-semibold hover:bg-gold-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Parsing & Uploading...
              </>
            ) : (
              <>
                <Upload size={16} />
                Upload {files.length} Resume{files.length !== 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>

        {/* Excel Import */}
        <div className="bg-white rounded-xl border border-whn-border p-6">
          <h2 className="font-semibold text-navy mb-4 flex items-center gap-2">
            <FileSpreadsheet size={20} />
            Excel / CSV Import
          </h2>
          <p className="text-sm text-text-secondary mb-4">
            Upload a spreadsheet with candidate data. The system auto-maps columns to fields.
            Supported columns: Name, Phone, Email, Location, Employer, Designation, CTC, Notice Period, etc.
          </p>

          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <p className="text-xs text-blue-800 font-medium mb-2">Expected Column Headers (flexible matching):</p>
            <div className="flex flex-wrap gap-1">
              {['Name', 'Phone', 'Email', 'Location', 'Employer', 'Designation', 'CTC', 'Expected CTC', 'Notice Period', 'DOB', 'Source', 'Status'].map(h => (
                <span key={h} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{h}</span>
              ))}
            </div>
          </div>

          <button
            onClick={() => excelInputRef.current?.click()}
            disabled={excelUploading}
            className="w-full border-2 border-dashed border-whn-border rounded-xl p-6 text-center hover:border-gold hover:bg-gold/5 transition-colors"
          >
            {excelUploading ? (
              <Loader2 size={24} className="mx-auto animate-spin text-gold" />
            ) : (
              <>
                <Table size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm font-medium text-navy">Click to upload Excel/CSV</p>
                <p className="text-xs text-text-secondary mt-1">Supports .xlsx, .xls, .csv</p>
              </>
            )}
          </button>
          <input
            ref={excelInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleExcelUpload}
            className="hidden"
          />

          {excelResult && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={18} className="text-green-600" />
                <p className="text-sm font-semibold text-green-800">Import Complete</p>
              </div>
              <div className="text-sm text-green-700 space-y-1">
                <p>Total rows: {excelResult.total_rows}</p>
                <p>Imported: {excelResult.imported}</p>
                {excelResult.skipped > 0 && <p>Skipped (no name/phone/email): {excelResult.skipped}</p>}
                <p className="text-xs mt-2">Mapped fields: {excelResult.mapped_fields.join(', ')}</p>
              </div>
              <a href="/candidates" className="text-sm text-green-800 font-medium mt-2 inline-block hover:underline">
                View Candidates →
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Upload Results */}
      {results.length > 0 && (
        <div className="bg-white rounded-xl border border-whn-border p-6">
          <h2 className="font-semibold text-navy mb-4 flex items-center gap-2">
            <CheckCircle size={20} className="text-green-500" />
            Upload Results ({results.length} resumes processed)
          </h2>
          <div className="space-y-3">
            {results.map((r, i) => (
              <div key={i} className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                  <CheckCircle size={16} className="text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-navy">{r.filename}</p>
                  <p className="text-sm text-text-secondary">
                    {r.candidate.full_name || 'Name not parsed'} • {r.candidate.email || 'No email'} • {r.candidate.phone || 'No phone'}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {r.parsed_fields.map(f => (
                      <span key={f} className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">{f}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <a href="/candidates" className="inline-block mt-4 text-sm font-semibold text-navy hover:text-navy-light">
            View All Candidates →
          </a>
        </div>
      )}

      {/* Email Forwarding Info */}
      <div className="mt-6 bg-navy/5 rounded-xl p-6 border border-navy/10">
        <h3 className="font-semibold text-navy mb-2">Email Forwarding</h3>
        <p className="text-sm text-text-secondary">
          Forward resumes to <strong className="text-navy">resumes@warehousenow.in</strong> and they will be automatically parsed and added to the candidate database.
        </p>
        <p className="text-xs text-text-secondary mt-2">
          Note: Email forwarding requires SMTP integration setup in Settings.
        </p>
      </div>
    </div>
  );
}
