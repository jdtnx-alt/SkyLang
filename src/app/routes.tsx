import { createBrowserRouter } from "react-router";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { StudentDashboard } from "./pages/student/StudentDashboard";
import { StudentModulesPage } from "./pages/student/StudentModulesPage";
import { StudentModuleDetailPage } from "./pages/student/StudentModuleDetailPage";
import { StudentProgress } from "./pages/student/StudentProgress";
import { StudentProfile } from "./pages/student/StudentProfile";
import { StudentBadgesPage } from "./pages/student/StudentBadgesPage";
import { InstructorDashboard } from "./pages/instructor/InstructorDashboard";
import { InstructorStudents } from "./pages/instructor/InstructorStudents";
import { InstructorPrograms } from "./pages/instructor/InstructorPrograms";
import { InstructorModules } from "./pages/instructor/InstructorModules";
import { InstructorFichaDetail } from "./pages/instructor/InstructorFichaDetail";
import { InstructorRapMomentos } from "./pages/instructor/InstructorRapMomentos";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { AdminUsers } from "./pages/admin/AdminUsers";
import { AdminRoles } from "./pages/admin/AdminRoles";
import { AdminPrograms } from "./pages/admin/AdminPrograms";
import { AdminProgramDetails } from "./pages/admin/AdminProgramDetails";
import { AdminCourseDetails } from "./pages/admin/AdminCourseDetails";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LoginPage,
  },
  {
    path: "/register",
    Component: RegisterPage,
  },
  // Student routes
  {
    path: "/student",
    children: [
      { index: true, Component: StudentDashboard },
      { path: "modules", Component: StudentModulesPage },
      { path: "modules/:id", Component: StudentModuleDetailPage },
      { path: "progress", Component: StudentProgress },
      { path: "profile", Component: StudentProfile },
      { path: "badges", Component: StudentBadgesPage },
    ],
  },
  // Instructor routes
  {
    path: "/instructor",
    children: [
      { index: true, Component: InstructorDashboard },
      { path: "students", Component: InstructorStudents },
      { path: "programs", Component: InstructorPrograms },
      { path: "modules", Component: InstructorModules },
      { path: "ficha/:fichaId", Component: InstructorFichaDetail },
      { path: "ficha/:fichaId/rap/:rapId", Component: InstructorRapMomentos },
    ],
  },
  // Admin routes
  {
    path: "/admin",
    children: [
      { index: true, Component: AdminDashboard },
      { path: "programs", Component: AdminPrograms },
      { path: "programs/:id", Component: AdminProgramDetails },
      { path: "courses/:id", Component: AdminCourseDetails },
      { path: "users", Component: AdminUsers },
      { path: "roles", Component: AdminRoles },
    ],
  },
]);
