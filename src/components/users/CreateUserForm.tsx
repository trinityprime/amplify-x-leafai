import { useState } from "react";

export default function CreateUserForm({ onCreate, validate, error }: any) {
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("ADMIN");

    return (
        <div className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-md flex gap-4 items-end">
            <div className="flex flex-col flex-1 gap-1">
                <label className="text-sm font-medium text-gray-700">
                    User Email
                </label>
                <input
                    type="email"
                    placeholder="someone@gmail.com"
                    value={email}
                    onChange={e => {
                        setEmail(e.target.value);
                        validate(e.target.value);
                    }}
                    className={`rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${error
                        ? "border-red-500 focus:ring-red-400"
                        : "border-gray-300 focus:ring-black-400"
                        }`}
                />
                {error && (
                    <span className="text-xs text-red-500">
                        {error}
                    </span>
                )}
            </div>

            <div className="flex flex-col gap-1 w-56">
                <label className="text-sm font-medium text-gray-700">
                    Role
                </label>
                <select
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black-400"
                >
                    <option value="ADMIN">Admin</option>
                    <option value="FIELD_TECH">Field Technician</option>
                    <option value="DATA_ANALYST">Data Analyst</option>
                </select>
            </div>

            <button
                onClick={() => {
                    onCreate(email, role);
                    setEmail("");
                    setRole("ADMIN");
                }}
                disabled={!!error || !email}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition
          hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
                Create User
            </button>
        </div>
    );
}
