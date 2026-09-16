import { RouterProvider } from "react-router";
import { router } from "./routes";
import { BarreraDeErrores } from "./components/BarreraDeErrores";

export default function App() {
  return (
    <BarreraDeErrores>
      <RouterProvider router={router} />
    </BarreraDeErrores>
  );
}
