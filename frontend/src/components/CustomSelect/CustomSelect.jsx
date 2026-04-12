import { useState, useRef, useEffect } from "react";

export function CustomSelect({
  options,
  onChange,
  borderColor = undefined,
  placeholder = "Select an option",
  value = undefined,
  direction = "down"
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return (
    <div
      ref={ref}
      className="relative max-w-96 w-fit"
    >
      {/* Display */}
      <div
        onClick={() => setOpen(!open)}
        className={"bg-[#d8dee9] text-[#2e3440] w-full font-medium py-1 pl-2 pr-2 shadow-sm transition-colors duration-200 cursor-pointer hover:bg-[#cbd5e1] rounded-lg" + (borderColor ? " border-2" : "")} // only round borders if no custom border color is provided, to avoid weird looks in conditions and actions
        style={{borderColor: borderColor}}
      >
        <span className="flex items-center gap-4 justify-between">
          <p>{value === undefined ? placeholder : value}</p>
          <p>▾</p>
        </span>
        
      </div>

      {/* Dropdown */}
      {open && (
        <div
          className={`absolute ${direction === "down" ? "top-[105%]" : "bottom-[105%]"} min-w-full w-max z-10 border border-neutral-400 rounded-md bg-white shadow-md overflow-hidden max-h-96 overflow-y-auto`}
        >
          {options && options.map((opt, i) => (
            <div
              key={i}
              onMouseDown={(e) => e.preventDefault()}  // prevents dropdown from stealing focus. Important for RichInput
              onClick={() => {
                if (opt.disabled) return;
                onChange(opt.value);
                setOpen(false);
              }}
                 className={"bg-white p-3 border-b last:border-b-0 " + (opt.disabled ? "bg-gray-200 text-gray-500" : "hover:bg-[#edf3ff] cursor-pointer")}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
