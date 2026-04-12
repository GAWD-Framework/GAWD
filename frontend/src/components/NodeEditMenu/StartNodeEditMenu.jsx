import { StateEditMenu } from '../StateEditMenu/StateEditMenu'
import { useState, useEffect } from 'react'

export function StartNodeEditMenu({ node, updateNodeData, onDeleteStateField }) {
    const [knowledgeSources, setKnowledgeSources] = useState(node.data.knowledge_sources);

    useEffect(() => {
        setKnowledgeSources(node.data.knowledge_sources)
    }, [node])

    useEffect(() => {
        updateNodeData(node.id, {knowledge_sources: knowledgeSources})
    }, [knowledgeSources])

    function updateState(update) {
        console.log("Updating state to: ", update)
        updateNodeData(node.id, {state: update}) 
    }

    return (
        <div className="flex flex-col gap-4">
            <p className="text-3xl text-center">Start Node</p>
            <StateEditMenu flowState={node.data.state} updateFlowState={updateState} onDeleteStateField={onDeleteStateField} />
        </div>

    )
}

