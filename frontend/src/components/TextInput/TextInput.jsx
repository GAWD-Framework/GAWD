import { useEffect, useRef, useState } from "react";
import { Button } from "../Button/Button";

export function TextInput({ content, onSubmit, submitButton = false, submitButtonText }) {
	const [isEditing, setIsEditing] = useState(content === null);
	const [value, setValue] = useState(content ?? "");
	const inputRef = useRef(null);

	// Keep local value in sync when parent provides updated content.
	useEffect(() => {
		if (content !== null) {
			setValue(content);
		} else {
			setValue("");
		}
	}, [content]);

	async function handleSubmit(event) {
		event.preventDefault();
		const submitResult = await onSubmit(value);
		if (submitResult === false) {
			inputRef.current?.focus();
			return;
		}
		setValue("");
		setIsEditing(false);
	}

	if (!isEditing && content !== null) {
		return (
			<div className="flex items-center gap-2">
				<span>{content}</span>
                <Button type={"edit"} icon={true} text={"Edit"} onClick={() => {
					setValue(content);
					setIsEditing(true);
				}}/>
				
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit} className="flex items-center gap-2">
			<input
				ref={inputRef}
				type="text"
				value={value}
				onChange={(event) => setValue(event.target.value)}
				className="w-full bg-[#d8dee9] text-[#2e3440] font-medium py-1.5 px-3 rounded-lg shadow-sm"
				autoFocus
			/>
            {submitButton && (
                <span className="min-w-fit">
					<Button type="submit" text={submitButtonText} />
				</span>
            )}

		</form>
	);
}
