import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';

/**
 * Alta y edición de una ficha dentro de su programa.
 *
 * La ficha pertenece a un programa, así que se gestiona desde él: la pantalla
 * suelta de "Manage Courses" obligaba a elegir otra vez el programa al que ya
 * habías entrado.
 */

interface Props {
  programaId: number;
  ficha?: any | null;
  onCerrar: () => void;
  onGuardado: () => void;
}

export const ModalFicha: React.FC<Props> = ({ programaId, ficha, onCerrar, onGuardado }) => {
  const { tr } = useLanguage();
  const editando = Boolean(ficha?.id);

  const [numero, setNumero] = useState(ficha?.title || '');
  const [inicio, setInicio] = useState(ficha?.startDate || '');
  const [fin, setFin] = useState(ficha?.endDate || '');
  const [estado, setEstado] = useState(ficha?.status || 'Active');
  const [descripcion, setDescripcion] = useState(ficha?.description || '');
  const [instructorId, setInstructorId] = useState(ficha?.instructorId ? String(ficha.instructorId) : '');

  const [instructores, setInstructores] = useState<any[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/instructores')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setInstructores(Array.isArray(d) ? d : []))
      .catch(() => setInstructores([]));
  }, []);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numero.trim()) return;

    if (inicio && fin && fin < inicio) {
      setError(tr('La fecha de fin no puede ser anterior a la de inicio.', 'The end date cannot be earlier than the start date.'));
      return;
    }

    setGuardando(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        editando ? `/api/admin/courses/${ficha.id}` : '/api/admin/courses',
        {
          method: editando ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({
            title: numero.trim(),
            programId: programaId,
            startDate: inicio,
            endDate: fin,
            status: estado,
            instructor: instructorId,
            description: descripcion
          })
        }
      );
      const cuerpo = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(cuerpo.message || cuerpo.error || tr('No se pudo guardar la ficha.', 'Could not save the ficha.'));
      onGuardado();
    } catch (err: any) {
      setError(err?.message || tr('No se pudo guardar la ficha.', 'Could not save the ficha.'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="border-b pb-3">
          <h3 className="text-lg font-bold text-gray-900">
            {editando ? tr(`Editar ficha ${ficha.title}`, `Edit ficha ${ficha.title}`) : tr('Nueva ficha', 'New Ficha')}
          </h3>
          <p className="text-[11px] text-gray-500 font-medium mt-1">
            {tr('La ficha es una cohorte del programa. Sus actividades y contenidos le pertenecen solo a ella.', 'The ficha is a program cohort. Its activities and content belong exclusively to it.')}
          </p>
        </div>

        <form onSubmit={guardar} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">{tr('Número de ficha *', 'Ficha Number *')}</label>
            <input
              type="text" required value={numero} placeholder={tr('p. ej. 3142784', 'e.g. 3142784')}
              onChange={(e) => setNumero(e.target.value)}
              className="w-full border border-gray-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#4DA6FF]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{tr('Inicio', 'Start Date')}</label>
              <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)}
                className="w-full border border-gray-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#4DA6FF]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{tr('Fin', 'End Date')}</label>
              <input type="date" value={fin} onChange={(e) => setFin(e.target.value)}
                className="w-full border border-gray-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#4DA6FF]" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {tr('Instructor', 'Instructor')} <span className="text-gray-400 font-normal">({tr('uno por ficha', 'one per ficha')})</span>
            </label>
            <select
              value={instructorId}
              onChange={(e) => setInstructorId(e.target.value)}
              className="w-full border border-gray-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#4DA6FF]"
            >
              <option value="">{tr('Sin asignar', 'Unassigned')}</option>
              {instructores.map((i) => (
                <option key={i.id} value={i.id}>{i.name} — {i.email}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">{tr('Estado', 'Status')}</label>
            <select value={estado} onChange={(e) => setEstado(e.target.value)}
              className="w-full border border-gray-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#4DA6FF]">
              <option value="Active">{tr('Activa', 'Active')}</option>
              <option value="Draft">{tr('Borrador', 'Draft')}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">{tr('Descripción', 'Description')}</label>
            <textarea rows={3} value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
              className="w-full border border-gray-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#4DA6FF]" />
          </div>

          {error && (
            <p className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-medium">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t">
            <button type="button" onClick={onCerrar}
              className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50">
              {tr('Cancelar', 'Cancel')}
            </button>
            <button type="submit" disabled={guardando}
              className="px-4 py-2 bg-[#4DA6FF] hover:bg-blue-600 text-white rounded-xl text-xs font-medium">
              {guardando ? tr('Guardando…', 'Saving…') : editando ? tr('Guardar cambios', 'Save changes') : tr('Crear ficha', 'Create Ficha')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
