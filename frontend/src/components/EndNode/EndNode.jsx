import { Position, Handle, NodeToolbar, useReactFlow, useUpdateNodeInternals } from '@xyflow/react';
import { useEffect } from 'react';

const possibleHandlePositions = ["right", "bottom", "left", "top"];
export function EndNode({ id, data }) {
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
        <div style={{borderColor: data.editing ? "rgb(0, 213, 255)" : "black", background: "#b3bcf1", height: "60px", textAlign: "center", transform: "rotate(45deg)", width: "60px", border: "2px solid black", borderRadius: "10%" }}>
            <NodeToolbar isVisible={data.editing} position={Position.Top} offset={30}>
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
            <p style={{display: "table-cell", height: "60px", transform: "rotate(-45deg)", verticalAlign: "middle", width: "60px"}}>{data.name}</p>
            <Handle type="target" position={data.handlePositions === "right" ? Position.Right : data.handlePositions === "bottom" ? Position.Bottom : data.handlePositions === "left" ? Position.Left : Position.Top} style={{border: "1px solid black", background: "white"}}/>
        </div>
    )
}