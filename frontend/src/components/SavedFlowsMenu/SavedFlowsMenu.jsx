import { useState, useEffect } from 'react'

export function SavedFlowsMenu( { setActiveFlow, getCurrentFlow, connection, closeMenu } ) {
    const [flowNames, setFlowNames] = useState([]);
    const [newFlowName, setNewFlowName] = useState("");
    useEffect(() => {

        async function fetchFlows() {
            try {
                const res = await connection.get("/flows");
                setFlowNames(res.data);
            } catch (e) {
                console.log(e);
            }
        }

        fetchFlows();
    }, [])

    async function saveCurrentFlow() {
        const currentFlow = getCurrentFlow();
        
        for (const node of currentFlow.nodes) {
            node.data.editing = false;
        }

        try {
            const res = await connection.post(`/flows/${newFlowName}`, {"data": currentFlow});
            // if no exception is thrown, the flow was saved correctly
            setFlowNames([...flowNames, newFlowName]);
            
        } catch (e) {
            console.log(e);
        }
    }

    async function updateFlow(flowName) {
        const currentFlow = getCurrentFlow();
        
        for (const node of currentFlow.nodes) {
            node.data.editing = false;
        }

        try {
            const res = await connection.patch(`/flows/${flowName}`, {"data": currentFlow});
        } catch (e) {
            console.log(e);
        }
    }

    async function deleteFlow(flowName) {
        try {
            const res = await connection.delete(`/flows/${flowName}`);
            // if no exception is thrown, the flow was deleted correctly
            setFlowNames(flowNames.filter((name) => name !== flowName));
        } catch (e) {
            console.log(e);
        }
    }

    async function loadFlow(flowName) {
        try {
            const res = await connection.get(`/flows/${flowName}`);
            setActiveFlow(res.data);
            closeMenu();
        } catch (e) {
            console.log(e);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-[5px] flex justify-center items-center z-[1000]" onClick={closeMenu}>
            <div className="relative flex flex-col gap-4 w-[65%] h-[60%] max-w-[900px] min-h-[200px] rounded-lg bg-white px-8 pt-6 shadow-md"
             onClick={(e) => e.stopPropagation()}>
                <button className="absolute top-3 right-3 bg-transparent border-none text-2xl cursor-pointer text-red-500 hover:text-red-700 transition-all duration-200" onClick={closeMenu}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="size-8">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                </button>
                <h1 className="text-xl">Your Saved Flows</h1>
                <ul className="flex flex-col gap-4 overflow-auto h-[70%] border border-gray-800 p-4 rounded">
                    {flowNames.map((flowName) => (
                        <span className="flex gap-4 items-center" key={flowName}>
                            <label className="text-lg mr-4">{flowName}</label>
                            <button className="max-w-32 font-medium bg-[#65a064] hover:bg-[#79c278] text-white py-1 px-2 rounded-md transition-colors duration-200" onClick={() => updateFlow(flowName)}>Update</button>
                            <button className="max-w-32 font-medium bg-[#5a67d8] hover:bg-[#7c8bf0] text-white py-1 px-2 rounded-md transition-colors duration-200" onClick={() => loadFlow(flowName)}>Load</button>
                            <button className="max-w-32 font-medium bg-[#ad5a5a] hover:bg-[#da756e] text-white py-1 px-2 rounded-md transition-colors duration-200" onClick={() => deleteFlow(flowName)}>Delete</button>
                        </span>
                    ))}
                </ul>
            
            <h2 className="text-lg">Save Current Flow</h2>
            <span className="flex gap-4 items-center">
                <label>Flow Name:</label>
                <input className="border border-black" type="text" value={newFlowName} onChange={(e) => setNewFlowName(e.target.value)} />
                <button className="max-w-32 font-medium bg-[#65a064] hover:bg-[#79c278] text-white py-1 px-4 rounded-md transition-colors duration-200" onClick={saveCurrentFlow}>Save</button>
            </span>
            </div>
        </div>
    )
}