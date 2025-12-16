import { useEffect, useState } from "react";

export function useUsers(user: any) {
    const [users, setUsers] = useState<any[]>([]);
    const [emailError, setEmailError] = useState("");

    const fetchUsers = () => {
        fetch("https://3yto3bj5j7.execute-api.ap-southeast-1.amazonaws.com/prod/users")
            .then(res => res.json())
            .then(data => {
                const parsed = typeof data.body === "string" ? JSON.parse(data.body) : data;
                setUsers(Array.isArray(parsed) ? parsed : []);
            });
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

    const createUser = (email: string) =>
        fetch("https://qw6fkni710.execute-api.ap-southeast-1.amazonaws.com/prod/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
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
