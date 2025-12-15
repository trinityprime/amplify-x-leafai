import React, { useEffect, useState } from "react";
import { useAuthenticator } from "@aws-amplify/ui-react";
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Card,
  Heading,
  Badge,
  TextField,
  Button,
  Flex,
  Loader
} from "@aws-amplify/ui-react";

function App() {
  const { user, signOut } = useAuthenticator();
  const [users, setUsers] = useState<any[]>([]);
  const [userStates, setUserStates] = useState<{ [email: string]: boolean }>({});
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState("");

  useEffect(() => {
    if (!user) return;
    fetchUsers();
  }, [user]);

  function fetchUsers() {
    fetch("https://3yto3bj5j7.execute-api.ap-southeast-1.amazonaws.com/prod/users")
      .then(res => res.json())
      .then(data => {
        const parsed = typeof data.body === "string" ? JSON.parse(data.body) : data;
        const usersArray = Array.isArray(parsed) ? parsed : [];
        setUsers(usersArray);

        // default all users enabled
        const states: { [username: string]: boolean } = {};
        usersArray.forEach(u => {
          states[u.username] = u.enabled !== undefined ? u.enabled : true;
        });
        setUserStates(states);

      })
      .catch(err => console.error("failed to fetch users", err));
  }

  function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setNewEmail(value);

    if (!value.endsWith("@gmail.com") && value) {
      setEmailError("gmail only");
      return;
    }

    const exists = users.some(u => u.email === value);
    setEmailError(exists ? "email already exists" : "");
  }
  
  function handleCreateUser() {
    if (!newEmail || emailError) return alert("enter a valid gmail");

    fetch("https://qw6fkni710.execute-api.ap-southeast-1.amazonaws.com/prod/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newEmail })
    })
      .then(res => res.json())
      .then(data => {
        alert(`user created: ${data.email}`);
        setNewEmail("");
        fetchUsers();
      })
      .catch(err => console.error(err));
  }

  const handleEnable = (username: string, email: string) => {
    if (!window.confirm(`Are you sure you want to enable ${email}?`)) return;

    fetch("https://6dvjz6nxw9.execute-api.ap-southeast-1.amazonaws.com/prod/user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username })
    })
      .then(() => fetchUsers())
      .catch(err => console.error(err));
  };

  const handleDisable = (username: string, email: string) => {
    if (!window.confirm(`Are you sure you want to disable ${email}?`)) return;

    fetch("https://w2iaeukbu4.execute-api.ap-southeast-1.amazonaws.com/prod/user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username })
    })
      .then(() => fetchUsers())
      .catch(err => console.error(err));
  };

  return (
    <main>
      <Heading marginBottom="1rem" level={2}>
        Welcome, {user?.signInDetails?.loginId?.split("@")[0]}!
      </Heading>

      <Flex gap="1rem" direction="row" alignItems="flex-end">
        <TextField
          label="User Email"
          type="email"
          value={newEmail}
          onChange={handleEmailChange}
          placeholder="someone@gmail.com"
          errorMessage={emailError}
          hasError={!!emailError}
          isRequired
        />
        <Button
          variation="primary"
          onClick={handleCreateUser}
          isDisabled={!newEmail || !!emailError}
        >
          Create User
        </Button>
      </Flex>

      <Card variation="outlined" marginTop="2rem">
        <Heading level={3}>Users</Heading>

        {users.length > 0 ? (
          <Table highlightOnHover={true}>
            <TableHead>
              <TableRow>
                <TableCell as="th">Email</TableCell>
                <TableCell as="th">Account Status</TableCell>
                <TableCell as="th">Created</TableCell>
                <TableCell as="th">Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {users.map(u => {
                const isForceChange = u.status === "FORCE_CHANGE_PASSWORD";
                return (
                  <TableRow key={u.username}>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      {isForceChange ? (
                        <Badge variation="info">PENDING PASSWORD CHANGE</Badge>
                      ) : (
                        <Badge variation="success">{u.status}</Badge>
                      )}
                    </TableCell>
                    <TableCell>{new Date(u.createdAt).toLocaleDateString("en-GB")}</TableCell>
                    <TableCell>
                      <Button
                        marginRight="1rem"
                        size="small"
                        variation="primary"
                        onClick={() => handleEnable(u.username, u.email)}
                      >
                        Enable
                      </Button>
                      <Button
                        size="small"
                        variation="destructive"
                        onClick={() => handleDisable(u.username, u.email)}
                      >
                        Disable
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <Loader size="large" />
        )}
      </Card>

      <Button onClick={signOut} marginTop="1rem">Sign Out</Button>
    </main>
  );
}

export default App;
