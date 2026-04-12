import { Position, Handle, NodeToolbar, useReactFlow, useUpdateNodeInternals } from '@xyflow/react';
import { useEffect } from 'react';

const possibleHandlePositions = ["left-right", "top-bottom", "right-left", "bottom-top"];

export function FunctionNode({ id, data }) {
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
        <div style={{borderColor: data.editing ? "rgb(0, 213, 255)" : "black", backgroundColor: "white", padding: "0.75rem 1rem", border: "2px solid black", borderRadius: "50%"}}>
            <NodeToolbar isVisible={data.editing} position={data.handlePositions === "left-right" ? Position.Top : data.handlePositions === "top-bottom" ? Position.Right : data.handlePositions === "right-left" ? Position.Bottom : Position.Left}>
                <button 
                    onClick={rotateHandles}
                    style={{
                        background: 'black',
                        color: 'white',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        fontSize: '12px'
                    }}
                >
                    ⟳ Rotate
                </button>
            </NodeToolbar>
            <div>{data.name}</div>
            <Handle type="target" position={data.handlePositions === "left-right" ? Position.Left : data.handlePositions === "right-left" ? Position.Right : data.handlePositions === "top-bottom" ? Position.Top : Position.Bottom} style={{border: "1px solid black", background: "white"}} />
            <Handle type="source" position={data.handlePositions === "left-right" ? Position.Right : data.handlePositions === "right-left" ? Position.Left : data.handlePositions === "top-bottom" ? Position.Bottom : Position.Top} />
        </div>
    )
}