import { useAuthenticator } from "@aws-amplify/ui-react";
import Dashboard from "./pages/UserDashboard";

function App() {
  const { user } = useAuthenticator();


  return (
    <>
      <Dashboard user={user} />
    </>
  );
}

export default App;