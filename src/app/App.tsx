import { RouterProvider } from "react-router";
import { router } from "./routes";
import { BarreraDeErrores } from "./components/BarreraDeErrores";
import { LanguageProvider } from "./context/LanguageContext";

export default function App() {
  return (
    <BarreraDeErrores>
      <LanguageProvider>
        <RouterProvider router={router} />
      </LanguageProvider>
    </BarreraDeErrores>
  );
}

