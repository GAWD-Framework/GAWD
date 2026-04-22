import { Position, Handle, NodeToolbar, useReactFlow, useUpdateNodeInternals } from '@xyflow/react';
import { useState, useEffect } from 'react';

const possibleHandlePositions = ["left-right", "top-bottom", "right-left", "bottom-top"];

export function RouterNode({ id, data }) {
    const [nHandles, setnHandles] = useState(2);
    const updateNodeInternals = useUpdateNodeInternals();
    const { setNodes } = useReactFlow();

    useEffect(() => {
        setnHandles(data.nconditions + 1)
    }, [data])

    useEffect(() => {
        updateNodeInternals(id);
    }, [nHandles, id, data.handlePositions, updateNodeInternals]);

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
        <div className="bg-white py-2 px-5 border-2 border-black rounded-[10%] flex flex-col justify-center" 
            style={ data.handlePositions === "left-right" || data.handlePositions === "right-left" ? 
                {minHeight: 10 + nHandles * 12, borderColor: data.editing ? "rgb(0, 213, 255)" : "black" } 
                : 
                {minWidth: 10 + nHandles * 12, borderColor: data.editing ? "rgb(0, 213, 255)" : "black" }}>
            <NodeToolbar isVisible={data.editing} position={Position.Top} offset={20}>
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
            <p className="text-center">{data.name}</p>
            <Handle type="target" position={data.handlePositions === "left-right" ? Position.Left : data.handlePositions === "right-left" ? Position.Right : data.handlePositions === "top-bottom" ? Position.Top : Position.Bottom} style={{border: "1px solid black", background: "white"}} />
            {Array.from({ length: nHandles }).map((_, index) => {
            const positionPercent = `${(index + 1) * (100 / (nHandles + 1))}%`;

            const isHorizontal = data.handlePositions === "left-right" || data.handlePositions === "right-left";
            const isLeftRight = data.handlePositions === "left-right";
            const isTopBottom = data.handlePositions === "top-bottom";

            let handlePosition;
            if (isLeftRight) handlePosition = Position.Right;
            else if (data.handlePositions === "right-left") handlePosition = Position.Left;
            else if (isTopBottom) handlePosition = Position.Bottom;
            else handlePosition = Position.Top;

            const handleStyle = isHorizontal 
                ? { top: positionPercent } 
                : { left: positionPercent };

            // style the labels so they line up with the handles 
            const labelStyle = {
                position: 'absolute',
                fontSize: '0.3rem',
                // If handles are on the sides, perfectly center the text vertically.
                // If handles are on top/bottom, perfectly center the text horizontally.
                transform: isHorizontal ? 'translateY(-50%)' : 'translateX(-50%)',
            };

            if (isHorizontal) {
                labelStyle.top = positionPercent;
                if (isLeftRight) labelStyle.right = '5%'; 
                else labelStyle.left = '5%';
            } else {
                labelStyle.left = positionPercent;
                if (isTopBottom) labelStyle.bottom = '10%';
                else labelStyle.top = '10%';
            }

            return (
                <div key={index}>
                    <Handle
                        type="source"
                        position={handlePosition}
                        id={`${index}`}
                        style={handleStyle}
                    />
                    <label style={labelStyle}>
                        {index + 1}
                    </label>
                </div>
            );
        })}
        </div>
    )
}