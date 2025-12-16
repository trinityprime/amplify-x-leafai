import {
    Table, TableHead, TableRow, TableCell,
    TableBody, Badge, Button, TextField
} from "@aws-amplify/ui-react";
import { useState, useMemo } from "react";

export default function UserTable({ users, onEnable, onDisable }: any) {
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
    const [search, setSearch] = useState("");

    // filter first
    const filteredUsers = useMemo(() => {
        return users.filter((u: any) =>
            u.email.toLowerCase().includes(search.toLowerCase())
        );
    }, [users, search]);

    // then sort
    const sortedUsers = useMemo(() => {
        if (!sortConfig) return filteredUsers;

        return [...filteredUsers].sort((a, b) => {
            let aValue: any, bValue: any;

            switch (sortConfig.key) {
                case "email":
                    aValue = a.email.toLowerCase();
                    bValue = b.email.toLowerCase();
                    break;
                case "status":
                    aValue = a.status;
                    bValue = b.status;
                    break;
                case "createdAt":
                    aValue = new Date(a.createdAt).getTime();
                    bValue = new Date(b.createdAt).getTime();
                    break;
                default:
                    return 0;
            }

            if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
            return 0;
        });
    }, [filteredUsers, sortConfig]);

    const requestSort = (key: string) => {
        let direction: "asc" | "desc" = "asc";
        if (sortConfig?.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        setSortConfig({ key, direction });
    };

    return (
        <>
            <TextField
                label="Search by email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Enter email"
                marginBottom="1rem"
            />

            <Table highlightOnHover>
                <TableHead>
                    <TableRow>
                        <TableCell
                            onClick={() => requestSort("email")}
                            style={{ cursor: "pointer" }}
                        >
                            Email {sortConfig?.key === "email" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                        </TableCell>
                        <TableCell
                            onClick={() => requestSort("status")}
                            style={{ cursor: "pointer" }}
                        >
                            Status {sortConfig?.key === "status" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                        </TableCell>
                        <TableCell
                            onClick={() => requestSort("createdAt")}
                            style={{ cursor: "pointer" }}
                        >
                            Created {sortConfig?.key === "createdAt" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                        </TableCell>
                        <TableCell>Actions</TableCell>
                    </TableRow>
                </TableHead>

                <TableBody>
                    {sortedUsers.map((u: any) => (
                        <TableRow key={u.username}>
                            <TableCell>{u.email}</TableCell>
                            <TableCell>
                                {u.status === "FORCE_CHANGE_PASSWORD"
                                    ? <Badge variation="info">PENDING PASSWORD CHANGE</Badge>
                                    : <Badge variation="success">{u.status}</Badge>}
                            </TableCell>
                            <TableCell>{new Date(u.createdAt).toLocaleDateString("en-GB")}</TableCell>
                            <TableCell>
                                <Button size="small" onClick={() => onEnable(u.username)}>Enable</Button>
                                <Button
                                    size="small"
                                    variation="destructive"
                                    onClick={() => onDisable(u.username)}
                                    marginLeft="0.5rem"
                                >
                                    Disable
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </>
    );
}
