import { useAuthenticator } from "@aws-amplify/ui-react";
import Header from "./components/Header";
import Dashboard from "./pages/UserDashboard";

function App() {
  const { user, signOut } = useAuthenticator();


  return (
    <>
      <Header onSignOut={signOut} />
      <Dashboard user={user} />
    </>
  );
}

export default App;