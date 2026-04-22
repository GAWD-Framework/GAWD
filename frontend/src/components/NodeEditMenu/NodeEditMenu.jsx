import { AgentNodeEditMenu } from './AgentNodeEditMenu.jsx'
import { RouterNodeEditMenu } from './RouterNodeEditMenu.jsx'
import { FunctionNodeEditMenu } from './FunctionNodeEditMenu.jsx'
import { StartNodeEditMenu } from './StartNodeEditMenu.jsx'
import { EndNodeEditMenu } from './EndNodeEditMenu.jsx'

export function NodeEditMenu({ node, updateNodeData, onDeleteStateField, onChangeStateFieldType, onHandleDelete, onModifyNodeOutput, onRenameAgent, removeAsHandoff, getInputSchema, getFlowState, getAllHandoffAgents }) {
    
    return (
        <div className="flex flex-col max-w-[50rem] min-w-[30rem] w-1/2 h-full bg-[#97a1ac] overflow-auto p-4">
            {node == null ? (
                <p className="text-xl m-auto">Select a node to edit</p>
            ) : (
                <>
                {(() => {
                    switch (node.type) {
                        case 'agent':
                            return <AgentNodeEditMenu node={node}  updateNodeData={updateNodeData} getFlowState={getFlowState} getInputSchema={getInputSchema} getAllHandoffAgents={getAllHandoffAgents} onModifyNodeOutput={onModifyNodeOutput} onRenameAgent={onRenameAgent} removeAsHandoff={removeAsHandoff} />
                        case 'router':
                            return <RouterNodeEditMenu node={node} updateNodeData={updateNodeData} onHandleDelete={onHandleDelete} getFlowState={getFlowState} getInputSchema={getInputSchema} onModifyNodeOutput={onModifyNodeOutput} />
                        case 'function':
                            return <FunctionNodeEditMenu node={node} updateNodeData={updateNodeData} getFlowState={getFlowState} getInputSchema={getInputSchema} onModifyNodeOutput={onModifyNodeOutput} />
                        case 'start':
                            return <StartNodeEditMenu node={node} updateNodeData={updateNodeData} onDeleteStateField={onDeleteStateField} onChangeStateFieldType={onChangeStateFieldType} />
                        case 'end':
                            return <EndNodeEditMenu node={node} updateNodeData={updateNodeData} getFlowState={getFlowState} getInputSchema={getInputSchema} />
                        default:
                            return <p>Unknown node type</p>
                    }
                })()}
                </>
            )}

        </div>
    )
}