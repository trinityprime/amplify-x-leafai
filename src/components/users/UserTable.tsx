import {
    Table, TableHead, TableRow, TableCell,
    TableBody, Badge, Button
} from "@aws-amplify/ui-react";

export default function UserTable({ users, onEnable, onDisable }: any) {
    return (
        <Table highlightOnHover>
            <TableHead>
                <TableRow>
                    <TableCell>Email</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Actions</TableCell>
                </TableRow>
            </TableHead>

            <TableBody>
                {users.map((u: any) => (
                    <TableRow key={u.username}>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>
                            {u.status === "FORCE_CHANGE_PASSWORD"
                                ? <Badge variation="info">PENDING PASSWORD CHANGE</Badge>
                                : <Badge variation="success">{u.status}</Badge>}
                        </TableCell>
                        <TableCell>
                            {new Date(u.createdAt).toLocaleDateString("en-GB")}
                        </TableCell>
                        <TableCell>
                            <Button size="small" onClick={() => onEnable(u.username)}>
                                Enable
                            </Button>
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
    );
}
