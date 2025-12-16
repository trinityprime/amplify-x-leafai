type AppLayoutProps = {
    children: React.ReactNode;
    signOut: () => void;
};

export default function AppLayout({ children, signOut }: AppLayoutProps) {
    return (
        <div>
            <header>
                <h2>Admin Dashboard</h2>
                <button onClick={signOut}>Sign Out</button>
            </header>
            <main>{children}</main>
        </div>
    );
}