export function Button( {text, onClick, type, icon = false} ) {
    if (type == "base" || type === undefined)
        return <button className=
        "bg-gray-500 text-[#ECEFF4] font-semibold py-1.5 px-3 rounded-lg shadow-sm \
        hover:bg-gray-400 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
    onClick={onClick}>{text}</button>

    if (type == "edit") {
        if (icon)
            return <button onClick={onClick} title={text}
            className="p-1.5 rounded-md text-gray-800 hover:text-gray-600 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 size-9">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                </svg>
            </button>
        return <button className=
        "bg-gray-500 text-[#ECEFF4] font-semibold py-1.5 px-3 rounded-lg shadow-sm \
        hover:bg-gray-400 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
    onClick={onClick}>{text}</button>
    }
    if (type == "submit")
        return <button className=
        "bg-[#65a064] text-[#ECEFF4] font-semibold py-1.5 px-3 rounded-lg shadow-sm \
        hover:bg-[#79c278] hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
    onClick={onClick}>{text}</button>

    if (type == "delete") {
        if (icon)
            return <button onClick={onClick} title={text}
            className="p-1.5 rounded-md text-red-700 hover:text-red-600 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 size-9">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
            </button>

        return <button className=
        "bg-[#ad5a5a] text-[#ECEFF4] font-semibold py-1.5 px-3 rounded-lg shadow-sm \
        hover:bg-[#da756e] hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
    onClick={onClick}>{text}</button>
    }
}

/*
"px-4 py-1 text-white font-bold bg-gray-500 border-4 border-gray-700 rounded-xl shadow-md \
hover:bg-gray-400 hover:shadow-lg hover:duration-150 hover:ease-in-out \
active:duration-0 active:scale-95 active:bg-gray-600 active:shadow-inner"
*/