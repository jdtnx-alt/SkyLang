import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

/**
 * Barrera de errores de la aplicación.
 *
 * Sin ella, cualquier excepción durante el renderizado tumba la pantalla entera
 * y deja al usuario delante de una traza de JavaScript. React Router lo avisa
 * expresamente en ese mensaje: conviene dar un `errorElement`.
 *
 * El caso más frecuente es el `NotFoundError: insertBefore` que aparece cuando
 * algo externo modifica el DOM que React controla —el traductor automático del
 * navegador y ciertas extensiones son la causa habitual—. No se puede evitar
 * desde el código, pero sí se puede dejar de perder el trabajo del usuario.
 */

interface Props { children?: React.ReactNode }
interface State { error: Error | null }

export class BarreraDeErrores extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Error no controlado en la interfaz:', error, info);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const esErrorDeDom = /insertBefore|removeChild|NotFoundError/i.test(error.message);

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white rounded-2xl border border-gray-200 p-8 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle size={26} />
          </div>

          <h1 className="text-xl font-bold text-gray-900">Algo se interrumpió en la pantalla</h1>

          <p className="text-sm text-gray-600 font-medium">
            {esErrorDeDom
              ? 'La página se modificó desde fuera de la aplicación. Suele pasar con el traductor automático del navegador o con alguna extensión. Desactiva la traducción de esta página y vuelve a intentarlo.'
              : 'No pudimos terminar de dibujar esta pantalla. Tus datos guardados no se han perdido.'}
          </p>

          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2.5 bg-[#4DA6FF] hover:bg-blue-600 text-white rounded-xl text-sm font-bold flex items-center gap-2"
          >
            <RotateCcw size={16} /> Recargar la página
          </button>

          <details className="pt-2">
            <summary className="text-xs font-bold text-gray-400 cursor-pointer">Detalle técnico</summary>
            <pre className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-xl text-[11px] text-gray-600 overflow-x-auto whitespace-pre-wrap">
              {error.message}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}
