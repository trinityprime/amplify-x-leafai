import { useEffect, useState, useCallback } from "react";

export function useUsers(user: any) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true); 
  const [emailError, setEmailError] = useState("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        "https://3yto3bj5j7.execute-api.ap-southeast-1.amazonaws.com/prod/users",
      );
      const data = await res.json();

      const parsed =
        typeof data.body === "string" ? JSON.parse(data.body) : data;

      const usersWithGroups = (Array.isArray(parsed) ? parsed : []).map(
        (u: any) => ({
          ...u,
          groups: u.groups || [],
        }),
      );

      setUsers(usersWithGroups);
    } catch (err) {
      console.error("fetchUsers error:", err);
      setUsers([]);
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  }, []);

  useEffect(() => {
    if (user) fetchUsers();
  }, [user, fetchUsers]);

  const validateEmail = (email: string) => {
    if (!email.endsWith("@gmail.com") && email) {
      setEmailError("gmail only");
      return false;
    }
    if (users.some((u) => u.email === email)) {
      setEmailError("email already exists");
      return false;
    }
    setEmailError("");
    return true;
  };

  const createUser = async (email: string, role: string) => {
    setLoading(true);
    try {
      await fetch(
        "https://qw6fkni710.execute-api.ap-southeast-1.amazonaws.com/prod/users",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, role }),
        },
      );
      await fetchUsers();
    } catch (err) {
      console.error("Create error:", err);
      setLoading(false);
    }
  };

  const enableUser = async (username: string) => {
    setLoading(true);
    try {
      await fetch(
        "https://6dvjz6nxw9.execute-api.ap-southeast-1.amazonaws.com/prod/user",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        },
      );
      await fetchUsers();
    } catch (err) {
      setLoading(false);
    }
  };

  const disableUser = async (username: string) => {
    setLoading(true);
    try {
      await fetch(
        "https://w2iaeukbu4.execute-api.ap-southeast-1.amazonaws.com/prod/user",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        },
      );
      await fetchUsers();
    } catch (err) {
      setLoading(false);
    }
  };

  const changeUserRole = async (username: string, role: string) => {
    setLoading(true);
    try {
      await fetch(
        "https://k6se62981h.execute-api.ap-southeast-1.amazonaws.com/prod/user",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, role }),
        },
      );
      await fetchUsers();
    } catch (err) {
      setLoading(false);
    }
  };

  return {
    users,
    loading, 
    emailError,
    validateEmail,
    createUser,
    enableUser,
    disableUser,
    changeUserRole,
  };
}
