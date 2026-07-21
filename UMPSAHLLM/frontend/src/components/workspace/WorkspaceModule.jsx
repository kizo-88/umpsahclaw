import React, { useState, useEffect, useRef } from 'react';
import { DocumentEditor } from "@onlyoffice/document-editor-react";
import { API_BASE } from '../../config';
import { 
  Upload, 
  Download, 
  Trash2, 
  Settings, 
  FileText, 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify, 
  Eye, 
  RefreshCw, 
  AlertTriangle,
  FileDown,
  Plus
} from 'lucide-react';

export default function WorkspaceModule() {
  const apiHostname = new URL(API_BASE).hostname;
  
  let initialNasIp = '10.204.45.152';
  let initialDocServerUrl = `http://${initialNasIp}:8080/`;

  if (apiHostname === 'api.umpsahllm.com') {
    initialDocServerUrl = 'https://office.umpsahllm.com/';
  } else if (apiHostname === 'localhost' || apiHostname === '127.0.0.1') {
    initialDocServerUrl = `${API_BASE}/mock-onlyoffice/`;
  } else {
    initialNasIp = apiHostname;
    initialDocServerUrl = `http://${initialNasIp}:8080/`;
  }
  
  const [files, setFiles] = useState(['document.txt']);
  const [activeFile, setActiveFile] = useState('document.txt');
  const [offlineMock, setOfflineMock] = useState(false); // Default to false (OnlyOffice mode)
  const [docServerUrl, setDocServerUrl] = useState(initialDocServerUrl);
  const [uploading, setUploading] = useState(false);
  const [unsaved, setUnsaved] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isBinaryDocx, setIsBinaryDocx] = useState(false);
  const [lanIp, setLanIp] = useState(apiHostname);

  const editorRef = useRef(null);
  const fileInputRef = useRef(null);

  // Fetch LAN IP configuration from backend on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/workspace/config`)
      .then(r => r.json())
      .then(data => {
        if (data.lanIp && data.lanIp !== 'localhost') {
          setLanIp(data.lanIp);
        }
      })
      .catch(err => console.error("Failed to load LAN IP config", err));
  }, []);

  // For ONLYOFFICE, we must use the LAN IP if the hostname is localhost, so the ONLYOFFICE server (e.g. on NAS) can connect back to our backend.
  const onlyOfficeBackendUrl = (lanIp !== 'localhost' && lanIp !== '127.0.0.1') 
    ? `http://${lanIp}:3002` 
    : API_BASE;

  const documentUrl = `${onlyOfficeBackendUrl}/api/workspace/documents/${encodeURIComponent(activeFile)}`;
  const callbackUrl = `${onlyOfficeBackendUrl}/api/workspace/documents/callback`;

  // Fetch list of files from backend
  const fetchFiles = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/workspace/files`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setFiles(data);
          // If active file is not in the list, set active to the first file
          if (!data.includes(activeFile)) {
            setActiveFile(data[0]);
          }
        }
      }
    } catch (e) {
      console.error("Failed to fetch files", e);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  // Fetch file content for Mock Editor
  useEffect(() => {
    if (!activeFile || !offlineMock) return;
    
    setIsBinaryDocx(false);
    
    // If it is a docx/doc file, append ?text=true to extract the text content from it!
    const isDoc = activeFile.toLowerCase().endsWith('.docx') || activeFile.toLowerCase().endsWith('.doc');
    const fetchUrl = `${API_BASE}/api/workspace/documents/${encodeURIComponent(activeFile)}${isDoc ? '?text=true' : ''}`;

    fetch(fetchUrl)
      .then(res => {
        if (!res.ok) throw new Error("Failed to load file content");
        return res.text();
      })
      .then(text => {
        // Detect binary zip format (if extraction failed or if it is another binary zip)
        const isZip = text.startsWith('PK\x03\x04') || text.includes('word/_rels/') || text.includes('[Content_Types].xml');
        if (isZip) {
          setIsBinaryDocx(true);
          if (editorRef.current) {
            editorRef.current.innerHTML = `
              <div style="text-align:center; padding:40px; color:#64748b; font-family:sans-serif;">
                <p style="font-size:24px; font-weight:bold; color:#334155; margin-bottom:12px;">Binary DOCX Document</p>
                <p style="margin-bottom:20px; font-size:14px; max-width:500px; margin-left:auto; margin-right:auto;">
                  This is a binary DOCX file. To edit it natively like Microsoft Word, please configure your ONLYOFFICE server, or click <strong>Download</strong> to edit it locally in MS Word.
                </p>
                <p style="font-size:12px; color:#94a3b8; font-style:italic;">
                  Alternatively, you can write over this file in rich text and save it directly.
                </p>
              </div>
            `;
          }
        } else {
          if (editorRef.current) {
            editorRef.current.innerHTML = text || "<p>Start typing here...</p>";
          }
        }
        setUnsaved(false);
      })
      .catch(err => {
        console.error(err);
        if (editorRef.current) {
          editorRef.current.innerHTML = `<p style="color:#ef4444;">Error loading document content: ${err.message}</p>`;
        }
      });
  }, [activeFile, offlineMock, API_BASE]);

  // Upload handler
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const res = await fetch(`${API_BASE}/api/workspace/upload`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        await fetchFiles();
        setActiveFile(data.filename);
        alert(`Uploaded ${data.filename} successfully!`);
      } else {
        throw new Error("Upload failed");
      }
    } catch (err) {
      alert("Error uploading file: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  // Delete handler
  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${activeFile}?`)) return;

    try {
      const res = await fetch(`${API_BASE}/api/workspace/documents/${encodeURIComponent(activeFile)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        alert("Deleted document successfully.");
        await fetchFiles();
      } else {
        throw new Error("Failed to delete");
      }
    } catch (e) {
      alert("Error deleting file: " + e.message);
    }
  };

  // Download handler
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = documentUrl;
    link.download = activeFile;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Rich Text Formatting Helpers for Mock Editor
  const handleFormat = (command, value = null) => {
    document.execCommand(command, false, value);
    setUnsaved(true);
  };

  // Save and Download handler for Mock Editor
  const handleSaveAndDownload = async () => {
    if (!editorRef.current) return;
    const htmlContent = editorRef.current.innerHTML;

    // Save to server
    try {
      const res = await fetch(`${API_BASE}/api/workspace/documents/${encodeURIComponent(activeFile)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: htmlContent })
      });
      if (!res.ok) throw new Error("Failed to save to server");
      setUnsaved(false);
    } catch (err) {
      alert("Failed to save to server: " + err.message);
      return;
    }

    // Trigger local download in browser
    let blob;
    let filename = activeFile;
    if (activeFile.endsWith('.docx') || activeFile.endsWith('.doc')) {
      const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><title>Document</title><!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]--></head><body>";
      const footer = "</body></html>";
      const sourceHTML = header + htmlContent + footer;
      blob = new Blob(['\ufeff' + sourceHTML], { type: 'application/msword' });
      if (filename.endsWith('.docx')) {
        filename = filename.replace('.docx', '.doc');
      }
    } else {
      blob = new Blob([editorRef.current.innerText], { type: 'text/plain;charset=utf-8' });
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    alert("Saved and downloaded successfully!");
  };

  const isPdf = activeFile.toLowerCase().endsWith('.pdf');

  return (
    <div className="flex-1 flex flex-col bg-[#020617] p-6 h-full overflow-hidden text-slate-100">
      {/* Top Banner Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-slate-900/40 p-4 rounded-2xl border border-white/5">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Workspace</h2>
            <p className="text-xs text-slate-400">Word-like document collaboration</p>
          </div>
          <div className="h-8 w-px bg-slate-800 hidden md:block"></div>
          
          {/* Document Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Document:</span>
            <select 
              value={activeFile}
              onChange={(e) => setActiveFile(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-sm rounded-lg px-3 py-1.5 outline-none focus:border-indigo-500 transition-colors"
            >
              {files.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Upload Button */}
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-3 py-2 rounded-xl transition-all shadow-md cursor-pointer"
          >
            <Upload size={14} />
            {uploading ? 'Uploading...' : 'Upload File'}
          </button>
          <input 
            type="file"
            ref={fileInputRef}
            onChange={handleUpload}
            accept=".pdf,.docx,.doc,.txt"
            className="hidden"
          />

          {/* Download Button */}
          <button 
            onClick={handleDownload}
            title="Download original file"
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-2 rounded-xl border border-slate-700 transition-all cursor-pointer"
          >
            <Download size={14} />
            Download
          </button>

          {/* Delete Button */}
          <button 
            onClick={handleDelete}
            title="Delete document"
            className="flex items-center gap-2 bg-red-950/40 hover:bg-red-900/60 text-red-400 text-xs px-3 py-2 rounded-xl border border-red-900/40 transition-all cursor-pointer"
          >
            <Trash2 size={14} />
            Delete
          </button>

          {/* Toggle Settings */}
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${showSettings ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
          >
            <Settings size={14} />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="mb-6 p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col md:flex-row gap-6 animate-fadeIn">
          <div className="flex-1 space-y-2">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">ONLYOFFICE server address</label>
            <input 
              type="text" 
              value={docServerUrl}
              onChange={(e) => setDocServerUrl(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500 transition-all"
              placeholder="http://10.204.45.152:8080/"
            />
          </div>
          <div className="flex flex-col justify-end space-y-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={offlineMock}
                onChange={(e) => setOfflineMock(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-sm font-semibold text-slate-200">Use Offline Mock Editor (Microsoft Word style)</span>
            </label>
            <span className="text-[10px] text-slate-400 italic">Toggle this if your ONLYOFFICE server is unreachable.</span>
          </div>
        </div>
      )}

      {/* Workspace Editor Container */}
      <div className="flex-1 rounded-2xl overflow-hidden border border-white/5 shadow-2xl relative bg-[#090d16] flex flex-col min-h-0">
        
        {/* Case 1: Offline Mock Editor Mode */}
        {offlineMock ? (
          isPdf ? (
            /* PDF Viewer Mode */
            <div className="flex-1 flex flex-col h-full bg-[#0b0f17]">
              <div className="bg-slate-950/80 border-b border-slate-800 px-6 py-3 flex justify-between items-center">
                <span className="text-sm font-semibold text-slate-400">Viewing PDF: <strong className="text-white">{activeFile}</strong></span>
                <button 
                  onClick={handleDownload}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-2 cursor-pointer"
                >
                  <FileDown size={14} /> Download PDF
                </button>
              </div>
              <iframe 
                src={documentUrl} 
                className="flex-1 w-full h-full border-none"
                title="PDF Viewer" 
              />
            </div>
          ) : (
            /* Microsoft Word-like Text Editor Fallback */
            <div className="flex-1 flex flex-col h-full bg-[#0b0f17]">
              {/* Ribbon Toolbar */}
              <div className="bg-slate-950 border-b border-slate-800 p-2 flex flex-wrap gap-1 items-center justify-start">
                <button onClick={() => handleFormat('bold')} className="p-2 rounded hover:bg-slate-800 text-slate-300 hover:text-white" title="Bold"><Bold size={16} /></button>
                <button onClick={() => handleFormat('italic')} className="p-2 rounded hover:bg-slate-800 text-slate-300 hover:text-white" title="Italic"><Italic size={16} /></button>
                <button onClick={() => handleFormat('underline')} className="p-2 rounded hover:bg-slate-800 text-slate-300 hover:text-white" title="Underline"><Underline size={16} /></button>
                <button onClick={() => handleFormat('strikeThrough')} className="p-2 rounded hover:bg-slate-800 text-slate-300 hover:text-white" title="Strikethrough"><Strikethrough size={16} /></button>
                
                <div className="h-6 w-px bg-slate-800 mx-2"></div>
                
                <button onClick={() => handleFormat('justifyLeft')} className="p-2 rounded hover:bg-slate-800 text-slate-300 hover:text-white" title="Align Left"><AlignLeft size={16} /></button>
                <button onClick={() => handleFormat('justifyCenter')} className="p-2 rounded hover:bg-slate-800 text-slate-300 hover:text-white" title="Align Center"><AlignCenter size={16} /></button>
                <button onClick={() => handleFormat('justifyRight')} className="p-2 rounded hover:bg-slate-800 text-slate-300 hover:text-white" title="Align Right"><AlignRight size={16} /></button>
                <button onClick={() => handleFormat('justifyFull')} className="p-2 rounded hover:bg-slate-800 text-slate-300 hover:text-white" title="Align Justify"><AlignJustify size={16} /></button>
                
                <div className="h-6 w-px bg-slate-800 mx-2"></div>

                {/* Font Color */}
                <select 
                  onChange={(e) => handleFormat('foreColor', e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 outline-none"
                  defaultValue="#000000"
                >
                  <option value="#000000">Black Text</option>
                  <option value="#ef4444">Red Text</option>
                  <option value="#3b82f6">Blue Text</option>
                  <option value="#10b981">Green Text</option>
                </select>

                {/* Font Size */}
                <select 
                  onChange={(e) => handleFormat('fontSize', e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 outline-none"
                  defaultValue="3"
                >
                  <option value="1">Small</option>
                  <option value="3">Normal</option>
                  <option value="5">Large</option>
                  <option value="7">Huge</option>
                </select>

                <div className="ml-auto flex items-center gap-2">
                  {unsaved && (
                    <span className="text-amber-500 text-[10px] uppercase font-bold tracking-widest animate-pulse px-2">Unsaved Changes</span>
                  )}
                  <button 
                    onClick={handleSaveAndDownload}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-2 transition-all cursor-pointer shadow-md"
                  >
                    <Download size={14} /> Save & Download (Word)
                  </button>
                </div>
              </div>

              {/* A4 Styled Sheet Container */}
              <div className="flex-1 overflow-y-auto bg-slate-900/60 p-8 flex justify-center min-h-0">
                <div 
                  ref={editorRef}
                  contentEditable={true}
                  suppressContentEditableWarning={true}
                  onInput={() => setUnsaved(true)}
                  className="w-[816px] min-h-[1056px] bg-white text-slate-900 p-24 shadow-2xl border border-slate-200 font-serif outline-none leading-relaxed text-left text-base self-start prose max-w-none"
                  style={{ minHeight: '1056px', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          )
        ) : (
          /* Case 2: ONLYOFFICE Editor Integration Mode */
          <DocumentEditor
            id="docxEditor"
            documentServerUrl={docServerUrl}
            config={{
              document: {
                fileType: activeFile.split('.').pop().toLowerCase(),
                key: "doc-" + activeFile + "-" + Math.random().toString(36).substring(7),
                title: activeFile,
                url: documentUrl,
                permissions: {
                  edit: !isPdf,
                  download: true,
                  print: true,
                }
              },
              documentType: isPdf ? "pdf" : "word",
              editorConfig: {
                mode: isPdf ? "view" : "edit",
                callbackUrl: callbackUrl + "?filename=" + encodeURIComponent(activeFile),
                customization: {
                  forcesave: true,
                  chat: true,
                  compactHeader: true,
                  toolbarNoTabs: true,
                }
              }
            }}
            events_onDocumentReady={() => console.log("Document Editor is ready")}
            events_onError={(e) => {
              console.error("Document Editor Error:", e.data);
              // Auto-fallback to offline mock if server fails to connect
              if (e.data && e.data.type === "core") {
                setOfflineMock(true);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
