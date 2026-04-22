import { useState, useEffect } from 'react'
import { VariableSources, DataTypeColors } from '../../logic'
import { CustomSelect } from '../CustomSelect/CustomSelect'
import { Button } from '../Button/Button'
import { ToolTip } from '../ToolTip/ToolTip'

export function EndNodeEditMenu({ node, updateNodeData, getFlowState, getInputSchema }) {

    const [output, setOutput] = useState(node.data.output_structure) // in endNodes, the output dictionary has tuples [DataType, VariableSource] as values

    const flowState = getFlowState(); // ran every render
    const input = getInputSchema(node.id);
    
    const variableSourcePrefixes = ["state.", "input."];

    useEffect(() => { // state isn't automatically updated when props change
        setOutput(node.data.output_structure);
    }, [node])


    useEffect(() => {
        updateNodeData(node.id, {output_structure: output})
    }, [output])

    return <div className="flex flex-col gap-8">
            <p className="text-3xl text-center">End Node</p>

            <div className="flex flex-col gap-4">
                <span className="inline-flex gap-2">
                    <p className="text-2xl">Flow Output:</p>
                    <ToolTip content={"These variables will be printed at the end of the workflow's eexecution."}/>
                </span> 
                {Object.entries(output).map(([key, value]) => (
                        <span key={key} className="ml-4 flex items-center gap-2">
                            <span>
                                <label>&#8226; </label>
                                <label style={{color: DataTypeColors[value[0]]}}>{variableSourcePrefixes[value[1]] + key}</label>

                            </span>
                            <Button type={"delete"} text={"Delete"} icon={true} onClick={() => { 
                                const { [key]: _, ...rest } = output; 
                                setOutput(rest)
                            }}/>
                    
                        </span>
                ))}
            <div className="ml-4">
                <CustomSelect 
                placeholder={"Add variable"}
                onChange={(value) => {
                    setOutput({...output, [value[0]] : [value[1], value[2]]}); // TODO: what if a state variable and an input variable have the same name? 
                }}
                options={
                    Object.entries(flowState).length === 0 && (input == null || Object.entries(input).length === 0) ?
                    [{disabled: true, label: <p>No available variables</p>}] 
                    :
                    Object.entries(flowState).map(([key, value]) => ({value: [key, value[0], VariableSources.STATEVAR], label:(<p key={key} style={{color: DataTypeColors[value[0]]}}>{"state."+key}</p>)}))
                    .concat(
                        input != null ? Object.entries(input).map(([key, value]) => ({value: [key, value[0], VariableSources.INPUTVAR], label:(<p key={key} style={{color: DataTypeColors[value[0]]}}>{"input."+key}</p>)})) : []
                    )
                }
                />

            </div>
            </div>
        </div>

}