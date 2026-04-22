import { DataTypes, DataTypeNames, DataTypeColors, checkStringDataType, parseStringToDataType, StateVariableDefaultValueSources } from '../../logic'
import { useState, useEffect } from 'react'
import { Button } from '../Button/Button'
import { ToolTip } from '../ToolTip/ToolTip'
import { CustomSelect } from '../CustomSelect/CustomSelect'
import { TextInput } from '../TextInput/TextInput'
export function StateEditMenu({ flowState, updateFlowState, onDeleteStateField, onChangeStateFieldType }) {
    const [localState, setLocalState] = useState(flowState)
    useEffect(() => { // state isn't automatically updated when props change
        setLocalState(flowState)
    }, [flowState])

    useEffect(() => {
        updateFlowState(localState)
    }, [localState])

    return <div className="my-8 flex flex-col gap-8">
            <span className="inline-flex gap-2">
                <p className="text-2xl">Flow State:</p>
                <ToolTip content={"State variables hold global information and can be accessed from any node."}/>
            </span>  
            {Object.entries(localState).map(([key, value]) => (
                    <div key={key} className="flex flex-col gap-4">
                        <span className="flex items-center gap-2">
                            <span>
                                <label>&#8226; </label>
                                <label className="text-lg" style={{color: DataTypeColors[value[0]]}}>{key}:</label>
                            </span>
                            <Button type={"delete"} text={"Delete"} icon={true} onClick={() => { 
                                const { [key]: _, ...rest } = localState; 
                                onDeleteStateField([key]);
                                setLocalState(rest);
                            }}/>
                        </span>
                        
                        <span className="ml-4 flex items-center gap-4">
                            <span className="flex gap-2">
                                <label>Data type: </label>
                                <ToolTip content={"The type of information in this variable. String variables hold text, Boolean variables hold true/false."}/>
                            </span>
                            <CustomSelect
                            value={DataTypeNames[value[0]]} 
                            onChange={(v) => {
                                if (v == value[0]) return; // same type selected, do nothing
                                onChangeStateFieldType(key, Number(v));
                                setLocalState({...localState, [key]: [Number(v), value[1], null]})
                            }} 
                            options= {
                                Object.values(DataTypes).map((datatype) => ({value: datatype, label:
                                <p style={{color: DataTypeColors[datatype]}}>{DataTypeNames[datatype]}</p>, color: DataTypeColors[datatype]}))
                            }
                            />

                        </span>
                        
                        <span className="ml-4 flex items-center gap-4">
                            <span className="flex gap-2">
                                <label className="min-w-fit">Starting value: </label>
                                <ToolTip content={"Starting value for this state variable. You can choose to hardcode a value or ask the user for it when running the flow."}/>
                            </span>
                            { value[1] === StateVariableDefaultValueSources.HARDCODED ? 
                            <span className="flex items-center gap-4">
                                <TextInput content={value[2] === null ? null : value[2].toString()}
                                    onSubmit={(t) => {
                                        if (!checkStringDataType(t, value[0])) {
                                                    alert("Invalid value for data type " + DataTypeNames[value[0]])
                                                    return false;
                                                }
                                                const parsed_value = parseStringToDataType(t, value[0]);
                                                setLocalState({...localState, [key]: [value[0], StateVariableDefaultValueSources.HARDCODED, parsed_value]});
                                            }
                                    }/>
                                <Button text={"Ask user when running"} onClick={() =>
                                setLocalState({...localState, [key]: [localState[key][0], StateVariableDefaultValueSources.USERINPUT, null]})
                                }/>
                            </span>
                            :
                            <span className="flex items-center gap-4">
                                <p>Ask user when running</p>
                                <Button text={"Set manually"} onClick={() => setLocalState({...localState, [key]: [value[0], StateVariableDefaultValueSources.HARDCODED, null]})}/>
                            </span>
                            }
                        </span>

                    </div>
            ))}
            <div className="ml-4">
                <span className="flex items-center gap-4">
                    <label>New field name: </label>
                    <TextInput content={null} submitButton={true} submitButtonText={"Add Field"} onSubmit={(t) => {
                        const modifiedFieldName = t.replace(" ", "_")
                        if (modifiedFieldName in localState) return // key already in state

                        setLocalState({...localState, [modifiedFieldName]: [DataTypes.NUM, StateVariableDefaultValueSources.HARDCODED, null]})
                    }} />
                    
                </span>
            </div>
        </div>
    
}