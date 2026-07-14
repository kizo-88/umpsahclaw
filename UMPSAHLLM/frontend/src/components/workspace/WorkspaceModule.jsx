import React, { useState, useEffect } from 'react';
import { DocumentEditor } from "@onlyoffice/document-editor-react";
import { API_BASE } from '../../config';

export default function WorkspaceModule() {
  // Determine the NAS IP by parsing API_BASE. 
  // If running locally without .env, fallback to the known NAS IP.
  const apiHostname = new URL(API_BASE).hostname;
  const initialNasIp = apiHostname === 'localhost' ? '10.204.45.152' : apiHostname;
  
  const [nasIp, setNasIp] = useState(initialNasIp);
  const [docLoaded, setDocLoaded] = useState(false);

  // Use API_BASE directly for the backend endpoints
  const backendUrl = API_BASE;
  const documentUrl = `${backendUrl}/api/workspace/documents/document.txt`;
  const callbackUrl = `${backendUrl}/api/workspace/documents/callback`;
  
  // The ONLYOFFICE Document Server is exposed on port 8080
  const documentServerUrl = `http://${nasIp}:8080/`;

  useEffect(() => {
      // In a real environment, you might fetch the actual NAS IP from a config endpoint
      setDocLoaded(true);
  }, []);

  if (!docLoaded) return <div className="p-8 text-white">Loading Workspace...</div>;

  return (
    <div className="flex-1 flex flex-col bg-[#0f111a] p-6 h-full overflow-hidden">
      <div className="flex items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-white tracking-tight">Workspace</h2>
        <div className="h-6 w-px bg-slate-700"></div>
        <p className="text-slate-400">Collaborative Document Editing</p>
      </div>

      <div className="flex-1 rounded-xl overflow-hidden border border-slate-800 shadow-2xl relative">
        {/* Document Editor Component */}
        <DocumentEditor
          id="docxEditor"
          documentServerUrl={documentServerUrl}
          config={{
            document: {
              fileType: "txt",
              key: "doc-" + Math.random().toString(36).substring(7), // Unique key to bust cache if needed
              title: "document.txt",
              url: documentUrl,
              permissions: {
                edit: true,
                download: true,
                print: true,
              }
            },
            documentType: "word", // 'word', 'cell', or 'slide'
            editorConfig: {
              mode: "edit",
              callbackUrl: callbackUrl,
              customization: {
                forcesave: true, // Show save button
                chat: true,
                compactHeader: true,
                toolbarNoTabs: true,
              }
            }
          }}
          events_onDocumentReady={() => console.log("Document Editor is ready")}
          events_onError={(e) => console.error("Document Editor Error:", e.data)}
        />
      </div>
    </div>
  );
}
