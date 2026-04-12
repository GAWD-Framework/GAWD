import { useRef } from 'react';
import { AcceptedKnowledgeSourceFileTypes } from '../../models';
import { Button } from '../Button/Button';

export function KnowledgeSourceEditMenu({ knowledgeSources, addKnowledgeSource, updateKnowledgeSource, removeKnowledgeSource }) {
    console.log("KnowledgeSources: ", knowledgeSources)
    const fileInputRef = useRef(null);

    const handleButtonClick = () => {
        fileInputRef.current.click();
    };

    return <>
    {knowledgeSources.map((source, i) => 
        <span key={i} className="flex items-center gap-4">
            <p  className="text-lg">&#8226; {source[0]}</p>
            <Button onClick={() => removeKnowledgeSource(i)} text={"Remove"} type={"delete"} icon={true}/>
        </span>
    )}
            <input
            type="file"
            className="hidden"
            ref={fileInputRef}
            accept={AcceptedKnowledgeSourceFileTypes.join(", ")}
            onChange={async (e) => {
                const file = e.target.files[0];
                console.log("File: ", file)
                if (!AcceptedKnowledgeSourceFileTypes.some(ext => file.name.endsWith(ext)) || file.size > 1024 * 1024 * 10) {
                    e.target.value = ''; // avoid displaying the wrong file on the input itself
                    return;
                }
                const content = await file.text();
                addKnowledgeSource(file.name, content)
            }}
            id={"fileInput"}
            />
            <Button onClick={handleButtonClick} type={"submit"} text={"Add Source From File"}/>     
    </>
    
    
}