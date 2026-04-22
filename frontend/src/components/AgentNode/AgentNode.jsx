import { Position, Handle, NodeToolbar, useReactFlow, useUpdateNodeInternals } from '@xyflow/react';
import { useEffect } from 'react';


const possibleHandlePositions = ["left-right", "top-bottom", "right-left", "bottom-top"];

export function AgentNode({ id, data }) {
    const { setNodes } = useReactFlow();

    const updateNodeInternals = useUpdateNodeInternals();
    useEffect(() => {
        updateNodeInternals(id);
    }, [data.handlePositions, id, updateNodeInternals]);

    function rotateHandles() {
        const currentIndex = possibleHandlePositions.indexOf(data.handlePositions);
        const nextIndex = (currentIndex + 1) % possibleHandlePositions.length;
        const newHandlePositions = possibleHandlePositions[nextIndex];
        console.log(`Rotating handles from ${data.handlePositions} to ${newHandlePositions}`);
        setNodes((nodes) => nodes.map(node => {
            if (node.id === id) {
                return {
                    ...node,
                    data: {
                        ...node.data,
                        handlePositions: newHandlePositions
                    }
                };
            }
            return node;
        }));
    };

    return (
        <div>
            <NodeToolbar isVisible={data.editing} position={Position.Top} offset={20}>
                <button 
                    onClick={rotateHandles}
                    style={{
                        background: 'black',
                        color: 'white',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        fontSize: '12px',
                    }}
                >
                    ⟳ Rotate
                </button>
            </NodeToolbar>
            <div style={{backgroundColor: data.editing ? "rgb(0, 213, 255)" : "black", padding: "2px", clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)"}}>
                <div style={{background: "white", height: "100%", padding: "1rem", boxSizing: "border-box", clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)"}}>
                    <div>{data.name}</div>
                </div>
            </div>
            <Handle type="target" position={data.handlePositions === "left-right" ? Position.Left : data.handlePositions === "right-left" ? Position.Right : data.handlePositions === "top-bottom" ? Position.Top : Position.Bottom} style={{border: "1px solid black", background: "white"}} />
            <Handle type="source" position={data.handlePositions === "left-right" ? Position.Right : data.handlePositions === "right-left" ? Position.Left : data.handlePositions === "top-bottom" ? Position.Bottom : Position.Top} />
        </div>
    )
}