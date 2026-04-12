import { useState, useEffect } from 'react'
import { ActionEditMenu } from '../ActionEditMenu/ActionEditMenu'
import { CustomSelect } from '../CustomSelect/CustomSelect'
import { DataTypeColors } from '../../logic'
import { Button } from '../Button/Button'
import { ToolTip } from '../ToolTip/ToolTip'
import { TextInput } from '../TextInput/TextInput'

export function FunctionNodeEditMenu({ node, updateNodeData, onModifyNodeOutput, getFlowState, getInputSchema }) {
    const [nodeName, setNodeName] = useState(node.data.name)
    const [actions, setActions] = useState(node.data.actions)
    const [output, setOutput] = useState(node.data.output_structure)

    const flowState = getFlowState(); // ran every render
    const input = getInputSchema(node.id);
    console.log("Input: ", input);

    useEffect(() => { // state isn't automatically updated when props change
        setNodeName(node.data.name)
        setActions(node.data.actions)
    }, [node])

    useEffect(() => {
        updateNodeData(node.id, {name: nodeName})
    }, [nodeName])


    useEffect(() => {
        updateNodeData(node.id, {actions: actions})
    }, [actions])

    useEffect(() => {
        updateNodeData(node.id, {output_structure: output})
        onModifyNodeOutput(node.id, output)
    }, [output])

    function addAction() {
        setActions([...actions, [undefined, []]])
    }

    function updateAction(index, newAction) {
        let newActions = [...actions];
        newActions[index] = newAction;
        setActions(newActions);
    }

    function removeAction(index) {
        if (actions.length <= 1)
            return;
        setActions(actions.slice(0, index).concat(actions.slice(index + 1)))
    }

    return (
        <div className="flex flex-col gap-4">
            <p className="text-3xl text-center">{nodeName}</p>
            <span className="inline-flex items-center gap-2">
                <span>
                    <label className="text-lg">Name: </label> 
                    <ToolTip content={"Name for the node. This doesn't affect the flow execution"}/>
                </span>
                <TextInput content={nodeName} onSubmit={(t) => setNodeName(t)} />
            </span>

        <div className="my-2 flex flex-col gap-4">
                <span className="inline-flex gap-2">
                    <p className="text-2xl">Actions:</p>
                    <ToolTip content={"Each action sets a new value for a state variable. Actions are take effect in order."}/>
                </span>

            { actions.map((action, index) => {
                return <div key={index}>
                    <span className="flex gap-2 items-center">
                        <label className="text-lg">&#8226; Action {index + 1}:</label>
                        <Button onClick={() => removeAction(index)} text={"Remove Action"} type={"delete"} icon={true}/>
                    </span>
                    <div className="ml-4">
                        <ActionEditMenu actionIndex={index} action={action} updateAction={updateAction} conditionId={index} flowState={flowState} input={input}/>
                    </div>

                </div>
            }) }
            
            <span>
                <Button text={"Add Action"} onClick={addAction} type={"submit"} />
            </span>
        </div>
        <div className="my-2 flex flex-col gap-4">
            <span className="inline-flex gap-2">
                    <p className="text-2xl">Node Output:</p>
                    <ToolTip content={"You can add fields from the node's input to its output"}/>
                </span>
            { Object.keys(output).length === 0 ?
                <p className="ml-4">No output fields defined</p>
                :
                Object.entries(output).map(([key, value]) => (
                <div key={key} className="ml-4 flex items-center gap-2">
                    <span> {/* use span to avoid coloring the bullet point */}
                        <label>&#8226; </label>
                        <label style={{color: DataTypeColors[value[0]]}}>{"input." + key}</label>
                    </span>
                    <Button type={"delete"} text={"Delete"} icon={true} 
                    onClick={() => { 
                        const { [key]: _, ...rest } = output; 
                        setOutput(rest)
                    }}
                    />
                </div>
            ))}
            <div className="ml-4">
                <CustomSelect 
                placeholder={"Add field to output"}
                onChange={(value) => {
                    // if (output.includes(newOutputField)) return; // key already in state
                    setOutput({...output, [value]: input[value]});
                    console.log("Setting output to ", {...output, [value]: input.value});
                    }}
                    options={Object.keys(input).length == 0 ? 
                    [{disabled: true, label: <p>Node has no input</p>}] 
                    : 
                    Object.entries(input).map(([field, value]) => ({value: field, label:
                    <p style={{color: DataTypeColors[value[0]]}}>{"input."+field}</p>, color: DataTypeColors[value[0]]}
                    ))}
                />
            </div>
        </div>
        </div>
    )
}
