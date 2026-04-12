import { DataTypeColors,RichInputTokenTypes } from "../../logic";
import { CustomSelect } from "../CustomSelect/CustomSelect";
import { ConditionEditMenu } from "../ConditionEditMenu/ConditionEditMenu";
import { GuardrailCorrections, GuardrailCorrectionsRequiringInput } from "../../logic";
import { RichInput } from "../RichInput/RichInput";
import { Button } from "../Button/Button";

export function GuardrailEditMenu({ guardrailId, guardrail, updateGuardrail, removeGuardrail, flowState, input, modelOutput }) {
    const updateGuardrailCondition = (i, newCondition) => {
        const newGuardrail = [...guardrail]; // done in this way to not delete the third field if present
        newGuardrail[0] = newCondition;
        updateGuardrail(i, newGuardrail)
    }
    const updateGuardrailCorrection = (i, newCorrection) => {
        const newGuardrail = [guardrail[0], newCorrection];
        updateGuardrail(i, newGuardrail)
    }
    const updateGuardrailFeedback = (i, newFeedback) => {
        const newGuardrail = [guardrail[0], guardrail[1], newFeedback];
        updateGuardrail(i, newGuardrail)
    }

    return <div>
        <div className="ml-4 flex gap-2 items-center">
            <span className="flex gap-2 items-center">
                <label>&#8226; </label>
                <label className="text-lg">Guardrail {guardrailId}:</label>
            </span>
            <Button onClick={() => removeGuardrail(guardrailId)} text={"Remove Guardrail"} type={"delete"} icon={true}/>
        </div>
        <div className="flex flex-col gap-4 ml-8 mb-4 mt-4">
            <div>
                <label>Condition to check:</label>
                <ConditionEditMenu conditionId={guardrailId} condition={guardrail[0]} updateCondition={updateGuardrailCondition} flowState={flowState} input={input} modelOutput={modelOutput} />
            </div>
            <div className="flex flex-col gap-2 items-start">
                <label>If condition not met:</label>
                <CustomSelect 
                options={GuardrailCorrections.map((correction, i) => ({value: correction, label:
                        <option key={i} value={correction}>{correction}</option>
                }))
                }
                placeholder={"Select a correction"}
                value={guardrail[1] || undefined}
                onChange={(v) => updateGuardrailCorrection(guardrailId, v)}
                />
                
                {GuardrailCorrectionsRequiringInput.includes(guardrail[1]) && 
                <div className="flex flex-col self-stretch">
                    <label>Feedback:</label>
                    <RichInput rowMode={true} onSubmit={(tokens) => {updateGuardrailFeedback(guardrailId, tokens)}} storedText={guardrail[2]??[]} tokenOptions={
                        Object.entries(flowState).map(([key, value]) => ({value: [RichInputTokenTypes.STATEVAR, key, value[0]], label:(<p key={key} style={{color: DataTypeColors[value[0]]}}>{"state."+key}</p>)}))
                        .concat(
                        Object.entries(input).map(([key, value]) => ({value: [RichInputTokenTypes.INPUTVAR, key, value[0]], label:(<p key={key} style={{color: DataTypeColors[value[0]]}}>{"input."+key}</p>)}))
                    ).concat(
                        modelOutput === null ? [] : Object.entries(modelOutput).map(([key, value]) => ({value: [RichInputTokenTypes.OUTPUTVAR, key, value[0]], label:(<p key={key} style={{color: DataTypeColors[value[0]]}}>{"output."+key}</p>)}))
                    )
                    } />
                </div>
                }
            </div>
        </div>
    </div>
}