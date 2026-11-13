'use client';

interface VisorPdfModalProps {
  titulo: string;
  urlPdf: string | null;
  onCerrar: () => void;
}

export default function VisorPdfModal({ titulo, urlPdf, onCerrar }: VisorPdfModalProps) {
  if (!urlPdf) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4">
      <div className="flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-slate-300 bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-[#0B2545] px-5 py-3 text-white">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-300">
              Previsualización de Evidencia Documental (PDF)
            </p>
            <h3 className="text-sm font-semibold">{titulo}</h3>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={urlPdf}
              download={titulo}
              className="rounded bg-[#134074] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#195190]"
            >
              Descargar archivo
            </a>
            <button
              onClick={onCerrar}
              className="rounded bg-slate-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-600"
            >
              Cerrar visor
            </button>
          </div>
        </div>

        <div className="flex-1 bg-slate-200">
          <iframe
            src={urlPdf}
            title={titulo}
            className="h-full w-full border-0"
          />
        </div>
      </div>
    </div>
  );
}
