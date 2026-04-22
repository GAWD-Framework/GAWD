import { useState } from 'react'

export function LoginMenu({ onLogin, connection, closeMenu }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    async function logIn() {
        const params = new URLSearchParams(); // OAuth2 doesn't accept JSON, we must send form data 
        params.append('username', username); 
        params.append('password', password); 
        try {
            const res = await connection.post("/login", params);
            const { access_token } = res.data;

            localStorage.setItem("token", access_token);

            onLogin(username);
        } catch (e) {
            console.log(e);
        }
    }

    async function signUp() {
        try {
            const res = await connection.put("/users", {username: username, password: password});
            const { access_token } = res.data;

            localStorage.setItem("token", access_token);

            onLogin(username);
        } catch (e) {
            console.log(e);
        }
    }
    
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-[5px] flex justify-center items-center z-[1000]" onClick={closeMenu}>
            <div className="relative flex flex-col items-center gap-6 w-[25%] h-[35%] max-w-[900px] min-h-[200px] rounded-lg bg-white p-3 pt-6 shadow-md" 
            onClick={(e) => e.stopPropagation()}>
                <button className="absolute top-3 right-3 bg-transparent border-none text-2xl cursor-pointer text-red-500 hover:text-red-700 transition-all duration-200" onClick={closeMenu}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="size-8">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                </button>
                <h1 className="ml-2 text-xl self-start">Log in or Sign up</h1>
                <span className="flex flex-col gap-2 ">
                    <p>Username:</p>
                    <input className="border border-gray-900 p-1 rounded-md max-w-64" onChange={(e) => {setUsername(e.target.value)}}></input>
                </span>
                <span className="flex flex-col gap-2">
                    <p>Password:</p>
                    <input type="password" className="border border-gray-900 p-1 rounded-md max-w-64" onChange={(e) => {setPassword(e.target.value)}}></input>
                </span>
                <span className="flex gap-4">
                    <button className="max-w-32 font-medium bg-[#6480a0] hover:bg-[#8bade0] text-white py-2 px-4 rounded-md transition-colors duration-200" onClick={logIn}>Login</button>
                    <button className="max-w-32 font-medium bg-[#65a064] hover:bg-[#79c278] text-white py-2 px-4 rounded-md transition-colors duration-200" onClick={signUp}>Sign up</button>
                </span>
            </div>
        </div>
    )
}