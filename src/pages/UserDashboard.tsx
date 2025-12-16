import { Heading, Card } from "@aws-amplify/ui-react";
import { useUsers } from "../hooks/userApi";
import CreateUserForm from "../components/users/CreateUserForm";
import UserTable from "../components/users/UserTable";

type UserDashboardProps = {
    user: any; // or AuthUser if you want stricter typing
};

export default function UserDashboard({ user }: UserDashboardProps) {
    const {
        users,
        emailError,
        validateEmail,
        createUser,
        enableUser,
        disableUser,
        changeUserRole
    } = useUsers(user);

    return (
        <>
            <Heading marginBottom="1rem" level={2}>
                Welcome, {user?.signInDetails?.loginId?.split("@")[0] ?? "User"}
            </Heading>

            <CreateUserForm
                onCreate={createUser}
                validate={validateEmail}
                error={emailError}
            />

            <Card marginTop="2rem">
                <UserTable
                    users={users}
                    onEnable={enableUser}
                    onDisable={disableUser}
                    onChangeRole={changeUserRole}
                />
            </Card>
        </>
    );
}
