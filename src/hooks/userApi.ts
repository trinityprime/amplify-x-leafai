import { useEffect, useState } from "react";

export function useUsers(user: any) {
    const [users, setUsers] = useState<any[]>([]);
    const [emailError, setEmailError] = useState("");

    const fetchUsers = async () => {
        try {
            const res = await fetch("https://3yto3bj5j7.execute-api.ap-southeast-1.amazonaws.com/prod/users");
            const data = await res.json();
            const parsed = typeof data.body === "string" ? JSON.parse(data.body) : data;
            const usersWithGroups = parsed.map((u: any) => ({
                ...u,
                groups: u.groups || []
            }));
            setUsers(usersWithGroups);
        } catch (err) {
            console.error("fetchUsers error:", err);
            setUsers([]);
        }
    };

    useEffect(() => {
        if (user) fetchUsers();
    }, [user]);

    const validateEmail = (email: string) => {
        if (!email.endsWith("@gmail.com") && email) {
            setEmailError("gmail only");
            return false;
        }
        if (users.some(u => u.email === email)) {
            setEmailError("email already exists");
            return false;
        }
        setEmailError("");
        return true;
    };

    const createUser = (email: string, role: string) =>
        fetch("https://qw6fkni710.execute-api.ap-southeast-1.amazonaws.com/prod/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, role })
        }).then(fetchUsers);

    const enableUser = (username: string) =>
        fetch("https://6dvjz6nxw9.execute-api.ap-southeast-1.amazonaws.com/prod/user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username })
        }).then(fetchUsers);

    const disableUser = (username: string) =>
        fetch("https://w2iaeukbu4.execute-api.ap-southeast-1.amazonaws.com/prod/user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username })
        }).then(fetchUsers);

    return {
        users,
        emailError,
        validateEmail,
        createUser,
        enableUser,
        disableUser
    };
}
