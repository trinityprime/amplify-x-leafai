import { useAuthenticator } from "@aws-amplify/ui-react";
import Dashboard from "./pages/Dashboard";

function App() {
  const { user, signOut } = useAuthenticator();

  return <Dashboard user={user} signOut={signOut} />;
}

export default App;