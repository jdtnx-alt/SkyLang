import React from 'react';
import { BookOpen, PlayCircle, FileText, Download, ExternalLink } from 'lucide-react';

/**
 * Material de estudio de un momento del RAP.
 *
 * Solo se consulta: no tiene envío ni calificación y no genera progreso, según
 * el capítulo 1.3 del análisis funcional.
 *
 * El vídeo se ofrece como ENLACE, no incrustado. Un enlace normal de YouTube
 * (watch?v=…) no puede mostrarse dentro de la página —YouTube lo rechaza— y lo
 * único que se veía era un recuadro gris.
 */

const esImagen = (mime?: string) => Boolean(mime && mime.startsWith('image/'));
const esPdf = (mime?: string) => mime === 'application/pdf';
const esAudio = (mime?: string) => Boolean(mime && mime.startsWith('audio/'));

export const ContenidoDeEstudio: React.FC<{ contenido: any }> = ({ contenido }) => {
  const datos = contenido.datos_json || {};
  const objetivos = datos.objectives || datos.objetivos;
  const pildora = datos.grammarPill;
  const vocabulario = datos.vocabulary || datos.vocabulario || [];
  const dialogos = datos.dialogues || datos.dialogos || [];
  const calentamiento = datos.warmupPairs || [];

  const archivoUrl = contenido.recurso_url || datos.archivoUrl;
  const archivoMime = contenido.recurso_mime || datos.archivoMime;
  const archivoNombre = contenido.recurso_nombre || datos.archivoNombre || 'documento';

  return (
    <article className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
      <header className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#4DA6FF] flex items-center justify-center shrink-0">
          <BookOpen size={20} />
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Material de estudio
          </span>
          <h3 className="font-bold text-sm text-slate-900">{contenido.titulo}</h3>
        </div>
      </header>

      {contenido.cuerpo_texto && (
        <p className="text-xs text-slate-700 font-medium leading-relaxed whitespace-pre-line">
          {contenido.cuerpo_texto}
        </p>
      )}

      {/* Vídeo: enlace, no reproductor incrustado */}
      {datos.videoUrl && (
        <a
          href={datos.videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-4 rounded-2xl border border-[#4DA6FF]/30 bg-blue-50/50 hover:bg-blue-50 transition-colors group"
        >
          <PlayCircle className="text-[#4DA6FF] shrink-0" size={26} />
          <div className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-slate-900">Ver el vídeo</span>
            <span className="block text-[11px] text-slate-500 truncate">{datos.videoUrl}</span>
          </div>
          <ExternalLink className="text-slate-400 group-hover:text-[#4DA6FF] shrink-0" size={16} />
        </a>
      )}

      {/* Imagen incrustada; documento y audio, como archivo */}
      {archivoUrl && esImagen(archivoMime) && (
        <img
          src={archivoUrl}
          alt={contenido.titulo}
          className="w-full max-h-[420px] object-contain rounded-2xl border border-slate-200 bg-slate-50"
        />
      )}

      {archivoUrl && esAudio(archivoMime) && (
        <audio controls src={archivoUrl} className="w-full">
          Tu navegador no puede reproducir este audio.
        </audio>
      )}

      {archivoUrl && !esImagen(archivoMime) && !esAudio(archivoMime) && (
        <a
          href={archivoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-4 rounded-2xl border border-slate-200 hover:border-[#4DA6FF] transition-colors group"
        >
          <FileText className={esPdf(archivoMime) ? 'text-rose-600 shrink-0' : 'text-slate-500 shrink-0'} size={24} />
          <div className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-slate-900 truncate">{archivoNombre}</span>
            <span className="block text-[11px] text-slate-500">
              {esPdf(archivoMime) ? 'Documento PDF' : 'Archivo adjunto'} · se abre en otra pestaña
            </span>
          </div>
          <Download className="text-slate-400 group-hover:text-[#4DA6FF] shrink-0" size={16} />
        </a>
      )}

      {objetivos && (
        <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-2xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block mb-1">Objetivos</span>
          <p className="text-xs text-slate-800 font-medium">{objetivos}</p>
        </div>
      )}

      {calentamiento.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {calentamiento.map((p: any, i: number) => (
            <div key={i} className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-center">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">{p.label}</span>
              <span className="block text-sm font-bold text-slate-800">{p.text}</span>
            </div>
          ))}
        </div>
      )}

      {pildora && (
        <div className="p-4 rounded-2xl border border-purple-100 bg-purple-50/50 space-y-2">
          <h4 className="font-bold text-sm text-purple-950">{pildora.title}</h4>
          <p className="text-xs text-slate-700 font-medium">{pildora.explanation}</p>
          <div className="space-y-1">
            {(pildora.examples || []).map((e: any, i: number) => (
              <p key={i} className="text-xs font-mono text-slate-800">
                <span className="text-blue-700 font-bold">{e.subject}</span>{' '}
                <span className="text-emerald-700 font-bold">{e.verb}</span>{' '}
                <span className="text-slate-700">{e.complement}</span>
              </p>
            ))}
          </div>
        </div>
      )}

      {vocabulario.length > 0 && (
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Vocabulario</span>
          {vocabulario.map((v: any, i: number) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-200">
              <div>
                <span className="font-bold text-sm text-slate-900">{v.word}</span>
                <span className="text-xs text-slate-500 font-mono ml-2">{v.phonetic}</span>
              </div>
              <span className="text-xs font-semibold text-slate-600">{v.translation}</span>
            </div>
          ))}
        </div>
      )}

      {dialogos.length > 0 && (
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Diálogo</span>
          {dialogos.map((d: any, i: number) => (
            <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-purple-700 block">{d.speaker} · {d.role}</span>
              <span className="text-xs text-slate-800 font-medium">{d.text}</span>
            </div>
          ))}
        </div>
      )}
    </article>
  );
};
