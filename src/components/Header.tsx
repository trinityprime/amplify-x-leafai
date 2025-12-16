import { Button } from "@aws-amplify/ui-react";

type HeaderProps = {
    onSignOut: () => void;
};

export default function Header({ onSignOut }: HeaderProps) {
    return (
        <header style={{
            width: "100%",
            padding: "1rem 2rem",
            background: "white",
            borderBottom: "1px solid #ddd",
            position: "sticky",
            top: 0,
            zIndex: 1000,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
        }}>
            <h2>admin dashboard</h2>
            <Button
                variation="destructive"
                onClick={onSignOut}
            >
                Sign Out
            </Button>
        </header>
    );
}
