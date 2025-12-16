import { TextField, Button, Flex } from "@aws-amplify/ui-react";
import { useState } from "react";

export default function CreateUserForm({ onCreate, validate, error }: any) {
    const [email, setEmail] = useState("");

    return (
        <Flex gap="1rem" alignItems="flex-end">
            <TextField
                label="User Email"
                value={email}
                onChange={e => {
                    setEmail(e.target.value);
                    validate(e.target.value);
                }}
                errorMessage={error}
                hasError={!!error}
            />
            <Button
                onClick={() => {
                    onCreate(email);
                    setEmail("");
                }}
                isDisabled={!!error || !email}
            >
                Create User
            </Button>
        </Flex>
    );
}