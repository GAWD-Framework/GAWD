import { useRef } from "react";
import { CustomSelect } from "../CustomSelect/CustomSelect";
import { DataTypeColors, RichInputTokenTypes } from '../../logic'
import { Button } from "../Button/Button";


export function RichInput({ storedText, tokenOptions, onSubmit, rowMode = false }) {
    const editorRef = useRef(null);
    const savedRangeRef = useRef(null); // Ref to store the saved selection range

    function loadStoredText(storedText, editor) {
        let html = "";
        for (const token of storedText) {
            if (token[0] == RichInputTokenTypes.STRING) {
                html += token[1].replace(/\n/g, '<br>');
            }
            else if (token[0] == RichInputTokenTypes.STATEVAR) {
                html += `\u200B<span 
                    data-tokentype="${token[0]}"
                    data-fieldname="${token[1]}"
                    data-datatype="${token[2]}"
                    contenteditable="false"
                    style="color:${DataTypeColors[token[2]]}"
                    >state.${token[1]}</span>\u200B`; // Insert zero-width space before and after the span. Without it, can't move cursor past the token. Temporary fix
            }
            else if (token[0] == RichInputTokenTypes.INPUTVAR) {
                html += `\u200B<span 
                    data-tokentype="${token[0]}"
                    data-fieldname="${token[1]}"
                    data-datatype="${token[2]}"
                    contenteditable="false"
                    style="color:${DataTypeColors[token[2]]}"
                    >input.${token[1]}</span>\u200B`;
            }
            else if (token[0] == RichInputTokenTypes.OUTPUTVAR) {
                html += `\u200B<span 
                    data-tokentype="${token[0]}"
                    data-fieldname="${token[1]}"
                    data-datatype="${token[2]}"
                    contenteditable="false"
                    style="color:${DataTypeColors[token[2]]}"
                    >output.${token[1]}</span>\u200B`;
            }
        }
        editor.innerHTML = html;
    }

    if (editorRef.current) {
        loadStoredText(storedText, editorRef.current);
    }

    // Capture cursor position when user clicks in editor or types
    function handleEditorMouseUp() {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            savedRangeRef.current = selection.getRangeAt(0).cloneRange();
        }
    }


    function insertToken(value) {
        const [tokentype, name, datatype] = value;
        
        const editor = editorRef.current;

        // Restore the saved cursor position
        if (savedRangeRef.current) {
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(savedRangeRef.current);
        } else {
            editor.focus();
        }

        // Create token
        const span = document.createElement("span");
        span.setAttribute("style", `color: ${DataTypeColors[datatype]}`);
        span.setAttribute("contenteditable", "false");
        span.setAttribute("data-tokentype", tokentype);
        span.setAttribute("data-fieldname", name);
        span.setAttribute("data-datatype", datatype);
        if (tokentype == RichInputTokenTypes.STATEVAR) {
            span.textContent = "state." + name;
        }
        else if (tokentype == RichInputTokenTypes.INPUTVAR) {
            span.textContent = "input." + name;
        }
        else if (tokentype == RichInputTokenTypes.OUTPUTVAR) {
            span.textContent = "output." + name;
        }

        // Insert at cursor
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        range.deleteContents();

        // Insert zero-width space before the span. Without it, can't move cursor before the token. Temporary fix
        const before = document.createTextNode("\u200B");
        range.insertNode(span); // this ordering actually makes the "before" char appear before the span
        range.insertNode(before);

        // Insert zero-width space after the span. Without it, can't move cursor past the token. Temporary fix
        const zwsp = document.createTextNode("\u200B");
        span.after(zwsp);

        // Move caret after the zero-width space
        range.setStartAfter(zwsp);
        range.setEndAfter(zwsp);
        selection.removeAllRanges();
        selection.addRange(range);
    }

    function handleSubmit() {
        const html = editorRef.current.innerHTML;
        const list_to_store = extractTokens(html);
        onSubmit(list_to_store);
    }
    
    // parses the content of the editor and returns a list of tokens
    function extractTokens(html) {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = html;
        const tokens = [];
        tempDiv.childNodes.forEach((node, i) => {          
            // pure string node
            if (node.nodeType === Node.TEXT_NODE) {
                const cleanString = node.textContent.replace(/\u200B/g, '');
                if (cleanString.length > 0) { // avoid adding empty tokens
                    tokens.push([RichInputTokenTypes.STRING, cleanString]);
                }
            } 
            // token span
            else if (node.hasAttribute('data-tokentype')) {
                tokens.push([Number(node.getAttribute('data-tokentype')), node.getAttribute('data-fieldname'), Number(node.getAttribute('data-datatype'))]);
            }
            // div containing tokens, or <br> tag. Happens when the rich input contains newlines
            else {
                if (i != 0){
                    tokens.push([RichInputTokenTypes.STRING, "\n"]);
                } 
                const inner_tokens = extractTokens(node.innerHTML);
                inner_tokens.forEach(token => {
                    tokens.push(token);
                  });
            }
        });
    
    return tokens;

    }

    return (
        <div className="flex flex-col gap-2 items-start">
            <CustomSelect options={tokenOptions} onChange={insertToken} placeholder={"Insert a variable"} />

            {rowMode ? 
                <span className="flex gap-3 w-full">
                    <div
                        ref={editorRef}
                        contentEditable
                        onMouseUp={handleEditorMouseUp}
                        onKeyUp={handleEditorMouseUp} 
                        className="w-4/5 bg-[#f3f7ff] text-[#2e3440] font-medium py-2.5 px-3 rounded-lg shadow-sm break-words min-h-14"
                    />

                    <Button text="Save" onClick={handleSubmit} type="submit"/>
                </span>
                :
                <>
                    <div
                        ref={editorRef}
                        contentEditable
                        onMouseUp={handleEditorMouseUp}
                        onKeyUp={handleEditorMouseUp} 
                        className="w-full bg-[#f3f7ff] text-[#2e3440] font-medium py-2.5 px-3 rounded-lg shadow-sm break-words min-h-14"
                    />

                    <Button text="Save" onClick={handleSubmit} type="submit"/>
                </>

            }
        </div>
    );
}

