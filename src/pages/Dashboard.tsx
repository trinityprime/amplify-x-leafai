import { Heading, Card} from "@aws-amplify/ui-react";
import { useUsers } from "../hooks/userUsers";
import CreateUserForm from "../components/users/CreateUserForm";
import UserTable from "../components/users/UserTable";

export default function Dashboard({ user}: any) {
    const {
        users,
        emailError,
        validateEmail,
        createUser,
        enableUser,
        disableUser
    } = useUsers(user);

    return (
        <>
            <Heading marginBottom="1rem" level={2}>
                Welcome, {user?.signInDetails?.loginId?.split("@")[0]}
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
                />
            </Card>
        </>
    );
}
