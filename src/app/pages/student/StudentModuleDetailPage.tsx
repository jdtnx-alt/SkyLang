import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Sidebar } from '../../components/Sidebar';
import { TopGamificationBar } from '../../components/student/TopGamificationBar';
import { StudentRapPath } from '../../components/student/StudentRapPath';
import { PageTransition } from '../../components/PageTransition';

export function StudentModuleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState<number | null>(null);

  useEffect(() => {
    const almacenado = localStorage.getItem('user');
    const usuario = almacenado ? JSON.parse(almacenado) : null;
    const token = localStorage.getItem('token');

    if (!usuario?.id || !token) {
      navigate('/');
      return;
    }
    setStudentId(usuario.id);
  }, [navigate]);

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#F8FAFC] flex">
        <Sidebar role="student" />
        <div className="lg:ml-64 flex-1 flex flex-col min-w-0">
          <TopGamificationBar />
          <div className="p-4 sm:p-6 lg:p-8">
            {studentId && id && <StudentRapPath moduleId={id} studentId={studentId} />}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
