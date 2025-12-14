import { useEffect, useState } from "react";
import { useAuthenticator } from "@aws-amplify/ui-react";
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Card,
  Heading
} from "@aws-amplify/ui-react";


const client = generateClient<Schema>();

function App() {
  const [todos, setTodos] = useState<Array<Schema["Todo"]["type"]>>([]);
  const [users, setUsers] = useState<any[]>([]);
  const { user, signOut, authStatus } = useAuthenticator();

  // subscribe to todos ONLY after auth
  useEffect(() => {
    if (authStatus !== "authenticated") return;

    const sub = client.models.Todo.observeQuery().subscribe({
      next: (data) => setTodos([...data.items]),
      error: (err) => console.error("todo error", err),
    });

    return () => sub.unsubscribe();
  }, [authStatus]);


  // fetch lambda users ONLY after auth
  useEffect(() => {
    if (!user) return;

    fetch("https://3yto3bj5j7.execute-api.ap-southeast-1.amazonaws.com/prod/users")
      .then(res => res.json())
      .then(data => {
        // api gateway proxy unwrap
        const parsed = typeof data.body === "string"
          ? JSON.parse(data.body)
          : data;

        setUsers(Array.isArray(parsed) ? parsed : []);
      })
      .catch(err => {
        console.error("failed to fetch users", err);
        setUsers([]);
      });
  }, [user]);

  function createTodo() {
    const content = window.prompt("Todo content");
    if (!content) return;
    client.models.Todo.create({ content });
  }

  function deleteTodo(id: string) {
    client.models.Todo.delete({ id });
  }

  return (
    <main>
      <h1>{user?.signInDetails?.loginId?.split("@")[0]}'s todos</h1>

      <button onClick={createTodo}>+ new</button>

      <ul>
        {todos.map(todo => (
          <li key={todo.id} onClick={() => deleteTodo(todo.id)}>
            {todo.content}
          </li>
        ))}
      </ul>

      <Card variation="outlined" marginTop="2rem">
        <Heading level={3}>Users</Heading>

        {users.length > 0 ? (
          <Table highlightOnHover={true}>
            <TableHead>
              <TableRow>
                <TableCell as="th">Email</TableCell>
                <TableCell as="th">Created</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {users.map(u => (
                <TableRow key={u.username}>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    {new Date(u.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p>no users or still loading</p>
        )}
      </Card>


      <button onClick={signOut}>sign out</button>
    </main>
  );
}

export default App;
