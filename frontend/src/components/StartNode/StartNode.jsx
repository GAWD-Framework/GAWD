import { Position, Handle, NodeToolbar, useReactFlow, useUpdateNodeInternals } from '@xyflow/react';
import { useEffect } from 'react';

const possibleHandlePositions = ["right", "bottom", "left", "top"];
export function StartNode({ id, data }) {
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
        <div className="bg-[#b3f1b8] h-[60px] w-[60px] text-center rotate-45 border-2 border-black rounded-[10%]" style={{borderColor: data.editing ? "rgb(0, 213, 255)" : "black" }}>
            <NodeToolbar isVisible={data.editing} position={ data.handlePositions === "right" || data.handlePositions === "bottom" ? Position.Top : Position.Bottom} offset={30}>
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
            <p className="table-cell h-[60px] -rotate-45 align-middle w-[60px]">{data.name}</p>
            <Handle type="source" position={data.handlePositions === "right" ? Position.Right : data.handlePositions === "bottom" ? Position.Bottom : data.handlePositions === "left" ? Position.Left : Position.Top} />
        </div>
    )
}