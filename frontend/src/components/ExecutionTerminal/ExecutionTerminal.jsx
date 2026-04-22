import { useRef, useEffect, useState } from 'react' 

export function ExecutionTerminal({ framework, flowData, closeTerminal, currentUser }) {
    const connection = useRef(null);
    const [messages, setMessages] = useState([]);

    const msg_styles = {
        error: "text-red-700",
        warning: "text-[rgb(223,131,18)]",
        prompt: "text-blue-700",
    }

    function addMessage(newMessage) {
        setMessages(oldMessages => [...oldMessages, newMessage]);
    }
    useEffect(() => {
        // on each render, a new connection is created
        let url = "ws://localhost:8000/ws"
        if (currentUser != "") {
            url += `?username=${currentUser}`
        }
        const socket = new WebSocket(url);

        // Connection opened
        socket.addEventListener("open", (event) => {
            socket.send(JSON.stringify({"framework" : framework, "nodes" : flowData.nodes, "edges" : flowData.edges, "api_keys" : flowData.api_keys}));
            addMessage("Connected to server");
        })

        // Listen for messages
        socket.addEventListener("message", (event) => {
            const message = JSON.parse(event.data)
            addMessage(message);
        })

        connection.current = socket;

        return () => {console.log("Closing connection"); connection.current.close();} // on unmount, close the connection
    }, [])

    function send_message(message) {
        connection.current.send(message);
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-[5px] flex justify-center items-center z-[1000]" onClick={closeTerminal}>
            <div className="bg-white p-5 rounded-lg w-4/5 h-3/5 max-w-[900px] min-h-[200px] relative shadow-md flex flex-col" onClick={(e) => e.stopPropagation()}>
                <h1 className="text-2xl mb-6">Execution Terminal</h1>
                <button className="absolute top-3 right-3 bg-transparent border-none text-2xl cursor-pointer text-red-500 hover:text-red-700 transition-all duration-200" onClick={closeTerminal}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="size-8">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                </button>
                <div className="font-mono flex flex-col gap-4 h-full overflow-y-auto border border-black mb-8 pl-4 bg-[#dadcdf]">
                    {messages.map((message, i) => <p className={msg_styles[message.msg_type]} key={i}>{message.msg_content}</p>)}
                </div>
                <form className="flex gap-4 items-center mt-auto" onSubmit={(e) => {
                    e.preventDefault();
                    send_message(e.target.elements[0].value);
                    e.target.elements[0].value = "";
                }}>
                    <label>Enter an input:</label>
                    <input className="w-fit p-2 border border-black rounded resize-y box-border overflow-visible flex-1" type="text" />
                    <button className="max-w-32 font-medium bg-[#65a064] hover:bg-[#79c278] text-white py-2 px-4 rounded-md transition-colors duration-200">Send</button>
                </form>
            </div>
        </div>
    )
}

