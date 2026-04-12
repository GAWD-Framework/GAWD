import { useState, useEffect } from 'react'
import { ConditionEditMenu } from '../ConditionEditMenu/ConditionEditMenu'
import { DataTypeColors } from '../../logic'
import { CustomSelect } from '../CustomSelect/CustomSelect'
import { Button } from '../Button/Button'
import { ToolTip } from '../ToolTip/ToolTip'
import { TextInput } from '../TextInput/TextInput'

export function RouterNodeEditMenu({ node, updateNodeData, onHandleDelete, onModifyNodeOutput, getFlowState, getInputSchema }) {
    const [nodeName, setNodeName] = useState(node.data.name)
    const [nConditions, setnConditions] = useState(node.data.nconditions)
    const [conditions, setConditions] = useState(node.data.conditions)
    const [output, setOutput] = useState(node.data.output_structure)


    const flowState = getFlowState(); // ran every render

    console.log(output)
    useEffect(() => { // state isn't automatically updated when props change
        console.log("Updating router")
        setNodeName(node.data.name)
        setnConditions(node.data.nconditions)
        setConditions(node.data.conditions)
        setOutput(node.data.output_structure)
    }, [node])

    useEffect(() => {
        updateNodeData(node.id, {name: nodeName})
    }, [nodeName])

    useEffect(() => {
        updateNodeData(node.id, {nconditions: nConditions})
    }, [nConditions])

    useEffect(() => {
        updateNodeData(node.id, {conditions: conditions})
    }, [conditions])

    useEffect(() => {
        updateNodeData(node.id, {output_structure: output})
        onModifyNodeOutput(node.id, output)
    }, [output])

    function addCondition() {
        setnConditions(nConditions + 1)
        setConditions([...conditions, []])
    }

    function updateCondition(index, newCondition) {
        let newConditions = [...conditions];
        newConditions[index] = newCondition;
        setConditions(newConditions);
    }

    function removeCondition(index) {
        if (nConditions <= 1)
            return;
        onHandleDelete(node.id, index);
        setnConditions(nConditions - 1)
        setConditions(conditions.slice(0, index).concat(conditions.slice(index+1)))
    }

    const input = getInputSchema(node.id);


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
                    <p className="text-2xl">Conditions:</p>
                    <ToolTip content={"Each condition corresponds to an output branch. Conditions will be evaluated in order to determine which path to take."}/>
                </span>    
                { conditions.map((condition, index) => {
                    return <div key={index} className="flex flex-col gap-2">
                        <span className="flex gap-2 items-center">
                            <label className="text-lg">&#8226; Condition {index + 1}:</label>
                            <Button onClick={() => removeCondition(index)} text={"Remove Condition"} type={"delete"} icon={true}/>
                        </span>
                        <span className="ml-4">
                            <ConditionEditMenu condition={condition} updateCondition={updateCondition} conditionId={index} flowState={flowState} input={input}/>
                        </span>
                    </div>
                }) }
                <div>
                    <label className="text-lg">&#8226; Condition {nConditions + 1}:</label>
                    <span className="inline-flex gap-2">
                        <p className="ml-4">else</p>
                        <ToolTip content={"If no other conditions are met, the last branch will be taken"}/>
                    </span>
                </div>
            </div>
            <span>
                <Button text={"Add Condition"} onClick={addCondition} type={"submit"}/>
            </span>

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
