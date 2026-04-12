import { DataTypes, TokenTypes, Operators, DataTypeColors, checkStringDataType, parseStringToDataType, DataTypeNames, RichInputTokenTypes } from "../../logic";
import { CustomSelect } from "../CustomSelect/CustomSelect";
import { RichInput } from "../RichInput/RichInput";
import { Button } from "../Button/Button";

function Operator({ operator, operands, dataType, i }) {
    function renderOperator(operator, operands) {
        console.log("Rendering operator: ", operator, " with operands: ", operands)
        const components = [];
        let next_operand_index = 0;
        for (const [index, token] of operator.structure.entries()) {
            if (typeof token == "string") {
                components.push(<p key={i + "." + index}>{token}</p>);
            }
            else { // token is either a DataType, which corresponds to an operand (which will be an Operand or Operator component)
                components.push(operands[next_operand_index]);
                next_operand_index++;
            }
        }

        return components;
    }

    return <span key={i} className={`flex items-center gap-2 ${i != 0 ? 'border-[2px]' : ''} p-2`} style={{color: DataTypeColors[dataType], borderColor: DataTypeColors[dataType]}}>{renderOperator(operator, operands)}</span>
}

function Operand({ operand, condition, conditionId, updateCondition, flowState, input, modelOutput, dataType, i }) {
    const type = operand[0];
    const value = operand[1];

    if (type == TokenTypes.HARDCODED) { // the operand is a hardcoded value
        if (value == undefined) { // the operand has been specified as a hardcoded value but not value has been provided yet
            return <form onSubmit={(e) => {
                // Since the condition rework, we can allow hardcoded values with prefixes
                //if (e.target.elements[0].value.startsWith("input.") || e.target.elements[0].value.startsWith("output.") || e.target.elements[0].value.startsWith("state.")) {
                //    e.preventDefault();
                //    return;
                //}
                e.preventDefault();
                if (!checkStringDataType(e.target.elements[0].value, dataType)) {
                    alert("Invalid value for " + DataTypeNames[dataType]);
                    return;
                }
                const parsed_value = parseStringToDataType(e.target.elements[0].value, dataType);
                const newCondition = [...condition.slice(0, i), [TokenTypes.HARDCODED, parsed_value], ...condition.slice(i + 1)];
                updateCondition(conditionId, newCondition)
                }}>
                    <input style={{border: "2px solid " + DataTypeColors[dataType]}} /> {/* dataType is the expected DataType for the operand */}
                </form>
        }
        return <p style={{color: DataTypeColors[dataType]}} key={i}>{value.toString()}</p>
    }

    if (type == TokenTypes.STATEVAR) { 
        return <p style={{color: DataTypeColors[dataType]}} key={i}>{"state." + value}</p>
    }

    if (type == TokenTypes.INPUTVAR) { 
        return <p style={{color: DataTypeColors[dataType]}} key={i}>{"input." + value}</p>
    }

    if (type == TokenTypes.OUTPUTVAR) { 
        return <p style={{color: DataTypeColors[dataType]}} key={i}>{"output." + value}</p>
    }

    if (type == TokenTypes.USERINPUT) { // the operand has been specified as user runtime input 
        return <span> 
            <p style={{color: DataTypeColors[dataType]}}>User input with prompt:</p> {/* dataType is the expected DataType for the operand. The user input will be cast to this type */}
            <RichInput storedText={value} 
            tokenOptions={
                Object.entries(flowState).map(([key, value]) => ({value: [RichInputTokenTypes.STATEVAR, key, value[0]], label:(<p key={key} style={{color: DataTypeColors[value[0]]}}>{"state."+key}</p>)}))
                .concat(
                Object.entries(input).map(([key, value]) => ({value: [RichInputTokenTypes.INPUTVAR, key, value[0]], label:(<p key={key} style={{color: DataTypeColors[value[0]]}}>{"input."+key}</p>)}))
                ).concat(
                modelOutput === null ? [] : Object.entries(modelOutput).map(([key, value]) => ({value: [RichInputTokenTypes.OUTPUTVAR, key, value[0]], label:(<p key={key} style={{color: DataTypeColors[value[0]]}}>{"output."+key}</p>)}))
                )
            }
            onSubmit={(tokens) => {const newCondition = [...condition.slice(0, i), [TokenTypes.USERINPUT, tokens], ...condition.slice(i + 1)]; updateCondition(conditionId, newCondition)}}/>
        </span>
    }

    if (type == TokenTypes.UNKNOWN) { // this covers all possible cases. If type == Operator, it will have been rendered in the Operator function
        return <>
        <CustomSelect options={
            Object.entries(Operators).map(([key, value]) => ({value: [TokenTypes.OPERATOR, key], disabled: value.resultType != dataType , label:   // disable operators where the resultType doesn't match the expected dataType of this operand 
                (<div style={{display: "flex", flexDirection: "row", gap: "1rem", color: DataTypeColors[value.resultType]}}>
                    [
                    {value.structure.map((token, i) => 
                        typeof token == "string" ? <p key={i}>{token}</p> : <div key={i} style={{border: "2px solid " + DataTypeColors[token], padding: "0.3rem"}}></div>
                    )}
                    ]
                </div>)
            }))
            .concat(
                Object.entries(flowState).map(([key, value]) => ({value: [TokenTypes.STATEVAR, key], disabled: value[0] != dataType, label:(<p key={key} style={{color: DataTypeColors[value[0]]}}>{"state."+key}</p>)}))
            )
            .concat(
                Object.entries(input).map(([key, value]) => ({value: [TokenTypes.INPUTVAR, key], disabled: value[0] != dataType, label:(<p key={key} style={{color: DataTypeColors[value[0]]}}>{"input."+key}</p>)}))
            )
            .concat(
                modelOutput != null ? Object.entries(modelOutput).map(([key, value]) => ({value: [TokenTypes.OUTPUTVAR, key], disabled: value[0] != dataType, label:(<p key={key} style={{color: DataTypeColors[value[0]]}}>{"output."+key}</p>)})) : []
            )
            .concat([{value: [TokenTypes.HARDCODED, undefined], label: <p style={{color: "black"}}>{"Hardcoded value"}</p>},
                     {value: [TokenTypes.USERINPUT, []], label: <p style={{color: "black"}}>{"User Input"}</p>}
                    ])
            } 
            placeholder="Select an Operand"
            borderColor={DataTypeColors[dataType]}
            onChange={(value) => {
                console.log("Selected operator: ", value)
                if (value[0] != TokenTypes.OPERATOR) {
                    const newCondition = [...condition.slice(0, i), value, ...condition.slice(i + 1)];
                    updateCondition(conditionId, newCondition)
                    return;
                }

                // if the operand is an operator, add its own operands to the tree
                const operator = Operators[value[1]];
                const newCondition = [...condition.slice(0, i), value];
                for (const operand of operator.structure) {
                    if (typeof operand == "string") {
                        continue;
                    }
                    newCondition.push([TokenTypes.UNKNOWN, undefined]);
                }
                newCondition.push(...condition.slice(i + 1));
                updateCondition(conditionId, newCondition)
            }} />
        </>

    }
}

export function ConditionEditMenu({ conditionId, condition, updateCondition, flowState, input, modelOutput = null }) { // the modelOutput parameter is used in the guardrailedit menu
    const renderCondition = (condition) => {
        if (condition.length == 0) {
            return <Operand operand={[TokenTypes.UNKNOWN, null]} i={0} condition={condition} conditionId={conditionId} flowState={flowState} input={input} modelOutput={modelOutput} updateCondition={updateCondition} dataType={DataTypes.BOOL}/>
        }

        const tokenType = condition[0][0];
        if (tokenType == TokenTypes.OPERATOR) {
            const operator = Operators[condition[0][1]];
            const noperands = operator.noperands;
            let operands = []; // operands of the comparator
            let next_index = 1; // index where the next operand subtree starts in the condition list
            let next_type_index = 0; // index of the datatype of the next operand in the comparator structure

            for (let j = 0; j < noperands; j++) {
                while (typeof operator.structure[next_type_index] == "string") {
                    next_type_index++; // advance the index to the next operand type
                }

                [operands[j], next_index] = renderConditionRec(condition, next_index, operator.structure[next_type_index]); // next index contains the index where the next operand subtree starts
            }
            return <Operator i={0} operator={operator} dataType={DataTypes.BOOL} operands={operands}/>
        } else {
            return <Operand operand={condition[0]} i={0} condition={condition} conditionId={conditionId} flowState={flowState} input={input} modelOutput={modelOutput} updateCondition={updateCondition} dataType={DataTypes.BOOL}/>
        }
        };

    const renderConditionRec = (condition, i, dataType) => {
        if (condition[i][0] == TokenTypes.OPERATOR) { // current node is an operator
            const operator = Operators[condition[i][1]];
            const noperands = operator.noperands;
            let operands = [];
            let next_index = i + 1; // index where the next operand subtree starts
            let next_type_index = 0; // index of the datatype of the next operand in the comparator structure

            for (let j = 0; j < noperands; j++) {
                while (typeof operator.structure[next_type_index] == "string") {
                    next_type_index++; // advance the index to the next operand type
                }
                [operands[j], next_index] = renderConditionRec(condition, next_index, operator.structure[next_type_index]);
            }
            return [<Operator key={i} i={i} operator={operator} operands={operands} dataType={dataType}/>, next_index]
        }

        else { // current node is an operand
            return [<Operand key={i} i={i} condition={condition} conditionId={conditionId} updateCondition={updateCondition} operand={condition[i]} flowState={flowState} input={input} modelOutput={modelOutput} dataType={dataType}/>, i + 1]
        }
    };

    return <div className="border-r-[1rem] border-r-transparent bg-clip-padding w-fit flex gap-4 items-center"> {/* the border on the right is a hack to prevent the condition box from reaching the menu window border */}
            <div className="border-[2px] border-gray-500 border-dashed rounded-md p-2 w-fit">
                {renderCondition(condition)}
            </div>
            <span>
                <Button text="Reset" onClick={() => updateCondition(conditionId, [])} type="delete"/>
            </span>
        
    </div>
}